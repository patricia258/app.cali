#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
container=cali-oneshot-qa-db-1
network=cali-oneshot-qa-internal

test "$(docker network inspect "$network" --format '{{.Internal}}')" = true
test "$(docker inspect "$container" --format '{{.State.Running}} {{len .NetworkSettings.Networks}} {{json .HostConfig.PortBindings}} {{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}')" = "true 1 {} $network"

printf 'Catálogo de RPCs do frontend\n'
node frontend-rpc-catalog.mjs | docker exec -i "$container" psql -U cali_restore_admin -d postgres -Xq -v ON_ERROR_STOP=1

for contract in session onboarding feedback timer calendar notice commercial-retention mapa-delivery mapa-retention material-review public-forms-disc team legacy-reports-notifications legacy-record-tasks privacy; do
  printf 'Contrato SQL %s\n' "$contract"
  {
    printf 'begin;\n'
    printf "select set_config('qa.contract','%s',true) is not null;\n" "$contract"
    cat fixture-actors.sql "$contract.sql"
    printf '\nrollback;\n'
  } | docker exec -i "$container" psql -U cali_restore_admin -d postgres -Xq -v ON_ERROR_STOP=1
done
