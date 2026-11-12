import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { LEGAL_VERSION, privacyPolicy, termsOfUse } from '../../src/domain/legalTexts.ts';
import { actorId, publishableKey, workspaceHttp } from './helpers/workspace-http.mjs';

const otp = '/functions/v1/workspace-access';
const termsRpc = '/rest/v1/rpc/v2_read_terms_state';
const acceptRpc = '/rest/v1/rpc/v2_accept_terms';
const receiptTable = '/rest/v1/terms_acceptances';
const contentHash = createHash('sha256').update(`${termsOfUse()}\n\n${privacyPolicy()}`).digest('hex');
const publication = { version: LEGAL_VERSION, contentHash, accepted: false };

test('OTP envia e-mail normalizado e só confirma o papel depois de estabelecer uma sessão', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('supabase.ts');
  http.respond(otp, { ok: true, challenge: 'pending' });
  const requested = await api.requestAccessCode('  admin@example.test  ');
  assert.equal(requested.data.challenge, 'pending');
  const [request] = http.requests;
  assert.deepEqual(request.body, { action: 'request', email: 'admin@example.test', website: '' });
  assert.equal(request.headers.get('apikey'), publishableKey);
  assert.equal(request.headers.get('authorization'), null);

  http.respond(otp, { ok: true, role: 'admin', session: http.session });
  http.respond('/auth/v1/user', http.user, { method: 'GET' });
  assert.deepEqual(await api.verifyAccessCode('admin@example.test', '012345'), {
    data: { ok: true, role: 'admin' }, error: null,
  });
  assert.equal(http.requests[1].body.code, '012345');
  assert.equal((await api.supabase.auth.getSession()).data.session.user.id, actorId);
});

test('OTP recusa erro de código, papel desconhecido e sucesso sem credencial', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('supabase.ts');
  http.respond(otp, { ok: false, error: 'Código expirado' }, { status: 400 });
  assert.deepEqual(await api.verifyAccessCode('admin@example.test', '012345'), {
    data: null, error: { message: 'Código expirado' },
  });
  http.respond(otp, { ok: true, role: 'owner', session: http.session });
  assert.equal((await api.verifyAccessCode('admin@example.test', '012345')).data, null);
  http.respond(otp, { ok: true, role: 'admin' });
  assert.equal((await api.verifyAccessCode('admin@example.test', '012345')).data, null);
  assert.equal((await api.supabase.auth.getSession()).data.session, null);
});

test('RPC público anônimo omite sessão e RPC administrativo preserva token e schema', async (t) => {
  const http = await workspaceHttp(t);
  const api = await http.load('supabase.ts');
  const publicPath = '/rest/v1/rpc/cali_form_public';
  assert.equal((await api.publicSupabase.rpc('cali_form_public')).data, null);
  assert.equal(http.requests.length, 0);
  await http.signIn();
  http.respond(publicPath, { title: 'Formulário QA' });
  assert.equal((await api.anonPublicRpc('cali_form_public', { p_slug: 'qa' })).data.title, 'Formulário QA');
  const anonymous = http.requests.at(-1);
  assert.equal(anonymous.headers.get('authorization'), null);
  assert.equal(anonymous.headers.get('content-profile'), 'public');
  http.respond('/rest/v1/rpc/workspace_update_mapa_people_record', { id: actorId });
  assert.equal((await api.supabase.rpc('update_mapa_people_record', { p_id: actorId })).data.id, actorId);
  const administrative = http.requests.at(-1);
  assert.equal(administrative.headers.get('authorization'), `Bearer ${http.accessToken}`);
  assert.equal(administrative.headers.get('content-profile'), 'public');
  assert.deepEqual(administrative.body, { p_id: actorId });
});

