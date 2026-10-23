-- Perfil Comportamental (23/10, aplicada como cali_profile_link_company_label): nome de empresa digitado no link, para
-- empresa ainda não cadastrada. A tela pública mostra esse nome e não pergunta a empresa; o resultado herda o nome.
alter table cali_workspace.profile_links add column if not exists company_label text check (company_label is null or length(btrim(company_label)) between 1 and 120);
create or replace function public.cali_profile_link(p_slug text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('title', l.title, 'purpose', l.purpose, 'status', l.status,
         'company_name', coalesce(c.display_name, l.company_label),
         'has_company', l.company_id is not null or l.company_label is not null)
    from cali_workspace.profile_links l left join cali_workspace.companies c on c.id = l.company_id
   where l.slug = lower(btrim(coalesce(p_slug, ''))) and l.status in ('open', 'closed');
$$;
create or replace function cali_workspace.profile_results_link_label()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if new.company_id is null and (new.company_name is null or btrim(new.company_name) = '') and new.link_id is not null then
    select company_label into new.company_name from cali_workspace.profile_links where id = new.link_id;
  end if;
  return new;
end $$;
drop trigger if exists profile_results_link_label on cali_workspace.profile_results;
create trigger profile_results_link_label before insert on cali_workspace.profile_results
  for each row execute function cali_workspace.profile_results_link_label();
