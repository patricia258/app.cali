import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")??"";
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const RESEND_API_KEY=Deno.env.get("RESEND_API_KEY")??"";
const FROM_EMAIL="Patrícia Lima · CALI RH <patricia@calirh.com>";
const REPLY_TO="patricia@calirh.com";
const APP_URL="https://app.calirh.com/cliente/relatorios";
const ALLOWED_ORIGINS=new Set(["https://app.calirh.com","http://localhost:4173","http://localhost:5173"]);

function cors(req:Request){const origin=req.headers.get("origin")??"";const allowed=ALLOWED_ORIGINS.has(origin)||/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);return{"Access-Control-Allow-Origin":allowed?origin:"https://app.calirh.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}
function json(req:Request,body:Record<string,unknown>,status=200){return Response.json(body,{status,headers:cors(req)});}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function uuid(v:unknown){const value=String(v??"").trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:"";}
function recipients(v:unknown){const source=Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[];const list=[...new Set(source.map(x=>String(x??"").trim().toLowerCase()).filter(Boolean))];if(list.length>8)throw new Error("Use no máximo 8 destinatários.");const invalid=list.find(x=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));if(invalid)throw new Error(`E-mail inválido: ${invalid}`);return list;}
function monthLabel(start:string){const [year,month]=start.slice(0,10).split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1)));}
function html(company:string,period:string,message:string){const personal=message?`<div style="margin:0 0 22px;padding:16px 18px;border-left:3px solid #B58C52;background:#FBF7F3;border-radius:0 10px 10px 0;font-size:14px;line-height:1.6;color:#2B2B2B">${esc(message).replaceAll("\n","<br>")}</div>`:"";return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B"><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:34px 14px"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;background:#fff;border:1px solid #E8DDD4;border-radius:16px;overflow:hidden"><tr><td style="background:#5A1E2D;padding:28px 34px;color:#fff"><div style="font-family:Georgia,serif;font-size:28px;letter-spacing:.08em">CALI</div><div style="font-size:9px;letter-spacing:.16em;opacity:.8">HR FOR BUSINESS</div></td></tr><tr><td style="padding:34px"><div style="font-size:10px;letter-spacing:.14em;color:#B58C52;font-weight:700;margin-bottom:9px">RELATÓRIO EXECUTIVO · ${esc(period)}</div><h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;font-weight:400;color:#5A1E2D;margin:0 0 18px">O fechamento da ${esc(company)} está disponível.</h1>${personal}<p style="font-size:15px;line-height:1.7;margin:0 0 16px">O relatório executivo do período foi revisado e aprovado pela CALI. Ele reúne a leitura do mês, execução, prazo, decisões, pontos de atenção e prioridades do próximo ciclo.</p><p style="font-size:15px;line-height:1.7;margin:0 0 25px">A versão aprovada está registrada no CALI Workspace e pode ser consultada ou salva em PDF a qualquer momento.</p><div style="text-align:center;margin:0 0 28px"><a href="${APP_URL}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 25px;border-radius:999px">Abrir relatório</a></div><div style="height:1px;background:#EAE1D8;margin-bottom:22px"></div><p style="font-size:14px;line-height:1.6;margin:0 0 2px">Um abraço,</p><p style="font-family:Georgia,serif;font-size:18px;color:#5A1E2D;margin:0 0 3px">Patrícia Lima</p><p style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#B7A99A;margin:0">People Advisory Executive · CALI RH</p></td></tr></table></td></tr></table></body></html>`;}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Método não permitido."},405);
  try{
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!SUPABASE_SERVICE_ROLE_KEY||!RESEND_API_KEY)throw new Error("Configuração de envio incompleta.");
    const authorization=req.headers.get("Authorization");if(!authorization)return json(req,{ok:false,error:"Sessão ausente."},401);
    const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await authClient.auth.getUser();if(authError||!user)return json(req,{ok:false,error:"Sessão inválida."},401);
    const adminClient=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const ws=adminClient.schema("cali_workspace");
    const {data:profile}=await ws.from("profiles").select("role,active").eq("id",user.id).maybeSingle();if(!profile||profile.role!=="admin"||profile.active===false)return json(req,{ok:false,error:"Usuário sem permissão para enviar relatórios."},403);
    const payload=await req.json();const reportId=uuid(payload?.report_id);if(!reportId)return json(req,{ok:false,error:"Relatório inválido."},400);
    const {data:report,error:reportError}=await ws.from("reports").select("id,company_id,title,period_start,status,protocol,version").eq("id",reportId).single();if(reportError||!report)return json(req,{ok:false,error:"Relatório não encontrado."},404);if(report.status!=="approved")return json(req,{ok:false,error:"Apenas relatórios aprovados podem ser enviados."},409);
    const {data:company}=await ws.from("companies").select("display_name").eq("id",report.company_id).maybeSingle();
    let to=recipients(payload?.recipients);if(!to.length){const {data:contacts}=await ws.from("profiles").select("email").eq("company_id",report.company_id).eq("role","client").eq("active",true);to=recipients((contacts??[]).map((x:any)=>x.email));}if(!to.length)return json(req,{ok:false,error:"Nenhum destinatário foi informado."},400);
    const message=String(payload?.message??"").trim().slice(0,2000);const period=monthLabel(String(report.period_start));
    const emailRes=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`workspace-report-${report.id}-v${report.version}`},body:JSON.stringify({from:FROM_EMAIL,to,reply_to:REPLY_TO,subject:`CALI RH · Relatório executivo disponível · ${period}`,html:html(company?.display_name||"cliente",period,message)})});const emailText=await emailRes.text();if(!emailRes.ok)throw new Error(`Falha no serviço de e-mail (${emailRes.status}): ${emailText}`);let email:any={};try{email=JSON.parse(emailText);}catch{}
    const now=new Date().toISOString();const {error:updateError}=await ws.from("reports").update({status:"sent",sent_at:now,sent_by:user.id,sent_to:to,published_at:now}).eq("id",report.id);if(updateError)throw updateError;
    await ws.from("activity_log").insert({company_id:report.company_id,event_type:"report_sent",entity_type:"report",entity_id:report.id,metadata:{version:report.version,to,email_id:email?.id??null}});
    return json(req,{ok:true,email_id:email?.id??null,to,status:"sent"});
  }catch(error){console.error("workspace-send-executive-report",error);const message=error instanceof Error?error.message:"Falha inesperada no envio.";return json(req,{ok:false,error:message},/inválid|destinat|Apenas relatórios/i.test(message)?400:500);}
});