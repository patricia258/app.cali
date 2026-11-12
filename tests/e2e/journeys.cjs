'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, projectId, tables } = require('./fixtures.cjs');

const delivery = tables.deliverables.find((row) => row.title === 'Entrega QA C');
const recordTitle = 'Solicitação QA fictícia';

async function mockRpc(context, origin, name, handler) {
  await context.route('https://cali-local-qa.supabase.co/rest/v1/rpc/' + name, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    const { data, status = 200 } = handler(route.request().postDataJSON());
    await route.fulfill({ json: data, status, headers: { 'access-control-allow-origin': origin } });
  });
}

async function deliveryReviewCycle({ page: admin, context: adminContext, origin, openActor }) {
  const { page: client, context: clientContext } = await openActor('client');
  const current = { ...delivery, status: 'approved', review_revision: 1, client_visible: true };
  const releasedAt = '2026-11-12T13:00:00Z';
  const feedback = [
    {
      id: 'qa-score-one',
      deliverable_id: delivery.id,
      company_id: companyId,
      delivery_review_revision: 1,
      score: 4,
      comment: 'Primeira avaliação QA.',
      created_at: current.approval_requested_at,
    },
  ];
  const writes = [];
  async function mockTable(context, table, rows) {
    await context.route(
      (url) => url.origin === 'https://cali-local-qa.supabase.co' && url.pathname === '/rest/v1/' + table,
      (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ json: rows(), headers: { 'access-control-allow-origin': origin } })
          : route.fallback(),
    );
  }
  for (const context of [adminContext, clientContext]) {
    await mockTable(context, 'deliverables', () => [
      ...tables.deliverables.filter((row) => row.id !== delivery.id),
      ...(current.client_visible || context === adminContext ? [current] : []),
    ]);
  }
  await mockTable(clientContext, 'nps_responses', () => (current.client_visible ? feedback : []));
  await mockRpc(adminContext, origin, 'reopen_deliverable_for_review_v2', (body) => {
    writes.push(body);
    Object.assign(current, { status: 'internal_review', review_revision: 2, client_visible: false });
    return { data: { review_revision: 2, status: 'internal_review', client_visible: false } };
  });
  await mockRpc(adminContext, origin, 'change_deliverable_review_status_v2', (body) => {
    writes.push(body);
    Object.assign(current, { status: 'client_review', client_visible: true, approval_requested_at: releasedAt });
    return { data: { ok: true } };
  });
  await mockRpc(clientContext, origin, 'client_approve_deliverable_review_v2', (body) => {
    writes.push(body);
    feedback.unshift({
      ...feedback[0],
      id: 'qa-score-two',
      delivery_review_revision: 2,
      score: 5,
      created_at: releasedAt,
    });
    current.status = 'approved';
    return { data: { already_approved: false } };
  });
  const query = '?deliverable=' + delivery.id + '&project=' + projectId;
  const clientUrl = origin + '/cliente/entregaveis' + query;
  const clientDialog = client.getByRole('dialog', { name: delivery.title, exact: true });
  await client.goto(clientUrl);
  await clientDialog.waitFor();

  await admin.goto(origin + '/admin/projetos' + query);
  const overview = admin.getByRole('button', { name: 'Visão geral', exact: true });
  await overview.click();
  await admin.getByRole('button', { name: 'Reabrir para correção', exact: true }).click();
  const reopen = admin.getByRole('dialog', { name: 'Reabrir entregável', exact: true });
  const confirm = reopen.getByRole('button', { name: 'Reabrir para correção', exact: true });
  assert(await confirm.isDisabled());
  await reopen.getByRole('textbox', { name: 'Motivo', exact: true }).fill('Corrigir o resumo de QA.');
  await confirm.click();
  await reopen.waitFor({ state: 'hidden' });
  await overview.click();

  await client.reload();
  await client.getByRole('heading', { name: /^Projetos/, level: 1 }).waitFor();
  assert.equal(await clientDialog.count(), 0);
  assert.equal(await client.getByText(delivery.title, { exact: true }).count(), 0);

  const release = admin.getByRole('button', { name: 'Liberar revisão ao cliente', exact: true });
  await release.click();
  await release.waitFor({ state: 'hidden' });
  await client.reload();
  await clientDialog.getByRole('button', { name: 'Aprovar entrega', exact: true }).click();
  const approval = client.getByRole('dialog', { name: 'Como foi esta entrega?', exact: true });
  await approval.getByRole('button', { name: '5', exact: true }).click();
  await approval.getByRole('button', { name: 'Confirmar aprovação e avaliação', exact: true }).click();
  await approval.waitFor({ state: 'hidden' });
  await clientDialog.getByRole('button', { name: 'Histórico', exact: true }).click();
  await clientDialog.getByText('Revisão 1 · Sua avaliação: 4/5', { exact: true }).waitFor();
  await clientDialog.getByText('Revisão 2 · Sua avaliação: 5/5', { exact: true }).waitFor();
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[0], {
    p_deliverable_id: delivery.id,
    p_review_revision: 1,
    p_reason: 'Corrigir o resumo de QA.',
  });
  assert.equal(writes[1].p_status, 'client_review');
  assert.equal(writes[1].p_review_revision, 2);
  assert.deepEqual(writes[2], {
    p_deliverable_id: delivery.id,
    p_review_revision: 2,
    p_review_requested_at: releasedAt,
    p_score: 5,
    p_comment: null,
  });
}

