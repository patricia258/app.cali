import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const url = 'http://127.0.0.1:56431';
const mail = 'http://127.0.0.1:56432';
const origin = 'http://127.0.0.1:56430';
const { CALI_QA_PUBLISHABLE_KEY: key, CALI_QA_SERVICE_ROLE_KEY: service, CALI_QA_TEST_PASSWORD: password } = process.env;
const companyA = 'ca110000-0000-4000-8000-000000000001';
const companyB = 'ca110000-0000-4000-8000-000000000002';
const email = 'cliente-backend-qa@example.test';
const opts = { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: 'cali_workspace' } };
const admin = createClient(url, service, opts);
const invite = crypto.randomUUID();
const ownRealtimeRecord = crypto.randomUUID();
const foreignRealtimeRecord = crypto.randomUUID();
const actors = [];
const consumedMail = new Set();
const events = [];
let realtimeClient;
let realtimeChannel;
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
function sql(input) {
  return execFileSync('docker',['exec','-i','cali-oneshot-qa-db-1','psql','-U','cali_restore_admin','-d','postgres','-XAtq','-v','ON_ERROR_STOP=1'],
    {input,encoding:'utf8',timeout:10000}).trim();
}
function ok(result, label) {
  assert(!result.error, label + ' (' + (result.error?.code || result.error?.status || '') + ')');
  return result.data;
}
async function fetchJson(path, body, token, schema='cali_workspace') {
  const headers = {apikey:key,Origin:origin,'Content-Type':'application/json','Accept-Profile':schema,'Content-Profile':schema};
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(url + path,{method:body === undefined ? 'GET' : 'POST',headers,body:body === undefined ? undefined : JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)});
  return {status:response.status,data:await response.json().catch(() => null)};
}
async function passwordActor(account) {
  const client=createClient(url,key,opts);
  const {session}=ok(await client.auth.signInWithPassword({email:account,password}),'GoTrue senha');
  actors.push(client);
  return session.access_token;
}
async function otpRequest() {
  const before = Date.now() - 1000;
  const request = await fetchJson('/functions/v1/workspace-access',{action:'request',email},key);
  assert.equal(request.status,200,'Pedido de código');
  for (let attempt=0;attempt<40;attempt++) {
    const result=await fetch(mail+'/api/v1/messages?limit=50',{signal:AbortSignal.timeout(4000)}).then(r=>r.json());
    const message = result.messages?.find(m=>!consumedMail.has(m.ID) && Date.parse(m.Created) >= before && m.To?.some(a=>a.Address===email) && /código/i.test(m.Subject));
    if (message) {
      consumedMail.add(message.ID);
      const full=await fetch(mail+'/api/v1/message/'+encodeURIComponent(message.ID),{signal:AbortSignal.timeout(4000)}).then(r=>r.json());
      const matches=[...String(full.HTML).matchAll(/>\s*([0-9]{6})\s*</g)].map(m=>m[1]);
      const candidates=[...new Set(matches)];
      assert.equal(candidates.length,1,'Código sintético ausente no Mailpit');
      return candidates[0];
    }
    await pause(250);
  }
  throw new Error('Mailpit não recebeu código sintético');
}
async function workspace(path,token,body) { return fetchJson('/rest/v1/'+path,body,token); }
async function assertStale(token) {
  for (const path of ['profiles?select=id','companies?select=id','account_record_interaction_metrics?select=company_id']) {
    const result=await workspace(path,token);
    assert.equal(result.status,403,'JWT inválido leu '+path);
  }
}
async function terms(token) {
  const state=await workspace('rpc/v2_read_terms_state',token,{});
  assert.equal(state.status,200);
  assert.match(state.data.version,/^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/);
  if (!state.data.accepted) {
    const accepted = await workspace('rpc/v2_accept_terms',token,{p_version:state.data.version,p_content_hash:state.data.contentHash});
    assert([200,204].includes(accepted.status),'Aceite atual');
    assert.equal((await workspace('rpc/v2_read_terms_state',token,{})).data?.accepted,true,'Recibo ausente');
  }
}
async function file(token,company) {
  return fetch(url+'/storage/v1/object/authenticated/cali-workspace-private/documents/'+company+'/qa-legado.pdf',
    {headers:{apikey:key,Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(7000)});
}

async function watchRecords(session) {
  realtimeClient = createClient(url,key,opts);
  ok(await realtimeClient.auth.setSession(session),'Sessão Realtime');
  await realtimeClient.realtime.setAuth(session.access_token);
  realtimeChannel = realtimeClient.channel('qa-session-contract-' + crypto.randomUUID());
  const watched = new Set([ownRealtimeRecord,foreignRealtimeRecord]);
  await new Promise((resolve,reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime não assinou.')),12000);
    realtimeChannel.on('postgres_changes',{event:'*',schema:'cali_workspace',table:'account_records'},event => {
      const id = event.new.id ?? event.old.id;
      if (watched.has(id)) events.push([event.eventType,id]);
    }).subscribe(status => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
      if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); reject(new Error('Realtime indisponível.')); }
    });
  });
}

