'use strict';

const assert = require('node:assert/strict');
const { answerWorkspaceDialog, browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';
const record = tables.account_records[0];
const otherCompanyId = '11111112-1111-4111-8111-111111111111';

function intercept(context, origin, endpoint, method, respond) {
  return context.route(
    (url) => url.origin === host && url.pathname === '/rest/v1/' + endpoint,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const { json, status = 200 } = respond(request);
      return route.fulfill({ json, status, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

browserSuite([
  {
    id: '10-record-mention-inserts-name-without-sending',
    role: 'admin',
    async run({ page, context, origin }) {
      let peopleReads = 0;
      let sends = 0;
      await intercept(context, origin, 'rpc/mention_candidates', 'POST', () => {
        peopleReads++;
        return { json: [
          { id: 'mention-1', full_name: 'Ágata QA', label: 'Equipe CALI' },
          { id: 'mention-2', full_name: 'Ágata Teste', label: 'Cliente' },
          { id: 'mention-3', full_name: 'Outra Pessoa', label: 'Cliente' },
        ] };
      });
      await intercept(context, origin, 'rpc/post_account_record_message', 'POST', () => { sends++; return { json: null }; });
      await page.goto(origin + '/admin/registros?record=' + record.id);
      const drawer = page.getByRole('dialog', { name: record.title, exact: true });
      const field = drawer.getByRole('textbox', { name: 'Responder ao cliente', exact: true });
      await field.waitFor();
      assert.equal(peopleReads, 0);
      await field.fill('Olá @aga');
      const options = page.getByRole('listbox', { name: 'Mencionar uma pessoa' });
      await options.getByRole('option', { name: /Ágata QA/ }).waitFor();
      assert.equal(await options.getByRole('option').count(), 2);
      await field.press('ArrowDown');
      assert.equal(await options.getByRole('option', { name: /Ágata Teste/ }).getAttribute('aria-selected'), 'true');
      await field.press('Enter');
      await options.waitFor({ state: 'hidden' });
      assert.equal(await field.inputValue(), 'Olá @Ágata Teste ');
      assert.equal(sends, 0);
      await field.pressSequentially('@aga');
      await options.waitFor();
      await options.getByRole('option', { name: /Ágata QA/ }).click();
      assert.equal(await field.inputValue(), 'Olá @Ágata Teste @Ágata QA ');
      assert.equal(peopleReads, 1);
      assert.equal(sends, 0);
    },
  },
  {
    id: '10-open-record-does-not-poll-closure-while-idle',
    role: 'admin',
    async run({ page, context, origin }) {
      let reads = 0;
      await intercept(context, origin, 'account_record_reopen_requests', 'GET', () => {
        reads++;
        return { json: [] };
      });
      await page.goto(origin + '/admin/registros?record=' + record.id);
      const drawer = page.getByRole('dialog', { name: record.title, exact: true });
      await drawer.getByText('Resposta QA da CALI.', { exact: true }).waitFor();
      assert.ok(reads > 0, 'O painel consulta o estado na abertura');
      const initialReads = reads;
      // Two intervals of the retired 1.1 s polling loop.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      assert.equal(reads, initialReads, 'O painel aberto fica ocioso entre mudanças');
      await drawer.getByRole('button', { name: 'Fechar', exact: true }).click();
      await drawer.waitFor({ state: 'hidden' });
      return { initialReads, idleReads: reads - initialReads };
    },
  },
  {
    id: '10-company-history-cursor-retry-filter-company-and-open-record',
    role: 'admin',
    async run({ page, context, origin }) {
      const historyCalls = [];
      let occurrenceRead = 0;
      let firstPageAttempts = 0;
      let nextPageAttempts = 0;
      const allEvents = Array.from({ length: 27 }, (_, index) => ({
        id: 'closure:' + String(27 - index).padStart(2, '0'),
        kind: 'closure',
        happened_at: '2026-11-12T14:00:00Z',
        title: 'Encerramento QA ' + (index + 1),
        subject_type: 'record',
        subject_id: record.id,
        subject_title: record.title,
        minutes: null,
      }));
      const hoursEvent = {
        ...allEvents[0],
        id: 'hours:qa',
        kind: 'hours',
        title: 'Horas registradas QA',
        minutes: 37,
      };
      await intercept(context, origin, 'companies', 'GET', () => ({
        json: [
          tables.companies[0],
          { ...tables.companies[0], id: otherCompanyId, display_name: 'Segunda empresa QA' },
        ],
      }));
      await context.route(
        (url) => url.origin === host && url.pathname === '/rest/v1/account_records',
        (route) => {
          const request = route.request();
          const params = new URL(request.url()).searchParams;
          if (request.method() === 'GET' && params.get('id') === 'eq.' + record.id &&
            params.get('select') !== 'id,protocol,workflow_status,created_at,closed_at') {
            occurrenceRead++;
          }
          return route.fallback();
        },
      );
      await intercept(context, origin, 'rpc/read_company_conversation_history', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        historyCalls.push(body);
        if (body.p_company_id === otherCompanyId) return { json: [] };
        if (body.p_kind === 'hours') return { json: [hoursEvent] };
        if (body.p_before_id) {
          if (nextPageAttempts++ === 0)
            return { status: 503, json: { message: 'Falha temporária na próxima página' } };
          return { json: allEvents.slice(25) };
        }
        if (firstPageAttempts++ === 0) return { status: 503, json: { message: 'Falha temporária no histórico' } };
        return { json: allEvents.slice(0, 26) };
      });

      await page.goto(origin + '/admin/registros');
      const history = page
        .locator('details')
        .filter({ has: page.locator('summary').filter({ hasText: 'Histórico por empresa' }) });
      await history.locator('summary').waitFor();
      assert.equal(historyCalls.length, 0);
      await history.locator('summary').click();
      const error = history.getByRole('alert').filter({ hasText: 'Não foi possível carregar o histórico.' });
      const retry = error.getByRole('button', { name: 'Tentar novamente' });
      const rows = history.getByRole('listitem');
      await error.waitFor();
      assert.equal(await rows.count(), 0);
      await retry.click();
      await history.getByText('Encerramento QA 25', { exact: true }).waitFor();
      assert.equal(await rows.count(), 25);
      assert.equal(await history.getByText('Encerramento QA 26', { exact: true }).count(), 0);
      const more = history.getByRole('button', { name: 'Carregar mais' });
      await more.click();
      await error.waitFor();
      assert.equal(await rows.count(), 25);
      await retry.click();
      await history.getByText('Encerramento QA 27', { exact: true }).waitFor();
      assert.equal(await rows.count(), 27);
      assert.equal(await more.count(), 0);

      const kind = history.getByLabel(/^Evento/);
      await kind.selectOption('hours');
      await history.getByText('Horas registradas QA · 37 min', { exact: true }).waitFor();
      assert.equal(await rows.count(), 1);
      await history.getByRole('button', { name: record.title, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: record.title, exact: true });
      await dialog.getByText('Resposta QA da CALI.', { exact: true }).waitFor();
      assert.equal(occurrenceRead, 1);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      await history.getByLabel(/^Empresa do histórico/).selectOption(otherCompanyId);
      await history.getByText('Nenhum evento neste recorte.', { exact: true }).waitFor();
      assert.equal(await kind.inputValue(), '');
      assert.equal(await rows.count(), 0);
      const initial = { p_company_id: companyId, p_kind: null, p_before_at: null, p_before_id: null };
      const cursor = { ...initial, p_before_at: allEvents[24].happened_at, p_before_id: allEvents[24].id };
      assert.deepEqual(historyCalls, [
        initial,
        initial,
        cursor,
        cursor,
        { ...initial, p_kind: 'hours' },
        { ...initial, p_company_id: otherCompanyId },
      ]);
      return {
        initialAndNextPageRetries: true,
        cursorTieBreak: true,
        filtersIsolated: true,
        openedRecord: record.id,
      };
    },
  },
  {
    id: '10-admin-closes-client-rates-reopens-and-rates-new-closure',
    role: 'admin',
    async run({ page, context, openActor, origin }) {
      const client = await openActor('client');
      const active = { ...record, workflow_status: 'in_progress', visibility: 'client', source_actor: 'client' };
      const stamps = ['2026-11-12T16:00:00Z', '2026-11-13T16:00:00Z'];
      const closureIds = ['11111116-1111-4111-8111-111111111111', '11111117-1111-4111-8111-111111111111'];
      const requestId = '11111118-1111-4111-8111-111111111111';
      const reopenReason = 'Precisamos complementar a análise QA.';
      const firstFeedback = 'Demorou mais que o combinado.';
      const reviewNote = 'A CALI já recebeu os dados complementares.';
      const transitions = [];
      const feedback = [];
      const messages = [...tables.account_record_messages];
      const appendSystemMessage = (id, body) => messages.push({
        id, record_id: record.id, company_id: companyId, author_role: 'system', body,
        visibility: 'client', created_at: stamps[0],
      });
      let closure;
      let reopen;
      let closureCount = 0;
      for (const actor of [context, client.context]) {
        await intercept(actor, origin, 'account_records', 'GET', () => ({ json: [active] }));
        await intercept(actor, origin, 'account_record_reopen_requests', 'GET', () => ({
          json: reopen ? [reopen] : [],
        }));
        await intercept(actor, origin, 'account_record_feedback', 'GET', () => ({
          json: feedback.length ? [feedback.at(-1)] : [],
        }));
        await intercept(actor, origin, 'account_record_messages', 'GET', () => ({ json: messages }));
      }
      await intercept(client.context, origin, 'account_record_closures', 'GET', (request) => {
        const query = new URL(request.url()).searchParams;
        assert.equal(query.get('record_id'), 'eq.' + record.id);
        assert.equal(query.get('superseded_at'), 'is.null');
        return { json: closure ? [closure] : [] };
      });
      const register = (action, request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        transitions.push([action, body]);
        return body;
      };
      await intercept(context, origin, 'rpc/set_account_record_status', 'POST', (request) => {
        const body = register('close', request);
        assert.deepEqual(body, { p_record_id: record.id, p_status: 'completed' });
        assert.equal(active.workflow_status, 'in_progress');
        active.workflow_status = 'completed';
        active.closed_at = stamps[closureCount];
        closure = { id: closureIds[closureCount++], answered_at: null, closed_unanswered_at: null };
        return { json: { ok: true } };
      });
      await intercept(client.context, origin, 'rpc/submit_account_record_closure_feedback', 'POST', (request) => {
        const body = register('feedback', request);
        assert.equal(body.p_record_id, record.id);
        assert.equal(body.p_closure_id, closure?.id);
        assert.equal(closure.answered_at, null);
        closure.answered_at = active.closed_at;
        feedback.push({ score: body.p_score, comment: body.p_comment, created_at: active.closed_at });
        return { json: { ok: true, closure_id: closure.id } };
      });
      await intercept(client.context, origin, 'rpc/request_account_record_reopen', 'POST', (request) => {
        const body = register('request', request);
        reopen = { id: requestId, status: 'pending', requested_at: stamps[0], reason: body.p_reason };
        appendSystemMessage('qa-reopen-request', 'Reabertura solicitada pelo cliente. Motivo: ' + body.p_reason);
        return { json: { ok: true, request_id: requestId } };
      });
      await intercept(context, origin, 'rpc/decide_account_record_reopen', 'POST', (request) => {
        const body = register('decide', request);
        assert.deepEqual(body, { p_request_id: requestId, p_decision: 'approved', p_note: reviewNote });
        reopen = null;
        closure = null;
        active.workflow_status = 'in_progress';
        active.closed_at = null;
        appendSystemMessage('qa-reopen-approved', 'Reabertura aprovada pela CALI. Mensagem: ' + body.p_note);
        return { json: { ok: true } };
      });

      await page.goto(origin + '/admin/registros?record=' + record.id);
      const adminDrawer = page.getByRole('dialog', { name: record.title, exact: true });
      const close = adminDrawer.getByRole('button', { name: 'Finalizar', exact: true });
      await close.click();
      await close.waitFor({ state: 'hidden' });
      await client.page.goto(origin + '/cliente/registros?record=' + record.id);
      const clientDrawer = client.page.getByRole('dialog', { name: record.title, exact: true });
      const feedbackHeading = clientDrawer.getByRole('heading', { name: 'Como foi este atendimento?', exact: true });
      await feedbackHeading.waitFor();
      await clientDrawer.getByRole('button', { name: 'Avaliar depois', exact: true }).click();
      await feedbackHeading.waitFor({ state: 'hidden' });
      await clientDrawer.getByRole('button', { name: 'Avaliar atendimento', exact: true }).click();
      await feedbackHeading.waitFor();
      const feedbackSend = clientDrawer.getByRole('button', { name: 'Enviar avaliação', exact: true });
      await clientDrawer.getByRole('button', { name: '2', exact: true }).click();
      assert(await feedbackSend.isDisabled());
      await clientDrawer.getByRole('textbox', { name: 'O que podemos melhorar?' }).fill(firstFeedback);
      await feedbackSend.click();
      const thanks = clientDrawer.getByRole('heading', { name: 'Avaliação registrada', exact: true });
      await thanks.waitFor();
      const back = clientDrawer.getByRole('button', { name: 'Voltar ao histórico', exact: true });
      await back.click();
      await clientDrawer.getByText(firstFeedback, { exact: true }).waitFor();
      await clientDrawer.getByRole('button', { name: 'Solicitar reabertura', exact: true }).click();
      await clientDrawer.getByRole('heading', { name: 'Por que você precisa reabrir esta solicitação?' }).waitFor();
      const request = clientDrawer.getByRole('button', { name: 'Enviar para análise', exact: true });
      assert(await request.isDisabled());
      await clientDrawer.getByRole('textbox', { name: 'Justificativa da reabertura' }).fill(reopenReason);
      await request.click();
      await clientDrawer.getByRole('heading', { name: 'Reabertura solicitada.', exact: true }).waitFor();
      await back.click();
      const requested = clientDrawer.getByRole('button', { name: 'Reabertura solicitada', exact: true });
      await requested.waitFor();
      assert(await requested.isDisabled());
      await clientDrawer.getByText('Reabertura solicitada pelo cliente. Motivo: ' + reopenReason, { exact: true }).waitFor();

      await page.reload();
      const approval = adminDrawer.getByRole('button', { name: 'Reabrir atendimento', exact: true });
      await approval.waitFor();
      await adminDrawer.getByText(reopenReason, { exact: true }).waitFor();
      await adminDrawer.getByRole('button', { name: 'Recusar', exact: true }).click();
      await adminDrawer.getByText('Explique ao cliente por que a reabertura não foi aprovada.').waitFor();
      assert.equal(transitions.length, 3);
      await adminDrawer.getByRole('textbox', { name: 'Mensagem ao cliente' }).fill(reviewNote);
      await approval.click();
      const approved = adminDrawer.getByRole('dialog', { name: 'Atendimento reaberto.', exact: true });
      await approved.getByRole('button', { name: 'Fechar', exact: true }).click();
      await approved.waitFor({ state: 'hidden' });
      await adminDrawer.getByRole('textbox', { name: 'Responder ao cliente' }).waitFor();
      await adminDrawer.getByText('Reabertura aprovada pela CALI. Mensagem: ' + reviewNote, { exact: true }).waitFor();
      await client.page.reload();
      await clientDrawer.getByRole('textbox', { name: 'Responder nesta ocorrência' }).waitFor();
      await close.click();
      await close.waitFor({ state: 'hidden' });
      await client.page.reload();
      await feedbackHeading.waitFor();
      await clientDrawer.getByRole('button', { name: '5', exact: true }).click();
      assert(await feedbackSend.isEnabled());
      await feedbackSend.click();
      await thanks.waitFor();
      await back.click();
      await clientDrawer.getByText('5/5', { exact: true }).waitFor();

      assert.deepEqual(transitions, [
        ['close', { p_record_id: record.id, p_status: 'completed' }],
        [
          'feedback',
          { p_record_id: record.id, p_closure_id: closureIds[0], p_score: 2, p_comment: firstFeedback },
        ],
        ['request', { p_record_id: record.id, p_reason: reopenReason }],
        ['decide', { p_request_id: requestId, p_decision: 'approved', p_note: reviewNote }],
        ['close', { p_record_id: record.id, p_status: 'completed' }],
        ['feedback', { p_record_id: record.id, p_closure_id: closureIds[1], p_score: 5, p_comment: null }],
      ]);
      return { sameOccurrence: record.id, independentClosures: closureIds, approvesBeforeConversation: true, refreshesSystemMessages: true };
    },
  },
  {
    id: '10-admin-message-edit-delete-retry-and-keyboard-focus',
    role: 'admin',
    async run({ page, context, origin }) {
      const attachment = '[[arquivo|termo-qa.pdf|records%2Fqa%2Ftermo-qa.pdf|application%2Fpdf|100]]';
      const editable = { ...tables.account_record_messages[1], visibility: 'client' };
      const internal = { ...editable, id: 'qa-m3', visibility: 'internal', body: 'Nota interna QA.' };
      editable.body += '\n' + attachment;
      let messages = [{ ...tables.account_record_messages[0], visibility: 'client' }, editable, internal];
      let messageReads = 0;
      const edits = [];
      const deletes = [];
      await intercept(context, origin, 'account_record_messages', 'GET', (request) => {
        if (new URL(request.url()).searchParams.get('record_id') === 'eq.' + record.id) messageReads++;
        return { json: messages };
      });
      await intercept(context, origin, 'rpc/edit_account_record_message', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        edits.push(body);
        if (edits.length === 1) return { status: 503, json: { message: 'Falha temporária' } };
        editable.body = body.p_body;
        editable.edited_at = '2026-11-12T14:00:00Z';
        return { json: { ok: true } };
      });
      await intercept(context, origin, 'rpc/delete_account_record_message', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        deletes.push(body);
        messages = messages.filter((message) => message.id !== body.p_message_id);
        return { json: { ok: true } };
      });

      await page.goto(origin + '/admin/registros?record=' + record.id);
      const conversation = page.getByRole('dialog', { name: record.title, exact: true });
      const edit = conversation.getByRole('button', { name: 'Editar mensagem', exact: true });
      const remove = conversation.getByRole('button', { name: 'Excluir mensagem', exact: true });
      const original = conversation.getByText('Resposta QA da CALI.', { exact: true });
      const editedText = 'Resposta QA revisada';
      const editor = conversation.locator('.records-inline-edit');
      const input = editor.getByRole('textbox');
      const save = editor.getByRole('button', { name: 'Salvar', exact: true });
      const assertFocused = async (locator) => {
        assert(
          await locator.evaluate((element) => element === document.activeElement),
          'Foco perdeu o controle esperado',
        );
      };
      await edit.waitFor();
      assert.equal(await edit.count(), 1);
      assert.equal(await remove.count(), 1);
      await edit.focus();
      await edit.press('Enter');
      await assertFocused(input);
      assert.equal(await input.inputValue(), 'Resposta QA da CALI.');
      await input.fill('Rascunho descartado');
      await editor.getByRole('button', { name: 'Cancelar', exact: true }).press('Enter');
      await original.waitFor();
      await assertFocused(edit);
      assert.equal(edits.length, 0);

      await edit.press('Enter');
      await input.fill('  ' + editedText + '  ');
      await save.press('Enter');
      const editFailure = page.getByRole('dialog', { name: /Não foi possível editar/ });
      await editFailure.getByRole('button', { name: 'OK', exact: true }).click();
      await editFailure.waitFor({ state: 'hidden' });
      assert.equal(await input.inputValue(), '  ' + editedText + '  ');
      await save.press('Enter');
      await conversation.getByText('editada', { exact: true }).waitFor();
      await conversation.getByText(editedText, { exact: true }).waitFor();
      await conversation.getByRole('button', { name: /termo-qa.pdf/ }).waitFor();
      await assertFocused(edit);
      assert.deepEqual(
        edits,
        Array(2).fill({ p_message_id: editable.id, p_body: editedText + '\n' + attachment }),
      );

      await remove.press('Enter');
      assert.match(await answerWorkspaceDialog(page, false), /Excluir esta mensagem/);
      assert.equal(deletes.length, 0);
      await assertFocused(remove);
      await remove.press('Enter');
      assert.match(await answerWorkspaceDialog(page, true), /Excluir esta mensagem/);
      await conversation.getByText(editedText, { exact: true }).waitFor({ state: 'hidden' });
      await assertFocused(conversation.getByRole('textbox', { name: 'Responder ao cliente' }));
      assert.deepEqual(deletes, [{ p_message_id: editable.id }]);
      await conversation.getByText(internal.body, { exact: true }).waitFor();
      const readsAfterSettle = messageReads;
      await conversation.getByRole('textbox', { name: 'Responder ao cliente' }).fill('Próxima resposta QA');
      await page.waitForTimeout(500);
      assert(messageReads - readsAfterSettle <= 1, 'A conversa estável disparou releituras repetidas');
      return { retainedAttachment: true, retryKeptDraft: true, focusRestored: true, stableConversation: true };
    },
  },
  {
    id: '10-record-conversation-composes-link-emoji-and-attachment-with-retry',
    role: 'admin',
    async run({ page, context, origin }) {
      const messages = [...tables.account_record_messages];
      const sends = [];
      const uploads = [];
      await intercept(context, origin, 'account_record_messages', 'GET', () => ({ json: messages }));
      await context.route((url) => url.origin === host && url.pathname.startsWith('/storage/v1/object/cali-workspace-private/records/'), (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        uploads.push(new URL(route.request().url()).pathname);
        return route.fulfill({ json: { Key: uploads.at(-1) }, headers: { 'access-control-allow-origin': origin } });
      });
      await intercept(context, origin, 'rpc/post_account_record_message', 'POST', (request) => {
        const payload = request.postDataJSON();
        sends.push(payload);
        if (sends.length === 1) return { status: 503, json: { message: 'Falha temporária no envio QA' } };
        messages.push({ ...messages[1], id: 'qa-rich-message', body: payload.p_body, created_at: '2026-11-12T16:00:00Z' });
        return { json: { workflow_status: 'waiting_client' } };
      });
      await page.goto(origin + '/admin/registros?record=' + record.id);
      const drawer = page.getByRole('dialog', { name: record.title, exact: true });
      const input = drawer.getByRole('textbox', { name: 'Responder ao cliente' });
      await input.fill('Confira');
      await input.press('Shift+Enter');
      assert.equal(await input.inputValue(), 'Confira\n');
      await drawer.getByRole('button', { name: 'Abrir emojis', exact: true }).click();
      await drawer.getByRole('button', { name: '👍', exact: true }).click();
      await drawer.getByRole('button', { name: 'Inserir link', exact: true }).click();
      const link = page.getByRole('dialog', { name: 'Inserir um link na mensagem', exact: true });
      await link.getByRole('textbox', { name: 'Endereço do link' }).fill('example.invalid/qa');
      await link.getByRole('button', { name: 'Inserir link', exact: true }).click();
      assert.equal(await input.inputValue(), 'Confira\n👍 https://example.invalid/qa');
      await drawer.locator('input[type=file][multiple]').setInputFiles({ name: 'qa.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nQA') });
      await drawer.getByRole('button', { name: 'Remover qa.pdf', exact: true }).waitFor();
      await input.press('Enter');
      await drawer.getByText('Falha temporária no envio QA', { exact: true }).waitFor();
      assert.equal(await input.inputValue(), 'Confira\n👍 https://example.invalid/qa');
      await input.press('Enter');
      await drawer.getByRole('link', { name: 'https://example.invalid/qa' }).waitFor();
      await drawer.getByRole('button', { name: /qa.pdf/ }).waitFor();
      assert.equal(uploads.length, 1);
      assert.equal(sends.length, 2);
      assert.deepEqual(sends[0], sends[1]);
      assert.equal(sends[1].p_record_id, record.id);
      assert.equal(sends[1].p_internal, false);
      assert.match(sends[1].p_body, /\[\[arquivo\|qa\.pdf\|records%2F/);
    },
  },
  {
    id: '10-client-additional-access-validation-and-retry',
    role: 'client',
    async run({ page, context, origin }) {
      const id = 'qa-access-record';
      const name = 'Pessoa indicada QA';
      const title = 'Solicitação de acesso adicional — ' + name;
      const inserts = [];
      const messages = [];
      let created;
      await intercept(context, origin, 'account_records', 'GET', () => ({
        json: created ? [record, created] : [record],
      }));
      await intercept(context, origin, 'account_records', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const data = request.postDataJSON();
        inserts.push(data);
        if (inserts.length === 1) return { status: 503, json: { message: 'Falha temporária antes da criação' } };
        created = { ...data, id, protocol: 'CALI-REG-20261112-001', created_at: data.occurred_at };
        return { json: { id } };
      });
      await intercept(context, origin, 'rpc/post_account_record_message', 'POST', (request) => {
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        messages.push(request.postDataJSON());
        return { json: { ok: true } };
      });
      await page.goto(origin + '/cliente/registros');
      const open = page.getByRole('button', { name: 'Solicitar acesso', exact: true });
      await open.click();
      const dialog = page.getByRole('dialog', { name: 'Solicitar acesso adicional' });
      const submit = dialog.getByRole('button', { name: 'Enviar solicitação' });
      const nameInput = dialog.getByRole('textbox', { name: 'Nome completo' });
      const email = dialog.getByRole('textbox', { name: 'E-mail' });
      assert(await submit.isDisabled());
      await nameInput.fill('  ' + name + '  ');
      await email.fill('email-invalido');
      await dialog.getByRole('textbox', { name: 'Cargo' }).fill('  Supervisão  ');
      await dialog.getByRole('textbox', { name: 'Observações' }).fill('  Solicitação QA de teste.  ');
      assert(await submit.isDisabled());
      await dialog.getByRole('checkbox', { name: 'Li e estou ciente das condições acima.' }).check();
      await submit.click();
      assert.equal(await email.evaluate((element) => element.validity.typeMismatch), true);
      assert.equal(inserts.length, 0);
      await email.fill('Pessoa.QA@Example.Invalid');
      await submit.click();
      await dialog.getByText('Não foi possível enviar a solicitação.', { exact: true }).waitFor();
      assert.equal(await nameInput.inputValue(), '  ' + name + '  ');
      assert.equal(messages.length, 0);
      await submit.click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByText('Solicitação de acesso enviada à CALI.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Abrir ' + title, exact: true }).waitFor();
      assert(await open.evaluate((element) => element === document.activeElement));
      assert.equal(inserts.length, 2);
      const [failed, saved] = inserts;
      const stableFields = ({ occurred_at, last_activity_at, updated_at, summary, ...data }) => data;
      assert.deepEqual(stableFields(saved), stableFields(failed));
      assert.equal(saved.title, title);
      assert.equal(saved.created_by, user.id);
      assert.equal(saved.company_id, companyId);
      assert.equal(saved.visibility, 'client');
      assert.equal(saved.record_type, 'request');
      assert.equal(saved.workflow_status, 'open');
      assert.equal(saved.requires_action, true);
      assert.match(saved.summary, /E-mail: pessoa.qa@example.invalid/);
      assert.match(saved.summary, /Cargo: Supervisão/);
      assert.match(saved.summary, /Observações: Solicitação QA de teste\./);
      assert.match(saved.summary, /Ciência das condições registrada em/);
      assert.deepEqual(messages, [{ p_record_id: id, p_body: saved.summary, p_internal: false }]);
      return { requiresAcknowledgement: true, retryBeforeWrite: true, requestScopedToCompany: true };
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
