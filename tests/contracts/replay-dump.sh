#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
base="${1:?Informe a revisão de referência do dump.}"
upgrade="${2:-}"
if [[ $# -gt 2 ]]; then
  printf 'Informe somente a revisão e, opcionalmente, --upgrade-fixtures.\n' >&2
  exit 2
fi
if [[ -n "$upgrade" && "$upgrade" != --upgrade-fixtures ]]; then
  printf 'Opção desconhecida: %s\n' "$upgrade" >&2
  exit 2
fi
snapshot=.cali-db-schema.local
image=public.ecr.aws/supabase/postgres:17.11.0.006
dump=cali-mapa-schema-2026-11-12.dump

(
  cd "$snapshot"
  shasum -a 256 -c SHA256SUMS
)
git rev-parse --verify "$base^{commit}" >/dev/null
git merge-base --is-ancestor "$base" HEAD

migration_list=$(mktemp "${TMPDIR:-/tmp}/cali-replay-migrations.XXXXXX")
gate_log=$(mktemp "${TMPDIR:-/tmp}/cali-replay-gate.XXXXXX")
trap 'rm -f "$migration_list" "$gate_log"' EXIT
python3 - "$base" > "$migration_list" <<'PY'
import re
import subprocess
import sys

base = sys.argv[1]
tracked = subprocess.check_output(["git", "diff", "--name-only", "--diff-filter=AM", "-z", base, "--", "supabase/migrations"])
untracked = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", "-z", "--", "supabase/migrations"])
paths = set(path for path in (tracked + untracked).split(b"\0") if path)
for path in sorted(paths):
    if re.fullmatch(rb"supabase/migrations/[0-9]+_[A-Za-z0-9_]+\.sql", path) is None:
        raise SystemExit("Nome de migration inválido para replay: " + repr(path))
    sys.stdout.buffer.write(path + b"\0")
PY
test -s "$migration_list"
expected_count=$(python3 -c 'import pathlib,sys; print(len(pathlib.Path(sys.argv[1]).read_bytes().split(b"\0"))-1)' "$migration_list")

container=$(docker run --detach --pull=never --network none --user postgres --entrypoint sh "$image" -ec '
  initdb -D /var/lib/postgresql/data -U cali_restore_admin --locale=C.UTF-8 --encoding=UTF8 --auth=trust
  exec postgres -D /var/lib/postgresql/data -c listen_addresses="" \
    -c shared_preload_libraries=pg_cron,pg_net,pg_stat_statements -c wal_level=logical \
    -c output_plugin_libraries=wal2json,pgoutput -c cron.database_name=postgres -c cron.launch_active_jobs=off
')
trap 'docker rm --force --volumes "$container" >/dev/null; rm -f "$migration_list" "$gate_log"' EXIT
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
if [[ "$upgrade" == --upgrade-fixtures ]]; then
  "${db[@]}" "${psql[@]}" < tests/contracts/upgrade-before.sql
fi

probe_delivery_backfill() {
  local migration="$1" original_mode mode action
  original_mode=$("${db[@]}" "${psql[@]}" -Atc "select tgenabled from pg_trigger where tgrelid='cali_workspace.deliverables'::regclass and tgname='deliverables_touch_updated_at'")
  for mode in O A R D; do
    case "$mode" in
      O) action=enable ;;
      A) action='enable always' ;;
      R) action='enable replica' ;;
      D) action=disable ;;
    esac
    "${db[@]}" "${psql[@]}" -c "alter table cali_workspace.deliverables $action trigger deliverables_touch_updated_at"
    node tests/contracts/delivery-backfill-probe.mjs "$migration" "$mode" success | "${db[@]}" "${psql[@]}"
    if node tests/contracts/delivery-backfill-probe.mjs "$migration" "$mode" failure | "${db[@]}" "${psql[@]}" > "$gate_log" 2>&1; then
      printf 'FAIL backfill não interrompeu após falha forçada no modo %s\n' "$mode" >&2
      exit 1
    fi
    if ! rg -q 'QA_BACKFILL_FAILURE' "$gate_log"; then
      printf 'FAIL backfill não chegou à falha forçada no modo %s\n' "$mode" >&2
      cat "$gate_log" >&2
      exit 1
    fi
    test "$("${db[@]}" "${psql[@]}" -Atc "select tgenabled from pg_trigger where tgrelid='cali_workspace.deliverables'::regclass and tgname='deliverables_touch_updated_at'")" = "$mode"
    test "$("${db[@]}" "${psql[@]}" -Atc "select not exists(select 1 from information_schema.columns where table_schema='cali_workspace' and table_name='deliverables' and column_name='review_revision')")" = t
    printf 'PASS backfill mantém updated_at e modo %s, inclusive após rollback da falha\n' "$mode"
  done
  case "$original_mode" in
    O) action=enable ;;
    A) action='enable always' ;;
    R) action='enable replica' ;;
    D) action=disable ;;
    *) printf 'Modo original de trigger inválido\n' >&2; exit 1 ;;
  esac
  "${db[@]}" "${psql[@]}" -c "alter table cali_workspace.deliverables $action trigger deliverables_touch_updated_at"
}

