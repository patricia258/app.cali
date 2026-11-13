import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workspaceHttp } from './helpers/workspace-http.mjs';

const company = '1c801da1-47c0-44df-bb47-73d1ea39cd76';
const record = '2c801da1-47c0-44df-bb47-73d1ea39cd76';
const message = '3c801da1-47c0-44df-bb47-73d1ea39cd76';
const now = '2026-11-12T15:00:00Z';
const rpc = (name) => `/rest/v1/rpc/${name}`;

test('histórico por empresa envia cursor composto e rejeita resposta incompatível', async (t) => {
  const http = await workspaceHttp(t);
  const { readCompanyConversationHistory } = await http.load('records/history.ts');
  const path = rpc('read_company_conversation_history');
  const first = {
    id: `record:${record}`, kind: 'record', happened_at: now, title: 'Abertura',
    subject_type: 'record', subject_id: record, subject_title: 'Ocorrência QA', minutes: null,
  };
  const signal = new AbortController().signal;
  http.respond(path, [first]);
  assert.deepEqual(await readCompanyConversationHistory(company, '', null, signal), [first]);
  assert.deepEqual(http.requests[0].body, { p_company_id: company, p_kind: null, p_before_at: null, p_before_id: null });
  assert.equal(http.requests[0].headers.get('content-profile'), 'cali_workspace');

  http.respond(path, []);
  assert.deepEqual(await readCompanyConversationHistory(company, 'record', first, signal), []);
  assert.deepEqual(http.requests[1].body, { p_company_id: company, p_kind: 'record', p_before_at: now, p_before_id: first.id });
  http.respond(path, [{ ...first, minutes: 'número inválido' }]);
  await assert.rejects(readCompanyConversationHistory(company, '', null, signal), /minutes/);
  http.respond(path, { message: 'Empresa indisponível' }, { status: 403 });
  await assert.rejects(readCompanyConversationHistory(company, '', null, signal), { message: 'Empresa indisponível' });
});

test('contexto de ocorrências limita empresas e exclui a memória interna da lista Partner', async (t) => {
  const http = await workspaceHttp(t);
  const { readRecordContext } = await http.load('records/workspace.ts');
  const recordPath = '/rest/v1/account_records';
  const messagePath = '/rest/v1/account_record_messages';
  const reopenPath = '/rest/v1/account_record_reopen_requests';
  const recordRow = { id: record, company_id: company, title: 'Ocorrência QA', participants: ['CALI', { name: 'Cliente' }] };
  http.respond(recordPath, [recordRow], { method: 'GET' });
  http.respond(messagePath, [{ id: message, record_id: record }, { id: 'second', record_id: record }], { method: 'GET' });
  http.respond(reopenPath, [{ record_id: record }], { method: 'GET' });
  assert.deepEqual(await readRecordContext(company, true), {
    records: [recordRow], counts: { [record]: 2 }, pendingReopens: { [record]: 'pending' },
  });
  const filters = (path) => http.requests.find(({ url }) => url.pathname === path).url.searchParams;
  for (const path of [recordPath, messagePath, reopenPath]) assert.equal(filters(path).get('company_id'), `eq.${company}`);
  assert.equal(filters(recordPath).get('visibility'), 'eq.client');
  assert.equal(filters(recordPath).get('workflow_status'), 'not.is.null');
  assert.equal(filters(recordPath).get('order'), 'last_activity_at.desc.nullslast,occurred_at.desc');
  assert.equal(filters(messagePath).get('deleted_at'), 'is.null');
  assert.equal(filters(reopenPath).get('status'), 'eq.pending');

  http.respond(recordPath, [], { method: 'GET' });
  http.respond(messagePath, { message: 'Falha nas mensagens' }, { method: 'GET', status: 403 });
  http.respond(reopenPath, [], { method: 'GET' });
  await assert.rejects(readRecordContext('all', false), { message: 'Falha nas mensagens' });
  assert.ok(http.requests.slice(3).every(({ url }) => !url.searchParams.has('company_id')));
});

