import { caliWorkstreams } from '../domain/projects';
import { supabase } from './supabase';

type PlanningStatus='draft'|'client_review'|'adjustment_requested'|'approved'|'active'|'rebriefing'|'closed';
type ProjectRow={id:string;protocol:string|null;company_id:string;name:string;planning_status:PlanningStatus;start_date:string|null;roadmap_start_date:string|null;target_end_date:string|null;roadmap_end_date:string|null;client_response_business_days:number|null;client_approved_at:string|null;activated_at:string|null};
type FrontRow={id:string;protocol:string|null;project_id:string;name:string;objective:string|null;status:string;sort_order:number|null;roadmap_month_start:number|null;roadmap_month_end:number|null};
type DeliverableRow={id:string;protocol:string|null;project_id:string;workstream:string|null;workstream_id:string|null;title:string;due_at:string|null;status:string;sort_order:number|null};
type ReviewRow={id:string;project_id:string;status:string;request_number:number;response_due_at:string|null;response_note:string|null;requested_changes:any;resolution_note:string|null;requested_at:string};

type Context={project:ProjectRow;fronts:FrontRow[];deliverables:DeliverableRow[];reviews:ReviewRow[]};

let installed=false,timer=0,busy=false;
const FRONT_CATALOG=[...caliWorkstreams];

