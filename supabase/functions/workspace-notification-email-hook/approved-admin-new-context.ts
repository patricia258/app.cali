type Notice={company_id:string;entity_type:string|null;entity_id:string|null;title:string|null;body:string|null;created_at:string};
const str=(x:unknown)=>String(x??"").trim();
const format=(value:string)=>{const d=new Date(value);if(!Number.isFinite(d.valueOf()))throw Error("Data de agenda inválida");return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(d)};
export async function adminNewFields(ws:any,n:Notice,key:"record_opened"|"scheduling_request"):Promise<Record<string,string>>{
 if(!n.entity_id)throw Error("Origem não encontrada");
 if(key==="record_opened"){
  if(n.entity_type!=="account_record"||n.title!=="Nova solicitação do cliente")throw Error("Evento incorreto");
  const {data:d,error:e}=await ws.from("account_records").select("title,protocol,record_type,summary,visibility").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();if(e)throw e;
  if(!d?.title||!d.protocol||d.visibility!=="client"||!str(d.summary)||!d.record_type)throw Error("Dados incompletos");
  if(!str(n.body).includes(str(d.title)))throw Error("Notificação sem correspondência");
  return {titulo:str(d.title),protocolo:str(d.protocol),tipo:str(d.record_type),resumo:str(d.summary)};
 }
 if(n.entity_type!=="scheduling_request"||n.title!=="Nova solicitação de visita presencial")throw Error("Evento incorreto");
 const {data:d,error:e}=await ws.from("scheduling_requests").select("title,purpose,location,requested_slots,request_mode,created_at").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();if(e)throw e;
 if(!d||d.request_mode!=="in_person"||!str(d.title)||!str(d.purpose)||!str(d.location))throw Error("Pedido incompleto");
 const slots=Array.isArray(d.requested_slots)?d.requested_slots:[];
 if(slots.length!==2||!slots.every((v:any)=>v&&typeof v.startsAt==="string"))throw Error("Duas opções de data não registradas");
 if(Math.abs(Date.parse(n.created_at)-Date.parse(d.created_at))>10*60000)throw Error("Aviso sem referência temporal segura");
 return {assunto:str(d.title),objetivo:str(d.purpose),primeira_data:format(slots[0].startsAt),segunda_data:format(slots[1].startsAt),local:str(d.location)};
}
