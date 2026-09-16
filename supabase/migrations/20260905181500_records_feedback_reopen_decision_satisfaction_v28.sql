-- CALI Workspace · Registros/Solicitações V28
-- Feedback sem envio automático, reabertura com justificativa, decisão administrativa e satisfação geral real.

create or replace function cali_workspace.submit_account_record_feedback(
  p_record_id uuid,
  p_score integer,
  p_comment text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_feedback_id uuid;
  v_comment text:=nullif(btrim(coalesce(p_comment,'')),'');
  v_notification_ids uuid[];
  v_title text;
  v_body text;
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if p_score < 1 or p_score > 5 then raise exception 'A avaliação deve ser de 1 a 5.'; end if;
  if p_score <= 3 and length(btrim(coalesce(p_comment,''))) < 3 then
    raise exception 'Conte brevemente o motivo para avaliações de 1 a 3.';
  end if;

  select * into v_profile from cali_workspace.profiles where id=v_user_id and role='client' and active=true;
  if not found then raise exception 'Apenas o cliente pode registrar esta avaliação.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client' then
    raise exception 'Solicitação não disponível para este acesso.';
  end if;
  if v_record.workflow_status<>'completed' then
    raise exception 'A avaliação fica disponível quando a solicitação é finalizada.';
  end if;

  insert into cali_workspace.account_record_feedback(record_id,company_id,user_id,score,comment)
  values(v_record.id,v_record.company_id,v_user_id,p_score,v_comment)
  on conflict (record_id,user_id) do update
    set score=excluded.score, comment=excluded.comment, created_at=now()
  returning id into v_feedback_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_record.company_id,v_user_id,'account_record_feedback','account_record',v_record.id,
    jsonb_build_object('score',p_score,'comment_provided',v_comment is not null));

  v_title:=case
    when p_score=5 then 'Uhul! Nova avaliação · 5/5'
    when p_score=4 then 'Nova avaliação positiva · 4/5'
    else 'Atenção: nova avaliação · ' || p_score::text || '/5'
  end;

  v_body:=case
    when p_score=5 then 'Você recebeu nota 5 de 5 nesta solicitação.'
    when p_score=4 then 'Você recebeu nota 4 de 5 nesta solicitação.'
    else 'Você recebeu nota ' || p_score::text || ' de 5 nesta solicitação.'
  end || case when v_comment is not null then ' Comentário do cliente: “' || v_comment || '”.' else ' O cliente não deixou comentário adicional.' end;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,'admin','record_feedback',v_title,v_body,
    'account_record',v_record.id,'/admin/registros?record=' || v_record.id::text,
    case when p_score <= 3 then 'high' else 'normal' end,true
  );

  return jsonb_build_object('ok',true,'feedback_id',v_feedback_id,'record_id',v_record.id,'score',p_score,'comment',v_comment,'notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.submit_account_record_feedback(uuid,integer,text) from public,anon;
grant execute on function cali_workspace.submit_account_record_feedback(uuid,integer,text) to authenticated;

create or replace function cali_workspace.request_account_record_reopen(
  p_record_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_request_id uuid;
  v_existing uuid;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
  v_notification_ids uuid[];
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then
    raise exception 'Explique brevemente por que você precisa reabrir esta solicitação.';
  end if;
  select * into v_profile from cali_workspace.profiles where id=v_user_id and role='client' and active=true;
  if not found then raise exception 'Apenas o cliente pode solicitar reabertura.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client' then
    raise exception 'Solicitação não disponível para este acesso.';
  end if;
  if v_record.workflow_status not in ('standby','completed','cancelled') then
    raise exception 'Esta solicitação já está aberta para conversa.';
  end if;
  if v_record.workflow_status='completed' and not exists (
    select 1 from cali_workspace.account_record_feedback f
    where f.record_id=v_record.id and f.user_id=v_user_id
  ) then
    raise exception 'Avalie esta solicitação antes de pedir a reabertura.';
  end if;

  select id into v_existing
  from cali_workspace.account_record_reopen_requests
  where record_id=v_record.id and status='pending'
  order by requested_at desc limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok',true,'request_id',v_existing,'record_id',v_record.id,'status','pending','already_pending',true);
  end if;

  insert into cali_workspace.account_record_reopen_requests(record_id,company_id,requested_by,reason)
  values(v_record.id,v_record.company_id,v_user_id,v_reason)
  returning id into v_request_id;

  insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
  values(v_record.id,v_record.company_id,null,'system',
    'Reabertura solicitada pelo cliente. Motivo: ' || v_reason || ' O tempo já consumido permanece contabilizado e não retorna ao saldo de horas.',
    'client');

  update cali_workspace.account_records
     set requires_action=true,last_activity_at=now(),updated_at=now()
   where id=v_record.id;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,'admin','record_reopen_request','Solicitação de reabertura',
    'O cliente pediu a reabertura de “' || v_record.title || '”. Motivo: “' || v_reason || '”.',
    'account_record',v_record.id,'/admin/registros?record=' || v_record.id::text,'high',true
  );

  return jsonb_build_object('ok',true,'request_id',v_request_id,'record_id',v_record.id,'status','pending','reason',v_reason,'notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.request_account_record_reopen(uuid,text) from public,anon;
grant execute on function cali_workspace.request_account_record_reopen(uuid,text) to authenticated;

create or replace function cali_workspace.decide_account_record_reopen(
  p_request_id uuid,
  p_decision text,
  p_note text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_request cali_workspace.account_record_reopen_requests%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_note text:=nullif(btrim(coalesce(p_note,'')),'');
  v_notification_ids uuid[];
  v_body text;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode decidir sobre reaberturas.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida.'; end if;
  if p_decision='rejected' and length(btrim(coalesce(p_note,''))) < 3 then
    raise exception 'Informe o motivo para recusar a reabertura.';
  end if;

  select * into v_request
  from cali_workspace.account_record_reopen_requests
  where id=p_request_id
  for update;
  if not found then raise exception 'Pedido de reabertura não encontrado.'; end if;
  if v_request.status<>'pending' then raise exception 'Este pedido já foi analisado.'; end if;

  select * into v_record from cali_workspace.account_records where id=v_request.record_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;

  update cali_workspace.account_record_reopen_requests
     set status=p_decision,decided_at=now(),decided_by=v_user_id,decision_note=v_note
   where id=v_request.id;

  if p_decision='approved' then
    update cali_workspace.account_records
       set workflow_status='in_progress',requires_action=true,assigned_to=v_user_id,
           closed_at=null,last_activity_at=now(),updated_at=now()
     where id=v_record.id;

    v_body:='Reabertura aprovada pela CALI.' || case when v_note is not null then ' Mensagem: ' || v_note else '' end;
    insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
    values(v_record.id,v_record.company_id,null,'system',v_body,'client');

    v_notification_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_reopen_decision','Reabertura aprovada',
      'Sua solicitação “' || v_record.title || '” foi reaberta pela CALI.' || case when v_note is not null then ' Mensagem: “' || v_note || '”.' else '' end,
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,'high',true
    );
  else
    update cali_workspace.account_records
       set requires_action=false,last_activity_at=now(),updated_at=now()
     where id=v_record.id;

    v_body:='Pedido de reabertura analisado e não aprovado. Motivo: ' || v_note;
    insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
    values(v_record.id,v_record.company_id,null,'system',v_body,'client');

    v_notification_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_reopen_decision','Pedido de reabertura analisado',
      'A CALI analisou o pedido de reabertura de “' || v_record.title || '”. Motivo: “' || v_note || '”.',
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,'normal',true
    );
  end if;

  return jsonb_build_object('ok',true,'request_id',v_request.id,'record_id',v_record.id,'decision',p_decision,'note',v_note,'notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.decide_account_record_reopen(uuid,text,text) from public,anon;
grant execute on function cali_workspace.decide_account_record_reopen(uuid,text,text) to authenticated;

create or replace function cali_workspace.get_admin_satisfaction_overview()
returns jsonb
language plpgsql
stable security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_average numeric;
  v_total integer;
  v_distribution jsonb;
  v_monthly jsonb;
  v_recent jsonb;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode acessar este painel.'; end if;

  with feedback as (
    select f.company_id,f.score::numeric as score,f.comment,f.created_at,
           'record'::text as source_type,f.record_id as entity_id,r.protocol,r.title,c.display_name as company_name
    from cali_workspace.account_record_feedback f
    join cali_workspace.account_records r on r.id=f.record_id
    join cali_workspace.companies c on c.id=f.company_id
    union all
    select n.company_id,n.score::numeric,n.comment,n.created_at,
           'deliverable'::text,n.deliverable_id,null::text,d.title,c.display_name
    from cali_workspace.nps_responses n
    left join cali_workspace.deliverables d on d.id=n.deliverable_id
    join cali_workspace.companies c on c.id=n.company_id
  )
  select round(avg(score),2),count(*)::integer into v_average,v_total from feedback;

  with feedback as (
    select score::integer from cali_workspace.account_record_feedback
    union all
    select score::integer from cali_workspace.nps_responses
  ), scores as (select generate_series(1,5) as score)
  select jsonb_object_agg(scores.score::text,coalesce(x.total,0) order by scores.score)
    into v_distribution
  from scores left join (
    select score,count(*)::integer as total from feedback group by score
  ) x using(score);

  with months as (
    select generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') as month_start
  ), feedback as (
    select score::numeric,created_at from cali_workspace.account_record_feedback
    union all
    select score::numeric,created_at from cali_workspace.nps_responses
  )
  select jsonb_agg(jsonb_build_object(
    'month',to_char(m.month_start,'YYYY-MM-01'),
    'average',case when count(f.score)=0 then null else round(avg(f.score),2) end,
    'count',count(f.score)::integer
  ) order by m.month_start)
    into v_monthly
  from months m
  left join feedback f on date_trunc('month',f.created_at)=m.month_start
  group by m.month_start;

  with feedback as (
    select f.score::integer as score,f.comment,f.created_at,
           'record'::text as source_type,f.record_id as entity_id,r.protocol,r.title,c.display_name as company_name
    from cali_workspace.account_record_feedback f
    join cali_workspace.account_records r on r.id=f.record_id
    join cali_workspace.companies c on c.id=f.company_id
    union all
    select n.score::integer,n.comment,n.created_at,
           'deliverable'::text,n.deliverable_id,null::text,d.title,c.display_name
    from cali_workspace.nps_responses n
    left join cali_workspace.deliverables d on d.id=n.deliverable_id
    join cali_workspace.companies c on c.id=n.company_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'score',score,'comment',comment,'createdAt',created_at,'sourceType',source_type,
    'entityId',entity_id,'protocol',protocol,'title',title,'company',company_name
  ) order by created_at desc),'[]'::jsonb)
    into v_recent
  from (select * from feedback order by created_at desc limit 8) q;

  return jsonb_build_object(
    'average',v_average,
    'total',coalesce(v_total,0),
    'distribution',coalesce(v_distribution,'{}'::jsonb),
    'monthly',coalesce(v_monthly,'[]'::jsonb),
    'recent',coalesce(v_recent,'[]'::jsonb)
  );
end;
$$;

revoke all on function cali_workspace.get_admin_satisfaction_overview() from public,anon;
grant execute on function cali_workspace.get_admin_satisfaction_overview() to authenticated;
