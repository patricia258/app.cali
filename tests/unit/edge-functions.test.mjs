import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { endpointRoot, handler, request, transport, workspace } from './support/edge-runtime.mjs';

const provider = 'https://api.resend.com';
const id = 'a1000000-0000-4000-8000-000000000001';
const otherId = 'a1000000-0000-4000-8000-000000000002';
const hook = 'qa-fixture-secret-with-at-least-32-bytes';

const { approvedRecipients, checkedPdf, sendMaterialEmail } = await import('../../supabase/functions/_shared/material-email.ts');
const { claimGoogleOAuth, googleRequest, startGoogleOAuth, withGoogleLease } = await import('../../supabase/functions/_shared/google-integration.ts');

const hookEndpoints = [
  'cali-forms-confirmation', 'cali-profile-invites', 'cali-profile-report-email',
  'workspace-admin-daily-summary', 'workspace-daily-chat-digest', 'workspace-notification-email-hook',
];
const googleEndpoints = [
  'google-calendar-oauth', 'google-calendar-refresh-event', 'google-drive-oauth',
  'workspace-google-calendar-read', 'workspace-sync-scheduled-event',
];
const sessionEndpoints = [
  'portal-send-proposal', 'workspace-company-elimination', 'workspace-enviar-relatorio-mapa',
  'workspace-send-executive-report', 'workspace-staff-invite',
];

test('as 17 Edge Functions carregam, recusam método inválido e aplicam a guarda de entrada', async t => {
  const expected = [...hookEndpoints, ...googleEndpoints, ...sessionEndpoints, 'workspace-access'].sort();
  const files = await readdir(endpointRoot, { recursive: true });
  assert.deepEqual(files.filter(file => /^[^/]+\/index\.ts$/.test(file)).map(file => file.split('/')[0]).sort(), expected);
  const fetch = transport(t, req => {
    assert.equal(new URL(req.url).pathname, '/rest/v1/runtime_secrets');
    assert.equal(req.headers.get('accept-profile'), 'cali_workspace');
    return Response.json([{ secret_value: hook }]);
  });
  for (const endpoint of expected) {
    const run = await handler(endpoint);
    assert.equal((await run(request(endpoint, { method: 'GET' }))).status, 405, endpoint);
    if (googleEndpoints.includes(endpoint) || endpoint === 'workspace-access') {
      assert.equal((await run(request(endpoint, { origin: 'https://fora.example.test' }))).status, 403, endpoint);
    }
    const body = endpoint === 'workspace-company-elimination' ? { jobId: id } : { action: 'authorize' };
    const status = endpoint === 'workspace-access' ? 400 : 401;
    assert.equal((await run(request(endpoint, { body }))).status, status, endpoint);
  }
  assert.equal(fetch.mock.callCount(), hookEndpoints.length);
});

test('envio comercial deduplica destinos e recusa destinatário externo, excesso e PDF inválido', () => {
  assert.deepEqual(approvedRecipients([' B@example.test ', 'a@example.test', 'b@EXAMPLE.TEST']), ['a@example.test', 'b@example.test']);
  assert.throws(() => approvedRecipients(['contato@example.invalid']), { status: 403 });
  assert.throws(() => approvedRecipients(Array.from({ length: 9 }, (_, i) => `${i}@example.test`)), { status: 400 });
  assert.throws(() => approvedRecipients(['nome <a@example.test>']), { status: 400 });
  const pdf = Buffer.from('%PDF-1.7\n%%EOF\n');
  assert.deepEqual(Buffer.from(checkedPdf(pdf.toString('base64')).bytes), pdf);
  assert.throws(() => checkedPdf(Buffer.from('%PDF-1.7\n').toString('base64')), { status: 400 });
  assert.throws(() => checkedPdf('JVBERi0' + 'A'.repeat(11_184_812)), { status: 400 });
});

function mailInput(overrides = {}) {
  return {
    kind: 'mapa', entityId: id, requestId: otherId, userId: id,
    recipients: ['cliente-a@example.test'], subject: 'Devolutiva', text: 'Mensagem',
    pdfPath: `${id}/1/arquivo.pdf`, version: 1, ...overrides,
  };
}

function materialRpc(t, reserve, complete = () => ({ error: null })) {
  const rpc = t.mock.fn(async (name, payload) => {
    if (name === 'reserve_material_email') return reserve(payload);
    if (name === 'complete_material_email') return complete(payload);
    assert.equal(name, 'reject_material_email');
    return { error: null };
  });
  const db = { schema: name => {
    assert.equal(name, 'cali_workspace');
    return { rpc };
  } };
  return { db, rpc };
}

