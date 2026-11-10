// Campos dos eventos administrativos de resposta à validação e horário confirmado.
// Em caso de desencontro temporal ou de fonte, o envio anterior é preservado.
type N={entity_type:string|null;entity_id:string|null;company_id:string;body:string|null;created_at:string;title:string|null};
const fmt=(x:string)=>{const d=new Date(x);if(!Number.isFinite(d.valueOf()))throw Error("Data inválida.");return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(d)};
export async function approvedAdminResponseFields(ws:any,n:N,key:"review_response"|"scheduling_confirmed"):Promise<Record<string,string>>{
 if(!n.entity_id)throw Error("Evento sem referência.");
 if(key==="review_response"){
  if(n.entity_type!=="project_review_request"||n.title!=="Cliente respondeu uma validação")throw Error("Aviso de validação divergente");
  const {data:r,error:e}=await ws.from("project_review_requests").select("project_id,review_type,status,responded_at,response_note").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
  if(e)throw e;if(!r?.project_id||!r.responded_at||!["approved","adjustment_requested"].includes(r.status))throw Error("Validação não confirmada");
  if(Math.abs(Date.parse(n.created_at)-Date.parse(r.responded_at))>10*60000)throw Error("Resposta histórica não corresponde.");
  const label=r.status==="approved"?"Aprovado":"Ajuste solicitado";
  if(String(n.body||"").trim()!=="Status: "+label)throw Error("Status histórico do aviso diferente.");
  const {data:p,error:pe}=await ws.from("projects").select("name").eq("id",r.project_id).eq("company_id",n.company_id).maybeSingle();if(pe)throw pe;
  if(!p?.name)throw Error("Projeto não encontrado.");
  return {projeto:String(p.name),tipo_validacao:r.review_type==="schedule"?"Cronograma":r.review_type==="deliverable"?"Entregável":"Validação do projeto",resposta:label,observacao:String(r.response_note||"").trim()||"Sem observação adicional registrada"};
 }
 if(n.entity_type!=="event"||n.title!=="Horário confirmado pelo cliente")throw Error("Tipo de agenda diferente");
 const {data:e,error:ee}=await ws.from("events").select("title,starts_at,mode,location,meeting_url,created_at,cancelled_at").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
 if(ee)throw ee;if(!e?.title||!e.starts_at||e.cancelled_at)throw Error("Horário final do evento não confirmado");
 const mode=String(e.mode||"").toLowerCase();const online=["online","remote","virtual","video"].includes(mode);
 const location=online?String(e.meeting_url||e.location||"").trim():String(e.location||"").trim();
 if(!location)throw Error("Local ou link ausente");
 return {assunto:String(e.title),data_horario:fmt(String(e.starts_at)),formato:online?"Online":"Presencial",local:location};
}