test('perfil usa cache por ator e rejeita papel desconhecido ou sem acesso', async (t) => {
  const http = await workspaceHttp(t);
  const { workspaceProfileQuery } = await http.load('access/profile.ts');
  const { queryClient } = await http.load('query-client.ts');
  t.after(() => queryClient.clear());
  const profile = '/rest/v1/profiles';
  http.respond(profile, { role: 'client', active: false }, { method: 'GET' });
  assert.deepEqual(await queryClient.fetchQuery(workspaceProfileQuery(actorId)), { role: 'client', active: false });
  assert.equal(http.requests[0].url.searchParams.get('id'), `eq.${actorId}`);
  assert.equal(http.requests[0].headers.get('accept-profile'), 'cali_workspace');

  const other = 'other-user';
  http.respond(profile, { role: 'owner', active: true }, { method: 'GET' });
  await assert.rejects(queryClient.fetchQuery(workspaceProfileQuery(other)), /role/);
  assert.equal(queryClient.getQueryData(workspaceProfileQuery(other).queryKey), undefined);
  assert.equal(queryClient.getQueryData(workspaceProfileQuery(actorId).queryKey).active, false);

  http.respond(profile, { message: 'Acesso revogado' }, { method: 'GET', status: 403 });
  await assert.rejects(queryClient.fetchQuery(workspaceProfileQuery(other)), { message: 'Acesso revogado' });
});

test('aceite confirma versão e hash, fixa o token e relê o recibo após a escrita', async (t) => {
  const http = await workspaceHttp(t);
  const { confirmTermsAcceptance } = await http.load('access/terms.ts');
  await http.signIn();
  http.respond(termsRpc, publication);
  http.respond(acceptRpc, null, { status: 204 });
  http.respond(termsRpc, { ...publication, accepted: true });
  const result = await confirmTermsAcceptance({ id: actorId, role: 'admin' }, publication, new AbortController().signal);
  assert.equal(result.accepted, true);
  const calls = http.requests.slice(1);
  assert.deepEqual(calls.map(({ url }) => url.pathname), [termsRpc, acceptRpc, termsRpc]);
  assert.deepEqual(calls[1].body, { p_version: LEGAL_VERSION, p_content_hash: contentHash });
  assert.ok(calls.every(({ headers }) => headers.get('authorization') === `Bearer ${http.accessToken}`));
});

test('aceite bloqueia sessão trocada, cancelamento, hash divergente e escrita sem recibo', async (t) => {
  const http = await workspaceHttp(t);
  const { readTermsState, confirmTermsAcceptance } = await http.load('access/terms.ts');
  await http.signIn();
  const actor = { id: actorId, role: 'client' };
  const signal = new AbortController().signal;
  await assert.rejects(readTermsState({ ...actor, id: 'other' }, signal), /confirmar os termos/);
  await assert.rejects(readTermsState(actor, AbortSignal.abort()), { name: 'AbortError' });
  assert.equal(http.requests.length, 1);
  http.respond(termsRpc, { ...publication, contentHash: 'f'.repeat(64) });
  await assert.rejects(readTermsState(actor, signal), /confirmar os termos/);
  http.respond(termsRpc, publication);
  await assert.rejects(confirmTermsAcceptance(actor, { ...publication, version: 'old' }, signal), /confirmar os termos/);
  http.respond(termsRpc, publication);
  http.respond(acceptRpc, null, { status: 204 });
  http.respond(termsRpc, publication);
  await assert.rejects(confirmTermsAcceptance(actor, publication, signal), /confirmar os termos/);
});

test('Partner recupera recibo legado após conflito idempotente e evita escrita repetida', async (t) => {
  const http = await workspaceHttp(t);
  const { confirmTermsAcceptance } = await http.load('access/terms.ts');
  await http.signIn();
  const actor = { id: actorId, role: 'partner' };
  const signal = new AbortController().signal;
  http.respond(termsRpc, publication);
  http.respond(receiptTable, [], { method: 'GET' });
  http.respond(receiptTable, { code: '23505', message: 'duplicate receipt' }, { status: 409 });
  http.respond(termsRpc, publication);
  http.respond(receiptTable, [{ version: LEGAL_VERSION }], { method: 'GET' });
  assert.equal((await confirmTermsAcceptance(actor, publication, signal)).accepted, true);
  const write = http.requests.find(({ url, method }) => url.pathname === receiptTable && method === 'POST');
  assert.equal(write.body.user_id, actorId);
  assert.equal(write.body.version, LEGAL_VERSION);
  http.respond(termsRpc, publication);
  http.respond(receiptTable, [{ version: LEGAL_VERSION }], { method: 'GET' });
  assert.equal((await confirmTermsAcceptance(actor, publication, signal)).accepted, true);
});
