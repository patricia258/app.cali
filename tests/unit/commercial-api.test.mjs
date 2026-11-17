import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workspaceHttp } from './helpers/workspace-http.mjs';

const rest = (name) => '/rest/v1/' + name;

test('Portal exige sessão e mantém contexto público e escopo na leitura administrativa', async (t) => {
  const http = await workspaceHttp(t);
  const { loadPortalAdminData, loadPortalOpportunity, loadPortalProposal } = await http.load('commercial/portal.ts');
  await assert.rejects(loadPortalAdminData(), /Sessão administrativa/);
  assert.equal(http.requests.length, 0);

  await http.signIn();
  const submission = { id: 'oportunidade-1', contact_email: '  RH+QA@Example.test  ' };
  const proposal = { id: 'proposta-1', version: 3 };
  const pricing = [{ service_slug: 'cali-build', active: true }];
  const activity = [{ id: 1, event_type: 'created' }];
  for (const [table, data] of [
    ['cali_submissions', [submission]], ['cali_proposals', [proposal]],
    ['cali_pricing_rules', pricing], ['cali_activity', activity],
  ]) http.respond(rest(table), data, { method: 'GET' });
  assert.deepEqual(await loadPortalAdminData(), { submissions: [submission], proposals: [proposal], pricing, activity });
  assert.ok(http.requests.slice(1).every(({ headers }) =>
    headers.get('accept-profile') === 'public' && headers.get('authorization') === `Bearer ${http.accessToken}`,
  ));

  http.respond(rest('cali_submissions'), [submission], { method: 'GET' });
  http.respond(rest('cali_proposals'), [proposal], { method: 'GET' });
  http.respond(rest('cali_pricing_rules'), pricing, { method: 'GET' });
  http.respond(rest('mapa_respostas'), { message: 'Mapa indisponível' }, { method: 'GET', status: 403 });
  assert.deepEqual(await loadPortalOpportunity(submission.id), { submission, proposals: [proposal], pricing, mapa: null });
  assert.equal(http.requests.find(({ url }) => url.pathname.endsWith('/mapa_respostas')).url.searchParams.get('c_email'), 'ilike.rh+qa@example.test');
  assert.equal(http.requests.filter(({ url }) => url.pathname.endsWith('/cali_proposals')).at(-1).url.searchParams.get('submission_id'), 'eq.oportunidade-1');

  http.respond(rest('cali_proposals'), [{ ...proposal, submission }], { method: 'GET' });
  assert.deepEqual(await loadPortalProposal(proposal.id), { ...proposal, submission });
  http.respond(rest('cali_proposals'), [], { method: 'GET' });
  assert.equal(await loadPortalProposal('inexistente'), null);
});

test('Portal cria, atualiza e registra histórico com representação do recurso', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('commercial/portal.ts');
  await http.signIn();
  const submissionId = 'lead-1';
  const draft = {
    submission_id: submissionId, service_slug: 'cali-build', version: 1, package_code: 'ESSENCIAL',
    base_price: 3000, extras: 0, discount_pct: 0, contract_months: 4, validity_days: 30,
    subtotal: 3000, final_unit: 3000, total_value: 3000, calculator_data: {}, scope_items: [],
    status: 'rascunho',
  };
  const saved = { id: 'p1', ...draft };
  http.respond(rest('cali_proposals'), [saved], { status: 201 });
  assert.deepEqual(await api.savePortalProposal({ payload: draft }), saved);
  http.respond(rest('cali_proposals'), [{ ...saved, version: 2 }], { method: 'PATCH' });
  assert.equal((await api.savePortalProposal({ proposalId: 'p1', payload: { ...draft, version: 2 } })).version, 2);
  http.respond(rest('cali_proposals'), [{ ...saved, status: 'aprovada' }], { method: 'PATCH' });
  assert.equal((await api.updatePortalProposal('p1', { status: 'aprovada' })).status, 'aprovada');
  http.respond(rest('cali_submissions'), [{ id: submissionId, status: 'aprovada' }], { method: 'PATCH' });
  assert.equal((await api.updatePortalSubmission(submissionId, { status: 'aprovada' })).status, 'aprovada');
  http.respond(rest('cali_activity'), [{ id: 1 }], { status: 201 });
  assert.deepEqual(await api.appendPortalActivity({ submission_id: submissionId, proposal_id: 'p1', event_type: 'approved' }), { id: 1 });

  const writes = http.requests.slice(1);
  assert.deepEqual(writes.map(({ method }) => method), ['POST', 'PATCH', 'PATCH', 'PATCH', 'POST']);
  assert.deepEqual(writes.map(({ url }) => url.searchParams.get('id')), [null, 'eq.p1', 'eq.p1', 'eq.lead-1', null]);
  assert.ok(writes.every(({ headers }) => headers.get('prefer') === 'return=representation'));
  assert.ok(writes.slice(0, 4).every(({ body }) => Number.isFinite(Date.parse(body.updated_at))));
  assert.deepEqual(writes.at(-1).body, { submission_id: submissionId, proposal_id: 'p1', event_type: 'approved', metadata: {} });

  http.respond(rest('cali_proposals'), { message: 'Revisão do Partner pendente' }, { method: 'PATCH', status: 409 });
  await assert.rejects(api.updatePortalProposal('p1', { status: 'aprovada' }), /Revisão do Partner pendente/);
});

test('envio comercial preserva revisão e idempotência e exige recibo do provedor', async (t) => {
  const http = await workspaceHttp(t);
  const { sendPortalProposal } = await http.load('commercial/portal.ts');
  await http.signIn();
  const endpoint = '/functions/v1/portal-send-proposal';
  const input = {
    proposal_id: 'p1', request_id: 'envio-1', version: 4, recipient_email: 'contato@example.test',
  };
  http.respond(endpoint, { ok: true, email_id: 'email-1' });
  assert.equal((await sendPortalProposal(input)).email_id, 'email-1');
  http.respond(endpoint, { ok: false, error: 'Versão desatualizada' }, { status: 409 });
  await assert.rejects(sendPortalProposal(input), /Versão desatualizada/);
  for (const badReceipt of [{ ok: true }, { ok: true, email_id: 123 }, { ok: 'true', email_id: 'email-2' }]) {
    http.respond(endpoint, badReceipt);
    await assert.rejects(sendPortalProposal(input), /Não foi possível enviar/);
  }
  for (const { headers, body } of http.requests.slice(1)) {
    assert.deepEqual(body, input);
    assert.equal(headers.get('authorization'), `Bearer ${http.accessToken}`);
    assert.equal(headers.get('content-profile'), null);
  }
});
