// O cancelamento no calendário não altera necessariamente o status da solicitação.
// Para este caminho, usar o evento efetivamente cancelado, nunca a solicitação ainda confirmada.
export async function cancelledCalendarExtraFields(
  ws: any,
  n: {entity_id:string;company_id:string;user_id:string},
): Promise<{fields:Record<string,string>;timely:boolean}> {
  const {data:event,error:eventError}=await ws.from("events")
    .select("id,title,company_id,source_type,source_entity_id,schedule_class,mode,visibility,starts_at,cancelled_at,cancellation_reason")
    .eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
  if(eventError) throw eventError;
  if(!event || !event.cancelled_at || event.source_type!=="scheduling_request" ||
     event.schedule_class!=="extra" || event.mode!=="in_person" ||
     event.visibility!=="client" || !event.source_entity_id || !event.cancellation_reason)
    throw Error("Evento não é uma visita extra cancelada elegível.");
  const [{data:attendee,error:aErr},{data:req,error:rErr}] = await Promise.all([
    ws.from("event_attendees").select("user_id").eq("event_id",event.id).eq("user_id",n.user_id).maybeSingle(),
    ws.from("scheduling_requests").select("id,extra_visit,company_id").eq("id",event.source_entity_id).eq("company_id",n.company_id).maybeSingle(),
  ]);
  if(aErr||rErr||!attendee||!req?.extra_visit)
    throw Error("Destinatário ou origem da visita extra não conferem.");
  const start=Date.parse(String(event.starts_at)),cancelled=Date.parse(String(event.cancelled_at));
  if(!Number.isFinite(start)||!Number.isFinite(cancelled))
    throw Error("Datas do cancelamento inválidas.");
  const date=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",
    weekday:"long",day:"2-digit",month:"long",year:"numeric",
    hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(start));
  return {fields:{assunto:String(event.title),data_anterior:date,
      motivo:String(event.cancellation_reason)},timely:start-cancelled>=48*60*60*1000};
}
export function applyCancellationTerms(rendered:string,timely:boolean):string {
  const start="<strong>Sobre as condições:</strong>";
  const stop="<strong>Esta mensagem não é uma cobrança.</strong>";
  const a=rendered.indexOf(start),b=rendered.indexOf(stop,a);
  if(a<0||b<0)throw Error("Bloco de condições aprovado não encontrado.");
  const note=timely
    ? "<strong>Sobre as condições:</strong> este cancelamento foi comunicado com pelo menos 48 horas de antecedência. <strong>Não há multa por falta de aviso no prazo.</strong>"
    : "<strong>Sobre as condições:</strong> o cancelamento ocorreu com menos de 48 horas de antecedência. Uma multa de <strong>20% (R$ 160,00)</strong> poderá ser avaliada se não houver justificativa aceita. A CALI comunicará a decisão separadamente. <strong>Esta mensagem não é uma cobrança.</strong>";
  return rendered.slice(0,a)+note+rendered.slice(b+stop.length);
}
