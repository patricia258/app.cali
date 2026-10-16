// Contexto histórico dos avisos de decisão do cliente em entregáveis.
// Falha fechada: se não houver correspondência inequívoca, usa o e-mail anterior.
type Notif = { entity_id:string|null; entity_type:string|null; company_id:string; body:string|null; created_at:string; title:string|null };
export async function approvedAdminDeliverableFields(ws:any,n:Notif,key:"deliverable_approved"|"deliverable_adjustment"):Promise<Record<string,string>>{
 if(n.entity_type!=="deliverable" || !n.entity_id)throw Error("Entregável sem referência.");
 const {data:d,error:de}=await ws.from("deliverables").select("id,title,project_id,client_visible,status,client_response_at").eq("id",n.entity_id).eq("company_id",n.company_id).maybeSingle();
 if(de)throw de;
 if(!d?.title || !d.project_id || !d.client_visible)throw Error("Entregável não localizado ou privado.");
 const expected=String(d.title)+" · ";
 if(!String(n.body||"").startsWith(expected))throw Error("Texto não corresponde à entrega.");
 const {data:p,error:pe}=await ws.from("projects").select("name").eq("id",d.project_id).eq("company_id",n.company_id).maybeSingle();
 if(pe)throw pe;
 if(!p?.name)throw Error("Projeto não identificado.");
 const result:Record<string,string>={projeto:String(p.name),entregavel:String(d.title)};
 if(key==="deliverable_approved"){
   if(n.title!=="Cliente aprovou um entregável" || !String(n.body).includes("a aprovação do cliente foi registrada."))throw Error("Não é aviso de aprovação.");
   if(d.status!=="approved")throw Error("O status mudou depois do aviso; usar e-mail original.");
   // O evento de status não persiste o identificador do aprovador.
   result.quem_aprovou="Cliente (nome não registrado no aviso)";
   return result;
 }
 if(n.title!=="Cliente solicitou ajuste" || !String(n.body).includes("há um pedido de ajuste para acompanhamento da CALI."))throw Error("Não é um pedido de ajuste.");
 if(d.status!=="adjustment_requested")throw Error("Estado do entregável mudou.");
 const t=Date.parse(n.created_at);
 if(!Number.isFinite(t))throw Error("Data inválida.");
 const lower=new Date(t-10*60*1000).toISOString(),upper=new Date(t+2*60*1000).toISOString();
 const {data:rows,error:re}=await ws.from("deliverable_adjustments").select("id,request_kind,reason,requested_by,created_at")
 .eq("deliverable_id",d.id).eq("company_id",n.company_id).eq("request_kind","adjustment")
 .gte("created_at",lower).lte("created_at",upper).limit(5);
 if(re)throw re;
 if(!rows || rows.length!==1 || !String(rows[0].reason||"").trim() || !rows[0].requested_by)throw Error("Justificativa de ajuste ambígua ou ausente.");
 const {data:actor,error:ae}=await ws.from("profiles").select("full_name,role,active").eq("id",rows[0].requested_by).maybeSingle();
 if(ae)throw ae;
 if(actor?.role!=="client")throw Error("Solicitante não é cliente.");
 result.quem_solicitou=String(actor.full_name||"").trim()||"Cliente (nome não disponível)";
 result.justificativa=String(rows[0].reason).trim();
 return result;
}
