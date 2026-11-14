'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

const host = 'https://cali-local-qa.supabase.co';

function rpc(context, origin, name, respond) {
  return context.route(
    (url) => url.origin === host && url.pathname === '/rest/v1/rpc/' + name,
    (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.fallback();
      assert.equal(request.headers()['accept-profile'], 'public');
      assert.equal(request.headers()['content-profile'], 'public');
      const { status = 200, json } = respond(request.postDataJSON());
      return route.fulfill({ status, json, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

browserSuite([
  {
    id: '17-admin-form-create-edit-publish-with-stable-question-ids',
    role: 'admin',
    async run({ page, context, origin }) {
      const id = '55555557-5555-4555-8555-555555555555';
      const title = 'Pesquisa de integração QA';
      const slug = 'pesquisa-de-integracao-qa';
      const createdAt = '2026-11-12T12:00:00Z';
      const writes = [];
      let form;
      let rejectNextSave = true;
      await context.route(
        (url) => url.origin === host && url.pathname === '/rest/v1/forms',
        (route) => {
          const request = route.request();
          const headers = { 'access-control-allow-origin': origin };
          if (request.method() === 'GET') return route.fulfill({ json: form ? [form] : [], headers });
          const data = request.postDataJSON();
          assert.equal(request.headers()['content-profile'], 'cali_workspace');
          writes.push({ method: request.method(), data });
          if (request.method() === 'POST') {
            form = { id, status: 'draft', created_at: createdAt, updated_at: createdAt, ...data };
          } else {
            assert.equal(request.method(), 'PATCH');
            assert.equal(new URL(request.url()).searchParams.get('id'), 'eq.' + id);
            if (rejectNextSave) {
              rejectNextSave = false;
              return route.fulfill({ status: 409, json: { message: 'Conflito de edição QA' }, headers });
            }
            form = { ...form, ...data };
          }
          return route.fulfill({ json: form, headers });
        },
      );

      await page.goto(origin + '/admin/formularios');
      await page.getByText('Nenhum formulário ainda.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Novo formulário', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Novo formulário' });
      const create = dialog.getByRole('button', { name: 'Criar formulário' });
      await create.click();
      assert.match(await dialog.getByRole('alert').innerText(), /Dê um nome/);
      assert.equal(writes.length, 0);
      await dialog.getByRole('textbox', { name: 'Nome do formulário' }).fill('  ' + title + '  ');
      await dialog.getByLabel(/Categoria/).fill('Integração');
      await dialog.getByLabel(/^Para quem/).selectOption('client');
      await create.click();
      await page.getByRole('heading', { name: title, exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('form'), id);
      const created = writes[0].data;
      assert.equal(writes[0].method, 'POST');
      assert.deepEqual(
        { title: created.title, slug: created.slug, category: created.category, audience: created.audience },
        { title, slug, category: 'Integração', audience: 'client' },
      );
      assert.deepEqual(
        created.questions.map((question) => question.kind),
        ['name', 'email'],
      );
      const [nameId, emailId] = created.questions.map((question) => question.id);
      assert(nameId && emailId && nameId !== emailId);

      await page.getByRole('tab', { name: 'Compartilhar' }).click();
      await page.getByRole('alert').filter({ hasText: 'Este formulário ainda é rascunho' }).waitFor();
      await page.getByRole('tab', { name: 'Perguntas' }).click();
      const prompts = page.getByPlaceholder('Escreva a pergunta', { exact: true });
      const save = page.getByRole('button', { name: 'Salvar alterações' });
      await prompts.first().fill(' ');
      await save.click();
      await page.getByRole('status').filter({ hasText: 'A pergunta 1 está sem texto.' }).waitFor();
      assert.equal(writes.length, 1);
      await prompts.first().fill('  Como devemos chamar você?  ');
      await page.getByRole('button', { name: 'Descer', exact: true }).first().click();
      await save.click();
      await page.getByRole('status').filter({ hasText: 'Conflito de edição QA' }).waitFor();
      assert.equal(await prompts.nth(1).inputValue(), '  Como devemos chamar você?  ');
      await save.click();
      await page.getByRole('status').filter({ hasText: 'Alterações salvas.' }).waitFor();
      assert.equal(writes.length, 3);
      const { updated_at: rejectedAt, ...rejected } = writes[1].data;
      const { updated_at: savedAt, ...saved } = writes[2].data;
      assert(!Number.isNaN(Date.parse(rejectedAt)) && !Number.isNaN(Date.parse(savedAt)));
      assert.deepEqual(saved, rejected);
      assert.equal(saved.status, 'draft');
      assert.deepEqual(
        saved.questions.map((question) => question.id),
        [emailId, nameId],
      );
      assert.equal(saved.questions[1].label, 'Como devemos chamar você?');

      await page.getByRole('button', { name: 'Abrir para respostas' }).click();
      await page.getByRole('status').filter({ hasText: 'Formulário aberto' }).waitFor();
      assert.equal(writes.length, 4);
      assert.equal(writes[3].data.status, 'open');
      assert.equal(writes[3].data.slug, slug);
      assert.deepEqual(writes[3].data.questions, saved.questions);
      await page.getByRole('tab', { name: 'Compartilhar' }).click();
      await page.getByRole('img', { name: 'QR Code do formulário ' + title }).waitFor();
      assert.equal(await page.getByText('Este formulário ainda é rascunho').count(), 0);
      assert.equal(
        await page.getByRole('link', { name: 'Ver como respondente' }).getAttribute('href'),
        '/f/' + slug + '?previa=1',
      );
      await page.reload();
      await page.getByRole('button', { name: 'Encerrar respostas' }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('form'), id);
      return { creationValidated: true, editsRetainedAfterConflict: true, stableSlugAndQuestionIds: true };
    },
  },
  {
    id: '17-form-conditional-backtrack-and-idempotent-retry',
    role: 'public',
    async run({ page, context, origin }) {
      const form = {
        id: '55555558-5555-4555-8555-555555555555',
        slug: 'qa-conditional',
        title: 'Formulário condicional QA',
        status: 'open',
        description: null,
        success_text: 'Resposta registrada! Obrigada por participar.',
        questions: [
          {
            id: 'choice',
            kind: 'single_choice',
            label: 'Quer detalhar?',
            options: ['Detalhar', 'Pular'],
            required: true,
            logic: [{ when: 'Pular', goTo: 'optional' }],
          },
          { id: 'details', kind: 'short_text', label: 'Detalhe obrigatório', required: true },
          { id: 'optional', kind: 'long_text', label: 'Observação final', help: null },
        ],
      };
      const calls = [];
      await rpc(context, origin, 'cali_form_public', (body) => {
        assert.deepEqual(body, { p_slug: form.slug });
        return { json: form };
      });
      await rpc(context, origin, 'cali_form_submit', (body) => {
        calls.push(body);
        return calls.length === 1
          ? { status: 503, json: { message: 'Falha temporária de envio QA' } }
          : { json: { ok: true } };
      });
      await page.goto(origin + '/f/' + form.slug);
      await page.getByRole('button', { name: 'Começar', exact: true }).click();
      await page.getByRole('radio', { name: /Detalhar/ }).click();
      const required = page.getByRole('heading', { name: /Detalhe obrigatório/ });
      await required.waitFor();
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('textbox').fill('Este texto não pertence ao caminho final.');
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      const previous = page.getByRole('button', { name: 'Pergunta anterior', exact: true });
      const optional = page.getByRole('heading', { name: /Observação final.*Opcional/ });
      await optional.waitFor();
      await previous.click();
      await required.waitFor();
      await previous.click();
      await page.getByRole('radio', { name: /Pular/ }).click();
      await optional.waitFor();
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Falha temporária de envio QA' }).waitFor();
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await page.getByRole('heading', { name: 'Resposta registrada!' }).waitFor();
      assert.equal(calls.length, 2);
      assert.match(calls[0].p_request_id, /^[a-f0-9-]{36}$/);
      assert.deepEqual(
        calls,
        Array(2).fill({
          p_slug: form.slug,
          p_form_id: form.id,
          p_request_id: calls[0].p_request_id,
          p_answers: { choice: 'Pular', __visited: ['choice', 'optional'] },
        }),
      );
      return { skippedAnswerExcluded: true, optionalOmitted: true, retryReusesId: true };
    },
  },
  {
    id: '17-public-form-releases-attachment-preview',
    role: 'public',
    async run({ page, context, origin }) {
      const form = {
        id: '55555559-5555-4555-8555-555555555555',
        slug: 'qa-attachment',
        title: 'Anexo QA',
        status: 'open',
        questions: [
          { id: 'attachment', kind: 'file', label: 'Anexe uma imagem', required: true },
          { id: 'details', kind: 'short_text', label: 'Observações' },
        ],
      };
      await rpc(context, origin, 'cali_form_public', () => ({ json: form }));
      await rpc(context, origin, 'cali_form_submit', ({ p_answers: answers }) => {
        assert.match(answers.attachment, /segunda\.png$/);
        return { json: { ok: true } };
      });
      await context.route(host + '/storage/v1/object/cali-forms/**', (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: { Key: 'cali-forms/qa.png' }, headers: { 'access-control-allow-origin': origin } });
      });
      const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH+kAAAAASUVORK5CYII=', 'base64');
      async function choose(name) {
        await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'image/png', buffer: image });
        await page.getByText('Arquivo pronto', { exact: true }).waitFor();
        return visiblePreview();
      }
      async function visiblePreview() {
        const preview = page.locator('main img[src^="blob:"]');
        await preview.waitFor();
        const url = await preview.getAttribute('src');
        assert.equal(await page.evaluate(async (url) => (await fetch(url)).ok, url), true);
        return url;
      }
      async function released(url) {
        await page.waitForFunction((url) => fetch(url).then(() => false, () => true), url);
      }
      await page.goto(origin + '/f/' + form.slug);
      await page.getByRole('button', { name: 'Começar', exact: true }).click();
      const removed = await choose('primeira.png');
      await page.getByRole('button', { name: 'Remover arquivo' }).click();
      await released(removed);
      const next = await choose('segunda.png');
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await page.getByRole('heading', { name: /Observações/ }).waitFor();
      await released(next);
      await page.getByRole('button', { name: 'Pergunta anterior' }).click();
      const restored = await visiblePreview();
      assert.notEqual(restored, next);
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await released(restored);
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await page.getByRole('heading', { name: 'Muito obrigado!' }).waitFor();
    },
  },
  {
    id: '17-disc-invite-consent-block-resume-and-slug-isolation',
    role: 'public',
    async run({ page, context, origin }) {
      const slug = 'qa-disc-resume';
      const token = 'qa-disc-invite-resume';
      const invite = {
        state: 'opened',
        slug,
        person_name: 'Pessoa convidada QA',
        email: 'disc@example.invalid',
        deadline_at: null,
        last_block: null,
      };
      const progress = [];
      await rpc(context, origin, 'cali_profile_link', () => ({
        json: { title: 'Perfil QA', status: 'open', company_name: null, has_company: null },
      }));
      await rpc(context, origin, 'cali_profile_invite_open', (body) => {
        assert.deepEqual(body, { p_token: token });
        return { json: invite };
      });
      await rpc(context, origin, 'cali_profile_invite_progress', (body) => {
        progress.push(body);
        invite.state = 'started';
        invite.last_block = body.p_block;
        return { json: { ok: true } };
      });
      await page.goto(origin + '/perfil/' + slug + '?c=' + token);
      const start = page.getByRole('button', { name: 'Vamos começar?' });
      await start.click();
      await page.getByRole('alert').filter({ hasText: 'leu e concorda' }).waitFor();
      await page.getByRole('checkbox', { name: /Li e concordo em participar/ }).check();
      await start.click();
      await page.getByText(invite.person_name, { exact: true }).waitFor();
      assert.equal(await page.getByRole('textbox', { name: /e-mail/ }).count(), 0);
      await page.getByRole('textbox', { name: /Seu cargo/ }).fill('Analista QA');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await start.click();
      const firstBlock = page.getByText(/Dia comum de trabalho · bloco 1 de 18/);
      const secondBlock = page.getByText(/Dia comum de trabalho · bloco 2 de 18/);
      await firstBlock.waitFor();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page
        .getByRole('alert')
        .filter({ hasText: /Marque uma frase/ })
        .waitFor();
      await page.getByRole('button', { name: 'Mais', exact: true }).first().click();
      await page.getByRole('button', { name: 'Menos', exact: true }).nth(1).click();
      await secondBlock.waitFor();
      assert(progress.some((request) => request.p_block === 1 && request.p_token === token));
      await page.reload();
      await secondBlock.waitFor();
      await page.getByRole('button', { name: 'Voltar', exact: true }).click();
      await firstBlock.waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Mais', exact: true }).first().getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        await page.getByRole('button', { name: 'Menos', exact: true }).nth(1).getAttribute('aria-pressed'),
        'true',
      );
      await page.goto(origin + '/perfil/outro-slug-qa?c=' + token);
      await page.getByRole('heading', { name: 'Link não encontrado', exact: true }).waitFor();
      return { consentValidated: true, resumesSameBrowser: true, wrongSlugRejected: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
