'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, projectId, tables, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';
const deliverableId = tables.deliverables[0].id;

function intercept(context, origin, endpoint, method, respond) {
  return context.route(
    (url) => url.origin === host && url.pathname === '/rest/v1/' + endpoint,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const result = respond(request, new URL(request.url()));
      if (!result) return route.fallback();
      const { json, status = 200 } = result;
      return route.fulfill({ json, status, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

browserSuite([
  {
    id: '07-admin-manual-hours-validation-retry-and-visibility-confirmation',
    role: 'admin',
    async run({ page, context, origin }) {
      const manualWrites = [];
      const visibilityWrites = [];
      const companyWrites = [];
      let manualEntry;
      let visibility;
      await intercept(context, origin, 'deliverables', 'GET', (_, url) =>
        url.searchParams.has('or') ? { json: [] } : null,
      );
      await intercept(context, origin, 'hour_entries', 'GET', (_, url) => {
        return url.searchParams.has('work_date') ? { json: manualEntry ? [manualEntry] : [] } : null;
      });
      await intercept(context, origin, 'rpc/add_manual_hour_entry', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const data = request.postDataJSON();
        manualWrites.push(data);
        if (manualWrites.length === 1) return { status: 503, json: { message: 'Falha temporária' } };
        manualEntry = {
          id: 'qa-manual-hours',
          company_id: data.p_company_id,
          project_id: data.p_project_id,
          deliverable_id: data.p_deliverable_id,
          work_date: data.p_work_date,
          minutes: data.p_minutes,
          description: data.p_description,
          category: data.p_category,
          source_type: 'manual',
          client_visible: false,
          internal_note: data.p_internal_note,
          started_at: data.p_started_at + '-03:00',
          ended_at: data.p_ended_at + '-03:00',
          created_at: '2026-11-12T16:00:00Z',
        };
        return { json: manualEntry.id };
      });
      await intercept(context, origin, 'company_hours_visibility', 'GET', () => ({
        json: visibility ? [visibility] : [],
      }));
      await intercept(context, origin, 'company_hours_visibility', 'POST', (request, url) => {
        assert.equal(url.searchParams.get('on_conflict'), 'company_id,period_start');
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        visibility = request.postDataJSON();
        visibilityWrites.push(visibility);
        return { json: null };
      });
      await intercept(context, origin, 'companies', 'PATCH', (request, url) => {
        assert.equal(url.searchParams.get('id'), 'eq.' + companyId);
        companyWrites.push(request.postDataJSON());
        return { json: null };
      });

      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/admin/horas');
      await page.getByRole('button', { name: 'Lançamento manual', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Lançamento manual' });
      const save = dialog.getByRole('button', { name: 'Salvar lançamento' });
      await dialog.getByLabel(/^Projeto/).selectOption(projectId);
      await dialog.getByLabel(/^Entregável/).selectOption(deliverableId);
      await dialog.getByLabel(/^Hora início/).fill('10:00');
      await dialog.getByLabel(/^Hora fim/).fill('09:50');
      await dialog.getByRole('textbox', { name: /Descrição do trabalho/ }).fill('  Atuação manual QA  ');
      const justification = dialog.getByRole('textbox', { name: /Justificativa do lançamento/ });
      await justification.fill('  Justificativa interna QA.  ');
      await dialog.getByRole('checkbox', { name: 'Compartilhável no extrato do cliente' }).uncheck();
      await dialog.getByText('Fim deve ser maior que início.').waitFor();
      await save.click();
      await page.getByRole('alert').filter({ hasText: 'Preencha cliente, projeto, entregável' }).waitFor();
      assert.equal(manualWrites.length, 0);
      await dialog.getByLabel(/^Hora fim/).fill('10:35');
      await save.click();
      await page.getByRole('alert').filter({ hasText: 'Não foi possível salvar o lançamento manual.' }).waitFor();
      assert.equal(await justification.inputValue(), '  Justificativa interna QA.  ');
      await save.click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('status').filter({ hasText: 'Lançamento manual salvo: 35min.' }).waitFor();
      const entry = page.getByRole('row').filter({ hasText: tables.deliverables[0].title });
      await entry.click();
      const detail = page.getByRole('row').filter({ hasText: 'Atuação manual QA' });
      await detail.waitFor();
      assert.match(await detail.innerText(), /Não aparece para o cliente/);
      assert.deepEqual(
        manualWrites,
        Array(2).fill({
          p_company_id: companyId,
          p_project_id: projectId,
          p_deliverable_id: deliverableId,
          p_task_id: null,
          p_work_date: '2026-11-12',
          p_minutes: 35,
          p_description: 'Atuação manual QA',
          p_category: 'Entregáveis',
          p_internal_note: 'Justificativa interna QA.',
          p_client_visible: false,
          p_started_at: '2026-11-12T10:00:00',
          p_ended_at: '2026-11-12T10:35:00',
        }),
      );

      const toggle = page.getByRole('button', { name: 'Visível ao cliente', exact: true });
      const confirmation = page.getByRole('dialog', { name: 'Desativar visualização deste mês?' });
      await toggle.click();
      await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert.equal(visibilityWrites.length, 0);
      assert.equal(companyWrites.length, 0);
      await toggle.click();
      await confirmation.getByRole('button', { name: 'Sim, desativar neste mês' }).click();
      const hidden = page.getByRole('button', { name: 'Oculto ao cliente', exact: true });
      await hidden.waitFor();
      assert.deepEqual(visibilityWrites, [
        {
          company_id: companyId,
          period_start: '2026-11-01',
          enabled: false,
          changed_at: '2026-11-12T16:00:00.000Z',
        },
      ]);
      assert.deepEqual(companyWrites, [{ show_hours_to_client: false }]);
      await page.reload();
      await hidden.waitFor();
      return { manualInputRetained: true, visibilityRequiresConfirmation: true, monthlyOverridePersisted: true };
    },
  },
  {
    id: '07-partner-hour-submission-and-edit-uses-approval-lane',
    role: 'partner',
    async run({ page, context, origin }) {
      const submissionId = 'qa-staff-hour';
      const inserts = [];
      const edits = [];
      let directHourWrites = 0;
      let submission;
      await intercept(context, origin, 'staff_hour_submissions', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const data = request.postDataJSON();
        inserts.push(data);
        submission = { ...data, id: submissionId, status: 'pending', created_at: '2026-11-12T16:00:00Z' };
        return { json: null };
      });
      await intercept(context, origin, 'staff_hour_submissions', 'GET', () => ({
        json: submission ? [submission] : [],
      }));
      await intercept(context, origin, 'hour_entries', 'POST', () => {
        directHourWrites++;
        return { json: { message: 'Partner não lança diretamente' }, status: 403 };
      });
      await intercept(context, origin, 'rpc/partner_edit_hour_submission', 'POST', (request) => {
        const data = request.postDataJSON();
        edits.push(data);
        submission = {
          ...submission,
          work_date: data.p_work_date,
          minutes: data.p_minutes,
          description: data.p_description,
        };
        return { json: { ok: true } };
      });
      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/equipe/horas');
      await page.getByRole('button', { name: 'Interação externa', exact: true }).click();
      const interaction = page.getByRole('dialog', { name: 'Interação externa' });
      await interaction.getByRole('button', { name: 'Reunião', exact: true }).click();
      await interaction.getByRole('textbox', { name: /Descrição breve/ }).fill('  alinhamento QA  ');
      await interaction.getByRole('button', { name: 'Registrar interação' }).click();
      await interaction.waitFor({ state: 'hidden' });
      const pending = page.getByRole('row').filter({ hasText: 'Aguardando aprovação' });
      await pending.getByText('15min', { exact: true }).waitFor();
      assert.deepEqual(inserts, [
        {
          staff_user_id: user.id,
          company_id: companyId,
          project_id: null,
          deliverable_id: null,
          work_date: '2026-11-12',
          minutes: 15,
          description: 'Reunião: alinhamento QA',
          justification: 'Interação externa via Reunião, sem cronômetro.',
          category: 'Reuniões e alinhamentos',
        },
      ]);
      await pending.getByRole('button', { name: 'Editar', exact: true }).click();
      const edit = page.getByRole('dialog', { name: 'Editar lançamento' });
      const save = edit.getByRole('button', { name: 'Salvar edição' });
      assert(await save.isDisabled());
      await edit.getByRole('spinbutton', { name: 'Duração (minutos)' }).fill('25');
      await edit.getByRole('textbox', { name: /^Motivo da edição/ }).fill('Duração conferida');
      await save.click();
      await edit.waitFor({ state: 'hidden' });
      await pending.getByText('25min', { exact: true }).waitFor();
      assert.deepEqual(edits, [
        {
          p_id: submissionId,
          p_work_date: '2026-11-12',
          p_minutes: 25,
          p_description: 'Reunião: alinhamento QA',
          p_reason: 'Duração conferida',
        },
      ]);
      assert.equal(directHourWrites, 0);
      return { approvalPreserved: true, editReasonRequired: true, directWrites: directHourWrites };
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
