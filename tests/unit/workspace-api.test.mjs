import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actorId, publishableKey, workspaceHttp } from './helpers/workspace-http.mjs';

const companyId = '1c801da1-47c0-44df-bb47-73d1ea39cd76';
const contractId = '2c801da1-47c0-44df-bb47-73d1ea39cd76';
const requestId = '3c801da1-47c0-44df-bb47-73d1ea39cd76';
const now = '2026-11-12T15:00:00Z';
const rpc = (name) => `/rest/v1/rpc/${name}`;

test('pré-cadastro público rejeita token inválido, normaliza campos e exige confirmação do servidor', async (t) => {
  const http = await workspaceHttp(t);
  const { readPreRegistration, submitPreRegistration } = await http.load('public/pre-registration.ts');
  const fields = {
    name: ' Empresa ', legalName: ' Empresa Ltda ', city: ' Curitiba ', state: ' pr ',
    contact: ' Pessoa ', email: 'contato@example.test',
  };
  await assert.rejects(readPreRegistration('link-inválido'));
  await assert.rejects(submitPreRegistration(requestId, { ...fields, email: 'incorreto' }), /campos obrigatórios/);
  assert.equal(http.requests.length, 0);

  http.respond(rpc('cali_read_company_pre_registration'), 'open');
  assert.equal(await readPreRegistration(requestId), 'open');
  http.respond(rpc('cali_read_company_pre_registration'), 'expired');
  await assert.rejects(readPreRegistration(requestId));
  http.respond(rpc('cali_submit_company_pre_registration'), 'submitted');
  await submitPreRegistration(requestId, fields);
  const sent = http.requests.at(-1);
  assert.deepEqual(sent.body, {
    p_token: requestId, p_name: 'Empresa', p_legal_name: 'Empresa Ltda', p_city: 'Curitiba',
    p_state: 'PR', p_contact: 'Pessoa', p_email: 'contato@example.test',
  });
  assert.equal(sent.headers.get('authorization'), null);
  http.respond(rpc('cali_submit_company_pre_registration'), { message: 'Link expirado' }, { status: 410 });
  await assert.rejects(submitPreRegistration(requestId, fields), /Link expirado/);
});

test('rascunho administrativo preserva idempotência, contatos removidos, emissão de link e Partner opcional', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('admin/companies/onboarding.ts');
  const contact = {
    name: 'Contato QA', email: 'contato@example.test', requested: true,
    primary_contact: true, access_role: 'primary',
  };
  http.respond(rpc('create_company_draft'), companyId);
  assert.equal(await api.createCompanyDraft(requestId, 'Empresa QA', null, ''), companyId);
  http.respond(rpc('save_company_access_draft'), null, { status: 204 });
  await api.saveCompanyAccessDraft(companyId, [contact], [actorId]);
  http.respond(rpc('issue_company_pre_registration'), now);
  assert.equal(await api.issueCompanyPreRegistration(companyId, requestId), now);
  http.respond(rpc('set_company_support_partner'), null, { status: 204 });
  await api.setCompanySupportPartner(companyId, null);
  assert.deepEqual(http.requests.map(({ body }) => body), [
    { p_request: requestId, p_company: 'Empresa QA', p_hours: null, p_service: null },
    { p_company: companyId, p_people: [contact], p_removed: [actorId] },
    { p_company: companyId, p_token: requestId },
    { p_company: companyId, p_partner: null },
  ]);
});

test('liberação exige recibo com até quatro acessos e encaminha as versões aprovadas', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('admin/companies/onboarding.ts');
  const contract = { id: contractId, title: 'Contrato QA', date: null, version: 'v3', available: true };
  const state = {
    registration: null, supportPartnerId: null, partners: [], contract, reviewVersion: 'r4',
    pendingContacts: [], pendingAccesses: 4, activeAccesses: 0, releasedAt: null,
  };
  http.respond(rpc('read_company_onboarding'), state);
  assert.deepEqual(await api.readCompanyOnboarding(companyId, new AbortController().signal), state);
  http.respond(rpc('read_company_onboarding'), { ...state, pendingAccesses: -1 });
  await assert.rejects(api.readCompanyOnboarding(companyId), /pendingAccesses/);

  const release = () => api.releaseCompanyAccess(companyId, requestId, contract, state.reviewVersion, true);
  http.respond(rpc('release_company_access'), { releasedAt: now, accessCount: 4 });
  assert.deepEqual(await release(), { releasedAt: now, accessCount: 4 });
  assert.deepEqual(http.requests.at(-1).body, {
    p_company: companyId, p_request: requestId, p_contract: contractId, p_contract_version: 'v3',
    p_review_version: 'r4', p_signed_and_adhesion: true,
  });
  http.respond(rpc('release_company_access'), { releasedAt: now, accessCount: 5 });
  await assert.rejects(release(), /accessCount/);
  http.respond(rpc('release_company_access'), { message: 'Revisão desatualizada' }, { status: 409 });
  await assert.rejects(release(), /Revisão desatualizada/);
});

