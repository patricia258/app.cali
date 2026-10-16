// Contexto verificado para avisos administrativos de rebriefing e reabertura.
// Nunca inventar a observação do cliente; eventos ambíguos preservam HTML anterior.
type N={entity_type:string|null;entity_id:string|null;company_id:string;created_at:string;body:string|null;title:string|null};
export async function approvedAdminPendingFields(ws:any,n:N,key:"deliverable_rebriefing"|"record_reopen_request"):Promise<Record<string,string>>{
 if(!n.entity_id)throw Error("Registro do aviso ausente.");
 const t=Date.parse(n.created_at);
 if(!Number.isFinite(t))throw Error("Data de evento inválida.");
 const lower=new Date(t-10*60000).toISOString(),upper=new Date(t+2*60000).toISOString();
 if(key==="deliverable_rebriefing"){
  if(n.entity_type!=="deliverable"||n.title!=="Cliente solicitou rebriefing")throw Error("Tipo não corresponde.");
  const {data:d,error:e}=await ws.from("deliverables").select("id,title,project_id,status,client_visible").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
  if(e)throw e;
  if(!d?.title||!d.project_id||!d.client_visible||d.status!=="rebriefing"||n.body!==d.title+" · o cliente indicou necessidade de rever contexto, escopo ou prazo.")throw Error("Rebriefing atual não corresponde ao aviso.");
  const {data:p,error:pe}=await ws.from("projects").select("name").eq("id",d.project_id).eq("company_id",n.company_id).maybeSingle();if(pe)throw pe;if(!p?.name)throw Error("Projeto não localizado.");
  const {data:rows,error:re}=await ws.from("deliverable_adjustments").select("reason,requested_by").eq("deliverable_id",d.id).eq("company_id",n.company_id).eq("request_kind","rebriefing").gte("created_at",lower).lte("created_at",upper).limit(3);
  if(re)throw re;
  if(rows?.length!==1||!rows[0].requested_by||!String(rows[0].reason||"").trim())throw Error("Observação específica de rebriefing não encontrada.");
  const {data:a,error:ae}=await ws.from("profiles").select("full_name,role").eq("id",rows[0].requested_by).maybeSingle();if(ae)throw ae;if(a?.role!=="client")throw Error("Solicitação não originada pelo cliente.");
  return {entregavel:String(d.title),projeto:String(p.name),quem_solicitou:String(a.full_name||"").trim()||"Cliente (nome não informado)",observacao:String(rows[0].reason).trim()};
 }
 if(n.entity_type!=="account_record"||n.title!=="Solicitação de reabertura")throw Error("Tipo de ocorrência inválido.");
 const {data:d,error:e}=await ws.from("account_records").select("id,title,protocol,visibility").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
 if(e)throw e;if(!d?.title||!d.protocol||d.visibility!=="client")throw Error("Ocorrência não localizada.");
 const {data:rows,error:re}=await ws.from("account_record_reopen_requests").select("reason,requested_by,requested_at").eq("record_id",d.id).eq("company_id",n.company_id).gte("requested_at",lower).lte("requested_at",upper).limit(3);
 if(re)throw re;
 if(rows?.length!==1||!rows[0].requested_by||!String(rows[0].reason||"").trim())throw Error("Solicitação de reabertura ambígua.");
 const reason=String(rows[0].reason).trim();
 if(n.body!=="O cliente pediu a reabertura de “"+d.title+"”. Motivo: “"+reason+"”.")throw Error("Texto não confere com o pedido.");
 const {data:a,error:ae}=await ws.from("profiles").select("full_name,role").eq("id",rows[0].requested_by).maybeSingle();
 if(ae)throw ae;if(a?.role!=="client")throw Error("Solicitante não é cliente.");
 return {titulo:String(d.title),protocolo:String(d.protocol),quem_solicitou:String(a.full_name||"").trim()||"Cliente (nome não informado)",justificativa:reason};
}
