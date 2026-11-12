begin;

create table cali_workspace.form_submission_receipts (
  form_id uuid not null references cali_workspace.forms(id) on delete cascade,
  request_id uuid not null,
  fingerprint bytea not null,
  receipt jsonb not null,
  primary key (form_id, request_id)
);

create table cali_workspace.form_confirmation_deliveries (
  response_id uuid primary key references cali_workspace.form_responses(id) on delete cascade,
  queued_at timestamptz not null default statement_timestamp(),
  lease_id uuid,
  leased_at timestamptz
);

alter table cali_workspace.form_submission_receipts enable row level security;
alter table cali_workspace.form_confirmation_deliveries enable row level security;
revoke all on cali_workspace.form_submission_receipts, cali_workspace.form_confirmation_deliveries
  from public, anon, authenticated, service_role;

create function cali_workspace.cali_form_enqueue_confirmation(p_response_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  email text;
  endpoint text;
  hook text;
  bearer text;
  headers jsonb;
begin
  select r.respondent_email into email
  from cali_workspace.form_responses r
  join cali_workspace.forms f on f.id = r.form_id
  where r.id = p_response_id and r.confirmation_sent_at is null and f.confirm_email;
  if email is null then return false; end if;

  if (select count(*) from cali_workspace.form_responses r
      where r.respondent_email = email and r.confirmation_sent_at > now() - interval '1 day') >= 5 then
    return false;
  end if;

  select secret_value into endpoint from cali_workspace.runtime_secrets where secret_key = 'forms_confirmation_url';
  select secret_value into hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  select secret_value into bearer from cali_workspace.runtime_secrets where secret_key = 'forms_confirmation_bearer';
  if nullif(hook, '') is null or endpoint is null or
    (endpoint !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/cali-forms-confirmation$'
      and endpoint <> 'http://ingress:56431/functions/v1/cali-forms-confirmation') then
    return false;
  end if;

  headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', hook);
  if nullif(bearer, '') is not null then
    headers := headers || jsonb_build_object('Authorization', 'Bearer ' || bearer);
  end if;

  insert into cali_workspace.form_confirmation_deliveries (response_id)
  values (p_response_id) on conflict (response_id) do nothing;
  if not found then return true; end if;
  perform net.http_post(url := endpoint, headers := headers, body := jsonb_build_object('response_id', p_response_id));
  return true;
exception when others then
  -- A indisponibilidade da fila de e-mail não invalida a resposta recebida.
  return false;
end $$;

create function cali_workspace.cali_form_claim_confirmation(p_response_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  lease uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Confirmação indisponível.';
  end if;
  update cali_workspace.form_confirmation_deliveries d
  set lease_id = gen_random_uuid(), leased_at = statement_timestamp()
  where d.response_id = p_response_id
    and (d.lease_id is null or d.leased_at < statement_timestamp() - interval '2 minutes')
    and d.queued_at > statement_timestamp() - interval '23 hours'
    and exists (select 1 from cali_workspace.form_responses r
      where r.id = d.response_id and r.confirmation_sent_at is null)
  returning d.lease_id into lease;
  return lease;
end $$;

create function cali_workspace.cali_form_finish_confirmation(p_response_id uuid, p_lease uuid, p_sent boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Confirmação indisponível.';
  end if;
  update cali_workspace.form_confirmation_deliveries
  set lease_id = null, leased_at = null
  where response_id = p_response_id and lease_id = p_lease;
  if not found then return false; end if;
  if p_sent then
    update cali_workspace.form_responses
    set confirmation_sent_at = statement_timestamp()
    where id = p_response_id and confirmation_sent_at is null;
  end if;
  return true;
end $$;

revoke all on function cali_workspace.cali_form_enqueue_confirmation(uuid),
  cali_workspace.cali_form_claim_confirmation(uuid),
  cali_workspace.cali_form_finish_confirmation(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function cali_workspace.cali_form_enqueue_confirmation(uuid) to postgres;
grant execute on function cali_workspace.cali_form_claim_confirmation(uuid),
  cali_workspace.cali_form_finish_confirmation(uuid, uuid, boolean) to service_role;

-- Reaproveitar o escritor legado e trocar somente o despacho fixo, depois de validar a preimagem.
alter function public.cali_form_submit(text, jsonb) set schema cali_workspace;
alter function cali_workspace.cali_form_submit(text, jsonb) rename to cali_form_submit_legacy;
revoke all on function cali_workspace.cali_form_submit_legacy(text, jsonb) from public, anon, authenticated, service_role;

do $migration$
declare
  definition text := pg_get_functiondef('cali_workspace.cali_form_submit_legacy(text,jsonb)'::regprocedure);
  send_start integer := strpos(definition, '  if v_form.confirm_email and v_email is not null then');
  receipt_start integer := strpos(definition, '  return jsonb_build_object(''ok'', true, ''thank_you''');
begin
  if send_start = 0 or receipt_start <= send_start or
     strpos(substring(definition from send_start for receipt_start - send_start), 'net.http_post') = 0 then
    raise exception 'Compare o escritor legado do CALI Forms antes de instalar o despacho.';
  end if;
  definition := overlay(definition placing '' from send_start for receipt_start - send_start);
  definition := replace(definition, '''confirmation'', v_form.confirm_email and v_email is not null',
    '''confirmation'', cali_workspace.cali_form_enqueue_confirmation(v_id)');
  if strpos(definition, 'net.http_post') <> 0 or
     strpos(definition, 'cali_workspace.cali_form_enqueue_confirmation(v_id)') = 0 then
    raise exception 'Não foi possível isolar o despacho de confirmação do CALI Forms.';
  end if;
  execute definition;
end $migration$;

create function cali_workspace.cali_form_reached(p_questions jsonb, p_answers jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  position integer := 0;
  target_position integer;
  question jsonb;
  answer jsonb;
  target text;
  reached jsonb := '[]'::jsonb;
begin
  while position < jsonb_array_length(p_questions) loop
    question := p_questions -> position;
    answer := p_answers -> (question->>'id');
    reached := reached || jsonb_build_array(question->>'id');
    target := null;
    if jsonb_typeof(question->'logic') = 'array' then
      select item->>'goTo' into target
      from jsonb_array_elements(question->'logic') with ordinality rule(item, rule_number)
      where nullif(item->>'goTo', '') is not null
        and case when jsonb_typeof(answer) = 'array' then answer ? (item->>'when')
          else coalesce(answer #>> '{}', '') = item->>'when' end
      order by rule_number limit 1;
    end if;
    exit when target = '__end';
    select (question_number - 1)::integer into target_position
    from jsonb_array_elements(p_questions) with ordinality candidate(item, question_number)
    where item->>'id' = target order by question_number limit 1;
    position := case when target_position > position then target_position else position + 1 end;
  end loop;
  return reached;
end $$;
revoke all on function cali_workspace.cali_form_reached(jsonb, jsonb) from public, anon, authenticated, service_role;

create function public.cali_form_submit(
  p_slug text, p_answers jsonb, p_form_id uuid default null, p_request_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  form_row cali_workspace.forms%rowtype;
  receipt_row cali_workspace.form_submission_receipts%rowtype;
  answers jsonb;
  reached jsonb;
  fingerprint bytea;
  receipt jsonb;
  attachment text;
begin
  if jsonb_typeof(p_answers) is distinct from 'object' or length(p_answers::text) > 100000 then
    raise exception using errcode = '22023', message = 'Respostas inválidas.';
  end if;
  if (p_request_id is null) <> (p_form_id is null) then
    raise exception using errcode = '22023', message = 'Confira a tentativa de envio.';
  end if;
  select f.* into form_row from cali_workspace.forms f
  where f.slug = lower(btrim(coalesce(p_slug, ''))) for share;
  if not found or (p_form_id is not null and form_row.id <> p_form_id) then
    raise exception using errcode = 'P0002', message = 'Formulário não disponível.';
  end if;

  answers := p_answers - '__visited';
  if p_request_id is not null then
    fingerprint := sha256(convert_to(answers::text, 'UTF8'));
    perform pg_advisory_xact_lock(hashtextextended(form_row.id::text || ':' || p_request_id::text, 0));
    select r.* into receipt_row from cali_workspace.form_submission_receipts r
    where r.form_id = form_row.id and r.request_id = p_request_id;
    if found then
      if receipt_row.fingerprint = fingerprint then return receipt_row.receipt; end if;
      raise exception using errcode = '40001', message = 'Esta tentativa já foi registrada com outras respostas.';
    end if;
  end if;

  if form_row.status <> 'open' then
    raise exception using errcode = '42501', message = 'Este formulário não está recebendo respostas.';
  end if;
  reached := cali_workspace.cali_form_reached(form_row.questions, answers);
  if exists (select 1 from jsonb_object_keys(answers) answer(id) where not (reached ? answer.id)) then
    raise exception using errcode = '22023', message = 'Confira as respostas do caminho selecionado.';
  end if;
  for attachment in
    select nullif(btrim(answers->>(q->>'id')), '')
    from jsonb_array_elements(form_row.questions) q
    where q->>'kind' = 'file' and reached ? (q->>'id') and jsonb_typeof(answers->(q->>'id')) = 'string'
  loop
    if attachment is not null and (split_part(attachment, '/', 1) <> form_row.id::text or not exists (
      select 1 from storage.objects o where o.bucket_id = 'cali-forms' and o.name = attachment
    )) then
      raise exception using errcode = '22023', message = 'O arquivo não pertence a este formulário ou não foi enviado.';
    end if;
  end loop;

  receipt := cali_workspace.cali_form_submit_legacy(form_row.slug, jsonb_set(answers, '{__visited}', reached));
  if receipt->>'ok' is distinct from 'true' then
    raise exception using errcode = '22023', message = 'Não foi possível salvar as respostas.';
  end if;
  if p_request_id is not null then
    insert into cali_workspace.form_submission_receipts (form_id, request_id, fingerprint, receipt)
    values (form_row.id, p_request_id, fingerprint, receipt);
  end if;
  return receipt;
end $$;
revoke all on function public.cali_form_submit(text, jsonb, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.cali_form_submit(text, jsonb, uuid, uuid) to anon, authenticated;

-- O schema public fica fora do pre-request do Workspace. A restauração aplica a mesma guarda privada.
alter function public.cali_forms_trash_restore(uuid) rename to cali_forms_trash_restore_legacy;
revoke all on function public.cali_forms_trash_restore_legacy(uuid) from public, anon, authenticated, service_role;
create function public.cali_forms_trash_restore(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Sem permissão para restaurar.';
  end if;
  return public.cali_forms_trash_restore_legacy(p_id);
end $$;
revoke all on function public.cali_forms_trash_restore(uuid) from public, anon, authenticated, service_role;
grant execute on function public.cali_forms_trash_restore(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