test('responsáveis do Cliente toleram ausência e descartam resposta inválida', async (t) => {
  const http = await workspaceHttp(t);
  const { readClientAccountResponsibles } = await http.load('client/home/responsibles.ts');
  const value = {
    executive: {
      full_name: 'Executiva QA', job_title: null, avatar_url: null,
      avatar_position_x: 0, avatar_position_y: null, avatar_zoom: 1,
    },
    supportPartner: null,
  };
  http.respond(rpc('read_client_account_responsibles'), value);
  assert.deepEqual(await readClientAccountResponsibles(), value);
  http.respond(rpc('read_client_account_responsibles'), { ...value, supportPartner: { full_name: 42 } });
  assert.equal(await readClientAccountResponsibles(), null);
  http.respond(rpc('read_client_account_responsibles'), { message: 'Sem acesso' }, { status: 403 });
  assert.equal(await readClientAccountResponsibles(), null);
});

test('workspace Partner só usa empresas atribuídas e preserva horas zero e módulos vazios', async (t) => {
  const http = await workspaceHttp(t);
  const { readPartnerWorkspace } = await http.load('partner/workspace.ts');
  const staff = '/rest/v1/staff_members';
  const companies = rpc('partner_companies');
  const signal = new AbortController().signal;
  http.respond(staff, [{ full_name: 'Partner QA', modules: null }], { method: 'GET' });
  http.respond(companies, [{ id: companyId, display_name: 'Cliente QA', monthly_hours_contracted: 0 }]);
  const result = await readPartnerWorkspace(actorId, signal);
  assert.deepEqual(result, {
    id: actorId, name: 'Partner QA', modules: [],
    companies: [{
      id: companyId, display_name: 'Cliente QA', monthly_hours_contracted: 0, service_plan: null,
      logo_workspace_url: null, logo_url: null,
    }],
  });
  assert.equal(http.requests.find(({ url }) => url.pathname === staff).url.searchParams.get('user_id'), `eq.${actorId}`);
  http.respond(staff, [], { method: 'GET' });
  http.respond(companies, []);
  await assert.rejects(readPartnerWorkspace(actorId, signal));
  http.respond(staff, [{ full_name: 'Partner QA', modules: ['team'] }], { method: 'GET' });
  http.respond(companies, { message: 'Atribuição removida' }, { status: 403 });
  await assert.rejects(readPartnerWorkspace(actorId, signal), { message: 'Atribuição removida' });
});

test('métricas enviam revisão esperada e motivo da correção e exigem recibo versionado', async (t) => {
  const http = await workspaceHttp(t);
  const { writeTeamMetrics } = await http.load('team/metrics.ts');
  const data = {
    companyId, month: '2026-11-01', expectedAt: now, reason: 'Corrigir duplicidade',
    fields: {
      planned_hours: 0, absence_medical_hours: null, absence_leave_hours: null, absence_unjustified_hours: null,
      absence_accident_hours: null, overtime_hours: 2, hour_bank_balance: null, approved_headcount: {},
      enps_score: null, climate_score: null, climate_participation: null, notes: null,
    },
  };
  const path = rpc('write_company_team_metrics');
  http.respond(path, { updatedAt: now, revision: 2 });
  assert.deepEqual(await writeTeamMetrics(data, requestId), { updatedAt: now, revision: 2 });
  assert.deepEqual(http.requests[0].body, {
    p_company_id: companyId, p_month: data.month, p_expected_at: now, p_fields: data.fields,
    p_reason: data.reason, p_request_id: requestId,
  });
  http.respond(path, { updatedAt: now, revision: 0 });
  await assert.rejects(writeTeamMetrics(data, requestId), /revision/);
  http.respond(path, { message: 'Outra pessoa já atualizou o mês' }, { status: 409 });
  await assert.rejects(writeTeamMetrics(data, requestId), /Outra pessoa/);
});