async function waitForRealtime(check, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (check()) return;
    await pause(250);
  }
  assert.fail(message);
}

assert(key&&service&&password);
assert.equal(execFileSync('docker',['network','inspect','cali-oneshot-qa-internal','--format','{{.Internal}}'],{encoding:'utf8'}).trim(),'true');
assert.equal(execFileSync('docker',['inspect','cali-oneshot-qa-ingress-1','--format','{{(index (index .HostConfig.PortBindings "56431/tcp") 0).HostIp}}'],{encoding:'utf8'}).trim(),'127.0.0.1');
assert.equal(sql("select count(*)=5 and bool_and(email like '%@example.test') and current_setting('cron.launch_active_jobs')='off' from auth.users;"),'t');
let actorId;
try {
  const adminAal1=await passwordActor('admin-qa@example.test');
  assert.equal((await workspace('profiles?select=id',adminAal1)).status,200);
  assert.equal((await workspace('companies?select=id',adminAal1)).status,403,'Admin AAL1 acessou operação privada');
  assert.equal((await fetchJson('/rest/v1/rpc/cali_form_public',{p_slug:'qa-sem-form'},undefined,'public')).status,200,'Guarda bloqueou RPC pública');
  const {user}=ok(await admin.auth.admin.createUser({email,password,email_confirm:true}),'Auth fixture');
  actorId=user.id;
  sql(`begin;
  alter table cali_workspace.client_invites disable trigger guard_new_company_access;
  insert into cali_workspace.client_invites(id,company_id,email,full_name,active,platform_access,access_role)
  values('${invite}','${companyA}','${email}','Cliente Backend QA',true,true,'additional');
  alter table cali_workspace.client_invites enable trigger guard_new_company_access;
  insert into cali_workspace.profiles(id,company_id,email,full_name,role,active) values('${actorId}','${companyA}','${email}','Cliente Backend QA','client',true);
  commit;`);

  const code=await otpRequest();
  const attempts=await Promise.all([1,2].map(()=>fetchJson('/functions/v1/workspace-access',{action:'verify',email,code},key)));
  assert.deepEqual(attempts.map(x=>x.status).sort(),[200,400],'OTP concorrente aceito mais de uma vez');
  const first=attempts.find(x=>x.status===200).data.session;
  const token=first.access_token;
  assert.equal((await workspace('profiles?select=id',token)).status,200);
  assert.equal((await workspace('companies?select=id',token)).status,403,'Aceite ausente');
  await terms(token);
  assert.deepEqual((await workspace('companies?select=id',token)).data.map(r=>r.id),[companyA]);
  assert.deepEqual((await workspace('companies?select=id&id=eq.'+companyB,token)).data,[]);
  const own=await file(token,companyA);
  assert.equal(own.status,200,'PDF A não abriu');
  assert((await own.text()).startsWith('%PDF-'));
  assert(!(await file(token,companyB)).ok,'PDF B vazou');
  const sign=await fetchJson('/storage/v1/object/sign/cali-workspace-private/documents/'+companyA+'/qa-legado.pdf',{expiresIn:30},token);
  assert(sign.status>=400,'Storage assinou documento privado para Cliente');

  const google = await fetchJson('/functions/v1/google-calendar-oauth',{action:'authorize'},token);
  assert.equal(google.status,200,'OAuth de calendário com sessão admitida');
  const authorize = new URL(google.data.url);
  assert.equal(authorize.origin,'http://127.0.0.1:56433','Calendário saiu do provedor isolado.');
  assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
  assert.equal(authorize.searchParams.get('redirect_uri'),origin+'/oauth/google/callback');

  await watchRecords(first);
  // The channel acknowledgement can precede registration with Postgres Changes on a cold tenant.
  await waitForRealtime(() => sql(`select exists (
    select 1 from realtime.subscription
    where entity='cali_workspace.account_records'::regclass and claims->>'sub'='${actorId}'
  );`) === 't', 'Realtime não registrou a assinatura de ocorrências.');
  sql(`insert into cali_workspace.account_records(id,company_id,title,visibility)
    values('${ownRealtimeRecord}','${companyA}','QA Realtime A','client'),
      ('${foreignRealtimeRecord}','${companyB}','QA Realtime B','client');`);
  const visible=await workspace('account_records?select=id&id=in.('+ownRealtimeRecord+','+foreignRealtimeRecord+')',token);
  assert.equal(visible.status,200);
  assert.deepEqual(visible.data.map(record=>record.id),[ownRealtimeRecord]);
  await waitForRealtime(
    () => events.some(([type,id]) => type === 'INSERT' && id === ownRealtimeRecord),
    'Realtime não entregou inserção própria.',
  );
  sql(`update cali_workspace.account_records set title='QA Realtime antes do corte' where id in ('${ownRealtimeRecord}','${foreignRealtimeRecord}');`);
  await waitForRealtime(
    () => events.some(([type,id]) => type === 'UPDATE' && id === ownRealtimeRecord),
    'Realtime não entregou atualização própria.',
  );
  await pause(500);
  const allowedEvents=[['INSERT',ownRealtimeRecord],['UPDATE',ownRealtimeRecord]];
  assert.deepEqual(events,allowedEvents,'Realtime divergiu dos eventos próprios de A.');

  sql(`update cali_workspace.profiles set active=false where id='${actorId}';`);
  await assertStale(token);
  assert(!(await file(token,companyA)).ok,'JWT cortado abriu documento');
  sql(`update cali_workspace.account_records set title='QA Realtime após corte' where id='${ownRealtimeRecord}';
    delete from cali_workspace.account_records where id='${foreignRealtimeRecord}';`);
  await pause(1400);
  assert.deepEqual(events,allowedEvents,'Realtime publicou update pós-corte ou DELETE de outra empresa.');
  sql(`update cali_workspace.profiles set active=true where id='${actorId}';`);
  await assertStale(token);
  await assertStale(await passwordActor(email));

  // Libera apenas o limite temporal do código já consumido da fixture, sem tocar códigos de outros atores.
  sql(`update cali_workspace.workspace_access_codes set created_at=created_at-interval '3 minutes' where actor_user_id='${actorId}' and used_at is not null;`);
  const nextCode=await otpRequest();
  const reissued=await fetchJson('/functions/v1/workspace-access',{action:'verify',email,code:nextCode},key);
  assert.equal(reissued.status,200,'Novo OTP pós-corte não admitiu');
  assert.equal((await workspace('companies?select=id',reissued.data.session.access_token)).status,200);
  const client=createClient(url,key,opts);
  actors.push(client);
  ok(await client.auth.setSession(reissued.data.session),'Sessão reemitida');
  ok(await client.auth.signOut({scope:'local'}),'Logout real');
  await assertStale(reissued.data.session.access_token);
  console.log('PASS OTP, MFA, termos, A/B, Storage, OAuth local, Realtime, revogação, reativação e logout');
} finally {
  if (realtimeClient && realtimeChannel) {
    await realtimeClient.removeChannel(realtimeChannel);
    realtimeClient.realtime.disconnect();
  }
  for (const actor of actors) await actor.auth.signOut({scope:'local'}).catch(()=>{});
  if (actorId) {
    sql(`begin;
    delete from cali_workspace.google_oauth_attempts where user_id='${actorId}';
    delete from cali_workspace.account_records where id in ('${ownRealtimeRecord}','${foreignRealtimeRecord}');
    delete from cali_workspace.activity_log where actor_user_id='${actorId}';
    delete from cali_workspace.notifications where user_id='${actorId}';
    delete from cali_workspace.client_invites where id='${invite}';
    commit;`);
    ok(await admin.auth.admin.deleteUser(actorId),'Limpeza da fixture Auth');
  }
  assert.equal(sql("select count(*) from auth.users;"),'5');
}
