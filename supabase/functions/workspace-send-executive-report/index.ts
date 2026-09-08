import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")??"";
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const RESEND_API_KEY=Deno.env.get("RESEND_API_KEY")??"";
const FROM_EMAIL="Patrícia Lima · CALI RH <patricia@calirh.com>";
const REPLY_TO="patricia@calirh.com";
const APP_BASE="https://app.calirh.com";
const APP_URL=`${APP_BASE}/cliente/relatorios`;
const LOGO_URL=`${APP_BASE}/brand/cali-workspace-transparent.svg`;

const ALLOWED_ORIGINS=new Set(["https://app.calirh.com","http://localhost:4173","http://localhost:5173"]);
function cors(req:Request){const origin=req.headers.get("origin")??"";const allowed=ALLOWED_ORIGINS.has(origin)||/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);return{"Access-Control-Allow-Origin":allowed?origin:"https://app.calirh.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}
function json(req:Request,body:Record<string,unknown>,status=200){return Response.json(body,{status,headers:cors(req)});}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function uuid(v:unknown){const value=String(v??"").trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:"";}
function recipients(v:unknown){const source=Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[];const list=[...new Set(source.map(x=>String(x??"").trim().toLowerCase()).filter(Boolean))];if(list.length>8)throw new Error("Use no máximo 8 destinatários.");const invalid=list.find(x=>!/^([^\s@])+@([^\s@])+\.([^\s@])+$/.test(x));if(invalid)throw new Error(`E-mail inválido: ${invalid}`);return list;}
function monthLabel(start:string){const[year,month]=start.slice(0,10).split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1)));}
function dateOnly(value:unknown){const raw=String(value??"").slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:"";}
function inclusiveDays(from:string,to:string){if(!from||!to||to<from)return 0;const a=Date.parse(`${from}T12:00:00Z`),b=Date.parse(`${to}T12:00:00Z`);return Math.floor((b-a)/86400000)+1;}
function firstName(to:string[],profiles:any[]){
  const matches=(profiles||[]).filter((item:any)=>to.includes(String(item.email||"").trim().toLowerCase()));
  const profile=matches.find((item:any)=>item.is_primary)||matches.find((item:any)=>String(item.full_name||"").trim())||null;
  return String(profile?.full_name||"").trim().split(/\s+/)[0]||"";
}
function subject(name:string,period:string,protocol:string){return name?`CALI RH - Olá, ${name}, seu relatório de ${period} chegou · ${protocol}`:`CALI RH - Seu relatório de ${period} chegou · ${protocol}`;}
function html(company:string,period:string,message:string,reportId:string,recipientName:string,protocol:string){
  const url=`${APP_URL}?report=${encodeURIComponent(reportId)}`;
  const greeting=recipientName?`Olá, ${esc(recipientName)}.`:"Olá.";
  const personal=message?`<div style="margin:22px 0;padding:16px 18px;background:#FAF6F2;border-left:3px solid #B58C52;line-height:1.7;color:#51484A"><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#B58C52;font-weight:700;margin-bottom:7px">Uma observação minha</div>${esc(message).replaceAll("\n","<br>")}</div>`:"";
  return `<!doctype html><html lang="pt-BR"><body bgcolor="#F7F3EE" style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B"><div style="display:none;max-height:0;overflow:hidden;color:transparent">Seu fechamento CALI de ${esc(period)} está disponível no Workspace.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #EDE4DE;border-radius:14px;overflow:hidden"><tr><td bgcolor="#5A1E2D" style="padding:25px;text-align:center"><img src="${LOGO_URL}" width="154" alt="CALI Workspace" style="display:block;width:154px;max-width:70%;height:auto;margin:0 auto;border:0"></td></tr><tr><td style="padding:34px 32px"><p style="font-size:16px;margin:0 0 12px">${greeting}</p><div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#B58C52;font-weight:700;margin:0 0 10px">FECHAMENTO EXECUTIVO · ${esc(period)}</div><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.15;color:#5A1E2D;margin:0 0 18px;font-weight:normal">Seu fechamento CALI chegou.</h1><p style="font-size:15px;line-height:1.7;margin:0 0 15px">Concluí a leitura de ${esc(period)} da ${esc(company)} e organizei o fechamento com o que realmente importa acompanhar: entregas, uso da capacidade, pontos de atenção e próximos movimentos.</p>${personal}<p style="font-size:15px;line-height:1.7;margin:0 0 15px">O documento já está disponível no CALI Workspace. Lá você consulta a versão oficial, pode baixar o PDF para guardar e, se quiser, registrar sua ciência de leitura. Esse registro é opcional e não representa concordância ou aprovação do conteúdo.</p><p style="font-size:15px;line-height:1.7;margin:0 0 22px">Depois da primeira abertura, se surgir alguma dúvida sobre este fechamento, você pode registrá-la no próprio Workspace por até 3 dias úteis.</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td bgcolor="#5A1E2D" style="border-radius:999px"><a href="${url}" style="display:inline-block;padding:12px 22px;color:#fff;text-decoration:none;font-weight:bold;font-size:13px">Abrir relatório</a></td></tr></table><p style="font-size:15px;line-height:1.7;margin:0">Se algum ponto merecer conversa, me chama.</p><p style="font-size:12px;color:#7A6F72;margin:28px 0 0">Um abraço,<br><strong style="color:#5A1E2D;font-size:15px">Patrícia Lima</strong><br><span style="font-size:11px">People Advisory Executive · CALI RH</span></p></td></tr><tr><td bgcolor="#F7F3EE" style="padding:17px;text-align:center;font-size:10px;line-height:1.55;color:#8D8184">CALI Workspace · calirh.com · patricia@calirh.com<br>${esc(protocol)}</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Método não permitido."},405);
  try{
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!SUPABASE_SERVICE_ROLE_KEY||!RESEND_API_KEY)throw new Error("Configuração de envio incompleta.");
    const authorization=req.headers.get("Authorization");if(!authorization)return json(req,{ok:false,error:"Sessão ausente."},401);
    const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const{data:{user},error:authError}=await authClient.auth.getUser();if(authError||!user)return json(req,{ok:false,error:"Sessão inválida."},401);
    const adminClient=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const ws=adminClient.schema("cali_workspace");
    const{data:profile}=await ws.from("profiles").select("role,active").eq("id",user.id).maybeSingle();if(!profile||profile.role!=="admin"||profile.active===false)return json(req,{ok:false,error:"Usuário sem permissão para enviar relatórios."},403);

    const payload=await req.json();const reportId=uuid(payload?.report_id);if(!reportId)return json(req,{ok:false,error:"Relatório inválido."},400);
    const{data:report,error:reportError}=await ws.from("reports").select("id,company_id,title,report_type,period_start,period_end,status,protocol,version").eq("id",reportId).single();
    if(reportError||!report)return json(req,{ok:false,error:"Relatório não encontrado."},404);
    if(report.status!=="approved")return json(req,{ok:false,error:"Apenas relatórios aprovados podem ser enviados."},409);

    const[{data:company},{data:clientProfiles},{data:existingOfficial}]=await Promise.all([
      ws.from("companies").select("display_name,start_date").eq("id",report.company_id).maybeSingle(),
      ws.from("profiles").select("id,email,full_name,is_primary").eq("company_id",report.company_id).eq("role","client").eq("active",true),
      ws.from("reports").select("id,protocol,version,status").eq("company_id",report.company_id).eq("report_type",report.report_type).eq("period_start",report.period_start).eq("period_end",report.period_end).in("status",["sent","published"]).neq("id",report.id).limit(1).maybeSingle()
    ]);
    if(existingOfficial)return json(req,{ok:false,error:"Já existe um fechamento oficial enviado para esta competência. Retire a versão ainda não visualizada ou use o fluxo de correção quando já houver leitura."},409);

    if(String(report.report_type||"monthly")==="monthly"){
      const periodStart=dateOnly(report.period_start),periodEnd=dateOnly(report.period_end),companyStart=dateOnly(company?.start_date);const today=new Date().toISOString().slice(0,10);
      const collectionStart=companyStart&&companyStart>periodStart?companyStart:periodStart;const collectionEnd=today<periodEnd?today:periodEnd;const collected=inclusiveDays(collectionStart,collectionEnd);
      if(collected<20)return json(req,{ok:false,error:`Este fechamento ainda tem ${collected} de 20 dias mínimos de coleta. Continue usando a prévia interna até completar a base do período.`},409);
    }

    let to=recipients(payload?.recipients);if(!to.length)to=recipients((clientProfiles??[]).map((x:any)=>x.email));if(!to.length)return json(req,{ok:false,error:"Nenhum destinatário foi informado."},400);
    const message=String(payload?.message??"").trim().slice(0,2000);const period=monthLabel(String(report.period_start));const recipientName=firstName(to,clientProfiles??[]);
    const emailSubject=subject(recipientName,period,String(report.protocol||""));
    const emailRes=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`workspace-report-${report.id}-v${report.version}`},body:JSON.stringify({from:FROM_EMAIL,to,reply_to:REPLY_TO,subject:emailSubject,html:html(company?.display_name||"sua empresa",period,message,report.id,recipientName,String(report.protocol||""))})});
    const emailText=await emailRes.text();if(!emailRes.ok)throw new Error(`Falha no serviço de e-mail (${emailRes.status}): ${emailText}`);let email:any={};try{email=JSON.parse(emailText);}catch{}
    const now=new Date().toISOString();const{error:updateError}=await ws.from("reports").update({status:"sent",sent_at:now,sent_by:user.id,sent_to:to,published_at:now}).eq("id",report.id);if(updateError)throw updateError;
    await ws.from("activity_log").insert({company_id:report.company_id,event_type:"report_sent",entity_type:"report",entity_id:report.id,metadata:{version:report.version,to,email_id:email?.id??null,subject:emailSubject}});
    const notificationRows=(clientProfiles??[]).map((item:any)=>({company_id:report.company_id,user_id:item.id,notification_type:"report_available",title:"Novo relatório disponível",body:`O fechamento de ${period} está disponível no Workspace.`,entity_type:"report",entity_id:report.id,action_url:`/cliente/relatorios?report=${report.id}`,relevance:"high",email_required:false,emailed_at:now}));if(notificationRows.length)await ws.from("notifications").insert(notificationRows);
    return json(req,{ok:true,email_id:email?.id??null,to,subject:emailSubject,status:"sent",notifications:notificationRows.length});
  }catch(error){console.error("workspace-send-executive-report",error);const message=error instanceof Error?error.message:"Falha inesperada no envio.";return json(req,{ok:false,error:message},/inválid|destinat|Apenas relatórios|competência|dias mínimos/i.test(message)?400:500);}
});