test('devolutiva do Mapa retorna disponibilidade do PDF sem expor o caminho', async (t) => {
  const http = await workspaceHttp(t);
  const { loadMapaDeliveryState } = await http.load('admin/people-map/delivery.ts');
  const path = rpc('read_mapa_delivery_state');
  http.respond(path, { revision: 2, has_pdf: true, pdf_path: 'interno.pdf' });
  assert.deepEqual(await loadMapaDeliveryState(requestId), { revision: 2, hasPdf: true });
  assert.deepEqual(http.requests[0].body, { p_response_id: requestId });
  http.respond(path, { revision: 2, has_pdf: null });
  assert.deepEqual(await loadMapaDeliveryState(requestId), { revision: 2, hasPdf: false });
  for (const revision of ['2', 0, -1]) {
    http.respond(path, { revision, has_pdf: true });
    await assert.rejects(loadMapaDeliveryState(requestId), /consultar a revisão/);
  }
});

test('revisão do Mapa usa as RPCs autenticadas do schema público', async (t) => {
  const http = await workspaceHttp(t);
  const { readMapaReviewCatalog, readMapaReview, saveMapaReview } = await http.load('admin/people-map/reviews.ts');
  await http.signIn();
  const protocol = 'CALI-MAPA-2026-0001';
  const review = { id: requestId, protocolo: protocol, created_at: now, status: 'pending' };
  const journey = { session_id: requestId, accessed_at: now };
  http.respond(rpc('workspace_mapa_people_records'), [review]);
  http.respond(rpc('workspace_mapa_people_journeys'), [journey]);
  const catalog = await readMapaReviewCatalog();
  assert.deepEqual(catalog.records, [review]);
  assert.deepEqual(catalog.journeys, [journey]);
  http.respond(rpc('workspace_mapa_people_record'), [review]);
  assert.deepEqual(await readMapaReview(protocol), review);
  http.respond(rpc('workspace_update_mapa_people_record'), true);
  assert.equal(await saveMapaReview(requestId, 'reviewed', { geral: 'Revisão QA' }), true);
  assert.deepEqual(http.requests.at(-1).body, { p_id: requestId, p_status: 'reviewed', p_observacoes: { geral: 'Revisão QA' } });
  for (const { headers } of http.requests.slice(1)) {
    assert.equal(headers.get('content-profile'), 'public');
    assert.equal(headers.get('authorization'), `Bearer ${http.accessToken}`);
  }
});

test('arquivo privado valida caminho e sessão antes de ler bytes com a autorização do ator', async (t) => {
  const fetchBlob = globalThis.fetch;
  const http = await workspaceHttp(t);
  const { openPrivateWorkspaceFile } = await http.load('files/workspace.ts');
  const opens = [];
  const previews = [];
  const timers = [];
  http.browser.open = () => {
    const preview = {
      closed: false, opener: {}, close() { this.closed = true; },
      location: { replace: (url) => opens.push(url) },
    };
    previews.push(preview);
    return preview;
  };
  http.browser.setTimeout = (callback) => timers.push(callback);
  t.after(() => timers.forEach((callback) => callback()));

  for (const path of ['../empresa/file.pdf', 'empresa//file.pdf', 'empresa\\file.pdf']) {
    await assert.rejects(openPrivateWorkspaceFile(path), /caminho do arquivo é inválido/);
  }
  await assert.rejects(openPrivateWorkspaceFile('empresa/file.pdf'), /Entre novamente/);
  assert.ok(previews.every((preview) => preview.closed));
  assert.equal(http.requests.length, 0);

  await http.signIn();
  const path = '/storage/v1/object/authenticated/cali-workspace-private/empresa/relat%C3%B3rio%20%23.pdf';
  http.respond(path, new Response('%PDF-1.7 fixture', { headers: { 'Content-Type': 'application/pdf' } }), { method: 'GET' });
  await openPrivateWorkspaceFile('empresa/relatório #.pdf');
  const request = http.requests.at(-1);
  assert.equal(request.headers.get('authorization'), `Bearer ${http.accessToken}`);
  assert.equal(request.headers.get('apikey'), publishableKey);
  assert.equal(previews.at(-1).opener, null);
  assert.equal(await (await fetchBlob(opens[0])).text(), '%PDF-1.7 fixture');
});