test('reserva comercial congela revisão e conteúdo e reaproveita recibo sem chamar o provedor', async t => {
  const { db, rpc } = materialRpc(t, args => args.p_version === 1
    ? { data: { id, provider_id: 'receipt-existing' } }
    : { error: { code: '40001' } });
  assert.equal(await sendMaterialEmail(db, mailInput()), 'receipt-existing');
  assert.equal(await sendMaterialEmail(db, mailInput()), 'receipt-existing');
  await assert.rejects(sendMaterialEmail(db, mailInput({ version: 2 })), { status: 409 });
  const reservations = rpc.mock.calls.map(call => call.arguments[1]);
  assert.deepEqual(reservations[0], reservations[1]);
  assert.match(reservations[0].p_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(reservations[0].p_hash, reservations[2].p_hash);
  assert.equal(reservations[2].p_version, 2);
});

test('retry comercial mantém chave do provedor após falha de confirmação do recibo', async t => {
  const input = mailInput();
  let completions = 0;
  const { db, rpc } = materialRpc(t, () => ({ data: { id } }), () => ({ error: ++completions === 1 ? {} : null }));
  const keys = [];
  transport(t, async req => {
    assert.equal(req.url, `${provider}/emails`);
    assert.equal(req.redirect, 'error');
    keys.push(req.headers.get('Idempotency-Key'));
    assert.deepEqual((await req.json()).to, input.recipients);
    return Response.json({ id: 'provider-1' });
  });
  await assert.rejects(sendMaterialEmail(db, input), { status: 503 });
  assert.equal(await sendMaterialEmail(db, input), 'provider-1');
  assert.deepEqual(keys, [`cali-material-${id}`, `cali-material-${id}`]);
  const [first, second] = rpc.mock.calls.filter(call => call.arguments[0] === 'complete_material_email');
  assert.deepEqual(first.arguments, second.arguments);
  assert.deepEqual(first.arguments[1], {
    p_job_id: id, p_provider_id: 'provider-1', p_recipients: input.recipients,
    p_pdf_path: input.pdfPath, p_version: 1,
  });
});

test('falha permanente rejeita reserva comercial e falha transitória permite repetir a mesma confirmação', async t => {
  const { db, rpc } = materialRpc(t, () => ({ data: { id } }));
  let status = 429;
  transport(t, req => {
    assert.equal(req.url, `${provider}/emails`);
    return Response.json({}, { status });
  });
  await assert.rejects(sendMaterialEmail(db, mailInput()), { status: 502 });
  assert.deepEqual(rpc.mock.calls.map(call => call.arguments[0]), ['reserve_material_email']);
  status = 422;
  await assert.rejects(sendMaterialEmail(db, mailInput()), { status: 502 });
  assert.deepEqual(rpc.mock.calls.at(-1).arguments, ['reject_material_email', { p_job_id: id }]);
  const pending = materialRpc(t, () => ({ error: { code: '55000' } }));
  await assert.rejects(sendMaterialEmail(pending.db, mailInput()), { status: 409, message: /revisão do Partner/ });
});

test('OAuth guarda PKCE e vínculo exato da tentativa e devolve recibo em replay', async t => {
  const config = googleRequest(request('google-calendar-oauth'));
  const rpc = t.mock.fn(async () => ({ data: { status: 'complete', receipt: { connection: id } } }));
  const insert = t.mock.fn(async () => ({ error: null }));
  const actor = { user: { id }, session: otherId, profile: { role: 'client', company_id: id }, db: {
    rpc,
    from: table => {
      assert.equal(table, 'google_oauth_attempts');
      return { insert, delete: () => ({ lt: async () => ({ error: null }) }) };
    },
  } };
  const before = Date.now();
  const started = await startGoogleOAuth(config, actor, 'calendar', id);
  const [row] = insert.mock.calls[0].arguments;
  const state = JSON.parse(Buffer.from(started.state, 'base64url'));
  assert.deepEqual(state, { nonce: row.nonce, purpose: 'calendar', company: id });
  assert.equal(started.challenge, createHash('sha256').update(row.verifier).digest('base64url'));
  assert.equal(row.user_id, id);
  assert.equal(row.session_id, otherId);
  assert.equal(row.redirect_uri, workspace + '/oauth/google/callback');
  assert(Date.parse(row.expires_at) >= before + 600_000);
  assert(Date.parse(row.expires_at) <= Date.now() + 600_000);
  const result = await claimGoogleOAuth(config, actor, 'calendar', started.state, 'qa-code');
  assert.deepEqual(result.receipt, { connection: id });
  assert.deepEqual(rpc.mock.calls[0].arguments, ['claim_google_oauth', {
    p_nonce: row.nonce, p_user: id, p_session: otherId, p_company: id,
    p_purpose: 'calendar', p_redirect: row.redirect_uri, p_code: 'qa-code',
  }]);
  await assert.rejects(claimGoogleOAuth(config, actor, 'drive', started.state, 'qa-code'), { message: 'invalid_oauth_state' });
  const foreignState = Buffer.from(JSON.stringify({ ...state, company: otherId })).toString('base64url');
  await assert.rejects(claimGoogleOAuth(config, actor, 'calendar', foreignState, 'qa-code'), { message: 'invalid_oauth_state' });
  assert.equal(rpc.mock.callCount(), 1);
});

test('OAuth isolado recusa conta, convidado e provider externos e libera lease após erro', async t => {
  const config = googleRequest(request('google-drive-oauth'));
  assert(config.configured);
  assert.throws(() => config.assertAccount('person@example.invalid'), { status: 403 });
  assert.throws(() => config.invitations(['person@example.invalid']), { status: 403 });
  assert.equal(config.invitations(['cliente-a@example.test']), 'none');
  await assert.rejects(config.fetch('https://oauth2.googleapis.com.example.test/token'), { status: 403 });
  transport(t, req => {
    assert.equal(req.url, 'http://google-qa:9000/token');
    return Response.json({ ok: true });
  });
  assert.equal((await config.fetch('https://oauth2.googleapis.com/token')).status, 200);
  const rpc = t.mock.fn(async () => ({ data: true }));
  await assert.rejects(withGoogleLease({ rpc }, 'calendar:qa', async renew => {
    await renew();
    throw Error('erro durante sync');
  }), /erro durante sync/);
  const calls = rpc.mock.calls.map(call => call.arguments);
  assert.deepEqual(calls.map(([name]) => name), ['lease_google_operation', 'lease_google_operation', 'release_google_operation']);
  assert.deepEqual(calls[0][1], calls[2][1]);
});

const hookHeaders = { 'x-workspace-hook': hook };

function rpcResponse(req, route, args, data) {
  assert.equal(new URL(req.url).pathname, `/rest/v1/rpc/${route}`);
  assert.equal(req.method, 'POST');
  assert.equal(req.headers.get('content-profile'), 'cali_workspace');
  return req.json().then(body => {
    assert.deepEqual(body, args);
    return Response.json(data);
  });
}

test('Forms confirma uma resposta, mantém chave no retry e libera a reserva se o envio falha', async t => {
  const run = await handler('cali-forms-confirmation');
  const makeRequest = () => request('cali-forms-confirmation', { headers: hookHeaders, body: { response_id: id } });
  const deliveries = [];
  const finishes = [];
  let sent = false;
  transport(t, async req => {
    switch (new URL(req.url).pathname) {
      case '/rest/v1/runtime_secrets': return Response.json([{ secret_value: hook }]);
      case '/rest/v1/form_responses': return Response.json([{
        id, respondent_name: 'Pessoa <QA>', respondent_email: 'cliente-a@example.test', confirmation_sent_at: sent ? 'done' : null,
        answers: { text: '<conteúdo>' }, forms: { title: 'Teste', confirm_email: true, questions: [{ id: 'text', kind: 'text', label: 'Comentário' }] },
      }]);
      case '/rest/v1/rpc/cali_form_claim_confirmation':
        return rpcResponse(req, 'cali_form_claim_confirmation', { p_response_id: id }, otherId);
      case '/rest/v1/rpc/cali_form_finish_confirmation': {
        const body = await req.json();
        assert.equal(body.p_response_id, id);
        assert.equal(body.p_lease, otherId);
        finishes.push(body.p_sent);
        sent = body.p_sent;
        return Response.json(true);
      }
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        const email = await req.json();
        assert.deepEqual(email.to, ['cliente-a@example.test']);
        assert.match(email.html, /&lt;conteúdo&gt;/);
        deliveries.push(req.headers.get('Idempotency-Key'));
        return Response.json({ id: 'qa-forms-provider' }, { status: deliveries.length === 1 ? 502 : 200 });
      }
      default: assert.fail(`Unexpected Forms request ${req.url}`);
    }
  });
  assert.equal((await run(makeRequest())).status, 502);
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true });
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true, skipped: true });
  assert.deepEqual(finishes, [false, true]);
  assert.deepEqual(deliveries, [`cali-form-confirmation/${id}`, `cali-form-confirmation/${id}`]);
});

