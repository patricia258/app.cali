type Notification = {
  id:string; entity_id:string|null; entity_type:string|null; company_id:string; user_id:string;
  title:string; body:string|null; created_at:string; action_url?:string|null;
};
type EmailKind = "record_status"|"record_reopen_decision"|"team_month_update"|"chat_mention";
const statusMap:Record<string,string> = {
  open:"Aberta", standby:"Em espera", in_progress:"Em andamento",
  waiting_client:"Aguardando cliente", completed:"Finalizada", cancelled:"Cancelada",
};
export async function approvedClientContext(
  ws:any,n:Notification,key:EmailKind,
):Promise<Record<string,string>>{
  if(key==="chat_mention"){
    if(!n.title?.endsWith(" mencionou você") || !n.body?.trim())throw Error("Menção sem remetente ou trecho.");
    const author=n.title.slice(0,-" mencionou você".length).trim();
    if(!author)throw Error("Autor ausente.");
    return {autor:author,trecho:String(n.body).trim().slice(0,420)};
  }
  if(key==="team_month_update"){
    const {data,error}=await ws.from("team_month_reminders")
      .select("reference_month").eq("notification_id",n.id)
      .eq("company_id",n.company_id).eq("user_id",n.user_id).maybeSingle();
    if(error)throw error;
    // O lembrete registra o mês original e impede usar o mês corrente por engano.
    let month=String(data?.reference_month||"").slice(0,7);
    if(!/^\d{4}-\d{2}$/.test(month)){
      const m=String(n.action_url||"").match(/[?&]mes=(\d{4}-\d{2})(?:&|$)/);
      if(!m)throw Error("Mês de revisão não identificado.");
      month=m[1];
    }
    const [year,mo]=month.split("-").map(Number);
    if(mo<1||mo>12)throw Error("Mês inválido.");
    const formatted=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})
      .format(new Date(Date.UTC(year,mo-1,1)));
    return {mes_referencia:formatted.charAt(0).toUpperCase()+formatted.slice(1)};
  }
  if(!n.entity_id||n.entity_type!=="account_record")throw Error("Ocorrência não identificada.");
  const {data:r,error:e}=await ws.from("account_records")
    .select("id,company_id,protocol,title,workflow_status")
    .eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
  if(e)throw e;
  if(!r?.id||!r.protocol||!r.title)throw Error("Registro da empresa não encontrado.");
  const fields:Record<string,string>={protocolo:String(r.protocol),titulo:String(r.title)};
  if(key==="record_status"){
    // O estado no e-mail deve ser o estado no momento da notificação, não o atual.
    const match=String(n.body||"").match(/^“(.+)” agora está como (.+)\.$/s);
    if(!match||match[1]!==String(r.title))throw Error("Não foi possível confirmar a mudança de situação.");
    fields.situacao=match[2].trim();
    return fields;
  }
  const {data:requests,error:reopenError}=await ws.from("account_record_reopen_requests")
    .select("status,decision_note,decided_at")
    .eq("record_id",r.id).eq("company_id",n.company_id)
    .not("decided_at","is",null).lte("decided_at",n.created_at)
    .order("decided_at",{ascending:false}).limit(1);
  if(reopenError)throw reopenError;
  const choice=requests?.[0];
  if(!choice)throw Error("Decisão de reabertura sem registro.");
  const decided=Date.parse(String(choice.decided_at)),sent=Date.parse(String(n.created_at));
  if(!Number.isFinite(decided)||!Number.isFinite(sent)||sent-decided>10*60*1000)
    throw Error("Decisão de reabertura não corresponde ao aviso.");
  if(!["approved","rejected"].includes(choice.status))throw Error("Decisão ainda pendente.");
  fields.resultado=choice.status==="approved"?"Reabertura aprovada":"Reabertura não aprovada";
  fields.motivo=String(choice.decision_note||"").trim() ||
    (choice.status==="approved"?"Reabertura autorizada pela CALI.":"Consulte o histórico para mais informações.");
  return fields;
}