test('conversa preserva RPC por papel, visibilidade, edição e exclusão pelo mesmo ID', async (t) => {
  const http = await workspaceHttp(t);
  const { postRecordMessage, editRecordMessage, deleteRecordMessage } = await http.load('records/conversation.ts');
  await http.signIn();
  const result = { message_id: message };
  http.respond(rpc('post_account_record_message'), result);
  assert.deepEqual((await postRecordMessage(record, 'Mensagem do cliente')).data, result);
  http.respond(rpc('partner_post_record_message'), result);
  assert.deepEqual((await postRecordMessage(record, 'Nota interna', true, true)).data, result);
  http.respond(rpc('edit_account_record_message'), result);
  assert.deepEqual((await editRecordMessage(message, 'Mensagem atualizada')).data, result);
  http.respond(rpc('delete_account_record_message'), { message: 'Acesso não autorizado' }, { status: 403 });
  assert.equal((await deleteRecordMessage(message)).error.message, 'Acesso não autorizado');
  assert.deepEqual(http.requests.slice(1).map(({ body }) => body), [
    { p_record_id: record, p_body: 'Mensagem do cliente', p_internal: false },
    { p_record_id: record, p_body: 'Nota interna', p_internal: true },
    { p_message_id: message, p_body: 'Mensagem atualizada' },
    { p_message_id: message },
  ]);
  assert.ok(http.requests.slice(1).every(({ headers }) => headers.get('authorization') === `Bearer ${http.accessToken}`));
});

test('encerramento consulta o registro selecionado e envia avaliação vinculada ao encerramento vigente', async (t) => {
  const http = await workspaceHttp(t);
  const { readRecordClosureContext, submitRecordFeedback, requestRecordReopen, decideRecordReopen } = await http.load('records/closure.ts');
  const closureId = '4c801da1-47c0-44df-bb47-73d1ea39cd76';
  const reopenId = '5c801da1-47c0-44df-bb47-73d1ea39cd76';
  const recordPath = '/rest/v1/account_records';
  const closurePath = '/rest/v1/account_record_closures';
  const feedbackPath = '/rest/v1/account_record_feedback';
  const reopenPath = '/rest/v1/account_record_reopen_requests';
  const selected = { id: record, protocol: 'CALI-REG-QA', workflow_status: 'completed', created_at: now, closed_at: now };
  const closure = { id: closureId, answered_at: null, closed_unanswered_at: null };
  const feedback = { score: 2, comment: 'Avaliação anterior', created_at: now };
  const reopen = { id: reopenId, status: 'pending', requested_at: now, reason: 'Novo assunto' };
  await http.signIn();

  http.respond(recordPath, [selected], { method: 'GET' });
  http.respond(closurePath, [closure], { method: 'GET' });
  http.respond(feedbackPath, [feedback], { method: 'GET' });
  http.respond(reopenPath, [reopen], { method: 'GET' });
  assert.deepEqual(await readRecordClosureContext(record, 'client'), { record: selected, closure, feedback, reopen });
  const filters = (path) => http.requests.find(({ url }) => url.pathname === path).url.searchParams;
  assert.equal(filters(recordPath).get('id'), `eq.${record}`);
  assert.equal(filters(closurePath).get('record_id'), `eq.${record}`);
  assert.equal(filters(closurePath).get('superseded_at'), 'is.null');
  assert.equal(filters(feedbackPath).get('order'), 'created_at.desc');
  assert.equal(filters(reopenPath).get('status'), 'eq.pending');

  http.respond(recordPath, [selected], { method: 'GET' });
  http.respond(feedbackPath, [feedback], { method: 'GET' });
  http.respond(reopenPath, [reopen], { method: 'GET' });
  assert.deepEqual(await readRecordClosureContext(record, 'admin'), { record: selected, closure: null, feedback, reopen });

  http.respond(rpc('submit_account_record_closure_feedback'), { ok: true, closure_id: closureId });
  http.respond(rpc('request_account_record_reopen'), { ok: true, request_id: reopenId });
  http.respond(rpc('decide_account_record_reopen'), { message: 'Pedido já analisado' }, { status: 409 });
  assert.equal((await submitRecordFeedback(record, closureId, 5, null)).data.closure_id, closureId);
  assert.equal((await requestRecordReopen(record, 'Novo assunto')).data.request_id, reopenId);
  assert.equal((await decideRecordReopen(reopenId, 'approved', null)).error.message, 'Pedido já analisado');
  assert.deepEqual(http.requests.slice(-3).map(({ body }) => body), [
    { p_record_id: record, p_closure_id: closureId, p_score: 5, p_comment: null },
    { p_record_id: record, p_reason: 'Novo assunto' },
    { p_request_id: reopenId, p_decision: 'approved', p_note: null },
  ]);
});