count=0
while IFS= read -r -d '' migration <&3; do
  printf 'Apply %s\n' "$migration"
  if [[ "$upgrade" == --upgrade-fixtures && "$migration" == supabase/migrations/20261112153000_deliverable_review_cycles.sql ]]; then
    probe_delivery_backfill "$migration"
  fi
  "${db[@]}" "${psql[@]}" < "$migration"
  count=$((count + 1))
done 3< "$migration_list"
if [[ "$count" -ne "$expected_count" ]]; then
  printf 'FAIL replay aplicou %s de %s migrations esperadas\n' "$count" "$expected_count" >&2
  exit 1
fi
if [[ "$upgrade" == --upgrade-fixtures ]]; then
  "${db[@]}" "${psql[@]}" < tests/contracts/upgrade-preflight.sql
  "${db[@]}" "${psql[@]}" < tests/contracts/upgrade-after.sql

  # Provar o próprio gate: negar um acesso elegível ou liberar o controle
  # negativo precisa tornar o replay vermelho. A substituição vive apenas na
  # transação desta conexão, dentro do container sem rede, e é revertida ao sair.
  for probe in eligible-denied ineligible-admitted; do
    if [[ "$probe" == eligible-denied ]]; then
      profile_number=1
      forced_access=false
    else
      profile_number=4
      forced_access=true
    fi
    if {
      cat <<SQL
begin;
alter function cali_workspace.workspace_login_eligible_v2(uuid) rename to workspace_login_eligible_probe_original;
create function cali_workspace.workspace_login_eligible_v2(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as \$probe\$
  select case when p_user_id = 'a17e0000-0000-4000-8000-00000000000${profile_number}'::uuid
    then ${forced_access} else cali_workspace.workspace_login_eligible_probe_original(p_user_id) end
\$probe\$;
SQL
      cat tests/contracts/upgrade-after.sql
    } | "${db[@]}" "${psql[@]}" > "$gate_log" 2>&1; then
      printf 'FAIL gate aceitou alteração de acesso %s\n' "$probe" >&2
      cat "$gate_log" >&2
      exit 1
    fi
    if ! rg -q "login:upgrade-${profile_number}@example[.]test[[:space:]]+[|][[:space:]]+f" "$gate_log" \
      || ! rg -q 'FAIL upgrade:' "$gate_log"; then
      printf 'FAIL gate %s não chegou à asserção esperada\n' "$probe" >&2
      cat "$gate_log" >&2
      exit 1
    fi
    printf 'PASS gate recusa regressão %s e reverte a alteração\n' "$probe"
  done
fi
printf 'PASS dump e %s migrations com Postgres sem rede e cron desativado\n' "$count"
"${db[@]}" "${psql[@]}" -Atc "select count(*) from pg_class where relnamespace='cali_workspace'::regnamespace and relkind in ('r','p')"
