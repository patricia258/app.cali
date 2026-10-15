type DeclinedExtraNotification = {entity_id:string;company_id:string;user_id:string;title:string;body:string|null};
type ExtraMode = "extra_presential_declined" | "extra_online_declined";
const esc = (text:string) => text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const dateStr = (slot: {startsAt?: string}) => {
  const milliseconds=Date.parse(String(slot?.startsAt||""));
  if (!Number.isFinite(milliseconds)) throw Error("Horário do pedido extra não identificado.");
  return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",
    month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(milliseconds));
};
export async function declinedExtraFields(
  ws:any,
  n:DeclinedExtraNotification,
  template:ExtraMode,
):Promise<{fields:Record<string,string>;blocks:{bloco_motivo:string}}> {
  const {data:r,error}=await ws.from("scheduling_requests").select(
    "id,company_id,requested_by,title,status,request_mode,extra_visit,online_extra_requested,requested_slots,admin_note,online_extra_quote_cents,online_extra_quote_accepted_at"
  ).eq("id",n.entity_id).eq("company_id",n.company_id).eq("requested_by",n.user_id).maybeSingle();
  if (error) throw error;
  if(!r || r.status!=="declined" || !r.title || !Array.isArray(r.requested_slots) ||
     r.requested_slots.length!==2) throw Error("Pedido extra não está recusado ou possui dados incompletos.");
  const isVisit=template==="extra_presential_declined";
  if(isVisit && (!r.extra_visit||r.request_mode!=="in_person"||r.online_extra_requested))throw Error("Modalidade presencial não corresponde.");
  if(!isVisit && (!r.online_extra_requested||r.request_mode!=="remote"||r.extra_visit||!r.online_extra_quote_accepted_at))throw Error("Modalidade online não corresponde.");
  const note=String(r.admin_note||"").trim();
  // Confere o motivo com a notificação original; evita associar uma decisão posterior.
  if(note && !String(n.body||"").includes(note.slice(0,350))) {
    const generic=String(n.title)==="Solicitação de agenda respondida" && String(n.body||"").trim()===note;
    if(!generic)throw Error("O motivo não corresponde ao aviso original.");
  }
  const fields:Record<string,string>={assunto:String(r.title)};
  if(isVisit){
    fields.data_opcao_1=dateStr(r.requested_slots[0]);
    fields.data_opcao_2=dateStr(r.requested_slots[1]);
  }else{
    const start=Date.parse(String(r.requested_slots[0]?.startsAt||""));
    const end=Date.parse(String(r.requested_slots[0]?.endsAt||""));
    const duration=Math.round((end-start)/60000);
    const cents=duration===60?20000:duration===90?30000:0;
    if(!cents||r.online_extra_quote_cents!==cents)throw Error("Valor do pedido online diverge da duração aceita.");
    fields.duracao=duration===60?"1 hora":"1h30";
    fields.valor=cents===20000?"R$ 200,00":"R$ 300,00";
  }
  const blocks={bloco_motivo:note
    ? '<tr><td valign="top" width="34%" style="padding:10px 9px 10px 0;color:#8C807A;font:12px/19px Arial,Helvetica,sans-serif;">Motivo informado</td><td valign="top" style="padding:10px 0;color:#2B2B2B;font:600 14px/21px Arial,Helvetica,sans-serif;">'+esc(note)+'</td></tr>'
    : ""};
  return {fields,blocks};
}
