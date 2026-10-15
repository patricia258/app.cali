export async function cancelledVisitFields(
  ws: any,
  n: {entity_id:string;company_id:string;user_id:string},
): Promise<Record<string,string>> {
  const {data:req,error}=await ws.from("scheduling_requests")
    .select("id,title,status,extra_visit,extra_visit_change_kind,extra_visit_change_reason,extra_visit_previous_slot,extra_visit_change_was_confirmed")
    .eq("id",n.entity_id).eq("company_id",n.company_id)
    .eq("requested_by",n.user_id).maybeSingle();
  if(error) throw error;
  if(!req || req.status!=="cancelled" || req.extra_visit!==true ||
     req.extra_visit_change_kind!=="cancel" ||
     req.extra_visit_change_was_confirmed!==true ||
     !req.title || !req.extra_visit_change_reason) {
    throw Error("Cancelamento de visita extra previamente confirmada não encontrado.");
  }
  const date = Date.parse(String(req.extra_visit_previous_slot?.startsAt||""));
  if(!Number.isFinite(date)) throw Error("Data da visita cancelada ausente.");
  const when=new Intl.DateTimeFormat("pt-BR",{
    timeZone:"America/Sao_Paulo", weekday:"long",day:"2-digit",
    month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,
  }).format(new Date(date));
  return {assunto:String(req.title),data_anterior:when,motivo:String(req.extra_visit_change_reason)};
}
