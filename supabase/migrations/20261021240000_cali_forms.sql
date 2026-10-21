-- CALI Forms (21/10/2026, autorizado pela proprietária): formulários próprios da CALI, criados pela administradora,
-- respondidos por link público (uma pergunta por tela) e com respostas reunidas no app. Só acréscimo: duas tabelas
-- novas e três funções; nada existente muda. Quem responde não faz login: lê e envia só pelas funções públicas abaixo.

create table if not exists cali_workspace.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 1200),
  thank_you text not null default '' check (length(thank_you) <= 600),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  company_id uuid references cali_workspace.companies(id) on delete set null,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  confirm_email boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cali_workspace.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references cali_workspace.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  respondent_name text,
  respondent_email text,
  submitted_at timestamptz not null default now(),
  confirmation_sent_at timestamptz
);
create index if not exists form_responses_form_idx on cali_workspace.form_responses (form_id, submitted_at desc);
create index if not exists form_responses_email_idx on cali_workspace.form_responses (respondent_email, confirmation_sent_at);

alter table cali_workspace.forms enable row level security;
alter table cali_workspace.form_responses enable row level security;
create policy forms_admin_all on cali_workspace.forms for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy form_responses_admin_read on cali_workspace.form_responses for select to authenticated using (cali_workspace.is_admin());
create policy form_responses_admin_delete on cali_workspace.form_responses for delete to authenticated using (cali_workspace.is_admin());
grant select, insert, update, delete on cali_workspace.forms to authenticated;
grant select, delete on cali_workspace.form_responses to authenticated;

-- Leitura pública: só formulário aberto ou encerrado (encerrado volta sem perguntas, para a tela avisar).
create or replace function public.cali_form_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from cali_workspace.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$$;
revoke all on function public.cali_form_public(text) from public;
grant execute on function public.cali_form_public(text) to anon, authenticated;

-- Envio público: valida obrigatórias e formatos, guarda só as perguntas do formulário e pede o e-mail de confirmação.
create or replace function public.cali_form_submit(p_slug text, p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace', 'public' as $$
declare
  v_form cali_workspace.forms%rowtype;
  q jsonb; v_val jsonb; v_kind text; v_txt text; v_item jsonb;
  v_clean jsonb := '{}'::jsonb; v_email text; v_name text; v_id uuid; v_hook text; v_recent integer;
begin
  select * into v_form from cali_workspace.forms where slug = lower(btrim(coalesce(p_slug, '')));
  if not found or v_form.status <> 'open' then raise exception 'Este formulário não está recebendo respostas.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 100000 then raise exception 'Respostas inválidas.'; end if;
  select count(*) into v_recent from cali_workspace.form_responses where form_id = v_form.id and submitted_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;

  for q in select value from jsonb_array_elements(v_form.questions) loop
    v_kind := q->>'kind';
    continue when v_kind = 'statement' or coalesce(q->>'id', '') = '';
    v_val := p_answers -> (q->>'id');
    if v_val is null or v_val = 'null'::jsonb
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0) then
      if coalesce((q->>'required')::boolean, false) then raise exception 'Responda a pergunta: %', q->>'label'; end if;
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
      if v_kind = 'email' then
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

  -- Confirmação por e-mail: no máximo 5 por endereço por dia (evita usar o formulário para disparar e-mails).
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
revoke all on function public.cali_form_submit(text, jsonb) from public;
grant execute on function public.cali_form_submit(text, jsonb) to anon, authenticated;

-- Contagem de respostas por formulário para a lista da administradora.
create or replace function cali_workspace.admin_form_overview()
returns table(form_id uuid, responses bigint, last_response timestamptz)
language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select r.form_id, count(*), max(r.submitted_at) from cali_workspace.form_responses r
   where cali_workspace.is_admin() group by r.form_id;
$$;
revoke all on function cali_workspace.admin_form_overview() from public, anon;
grant execute on function cali_workspace.admin_form_overview() to authenticated;
