import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, mode, variant] = process.argv.slice(2);
assert.equal(migration, 'supabase/migrations/20261112153000_deliverable_review_cycles.sql');
assert(['O', 'A', 'R', 'D'].includes(mode));
assert(['success', 'failure'].includes(variant));
const source = (await readFile(migration, 'utf8')).trim();
assert(source.startsWith('begin;') && source.endsWith('commit;'));
let body = source.slice('begin;'.length, -'commit;'.length);
if (variant === 'failure') {
  const marker = 'do $delivery_revision_backfill$';
  assert.equal(body.split(marker).length, 2);
  body = body.replace(marker, `
create function cali_upgrade_probe.fail_delivery_backfill() returns trigger language plpgsql as $failure$
begin raise exception 'QA_BACKFILL_FAILURE'; end $failure$;
create trigger qa_fail_delivery_backfill before update of review_revision on cali_workspace.deliverables
for each row execute function cali_upgrade_probe.fail_delivery_backfill();
${marker}`);
}
process.stdout.write(`begin;\n${body}\n`);
if (variant === 'success') process.stdout.write(`
do $verify$
begin
  if (select tgenabled from pg_trigger where tgrelid='cali_workspace.deliverables'::regclass
      and tgname='deliverables_touch_updated_at') <> '${mode}' then
    raise exception 'QA_BACKFILL_TRIGGER_MODE';
  end if;
  if exists(select 1 from cali_upgrade_probe.expected_rows e join cali_workspace.deliverables d
      on d.id=e.row_id where e.relation='cali_workspace.deliverables'
      and to_jsonb(d)->'updated_at' is distinct from e.original->'updated_at') then
    raise exception 'QA_BACKFILL_CHANGED_TIMESTAMP';
  end if;
end $verify$;
rollback;
`);
