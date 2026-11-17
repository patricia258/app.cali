import assert from 'node:assert/strict';
import authFixture from '../e2e/browser-fixture.cjs';
import { supabaseOrigin } from './calendar-navigation.mjs';

const dependency = { id: 'qa-dependency', title: 'Enviar fichas QA', due_date: '2026-11-10', status: 'pending', received_at: null };
const dependencyPath = '/rest/v1/deliverable_client_dependencies';
const revisionsPath = '/rest/v1/deliverable_due_revisions';

async function setup(context, page, origin) {
  const session = authFixture.makeSession();
  const state = { dependencies: [{ ...dependency }], revisions: [], writes: [] };
  await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
  await context.addInitScript(({ storageKey, session }) => {
    localStorage.setItem(storageKey, JSON.stringify(session));
  }, { storageKey: authFixture.sessionKey, session });
  await context.route((url) => url.origin === supabaseOrigin, async (route) => {
    const request = route.request();
    const { pathname: path, searchParams: query } = new URL(request.url());
    const method = request.method();
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
      'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
    };
    const respond = (json, status = 200) => route.fulfill({ status, headers, json });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/auth/v1/user' && method === 'GET') return respond(session.user);
    if (path === dependencyPath && method === 'GET') return respond(state.dependencies);
    if (path === revisionsPath && method === 'GET') return respond(state.revisions);
    if (['POST', 'PATCH'].includes(method)) {
      const body = request.postDataJSON();
      state.writes.push({ path, method, query: Object.fromEntries(query), body });
      if (path === '/rest/v1/deliverables' && method === 'PATCH') return respond([]);
      if (path === revisionsPath && method === 'POST') {
        state.revisions.push({ ...body, id: 'qa-revision', created_at: '2026-11-12T15:00:00Z' });
        return respond([]);
      }
      if (path === '/rest/v1/rpc/partner_add_dependency') {
        state.dependencies.push({ ...dependency, id: 'qa-new-dependency', title: body.p_title, due_date: body.p_due_date });
        return respond(true);
      }
      if (path === '/rest/v1/rpc/partner_receive_dependency') {
        const row = state.dependencies.find((item) => item.id === body.p_dependency_id);
        if (!row) return respond({ message: 'Dependência inexistente na fixture' }, 404);
        Object.assign(row, { status: 'received', received_at: '2026-11-12T15:00:00Z' });
        return respond(true);
      }
    }
    return respond({ message: 'Requisição fora da fixture de dependências' }, 404);
  });
  return state;
}

export function registerDeliveryDependencies(component) {
  component('DeliverableDependencies · Admin precisa justificar reprogramação e grava o prazo com histórico', 'dependencyAdmin', async (page, state) => {
    const section = page.locator('.v2-deps');
    await section.getByRole('alert').getByText('Pendência do cliente em atraso há 2 dias', { exact: true }).waitFor();
    await section.getByRole('button', { name: 'Reprogramar prazo', exact: true }).click();
    assert.equal(await section.getByLabel('Novo prazo', { exact: true }).inputValue(), '2026-11-16');
    const confirm = section.getByRole('button', { name: 'Confirmar novo prazo', exact: true });
    const reason = section.getByLabel('Justificativa (o cliente vê)', { exact: true });
    await reason.clear();
    assert(await confirm.isDisabled());
    assert.equal(state.writes.length, 0);
    await reason.fill('Aguardar as fichas até segunda.');
    await confirm.click();
    await section.getByText('Aguardar as fichas até segunda.', { exact: true }).waitFor();
    const [delivery, revision] = state.writes;
    assert.deepEqual(delivery, {
      path: '/rest/v1/deliverables', method: 'PATCH', query: { id: 'eq.qa-delivery' },
      body: { due_at: '2026-11-16T18:00:00-03:00', original_due_at: '2026-11-12' },
    });
    assert.equal(revision.path, revisionsPath);
    assert.equal(revision.body.deliverable_id, 'qa-delivery');
    assert.equal(revision.body.new_due, delivery.body.due_at);
    assert.equal(revision.body.reason, 'Aguardar as fichas até segunda.');
  }, setup);

  component('DeliverableDependencies · Partner registra e recebe dependência por RPC', 'dependencyStaff', async (page, state) => {
    const section = page.locator('.v2-deps');
    await section.getByText(dependency.title, { exact: true }).waitFor();
    assert.equal(await section.getByRole('button', { name: /Reprogramar prazo|Revisar prazo|Remover/ }).count(), 0);
    const add = section.getByRole('button', { name: 'Adicionar', exact: true });
    assert(await add.isDisabled());
    await section.getByRole('textbox', { name: 'Dependência do cliente', exact: true }).fill('  Confirmar prioridades QA  ');
    await section.getByLabel('Enviar até', { exact: true }).fill('2026-11-12');
    await add.click();
    const row = section.getByRole('listitem').filter({ hasText: 'Confirmar prioridades QA' });
    await row.getByRole('button', { name: 'Recebido', exact: true }).click();
    await row.getByText('Recebido 12/11/2026', { exact: true }).waitFor();
    assert.deepEqual(state.writes.map(({ path, body }) => [path, body]), [
      ['/rest/v1/rpc/partner_add_dependency', { p_deliverable_id: 'qa-delivery', p_title: 'Confirmar prioridades QA', p_due_date: '2026-11-12' }],
      ['/rest/v1/rpc/partner_receive_dependency', { p_dependency_id: 'qa-new-dependency' }],
    ]);
  }, setup);
}
