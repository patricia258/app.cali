begin;

do $$
declare
  new_version constant text := '2026-11-12.2';
  new_hash constant text := '3c5c328069900aec66bd3f661a914f6c9230abe9b8261e0f6d78c47cdf36062e';
begin
  if exists (select 1 from cali_v2_terms.publications p
    where p.version = new_version and p.content_hash <> new_hash) then
    raise exception 'A versão de termos já existe com outro conteúdo.';
  end if;
  update cali_v2_terms.publications set is_current = false where is_current and version <> new_version;
  insert into cali_v2_terms.publications (version, content_hash, is_current)
  values (new_version, new_hash, true)
  on conflict (version) do update set is_current = true;
end;
$$;

notify pgrst, 'reload schema';
commit;
