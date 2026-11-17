'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { makeSession, part, sessionKey } = require('./browser-fixture.cjs');
const { companyId, projectId, tables, user } = require('./fixtures.cjs');

const apiOrigin = 'https://cali-local-qa.supabase.co';

function mockJson(context, origin, path, method, handler) {
  return context.route(
    (url) => url.origin === apiOrigin && url.pathname === '/rest/v1/' + path,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      return route.fulfill({ headers: { 'access-control-allow-origin': origin }, ...handler(request) });
    },
  );
}

const mockRpc = (context, origin, name, handler) =>
  mockJson(context, origin, 'rpc/' + name, 'POST', (request) => handler(request.postDataJSON()));

const cases = [
  ...[390, 1651].map((width) => ({
    id: `admin-single-navigation-${width}`,
    role: 'admin',
    width,
    async run({ page, origin, snapshot }) {
      const topbar = page.locator('#root header.topbar');
      const sidebar = page.locator('#root aside.sidebar');
      await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { level: 1, name: /Visão geral/ }).waitFor();
      assert.equal(await topbar.count(), 1, 'A Visão geral deve ter uma única barra superior.');
      assert.equal(await sidebar.count(), 1, 'A Visão geral deve ter um único menu lateral.');
      assert.equal(await topbar.getByRole('button', { name: 'Notificações', exact: true }).count(), 1);
      await snapshot('overview');

      const position = await topbar.boundingBox();
      await page.evaluate(() => window.scrollTo(0, 220));
      await page.waitForFunction(() => window.scrollY > 0);
      assert.equal((await topbar.boundingBox()).y, position.y, 'A barra deve continuar no topo ao rolar.');
      const menu = topbar.getByRole('button', { name: 'Abrir menu', exact: true });
      if (width < 500) await menu.click();
      else assert.equal(await menu.count(), 0, 'O menu lateral já está disponível no desktop.');
      await sidebar.getByRole('link', { name: 'Horas', exact: true }).click();
      await page.getByRole('heading', { level: 1, name: /Horas e contratos/ }).waitFor();
      assert.equal(await topbar.count(), 1, 'A navegação deve manter uma única barra superior.');
      assert.equal(await sidebar.count(), 1, 'A navegação deve manter um único menu lateral.');
      assert.equal((await topbar.boundingBox()).y, position.y, 'A barra deve manter a altura na troca de página.');
      if (width < 500) assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await snapshot('hours');
    },
  })),
  {
    id: 'admin-workspace-search-desktop-and-narrow',
    role: 'admin',
    width: 1203,
    async run({ page, origin, snapshot }) {
      await page.setViewportSize({ width: 1203, height: 906 });
      await page.goto(origin + '/admin');
      const topbar = page.locator('#root header.topbar');
      const search = topbar.getByRole('button', { name: 'Buscar no Workspace', exact: true });
      const input = topbar.getByRole('textbox', { name: 'Buscar no Workspace', exact: true });
      await search.waitFor();

      const measure = () => search.evaluate((button) => {
        const [label, shortcut] = [button.querySelector('span'), button.querySelector('kbd')];
        function lines(element) {
          const range = document.createRange();
          range.selectNodeContents(element);
          return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
        }
        return {
          labelLines: lines(label),
          shortcutLines: lines(shortcut),
          labelFits: label.scrollWidth <= label.clientWidth + 1,
          fitsTopbar: button.getBoundingClientRect().right <= window.innerWidth,
        };
      });
      assert.deepEqual(await measure(), { labelLines: 1, shortcutLines: 1, labelFits: true, fitsTopbar: true });
      await snapshot('search-1203', topbar);

      await page.keyboard.press('Control+k');
      await input.waitFor();
      assert.equal(await input.evaluate((element) => element === document.activeElement), true);
      await input.fill('horas');
      await topbar.getByRole('option', { name: 'Horas', exact: true }).waitFor();
      await input.press('Escape');
      await search.waitFor();

      await search.click();
      await input.fill('horas');
      await input.press('Enter');
      await page.waitForURL((url) => url.pathname === '/admin/horas');
      await search.waitFor();

      await page.setViewportSize({ width: 960, height: 906 });
      const narrow = await measure();
      assert.equal(narrow.labelLines, 1);
      assert.equal(narrow.shortcutLines, 1);
      assert.equal(narrow.fitsTopbar, true);
      await snapshot('search-960', topbar);
    },
  },
  {
    id: 'admin-visual-spacing-filters-documents-staff',
    role: 'admin',
    width: 1651,
    async run({ page, context, origin, snapshot }) {
      await page.goto(origin + '/admin/horas');
      for (const name of ['Filtrar por cliente', 'Filtrar por tipo de atuação']) {
        const filter = page.getByRole('combobox', { name, exact: true });
        const style = await filter.evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            appearance: computed.appearance,
            position: computed.backgroundPositionX,
            arrow: computed.backgroundImage,
            left: Number.parseFloat(computed.paddingLeft),
            right: Number.parseFloat(computed.paddingRight),
          };
        });
        assert.equal(style.appearance, 'none');
        assert.match(style.arrow, /data:image\/svg\+xml/);
        const arrowInset = /([\d.]+)px\)?$/.exec(style.position);
        assert.ok(arrowInset && Math.abs(Number(arrowInset[1]) - style.left) <= 0.25);
        assert.ok(style.left >= 10 && style.right > style.left, 'A seta deve ter folga simétrica e espaço separado do texto.');
      }
      await page.getByRole('combobox', { name: 'Filtrar por tipo de atuação' }).selectOption('timer');
      await snapshot('filters');

      await mockJson(context, origin, 'companies', 'GET', () => ({ json: tables.companies.map((company) => ({
        ...company, logo_url: null, logo_workspace_url: null,
      })) }));
      await page.goto(origin + '/admin/documentos');
      const logo = page.locator('.v2-admin-doc-list .v2-record-logo').first();
      const initial = logo.locator(':scope > span');
      await initial.waitFor();
      const outer = await logo.boundingBox();
      const inner = await initial.boundingBox();
      assert.ok(Math.abs((inner.x + inner.width / 2) - (outer.x + outer.width / 2)) <= 1);
      assert.ok(Math.abs((inner.y + inner.height / 2) - (outer.y + outer.height / 2)) <= 1);
      await snapshot('document-initial');

      await page.goto(origin + '/admin/equipe-cali');
      const notice = page.locator('.inline-notice').filter({ hasText: 'Como a pessoa entra:' });
      const [left, right, top, rem] = await notice.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.paddingLeft, style.paddingRight, style.paddingTop, getComputedStyle(document.documentElement).fontSize].map(Number.parseFloat);
      });
      assert.ok(left >= rem && top >= rem * 0.75, 'O aviso deve ter respiro nas bordas.');
      assert.equal(left, right);
      await snapshot('staff-notice');
    },
  },
  {
    id: 'global-timer-pause-and-finalize',
    role: 'admin',
    async run({ page, context, origin }) {
      const [pausedDelivery, finalizedDelivery] = tables.deliverables;
      const pauseId = 'cc000000-0000-4000-8000-000000000001';
      const stopId = 'cc000000-0000-4000-8000-000000000002';
      const timer = {
        company_id: companyId, project_id: projectId, started_at: '2026-11-12T12:00:00Z',
        status: 'active', paused_seconds: 0, user_id: user.id,
      };
      let timers = [
        { ...timer, id: pauseId, deliverable_id: pausedDelivery.id },
        { ...timer, id: stopId, deliverable_id: finalizedDelivery.id, description: 'Execução sintética' },
      ];
      const writes = [];
      const change = (operation) => (body) => {
        writes.push({ operation, body });
        timers = timers.filter((row) => row.id !== body.p_timer_id);
        return { json: 30 };
      };
      await page.clock.setFixedTime(new Date('2026-11-12T12:30:00Z'));
      await mockJson(context, origin, 'work_timers', 'GET', () => ({ json: timers }));
      await mockRpc(context, origin, 'pause_work_timer', change('pause'));
      await mockRpc(context, origin, 'stop_work_timer', change('stop'));
      await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
      const globalTimers = page.locator('.global-timers');
      const pauseChip = globalTimers.locator('.global-timer-chip').filter({ hasText: pausedDelivery.title });
      const stopChip = globalTimers.locator('.global-timer-chip').filter({ hasText: finalizedDelivery.title });
      await pauseChip.getByText('00:30:00', { exact: true }).waitFor();
      await pauseChip.getByRole('button', { name: 'Pausar e registrar esta sessão' }).click();
      await pauseChip.waitFor({ state: 'detached' });
      assert.deepEqual(writes, [{ operation: 'pause', body: { p_timer_id: pauseId } }]);

      const stop = stopChip.getByRole('button', { name: 'Finalizar trabalho definitivamente' });
      const first = page.getByRole('dialog', { name: 'Finalizar este entregável?', exact: true });
      const second = page.getByRole('dialog', { name: 'Tem certeza mesmo?', exact: true });
      await stop.click();
      await first.getByRole('button', { name: 'Continuar', exact: true }).click();
      await second.getByText(/O cliente ainda não aprovou/).waitFor();
      await second.getByRole('button', { name: 'Voltar', exact: true }).click();
      await second.waitFor({ state: 'detached' });
      assert.equal(writes.length, 1);
      await stop.click();
      await first.getByRole('button', { name: 'Continuar', exact: true }).click();
      await second.getByRole('button', { name: 'Sim, finalizar definitivamente' }).click();
      await stopChip.waitFor({ state: 'detached' });
      assert.deepEqual(writes[1], {
        operation: 'stop', body: { p_timer_id: stopId, p_description: 'Execução sintética' },
      });
      assert.equal(writes.length, 2);
      return { pause: true, cancellationBeforeStop: true, stopAfterTwoStages: true };
    },
  },
  {
    id: 'hours-lifecycle-finalizes-selected-active-timer',
    role: 'admin',
    async run({ page, context, origin }) {
      const first = {
        id: 'ce000000-0000-4000-8000-000000000001', user_id: user.id, company_id: companyId,
        started_at: '2026-11-12T11:00:00Z', status: 'paused', description: 'Atuação pausada QA',
      };
      const selected = {
        ...first, id: 'ce000000-0000-4000-8000-000000000002',
        started_at: '2026-11-12T12:00:00Z', status: 'active', description: 'Atuação ativa QA',
      };
      let timers = [first, selected];
      const writes = [];
      const company = tables.companies[0];
      const brokenLogo = apiOrigin + '/qa-hours-original.svg';
      await context.route(brokenLogo, (route) => route.fulfill({ status: 404 }));
      await mockJson(context, origin, 'companies', 'GET', () => ({ json: [{ ...company, logo_url: brokenLogo }] }));
      await page.clock.setFixedTime(new Date('2026-11-12T12:30:00Z'));
      await mockJson(context, origin, 'work_timers', 'GET', (request) => {
        const scope = new URL(request.url()).searchParams.get('status');
        return { json: scope === 'eq.active' ? timers.filter((timer) => timer.status === 'active') : timers };
      });
      await mockRpc(context, origin, 'stop_work_timer', (body) => {
        writes.push(body);
        if (writes.length === 1) return { status: 409, json: { message: 'Falha simulada ao finalizar.' } };
        timers = timers.filter((timer) => timer.id !== body.p_timer_id);
        return { json: 30 };
      });
      await page.goto(origin + '/admin/horas', { waitUntil: 'domcontentloaded' });
      const paused = page.locator('[data-work-timer-id]').filter({ hasText: first.description });
      const active = page.locator('[data-work-timer-id]').filter({ hasText: selected.description });
      await paused.getByRole('button', { name: 'Retomar', exact: true }).waitFor();
      const hasDerivedLogo = (selector) => page.waitForFunction(({ selector, url }) => [...document.querySelectorAll(selector)].some((image) => image.getAttribute('src') === url), { selector, url: company.logo_workspace_url });
      await hasDerivedLogo('[data-work-timer-id] img');
      await hasDerivedLogo('[data-hours-usage-list] img');
      await active.getByRole('button', { name: 'Encerrar', exact: true }).click();
      const confirmation = page.getByRole('dialog', { name: 'Finalizar este entregável?', exact: true });
      await confirmation.getByText(selected.description, { exact: true }).waitFor();
      assert.deepEqual(writes, []);
      await confirmation.getByRole('button', { name: 'Continuar', exact: true }).click();
      const confirm = page.getByRole('button', { name: 'Sim, finalizar definitivamente' });
      await confirm.click();
      await page.getByRole('dialog', { name: 'Tem certeza mesmo?' }).getByRole('alert').filter({ hasText: 'Falha simulada ao finalizar.' }).waitFor();
      await active.waitFor();
      await confirm.click();
      await active.waitFor({ state: 'detached' });
      await paused.waitFor();
      assert.deepEqual(writes, Array(2).fill({ p_timer_id: selected.id, p_description: selected.description }));
      return { secondTimerSelected: true, pausedTimerPreserved: true, doubleConfirmation: true, companyLogoFallback: true };
    },
  },
  {
    id: 'profile-save-retry-and-reopen',
    role: 'client',
    async run({ page, context, origin }) {
      const mediaPath = '/storage/v1/object/sign/cali-workspace-private/qa-profile/';
      const avatarSource = 'private:qa-profile/avatar.svg';
      const signatureSource = apiOrigin + mediaPath + 'signature.svg?token=expirado';
      const nextId = 'ce000000-0000-4000-8000-000000000017';
      let stored = {
        ...tables.profiles[0], role: 'client', avatar_url: avatarSource,
        avatar_position_x: 0, avatar_position_y: 100, avatar_zoom: 1.5,
        signature_mode: 'uploaded', signature_url: signatureSource,
      };
      const writes = [];
      const signedImages = new Set();
      await context.route((url) => url.origin === apiOrigin && url.pathname.startsWith(mediaPath), (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const image = url.pathname.slice(mediaPath.length);
        const headers = {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (request.method() === 'POST') {
          signedImages.add(image);
          return route.fulfill({ headers, json: { signedURL: url.pathname.replace('/storage/v1', '') + '?token=perfil-qa' } });
        }
        if (url.searchParams.get('token') !== 'perfil-qa' || image === 'unavailable.svg') return route.fulfill({ status: 404, headers });
        return route.fulfill({ headers, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#723043"/></svg>' });
      });
      await mockJson(context, origin, 'profiles', 'GET', (request) => {
        const actor = new URL(request.url()).searchParams.get('id')?.slice(3);
        const profile = actor === nextId
          ? { ...stored, id: nextId, full_name: 'Nova cliente QA', avatar_url: null, signature_mode: 'generated', signature_url: null }
          : stored;
        return { json: request.headers().accept?.includes('vnd.pgrst.object') ? profile : [profile] };
      });
      await mockRpc(context, origin, 'read_client_account_responsibles', () => ({ json: {
        executive: {
          full_name: 'Patrícia Lima', job_title: 'Executiva QA',
          avatar_url: 'private:qa-profile/unavailable.svg',
          avatar_position_x: null, avatar_position_y: null, avatar_zoom: null,
        },
        supportPartner: null,
      } }));
      await mockRpc(context, origin, 'update_my_profile_v56', (body) => {
        writes.push(body);
        if (writes.length === 1) return { status: 409, json: { message: 'Falha sintética ao salvar' } };
        stored = { ...stored, full_name: body.p_full_name, linkedin_url: body.p_linkedin_url };
        return { json: true };
      });

      async function openProfile() {
        await page.locator('.profile[aria-haspopup="menu"]').click();
        await page.getByRole('menuitem', { name: 'Minha conta', exact: true }).click();
        return page.getByRole('dialog', { name: 'Minha conta', exact: true });
      }

      const unavailableAvatar = page.waitForResponse((response) => response.url().includes(mediaPath + 'unavailable.svg') && response.request().method() === 'GET');
      await page.goto(origin + '/cliente', { waitUntil: 'domcontentloaded' });
      const homeAvatar = page.locator('[aria-label="Contatos da empresa e da CALI"]').getByRole('img', { name: stored.full_name, exact: true });
      const crop = await homeAvatar.evaluate((image) => [image.style.objectPosition, image.style.transformOrigin, image.style.transform]);
      assert.deepEqual(crop, ['0% 100%', '0% 100%', 'scale(1.5)']);
      await unavailableAvatar;
      await page.locator('[data-workspace-identity]').filter({ hasText: /^PL$/ }).waitFor();
      const profile = await openProfile();
      assert.equal(await profile.getByLabel('E-mail de acesso').isDisabled(), true);
      const photoPreview = profile.getByRole('img', { name: 'Prévia do perfil' });
      assert.match(await photoPreview.getAttribute('src'), /avatar\.svg\?token=perfil-qa$/);
      assert.equal(await photoPreview.evaluate((image) => getComputedStyle(image).objectPosition), '0% 100%');
      await profile.getByRole('button', { name: 'Assinatura', exact: true }).click();
      const signature = profile.getByRole('img', { name: 'Sua assinatura atual' });
      assert.match(await signature.getAttribute('src'), /signature\.svg\?token=perfil-qa$/);
      assert.deepEqual(signedImages, new Set(['avatar.svg', 'signature.svg', 'unavailable.svg']));
      await profile.getByRole('button', { name: 'Dados pessoais', exact: true }).click();
      await profile.getByLabel('Nome completo').fill('  Cliente QA atualizado  ');
      await profile.getByLabel('LinkedIn', { exact: true }).fill('linkedin.example.invalid/qa');
      const save = profile.getByRole('button', { name: 'Salvar alterações', exact: true });
      await save.click();
      await profile.getByText(/Não foi possível salvar o perfil|Falha sintética ao salvar/).waitFor();
      assert.equal(await profile.getByLabel('Nome completo').inputValue(), '  Cliente QA atualizado  ');
      await save.click();
      await profile.waitFor({ state: 'detached' });
      await page.locator('.profile[aria-haspopup="menu"]').getByText('Cliente QA atualizado', { exact: true }).waitFor();
      assert.equal(writes.length, 2);
      assert.deepEqual(writes[0], writes[1]);
      assert.equal(writes[1].p_full_name, 'Cliente QA atualizado');
      assert.equal(writes[1].p_linkedin_url, 'https://linkedin.example.invalid/qa');
      assert.equal(writes[1].p_avatar_url, avatarSource);
      assert.equal(writes[1].p_signature_url, signatureSource);
      assert(!Object.keys(writes[1]).some((key) => /email|role|company_id/.test(key)));
      await page.reload({ waitUntil: 'domcontentloaded' });
      const reopened = await openProfile();
      assert.equal(await reopened.getByLabel('Nome completo').inputValue(), 'Cliente QA atualizado');
      assert.equal(await reopened.getByLabel('LinkedIn', { exact: true }).inputValue(), 'https://linkedin.example.invalid/qa');
      await reopened.getByRole('img', { name: 'Prévia do perfil' }).waitFor();
      const replacement = makeSession();
      const [header, encoded, signatureToken] = replacement.access_token.split('.');
      const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString());
      replacement.access_token = [header, part({ ...claims, sub: nextId, session_id: 'ce000000-0000-4000-8000-000000000018' }), signatureToken].join('.');
      replacement.user = { ...replacement.user, id: nextId };
      await page.evaluate(({ sessionKey, replacement, nextId }) => {
        localStorage.setItem(`cali:welcome-seen:${nextId}`, 'qa');
        localStorage.setItem(sessionKey, JSON.stringify(replacement));
        const channel = new BroadcastChannel(sessionKey);
        channel.postMessage({ event: 'SIGNED_IN', session: replacement });
        channel.close();
      }, { sessionKey, replacement, nextId });
      await reopened.waitFor({ state: 'hidden' });
      await page.locator('.profile[aria-haspopup="menu"]').getByText('Nova cliente QA', { exact: true }).waitFor();
      assert.equal(await page.locator('img[src*="qa-profile/avatar.svg"]').count(), 0);
      return { preservedDraftAfterError: true, reloadedProfile: true, normalizedFields: true, privateMedia: true, brokenAvatarFallback: true, previousActorMediaHidden: true };
    },
  },
  {
    id: 'workspace-notification-destination-and-read',
    role: 'client',
    async run({ page, context, origin }) {
      const file = tables.files[0];
      let notifications = [
        {
          id: 'qa-external-alert', title: 'Aviso com endereço externo', created_at: '2026-11-12T12:05:00Z',
          user_id: user.id, read_at: null, action_url: '//external.example.invalid',
        },
        {
          id: 'qa-file-alert', title: 'Documento para consultar', created_at: '2026-11-12T12:00:00Z',
          user_id: user.id, read_at: null, entity_type: 'file', entity_id: file.id,
          action_url: '/cliente/documentos?origem=sino#referencia',
        },
      ];
      const reads = [];
      await mockJson(context, origin, 'notifications', 'GET', (request) => {
        assert.equal(new URL(request.url()).searchParams.get('user_id'), 'eq.' + user.id);
        return { json: notifications };
      });
      await mockRpc(context, origin, 'mark_notification_read', (body) => {
        reads.push(body);
        notifications = notifications.map((item) =>
          item.id === body.p_notification_id ? { ...item, read_at: '2026-11-12T12:10:00Z' } : item,
        );
        return { json: true };
      });
      await page.goto(origin + '/cliente', { waitUntil: 'domcontentloaded' });
      const trigger = page.getByRole('button', { name: 'Notificações', exact: true });
      await trigger.click();
      const bell = page.getByRole('dialog', { name: 'Notificações', exact: true });
      const externalAlert = bell.getByRole('button', { name: /Aviso com endereço externo/ });
      await bell.getByText('2 não lidas', { exact: true }).waitFor();
      await externalAlert.focus();
      await page.keyboard.press('Escape');
      await bell.waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate((button) => button === document.activeElement), true);
      await trigger.click();
      await externalAlert.click();
      await bell.getByText('1 não lida', { exact: true }).waitFor();
      assert.equal(page.url(), origin + '/cliente');
      await bell.getByRole('button', { name: /Documento para consultar/ }).click();
      await page.waitForURL((url) => url.pathname === '/cliente/documentos');
      const destination = new URL(page.url());
      assert.equal(destination.searchParams.get('documento'), file.id);
      assert.equal(destination.searchParams.get('origem'), 'sino');
      assert.equal(destination.hash, '#referencia');
      assert.deepEqual(reads, [
        { p_notification_id: 'qa-external-alert' }, { p_notification_id: 'qa-file-alert' },
      ]);
      return { externalAddressBlocked: true, deepLink: true, readOncePerNotification: true };
    },
  },
  {
    id: 'workspace-notifications-follow-session-actor',
    role: 'client',
    async run({ page, context, origin }) {
      const nextId = 'ce000000-0000-4000-8000-000000000007';
      const replacement = makeSession();
      const [header, encoded, signature] = replacement.access_token.split('.');
      const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString());
      replacement.access_token = [header, part({ ...claims, sub: nextId, session_id: 'ce000000-0000-4000-8000-000000000008' }), signature].join('.');
      replacement.user = { ...replacement.user, id: nextId };

      await mockJson(context, origin, 'profiles', 'GET', (request) => {
        const actor = new URL(request.url()).searchParams.get('id')?.slice(3);
        const profile = { ...tables.profiles[0], id: actor || user.id, role: 'client' };
        return { json: request.headers().accept?.includes('vnd.pgrst.object') ? profile : [profile] };
      });
      const reads = [];
      await mockJson(context, origin, 'notifications', 'GET', (request) => {
        const actor = new URL(request.url()).searchParams.get('user_id')?.slice(3);
        reads.push(actor);
        return { json: [{
          id: 'notification-' + actor, title: actor === nextId ? 'Aviso do novo perfil' : 'Aviso do perfil anterior',
          user_id: actor, read_at: null, created_at: '2026-11-12T12:00:00Z',
        }] };
      });

      await page.goto(origin + '/cliente', { waitUntil: 'domcontentloaded' });
      const bell = page.getByRole('button', { name: 'Notificações', exact: true });
      await bell.click();
      await page.getByText('Aviso do perfil anterior', { exact: true }).waitFor();
      await page.evaluate(({ sessionKey, replacement, nextId }) => {
        localStorage.setItem(`cali:welcome-seen:${nextId}`, 'qa');
        localStorage.setItem(sessionKey, JSON.stringify(replacement));
        const channel = new BroadcastChannel(sessionKey);
        channel.postMessage({ event: 'SIGNED_IN', session: replacement });
        channel.close();
      }, { sessionKey, replacement, nextId });
      await page.getByText('Aviso do perfil anterior', { exact: true }).waitFor({ state: 'hidden' });
      await bell.click();
      await page.getByText('Aviso do novo perfil', { exact: true }).waitFor();
      assert.equal(await page.getByText('Aviso do perfil anterior', { exact: true }).count(), 0);
      assert.deepEqual([...new Set(reads)], [user.id, nextId]);
      return { scopedToSignedInActor: true, previousActorHidden: true };
    },
  },
  {
    id: 'workspace-logout-pauses-current-actor-timer',
    role: 'admin',
    async run({ page, context, origin }) {
      const timer = {
        id: 'ce000000-0000-4000-8000-000000000009',
        company_id: companyId, user_id: user.id, status: 'active', paused_seconds: 0,
        description: 'Revisão em andamento QA', started_at: '2026-11-12T12:00:00Z',
      };
      let checkedActor;
      let paused = false;
      await mockJson(context, origin, 'work_timers', 'GET', (request) => {
        const query = new URL(request.url()).searchParams;
        if (query.get('select') === 'id,description,started_at') {
          checkedActor = query.get('user_id');
          assert.equal(query.get('status'), 'eq.active');
        }
        return { json: paused ? [] : [timer] };
      });
      await mockRpc(context, origin, 'pause_work_timer', (body) => {
        assert.deepEqual(body, { p_timer_id: timer.id });
        paused = true;
        return { json: true };
      });

      await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
      await page.locator('.profile[aria-haspopup="menu"]').click();
      await page.getByRole('menuitem', { name: 'Sair', exact: true }).click();
      const guard = page.getByRole('alertdialog', { name: 'Cronômetro ligado', exact: true });
      await guard.getByText(timer.description, { exact: true }).waitFor();
      assert.equal(checkedActor, 'eq.' + user.id);
      assert.equal(paused, false);
      await guard.getByRole('button', { name: 'Pausar e sair', exact: true }).click();
      await page.waitForURL((url) => url.pathname === '/');
      assert.equal(paused, true);
      return { currentActorTimer: true, pausedBeforeLogout: true };
    },
  },
  {
    id: 'hours-audit-edit-keeps-visible-entry',
    role: 'admin',
    async run({ page, context, origin }) {
      const entry = {
        id: 'cd000000-0000-4000-8000-000000000001',
        company_id: companyId, project_id: null, work_date: '2026-11-12',
        minutes: 30, description: 'Lançamento visível QA', category: 'Outros',
        source_type: 'manual', client_visible: false, created_at: '2026-11-12T12:00:00Z',
      };
      const excluded = {
        ...entry, id: 'cd000000-0000-4000-8000-000000000002', work_date: '2026-11-13',
        project_id: 'cd000000-0000-4000-8000-000000000003', description: 'Lançamento fora do projeto QA',
      };
      let visible = entry;
      const writes = [];
      const deletions = [];
      let audit = [];
      await page.clock.setFixedTime(new Date('2026-11-12T13:00:00Z'));
      await mockJson(context, origin, 'hour_entries', 'GET', () => ({ json: visible ? [excluded, visible] : [excluded] }));
      await mockRpc(context, origin, 'get_hour_entry_audit', () => ({ json: audit }));
      await mockRpc(context, origin, 'edit_hour_entry_with_audit', (body) => {
        writes.push(body);
        visible = { ...visible, minutes: body.p_minutes };
        audit = [{
          id: 1, entity_id: entry.id, event_type: 'hours_entry_edited',
          created_at: '2026-11-12T13:00:00Z', metadata: { reason: body.p_reason, after: visible },
        }];
        return { json: true };
      });
      await mockRpc(context, origin, 'delete_hour_entry_with_audit', (body) => {
        deletions.push(body);
        audit = [{ id: 2, event_type: 'hours_entry_deleted', created_at: '2026-11-12T13:00:00Z', metadata: { reason: body.p_reason, deleted_entry: visible } }, ...audit];
        visible = null;
        return { json: true };
      });
      await page.goto(origin + '/admin/horas', { waitUntil: 'domcontentloaded' });
      const table = page.locator('[data-hours-entries]');
      const row = table.getByRole('row').filter({ hasText: 'Atuação geral' });
      await row.getByRole('button', { name: 'Editar lançamento', exact: true }).click();
      const edit = page.getByRole('dialog', { name: 'Confirmar alteração de horas' }).filter({
        has: page.getByRole('heading', { name: 'Editar lançamento de horas', exact: true }),
      });
      assert.equal(await edit.locator('textarea').first().inputValue(), entry.description);
      const save = edit.getByRole('button', { name: 'Salvar correção', exact: true });
      assert.equal(await save.isDisabled(), true);
      await edit.getByLabel('Duração (minutos)').fill('45');
      await edit.getByLabel('Justificativa da edição').fill(' Corrigir duração lançada. ');
      const navigations = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) navigations.push(frame.url());
      });
      await save.click();
      await edit.waitFor({ state: 'hidden' });
      await row.getByText('45min', { exact: true }).waitFor();
      assert.deepEqual(navigations, []);
      assert.deepEqual(writes, [{
        p_entry_id: entry.id, p_work_date: entry.work_date, p_minutes: 45, p_description: entry.description,
        p_category: 'Outros', p_client_visible: false, p_reason: 'Corrigir duração lançada.',
      }]);
      await page.getByRole('button', { name: 'Auditoria', exact: true }).click();
      const history = page.getByRole('dialog', { name: 'Auditoria de horas', exact: true });
      await history.getByText('Lançamento editado', { exact: true }).waitFor();
      await history.getByText('Justificativa: Corrigir duração lançada.', { exact: true }).waitFor();
      await history.getByRole('button', { name: 'Fechar', exact: true }).click();
      await row.getByRole('button', { name: 'Excluir lançamento', exact: true }).click();
      const remove = page.getByRole('dialog', { name: 'Confirmar alteração de horas' }).filter({
        has: page.getByRole('heading', { name: 'Excluir lançamento de horas', exact: true }),
      });
      assert.equal(await remove.getByRole('button', { name: 'Excluir e registrar', exact: true }).isDisabled(), true);
      await remove.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await remove.waitFor({ state: 'hidden' });
      await row.getByText('45min', { exact: true }).waitFor();
      assert.deepEqual(deletions, []);
      await row.getByRole('button', { name: 'Excluir lançamento', exact: true }).click();
      await remove.getByRole('textbox', { name: 'Por que você está excluindo?' }).fill(' Registro duplicado. ');
      await remove.getByRole('button', { name: 'Excluir e registrar', exact: true }).click();
      await row.waitFor({ state: 'hidden' });
      assert.deepEqual(deletions, [{ p_entry_id: entry.id, p_reason: 'Registro duplicado.' }]);
      await page.getByRole('button', { name: 'Auditoria', exact: true }).click();
      await history.getByText('Lançamento excluído', { exact: true }).waitFor();
      return { matchingVisibleEntry: true, reasonRequired: true, auditedCorrection: true, auditedDeletion: true };
    },
  },
];

if (require.main === module) browserSuite(cases).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = cases;