const cases = [
  {
    id: '01-anonymous-deep-link',
    role: 'public',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/documentos?arquivo=qa#arquivos');
      await page.waitForURL(origin + '/login');
      await page.getByRole('textbox', { name: /e-mail/i }).waitFor();
      assert.equal(await page.locator('.sidebar').count(), 0);
    },
  },
  {
    id: '02-company-list-and-search',
    role: 'admin',
    async run({ page, origin }) {
      await page.goto(origin + '/admin/clientes');
      await page.getByRole('heading', { name: /Contas e clientes/, level: 1 }).waitFor();
      const company = page.getByText('Empresa QA fictícia', { exact: true }).first();
      await company.waitFor();
      const search = page.getByPlaceholder(/buscar/i).last();
      await search.fill('Sem correspondência QA');
      await company.waitFor({ state: 'hidden' });
      await search.clear();
      await company.waitFor();
    },
  },
  {
    id: '02-admin-onboarding-contract-and-new-link',
    role: 'admin',
    async run({ page, context, origin }) {
      const company = 'Empresa QA fictícia';
      const partner = '4c801da1-47c0-44df-bb47-73d1ea39cd76';
      const contact = '8c801da1-47c0-44df-bb47-73d1ea39cd76';
      const contract = {
        id: '5c801da1-47c0-44df-bb47-73d1ea39cd76',
        title: 'Contrato sintético assinado', date: '2026-11-12', version: 'assinada-v2', available: true,
      };
      const state = {
        registration: { expiresAt: '2026-11-19T13:00:00Z', submittedAt: null, fields: null },
        supportPartnerId: null, partners: [{ id: partner, name: 'Partner QA' }], contract: null,
        reviewVersion: 'ficha-v1', pendingContacts: [{ id: contact, name: 'Contato QA', email: 'contato@example.test' }],
        pendingAccesses: 1, activeAccesses: 0, releasedAt: null,
      };
      const issued = [];
      const assigned = [];
      const released = [];
      const pdf = Buffer.from('%PDF-1.7\nContrato sintético de QA\n%%EOF\n');
      let storagePath;
      const database = 'https://cali-local-qa.supabase.co';
      const headers = { 'access-control-allow-origin': origin };
      const uploadPrefix = '/storage/v1/object/cali-workspace-private/';
      await context.route((url) => url.origin === database && url.pathname.startsWith(uploadPrefix), async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        storagePath = new URL(route.request().url()).pathname.slice(uploadPrefix.length);
        assert.match(storagePath, new RegExp(`^${companyId}/account/contract-\\d+-contrato-QA\\.pdf$`));
        const request = new Request(route.request().url(), {
          method: 'POST', headers: route.request().headers(), body: route.request().postDataBuffer(),
        });
        const body = await request.formData();
        const upload = body.get('');
        assert.ok(upload instanceof File);
        assert.equal(upload.type, 'application/pdf');
        assert.deepEqual(Buffer.from(await upload.arrayBuffer()), pdf);
        return route.fulfill({ json: { Key: 'cali-workspace-private/' + storagePath }, headers });
      });
      await context.route(database + '/rest/v1/account_documents', (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        const document = route.request().postDataJSON();
        assert.ok(storagePath);
        assert.equal(document.storage_path, storagePath);
        assert.equal(document.company_id, companyId);
        assert.equal(document.document_type, 'contract');
        assert.equal(document.document_date, contract.date);
        state.contract = contract;
        state.reviewVersion = 'ficha-v2';
        return route.fulfill({ status: 201, headers });
      });
      await mockRpc(context, origin, 'read_company_onboarding', (body) => {
        assert.deepEqual(body, { p_company: companyId });
        return { data: state };
      });
      await mockRpc(context, origin, 'issue_company_pre_registration', (body) => {
        issued.push(body);
        if (issued.length === 1) return { data: { message: 'Falha transitória de QA' }, status: 503 };
        return { data: state.registration.expiresAt };
      });
      await mockRpc(context, origin, 'set_company_support_partner', (body) => {
        assigned.push(body);
        state.supportPartnerId = partner;
        return { data: null };
      });
      await mockRpc(context, origin, 'release_company_access', (body) => {
        released.push(body);
        state.activeAccesses = 1;
        state.pendingAccesses = 0;
        state.pendingContacts = [];
        state.releasedAt = '2026-11-12T14:00:00Z';
        return { data: { releasedAt: state.releasedAt, accessCount: 1 } };
      });

      await page.goto(origin + '/admin/clientes');
      await page.getByRole('button', { name: 'Editar ' + company, exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Gerenciar ' + company, exact: true });
      await sheet.getByRole('tab', { name: 'Acessos', exact: true }).click();
      const panel = sheet.getByRole('region', { name: 'Acessos e responsáveis' });
      const sign = panel.getByRole('checkbox', { name: /confirmo que o contrato vinculado/iu });
      const release = panel.getByRole('button', { name: 'Liberar acessos', exact: true });
      assert.equal(await sign.isDisabled(), true);
      assert.equal(await release.isDisabled(), true);

      const regenerate = panel.getByRole('button', { name: 'Gerar novo link' });
      await regenerate.click();
      await panel.getByText('Falha transitória de QA', { exact: true }).waitFor();
      await regenerate.click();
      await panel.getByText('Link gerado.', { exact: true }).waitFor();
      assert.equal(issued.length, 2);
      assert.deepEqual(issued[0], issued[1]);
      assert.equal(issued[0].p_company, companyId);
      assert.match(issued[0].p_token, /^[a-f0-9-]{36}$/);
      assert.equal(await panel.getByRole('textbox', { name: 'Link para a empresa' }).inputValue(), origin + '/pre-cadastro/' + issued[0].p_token);

      await panel.getByRole('combobox', { name: 'Partner de apoio' }).selectOption(partner);
      await panel.getByRole('button', { name: 'Salvar responsáveis' }).click();
      await panel.getByText('Responsáveis atualizados.', { exact: true }).waitFor();
      assert.deepEqual(assigned, [{ p_company: companyId, p_partner: partner }]);
      assert.equal(await sign.isDisabled(), true);
      await panel.getByLabel('Arquivo do contrato').setInputFiles({ name: 'contrato QA.pdf', mimeType: 'application/pdf', buffer: pdf });
      await panel.getByLabel('Data do contrato').fill(contract.date);
      await panel.getByRole('button', { name: 'Anexar contrato' }).click();
      await panel.getByText(/Contrato sintético assinado/).waitFor();
      assert.equal(await release.isDisabled(), true);
      assert.deepEqual(released, []);
      await sign.check();
      await release.click();
      await panel.getByText('1 acesso(s) liberado(s).', { exact: true }).waitFor();
      await panel.getByText('1 liberado(s) · 0 aguardando liberação.', { exact: true }).waitFor();
      assert.equal(await release.isDisabled(), true);
      assert.equal(released.length, 1);
      assert.match(released[0].p_request, /^[a-f0-9-]{36}$/);
      assert.deepEqual(released[0], {
        p_company: companyId, p_request: released[0].p_request, p_contract: contract.id,
        p_contract_version: contract.version, p_review_version: state.reviewVersion, p_signed_and_adhesion: true,
      });
    },
  },
  {
    id: '02-public-pre-registration',
    role: 'public',
    async run({ page, context, origin }) {
      const token = '3c801da1-47c0-44df-bb47-73d1ea39cd76';
      const calls = [];
      await mockRpc(context, origin, 'cali_read_company_pre_registration', (body) => {
        calls.push({ read: body });
        return { data: 'open' };
      });
      await mockRpc(context, origin, 'cali_submit_company_pre_registration', (body) => {
        calls.push({ submit: body });
        if (calls.filter((call) => call.submit).length === 1) {
          return { data: { message: 'Conflito temporário de QA' }, status: 409 };
        }
        return { data: 'submitted' };
      });

      await page.goto(origin + '/pre-cadastro/' + token);
      const fields = {
        'Nome da empresa': 'Empresa QA', 'Razão social': 'Empresa QA Ltda', Cidade: 'Curitiba',
        UF: 'pr', 'Pessoa de contato': 'Contato QA', 'E-mail de trabalho': 'contato@example.test',
      };
      for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: true }).fill(value);

      const submit = page.getByRole('button', { name: 'Enviar dados' });
      await submit.click();
      await page.getByRole('alert').getByText('Conflito temporário de QA').waitFor();
      assert.equal(await page.getByLabel('Razão social').inputValue(), 'Empresa QA Ltda');
      await submit.click();
      await page.getByText(/Dados recebidos/).waitFor();
      assert.equal(await submit.count(), 0);
      assert.deepEqual(calls, [
        { read: { p_token: token } },
        ...Array.from({ length: 2 }, () => ({
          submit: {
            p_token: token, p_name: 'Empresa QA', p_legal_name: 'Empresa QA Ltda', p_city: 'Curitiba',
            p_state: 'PR', p_contact: 'Contato QA', p_email: 'contato@example.test',
          },
        })),
      ]);

      await page.goto(origin + '/pre-cadastro/link-invalido');
      await page.getByText(/Link indisponível/).waitFor();
      assert.equal(await submit.count(), 0);
      assert.equal(calls.length, 3);
    },
  },
  {
    id: '03-proposal-editor',
    role: 'admin',
    async run({ page, origin }) {
      const url = origin + '/admin/propostas/qa-submission/editar?qa=ref#proposta';
      await page.goto(url);
      await page.getByRole('heading', { name: 'Construir proposta', exact: true }).waitFor();
      assert.equal(page.url(), url);
    },
  },
  {
    id: '04-client-home-contacts',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente');
      await page.getByText('Patrícia Lima', { exact: true }).waitFor();
      await page.getByText('Apoio QA', { exact: true }).waitFor();
      assert.equal(await page.locator('.client-home textarea').count(), 0);
      await page.getByRole('link', { name: 'Falar com a CALI' }).click();
      await page.waitForURL(origin + '/cliente/registros');
      await page.getByRole('heading', { name: 'Ocorrências', exact: true }).waitFor();
    },
  },
  {
    id: '05-project-and-roadmap',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/entregaveis');
      await page.getByRole('heading', { name: 'Prazos das entregas', exact: true }).waitFor();
      assert.equal(await page.getByRole('combobox', { name: 'Projeto', exact: true }).inputValue(), projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir ' + delivery.title, exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Histórico', exact: true }).click();
      await page.getByText('Histórico do projeto', { exact: true }).waitFor();
    },
  },
  {
    id: '06-delivery-review-deep-link',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/entregaveis?deliverable=' + delivery.id + '&project=' + projectId);
      const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
      await dialog.getByRole('button', { name: 'Aprovar entrega', exact: true }).waitFor();
      await dialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      await dialog.getByText('Arquivo QA da entrega · PDF', { exact: true }).waitFor();
    },
  },
  { id: '06-delivery-review-cycle', role: 'admin', run: deliveryReviewCycle },
  {
    id: '06-project-timer-start-and-pause',
    role: 'admin',
    async run({ page, context, origin }) {
      const timerId = 'bb000000-0000-4000-8000-000000000003';
      let active = false;
      const calls = [];
      await context.route('https://cali-local-qa.supabase.co/rest/v1/work_timers?**', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          json: active ? [{
            id: timerId, company_id: companyId, project_id: projectId, deliverable_id: delivery.id, task_id: null,
            started_at: new Date().toISOString(), paused_seconds: 0, description: delivery.title, status: 'active',
          }] : [],
          headers: { 'access-control-allow-origin': origin },
        });
      });
      await mockRpc(context, origin, 'start_work_timer_v2', (body) => {
        calls.push({ start: body });
        active = true;
        return { data: timerId };
      });
      await mockRpc(context, origin, 'pause_work_timer', (body) => {
        calls.push({ pause: body });
        active = false;
        return { data: 1 };
      });
      await page.goto(origin + '/admin/projetos?deliverable=' + delivery.id + '&project=' + projectId);
      const header = page.locator('.project-header-timer');
      await header.getByRole('button', { name: 'Iniciar timer' }).click();
      await header.getByText('Timer ativo', { exact: true }).waitFor();
      assert.equal(await header.getByRole('button', { name: 'Iniciar timer' }).count(), 0);
      await header.getByRole('button', { name: 'Pausar e registrar sessão' }).click();
      await header.getByText(/Sessão pausada e registrada no histórico/).waitFor();
      await header.getByRole('button', { name: 'Iniciar timer' }).waitFor();
      assert.deepEqual(calls, [
        { start: { p_company_id: companyId, p_project_id: projectId, p_deliverable_id: delivery.id,
          p_task_id: null, p_category: 'Entregáveis', p_description: delivery.title, p_client_visible: true } },
        { pause: { p_timer_id: timerId } },
      ]);
    },
  },
  {
    id: '06-project-delivery-performance-history',
    role: 'admin',
    async run({ page, context, origin }) {
      const performance = {
        deliverable_id: delivery.id, project_id: projectId, protocol: delivery.protocol, title: delivery.title,
        status: 'approved', total_minutes: 95, delivery_timing: 'before_deadline', business_days_from_deadline: -2,
        start_timing: 'started_on_time', planned_start_date: '2026-10-01', actual_started_at: '2026-10-01T14:00:00Z',
        effective_due_at: '2026-10-20T14:00:00Z', completion_at: '2026-10-16T13:00:00Z', approved_at: '2026-10-16T13:00:00Z',
      };
      const reads = [];
      await context.route('https://cali-local-qa.supabase.co/rest/v1/deliverable_delivery_performance?**', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        reads.push(new URL(route.request().url()).searchParams.get('project_id'));
        return route.fulfill({
          json: [performance, { ...performance, deliverable_id: 'qa-open', title: 'Execução aberta QA', status: 'in_progress' }],
          headers: { 'access-control-allow-origin': origin },
        });
      });
      await page.goto(origin + '/admin/projetos?project=' + projectId);
      await page.getByRole('tab', { name: 'Histórico', exact: true }).click();
      const history = page.locator('.project-delivery-history-v14');
      await history.getByText(delivery.title, { exact: true }).waitFor();
      await history.getByText('Aprovado pelo cliente', { exact: true }).waitFor();
      await history.getByText(/2 dia\(s\) útil\(eis\) antes do prazo/).waitFor();
      await history.getByText('1h 35min registrados', { exact: true }).waitFor();
      assert.equal(await history.getByText('Execução aberta QA', { exact: true }).count(), 0);
      assert.ok(reads.length > 0 && reads.every((filter) => filter === 'eq.' + projectId));
    },
  },
  {
    id: '06-stale-delivery-approval',
    role: 'client',
    width: 390,
    async run({ page, context, origin }) {
      const requests = [];
      await mockRpc(context, origin, 'client_approve_deliverable_review_v2', (body) => {
        requests.push(body);
        return { status: 400, data: { code: '40001', message: 'A revisão mudou. Atualize antes de aprovar.' } };
      });
      await page.goto(origin + '/cliente/entregaveis?deliverable=' + delivery.id + '&project=' + projectId);
      await page.getByRole('button', { name: 'Aprovar entrega', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Como foi esta entrega?', exact: true });
      await dialog.getByRole('button', { name: '5', exact: true }).click();
      const confirm = dialog.getByRole('button', { name: 'Confirmar aprovação e avaliação', exact: true });
      await confirm.click();
      await dialog
        .getByRole('alert')
        .getByText('A revisão mudou. Atualize antes de aprovar.', { exact: true })
        .waitFor();
      assert(await confirm.isDisabled());
      assert.deepEqual(requests, [
        {
          p_deliverable_id: delivery.id,
          p_review_revision: delivery.review_revision,
          p_review_requested_at: delivery.approval_requested_at,
          p_score: 5,
          p_comment: null,
        },
      ]);
      const navigations = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) navigations.push(frame.url());
      });
      await Promise.all([
        page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === '/rest/v1/deliverables' && response.request().method() === 'GET' && response.ok();
        }),
        dialog.getByRole('button', { name: 'Atualizar dados', exact: true }).click(),
      ]);
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Aprovar entrega', exact: true }).waitFor();
      assert.deepEqual(navigations, []);
    },
  },
  {
    id: '07-client-hour-capacity',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/horas');
      await page.getByRole('heading', { name: /^Horas/, level: 1 }).waitFor();
      await page
        .getByText(/Atividade QA fictícia/)
        .first()
        .waitFor();
    },
  },
  {
    id: '06-client-dependency-read-only',
    role: 'client',
    async run({ page, context, origin }) {
      const reads = [];
      const fixtures = {
        deliverable_client_dependencies: [{
          id: 'dependency-qa', title: 'Enviar documentos do projeto', status: 'pending',
          due_date: '2026-11-10', received_at: null,
        }],
        deliverable_due_revisions: [{
          id: 'revision-qa', previous_due: '2026-11-12', new_due: '2026-11-16',
          cause: 'client_dependency', reason: 'Aguardar documentos do projeto', created_at: '2026-11-10T18:00:00Z',
        }],
      };
      for (const [table, rows] of Object.entries(fixtures)) {
        await context.route(
          (url) => url.origin === 'https://cali-local-qa.supabase.co' && url.pathname === '/rest/v1/' + table,
          (route) => {
            const request = route.request();
            if (request.method() === 'OPTIONS') return route.fallback();
            reads.push([table, request.method(), new URL(request.url()).searchParams.get('deliverable_id')]);
            return route.fulfill({ json: rows, headers: { 'access-control-allow-origin': origin } });
          },
        );
      }
      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/cliente/entregaveis?deliverable=' + delivery.id + '&project=' + projectId);
      const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
      await dialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      const section = dialog.locator('.v2-deps');
      await section.getByRole('heading', { name: 'O que precisamos de você' }).waitFor();
      await section.getByRole('alert').getByText(/pendência em atraso/i).waitFor();
      await section.getByText('Enviar documentos do projeto', { exact: true }).waitFor();
      await section.getByText('Aguardar documentos do projeto', { exact: true }).waitFor();
      assert.equal(await section.getByRole('button').count(), 0);
      assert.deepEqual(reads.sort(), Object.keys(fixtures).map((table) => [table, 'GET', 'eq.' + delivery.id]).sort());
    },
  },
  {
    id: '07-partner-timer-presence-and-recovery',
    role: 'partner',
    width: 390,
    async run({ page, context, origin }) {
      const now = Date.now();
      const at = (minutes) => new Date(now + minutes * 60_000).toISOString();
      let active = {
        id: 'qa-timer',
        companyId,
        description: 'Trecho em andamento QA',
        status: 'active',
        startedAt: at(-26),
        pausedSeconds: 0,
        warningAt: at(-1),
        pauseAt: at(4),
      };
      let recoveries = [
        {
          id: 'qa-recovery',
          companyId,
          description: 'Trecho pausado QA',
          startedAt: at(-65),
          countedUntil: at(-35),
          seconds: 1800,
          minutes: 30,
        },
      ];
      const confirmations = [];
      const submissions = [];
      await mockRpc(context, origin, 'read_partner_timer_state_v2', () => ({ data: { active, recoveries } }));
      await mockRpc(context, origin, 'touch_partner_timer_v2', (body) => {
        confirmations.push(body);
        active = { ...active, warningAt: at(25), pauseAt: at(30) };
        return { data: true };
      });
      await mockRpc(context, origin, 'submit_partner_timer_recovery_v2', (body) => {
        submissions.push(body);
        recoveries = [];
        return { data: { ok: true } };
      });
      await page.goto(origin + '/equipe/horas');
      const continueButton = page.getByRole('button', { name: 'Continuo aqui', exact: true });
      await continueButton.click();
      await continueButton.waitFor({ state: 'hidden' });
      assert.deepEqual(confirmations, [{ p_timer_id: 'qa-timer', p_confirm_presence: true }]);
      await page.getByRole('button', { name: /Justificar pausa · Trecho pausado QA/ }).click();
      const form = page.getByRole('dialog', { name: 'Justificar pausa do cronômetro', exact: true });
      assert.equal(await form.getByLabel('Minutos para aprovação', { exact: true }).inputValue(), '30');
      const send = form.getByRole('button', { name: 'Enviar para aprovação', exact: true });
      assert(await send.isDisabled());
      await form.getByLabel('Justificativa', { exact: true }).fill('Trecho de teste em reunião.');
      await send.click();
      await form.waitFor({ state: 'hidden' });
      await page.getByText('Justificativa enviada para aprovação da Patrícia.', { exact: true }).waitFor();
      assert.deepEqual(submissions, [
        { p_timer_id: 'qa-recovery', p_justification: 'Trecho de teste em reunião.', p_minutes: 30 },
      ]);
    },
  },
  {
    id: '08-team-tabs-and-period',
    role: 'client',
    async run({ page, origin }) {
      const indicators = origin + '/cliente/equipe?aba=indicadores&tag=a&tag=b#equipe';
      await page.goto(indicators);
      const tabs = page.locator('.section-tabs');
      await tabs.locator('button.current').filter({ hasText: 'Indicadores' }).waitFor();
      await page.getByRole('button', { name: 'Período', exact: true }).click();
      await page.getByLabel('De', { exact: true }).fill('2026-08');
      await page.getByLabel('Até', { exact: true }).fill('2026-09');
      assert.equal(await page.getByLabel('De', { exact: true }).getAttribute('max'), '2026-09');
      assert.equal(page.url(), indicators);
    },
  },
  {
    id: '09-admin-calendar-brasilia-boundary',
    role: 'admin',
    timezoneId: 'UTC',
    async run({ page, context, origin }) {
      await page.clock.setFixedTime(new Date('2026-12-15T12:00:00Z'));
      await context.route('https://cali-local-qa.supabase.co/rest/v1/events?*', async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          headers: { 'access-control-allow-origin': origin },
          json: [{
            id: 'boundary-qa', title: 'Reunião na virada do mês', event_type: 'meeting',
            starts_at: '2027-01-01T02:30:00Z', ends_at: '2027-01-01T03:00:00Z',
            company_id: companyId, visibility: 'client', all_day: false, staff_visible: true,
          }],
        });
      });
      await page.goto(origin + '/admin/calendario');
      await page.getByRole('button', { name: 'Lista', exact: true }).click();
      const event = page.locator('.calendar-agenda-view').getByRole('button', { name: /Reunião na virada do mês/ });
      await event.waitFor();
      assert.match(await event.innerText(), /31.*DEZ/s);
      assert.match(await event.innerText(), /23:30/);
    },
  },
  {
    id: '09-calendar-views',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/cronograma');
      await page.getByRole('heading', { name: 'Agenda compartilhada', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Mês', exact: true }).click();
      await page.locator('.calendar-month-grid').waitFor();
      await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
      await page.getByRole('button', { name: 'Semana', exact: true }).click();
      await page.locator('.calendar-week-lane').first().waitFor();
    },
  },
  {
    id: '10-record-conversation-and-company-history',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/registros');
      const history = page.locator('summary').filter({ hasText: 'Histórico por empresa' });
      await history.click();
      assert(await history.evaluate((element) => element.closest('details').open));
      await page.getByRole('button', { name: 'Abrir ' + recordTitle, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: recordTitle, exact: true });
      await dialog.getByText('Resposta QA da CALI.', { exact: true }).waitFor();
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
    },
  },
  {
    id: '11-documents-and-drive-entry',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/documentos');
      await page.getByRole('heading', { name: 'Documentos', exact: true }).waitFor();
      await page.getByText('Documento QA fictício', { exact: true }).first().waitFor();
      await page.getByRole('button', { name: /conectar.*drive/i }).waitFor();
    },
  },
  {
    id: '12-report-print',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/relatorios/impressao/qa-report');
      await page.locator('.report-print-v16-page').first().waitFor();
      await page.emulateMedia({ media: 'print' });
      await page.getByText('QA-REL-001', { exact: false }).first().waitFor();
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
      assert(
        (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length >= 2,
        'O relatório longo deve ter mais de uma página',
      );
    },
  },
  {
    id: '13-notice-url-and-close',
    role: 'client',
    async run({ page, origin }) {
      const closed = origin + '/cliente/avisos?tag=a&tag=b#aviso';
      await page.goto(closed.replace('#', '&aviso=qa-notice#'));
      const dialog = page.getByRole('dialog', { name: 'Comunicado', exact: true });
      await dialog.getByText('Comunicado QA', { exact: true }).waitFor();
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await page.waitForURL(closed);
      await dialog.waitFor({ state: 'hidden' });
    },
  },
  {
    id: '15-partner-authorized-materials',
    role: 'partner',
    async run({ page, origin }) {
      await page.goto(origin + '/equipe');
      await page.locator('.sidebar').getByRole('link', { name: 'Materiais', exact: true }).click();
      await page.waitForURL(origin + '/equipe/materiais');
      await page.getByRole('heading', { name: 'Materiais', exact: true }).waitFor();
    },
  },
  {
    id: '15-partner-unassigned-module',
    role: 'partnerLimited',
    async run({ page, origin }) {
      await page.goto(origin + '/equipe/materiais');
      await page.waitForURL(origin + '/equipe');
      await page.getByRole('heading', { name: /Visão geral/ }).waitFor();
      assert.equal(await page.locator('.sidebar a[href="/equipe/materiais"]').count(), 0);
    },
  },
  {
    id: '16-satisfaction-and-audit',
    role: 'admin',
    async run({ page, origin }) {
      await page.goto(origin + '/admin/satisfacao');
      await page.getByRole('heading', { name: 'Satisfação', exact: true }).waitFor();
      await page.getByRole('heading', { name: /Satisfação ao longo do tempo/ }).waitFor();
      await page.goto(origin + '/admin/auditoria');
      await page.getByRole('heading', { name: 'Auditoria', exact: true }).waitFor();
    },
  },
  {
    id: '17-public-forms-submit-and-disc-legacy',
    role: 'public',
    async run({ page, context, origin }) {
      const submissions = [];
      await mockRpc(context, origin, 'cali_form_submit', (body) => {
        submissions.push(body);
        return { data: { ok: true, confirmation: false } };
      });
      await page.goto(origin + '/f/qa-form');
      await page.getByRole('button', { name: 'Começar', exact: true }).click();
      const field = page.getByRole('textbox');
      await field.fill('Pessoa QA');
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await page.getByText('Recebemos sua resposta de teste.', { exact: true }).waitFor();
      assert.equal(submissions.length, 1);
      const [body] = submissions;
      assert.equal(body.p_slug, 'qa-form');
      assert.equal(body.p_form_id, 'qa-form-id');
      assert.match(body.p_request_id, /^[0-9a-f-]{36}$/i);
      assert.deepEqual(body.p_answers, { 'qa-name': 'Pessoa QA', __visited: ['qa-name'] });
      for (const query of ['', '?novo=1']) {
        await page.goto(origin + '/perfil/relatorio/qa-legacy' + query);
        await page.getByRole('heading', { name: 'Obrigada por responder!', exact: true }).waitFor();
        await page.getByText(/solicite à CALI RH/).waitFor();
        assert.equal(await page.getByRole('link', { name: /baixar/i }).count(), 0);
        assert.equal(await page.getByRole('button', { name: /baixar/i }).count(), 0);
      }
    },
  },
  {
    id: '17-admin-people-map',
    role: 'admin',
    async run({ page, origin }) {
      await page.goto(origin + '/admin/mapa-de-people');
      await page.getByRole('heading', { name: 'Mapa de People', exact: true }).waitFor();
    },
  },
  {
    id: '18-help-fronts-and-retention-copy',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/frentes');
      await page.getByRole('heading', { name: /Frentes contratadas/ }).waitFor();
      await page.goto(origin + '/cliente/ajuda');
      await page.getByRole('heading', { name: /Dúvidas frequentes/ }).waitFor();
      for (const legal of ['/termos', '/privacidade']) {
        await page.goto(origin + legal);
        await page.getByText('30 dias corridos', { exact: true }).first().waitFor();
      }
    },
  },
];

browserSuite(cases).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
