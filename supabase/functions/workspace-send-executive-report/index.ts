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
const MARK_URL=`${APP_BASE}/brand/cali-oak-mark-light.svg`;

const ALLOWED_ORIGINS=new Set(["https://app.calirh.com","http://localhost:4173","http://localhost:5173"]);
function cors(req:Request){
  const origin=req.headers.get("origin")??"";
  const allowed=ALLOWED_ORIGINS.has(origin)||/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  return{
    "Access-Control-Allow-Origin":allowed?origin:"https://app.calirh.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"
  };
}
function json(req:Request,body:Record<string,unknown>,status=200){return Response.json(body,{status,headers:cors(req)});}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function uuid(v:unknown){const value=String(v??"").trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:"";}
function recipients(v:unknown){
  const source=Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[];
  const list=[...new Set(source.map(x=>String(x??"").trim().toLowerCase()).filter(Boolean))];
  if(list.length>8)throw new Error("Use no máximo 8 destinatários.");
  const invalid=list.find(x=>!/^([^\s@])+@([^\s@])+\.([^\s@])+$/.test(x));
  if(invalid)throw new Error(`E-mail inválido: ${invalid}`);
  return list;
}
function monthLabel(start:string){
  const[year,month]=start.slice(0,10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1)));
}
function html(company:string,period:string,message:string,reportId:string){
  const url=`${APP_URL}?report=${encodeURIComponent(reportId)}`;
  const personal=message?`<div style="margin:20px 0 24px;padding:15px 17px;border-left:3px solid #B58C52;background:#FBF7F3;border-radius:0 10px 10px 0">
    <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#B58C52;font-weight:700;margin-bottom:7px">Uma observação minha</div>
    <div style="font-size:14px;line-height:1.65;color:#3C3531">${esc(message).replaceAll("\n","<br>")}</div>
  </div>`:"";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;border-bottom:1px solid #6A2838;background:#5A1E2D">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" valign="middle"><img src="${LOGO_URL}" alt="CALI Workspace" width="122" style="display:block;width:122px;max-width:122px;height:auto"></td>
          <td align="right" valign="middle"><img src="${MARK_URL}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">FECHAMENTO CALI · ${esc(period)}</div>
        <h1 style="font-size:27px;line-height:1.22;font-weight:750;letter-spacing:-.02em;color:#5A1E2D;margin:0 0 18px">Seu relatório de ${esc(period)} está pronto.</h1>
        <p style="font-size:15px;line-height:1.7;margin:0 0 15px">Olá,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 15px">Fechei a leitura de ${esc(period)} e deixei o relatório da ${esc(company)} disponível no Workspace.</p>
        ${personal}
        <p style="font-size:15px;line-height:1.7;margin:0 0 15px">Você pode abrir o documento quando quiser e baixar o PDF para guardar. Se fizer sentido para você, também dá para registrar sua ciência de leitura — esse registro é opcional.</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 25px">Se algum ponto merecer conversa, me chama.</p>
        <div style="text-align:center;margin:0 0 27px"><a href="${url}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px">Ver relatório</a></div>
        <div style="height:1px;background:#EAE1D8;margin-bottom:18px"></div>
        <p style="font-size:13px;margin:0 0 5px;color:#4B423D">Um abraço,</p>
        <p style="font-size:16px;font-weight:700;color:#5A1E2D;margin:0 0 3px">Patrícia Lima</p>
        <p style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#A99B91;margin:0">People Advisory Executive · CALI RH</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Método não permitido."},405);
  try{
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!SUPABASE_SERVICE_ROLE_KEY||!RESEND_API_KEY)throw new Error("Configuração de envio incompleta.");
    const authorization=req.headers.get("Authorization");
    if(!authorization)return json(req,{ok:false,error:"Sessão ausente."},401);
    const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const{data:{user},error:authError}=await authClient.auth.getUser();
    if(authError||!user)return json(req,{ok:false,error:"Sessão inválida."},401);

    const adminClient=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const ws=adminClient.schema("cali_workspace");
    const{data:profile}=await ws.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
    if(!profile||profile.role!=="admin"||profile.active===false)return json(req,{ok:false,error:"Usuário sem permissão para enviar relatórios."},403);

    const payload=await req.json();
    const reportId=uuid(payload?.report_id);
    if(!reportId)return json(req,{ok:false,error:"Relatório inválido."},400);
    const{data:report,error:reportError}=await ws.from("reports").select("id,company_id,title,period_start,status,protocol,version").eq("id",reportId).single();
    if(reportError||!report)return json(req,{ok:false,error:"Relatório não encontrado."},404);
    if(report.status!=="approved")return json(req,{ok:false,error:"Apenas relatórios aprovados podem ser enviados."},409);

    const[{data:company},{data:clientProfiles}]=await Promise.all([
      ws.from("companies").select("display_name").eq("id",report.company_id).maybeSingle(),
      ws.from("profiles").select("id,email").eq("company_id",report.company_id).eq("role","client").eq("active",true)
    ]);

    let to=recipients(payload?.recipients);
    if(!to.length)to=recipients((clientProfiles??[]).map((x:any)=>x.email));
    if(!to.length)return json(req,{ok:false,error:"Nenhum destinatário foi informado."},400);

    const message=String(payload?.message??"").trim().slice(0,2000);
    const period=monthLabel(String(report.period_start));
    const emailRes=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`workspace-report-${report.id}-v${report.version}`},
      body:JSON.stringify({
        from:FROM_EMAIL,to,reply_to:REPLY_TO,
        subject:`CALI RH · Seu relatório de ${period} está pronto`,
        html:html(company?.display_name||"sua empresa",period,message,report.id)
      })
    });
    const emailText=await emailRes.text();
    if(!emailRes.ok)throw new Error(`Falha no serviço de e-mail (${emailRes.status}): ${emailText}`);
    let email:any={};try{email=JSON.parse(emailText);}catch{}

    const now=new Date().toISOString();
    const{error:updateError}=await ws.from("reports").update({status:"sent",sent_at:now,sent_by:user.id,sent_to:to,published_at:now}).eq("id",report.id);
    if(updateError)throw updateError;
    await ws.from("activity_log").insert({company_id:report.company_id,event_type:"report_sent",entity_type:"report",entity_id:report.id,metadata:{version:report.version,to,email_id:email?.id??null}});
    const notificationRows=(clientProfiles??[]).map((item:any)=>({
      company_id:report.company_id,user_id:item.id,notification_type:"report_available",
      title:"Novo relatório disponível",body:`Seu relatório de ${period} está pronto para consulta.`,
      entity_type:"report",entity_id:report.id,action_url:`/cliente/relatorios?report=${report.id}`,
      relevance:"high",email_required:false,emailed_at:now
    }));
    if(notificationRows.length)await ws.from("notifications").insert(notificationRows);
    return json(req,{ok:true,email_id:email?.id??null,to,status:"sent",notifications:notificationRows.length});
  }catch(error){
    console.error("workspace-send-executive-report",error);
    const message=error instanceof Error?error.message:"Falha inesperada no envio.";
    return json(req,{ok:false,error:message},/inválid|destinat|Apenas relatórios/i.test(message)?400:500);
  }
});