test('DISC reenvia o PDF privado arquivado e finaliza a reserva com a mesma referência', async t => {
  const endpoint = 'cali-profile-report-email';
  const run = await handler(endpoint);
  const pdf = Buffer.from('%PDF-1.7\n%%EOF\n');
  const path = `${id}/perfil-comportamental.pdf`;
  let deliveries = 0;
  transport(t, async req => {
    switch (new URL(req.url).pathname) {
      case '/rest/v1/runtime_secrets': return Response.json([{ secret_value: hook }]);
      case '/rest/v1/profile_results': return Response.json([{
        id, person_name: 'Cliente QA', email: 'cliente-a@example.test', primary_style: 'D', secondary_style: 'S', report_path: path,
      }]);
      case '/rest/v1/rpc/cali_profile_claim_report':
        return rpcResponse(req, 'cali_profile_claim_report', { p_result_id: id }, { lease: otherId });
      case `/storage/v1/object/cali-profiles/${path}`:
      case `/storage/v1/object/authenticated/cali-profiles/${path}`:
        return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        assert.equal(req.headers.get('Idempotency-Key'), `cali-profile-report/${id}`);
        const email = await req.json();
        assert.deepEqual(email.to, ['cliente-a@example.test']);
        assert.deepEqual(email.attachments.map(file => Buffer.from(file.content, 'base64')), [pdf]);
        deliveries++;
        return Response.json({ id: 'qa-disc-provider' });
      }
      case '/rest/v1/rpc/cali_profile_finish_report':
        return rpcResponse(req, 'cali_profile_finish_report', { p_result_id: id, p_lease: otherId, p_sent: true }, true);
      default: assert.fail(`Unexpected DISC request ${req.url}`);
    }
  });
  const response = await run(request(endpoint, { headers: hookHeaders, body: { result_id: id } }));
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(deliveries, 1);
});

