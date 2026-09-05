import { supabase } from './supabase';

type ProjectRow={id:string;protocol:string|null;company_id:string;name:string;planning_status:string;start_date:string|null;roadmap_start_date:string|null;roadmap_end_date:string|null;client_response_business_days:number|null};
type FrontRow={id:string;name:string};
type DeliverableRow={id:string;title:string;complexity:string|null;due_at:string|null;status:string};
type ReviewRow={id:string;status:string;request_number:number;response_note:string|null;requested_changes:any;requested_at:string};
type Context={project:ProjectRow;fronts:FrontRow[];deliverables:DeliverableRow[];reviews:ReviewRow[]};

let installed=false,timer=0,busy=false;

function formatDate(value?:string|null){if(!value)return'A definir';const d=new Date(value.length===10?`${value}T12:00:00`:value);return Number.isNaN(d.getTime())?'A definir':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.','');}
function escapeHtml(value:unknown){return String(value??'').replace(/[&<>"']/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));}
function currentClientProjectId(){return document.querySelector<HTMLSelectElement>('.client-project-picker-v33 select')?.value||'';}
function adminProtocol(){const text=document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent||'';return text.match(/CALI-PRJ-[A-Z0-9-]+/i)?.[0]||'';}
function closeDialog(){document.querySelector('.workflow-dialog-backdrop-v39')?.remove();}
function alertError(message:string){window.alert(message);}

function dialog(title:string,kicker:string,body:string,footer:string){
  closeDialog();
  const overlay=document.createElement('div');overlay.className='workflow-dialog-backdrop-v38 workflow-dialog-backdrop-v39';
  overlay.innerHTML=`<section class="workflow-dialog-v38 workflow-dialog-v39" role="dialog" aria-modal="true"><button class="workflow-dialog-close-v38" type="button" aria-label="Fechar">×</button><span>${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2><div class="workflow-dialog-body-v38">${body}</div><footer>${footer}</footer></section>`;
  overlay.querySelector('.workflow-dialog-close-v38')?.addEventListener('click',closeDialog);
  overlay.addEventListener('click',(event)=>{if(event.target===overlay)closeDialog();});
  document.body.append(overlay);return overlay;
}

async function loadClientContext():Promise<Context|null>{
  if(!supabase)return null;
  const auth=await supabase.auth.getUser();const uid=auth.data.user?.id;if(!uid)return null;
  const profile=await supabase.from('profiles').select('company_id').eq('id',uid).maybeSingle();const companyId=profile.data?.company_id;if(!companyId)return null;
  const projects=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,start_date,roadmap_start_date,roadmap_end_date,client_response_business_days').eq('company_id',companyId).order('created_at',{ascending:false});
  if(projects.error||!projects.data?.length)return null;
  const selected=currentClientProjectId();
  const project=((selected&&projects.data.find((row:any)=>row.id===selected))||projects.data.find((row:any)=>['client_review','adjustment_requested'].includes(row.planning_status))||projects.data[0]) as ProjectRow;
  const [fronts,deliverables,reviews]=await Promise.all([
    supabase.from('project_workstreams').select('id,name').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('deliverables').select('id,title,complexity,due_at,status').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('project_review_requests').select('id,status,request_number,response_note,requested_changes,requested_at').eq('project_id',project.id).order('requested_at',{ascending:false}),
  ]);
  return{project,fronts:(fronts.data||[])as FrontRow[],deliverables:(deliverables.data||[])as DeliverableRow[],reviews:(reviews.data||[])as ReviewRow[]};
}

async function loadAdminContext():Promise<Context|null>{
  if(!supabase)return null;const protocol=adminProtocol();if(!protocol)return null;
  const p=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,start_date,roadmap_start_date,roadmap_end_date,client_response_business_days').eq('protocol',protocol).maybeSingle();if(p.error||!p.data)return null;const project=p.data as ProjectRow;
  const [fronts,deliverables,reviews]=await Promise.all([
    supabase.from('project_workstreams').select('id,name').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('deliverables').select('id,title,complexity,due_at,status').eq('project_id',project.id).neq('status','cancelled').order('sort_order'),
    supabase.from('project_review_requests').select('id,status,request_number,response_note,requested_changes,requested_at').eq('project_id',project.id).order('requested_at',{ascending:false}),
  ]);
  return{project,fronts:(fronts.data||[])as FrontRow[],deliverables:(deliverables.data||[])as DeliverableRow[],reviews:(reviews.data||[])as ReviewRow[]};
}

function selectedDeliverable(ctx:Context,id:string){return ctx.deliverables.find((item)=>item.id===id)||null;}
function changeSummary(change:any){
  const bits:string[]=[];
  if(change?.actionLabel)bits.push(change.actionLabel);
  if(change?.targetComplexity)bits.push(`Complexidade ${change.targetComplexity}`);
  if(change?.requestedDate)bits.push(`Data desejada: ${formatDate(change.requestedDate)}`);
  if(change?.swapTargetLabel)bits.push(`Troca com: ${change.swapTargetLabel}${change.swapTargetComplexity?` · ${change.swapTargetComplexity}`:''}`);
  if(change?.priority)bits.push(change.priority);
  return bits;
}

function openAdjustment(ctx:Context,review:ReviewRow){
  const overlay=dialog('Solicitar ajuste no cronograma',`PEDIDO ${review.request_number} DE 2`,`
    <label>O que você quer ajustar?
      <select id="wf39-type">
        <option value="workstream">Prioridade de uma frente</option>
        <option value="deliverable">Um entregável</option>
        <option value="project">Outro ponto do cronograma</option>
      </select>
    </label>
    <label id="wf39-target-label">Frente<select id="wf39-target"></select></label>
    <label id="wf39-front-priority">Como você quer reorganizar esta frente?
      <select id="wf39-priority">
        <option value="Quero antecipar esta frente">Quero antecipar esta frente</option>
        <option value="Quero que esta frente tenha prioridade sobre as próximas">Quero que esta frente tenha prioridade sobre as próximas</option>
        <option value="Esta frente pode ficar para depois">Esta frente pode ficar para depois</option>
      </select>
    </label>
    <label id="wf39-deliverable-action" hidden>O que você quer mudar neste entregável?
      <select id="wf39-action">
        <option value="reschedule">Alterar a data</option>
        <option value="swap_order">Trocar a ordem/prioridade com outro entregável</option>
        <option value="change_proposal">Solicitar uma proposta diferente para este entregável</option>
      </select>
    </label>
    <label id="wf39-date-row" hidden>Nova data desejada<input id="wf39-date" type="date"/></label>
    <label id="wf39-swap-row" hidden>Trocar a prioridade com<select id="wf39-swap"></select></label>
    <div id="wf39-complexity-note" class="workflow-complexity-note-v39" hidden></div>
    <label>Explique o ajuste<textarea id="wf39-reason" rows="5" placeholder="Explique o contexto e o que precisa mudar."></textarea></label>
    <p class="workflow-help-v38">A CALI recebe o pedido, analisa e responde com justificativa. A aprovação final confirma o cronograma, mas não altera a data de início nem desloca as deadlines automaticamente.</p>
  `,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary" data-submit>Enviar pedido</button>`);

  const type=overlay.querySelector<HTMLSelectElement>('#wf39-type')!,target=overlay.querySelector<HTMLSelectElement>('#wf39-target')!,targetLabel=overlay.querySelector<HTMLElement>('#wf39-target-label')!,frontPriority=overlay.querySelector<HTMLElement>('#wf39-front-priority')!,priority=overlay.querySelector<HTMLSelectElement>('#wf39-priority')!,actionRow=overlay.querySelector<HTMLElement>('#wf39-deliverable-action')!,action=overlay.querySelector<HTMLSelectElement>('#wf39-action')!,dateRow=overlay.querySelector<HTMLElement>('#wf39-date-row')!,dateInput=overlay.querySelector<HTMLInputElement>('#wf39-date')!,swapRow=overlay.querySelector<HTMLElement>('#wf39-swap-row')!,swap=overlay.querySelector<HTMLSelectElement>('#wf39-swap')!,note=overlay.querySelector<HTMLElement>('#wf39-complexity-note')!,reason=overlay.querySelector<HTMLTextAreaElement>('#wf39-reason')!;

  function fillTargets(){
    target.replaceChildren();
    const rows=type.value==='workstream'?ctx.fronts:ctx.deliverables;
    rows.forEach((row:any)=>{const option=document.createElement('option');option.value=row.id;option.textContent=type.value==='workstream'?row.name:`${row.title} · ${row.complexity||'sem MC'} · ${formatDate(row.due_at)}`;target.append(option);});
  }
  function fillSwap(){
    const chosen=selectedDeliverable(ctx,target.value);swap.replaceChildren();
    const blank=document.createElement('option');blank.value='';blank.textContent='Selecionar outro entregável';swap.append(blank);
    ctx.deliverables.filter((item)=>item.id!==target.value).forEach((item)=>{const option=document.createElement('option');option.value=item.id;option.textContent=`${item.title} · ${item.complexity||'sem MC'} · ${formatDate(item.due_at)}`;option.dataset.complexity=item.complexity||'';swap.append(option);});
    note.hidden=true;note.textContent=chosen?.complexity?`Este entregável é ${chosen.complexity}. Para trocar a ordem, escolha outro ${chosen.complexity}.`:'A troca de ordem exige entregáveis de complexidade equivalente.';
  }
  function validateSwap(showNeutral=true){
    if(type.value!=='deliverable'||action.value!=='swap_order'){note.hidden=true;return true;}
    const first=selectedDeliverable(ctx,target.value),second=selectedDeliverable(ctx,swap.value);
    if(!first){note.hidden=true;return false;}
    if(!second){note.hidden=!showNeutral;note.className='workflow-complexity-note-v39';note.textContent=`${first.title} é ${first.complexity||'sem MC'}. Selecione outro entregável da mesma complexidade.`;return false;}
    const same=(first.complexity||'')===(second.complexity||'');
    note.hidden=false;note.className=`workflow-complexity-note-v39 ${same?'ok':'invalid'}`;
    note.textContent=same?`Troca válida: os dois entregáveis são ${first.complexity}.`:`Só é possível trocar a prioridade entre entregáveis da mesma complexidade. “${first.title}” é ${first.complexity||'sem MC'} e “${second.title}” é ${second.complexity||'sem MC'}.`;
    return same;
  }
  function sync(){
    const project=type.value==='project',deliverable=type.value==='deliverable';
    targetLabel.hidden=project;frontPriority.hidden=type.value!=='workstream';actionRow.hidden=!deliverable;
    if(!project){fillTargets();const text=Array.from(targetLabel.childNodes).find((node)=>node.nodeType===Node.TEXT_NODE);if(text)text.textContent=deliverable?'Entregável':'Frente';}
    dateRow.hidden=!deliverable||action.value!=='reschedule';swapRow.hidden=!deliverable||action.value!=='swap_order';
    if(deliverable){fillSwap();validateSwap();}
    else note.hidden=true;
  }
  function syncAction(){dateRow.hidden=type.value!=='deliverable'||action.value!=='reschedule';swapRow.hidden=type.value!=='deliverable'||action.value!=='swap_order';if(action.value==='swap_order'){fillSwap();validateSwap();}else note.hidden=true;}

  fillTargets();sync();
  type.addEventListener('change',sync);action.addEventListener('change',syncAction);target.addEventListener('change',()=>{if(type.value==='deliverable'){fillSwap();validateSwap();}});swap.addEventListener('change',()=>validateSwap(false));
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeDialog);
  overlay.querySelector('[data-submit]')?.addEventListener('click',async()=>{
    if(reason.value.trim().length<3){alertError('Explique o ajuste que você precisa.');return;}
    if(type.value==='deliverable'&&action.value==='reschedule'&&!dateInput.value){alertError('Informe a nova data desejada para o entregável.');return;}
    if(type.value==='deliverable'&&action.value==='swap_order'&&!validateSwap(false)){alertError('A troca de prioridade só pode acontecer entre entregáveis da mesma complexidade (MC).');return;}
    const button=overlay.querySelector<HTMLButtonElement>('[data-submit]')!;button.disabled=true;
    const result=await supabase!.rpc('client_request_project_schedule_adjustment_v39',{
      p_project_id:ctx.project.id,
      p_target_type:type.value,
      p_target_id:type.value==='project'?null:target.value||null,
      p_reason:reason.value.trim(),
      p_priority:type.value==='workstream'?priority.value:null,
      p_action:type.value==='deliverable'?action.value:null,
      p_requested_date:type.value==='deliverable'&&action.value==='reschedule'?dateInput.value:null,
      p_swap_target_id:type.value==='deliverable'&&action.value==='swap_order'?swap.value||null:null,
    });
    if(result.error){button.disabled=false;alertError(result.error.message);return;}location.reload();
  });
}

function openApproval(ctx:Context){
  const start=ctx.project.start_date||ctx.project.roadmap_start_date;
  const overlay=dialog('Aprovar cronograma','APROVAÇÃO FINAL',`<div class="workflow-approval-summary-v38"><strong>${escapeHtml(ctx.project.name)}</strong><p>Ao aprovar, você confirma este cronograma para execução. A aprovação não muda as datas planejadas.</p><div><span>Início planejado</span><b>${escapeHtml(formatDate(start))}</b></div><div><span>Previsão atual</span><b>${escapeHtml(formatDate(ctx.project.roadmap_end_date))}</b></div></div><p class="workflow-help-v38">A data de aprovação fica registrada como evidência da sua validação. Ela não substitui a data de início e não reposiciona deadlines.</p>`,`<button type="button" class="secondary" data-cancel>Voltar</button><button type="button" class="primary" data-approve>Aprovar cronograma</button>`);
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeDialog);
  overlay.querySelector('[data-approve]')?.addEventListener('click',async()=>{const button=overlay.querySelector<HTMLButtonElement>('[data-approve]')!;button.disabled=true;const result=await supabase!.rpc('client_approve_project_schedule',{p_project_id:ctx.project.id});if(result.error){button.disabled=false;alertError(result.error.message);return;}location.reload();});
}

function openAdminResolution(ctx:Context,review:ReviewRow,accept:boolean){
  const change=review.requested_changes||{},summary=changeSummary(change);
  const overlay=dialog(accept?'Acolher pedido de ajuste':'Não aplicar pedido','ANÁLISE CALI',`<div class="workflow-request-v38"><span>Pedido ${review.request_number} de 2</span><strong>${escapeHtml(change.targetLabel||'Cronograma')}</strong>${summary.map((item)=>`<em>${escapeHtml(item)}</em>`).join('')}<p>${escapeHtml(review.response_note||'')}</p></div><label>Justificativa da decisão<textarea id="wf39-resolution" rows="5" placeholder="Explique ao cliente o que será feito e por quê."></textarea></label><p class="workflow-help-v38">Depois da decisão, o cronograma volta para validação do cliente. Se o pedido for acolhido, faça a alteração correspondente antes da aprovação final.</p>`,`<button type="button" class="secondary" data-cancel>Cancelar</button><button type="button" class="primary" data-resolve>Enviar decisão</button>`);
  overlay.querySelector('[data-cancel]')?.addEventListener('click',closeDialog);
  overlay.querySelector('[data-resolve]')?.addEventListener('click',async()=>{const text=overlay.querySelector<HTMLTextAreaElement>('#wf39-resolution')!.value.trim();if(text.length<3){alertError('Informe a justificativa da decisão.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-resolve]')!;button.disabled=true;const result=await supabase!.rpc('admin_resolve_project_schedule_adjustment',{p_review_id:review.id,p_accept:accept,p_justification:text});if(result.error){button.disabled=false;alertError(result.error.message);return;}location.reload();});
}

function patchClient(ctx:Context){
  const panel=document.querySelector<HTMLElement>('.client-project-review-v38');if(!panel)return;
  if(ctx.project.planning_status==='client_review'){
    const start=ctx.project.start_date||ctx.project.roadmap_start_date;
    const copy=panel.querySelector<HTMLElement>('.client-review-copy-v38');
    if(copy){const h=copy.querySelector('h2');const p=copy.querySelector('p');if(h)h.textContent='Revise e confirme o cronograma';if(p)p.textContent=`Confira frentes, entregáveis e deadlines. A aprovação confirma o plano e não altera as datas. Início planejado: ${formatDate(start)}.`;}
    const adjust=panel.querySelector<HTMLButtonElement>('[data-adjust]');if(adjust&&!adjust.dataset.v39){const clone=adjust.cloneNode(true) as HTMLButtonElement;clone.dataset.v39='1';clone.addEventListener('click',()=>{const review=ctx.reviews.find((item)=>item.status==='pending');if(review)openAdjustment(ctx,review);});adjust.replaceWith(clone);}
    const approve=panel.querySelector<HTMLButtonElement>('[data-approve]');if(approve&&!approve.dataset.v39){const clone=approve.cloneNode(true) as HTMLButtonElement;clone.dataset.v39='1';clone.textContent='Aprovar cronograma';clone.addEventListener('click',()=>openApproval(ctx));approve.replaceWith(clone);}
  }
  if(ctx.project.planning_status==='adjustment_requested'){
    const review=ctx.reviews.find((item)=>item.status==='adjustment_requested');if(!review)return;const change=review.requested_changes||{},request=panel.querySelector<HTMLElement>('.client-review-request-v38');if(request&&!request.dataset.v39){request.dataset.v39='1';request.replaceChildren();const top=document.createElement('span');top.textContent=change.actionLabel||change.targetLabel||'Ajuste solicitado';const strong=document.createElement('strong');strong.textContent=change.targetLabel||'Cronograma';request.append(top,strong);changeSummary(change).forEach((item)=>{const em=document.createElement('em');em.textContent=item;request.append(em);});const p=document.createElement('p');p.textContent=review.response_note||'Pedido de ajuste enviado.';request.append(p);}
  }
}

function patchAdmin(ctx:Context){
  const hero=document.querySelector<HTMLElement>('.project-hero-v2');if(!hero)return;
  if(ctx.project.planning_status==='draft'){
    const send=Array.from(hero.querySelectorAll<HTMLButtonElement>('button')).find((button)=>/enviar ao cliente/i.test(button.textContent||''));const start=ctx.project.start_date||ctx.project.roadmap_start_date;
    if(send&&!start){send.disabled=true;send.title='Defina a data planejada de início antes de enviar ao cliente.';const banner=document.querySelector<HTMLElement>('.project-review-banner-v38.draft p');if(banner&&!/data planejada de início/i.test(banner.textContent||''))banner.textContent=`${banner.textContent||''} Defina também a data planejada de início.`;}
  }
  const banner=document.querySelector<HTMLElement>('.project-review-banner-v38');if(!banner)return;
  if(ctx.project.planning_status==='client_review'){
    const p=banner.querySelector('p');if(p)p.textContent=`Cronograma enviado para aprovação. A aprovação não altera datas nem inicia a contagem no dia da resposta. Início planejado: ${formatDate(ctx.project.start_date||ctx.project.roadmap_start_date)}.`;
  }
  if(ctx.project.planning_status==='adjustment_requested'){
    const review=ctx.reviews.find((item)=>item.status==='adjustment_requested');if(!review)return;const change=review.requested_changes||{},box=banner.querySelector<HTMLElement>('div:first-child');if(box){box.querySelectorAll('.workflow-request-detail-v39').forEach((node)=>node.remove());changeSummary(change).forEach((item)=>{const em=document.createElement('em');em.className='workflow-request-detail-v39';em.textContent=item;box.append(em);});}
    const reject=banner.querySelector<HTMLButtonElement>('[data-reject]');if(reject&&!reject.dataset.v39){const clone=reject.cloneNode(true) as HTMLButtonElement;clone.dataset.v39='1';clone.addEventListener('click',()=>openAdminResolution(ctx,review,false));reject.replaceWith(clone);}
    const accept=banner.querySelector<HTMLButtonElement>('[data-accept]');if(accept&&!accept.dataset.v39){const clone=accept.cloneNode(true) as HTMLButtonElement;clone.dataset.v39='1';clone.addEventListener('click',()=>openAdminResolution(ctx,review,true));accept.replaceWith(clone);}
  }
}

async function scan(){if(busy||!supabase)return;const client=location.pathname.startsWith('/cliente/entregaveis'),admin=location.pathname.startsWith('/admin/projetos');if(!client&&!admin)return;busy=true;try{if(client){const ctx=await loadClientContext();if(ctx)patchClient(ctx);}if(admin){const ctx=await loadAdminContext();if(ctx)patchAdmin(ctx);}}finally{busy=false;}}
function schedule(){window.clearTimeout(timer);timer=window.setTimeout(()=>void scan(),180);}
export function installProjectApprovalRulesRuntimeV39(){if(installed||typeof window==='undefined')return;installed=true;schedule();const observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',schedule);window.addEventListener('popstate',schedule);}
