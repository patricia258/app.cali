'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables } = require('./fixtures.cjs');

const recipient = 'decisor@example.invalid';
const entityId = 'c0111111-1111-4111-8111-111111111111';

function routeJson(context, origin, pathname, method, respond) {
  return context.route(
    (url) => url.pathname === pathname,
    async (route) => {
      if (route.request().method() !== method) return route.fallback();
      const { json, status = 200 } = respond(route.request());
      return route.fulfill({
        json,
        status,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*',
        },
      });
    },
  );
}

function confirmations(page) {
  const messages = [];
  let choices = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    if (choices.shift()) await dialog.accept();
    else await dialog.dismiss();
  });
  return {
    next(...answers) {
      choices = answers;
    },
    get messages() {
      return messages;
    },
  };
}

async function proposal({ page, context, origin }) {
  const messages = [];
  const archived = {
    id: entityId,
    submission_id: 'qa-submission',
    service_slug: 'diagnostico-executivo',
    version: 3,
    status: 'enviada',
    pdf_path: 'qa/original.pdf',
    submission: {
      id: 'qa-submission',
      company_name: 'Empresa QA',
      contact_name: 'Decisor QA',
      contact_email: recipient,
    },
  };
  await routeJson(context, origin, '/rest/v1/cali_proposals', 'GET', () => ({ json: [archived] }));
  await routeJson(context, origin, '/storage/v1/object/sign/cali-proposals/qa/original.pdf', 'POST', () => ({
    json: { signedURL: '/object/sign/cali-proposals/qa/original.pdf?token=qa' },
  }));
  await routeJson(context, origin, '/functions/v1/portal-send-proposal', 'POST', (request) => {
    messages.push(request.postDataJSON());
    return messages.length === 1
      ? { status: 502, json: { ok: false, error: 'Entrega de teste pendente.' } }
      : { json: { ok: true, email_id: 'qa-receipt', to: recipient } };
  });
  const dialogs = confirmations(page);
  await page.goto(origin + '/admin/propostas/proposta/' + entityId);
  const send = page.getByRole('button', { name: 'Reenviar proposta', exact: true });
  dialogs.next(false);
  await send.click();
  assert.equal(dialogs.messages.length, 1);
  dialogs.next(true, false);
  await send.click();
  assert.equal(dialogs.messages.length, 3);
  assert.equal(messages.length, 0);
  dialogs.next(true, true);
  await send.click();
  await page.getByRole('alert').getByText('Entrega de teste pendente.').waitFor();
  dialogs.next(true, true);
  await send.click();
  await page.getByText(`Proposta reenviada para ${recipient}.`, { exact: true }).waitFor();
  assert.deepEqual(messages[0], messages[1], 'Retry preserva destinatário, versão e identificador');
  assert.equal(messages[0].proposal_id, entityId);
  assert.equal(messages[0].version, 3);
  assert.equal(messages[0].recipient_email, recipient);
  assert.equal(Object.hasOwn(messages[0], 'pdf_base64'), false, 'O reenvio usa o PDF arquivado');
  assert.match(dialogs.messages[0], /Deseja enviar para decisor@example\.invalid\?/);
  assert.match(dialogs.messages[2], /Tem certeza\?/);
  return { cancellationStages: 2, version: 3, sameOperationOnRetry: true, archivedPdf: true };
}

async function mapa({ page, context, origin }) {
  const messages = [];
  const response = {
    id: entityId,
    protocolo: 'MAPA-QA-0001',
    status: 'enviado',
    c_nome: 'Decisor QA',
    c_empresa: 'Empresa QA',
    c_email: recipient,
    created_at: '2026-10-12T12:00:00Z',
    relatorio_enviado_em: '2026-10-13T12:00:00Z',
    observacoes: { parecer: 'Parecer de teste.' },
  };
  await routeJson(context, origin, '/rest/v1/rpc/workspace_mapa_people_record', 'POST', () => ({
    json: response,
  }));
  await routeJson(context, origin, '/rest/v1/rpc/read_mapa_delivery_state', 'POST', (request) => {
    assert.deepEqual(request.postDataJSON(), { p_response_id: entityId });
    return { json: { revision: 2, has_pdf: true } };
  });
  await routeJson(context, origin, '/functions/v1/workspace-enviar-relatorio-mapa', 'POST', (request) => {
    messages.push(request.postDataJSON());
    return { json: { ok: true, email_id: 'qa-receipt', to: [recipient] } };
  });
  const dialogs = confirmations(page);
  await page.goto(origin + '/admin/mapa-de-people/revisao?protocolo=' + response.protocolo);
  await page.getByRole('button', { name: 'Enviar relatório por e-mail', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar devolutiva', exact: true });
  await dialog.getByText('O envio usa o PDF oficial da versão 2.', { exact: true }).waitFor();
  assert.equal(await dialog.locator('input[type="email"], input[type="file"]').count(), 0);
  const send = dialog.getByRole('button', { name: 'Reenviar relatório', exact: true });
  dialogs.next(true, false);
  await send.click();
  assert.equal(messages.length, 0);
  dialogs.next(true, true);
  await send.click();
  await dialog.getByText(`Enviado para ${recipient} ✓`, { exact: true }).waitFor();
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].recipients, [recipient]);
  assert.equal(messages[0].revision, 2);
  assert.equal(messages[0].response_id, entityId);
  assert.equal(Object.hasOwn(messages[0], 'pdf_base64'), false);
  return { correctContact: true, version: 2, archivedPdf: true, cancellation: true };
}