test('cronômetro só envia alerta reservado para o Partner ativo e registra recibo uma vez', async t => {
  const endpoint = 'workspace-notification-email-hook';
  const run = await handler(endpoint);
  const makeRequest = () => request(endpoint, { headers: hookHeaders, body: { outbox_id: id } });
  let state = 'pending';
  let claimAt;
  let deliveries = 0;
  transport(t, async req => {
    const { pathname, searchParams } = new URL(req.url);
    switch (pathname) {
      case '/rest/v1/runtime_secrets': return Response.json([{ secret_value: hook }]);
      case '/rest/v1/profiles':
        assert.equal(searchParams.get('id'), `eq.${otherId}`);
        return Response.json([{ role: 'partner', active: true, email: 'partner-a@example.test' }]);
      case '/rest/v1/communication_outbox': {
        const patch = await req.json();
        assert.equal(req.method, 'PATCH');
        assert.equal(searchParams.get('id'), `eq.${id}`);
        if (patch.status === 'sending') {
          assert.equal(searchParams.get('template_key'), 'eq.partner_timer_presence_warning');
          if (state !== 'pending') return Response.json([]);
          state = 'sending';
          claimAt = patch.updated_at;
          return Response.json([{
            id, recipient_email: 'partner-a@example.test', subject: 'Cronômetro pausado por inatividade', metadata: { recipient_user_id: otherId },
          }]);
        }
        assert.equal(searchParams.get('updated_at'), `eq.${claimAt}`);
        assert.equal(searchParams.get('status'), 'eq.sending');
        assert.equal(patch.provider_id, 'qa-timer-provider');
        assert.equal(patch.status, 'sent');
        state = patch.status;
        return new Response(null, { status: 204 });
      }
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        assert.equal(req.headers.get('Idempotency-Key'), `workspace-partner-timer-${id}`);
        const email = await req.json();
        assert.deepEqual(email.to, ['partner-a@example.test']);
        assert.match(email.html, /\/equipe\/horas/);
        assert.match(email.html, /justificativa/);
        deliveries++;
        return Response.json({ id: 'qa-timer-provider' });
      }
      default: assert.fail(`Unexpected timer request ${req.url}`);
    }
  });
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true });
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true, skipped: 'already_processed' });
  assert.equal(deliveries, 1);
});

