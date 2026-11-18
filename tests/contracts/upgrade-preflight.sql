-- Leitura pré-corte. Resultados contêm IDs privados e devem permanecer fora do Git.
-- Exige leitura de auth.users, runtime_secrets e vault.secrets. Nunca retorna segredos.
\set ON_ERROR_STOP on
begin transaction read only;

with incompatible_clients as (
  select p.id as profile_id,p.company_id,i.id as invite_id,i.active,i.platform_access
  from cali_workspace.profiles p
  join auth.users u on u.id=p.id and lower(btrim(u.email))=lower(btrim(p.email))
  join cali_workspace.companies c on c.id=p.company_id and c.status in ('active','paused')
  join cali_workspace.client_invites i on i.company_id=p.company_id
    and lower(btrim(i.email))=lower(btrim(p.email))
  where p.active and p.role='client' and i.active and not i.platform_access
    and not exists(select 1 from cali_workspace.client_invites eligible
      where eligible.company_id=p.company_id and lower(btrim(eligible.email))=lower(btrim(p.email))
        and eligible.active and eligible.platform_access)
), incompatible_partners as (
  select p.id as profile_id,s.id as staff_id,s.user_id as linked_user_id,
    case when s.user_id is null then 'missing_user_id' else 'different_user_id' end as reason
  from cali_workspace.profiles p
  join auth.users u on u.id=p.id and lower(btrim(u.email))=lower(btrim(p.email))
  join cali_workspace.staff_members s on s.active and lower(btrim(s.email))=lower(btrim(p.email))
  where p.active and p.role='partner' and not exists (
    select 1 from cali_workspace.staff_members eligible
    where eligible.active and eligible.user_id=p.id and lower(btrim(eligible.email))=lower(btrim(p.email)))
)
select 'client_active_without_platform_access' as issue,count(*) as rows,
  coalesce(jsonb_agg(to_jsonb(c) order by c.profile_id,c.invite_id),'[]'::jsonb) as private_details
from incompatible_clients c
union all
select 'partner_active_without_auth_link',count(*),
  coalesce(jsonb_agg(to_jsonb(p) order by p.profile_id,p.staff_id),'[]'::jsonb)
from incompatible_partners p;

-- Ausência interrompe o transporte após trocar os dispatchers. Chaves opcionais têm fallback ou JWT externo.
with expected(secret_key,required) as (values
  ('notification_email_hook',true),
  ('edge_url_workspace_notification_email_hook',true),
  ('edge_url_workspace_admin_daily_summary',true),
  ('edge_url_cali_profile_invites',true),
  ('edge_url_notificar_mapa',true),
  ('forms_confirmation_url',true),
  ('disc_report_url',true),
  ('company_elimination_worker_url',true),
  ('company_elimination_worker_hook',true),
  ('partner_timer_admin_email',false),
  ('forms_confirmation_bearer',false),
  ('disc_report_bearer',false)
)
select e.secret_key,e.required,exists(select 1 from cali_workspace.runtime_secrets s
  where s.secret_key=e.secret_key and nullif(btrim(s.secret_value),'') is not null) as present
from expected e order by e.required desc,e.secret_key;
select 'company_elimination_worker_bearer' as vault_secret,
  exists(select 1 from vault.secrets where name='company_elimination_worker_bearer') as present;

-- Códigos antigos permanecem no histórico, mas o verificador v2 exige novos marcadores de ator e entrega.
-- Aguardar a validade de todos os códigos e a saída dos escritores antigos antes de trocar o consumo.
select count(*) as unexpired_legacy_access_codes,
  max(expires_at) as latest_expiration
from cali_workspace.workspace_access_codes where used_at is null and expires_at>statement_timestamp();

-- Antes da instalação, a fila nova pode não existir. Catalogar somente a configuração dessa fase.
-- Após a instalação, jobs concluídos com manifesto por slug exigem revisão dos objetos remanescentes.
select to_regclass('cali_workspace.company_elimination_jobs') is not null as has_elimination_jobs \gset
\if :has_elimination_jobs
select count(*) as completed_eliminations_with_legacy_form_manifest,
  coalesce(jsonb_agg(jsonb_build_object('jobId',id,'companyId',company_id,'completedAt',completed_at)
    order by completed_at,id),'[]'::jsonb) as private_details
from cali_workspace.company_elimination_jobs
where completed_at is not null and scope ? 'formSlugs' and not(scope ? 'formIds');
\endif

rollback;
