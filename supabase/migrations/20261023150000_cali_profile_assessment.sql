-- Perfil Comportamental CALI (base DISC, método cali-disc-v1, 23/10/2026). Só acréscimo: tabelas, bucket e funções novas.
-- Links (livre ou de uma empresa) → respostas brutas por bloco + escores calculados AQUI (fonte oficial) → relatório do
-- respondente (por token, PDF por e-mail) e do avaliador (só administradora; cliente só quando liberado por resultado).

create table if not exists cali_workspace.profile_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  title text not null default 'Perfil Comportamental CALI' check (length(title) between 1 and 120),
  company_id uuid references cali_workspace.companies(id) on delete set null,
  purpose text not null default 'desenvolvimento' check (purpose in ('selecao', 'desenvolvimento', 'diagnostico')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists cali_workspace.profile_results (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references cali_workspace.profile_links(id) on delete set null,
  company_id uuid references cali_workspace.companies(id) on delete set null,
  team_member_id uuid references cali_workspace.team_members(id) on delete set null,
  company_name text,
  person_name text not null check (length(person_name) between 2 and 120),
  email text not null,
  job_title text,
  purpose text,
  answers jsonb not null,
  scores jsonb not null,
  primary_style text not null check (primary_style in ('D', 'I', 'S', 'C')),
  secondary_style text not null check (secondary_style in ('D', 'I', 'S', 'C')),
  mixed boolean not null default false,
  method_version text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  access_token uuid not null unique default gen_random_uuid(),
  client_visible boolean not null default false,
  role_profile jsonb,
  report_path text,
  report_emailed_at timestamptz
);
create index if not exists profile_results_company_idx on cali_workspace.profile_results (company_id, created_at desc);
create index if not exists profile_results_member_idx on cali_workspace.profile_results (team_member_id);

alter table cali_workspace.profile_links enable row level security;
alter table cali_workspace.profile_results enable row level security;
create policy profile_links_admin_all on cali_workspace.profile_links for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy profile_results_admin_all on cali_workspace.profile_results for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
-- Cliente: só o resultado que a CALI liberou, da própria empresa.
create policy profile_results_client_visible on cali_workspace.profile_results for select to authenticated
  using (client_visible and company_id is not null and company_id = cali_workspace.current_company_id());
grant select, insert, update, delete on cali_workspace.profile_links to authenticated;
grant select, delete on cali_workspace.profile_results to authenticated;
grant update (client_visible, team_member_id, role_profile, company_id, job_title) on cali_workspace.profile_results to authenticated;

-- Contagem Mais/Menos de uma chave: {D:{raw,pct},...}; pct = (raw + blocos) / (2 × blocos) × 100 (50 = sem preferência).
create or replace function cali_workspace.profile_tally(p_answers jsonb, p_blocks integer)
returns jsonb language sql immutable set search_path to 'pg_catalog' as $$
  select jsonb_object_agg(s.style, jsonb_build_object('raw', s.raw, 'pct', round(((s.raw + p_blocks)::numeric / (2 * p_blocks)) * 100)::int))
    from (
      select st.style,
             coalesce(sum(case when a->>'mais' = st.style then 1 when a->>'menos' = st.style then -1 else 0 end), 0)::int as raw
        from (values ('D'), ('I'), ('S'), ('C')) as st(style)
        left join jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a on true
       group by st.style
    ) s;
$$;

create or replace function public.cali_profile_link(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('title', l.title, 'purpose', l.purpose, 'status', l.status,
         'company_name', c.display_name, 'has_company', l.company_id is not null)
    from cali_workspace.profile_links l left join cali_workspace.companies c on c.id = l.company_id
   where l.slug = lower(btrim(coalesce(p_slug, ''))) and l.status in ('open', 'closed');
$$;
revoke all on function public.cali_profile_link(text) from public;
grant execute on function public.cali_profile_link(text) to anon, authenticated;

create or replace function public.cali_profile_submit(p_slug text, p_name text, p_email text, p_job_title text, p_company_name text, p_answers jsonb, p_consent boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare
  v_link cali_workspace.profile_links%rowtype;
  v_pressure_blocks int[] := array[2, 5, 8, 11, 14, 17];
  v_natural jsonb; v_pressure jsonb; v_n6 jsonb; v_nat jsonb; v_pre jsonb; v_adapt jsonb := '{}'::jsonb;
  v_scores jsonb; v_primary text; v_secondary text; v_p1 int; v_p2 int; v_member uuid; v_id uuid; v_token uuid;
  v_email text := lower(btrim(coalesce(p_email, ''))); v_name text := btrim(coalesce(p_name, '')); v_count int; st text;
begin
  select * into v_link from cali_workspace.profile_links where slug = lower(btrim(coalesce(p_slug, '')));
  if not found or v_link.status <> 'open' then raise exception 'Este link não está recebendo respostas.'; end if;
  if coalesce(p_consent, false) is not true then raise exception 'É preciso concordar com o uso das respostas para continuar.'; end if;
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Informe seu nome.'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail informado.'; end if;
  select count(*) into v_count from cali_workspace.profile_results where link_id = v_link.id and created_at > now() - interval '1 minute';
  if v_count >= 30 then raise exception 'Muitas respostas ao mesmo tempo. Tente de novo em instantes.'; end if;

  v_natural := p_answers -> 'natural'; v_pressure := p_answers -> 'pressure';
  if jsonb_typeof(v_natural) <> 'array' or jsonb_array_length(v_natural) <> 18 then raise exception 'Responda todos os blocos.'; end if;
  if jsonb_typeof(v_pressure) <> 'array' or jsonb_array_length(v_pressure) <> 6 then raise exception 'Responda todos os blocos da semana difícil.'; end if;
  -- Cada bloco: número válido, sem repetição, Mais e Menos em estilos diferentes.
  select count(distinct (a->>'b')::int) into v_count from jsonb_array_elements(v_natural) a
   where (a->>'b') ~ '^\d+$' and (a->>'b')::int between 1 and 18 and a->>'mais' in ('D','I','S','C') and a->>'menos' in ('D','I','S','C') and a->>'mais' <> a->>'menos';
  if v_count <> 18 then raise exception 'Respostas incompletas. Recarregue a página e responda de novo.'; end if;
  select count(distinct (a->>'b')::int) into v_count from jsonb_array_elements(v_pressure) a
   where (a->>'b') ~ '^\d+$' and (a->>'b')::int = any(v_pressure_blocks) and a->>'mais' in ('D','I','S','C') and a->>'menos' in ('D','I','S','C') and a->>'mais' <> a->>'menos';
  if v_count <> 6 then raise exception 'Respostas incompletas. Recarregue a página e responda de novo.'; end if;

  v_nat := cali_workspace.profile_tally(v_natural, 18);
  v_pre := cali_workspace.profile_tally(v_pressure, 6);
  v_n6 := cali_workspace.profile_tally((select jsonb_agg(a) from jsonb_array_elements(v_natural) a where (a->>'b')::int = any(v_pressure_blocks)), 6);
  foreach st in array array['D','I','S','C'] loop
    v_adapt := v_adapt || jsonb_build_object(st, (v_pre->st->>'pct')::int - (v_n6->st->>'pct')::int);
  end loop;
  v_scores := jsonb_build_object('natural', v_nat, 'natural6', v_n6, 'pressure', v_pre, 'adaptation', v_adapt);
  select s, (v_nat->s->>'pct')::int into v_primary, v_p1 from unnest(array['D','I','S','C']) with ordinality as t(s, o) order by (v_nat->s->>'pct')::int desc, o limit 1;
  select s, (v_nat->s->>'pct')::int into v_secondary, v_p2 from unnest(array['D','I','S','C']) with ordinality as t(s, o) where s <> v_primary order by (v_nat->s->>'pct')::int desc, o limit 1;

  if v_link.company_id is not null then
    select id into v_member from cali_workspace.team_members
     where company_id = v_link.company_id and lower(work_email) = v_email and archived_at is null order by created_at desc limit 1;
  end if;

  insert into cali_workspace.profile_results (link_id, company_id, team_member_id, company_name, person_name, email, job_title, purpose,
         answers, scores, primary_style, secondary_style, mixed, method_version, consent_at)
  values (v_link.id, v_link.company_id, v_member, nullif(btrim(coalesce(p_company_name, '')), ''), v_name, v_email,
          nullif(left(btrim(coalesce(p_job_title, '')), 120), ''), v_link.purpose,
          jsonb_build_object('natural', v_natural, 'pressure', v_pressure), v_scores, v_primary, v_secondary, (v_p1 - v_p2) < 5, 'cali-disc-v1', now())
  returning id, access_token into v_id, v_token;
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;
revoke all on function public.cali_profile_submit(text, text, text, text, text, jsonb, boolean) from public;
grant execute on function public.cali_profile_submit(text, text, text, text, text, jsonb, boolean) to anon, authenticated;

-- Relatório do respondente: só com o token (link do e-mail). Não expõe as respostas por bloco.
create or replace function public.cali_profile_report(p_token uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('id', r.id, 'person_name', r.person_name, 'company_name', coalesce(c.display_name, r.company_name),
         'job_title', r.job_title, 'created_at', r.created_at, 'scores', r.scores, 'primary_style', r.primary_style,
         'secondary_style', r.secondary_style, 'mixed', r.mixed, 'method_version', r.method_version, 'has_pdf', r.report_path is not null)
    from cali_workspace.profile_results r left join cali_workspace.companies c on c.id = r.company_id
   where r.access_token = p_token;
$$;
revoke all on function public.cali_profile_report(uuid) from public;
grant execute on function public.cali_profile_report(uuid) to anon, authenticated;

-- PDF do respondente: gerado no navegador logo após o envio e guardado no bucket privado cali-profiles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cali-profiles', 'cali-profiles', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

create or replace function public.cali_profile_accepts_report(p_folder text)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.profile_results r
                  where r.id::text = p_folder and r.report_path is null and r.created_at > now() - interval '2 hours');
$$;
revoke all on function public.cali_profile_accepts_report(text) from public;
grant execute on function public.cali_profile_accepts_report(text) to anon, authenticated;
create policy cali_profiles_report_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cali-profiles' and public.cali_profile_accepts_report((storage.foldername(name))[1]));
create policy cali_profiles_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'cali-profiles' and cali_workspace.is_admin());
create policy cali_profiles_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cali-profiles' and cali_workspace.is_admin());

-- Marca o PDF como pronto e pede o e-mail com o anexo (função de borda cali-profile-report-email).
create or replace function public.cali_profile_report_ready(p_token uuid, p_path text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_id uuid; v_hook text;
begin
  update cali_workspace.profile_results set report_path = p_path
   where access_token = p_token and report_path is null and p_path like id::text || '/%' and length(p_path) <= 300
   returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false); end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is not null then
    perform net.http_post(
      url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/cali-profile-report-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
      body := jsonb_build_object('result_id', v_id));
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.cali_profile_report_ready(uuid, text) from public;
grant execute on function public.cali_profile_report_ready(uuid, text) to anon, authenticated;
