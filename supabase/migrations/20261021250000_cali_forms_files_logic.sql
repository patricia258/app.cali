-- CALI Forms (21/10, aplicada como cali_forms_files_and_logic): pergunta de arquivo e perguntas condicionais.
-- Bucket privado cali-forms (25 MB, imagens/PDF/Office/áudio/vídeo). Quem responde só envia para a pasta de um formulário
-- aberto que tenha pergunta de arquivo; só a administradora lê e apaga. A função pública passa a devolver o id do
-- formulário (pasta do envio) e o envio aceita o caminho percorrido (__visited): obrigatória só vale para o que foi visto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cali-forms', 'cali-forms', false, 26214400, array[
  'image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','video/mp4','video/quicktime','audio/mpeg','audio/mp4','audio/x-m4a'])
on conflict (id) do nothing;

create or replace function public.cali_form_accepts_uploads(p_folder text)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.forms f
                  where f.id::text = p_folder and f.status = 'open' and f.questions @> '[{"kind":"file"}]'::jsonb);
$$;
revoke all on function public.cali_form_accepts_uploads(text) from public;
grant execute on function public.cali_form_accepts_uploads(text) to anon, authenticated;

create policy cali_forms_public_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cali-forms' and public.cali_form_accepts_uploads((storage.foldername(name))[1]));
create policy cali_forms_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'cali-forms' and cali_workspace.is_admin());
create policy cali_forms_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cali-forms' and cali_workspace.is_admin());

create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from cali_workspace.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;

create or replace function public.cali_form_submit(p_slug text, p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace', 'public' as $$
declare
  v_form cali_workspace.forms%rowtype;
  q jsonb; v_val jsonb; v_kind text; v_txt text; v_item jsonb; v_visited jsonb;
  v_clean jsonb := '{}'::jsonb; v_email text; v_name text; v_id uuid; v_hook text; v_recent integer;
begin
  select * into v_form from cali_workspace.forms where slug = lower(btrim(coalesce(p_slug, '')));
  if not found or v_form.status <> 'open' then raise exception 'Este formulário não está recebendo respostas.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 100000 then raise exception 'Respostas inválidas.'; end if;
  select count(*) into v_recent from cali_workspace.form_responses where form_id = v_form.id and submitted_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;
  -- Perguntas condicionais: a página manda o caminho percorrido; obrigatória só vale para o que a pessoa viu.
  v_visited := case when jsonb_typeof(p_answers -> '__visited') = 'array' then p_answers -> '__visited' else null end;

  for q in select value from jsonb_array_elements(v_form.questions) loop
    v_kind := q->>'kind';
    continue when v_kind = 'statement' or coalesce(q->>'id', '') = '';
    v_val := p_answers -> (q->>'id');
    if v_val is null or v_val = 'null'::jsonb
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0) then
      if coalesce((q->>'required')::boolean, false) and (v_visited is null or v_visited ? (q->>'id')) then
        raise exception 'Responda a pergunta: %', q->>'label';
      end if;
      continue;
    end if;
    if jsonb_typeof(v_val) = 'array' then
      if v_kind <> 'multi_choice' then raise exception 'Resposta inválida em: %', q->>'label'; end if;
      select coalesce(jsonb_agg(to_jsonb(left(btrim(x #>> '{}'), 300))), '[]'::jsonb) into v_item
        from (select x from jsonb_array_elements(v_val) x limit 50) s where jsonb_typeof(x) = 'string';
      v_val := v_item;
    elsif jsonb_typeof(v_val) = 'number' then
      if v_kind not in ('scale', 'number') then raise exception 'Resposta inválida em: %', q->>'label'; end if;
    elsif jsonb_typeof(v_val) = 'string' then
      v_txt := left(btrim(v_val #>> '{}'), 5000);
      if v_kind = 'file' then
        if v_txt not like v_form.id::text || '/%' or length(v_txt) > 400 then raise exception 'Arquivo inválido em: %', q->>'label'; end if;
      elsif v_kind = 'email' then
        if v_txt !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail em: %', q->>'label'; end if;
        v_txt := lower(v_txt);
        if v_email is null then v_email := v_txt; end if;
      elsif v_kind = 'name' and v_name is null then v_name := left(v_txt, 160);
      end if;
      v_val := to_jsonb(v_txt);
    else
      raise exception 'Resposta inválida em: %', q->>'label';
    end if;
    v_clean := v_clean || jsonb_build_object(q->>'id', v_val);
  end loop;

  insert into cali_workspace.form_responses (form_id, answers, respondent_name, respondent_email)
  values (v_form.id, v_clean, v_name, v_email) returning id into v_id;

  if v_form.confirm_email and v_email is not null then
    select count(*) into v_recent from cali_workspace.form_responses
     where respondent_email = v_email and confirmation_sent_at > now() - interval '1 day';
    if v_recent < 5 then
      select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
      if v_hook is not null then
        perform net.http_post(
          url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/cali-forms-confirmation',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
          body := jsonb_build_object('response_id', v_id));
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'thank_you', v_form.thank_you, 'confirmation', v_form.confirm_email and v_email is not null);
end $$;
