import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const api = 'http://127.0.0.1:56431';
const origin = 'http://127.0.0.1:56430';
const { CALI_QA_PUBLISHABLE_KEY: key, CALI_QA_SERVICE_ROLE_KEY: serviceKey, CALI_QA_JWT_SECRET: secret } = process.env;
assert(key && serviceKey && secret);
const db = createClient(api, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: 'cali_workspace' } });
const sql = (input) => execFileSync('docker', ['exec','-i','cali-oneshot-qa-db-1','psql','-U','cali_restore_admin','-d','postgres','-XAtq','-v','ON_ERROR_STOP=1'], { input, encoding: 'utf8', timeout: 10000 }).trim();
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 10000 }).trim();
const network = 'cali-oneshot-qa-internal';
assert.equal(docker('network', 'inspect', network, '--format', '{{.Internal}}'), 'true');
const ingress = 'cali-oneshot-qa-ingress-1';
assert.equal(docker('inspect', ingress, '--format', '{{(index (index .HostConfig.PortBindings "56431/tcp") 0).HostIp}}'), '127.0.0.1');
for (const edge of ['report-edge', 'proposal-edge', 'mapa-email-edge']) {
  const details = docker('inspect', 'cali-oneshot-qa-' + edge + '-1', '--format', '{{.State.Running}} {{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}{{range .Config.Env}}{{if eq . "CALI_DELIVERY_MODE=isolated"}}{{.}}{{end}}{{end}}');
  assert.equal(details, `true ${network} CALI_DELIVERY_MODE=isolated`, 'Edge comercial fora do laboratório');
}
assert.equal(sql("select inet_server_addr() is null and current_setting('cron.launch_active_jobs',true)='off';"), 't');
const actor = sql("select id from auth.users where email='admin-qa@example.test';");
assert.match(actor, /^[a-f0-9-]{36}$/);
const company = 'ca110000-0000-4000-8000-000000000001';
const quarter = sql(`select start_at::date || '|' || (start_at + interval '3 months' - interval '1 day')::date
  from generate_series('2021-01-01'::date,'2025-10-01'::date,interval '3 months') as start_at
  where not exists (select 1 from cali_workspace.reports
    where company_id='${company}' and report_type='quarterly' and period_start=start_at::date)
  order by start_at desc limit 1;`);