test('eliminação remove apenas o lote reservado e devolve o recibo concluído em retry', async t => {
  const endpoint = 'workspace-company-elimination';
  const run = await handler(endpoint);
  const path = `${id}/1/arquivo.pdf`;
  const done = { jobId: id, state: 'completed', receipt: { files_removed: 1 } };
  const lease = { p_job: id, p_lease: otherId };
  let deleted = false;
  let completed = false;
  let reservations = 0;
  transport(t, async req => {
    switch (new URL(req.url).pathname) {
      case '/rest/v1/rpc/admin_read_company_elimination_job':
        return rpcResponse(req, 'admin_read_company_elimination_job', { p_job: id }, completed ? done : { jobId: id, state: 'queued' });
      case '/rest/v1/rpc/claim_company_elimination_job':
        reservations++;
        return rpcResponse(req, 'claim_company_elimination_job', { p_job: id }, { jobId: id, leaseId: otherId });
      case '/rest/v1/rpc/company_elimination_batch':
        return rpcResponse(req, 'company_elimination_batch', lease, deleted ? [] : [{ bucket: 'cali-mapa-delivery', path }]);
      case '/storage/v1/object/cali-mapa-delivery':
        assert.equal(req.method, 'DELETE');
        assert.deepEqual(await req.json(), { prefixes: [path] });
        deleted = true;
        return Response.json([{ name: path }]);
      case '/rest/v1/rpc/finalize_company_elimination_job':
        assert(deleted);
        completed = true;
        return rpcResponse(req, 'finalize_company_elimination_job', lease, done);
      default: assert.fail(`Unexpected elimination request ${req.url}`);
    }
  });
  const makeRequest = () => request(endpoint, { headers: { Authorization: 'Bearer qa-admin' }, body: { jobId: id } });
  assert.deepEqual(await (await run(makeRequest())).json(), { job: done });
  assert.deepEqual(await (await run(makeRequest())).json(), { job: done });
  assert.equal(reservations, 1);
});

test('eliminação recusa bucket fora do manifesto permitido e libera lease para retry', async t => {
  const endpoint = 'workspace-company-elimination';
  const run = await handler(endpoint);
  const lease = { p_job: id, p_lease: otherId };
  let released = false;
  transport(t, req => {
    switch (new URL(req.url).pathname) {
      case '/rest/v1/rpc/admin_read_company_elimination_job':
        return rpcResponse(req, 'admin_read_company_elimination_job', { p_job: id }, { jobId: id, state: 'queued' });
      case '/rest/v1/rpc/claim_company_elimination_job':
        return rpcResponse(req, 'claim_company_elimination_job', { p_job: id }, { jobId: id, leaseId: otherId });
      case '/rest/v1/rpc/company_elimination_batch':
        return rpcResponse(req, 'company_elimination_batch', lease, [{ bucket: 'outside', path: 'arquivo.pdf' }]);
      case '/rest/v1/rpc/release_company_elimination_lease':
        released = true;
        return rpcResponse(req, 'release_company_elimination_lease', { ...lease, p_failed: true }, null);
      default: assert.fail(`Unexpected elimination request ${req.url}`);
    }
  });
  const response = await run(request(endpoint, { headers: { Authorization: 'Bearer qa-admin' }, body: { jobId: id } }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { job: { jobId: id, state: 'retry' } });
  assert(released);
});

test('convite de equipe exige Admin e encaminha só para cadastro ativo e autorizado', async t => {
  const endpoint = 'workspace-staff-invite';
  const run = await handler(endpoint);
  const makeRequest = () => request(endpoint, { headers: { Authorization: 'Bearer qa-session' }, body: { staffId: id } });
  let admin = false;
  let active = true;
  let email = 'fora@example.invalid';
  let sent = 0;
  const fetch = transport(t, async req => {
    const { pathname, searchParams } = new URL(req.url);
    switch (pathname) {
      case '/rest/v1/rpc/is_admin':
        assert.equal(req.headers.get('authorization'), 'Bearer qa-session');
        return Response.json(admin);
      case '/rest/v1/staff_members':
        assert.equal(searchParams.get('id'), `eq.${id}`);
        return Response.json([{ id, active, email, full_name: 'Partner QA' }]);
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        assert.deepEqual((await req.json()).to, [email]);
        sent++;
        return Response.json({ id: 'qa-invite-provider' });
      }
      default: assert.fail(`Unexpected team invitation request ${req.url}`);
    }
  });
  assert.equal((await run(makeRequest())).status, 403);
  assert.equal(fetch.mock.callCount(), 1);
  admin = true;
  assert.equal((await run(makeRequest())).status, 403);
  email = 'partner-a@example.test';
  active = false;
  assert.equal((await run(makeRequest())).status, 404);
  active = true;
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true });
  assert.equal(sent, 1);
});