async function report({ page, context, origin }) {
  const base = tables.reports[0];
  const copyTo = 'diretoria@example.invalid';
  const note = 'Acompanhe a decisão do período.';
  const sendCalls = [];
  const contactReads = [];
  let sent = false;
  await routeJson(context, origin, '/rest/v1/reports', 'GET', () => ({
    json: [
      {
        ...base,
        id: entityId,
        version: 3,
        status: sent ? 'sent' : 'approved',
        source_snapshot: { ...base.source_snapshot, workflow_mode: 'official', deliveryPerformanceV14: [] },
        sent_at: sent ? '2026-11-12T16:00:00Z' : null,
        sent_to: sent ? [recipient, copyTo] : [],
      },
    ],
  }));
  await context.route(
    (url) =>
      url.pathname === '/rest/v1/profiles' && url.searchParams.get('select') === 'email,full_name,is_primary',
    (route) => {
      const url = new URL(route.request().url());
      contactReads.push(Object.fromEntries(url.searchParams));
      return route.fulfill({
        headers: { 'access-control-allow-origin': origin },
        json: [{ email: recipient, full_name: 'Decisor QA', is_primary: true }],
      });
    },
  );
  await routeJson(context, origin, '/rest/v1/rpc/build_report_intelligence_snapshot', 'POST', (request) => {
    assert.deepEqual(request.postDataJSON(), {
      p_company_id: companyId,
      p_period_start: base.period_start,
      p_period_end: base.period_end,
    });
    return { json: base.source_snapshot };
  });
  await routeJson(context, origin, '/rest/v1/rpc/build_report_monthly_series', 'POST', () => ({ json: [] }));
  await routeJson(context, origin, '/rest/v1/rpc/report_generation_readiness_v61', 'POST', () => ({
    json: { mode: 'official', collected_days: 30, required_days: 15, can_generate_official: true, can_send: true },
  }));
  await routeJson(context, origin, '/functions/v1/workspace-send-executive-report', 'POST', (request) => {
    sendCalls.push(request.postDataJSON());
    if (sendCalls.length === 1) return { json: { ok: true, email_id: null } };
    sent = true;
    return { json: { ok: true, email_id: 'qa-report-receipt' } };
  });

  const confirms = confirmations(page);
  await page.goto(origin + '/admin/relatorios?report=' + entityId);
  await page.getByRole('button', { name: 'Enviar ao cliente', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Enviar relatório', exact: true });
  await dialog.getByRole('heading', { name: 'Relatório aprovado · v3', exact: true }).waitFor();
  const recipients = dialog.getByRole('textbox', { name: 'Destinatários' });
  assert.equal(await recipients.inputValue(), recipient);
  assert.deepEqual(contactReads, [
    {
      select: 'email,full_name,is_primary',
      company_id: 'eq.' + companyId,
      role: 'eq.client',
      active: 'eq.true',
      order: 'is_primary.desc',
    },
  ]);
  await recipients.fill(recipient + '; ' + copyTo);
  await dialog.getByRole('textbox', { name: 'Mensagem opcional' }).fill(note);
  const send = dialog.getByRole('button', { name: 'Enviar relatório', exact: true });
  confirms.next(false);
  await send.click();
  assert.equal(confirms.messages.length, 1);
  confirms.next(true, false);
  await send.click();
  assert.equal(confirms.messages.length, 3);
  assert.equal(sendCalls.length, 0);
  confirms.next(true, true);
  await send.click();
  await dialog
    .getByRole('alert')
    .filter({ hasText: 'Não foi possível confirmar o envio do relatório.' })
    .waitFor();
  assert.equal(sent, false);
  assert.equal(await recipients.inputValue(), recipient + '; ' + copyTo);
  confirms.next(true, true);
  await send.click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Reenviar ao cliente', exact: true }).waitFor();
  await page
    .getByRole('status')
    .filter({ hasText: 'Relatório disponibilizado no Workspace e enviado por e-mail.' })
    .waitFor();
  assert.equal(sendCalls.length, 2);
  assert.match(sendCalls[0].request_id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(
    sendCalls,
    Array(2).fill({
      report_id: entityId,
      request_id: sendCalls[0].request_id,
      version: 3,
      recipients: [recipient, copyTo],
      message: note,
    }),
  );
  assert.match(confirms.messages[0], /Deseja enviar para decisor@example\.invalid, diretoria@example\.invalid\?/);
  assert.match(confirms.messages[2], /Tem certeza\?/);
  return { frozenVersion: 3, confirmationStages: 2, retryReusesOperation: true, receiptRequired: true };
}

const cases = [
  { id: 'proposal-archived-resend', role: 'admin', run: proposal },
  { id: 'mapa-archived-resend', role: 'admin', run: mapa },
  { id: '12-admin-report-send-requires-two-confirmations-and-receipt', role: 'admin', run: report },
];

if (require.main === module)
  browserSuite(cases).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = cases;
