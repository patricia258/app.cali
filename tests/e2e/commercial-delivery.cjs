'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

const recipient = 'decisor@example.invalid';
const entityId = 'c0111111-1111-4111-8111-111111111111';

function routeJson(context, origin, pathname, method, respond) {
  return context.route((url) => url.pathname === pathname, async (route) => {
    if (route.request().method() !== method) return route.fallback();
    const { json, status = 200 } = respond(route.request());
    return route.fulfill({ json, status, headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*',
    } });
  });
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
    next(...answers) { choices = answers; },
    get messages() { return messages; },
  };
}

async function proposal({ page, context, origin }) {
  const messages = [];
  const archived = {
    id: entityId, submission_id: 'qa-submission', service_slug: 'diagnostico-executivo', version: 3,
    status: 'enviada', pdf_path: 'qa/original.pdf', submission: {
      id: 'qa-submission', company_name: 'Empresa QA', contact_name: 'Decisor QA', contact_email: recipient,
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
    id: entityId, protocolo: 'MAPA-QA-0001', status: 'enviado', c_nome: 'Decisor QA',
    c_empresa: 'Empresa QA', c_email: recipient, created_at: '2026-10-12T12:00:00Z',
    relatorio_enviado_em: '2026-10-13T12:00:00Z', observacoes: { parecer: 'Parecer de teste.' },
  };
  await routeJson(context, origin, '/rest/v1/rpc/workspace_mapa_people_record', 'POST', () => ({ json: response }));
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

const cases = [
  { id: 'proposal-archived-resend', role: 'admin', run: proposal },
  { id: 'mapa-archived-resend', role: 'admin', run: mapa },
];

if (require.main === module) browserSuite(cases).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = cases;
