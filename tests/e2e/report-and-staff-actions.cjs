'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';
const clock = '2026-11-12T16:00:00.000Z';

function intercept(context, origin, path, method, handle) {
  return context.route(
    (url) => url.origin === host && url.pathname === '/rest/v1/' + path,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const result = handle(request, new URL(request.url()).searchParams);
      if (!result) return route.fallback();
      return route.fulfill({
        status: result.status ?? 200,
        json: result.json,
        headers: { 'access-control-allow-origin': origin },
      });
    },
  );
}

browserSuite([
  {
    id: '12-partner-report-direct-print-loads-a4-paper',
    role: 'partner',
    async run({ page, context, origin }) {
      const report = {
        ...tables.reports[0],
        executive_summary: 'Resumo do período para validar uma folha comum.',
        risks: ['Acompanhar o planejamento do próximo período.'],
        next_steps: ['Confirmar as prioridades no próximo encontro.'],
        source_snapshot: {
          period: { start: '2026-09-01', end: '2026-09-30' },
          contract: { monthlyHours: 20 },
          deliverables: {},
          hours: { contractedHours: 20, consumedMinutes: 540 },
        },
      };
      await intercept(context, origin, 'reports', 'GET', (request) => ({
        json: request.headers().accept?.includes('vnd.pgrst.object') ? report : [report],
      }));
      await page.goto(origin + '/equipe/relatorios/impressao/' + report.id);
      const paper = page.locator('.reports-v19-paper').first();
      await paper.waitFor();
      const { width, height, horizontalPadding } = await paper.evaluate((element) => {
        const styles = getComputedStyle(element);
        return { width: parseFloat(styles.width), height: parseFloat(styles.height), horizontalPadding: parseFloat(styles.paddingLeft) };
      });
      assert.ok(Math.abs(width - 210 * 96 / 25.4) < 1, `Largura da folha A4: ${width}`);
      assert.ok(Math.abs(height - 297 * 96 / 25.4) < 1, `Altura da folha A4: ${height}`);
      assert.ok(horizontalPadding > 30, `Margem interna da folha: ${horizontalPadding}`);
      assert.equal(await page.locator('.reports-v19-paper').count(), 2);
      assert.equal(await page.locator('.reports-v16-footer b').last().textContent(), '2 / 2');
      await page.setViewportSize({ width: 390, height: 844 });
      const stage = page.getByRole('region', { name: 'Prévia do relatório' });
      await stage.focus();
      await stage.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      const mobile = await stage.evaluate((element) => ({
        viewport: window.innerWidth,
        rootWidth: document.documentElement.scrollWidth,
        stageWidth: element.clientWidth,
        paperWidth: element.scrollWidth,
        scrollLeft: element.scrollLeft,
        actionsFit: [...document.querySelectorAll('.report-print-v16-toolbar button')].every(
          (button) => button.getBoundingClientRect().right <= window.innerWidth,
        ),
      }));
      assert.equal(mobile.rootWidth, mobile.viewport, 'A página não deve alargar para acomodar o papel');
      assert(mobile.stageWidth <= mobile.viewport && mobile.paperWidth > mobile.stageWidth);
      assert(mobile.scrollLeft > 0 && mobile.actionsFit, 'A prévia deve rolar e preservar as ações');

    },
  },
  {
    id: '12-partner-long-report-fits-before-every-footer',
    role: 'partner',
    async run({ page, context, origin, snapshot }) {
      const finalStep = 'MARCADOR FINAL DO PROXIMO CICLO';
      const report = {
        ...tables.reports[0],
        next_steps: [tables.reports[0].next_steps[0].trim() + ' ' + finalStep],
      };
      await intercept(context, origin, 'reports', 'GET', (request) => ({
        json: request.headers().accept?.includes('vnd.pgrst.object') ? report : [report],
      }));
      await page.goto(origin + '/equipe/relatorios/impressao/' + report.id);
      await page.getByText(finalStep, { exact: false }).waitFor();
      await page.evaluate(() => document.fonts.ready);

      for (const media of ['screen', 'print']) {
        await page.emulateMedia({ media });
        const pages = await page.locator('.reports-v19-paper').evaluateAll((articles) => articles.map((article) => {
          const footer = article.querySelector('footer');
          const lastContent = footer.previousElementSibling.getBoundingClientRect();
          return {
            overlap: lastContent.bottom - footer.getBoundingClientRect().top,
            footer: footer.querySelector('b').textContent,
            width: parseFloat(getComputedStyle(article).width),
            height: parseFloat(getComputedStyle(article).height),
          };
        }));
        assert(pages.every(({ overlap }) => overlap <= 0), media + ': conteúdo atravessa o rodapé ' + JSON.stringify(pages));
        assert.equal(pages.length, 3, media + ': folha de continuação ausente');
        assert.deepEqual(pages.map(({ footer }) => footer), ['1 / 3', '2 / 3', '3 / 3']);
        assert(
          pages.every(({ width, height }) => Math.abs(width - 210 * 96 / 25.4) < 1 && Math.abs(height - 297 * 96 / 25.4) < 1),
          media + ': folhas fora do formato A4 ' + JSON.stringify(pages),
        );
      }

      const finalPage = page.locator('.reports-v19-paper').last();
      assert.equal(await finalPage.getByText(finalStep, { exact: false }).count(), 1);
      const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
      const physicalPages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
      assert.equal(physicalPages, 3, 'PDF físico deve ter três folhas');
      await snapshot('continuation', finalPage);
      return { physicalPages, contentAndFooterSeparated: true };
    },
  },
  {
    id: '12-admin-report-history-and-agenda-snapshot',
    role: 'admin',
    async run({ context, page, origin }) {
      const report = {
        ...tables.reports[0],
        status: 'sent',
        protocol: 'CALI-RPT-QA-HISTORY',
        sent_at: clock,
        client_open_count: 2,
        acknowledged_at: clock,
        acknowledgement_protocol: 'CIENCIA-QA-001',
        source_snapshot: {
          ...tables.reports[0].source_snapshot,
          agendaCompliance: {
            label: 'CALI Partner',
            requiredTotal: 2,
            occurredCount: 1,
            extraCount: 1,
            pendingOutcomeCount: 1,
            items: [{ outcome: 'occurred', scheduleClass: 'extra', mode: 'remote' }],
          },
        },
      };
      await intercept(context, origin, 'rpc/build_report_intelligence_snapshot', 'POST', () => ({ json: report.source_snapshot }));
      await intercept(context, origin, 'rpc/build_report_monthly_series', 'POST', () => ({ json: [] }));
      await intercept(context, origin, 'reports', 'GET', (request) => ({
        json: request.headers().accept?.includes('vnd.pgrst.object') ? report : [report],
      }));
      await intercept(context, origin, 'report_client_events', 'GET', () => ({
        json: [{ id: 'qa-event', report_id: report.id, event_type: 'acknowledged', created_at: clock, user_id: null }],
      }));
      const corrections = [];
      await intercept(context, origin, 'rpc/revise_delivered_report', 'POST', (request) => {
        corrections.push(request.postDataJSON());
        return { status: 409, json: { message: 'report_not_reopenable' } };
      });
      await page.goto(origin + '/admin/relatorios?report=' + report.id);
      const historyButton = page.getByRole('button', { name: 'Histórico do cliente', exact: true });
      await historyButton.click();
      const history = page.getByRole('dialog', { name: 'Histórico do cliente', exact: true });
      await history.getByText('Visualizado', { exact: true }).waitFor();
      assert.equal(await history.getByRole('link', { name: 'Ver versão' }).getAttribute('href'), '/admin/relatorios/impressao/' + report.id);
      await history.getByRole('button', { name: 'Detalhes', exact: true }).click();
      await history.getByText('CIENCIA-QA-001', { exact: true }).waitFor();
      await history.getByText('Ciência registrada', { exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await history.waitFor({ state: 'hidden' });
      assert.equal(await historyButton.evaluate((button) => button === document.activeElement), true);

      await page.getByRole('button', { name: 'Ver relatório', exact: true }).click();
      const paper = page.getByRole('dialog', { name: 'Prévia do relatório' });
      await paper.getByRole('heading', { name: 'Encontros do período' }).waitFor();
      await paper.getByText('Adicionais realizados', { exact: true }).waitFor();
      await paper.getByText('Pendente de registro:', { exact: true }).waitFor();
      await paper.getByRole('button', { name: 'Voltar' }).click();
      await page.locator('.reports-v16-toolbar').getByRole('button', { name: 'Corrigir', exact: true }).click();
      const correction = page.getByRole('dialog', { name: 'Corrigir fechamento' });
      const revise = correction.getByRole('button', { name: 'Editar e reenviar' });
      assert.equal(await correction.getByRole('button', { name: 'Retirar sem substituir' }).count(), 0);
      await revise.click();
      await correction.getByText('Informe o motivo da correção.', { exact: true }).waitFor();
      assert.deepEqual(corrections, []);
      await correction.getByRole('textbox', { name: 'Motivo' }).fill('  Motivo de correção QA. ');
      await correction.getByRole('checkbox', { name: 'Solicitar nova ciência ao cliente' }).check();
      await revise.click();
      await correction.getByText('Este relatório não está mais em um estado que permita correção antes da leitura.', { exact: true }).waitFor();
      assert.deepEqual(corrections, [{ p_report_id: report.id, p_reason: 'Motivo de correção QA.', p_request_acknowledgement: true }]);
      return { reportHistory: true, agendaSnapshot: true, correctionError: true };
    },
  },
  {
    id: '12-client-report-open-cancel-retry-ack-and-print',
    role: 'client',
    async run({ context, page, origin }) {
      const report = { ...tables.reports[0], id: '55555559-5555-4555-8555-555555555555', client_open_count: 0 };
      const events = [];
      const receipts = [];
      const reportFilters = [];
      await context.addInitScript(() => {
        window.print = () => {
          window.__qaReportTitle = document.title;
        };
      });
      await intercept(context, origin, 'reports', 'GET', (_, params) => {
        if (!params.get('select')?.includes('client_open_count')) return;
        reportFilters.push([params.get('company_id'), params.get('status')]);
        return { json: [report] };
      });
      await intercept(context, origin, 'rpc/record_report_client_event_v55', 'POST', (request) => {
        const body = request.postDataJSON();
        events.push(body);
        if (body.p_event_type === 'opened') report.client_open_count++;
        return { json: { open_count: report.client_open_count, first_opened_at: clock, last_opened_at: clock } };
      });
      await intercept(context, origin, 'rpc/acknowledge_report_v55', 'POST', (request) => {
        receipts.push(request.postDataJSON());
        if (receipts.length === 1)
          return { status: 503, json: { message: 'Serviço de ciência temporariamente indisponível QA' } };
        report.acknowledged_at = clock;
        report.acknowledgement_protocol = 'CIENCIA-QA-001';
        return {
          json: {
            acknowledged_at: report.acknowledged_at,
            acknowledgement_protocol: report.acknowledgement_protocol,
          },
        };
      });
      const reportPath = '/cliente/relatorios?report=' + report.id;
      await page.goto(origin + reportPath);
      const invite = page.getByRole('dialog', { name: 'Novo relatório disponível' });
      await invite.waitFor();
      assert.equal(await page.getByRole('button', { name: 'Dar ciência' }).count(), 0);
      assert.deepEqual(events, []);
      await invite.getByRole('button', { name: 'Visualizar relatório' }).click();
      await invite.waitFor({ state: 'detached' });
      const acknowledge = page.getByRole('button', { name: 'Dar ciência', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Registrar ciência', exact: true });
      await acknowledge.click();
      await dialog.getByRole('button', { name: 'Agora não', exact: true }).click();
      assert.deepEqual(receipts, []);
      await acknowledge.click();
      const confirm = dialog.getByRole('button', { name: 'Registrar ciência', exact: true });
      await confirm.click();
      await dialog.getByRole('alert').waitFor();
      await confirm.click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByText(/^Ciência em /).waitFor();
      const [printed] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith('/rpc/record_report_client_event_v55') &&
            response.request().postDataJSON()?.p_event_type === 'pdf_opened',
          { timeout: 4000 },
        ),
        page.getByRole('button', { name: 'Imprimir / salvar PDF', exact: true }).click(),
      ]);
      assert.equal(printed.status(), 200);
      await page.waitForFunction(() => Boolean(window.__qaReportTitle));
      assert.match(
        await page.evaluate(() => window.__qaReportTitle),
        /Relatório CALI RH - Empresa QA fictícia - setembro de 2026/,
      );
      await page.reload();
      await page.getByText(/^Ciência em /).waitFor();
      assert.equal(await acknowledge.count(), 0);
      assert.deepEqual(
        events,
        ['opened', 'pdf_opened'].map((event) => ({ p_report_id: report.id, p_event_type: event })),
      );
      assert.deepEqual(receipts, Array(2).fill({ p_report_id: report.id }));
      assert.deepEqual(reportFilters, Array(2).fill(['eq.' + companyId, 'in.(sent,published)']));
      return { openedBeforeReading: true, confirmationBeforeWrite: true, printTracked: true };
    },
  },
  {
    id: '12-client-report-question-linked-window-retry-and-cleanup',
    role: 'client',
    async run({ context, page, origin }) {
      const report = {
        ...tables.reports[0],
        id: '55555559-5555-4555-8555-555555555556',
        title: 'Fechamento disponível QA',
        client_open_count: 0,
        client_first_opened_at: null,
      };
      const expired = {
        ...report,
        id: '55555559-5555-4555-8555-555555555557',
        title: 'Fechamento fora do prazo QA',
        client_open_count: 1,
        client_first_opened_at: '2026-11-04T16:00:00.000Z',
      };
      const questions = [];
      await page.clock.setFixedTime(new Date(clock));
      await intercept(context, origin, 'reports', 'GET', (_, params) =>
        params.get('select')?.includes('client_open_count') ? { json: [report, expired] } : undefined,
      );
      await intercept(context, origin, 'rpc/record_report_client_event_v55', 'POST', (request) => {
        assert.deepEqual(request.postDataJSON(), { p_report_id: report.id, p_event_type: 'opened' });
        report.client_open_count = 1;
        report.client_first_opened_at = '2026-11-11T16:00:00.000Z';
        return { json: { open_count: 1, first_opened_at: report.client_first_opened_at, last_opened_at: clock } };
      });
      await intercept(context, origin, 'rpc/client_submit_report_question_v61', 'POST', (request) => {
        questions.push(request.postDataJSON());
        if (questions.length === 1)
          return { status: 503, json: { message: 'Envio temporariamente indisponível QA' } };
        return { json: { ok: true, record_protocol: 'OCO-QA-012', deadline: '2026-11-16' } };
      });

      await page.goto(origin + '/cliente/relatorios?report=' + report.id);
      const invitation = page.getByRole('dialog', { name: 'Novo relatório disponível' });
      const ask = page.getByRole('button', { name: 'Enviar dúvida', exact: true });
      await invitation.waitFor();
      assert.equal(await ask.count(), 0);
      await invitation.getByRole('button', { name: 'Visualizar relatório' }).click();
      await ask.click();
      const dialog = page.getByRole('dialog', { name: 'Enviar uma dúvida', exact: true });
      const message = dialog.getByRole('textbox', { name: 'Mensagem', exact: true });
      assert.equal(await message.evaluate((element) => document.activeElement === element), true);
      await dialog.getByText(/16\/11\/2026/).waitFor();
      await message.fill('Rascunho cancelado.');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await ask.evaluate((element) => document.activeElement === element), true);
      assert.deepEqual(questions, []);

      await ask.click();
      assert.equal(await message.inputValue(), '');
      await message.fill('  Poderiam detalhar a prioridade?  ');
      const submit = dialog.getByRole('button', { name: 'Enviar dúvida', exact: true });
      await submit.click();
      await dialog.getByRole('alert').filter({ hasText: 'Envio temporariamente indisponível QA' }).waitFor();
      assert.equal(await message.inputValue(), '  Poderiam detalhar a prioridade?  ');
      await submit.click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByRole('status').filter({ hasText: 'Dúvida registrada em Ocorrências · OCO-QA-012.' }).waitFor();
      assert.deepEqual(questions, Array(2).fill({ p_report_id: report.id, p_body: 'Poderiam detalhar a prioridade?' }));

      await page.getByRole('tab', { name: 'Todos os relatórios' }).click();
      await page.getByRole('button', { name: /Fechamento fora do prazo QA/ }).click();
      await page.getByRole('button', { name: 'Imprimir / salvar PDF' }).waitFor();
      assert.equal(await ask.count(), 0);
      assert.equal(await page.locator('body').evaluate((body) => body.classList.contains('workspace-modal-open')), false);
      return { afterOpening: true, businessDayWindow: true, focusRestored: true, linkedToReport: true };
    },
  },
  {
    id: '15-admin-staff-scope-edit-deactivation-and-reactivation',
    role: 'admin',
    async run({ context, page, origin }) {
      const staff = {
        id: '55555556-5555-4555-8555-555555555555',
        user_id: user.id,
        full_name: 'Partner cadastro QA',
        email: 'partner-cadastro@example.invalid',
        modules: ['hours'],
        active: true,
        invited_at: clock,
        accepted_at: clock,
      };
      const nextCompany = { id: '55555557-5555-4555-8555-555555555555', display_name: 'Empresa substituta QA' };
      let assignments = [{ staff_id: staff.id, company_id: companyId }];
      const updates = [];
      const membershipChanges = [];
      await page.clock.setFixedTime(new Date(clock));
      await intercept(context, origin, 'staff_members', 'GET', () => ({ json: [staff] }));
      await intercept(context, origin, 'companies', 'GET', (_, params) =>
        params.get('select') === 'id,display_name' ? { json: [...tables.companies, nextCompany] } : undefined,
      );
      await intercept(context, origin, 'staff_company_assignments', 'GET', () => ({ json: assignments }));
      await intercept(context, origin, 'staff_members', 'PATCH', (request, params) => {
        assert.equal(params.get('id'), 'eq.' + staff.id);
        const body = request.postDataJSON();
        updates.push(body);
        if (updates.length === 1) return { status: 503, json: { message: 'Cadastro ocupado QA' } };
        Object.assign(staff, body);
        return { json: null };
      });
      await intercept(context, origin, 'staff_company_assignments', 'POST', (request) => {
        const body = request.postDataJSON();
        membershipChanges.push({ added: body });
        assignments.push(...body);
        return { json: null };
      });
      await intercept(context, origin, 'staff_company_assignments', 'DELETE', (_, params) => {
        assert.equal(params.get('staff_id'), 'eq.' + staff.id);
        assert.equal(params.get('company_id'), 'in.(' + companyId + ')');
        membershipChanges.push({ removed: companyId });
        assignments = assignments.filter((item) => item.company_id !== companyId);
        return { json: null };
      });

      await page.goto(origin + '/admin/equipe-cali');
      await page.getByRole('button', { name: 'Editar ' + staff.full_name, exact: true }).click();
      const edit = page.getByRole('dialog', { name: 'Editar pessoa da equipe', exact: true });
      const active = edit.getByRole('checkbox', { name: 'Cadastro ativo', exact: true });
      const oldCompany = edit.getByRole('checkbox', { name: 'Empresa QA fictícia', exact: true });
      const replacement = edit.getByRole('checkbox', { name: nextCompany.display_name, exact: true });
      const save = edit.getByRole('button', { name: 'Salvar alterações', exact: true });
      assert(await edit.getByRole('textbox', { name: 'E-mail de acesso' }).isDisabled());
      await oldCompany.uncheck();
      await save.click();
      await edit.getByRole('alert').filter({ hasText: 'Escolha pelo menos uma empresa' }).waitFor();
      assert.deepEqual(updates, []);
      await replacement.check();
      await edit.getByRole('checkbox', { name: /Ocorrências/ }).check();
      await active.uncheck();
      await save.click();
      await edit.getByRole('alert').filter({ hasText: 'Não foi possível salvar' }).waitFor();
      assert.deepEqual(membershipChanges, []);
      assert(await replacement.isChecked());
      assert.equal(await active.isChecked(), false);
      await save.click();
      await edit.waitFor({ state: 'detached' });
      await page.getByText('Desativada', { exact: true }).waitFor();
      assert(await page.getByRole('button', { name: 'Enviar convite para ' + staff.full_name }).isDisabled());
      assert.deepEqual(
        updates,
        Array(2).fill({
          full_name: staff.full_name,
          modules: ['hours', 'records'],
          active: false,
          updated_at: clock,
        }),
      );
      assert.deepEqual(membershipChanges, [
        { added: [{ staff_id: staff.id, company_id: nextCompany.id }] },
        { removed: companyId },
      ]);
      await page.getByRole('button', { name: 'Editar ' + staff.full_name, exact: true }).click();
      assert.equal(await active.isChecked(), false);
      assert.equal(await oldCompany.isChecked(), false);
      assert.equal(await replacement.isChecked(), true);
      await active.check();
      await save.click();
      await edit.waitFor({ state: 'detached' });
      await page.getByText(/^Ativa desde /).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Enviar convite para ' + staff.full_name }).isEnabled(), true);
      assert.equal(updates.length, 3);
      assert.deepEqual(updates[2], { ...updates[1], active: true });
      assert.equal(membershipChanges.length, 2, 'Reativar preserva os vínculos atribuídos');
      return { companyRequired: true, assignmentsPersisted: true, inviteDisabledAfterDeactivation: true, reactivationPreservedScope: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
