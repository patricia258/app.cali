do $public_forms_disc$
declare
  target_form uuid := gen_random_uuid();
  other_form uuid := gen_random_uuid();
  form_slug text := 'qa-'||target_form::text;
  other_slug text := 'qa-'||other_form::text;
  request_id uuid := gen_random_uuid();
  link_id uuid := gen_random_uuid();
  link_slug text := 'qa-'||link_id::text;
  invite uuid := gen_random_uuid();
  expired_invite uuid := gen_random_uuid();
  submitted_invite uuid := gen_random_uuid();
  answer jsonb := jsonb_build_object('choice','Com arquivo','attachment',target_form::text||'/qa.pdf');
  disc_answers jsonb;
  disc_result uuid;
  disc_receipt jsonb;
  payload jsonb;
  response_id uuid;
  trashed uuid;
begin
  insert into cali_workspace.forms(id,slug,title,status,confirm_email,questions) values
    (target_form,form_slug,'Formulário sintético','open',false,
      '[{"id":"choice","label":"Escolha","kind":"single_choice","required":true,"logic":[{"when":"Sem arquivo","goTo":"__end"}]},{"id":"attachment","label":"Arquivo","kind":"file","required":true}]'),
    (other_form,other_slug,'Formulário vizinho','open',false,'[]');
  insert into storage.objects(bucket_id,name,version) values
    ('cali-forms',target_form::text||'/qa.pdf','qa'),('cali-forms',other_form::text||'/qa.pdf','qa');
  insert into cali_workspace.profile_links(id,slug,company_id)
  values(link_id,link_slug,'ca110000-0000-4000-8000-000000000001');
  insert into cali_workspace.profile_invites(link_id,token,person_name,email,sent_at,deadline_at) values
    (link_id,invite,'Pessoa QA','disc-qa@example.test',now(),now()+interval '1 day'),
    (link_id,expired_invite,'Pessoa expirada QA','disc-expirado@example.test',now()-interval '2 days',now()-interval '1 day'),
    (link_id,submitted_invite,'Pessoa respondente QA','disc-resposta@example.test',now(),now()+interval '1 day');
  disc_answers := jsonb_build_object(
    'natural',(select jsonb_agg(jsonb_build_object('b',g,'mais','D','menos','C')) from generate_series(1,18) g),
    'pressure',(select jsonb_agg(jsonb_build_object('b',g,'mais','I','menos','C')) from unnest(array[2,5,8,11,14,17]) g)
  );

  set local role anon;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if public.cali_form_public(' '||upper(form_slug)||' ')->>'id' is distinct from target_form::text then
    raise exception 'Link aberto não retornou o próprio formulário.';
  end if;
  begin
    perform public.cali_form_submit(form_slug,answer,other_form,request_id);
    raise exception 'Slug A aceitou o identificador do formulário B.';
  exception when no_data_found then null;
  end;
  begin
    perform public.cali_form_submit(form_slug,answer||jsonb_build_object('attachment',other_form::text||'/qa.pdf'),target_form,request_id);
    raise exception 'Formulário A aceitou anexo do B.';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.cali_form_submit(form_slug,answer||jsonb_build_object('choice','Sem arquivo','__visited',jsonb_build_array('choice','attachment')),target_form,request_id);
    raise exception 'Formulário aceitou resposta de ramo não alcançado.';
  exception when invalid_parameter_value then null;
  end;
  payload := public.cali_form_submit(form_slug,answer,target_form,request_id);
  if payload->>'ok' is distinct from 'true' or public.cali_form_submit(form_slug,answer,target_form,request_id) is distinct from payload then
    raise exception 'Retry de Forms perdeu o recibo.';
  end if;
  begin
    perform public.cali_form_submit(form_slug,jsonb_build_object('choice','Sem arquivo'),target_form,request_id);
    raise exception 'Tentativa repetida aceitou respostas diferentes.';
  exception when serialization_failure then null;
  end;

  if public.cali_profile_link(link_slug)->>'status' is distinct from 'open'
    or public.cali_profile_invite_open(gen_random_uuid()) is not null
    or public.cali_profile_invite_open(invite)->>'state' is distinct from 'opened'
    or public.cali_profile_invite_open(expired_invite)->>'state' is distinct from 'expired' then
    raise exception 'Link e convites DISC divergiram dos estados públicos.';
  end if;
  perform public.cali_profile_invite_progress(invite,13);
  perform public.cali_profile_invite_progress(invite,4);
  if public.cali_profile_invite_open(invite)->>'last_block' is distinct from '13'
    or public.cali_profile_invite_decline(invite)->>'ok' is distinct from 'true' then
    raise exception 'Convite DISC perdeu progresso ou opt-out.';
  end if;
  perform public.cali_profile_invite_progress(invite,24);
  if public.cali_profile_invite_open(invite)->>'state' is distinct from 'declined'
    or public.cali_profile_invite_open(invite)->>'last_block' is distinct from '13'
    or public.cali_profile_report(invite) is distinct from '{"acknowledged":true}'::jsonb then
    raise exception 'DISC recusado avançou ou o link legado expôs resultado.';
  end if;
  begin
    perform public.cali_profile_submit_invite(invite,'QA','{}',true);
    raise exception 'Convite após opt-out aceitou resposta.';
  exception when raise_exception then
    if sqlerrm <> 'Este convite foi encerrado a seu pedido.' then raise; end if;
  end;
  begin
    perform public.cali_profile_submit_invite(submitted_invite,'QA',disc_answers,false);
    raise exception 'DISC aceitou resposta sem consentimento.';
  exception when raise_exception then
    if sqlerrm not like 'É preciso concordar%' then raise; end if;
  end;
  disc_receipt := public.cali_profile_submit_invite(submitted_invite,'QA',disc_answers,true);
  disc_result := (disc_receipt->>'id')::uuid;
  if disc_result is null or public.cali_profile_invite_open(submitted_invite)->>'state' is distinct from 'completed'
    or public.cali_profile_report((disc_receipt->>'token')::uuid) is distinct from '{"acknowledged":true}'::jsonb then
    raise exception 'Envio do DISC perdeu recibo ou expôs o resultado por token.';
  end if;
  begin
    perform public.cali_profile_submit_invite(submitted_invite,'QA',disc_answers,true);
    raise exception 'DISC duplicou a resposta do convite.';
  exception when raise_exception then
    if sqlerrm <> 'Este convite já foi respondido.' then raise; end if;
  end;

  reset role;
  select id into strict response_id from cali_workspace.form_responses r where r.form_id=target_form;
  delete from cali_workspace.forms f where f.id=target_form;
  select id into strict trashed from cali_workspace.forms_trash t where t.form_id=target_form and t.kind='form';

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform public.cali_forms_trash_restore(trashed);
    raise exception 'Cliente restaurou formulário.';
  exception when insufficient_privilege then null;
  end;
  if public.cali_profile_base() is not null then raise exception 'Cliente leu base DISC.'; end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if exists(select 1 from cali_workspace.profile_results r where r.id=disc_result) then
    raise exception 'Cliente da empresa leu resultado individual DISC.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  payload := public.cali_forms_trash_restore(trashed);
  if payload->>'responses' is distinct from '1'
    or not exists(select 1 from cali_workspace.forms f where f.id=target_form and f.slug=form_slug)
    or not exists(select 1 from cali_workspace.form_responses r where r.id=response_id and r.answers=answer)
    or public.cali_profile_base()->>'min' is distinct from '30' then
    raise exception 'Restauração Forms perdeu ID/resposta ou base Admin DISC indisponível.';
  end if;
  reset role;
  if not exists(select 1 from cali_workspace.profile_results r join cali_workspace.profile_invites i on i.id=r.invite_id
    where r.id=disc_result and i.result_id=r.id and i.token=submitted_invite and r.primary_style='D') then
    raise exception 'Resultado DISC perdeu vínculo ao convite ou perfil calculado.';
  end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='cali-forms' and o.name=answer->>'attachment') then
    raise exception 'Restauração perdeu o caminho de Storage do formulário.';
  end if;
end;
$public_forms_disc$;
