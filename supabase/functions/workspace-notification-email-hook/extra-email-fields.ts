type ExtraRequest = { id:string; title:string; status:string; extra_visit:boolean; online_extra_requested:boolean; request_mode:string; requested_slots:{startsAt:string}[]; admin_proposed_slots:{startsAt:string}[]; extra_visit_change_kind:string|null; extra_visit_change_was_confirmed:boolean; extra_visit_previous_slot:{startsAt:string}|null; extra_visit_change_reason:string|null };
const escapeHtml=(x:string)=>x.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const format=(slot:{startsAt:string}|null)=>{const t=Date.parse(String(slot?.startsAt||""));if(!Number.isFinite(t))throw Error("Invalid extra request slot");return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(t));};
export async function extraEmailFields(ws:any,n:{entity_id:string;user_id:string;company_id:string},key:"extra_new_dates"|"extra_reschedule_requested") {
 const {data,error}=await ws.from("scheduling_requests").select("id,title,status,extra_visit,online_extra_requested,request_mode,requested_slots,admin_proposed_slots,extra_visit_change_kind,extra_visit_change_was_confirmed,extra_visit_previous_slot,extra_visit_change_reason").eq("id",n.entity_id).eq("company_id",n.company_id).eq("requested_by",n.user_id).maybeSingle();
 if(error||!data?.title)throw Error("Extra request unavailable");
 const r=data as ExtraRequest;const fields:Record<string,string>={assunto:r.title};const blocks:{linha_segunda_opcao?:string}={};
 if(key==="extra_new_dates"){
  if(r.status!=="client_review"||!(r.extra_visit||r.online_extra_requested)||!Array.isArray(r.admin_proposed_slots)||r.admin_proposed_slots.length<1||r.admin_proposed_slots.length>2)throw Error("No valid extra date proposal");
  fields.data_opcao_1=format(r.admin_proposed_slots[0]);fields.modalidade=r.extra_visit?"Visita presencial extra":"Reunião online extra";
  blocks.linha_segunda_opcao=r.admin_proposed_slots.length===2?'<tr><td valign="top" width="35%" style="padding:9px 10px 9px 0;color:#8C807A;font:12px/19px Arial,Helvetica,sans-serif;">Segunda opção</td><td valign="top" style="padding:9px 0;color:#2B2B2B;font:600 14px/20px Arial,Helvetica,sans-serif;"><strong style="color:#5A1E2D;">'+escapeHtml(format(r.admin_proposed_slots[1]))+'</strong></td></tr>':"";
 }else{
  if(!r.extra_visit||r.status!=="reschedule_review"||r.extra_visit_change_kind!=="reschedule"||!r.extra_visit_change_was_confirmed||!Array.isArray(r.requested_slots)||r.requested_slots.length!==2||!r.extra_visit_change_reason)throw Error("No eligible reschedule");
  fields.data_anterior=format(r.extra_visit_previous_slot);fields.data_opcao_1=format(r.requested_slots[0]);fields.data_opcao_2=format(r.requested_slots[1]);fields.motivo=r.extra_visit_change_reason;
 }
 return {fields,blocks};
}