test('convite DISC preserva link de resposta e opt-out e pula convite recusado', async t => {
  const endpoint = 'cali-profile-invites';
  const run = await handler(endpoint);
  const makeRequest = () => request(endpoint, { headers: hookHeaders, body: { kind: 'invite', invite_id: id } });
  let declined = false;
  let sent = 0;
  transport(t, async req => {
    const { pathname, searchParams } = new URL(req.url);
    switch (pathname) {
      case '/rest/v1/runtime_secrets': return Response.json([{ secret_value: hook }]);
      case '/rest/v1/profile_invites':
        assert.equal(searchParams.get('id'), `eq.${id}`);
        return Response.json([{
          id, link_id: otherId, person_name: 'Pessoa QA', email: 'disc@example.test', token: 'token-sintetico',
          deadline_at: '2099-01-01T00:00:00Z', declined_at: declined ? 'declined' : null,
        }]);
      case '/rest/v1/profile_links':
        assert.equal(searchParams.get('id'), `eq.${otherId}`);
        return Response.json([{ id: otherId, slug: 'disc-qa' }]);
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        const email = await req.json();
        assert.deepEqual(email.to, ['disc@example.test']);
        assert(email.html.includes(`${workspace}/perfil/disc-qa?c=token-sintetico`));
        assert(email.html.includes(`${workspace}/perfil/sair/token-sintetico`));
        sent++;
        return Response.json({ id: 'qa-disc-invite-provider' });
      }
      default: assert.fail(`Unexpected DISC invitation request ${req.url}`);
    }
  });
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true });
  declined = true;
  assert.deepEqual(await (await run(makeRequest())).json(), { ok: true, skipped: true });
  assert.equal(sent, 1);
});

test('digest agrupa conversas e registra envio apenas das notificações entregues', async t => {
  const endpoint = 'workspace-daily-chat-digest';
  const run = await handler(endpoint);
  const base = { company_id: id, entity_id: otherId, action_url: '/cliente/ocorrencias' };
  const notifications = [
    { ...base, id: 'n1', user_id: id },
    { ...base, id: 'n2', user_id: id },
    { ...base, id: 'n3', user_id: otherId },
  ];
  let marked = false;
  let sent = false;
  transport(t, async req => {
    const { pathname, searchParams } = new URL(req.url);
    switch (pathname) {
      case '/rest/v1/runtime_secrets': return Response.json([{ secret_value: hook }]);
      case '/rest/v1/profiles': return Response.json([
        { id, email: 'cliente-a@example.test', active: true },
        { id: otherId, email: 'cliente-b@example.test', active: false },
      ]);
      case '/rest/v1/companies': return Response.json([{ id, display_name: 'Empresa QA' }]);
      case '/rest/v1/account_records': return Response.json([{ id: otherId, title: '<Assunto>', company_id: id, record_type: 'occurrence' }]);
      case '/rest/v1/notifications':
        if (req.method === 'GET') {
          assert.equal(searchParams.get('read_at'), 'is.null');
          assert.equal(searchParams.get('emailed_at'), 'is.null');
          return Response.json(notifications);
        }
        assert(sent);
        assert.equal(req.method, 'PATCH');
        assert.equal(searchParams.get('id'), 'in.(n1,n2)');
        marked = true;
        return new Response(null, { status: 204 });
      case '/emails': {
        assert.equal(req.url, `${provider}/emails`);
        const email = await req.json();
        assert.deepEqual(email.to, ['cliente-a@example.test']);
        assert.match(email.subject, /Empresa QA · 2 mensagem/);
        assert.equal(email.html.match(/&lt;Assunto&gt;/g)?.length, 1);
        sent = true;
        return Response.json({ id: 'qa-digest-provider' });
      }
      default: assert.fail(`Unexpected digest request ${req.url}`);
    }
  });
  assert.deepEqual(await (await run(request(endpoint, { headers: hookHeaders }))).json(), { ok: true, recipients: 1, notifications: 3 });
  assert(marked);
});
