'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';
const reviewId = '55555550-5555-4555-8555-555555555555';
const noticeId = '55555551-5555-4555-8555-555555555555';
const noticeTitle = 'Novo horário de atendimento QA';
const returnNote = 'Confirme o novo horário com a empresa.';

function endpoint(context, origin, endpointPath, method, respond) {
  return context.route(
    (url) => url.origin === host && url.pathname === '/rest/v1/' + endpointPath,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const { json, status = 200 } = respond(request);
      return route.fulfill({ json, status, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

async function noticeReview(page) {
  const panel = page.locator('.notice-review-panel');
  await panel.getByText(noticeTitle, { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Revisar comunicado', exact: true }).click();
  return page.getByRole('dialog', { name: 'Revisar comunicado', exact: true });
}

browserSuite([
  {
    id: '13-notice-comment-retry-reaction-rollback-and-scoped-admin-reply',
    role: 'client',
    async run({ page, context, openActor, origin }) {
      const id = 'qa-notice';
      const otherCompany = {
        ...tables.companies[0],
        id: '11111112-1111-4111-8111-111111111111',
        display_name: 'Segunda empresa QA',
      };
      const otherUser = '22222223-2222-4222-8222-222222222222';
      const comment = 'O novo horário funcionou para nós.';
      const reply = 'Retorno exclusivo da segunda empresa QA.';
      const reactions = [];
      const removals = [];
      const comments = [];
      const publishedComments = [
        {
          id: 'qa-other-comment',
          notice_id: id,
          company_id: otherCompany.id,
          author_user_id: otherUser,
          author_role: 'client',
          body: 'Comentário privado da segunda empresa QA.',
          created_at: '2026-11-12T15:00:00Z',
        },
      ];
      let myReaction = null;
      const admin = await openActor('admin');
      await endpoint(admin.context, origin, 'companies', 'GET', () => ({
        json: [tables.companies[0], otherCompany],
      }));
      for (const actor of [context, admin.context]) {
        await endpoint(actor, origin, 'notice_comments', 'GET', () => ({
          json:
            actor === context
              ? publishedComments.filter((item) => item.company_id === companyId)
              : publishedComments,
        }));
        await endpoint(actor, origin, 'notice_comments', 'POST', (request) => {
          assert.equal(request.headers()['content-profile'], 'cali_workspace');
          const body = request.postDataJSON();
          comments.push(body);
          if (comments.length === 1)
            return { status: 503, json: { message: 'Comentário temporariamente indisponível.' } };
          const saved = { ...body, id: 'qa-comment-' + comments.length, created_at: '2026-11-12T16:00:00Z' };
          publishedComments.push(saved);
          return { json: saved };
        });
      }
      await endpoint(context, origin, 'notice_reactions', 'GET', () => ({ json: myReaction ? [myReaction] : [] }));
      await endpoint(context, origin, 'notice_reactions', 'POST', (request) => {
        assert.equal(new URL(request.url()).searchParams.get('on_conflict'), 'notice_id,user_id');
        const body = request.postDataJSON();
        reactions.push(body);
        if (reactions.length === 1) return { status: 503, json: { message: 'Reação indisponível' } };
        myReaction = body;
        return { json: null };
      });
      await endpoint(context, origin, 'notice_reactions', 'DELETE', (request) => {
        removals.push(Object.fromEntries(new URL(request.url()).searchParams));
        myReaction = null;
        return { json: null };
      });

      await page.goto(origin + '/cliente/avisos?aviso=' + id);
      const dialog = page.getByRole('dialog', { name: 'Comunicado', exact: true });
      const input = dialog.getByPlaceholder('Escrever comentário…');
      const send = dialog.getByRole('button', { name: 'Enviar comentário' });
      const like = dialog
        .getByRole('group', { name: 'Reagir ao comunicado' })
        .getByRole('button', { name: /Curti/ });
      await dialog.getByText('Nenhum comentário ainda.', { exact: true }).waitFor();
      assert(await send.isDisabled());
      await input.fill('  ' + comment + '  ');
      await input.press('Enter');
      const commentError = dialog
        .getByRole('alert')
        .filter({ hasText: 'Comentário temporariamente indisponível.' });
      await commentError.waitFor();
      assert.equal(await input.inputValue(), '  ' + comment + '  ');
      await input.press('Enter');
      await dialog.getByText(comment, { exact: true }).waitFor();
      assert.equal(await input.inputValue(), '');
      assert.equal(await commentError.count(), 0);
      await like.click();
      const reactionError = dialog.getByRole('alert').filter({ hasText: 'Não foi possível registrar a reação.' });
      await reactionError.waitFor();
      assert.equal(await like.getAttribute('aria-pressed'), 'false');
      await like.click();
      await dialog.getByRole('button', { name: /Curti/, pressed: true }).waitFor();
      await reactionError.waitFor({ state: 'hidden' });
      await page.reload();
      await dialog.getByRole('button', { name: /Curti/, pressed: true }).waitFor();
      await like.click();
      await dialog.getByRole('button', { name: /Curti/, pressed: false }).waitFor();
      assert.deepEqual(
        reactions,
        Array(2).fill({ notice_id: id, user_id: user.id, company_id: companyId, reaction: 'like' }),
      );
      assert.deepEqual(removals, [{ notice_id: 'eq.' + id, user_id: 'eq.' + user.id }]);

      await admin.page.goto(origin + '/admin/avisos?aviso=' + id);
      const adminDialog = admin.page.getByRole('dialog', { name: 'Comunicado', exact: true });
      await adminDialog.getByRole('combobox', { name: 'Responder para' }).selectOption(otherCompany.id);
      const adminInput = adminDialog.getByPlaceholder('Responder para Segunda empresa QA…');
      await adminInput.fill(reply);
      await adminDialog.getByRole('button', { name: 'Enviar comentário' }).click();
      await adminDialog.getByText(reply, { exact: true }).waitFor();
      const clientComment = {
        notice_id: id,
        company_id: companyId,
        author_user_id: user.id,
        author_role: 'client',
        body: comment,
      };
      assert.deepEqual(comments, [
        clientComment,
        clientComment,
        { ...clientComment, company_id: otherCompany.id, author_role: 'admin', body: reply },
      ]);
      await page.reload();
      await dialog.getByText(comment, { exact: true }).waitFor();
      assert.equal(await dialog.getByText(reply, { exact: true }).count(), 0);
      assert.equal(await dialog.getByText(publishedComments[0].body, { exact: true }).count(), 0);
      return { commentRetried: true, reactionRolledBack: true, replyCompanyScoped: true };
    },
  },
  {
    id: '13-notice-review-return-retry-publish-and-ack',
    role: 'admin',
    async run({ page, context, openActor, origin }) {
      const review = {
        id: reviewId,
        revision: 1,
        category: 'atendimento',
        title: noticeTitle,
        body: 'Vamos ajustar o atendimento.',
        company_ids: [companyId],
        notice_date: '2026-11-20',
        status: 'pending',
        review_note: null,
      };
      const published = () =>
        review.status === 'published'
          ? [
              {
                id: noticeId,
                protocol: 'QA-AVISO-REVISAO',
                category: review.category,
                title: review.title,
                body: review.body,
                notice_date: review.notice_date,
                audience: 'selected',
                status: 'published',
                published_at: '2026-11-18T15:00:00Z',
              },
            ]
          : [];
      const decisions = [];
      const submissions = [];
      const acknowledgements = [];
      const directPublications = [];
      const partner = await openActor('partner');
      const client = await openActor('client');
      for (const actor of [context, partner.context, client.context]) {
        await endpoint(actor, origin, 'notices', 'GET', () => ({ json: published() }));
        await endpoint(actor, origin, 'notice_targets', 'GET', () => ({
          json: published().map(() => ({ notice_id: noticeId, company_id: companyId })),
        }));
      }
      await endpoint(context, origin, 'partner_notice_reviews', 'GET', (request) => {
        assert.equal(new URL(request.url()).searchParams.get('status'), 'eq.pending');
        return { json: review.status === 'pending' ? [review] : [] };
      });
      await endpoint(context, origin, 'rpc/review_partner_notice', 'POST', (request) => {
        const body = request.postDataJSON();
        decisions.push(body);
        if (decisions.length === 1) return { status: 409, json: { message: 'Conflito de revisão QA' } };
        review.status = body.p_approve ? 'published' : 'returned';
        review.review_note = body.p_note;
        return { json: { id: reviewId } };
      });
      await endpoint(partner.context, origin, 'partner_notice_reviews', 'GET', (request) => {
        assert.equal(new URL(request.url()).searchParams.get('author_id'), 'eq.' + user.id);
        return { json: [review] };
      });
      await endpoint(partner.context, origin, 'notices', 'POST', (request) => {
        directPublications.push(request.postDataJSON());
        return { status: 403, json: { message: 'Escrita direta recusada' } };
      });
      await endpoint(partner.context, origin, 'rpc/submit_partner_notice_review', 'POST', (request) => {
        const body = request.postDataJSON();
        submissions.push(body);
        if (submissions.length === 1)
          return { status: 503, json: { message: 'Fila temporariamente indisponível QA' } };
        review.revision++;
        review.status = 'pending';
        review.body = body.p_body;
        review.review_note = null;
        return { json: { id: reviewId, revision: review.revision } };
      });
      await endpoint(client.context, origin, 'notice_acknowledgements', 'POST', (request) => {
        acknowledgements.push(request.postDataJSON());
        return { json: null };
      });

      await client.page.goto(origin + '/cliente/avisos?aviso=' + noticeId);
      await client.page.getByRole('heading', { name: /Quadro de Avisos/ }).waitFor();
      assert.equal(await client.page.getByText(noticeTitle, { exact: true }).count(), 0);
      await page.goto(origin + '/admin/avisos');
      const first = await noticeReview(page);
      await first.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
      const returnButton = first.getByRole('button', { name: 'Devolver para ajuste', exact: true });
      const reason = first.getByRole('textbox', { name: 'Ajuste solicitado' });
      assert(await returnButton.isDisabled());
      await reason.fill('  ' + returnNote + '  ');
      await returnButton.click();
      await first.getByRole('alert').filter({ hasText: 'Conflito de revisão QA' }).waitFor();
      assert.equal(await reason.inputValue(), '  ' + returnNote + '  ');
      await returnButton.click();
      await first.waitFor({ state: 'detached' });
      await page.getByText('Nenhum aviso aguardando revisão.', { exact: true }).waitFor();

      await partner.page.goto(origin + '/equipe/avisos');
      await partner.page.getByText(returnNote, { exact: true }).waitFor();
      await partner.page.getByRole('button', { name: 'Ajustar comunicado', exact: true }).click();
      const form = partner.page.getByRole('dialog', { name: 'Ajustar comunicado', exact: true });
      const recipient = form.getByRole('checkbox', { name: 'Empresa QA fictícia', exact: true });
      const send = form.getByRole('button', { name: 'Enviar para revisão', exact: true });
      assert(await recipient.isChecked());
      await recipient.uncheck();
      assert(await send.isDisabled());
      await recipient.check();
      await form.getByRole('textbox', { name: 'Mensagem', exact: true }).fill('Novo horário confirmado às 14h.');
      await send.click();
      await form.getByRole('alert').filter({ hasText: 'temporariamente indisponível QA' }).waitFor();
      await send.click();
      await partner.page.getByText('Aguardando revisão', { exact: true }).waitFor();
      assert.equal(submissions.length, 2);
      assert.match(submissions[0].p_request_id, /^[0-9a-f-]{36}$/);
      assert.deepEqual(
        submissions,
        Array(2).fill({
          p_request_id: submissions[0].p_request_id,
          p_review_id: reviewId,
          p_revision: 1,
          p_category: 'atendimento',
          p_title: noticeTitle,
          p_body: 'Novo horário confirmado às 14h.',
          p_companies: [companyId],
          p_date: '2026-11-20',
        }),
      );
      assert.deepEqual(directPublications, []);

      await client.page.reload();
      await client.page.getByRole('heading', { name: /Quadro de Avisos/ }).waitFor();
      assert.equal(await client.page.getByText(noticeTitle, { exact: true }).count(), 0);
      await page.reload();
      const second = await noticeReview(page);
      await second.getByText('Novo horário confirmado às 14h.', { exact: true }).waitFor();
      await second.getByRole('button', { name: 'Aprovar e publicar', exact: true }).click();
      await second.waitFor({ state: 'detached' });
      assert.deepEqual(decisions, [
        ...Array(2).fill({ p_review_id: reviewId, p_revision: 1, p_approve: false, p_note: returnNote }),
        { p_review_id: reviewId, p_revision: 2, p_approve: true, p_note: null },
      ]);
      await client.page.reload();
      const publication = client.page.getByRole('dialog', { name: 'Comunicado', exact: true });
      await publication.getByText('Novo horário confirmado às 14h.', { exact: true }).waitFor();
      await publication.getByRole('button', { name: 'Estou ciente', exact: true }).click();
      await publication.getByRole('button', { name: 'Ciente registrado', exact: true }).waitFor();
      assert.deepEqual(acknowledgements, [{ notice_id: noticeId, user_id: user.id, company_id: companyId }]);
      return { revisions: [1, 2], publicationAfterApproval: true, noDirectWrite: true };
    },
  },
  {
    id: '15-partner-material-returned-draft-and-retry',
    role: 'partner',
    async run({ page, context, origin }) {
      const material = {
        id: '55555553-5555-4555-8555-555555555555',
        kind: 'report',
        company_id: companyId,
        author_id: user.id,
        title: 'Relatório mensal para revisar QA',
        context: 'Contexto da empresa QA',
        draft_text: 'Texto da revisão anterior',
        revision: 3,
        status: 'returned',
        decision_note: 'Inclua as decisões do período.',
      };
      const attempts = [];
      await endpoint(context, origin, 'partner_material_reviews', 'GET', () => ({ json: [material] }));
      await endpoint(context, origin, 'rpc/submit_partner_material_review', 'POST', (request) => {
        const body = request.postDataJSON();
        attempts.push(body);
        if (attempts.length === 1) return { status: 409, json: { message: 'Conflito temporário de material QA' } };
        material.revision++;
        material.status = 'pending';
        material.draft_text = body.p_text;
        return { json: { id: material.id } };
      });
      await page.goto(origin + '/equipe/materiais');
      await page.getByText(material.decision_note, { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Preparar material', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: material.title, exact: true });
      const draft = dialog.getByRole('textbox');
      const send = dialog.getByRole('button', { name: 'Enviar para revisão', exact: true });
      assert.equal(await draft.inputValue(), material.draft_text);
      await draft.fill('abc');
      assert(await send.isDisabled());
      await draft.fill('  Incluí as decisões do período QA.  ');
      await send.click();
      await dialog.getByRole('alert').filter({ hasText: 'Conflito temporário de material QA' }).waitFor();
      assert.equal(await draft.inputValue(), '  Incluí as decisões do período QA.  ');
      await send.click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByText('Em revisão', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Preparar material', exact: true }).count(), 0);
      assert.deepEqual(
        attempts,
        Array(2).fill({ p_id: material.id, p_revision: 3, p_text: 'Incluí as decisões do período QA.' }),
      );
      return { revision: 3, pendingAfterRetry: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
