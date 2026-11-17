#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
base="${1:?Informe a revisão de referência do dump.}"
snapshot=.cali-db-schema.local
image=public.ecr.aws/supabase/postgres:17.11.0.006
dump=cali-mapa-schema-2026-11-12.dump

(
  cd "$snapshot"
  shasum -a 256 -c SHA256SUMS
)
git rev-parse --verify "$base^{commit}" >/dev/null

container=$(docker run --detach --pull=never --network none --user postgres --entrypoint sh "$image" -ec '
  initdb -D /var/lib/postgresql/data -U cali_restore_admin --locale=C.UTF-8 --encoding=UTF8 --auth=trust
  exec postgres -D /var/lib/postgresql/data -c listen_addresses="" \
    -c shared_preload_libraries=pg_cron,pg_net,pg_stat_statements -c wal_level=logical \
    -c output_plugin_libraries=wal2json,pgoutput -c cron.database_name=postgres -c cron.launch_active_jobs=off
')
trap 'docker rm --force --volumes "$container" >/dev/null' EXIT
test "$(docker inspect "$container" --format '{{.HostConfig.NetworkMode}} {{json .HostConfig.PortBindings}}')" = 'none {}'

db=(docker exec -i "$container")
psql=(psql -U cali_restore_admin -d postgres -Xq -v ON_ERROR_STOP=1)
for attempt in {1..45}; do
  if [[ $("${db[@]}" "${psql[@]}" -Atc 'show cron.launch_active_jobs' 2>/dev/null) == off ]]; then break; fi
  sleep 1
done
test "$("${db[@]}" "${psql[@]}" -Atc 'show cron.launch_active_jobs')" = off
"${db[@]}" "${psql[@]}" --single-transaction < "$snapshot/qa/roles-bootstrap.sql"
"${db[@]}" pg_restore -U cali_restore_admin -d postgres --schema-only --no-password --exit-on-error --single-transaction < "$snapshot/$dump"

count=0
while IFS= read -r migration; do
  printf 'Apply %s\n' "$migration"
  "${db[@]}" "${psql[@]}" < "$migration"
  count=$((count + 1))
done < <(git diff --name-only --diff-filter=AM "$base" -- supabase/migrations | LC_ALL=C sort)
test "$count" -gt 0
printf 'PASS dump e %s migrations com Postgres sem rede e cron desativado\n' "$count"
"${db[@]}" "${psql[@]}" -Atc "select count(*) from pg_class where relnamespace='cali_workspace'::regnamespace and relkind in ('r','p')"