assert.match(quarter, /^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/);
const [quarterStart, quarterEnd] = quarter.split('|');
const recipient = 'cliente-a@example.test';
const foreign = 'cliente-b@example.test';
const session = randomUUID();
const ids = { proposal: randomUUID(), submission: randomUUID(), report: randomUUID(), mapa: randomUUID() };
const marker = 'QA-COMM-' + ids.mapa.slice(0,8);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
const digest = createHash('sha256').update(pdf).digest('hex');
const reportVersion = 18;
const proposalVersion = 3;
const checks = {};
const epoch = Math.floor(Date.now()/1000);
const b64 = object => Buffer.from(JSON.stringify(object)).toString('base64url');
const tokenHead = b64({alg:'HS256',typ:'JWT'}) + '.' + b64({
  sub:actor,role:'authenticated',aud:'authenticated',session_id:session,aal:'aal2',
  email:'admin-qa@example.test',iat:epoch,exp:epoch+3600,app_metadata:{provider:'email',providers:['email']},user_metadata:{},
});
const token = tokenHead + '.' + createHmac('sha256',secret).update(tokenHead).digest('base64url');
async function post(path, data, status) {
  const response = await fetch(api+path, { method:'POST', headers:{
    apikey:key, Authorization:'Bearer '+token, Origin:origin, 'Content-Type':'application/json', 'Content-Profile':'cali_workspace',
  }, body:JSON.stringify(data), redirect:'error', signal:AbortSignal.timeout(20_000) });
  const body = await response.json().catch(()=>null);
  assert.equal(response.status,status,path+' '+String(body?.error ?? body?.message ?? ''));
  return body;
}
async function retry(endpoint, payload) {
  const path = '/functions/v1/' + endpoint;
  const first = await post(path,payload,200);
  const repeated = await post(path,payload,200);
  assert(first.email_id && first.email_id === repeated.email_id);
  return first;
}
try {
  sql(`
  begin;
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,secret,created_at,updated_at)
  values('${session}','${actor}','qa-commercial-${session}','totp','verified','JBSWY3DPEHPK3PXP',now(),now());
  insert into auth.sessions(id,user_id,factor_id,aal,created_at,updated_at,not_after)
  values('${session}','${actor}','${session}','aal2',now(),now(),now()+interval '30 minutes');
  insert into cali_workspace.reports(id,company_id,title,reference_month,period_start,period_end,status,report_type,version)
  values('${ids.report}','${company}','${marker}','${quarterStart}','${quarterStart}','${quarterEnd}','approved','quarterly',${reportVersion});
  insert into public.cali_submissions(id,protocol,service_slug,contact_name,contact_email,company_name,lgpd_accepted)
  values('${ids.submission}','${marker}','cali-build','Contato QA','${recipient}','Empresa QA',true);
  insert into public.cali_proposals(id,submission_id,service_slug,package_code,status,version)
  values('${ids.proposal}','${ids.submission}','cali-build','COMPLETO','aprovada',${proposalVersion});
  insert into public.mapa_respostas(id,protocolo,c_nome,c_empresa,c_email,c_whatsapp,lgpd_aceite)
  values('${ids.mapa}','${marker}','Contato QA','Empresa QA','${recipient}','00000000000',true);
  insert into cali_session_guard.phase4_mapa_scope(record_id,company_id,operator_id,expires_at)
  values('${ids.mapa}','${company}','${actor}',now()+interval '1 day');
  commit;
  `);
  const scope = await post('/rest/v1/rpc/v2_read_terms_state',{},200);
  assert.equal(scope.accepted,true,'Admin sintético precisa ter aceite vigente');
  const report = {report_id:ids.report,request_id:randomUUID(),version:reportVersion,recipients:[recipient],message:marker};
  const proposal = {proposal_id:ids.proposal,request_id:randomUUID(),version:proposalVersion,recipient_email:recipient,pdf_base64:pdf.toString('base64'),note:marker};
  const mapa = {response_id:ids.mapa,request_id:randomUUID(),revision:1,recipients:[recipient],pdf_base64:pdf.toString('base64'),custom_message:marker};
  await post('/functions/v1/workspace-send-executive-report',{...report,version:17},409);
  await post('/functions/v1/workspace-send-executive-report',{...report,recipients:[foreign]},403);
  await post('/functions/v1/portal-send-proposal',{...proposal,version:2},409);
  await post('/functions/v1/portal-send-proposal',{...proposal,recipient_email:foreign},409);
  await post('/functions/v1/workspace-enviar-relatorio-mapa',{...mapa,revision:2},409);
  await post('/functions/v1/workspace-enviar-relatorio-mapa',{...mapa,recipients:[foreign]},409);
  checks.invalidVersionOrRecipient = 6;
  sql(`insert into cali_workspace.partner_material_reviews(kind,entity_id,company_id,author_id,title,context,source_version,status)
    select materials.kind,materials.id,'${company}',u.id,'Revisão sintética','', 'qa','pending'
    from (values ('report','${ids.report}'::uuid),('proposal','${ids.proposal}'::uuid)) materials(kind,id)
    cross join auth.users u where u.email='partner-a@example.test';`);
  for (const [endpoint, payload] of [['workspace-send-executive-report', report], ['portal-send-proposal', proposal]]) {
    const blocked = await post('/functions/v1/' + endpoint, payload, 409);
    assert.equal(blocked.error, 'Conclua a revisão do Partner antes de aprovar ou enviar.');
  }
  checks.pendingPartnerReview = 2;
  sql(`delete from cali_workspace.partner_material_reviews where entity_id in ('${ids.report}','${ids.proposal}');`);
  const sentReport = await retry('workspace-send-executive-report',report);
  assert.deepEqual(sentReport.to,[recipient]);
  checks.reportSameReceipt = true;
  const sentProposal = await retry('portal-send-proposal',proposal);
  assert.equal(sentProposal.to,recipient);
  checks.proposalSameReceipt = true;
  const firstMap = await retry('workspace-enviar-relatorio-mapa',mapa);
  assert.deepEqual(firstMap.to,[recipient]);
  const asAdmin = await post('/rest/v1/rpc/read_mapa_delivery_state',{p_response_id:ids.mapa},200);
  assert.deepEqual(asAdmin,{revision:1,has_pdf:true,pdf_path:null});
  const mapPath = ids.mapa + '/1/' + digest + '.pdf';
  const archived = await db.storage.from('cali-mapa-delivery').download(mapPath);
  assert(!archived.error);
  assert.deepEqual(Buffer.from(await archived.data.arrayBuffer()),pdf);
  const resent = await retry('workspace-enviar-relatorio-mapa',{...mapa,request_id:randomUUID(),pdf_base64:undefined});
  assert.notEqual(resent.email_id,firstMap.email_id);
  assert.deepEqual(resent.to,[recipient]);
  assert.equal(sql(`select count(*) from cali_workspace.material_email_receipts where kind='mapa' and entity_id='${ids.mapa}' and completed_at is not null and material_version=1 and official_pdf_path='${mapPath}';`),'2');
  checks.mapaFirstAndResendSamePdf = true;
  const messages = await fetch('http://127.0.0.1:56432/api/v1/messages?limit=100').then(r=>r.json());
  const receipts = new Map([
    [sentReport.email_id, 0],
    [sentProposal.email_id, 1],
    [firstMap.email_id, 1],
    [resent.email_id, 1],
  ]);
  assert.equal(receipts.size, 4);
  const delivered = messages.messages.filter(message=>receipts.has(message.ID));
  assert.equal(delivered.length, 4);
  for(const message of delivered) {
    const full = await fetch('http://127.0.0.1:56432/api/v1/message/'+encodeURIComponent(message.ID)).then(r=>r.json());
    assert.deepEqual(full.To.map(address=>address.Address),[recipient]);
    assert.equal(full.Attachments?.length ?? 0, receipts.get(message.ID));
  }
  checks.mailpitDeliveries = delivered.length;
} finally {
  const cleanup = await Promise.all([
    db.storage.from('cali-proposals').remove([`${ids.submission}/${ids.proposal}/${digest}.pdf`]),
    db.storage.from('cali-mapa-delivery').remove([`${ids.mapa}/1/${digest}.pdf`]),
  ]);
  sql(`
  begin;
  delete from cali_workspace.notifications where entity_id='${ids.report}';
  delete from cali_workspace.activity_log where entity_id in ('${ids.report}','${ids.mapa}');
  delete from cali_workspace.partner_material_reviews where entity_id in ('${ids.report}','${ids.proposal}');
  delete from cali_workspace.material_email_receipts where entity_id in ('${ids.report}','${ids.mapa}','${ids.proposal}');
  delete from cali_workspace.reports where id='${ids.report}';
  delete from public.cali_activity where submission_id='${ids.submission}' or proposal_id='${ids.proposal}';
  delete from public.cali_proposals where id='${ids.proposal}';
  delete from public.cali_submissions where id='${ids.submission}';
  delete from cali_session_guard.phase4_mapa_scope where record_id='${ids.mapa}';
  delete from public.mapa_respostas where id='${ids.mapa}';
  delete from auth.sessions where id='${session}' and user_id='${actor}';
  delete from auth.mfa_factors where id='${session}' and user_id='${actor}';
  commit;
  `);
  assert(cleanup.every((result) => !result.error), 'Arquivos do smoke precisam ser removidos do Storage local.');
}
console.log(JSON.stringify(checks));