function normalize(value=''){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function formatDate(value?:string|null){if(!value)return'A definir';const d=new Date(value.length===10?`${value}T12:00:00`:value);return Number.isNaN(d.getTime())?'A definir':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.','');}
function formatDateTime(value?:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d).replace('.','');}
function escapeHtml(value=''){return value.replace(/[&<>'"]/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]||ch));}
function projectProtocolFromAdmin(){const text=document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent||'';return text.match(/CALI-PRJ-[A-Z0-9-]+/i)?.[0]||'';}
function currentClientProjectId(){const picker=document.querySelector<HTMLSelectElement>('.client-project-picker-v33 select');return picker?.value||'';}
function closeWorkflowModal(){document.querySelector('.workflow-dialog-backdrop-v38')?.remove();}
function showError(message:string){window.alert(message);}

function dialog(title:string,kicker:string,body:string,footer:string){
  closeWorkflowModal();
  const overlay=document.createElement('div');overlay.className='workflow-dialog-backdrop-v38';
  overlay.innerHTML=`<section class="workflow-dialog-v38" role="dialog" aria-modal="true"><button class="workflow-dialog-close-v38" type="button" aria-label="Fechar">×</button><span>${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2><div class="workflow-dialog-body-v38">${body}</div><footer>${footer}</footer></section>`;
  overlay.querySelector('.workflow-dialog-close-v38')?.addEventListener('click',closeWorkflowModal);
  overlay.addEventListener('click',(event)=>{if(event.target===overlay)closeWorkflowModal();});
  document.body.append(overlay);return overlay;
}

async function loadAdminContext():Promise<Context|null>{
  if(!supabase)return null;const protocol=projectProtocolFromAdmin();if(!protocol)return null;
  const p=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,start_date,roadmap_start_date,target_end_date,roadmap_end_date,client_response_business_days,client_approved_at,activated_at').eq('protocol',protocol).maybeSingle();
  if(p.error||!p.data)return null;const project=p.data as ProjectRow;
  const [f,d,r]=await Promise.all([
    supabase.from('project_workstreams').select('id,protocol,project_id,name,objective,status,sort_order,roadmap_month_start,roadmap_month_end').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('deliverables').select('id,protocol,project_id,workstream,workstream_id,title,due_at,status,sort_order').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('project_review_requests').select('id,project_id,status,request_number,response_due_at,response_note,requested_changes,resolution_note,requested_at').eq('project_id',project.id).order('requested_at',{ascending:false}),
  ]);
  return{project,fronts:(f.data||[])as FrontRow[],deliverables:(d.data||[])as DeliverableRow[],reviews:(r.data||[])as ReviewRow[]};
}

async function loadClientContext():Promise<Context|null>{
  if(!supabase)return null;
  const profile=await supabase.auth.getUser();const uid=profile.data.user?.id;if(!uid)return null;
  const pr=await supabase.from('profiles').select('company_id').eq('id',uid).maybeSingle();const companyId=pr.data?.company_id;if(!companyId)return null;
  const projects=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,start_date,roadmap_start_date,target_end_date,roadmap_end_date,client_response_business_days,client_approved_at,activated_at').eq('company_id',companyId).order('created_at',{ascending:false});
  if(projects.error||!projects.data?.length)return null;
  const selectedId=currentClientProjectId();
  const project=((selectedId&&projects.data.find((row:any)=>row.id===selectedId))||projects.data.find((row:any)=>['client_review','adjustment_requested'].includes(row.planning_status))||projects.data[0]) as ProjectRow;
  const [f,d,r]=await Promise.all([
    supabase.from('project_workstreams').select('id,protocol,project_id,name,objective,status,sort_order,roadmap_month_start,roadmap_month_end').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('deliverables').select('id,protocol,project_id,workstream,workstream_id,title,due_at,status,sort_order').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('project_review_requests').select('id,project_id,status,request_number,response_due_at,response_note,requested_changes,resolution_note,requested_at').eq('project_id',project.id).order('requested_at',{ascending:false}),
  ]);
  return{project,fronts:(f.data||[])as FrontRow[],deliverables:(d.data||[])as DeliverableRow[],reviews:(r.data||[])as ReviewRow[]};
}

function frontDeliverables(ctx:Context,front:FrontRow){return ctx.deliverables.filter((item)=>item.workstream_id===front.id||(!item.workstream_id&&normalize(item.workstream||'')===normalize(front.name)));}

function editFrontDialog(ctx:Context,front:FrontRow){
  const known=FRONT_CATALOG.find((item)=>item!=='Outro'&&normalize(item)===normalize(front.name));
  const options=['',...FRONT_CATALOG].map((item)=>`<option value="${escapeHtml(item)}" ${item===(known||'Outro')?'selected':''}>${escapeHtml(item||'Selecionar frente')}</option>`).join('');
  const overlay=dialog('Editar frente','RASCUNHO',`<label>Frente<select id="wf-front-select-v38">${options}</select></label><label id="wf-custom-front-label-v38" ${known?'hidden':''}>Nome da frente<input id="wf-custom-front-v38" value="${escapeHtml(known?'':front.name)}" /></label><label>Objetivo / contexto<textarea id="wf-front-objective-v38" rows="4">${escapeHtml(front.objective||'')}</textarea></label><p class="workflow-help-v38">A alteração atualiza também o vínculo nominal dos entregáveis desta frente.</p>`,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary" data-save>Salvar frente</button>`);
  const select=overlay.querySelector<HTMLSelectElement>('#wf-front-select-v38')!,customLabel=overlay.querySelector<HTMLElement>('#wf-custom-front-label-v38')!,custom=overlay.querySelector<HTMLInputElement>('#wf-custom-front-v38')!,objective=overlay.querySelector<HTMLTextAreaElement>('#wf-front-objective-v38')!;
  select.addEventListener('change',()=>{customLabel.hidden=select.value!=='Outro';if(select.value==='Outro')custom.focus();});
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeWorkflowModal);
  overlay.querySelector('[data-save]')?.addEventListener('click',async()=>{const name=select.value==='Outro'?custom.value.trim():select.value;if(name.length<2){showError('Informe o nome da frente.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-save]')!;button.disabled=true;const result=await supabase!.rpc('admin_update_project_workstream',{p_workstream_id:front.id,p_name:name,p_objective:objective.value.trim()||null});if(result.error){button.disabled=false;showError(result.error.message);return;}location.reload();});
}

function deleteFrontDialog(ctx:Context,front:FrontRow){
  const items=frontDeliverables(ctx,front);const targets=ctx.fronts.filter((item)=>item.id!==front.id);
  const transfer=items.length?`<div class="workflow-warning-v38"><strong>Esta frente tem ${items.length} ${items.length===1?'entregável':'entregáveis'}.</strong><p>Para excluí-la sem perder trabalho, escolha a frente que receberá todos eles.</p></div><label>Transferir entregáveis para<select id="wf-front-target-v38"><option value="">Selecionar frente de destino</option>${targets.map((item)=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}</select></label>`:`<div class="workflow-warning-v38 calm"><strong>Esta frente está vazia.</strong><p>Ela pode ser excluída agora porque ainda não possui entregáveis.</p></div>`;
  const overlay=dialog('Excluir frente','RASCUNHO',`<p>Você está excluindo <strong>${escapeHtml(front.name)}</strong>.</p>${transfer}`,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary danger-button" data-delete ${items.length&&!targets.length?'disabled':''}>${items.length?'Transferir e excluir':'Excluir frente'}</button>`);
  if(items.length&&!targets.length){const note=document.createElement('p');note.className='workflow-help-v38 danger';note.textContent='Crie outra frente antes de excluir esta, pois há entregáveis vinculados.';overlay.querySelector('.workflow-dialog-body-v38')?.append(note);}
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeWorkflowModal);
  overlay.querySelector('[data-delete]')?.addEventListener('click',async()=>{const target=overlay.querySelector<HTMLSelectElement>('#wf-front-target-v38')?.value||null;if(items.length&&!target){showError('Escolha a frente de destino dos entregáveis.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-delete]')!;button.disabled=true;const result=await supabase!.rpc('admin_delete_project_workstream',{p_workstream_id:front.id,p_move_to_workstream_id:target});if(result.error){button.disabled=false;showError(result.error.message);return;}location.reload();});
}

function addFrontAdminActions(ctx:Context){
  if(ctx.project.planning_status!=='draft')return;
  document.querySelectorAll<HTMLElement>('.front-section-v2').forEach((section)=>{
    const protocol=section.querySelector<HTMLElement>('.front-copy-v2 span')?.textContent?.trim()||'';const name=section.querySelector<HTMLElement>('.front-copy-v2 strong')?.textContent?.trim()||'';const front=ctx.fronts.find((item)=>item.protocol===protocol)||ctx.fronts.find((item)=>normalize(item.name)===normalize(name));if(!front)return;
    const header=section.querySelector<HTMLElement>('.front-header-v2');if(!header||header.querySelector('.front-admin-actions-v38'))return;
    const actions=document.createElement('div');actions.className='front-admin-actions-v38';actions.innerHTML='<button type="button" data-edit aria-label="Editar frente" title="Editar frente"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button type="button" data-delete aria-label="Excluir frente" title="Excluir frente"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>';
    actions.querySelector('[data-edit]')?.addEventListener('click',()=>editFrontDialog(ctx,front));actions.querySelector('[data-delete]')?.addEventListener('click',()=>deleteFrontDialog(ctx,front));
    const add=Array.from(header.querySelectorAll<HTMLButtonElement>('button')).find((button)=>/entregável/i.test(button.textContent||''));if(add)header.insertBefore(actions,add);else header.append(actions);
  });
}

function draftReadiness(ctx:Context){
  document.querySelector('.project-review-banner-v38')?.remove();
  const hero=document.querySelector<HTMLElement>('.project-hero-v2');if(!hero)return;
  const send=Array.from(hero.querySelectorAll<HTMLButtonElement>('button')).find((button)=>/enviar ao cliente/i.test(button.textContent||''));
  if(ctx.project.planning_status!=='draft'){if(send)send.disabled=false;return;}
  const empty=ctx.fronts.filter((front)=>frontDeliverables(ctx,front).length===0);const missing=ctx.deliverables.filter((item)=>!item.due_at);const ready=ctx.deliverables.length>0&&!empty.length&&!missing.length;
  if(send){send.disabled=!ready;send.title=ready?'Enviar cronograma para aprovação do cliente':`${empty.length?`${empty.length} frente(s) sem entregáveis. `:''}${missing.length?`${missing.length} entregável(is) sem deadline.`:''}`;}
  if(ready)return;
  const banner=document.createElement('section');banner.className='project-review-banner-v38 draft';banner.innerHTML=`<div><span>RASCUNHO</span><strong>Finalize o cronograma antes de enviar</strong><p>${ctx.deliverables.length===0?'Inclua pelo menos um entregável. ':''}${empty.length?`${empty.length} frente(s) ainda não têm entregáveis. `:''}${missing.length?`${missing.length} entregável(is) ainda não têm deadline.`:''}</p></div>`;hero.insertAdjacentElement('afterend',banner);
}

function resolveAdjustmentDialog(ctx:Context,review:ReviewRow,accept:boolean){
  const change=review.requested_changes||{};const target=change.targetLabel||'Cronograma';
  const overlay=dialog(accept?'Acolher pedido de ajuste':'Não aplicar pedido','ANÁLISE CALI',`<div class="workflow-request-v38"><span>Pedido ${review.request_number} de 2</span><strong>${escapeHtml(target)}</strong><p>${escapeHtml(review.response_note||'')}</p>${change.priority?`<em>${escapeHtml(change.priority)}</em>`:''}</div><label>Justificativa da decisão<textarea id="wf-resolution-note-v38" rows="5" placeholder="Explique ao cliente o que será feito e por quê."></textarea></label><p class="workflow-help-v38">Depois da sua decisão, o cronograma volta para validação do cliente. Se você acolher o pedido, ajuste as datas/frentes necessárias antes de ele aprovar.</p>`,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary" data-resolve>Enviar decisão</button>`);
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeWorkflowModal);overlay.querySelector('[data-resolve]')?.addEventListener('click',async()=>{const note=overlay.querySelector<HTMLTextAreaElement>('#wf-resolution-note-v38')!.value.trim();if(note.length<3){showError('Informe a justificativa da decisão.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-resolve]')!;button.disabled=true;const result=await supabase!.rpc('admin_resolve_project_schedule_adjustment',{p_review_id:review.id,p_accept:accept,p_justification:note});if(result.error){button.disabled=false;showError(result.error.message);return;}location.reload();});
}

function adminReviewBanner(ctx:Context){
  if(ctx.project.planning_status==='draft'){draftReadiness(ctx);return;}
  document.querySelector('.project-review-banner-v38')?.remove();const hero=document.querySelector<HTMLElement>('.project-hero-v2');if(!hero)return;
  if(!['client_review','adjustment_requested'].includes(ctx.project.planning_status))return;
  const current=ctx.reviews.find((review)=>review.status==='pending'||review.status==='adjustment_requested');const used=Math.min(2,Math.max(0,(current?.request_number||1)-(current?.status==='adjustment_requested'?0:1)));
  const banner=document.createElement('section');banner.className=`project-review-banner-v38 ${ctx.project.planning_status}`;
  if(ctx.project.planning_status==='client_review'){
    banner.innerHTML=`<div><span>AGUARDANDO CLIENTE</span><strong>Cronograma enviado para aprovação</strong><p>O projeto ainda não começou. O prazo passa a contar somente quando o cliente aprovar oficialmente.</p></div><div class="review-banner-meta-v38"><b>${used}/2</b><small>ajustes utilizados</small>${current?.response_due_at?`<em>Resposta prevista até ${formatDateTime(current.response_due_at)}</em>`:''}</div>`;
  }else if(current){const change=current.requested_changes||{};banner.innerHTML=`<div><span>AJUSTE SOLICITADO · ${current.request_number}/2</span><strong>${escapeHtml(change.targetLabel||'Cronograma')}</strong><p>${escapeHtml(current.response_note||'O cliente solicitou uma alteração no cronograma.')}</p>${change.priority?`<em>${escapeHtml(change.priority)}</em>`:''}</div><div class="review-banner-actions-v38"><button type="button" class="secondary" data-reject>Não aplicar</button><button type="button" class="primary" data-accept>Acolher solicitação</button></div>`;banner.querySelector('[data-reject]')?.addEventListener('click',()=>resolveAdjustmentDialog(ctx,current,false));banner.querySelector('[data-accept]')?.addEventListener('click',()=>resolveAdjustmentDialog(ctx,current,true));}
  hero.insertAdjacentElement('afterend',banner);
}

function clientAdjustmentDialog(ctx:Context,current:ReviewRow){
  const overlay=dialog('Solicitar ajuste no cronograma',`PEDIDO ${current.request_number} DE 2`,`<label>O que você quer ajustar?<select id="wf-adjust-type-v38"><option value="workstream">Prioridade de uma frente</option><option value="deliverable">Prazo ou ordem de um entregável</option><option value="project">Outro ponto do cronograma</option></select></label><label id="wf-target-label-v38">Frente<select id="wf-adjust-target-v38"></select></label><label id="wf-priority-label-v38">Como você quer priorizar?<select id="wf-adjust-priority-v38"><option value="Quero antecipar esta frente">Quero antecipar esta frente</option><option value="Quero que esta frente tenha prioridade sobre as próximas">Quero que esta frente tenha prioridade sobre as próximas</option><option value="Esta frente pode ficar para depois">Esta frente pode ficar para depois</option></select></label><label>Explique o ajuste<textarea id="wf-adjust-reason-v38" rows="5" placeholder="Ex.: precisamos priorizar Liderança antes de Comunicação Interna por causa do ciclo de metas."></textarea></label><p class="workflow-help-v38">A CALI recebe o pedido, analisa e responde com justificativa. O cronograma só vira projeto depois da sua aprovação final.</p>`,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary" data-submit>Enviar pedido</button>`);
  const type=overlay.querySelector<HTMLSelectElement>('#wf-adjust-type-v38')!,target=overlay.querySelector<HTMLSelectElement>('#wf-adjust-target-v38')!,targetLabel=overlay.querySelector<HTMLElement>('#wf-target-label-v38')!,priorityLabel=overlay.querySelector<HTMLElement>('#wf-priority-label-v38')!,priority=overlay.querySelector<HTMLSelectElement>('#wf-adjust-priority-v38')!;
  const sync=()=>{if(type.value==='project'){targetLabel.hidden=true;priorityLabel.hidden=true;target.replaceChildren();return;}targetLabel.hidden=false;priorityLabel.hidden=type.value!=='workstream';target.replaceChildren();const rows=type.value==='workstream'?ctx.fronts:ctx.deliverables;rows.forEach((row:any)=>{const o=document.createElement('option');o.value=row.id;o.textContent=type.value==='workstream'?row.name:row.title;target.append(o);});targetLabel.firstChild!.textContent=type.value==='workstream'?'Frente':'Entregável';};sync();type.addEventListener('change',sync);overlay.querySelector('[data-cancel]')?.addEventListener('click',closeWorkflowModal);
  overlay.querySelector('[data-submit]')?.addEventListener('click',async()=>{const reason=overlay.querySelector<HTMLTextAreaElement>('#wf-adjust-reason-v38')!.value.trim();if(reason.length<3){showError('Explique o ajuste que você precisa.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-submit]')!;button.disabled=true;const result=await supabase!.rpc('client_request_project_schedule_adjustment',{p_project_id:ctx.project.id,p_target_type:type.value,p_target_id:type.value==='project'?null:target.value||null,p_reason:reason,p_priority:type.value==='workstream'?priority.value:null});if(result.error){button.disabled=false;showError(result.error.message);return;}location.reload();});
}

function clientApprovalDialog(ctx:Context){
  const overlay=dialog('Aprovar cronograma','APROVAÇÃO FINAL',`<div class="workflow-approval-summary-v38"><strong>${escapeHtml(ctx.project.name)}</strong><p>Ao aprovar, este cronograma deixa de ser proposta e passa a ser um projeto ativo.</p><div><span>Início oficial</span><b>Data da aprovação</b></div><div><span>Previsão atual</span><b>${formatDate(ctx.project.roadmap_end_date)}</b></div></div><p class="workflow-help-v38">Se a aprovação ocorrer depois da data usada na montagem do cronograma, as deadlines serão reposicionadas em dias úteis para preservar os intervalos planejados.</p>`,`<button type="button" class="secondary" data-cancel>Voltar</button><button type="button" class="primary" data-approve>Aprovar e iniciar projeto</button>`);
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeWorkflowModal);overlay.querySelector('[data-approve]')?.addEventListener('click',async()=>{const button=overlay.querySelector<HTMLButtonElement>('[data-approve]')!;button.disabled=true;const result=await supabase!.rpc('client_approve_project_schedule',{p_project_id:ctx.project.id});if(result.error){button.disabled=false;showError(result.error.message);return;}location.reload();});
}

function clientReviewPanel(ctx:Context){
  document.querySelector('.client-project-review-v38')?.remove();const table=document.querySelector<HTMLElement>('.client-roadmap-table-v33');const heading=document.querySelector<HTMLElement>('.client-roadmap-heading-v33');if(!table||!heading)return;
  if(!['client_review','adjustment_requested'].includes(ctx.project.planning_status))return;
  const current=ctx.reviews.find((review)=>review.status==='pending'||review.status==='adjustment_requested');if(!current)return;
  const used=Math.min(2,Math.max(0,current.request_number-(current.status==='adjustment_requested'?0:1)));const panel=document.createElement('section');panel.className=`client-project-review-v38 ${ctx.project.planning_status}`;
  if(ctx.project.planning_status==='client_review'){
    const canAdjust=current.request_number<=2;panel.innerHTML=`<div class="client-review-copy-v38"><span>CRONOGRAMA PARA APROVAÇÃO</span><h2>Revise antes do projeto começar</h2><p>Confira frentes, sequência e deadlines abaixo. Este ainda não é um projeto ativo: o prazo começa somente depois da sua aprovação formal.</p></div><div class="client-review-metrics-v38"><div><span>Frentes</span><strong>${ctx.fronts.length}</strong></div><div><span>Entregáveis</span><strong>${ctx.deliverables.length}</strong></div><div><span>Conclusão prevista</span><strong>${formatDate(ctx.project.roadmap_end_date)}</strong></div><div><span>Ajustes</span><strong>${used}/2</strong></div></div><div class="client-review-actions-v38">${canAdjust?'<button type="button" class="secondary" data-adjust>Solicitar ajuste</button>':'<span>2/2 ajustes utilizados</span>'}<button type="button" class="primary" data-approve>Aprovar cronograma</button></div>`;if(canAdjust)panel.querySelector('[data-adjust]')?.addEventListener('click',()=>clientAdjustmentDialog(ctx,current));panel.querySelector('[data-approve]')?.addEventListener('click',()=>clientApprovalDialog(ctx));
  }else{const change=current.requested_changes||{};panel.innerHTML=`<div class="client-review-copy-v38"><span>AJUSTE EM ANÁLISE · ${current.request_number}/2</span><h2>A CALI está analisando sua solicitação</h2><p>Enquanto este pedido estiver em análise, o cronograma não pode ser aprovado e o projeto ainda não começou.</p></div><div class="client-review-request-v38"><span>${escapeHtml(change.targetLabel||'Cronograma')}</span><strong>${escapeHtml(current.response_note||'Pedido de ajuste enviado.')}</strong>${change.priority?`<em>${escapeHtml(change.priority)}</em>`:''}</div>`;}
  table.insertAdjacentElement('beforebegin',panel);
}

function clientEmptyState(){
  if(document.querySelector('.client-roadmap-table-v33')||document.querySelector('.client-project-empty-v38'))return;const heading=document.querySelector<HTMLElement>('.client-roadmap-heading-v33');if(!heading)return;const empty=document.createElement('section');empty.className='client-project-empty-v38';empty.innerHTML='<span>NENHUM CRONOGRAMA COMPARTILHADO</span><h2>Não há projeto aguardando sua validação agora.</h2><p>Rascunhos internos da CALI não aparecem nesta área. Quando um cronograma estiver pronto para sua revisão, ele será disponibilizado aqui e você receberá uma notificação.</p>';heading.insertAdjacentElement('afterend',empty);
}

async function scan(){
  if(busy||!supabase)return;const admin=location.pathname.startsWith('/admin/projetos'),client=location.pathname.startsWith('/cliente/entregaveis');if(!admin&&!client)return;busy=true;
  try{
    if(admin){const ctx=await loadAdminContext();if(ctx){addFrontAdminActions(ctx);draftReadiness(ctx);adminReviewBanner(ctx);}}
    if(client){const ctx=await loadClientContext();if(ctx)clientReviewPanel(ctx);else clientEmptyState();}
  }finally{busy=false;}
}
function schedule(){window.clearTimeout(timer);timer=window.setTimeout(()=>void scan(),120);}
export function installProjectApprovalWorkflowRuntimeV38(){if(installed||typeof window==='undefined')return;installed=true;schedule();const observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',schedule);window.addEventListener('popstate',schedule);}
