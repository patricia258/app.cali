import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Reproduz os nomes de argumentos e o prefixo de upload usados pela main
// anterior ao corte. O replay SQL comprova a preimagem; esta prova cobre o wire
// de PostgREST e os bytes reais de Storage no laboratório já migrado.
const url = 'http://127.0.0.1:56431';
const { CALI_QA_PUBLISHABLE_KEY: key, CALI_QA_SERVICE_ROLE_KEY: service } = process.env;
assert(key && service);
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 10000 }).trim();
assert.equal(docker('network', 'inspect', 'cali-oneshot-qa-internal', '--format', '{{.Internal}}'), 'true');
assert.equal(docker('inspect', 'cali-oneshot-qa-ingress-1', '--format', '{{(index (index .HostConfig.PortBindings "56431/tcp") 0).HostIp}}'), '127.0.0.1');
const sql = input => execFileSync('docker', ['exec', '-i', 'cali-oneshot-qa-db-1', 'psql', '-U', 'cali_restore_admin', '-d', 'postgres', '-XAtq', '-v', 'ON_ERROR_STOP=1'], {
  input, encoding: 'utf8', timeout: 10000,
}).trim();
assert.equal(sql("select inet_server_addr() is null and current_setting('cron.launch_active_jobs',true)='off';"), 't');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(url, key, options);
const administrative = createClient(url, service, options);
const forms = [randomUUID(), randomUUID()];
const slugs = forms.map(id => 'qa-legacy-' + id);
const paths = forms.map(id => `${id}/${randomUUID()}/${Date.now()}-legacy.pdf`);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

async function submit(answers, expectedStatus) {
  const response = await fetch(url + '/rest/v1/rpc/cali_form_submit', {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json', 'Content-Profile': 'public' },
    body: JSON.stringify({ p_slug: slugs[0], p_answers: answers }),
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, String(body?.message ?? 'Status inesperado'));
  return body;
}

try {
  sql(`insert into cali_workspace.forms(id,slug,title,status,confirm_email,company_id,thank_you,questions) values
    ('${forms[0]}','${slugs[0]}','Formulário legado HTTP A','open',false,'ca110000-0000-4000-8000-000000000001','Recebido',
      '[{"id":"choice","label":"Escolha","kind":"single_choice","required":true,"logic":[{"when":"Sem arquivo","goTo":"__end"}]},{"id":"attachment","label":"Arquivo","kind":"file","required":true}]'),
    ('${forms[1]}','${slugs[1]}','Formulário legado HTTP B','open',false,'ca110000-0000-4000-8000-000000000002','Recebido',
      '[{"id":"attachment","label":"Arquivo","kind":"file","required":false}]');`);
  const published = await anonymous.rpc('cali_form_public', { p_slug: slugs[0] });
  assert.equal(published.error, null);
  assert.equal(published.data.id, forms[0]);
  for (const path of paths) {
    const upload = await anonymous.storage.from('cali-forms').upload(path, pdf, { contentType: 'application/pdf', upsert: false });
    assert.equal(upload.error, null, 'Upload anônimo com prefixo legado');
  }
  const answer = { choice: 'Com arquivo', attachment: paths[0], __visited: ['choice', 'attachment'] };
  assert.deepEqual(await submit(answer, 200), { ok: true, thank_you: 'Recebido', confirmation: false });
  assert.deepEqual(await submit({ choice: 'Sem arquivo', __visited: ['choice'] }, 200), {
    ok: true, thank_you: 'Recebido', confirmation: false,
  });
  await submit({ ...answer, attachment: paths[1] }, 400);
  await submit({ ...answer, choice: 'Sem arquivo' }, 400);
  const state = JSON.parse(sql(`select jsonb_build_object(
    'responses',(select jsonb_agg(answers order by submitted_at,id) from cali_workspace.form_responses where form_id='${forms[0]}'),
    'receipts',(select count(*) from cali_workspace.form_submission_receipts where form_id='${forms[0]}'),
    'foreignResponses',(select count(*) from cali_workspace.form_responses where form_id='${forms[1]}'));`));
  assert.equal(state.receipts, 0, 'Tentativa legada não inventa request_id');
  assert.equal(state.foreignResponses, 0);
  assert.equal(state.responses.length, 2, 'Falhas não gravam resposta');
  assert(state.responses.some(item => item.attachment === paths[0] && item.choice === 'Com arquivo'));
  assert(state.responses.some(item => item.choice === 'Sem arquivo' && !Object.hasOwn(item, 'attachment')));
  assert(state.responses.every(item => !Object.hasOwn(item, '__visited')));
  const stored = await administrative.storage.from('cali-forms').download(paths[0]);
  assert.equal(stored.error, null);
  assert.deepEqual(Buffer.from(await stored.data.arrayBuffer()), pdf, 'Bytes do anexo preservados');
  console.log('PASS Forms HTTP legado: leitura, upload anônimo, 2 argumentos, ramo condicional, isolamento e bytes do anexo.');
} finally {
  const removed = await administrative.storage.from('cali-forms').remove(paths);
  assert.equal(removed.error, null, 'Limpeza dos dois objetos sintéticos');
  sql(`begin;
    delete from cali_workspace.forms where id in ('${forms[0]}','${forms[1]}');
    delete from cali_workspace.forms_trash where form_id in ('${forms[0]}','${forms[1]}');
    commit;`);
}
