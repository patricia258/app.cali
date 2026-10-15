type AdminNotification={id:string;entity_id:string|null;entity_type:string|null;company_id:string;created_at:string;body:string|null};
const formatDate=(iso:string)=>{
  const v=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!v)throw new Error("Data de aprovação inválida.");
  return v[3]+"/"+v[2]+"/"+v[1];
};
export async function approvedAdminScheduleFields(
 ws:any, notification:AdminNotification,
 key:"project_schedule_approved"|"project_schedule_adjustment",
):Promise<Record<string,string>>{
 if(notification.entity_type!=="project"||!notification.entity_id)throw Error("Projeto do cronograma ausente.");
 const {data:project,error:projectError}=await ws.from("projects")
  .select("id,name,company_id,start_date,client_approved_at")
  .eq("id",notification.entity_id).eq("company_id",notification.company_id).maybeSingle();
 if(projectError)throw projectError;
 if(!project?.name)throw Error("Projeto da empresa não encontrado.");
 const body=String(notification.body||"");
 if(!body.startsWith(String(project.name)+" "))throw Error("O texto da notificação não corresponde ao projeto.");
 const fields:Record<string,string>={projeto:String(project.name)};
 if(key==="project_schedule_approved"){
  if(!project.client_approved_at)throw Error("Aprovação do cliente não registrada.");
  // Notificações antigas e atuais incluem a data do início NO MOMENTO da aprovação.
  // Não usar a data atual do projeto, que pode ter sido reprogramada depois.
  const match=body.match(/(?:início planejado permanece|prazo começou a contar em)\s+(\d{2}\/\d{2}\/\d{4})/);
  if(!match)throw Error("Data de início não identificada no aviso de aprovação.");
  const [dd,mm,yyyy]=match[1].split("/").map(Number);
  const date=new Date(Date.UTC(yyyy,mm-1,dd));
  if(date.getUTCDate()!==dd||date.getUTCMonth()!==mm-1||date.getUTCFullYear()!==yyyy)throw Error("Data inválida na notificação.");
  fields.data_inicio=match[1];
  return fields;
 }
 if(!body.includes(" recebeu um pedido de ajuste"))throw Error("Aviso não é um pedido de ajuste.");
 const at=Date.parse(String(notification.created_at));
 if(!Number.isFinite(at))throw Error("Data do aviso inválida.");
 const lower=new Date(at-5*60*1000).toISOString(),upper=new Date(at+2*60*1000).toISOString();
 const {data:reviews,error:reviewsError}=await ws.from("project_review_requests")
  .select("id,status,project_id,response_note,requested_changes,responded_at")
  .eq("project_id",notification.entity_id).eq("company_id",notification.company_id)
  .gte("responded_at",lower).lte("responded_at",upper)
  .order("responded_at",{ascending:false}).limit(5);
 if(reviewsError)throw reviewsError;
 const matches=(reviews||[]).filter((r:any)=>{
   if(r.status!=="adjustment_requested"||!r.response_note)return false;
   const label=String(r.requested_changes?.targetLabel||"");
   const action=String(r.requested_changes?.actionLabel||"");
   // Em versões legadas, a notificação informa a justificativa ao invés da ação.
   return (label&&action&&body.includes(" em "+label+": "+action)) ||
          (body.includes("pedido de ajuste do cliente: ")&&body.includes(String(r.response_note)));
 });
 if(matches.length!==1)throw Error("Pedido de ajuste não identificado de forma inequívoca.");
 const review=matches[0],changes=review.requested_changes||{};
 fields.ponto_do_ajuste=String(changes.targetLabel||project.name);
 fields.tipo_de_ajuste=String(changes.actionLabel||"Ajuste solicitado no cronograma");
 fields.justificativa=String(review.response_note);
 return fields;
}
