import { supabase } from './supabase';

type ScopeType = 'project' | 'front' | 'deliverable';
type Action = 'pause' | 'suspend' | 'cancel' | 'resume';
type ProjectRow = { id:string; protocol:string|null; name:string; planning_status:string; execution_status:string; start_date:string|null; roadmap_end_date:string|null };
type FrontRow = { id:string; name:string; status:string; execution_status:string };
type DeliverableRow = { id:string; title:string; workstream:string|null; workstream_id:string|null; status:string; execution_status:string };
type LifecycleEvent = { id:string; scope_type:ScopeType; scope_id:string|null; scope_label:string; action:Action; reason:string; resume_date:string|null; created_at:string; resolved_at:string|null };
type Context = { project:ProjectRow; fronts:FrontRow[]; deliverables:DeliverableRow[]; events:LifecycleEvent[] };

const REASONS: Record<'pause'|'suspend'|'cancel', string[]> = {
  pause: [
    'Solicitação temporária do cliente',
    'Aguardando resposta ou materiais do cliente',
    'Aguardando decisão de prioridade ou escopo',
    'Indisponibilidade temporária do decisor ou da equipe do cliente',
    'Dependência externa temporária',
    'Indisponibilidade operacional temporária da CALI',
    'Outro motivo',
  ],
  suspend: [
    'Atraso ou inadimplência de pagamento',
    'Ausência prolongada de resposta ou insumos do cliente',
    'Pendência contratual ou documental',
    'Escopo ou prioridade aguardando decisão formal',
    'Dependência externa impeditiva',
    'Solicitação formal do cliente',
    'Impedimento operacional ou força maior',
    'Outro motivo',
  ],
  cancel: [
    'Encerramento solicitado pelo cliente',
    'Encerramento contratual',
    'Descontinuidade do escopo',
    'Mudança de estratégia ou prioridade',
    'Impossibilidade de continuidade',
    'Outro motivo',
  ],
};

let installed = false;
let observerTimer = 0;
let dialogOpen = false;

function escapeHtml(value='') { return value.replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char)); }
function formatDate(value?:string|null){if(!value)return'A definir';const d=new Date(value.length===10?`${value}T12:00:00`:value);return Number.isNaN(d.getTime())?'A definir':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.','');}
function formatDateTime(value?:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d).replace('.','');}
function protocolFromHero(){const text=document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent||'';return text.match(/CALI-PRJ-[A-Z0-9-]+/i)?.[0]||'';}
function closeDialog(){document.querySelector('.project-lifecycle-backdrop-v45')?.remove();document.body.classList.remove('workspace-modal-open');dialogOpen=false;}
function showError(message:string){window.alert(message);}
function activeHolds(ctx:Context){return ctx.events.filter((event)=>!event.resolved_at&&['pause','suspend'].includes(event.action));}
function stateLabel(event:LifecycleEvent){return event.action==='pause'?'Pausado':'Suspenso';}

async function loadAdminContext():Promise<Context|null>{
  if(!supabase)return null;const protocol=protocolFromHero();if(!protocol)return null;
  const p=await supabase.from('projects').select('id,protocol,name,planning_status,execution_status,start_date,roadmap_end_date').eq('protocol',protocol).maybeSingle();
  if(p.error||!p.data)return null;
  const [fronts,deliverables,events]=await Promise.all([
    supabase.from('project_workstreams').select('id,name,status,execution_status').eq('project_id',p.data.id).order('sort_order'),
    supabase.from('deliverables').select('id,title,workstream,workstream_id,status,execution_status').eq('project_id',p.data.id).order('sort_order'),
    supabase.from('project_lifecycle_events').select('id,scope_type,scope_id,scope_label,action,reason,resume_date,created_at,resolved_at').eq('project_id',p.data.id).order('created_at',{ascending:false}).limit(50),
  ]);
  return { project:p.data as ProjectRow, fronts:(fronts.data||[]) as FrontRow[], deliverables:(deliverables.data||[]) as DeliverableRow[], events:(events.data||[]) as LifecycleEvent[] };
}

async function runAction(ctx:Context, action:Action, scopeType:ScopeType, scopeId:string|null, reason:string, resumeDate:string|null){
  if(!supabase)return;
  const result=await supabase.rpc('admin_set_project_lifecycle_v44',{p_project_id:ctx.project.id,p_action:action,p_scope_type:scopeType,p_scope_id:scopeId,p_reason:reason,p_resume_date:resumeDate||null});
  if(result.error)throw result.error;
}

function reasonOptions(action:'pause'|'suspend'|'cancel'){
  return ['<option value="">Selecione o motivo principal</option>',...REASONS[action].map((reason)=>`<option value="${escapeHtml(reason)}">${escapeHtml(reason)}</option>`)].join('');
}

function openResumeDialog(ctx:Context,event:LifecycleEvent){
  closeDialog();dialogOpen=true;document.body.classList.add('workspace-modal-open');
  const overlay=document.createElement('div');overlay.className='project-lifecycle-backdrop-v44 project-lifecycle-backdrop-v45';
  overlay.innerHTML=`<section class="project-lifecycle-dialog-v44" role="dialog" aria-modal="true"><header><div><span>RETOMADA E RECÁLCULO</span><h2>Retomar ${event.scope_type==='project'?'projeto':event.scope_type==='front'?'frente':'entregável'}</h2></div><button type="button" class="project-lifecycle-close-v44" data-close>×</button></header><div class="project-lifecycle-body-v44"><div class="project-lifecycle-note-v44"><strong>${escapeHtml(event.scope_label)}</strong><br>${escapeHtml(event.reason)}<br><small>${event.resume_date?`Retomada prevista: ${formatDate(event.resume_date)} · `:''}interrompido desde ${formatDateTime(event.created_at)}</small></div><div class="project-lifecycle-note-v44"><strong>O que acontece agora?</strong><br>Ao retomar, o Workspace contabiliza o período efetivamente interrompido em dias úteis, desloca os prazos ainda afetados por este escopo e recalcula a <strong>Previsão CALI</strong>. A Meta desejada continua como referência.</div><label class="project-lifecycle-field-v44"><span>Mensagem de retomada ao cliente</span><textarea id="lifecycle-v45-resume-message" placeholder="Ex.: A pendência foi regularizada e retomaremos a execução a partir de hoje."></textarea></label></div><footer><button type="button" data-close>Voltar</button><button type="button" class="primary" data-resume>Retomar e recalcular</button></footer></section>`;
  overlay.querySelectorAll('[data-close]').forEach((node)=>node.addEventListener('click',closeDialog));overlay.addEventListener('click',(eventTarget)=>{if(eventTarget.target===overlay)closeDialog();});
  overlay.querySelector('[data-resume]')?.addEventListener('click',async()=>{const message=(overlay.querySelector<HTMLTextAreaElement>('#lifecycle-v45-resume-message')?.value||'').trim();if(message.length<4){showError('Informe a mensagem de retomada que será registrada e enviada ao cliente.');return;}const button=overlay.querySelector<HTMLButtonElement>('[data-resume]')!;button.disabled=true;try{await runAction(ctx,'resume',event.scope_type,event.scope_id,message,null);location.reload();}catch(error){button.disabled=false;showError(error instanceof Error?error.message:'Não foi possível retomar e recalcular o cronograma.');}});
  document.body.append(overlay);
}

function openManager(ctx:Context){
  closeDialog();dialogOpen=true;document.body.classList.add('workspace-modal-open');const holds=activeHolds(ctx);const cancelled=ctx.project.execution_status==='cancelled';
  const overlay=document.createElement('div');overlay.className='project-lifecycle-backdrop-v44 project-lifecycle-backdrop-v45';
  const holdsHtml=holds.length?`<section class="project-lifecycle-current-v44"><strong>Interrupções ativas</strong>${holds.map((event)=>`<article><div><strong>${stateLabel(event)} · ${escapeHtml(event.scope_label)}</strong><small>${escapeHtml(event.reason)}${event.resume_date?` · previsão ${formatDate(event.resume_date)}`:''}</small></div><button type="button" data-resume-id="${event.id}">Retomar</button></article>`).join('')}</section>`:'';
  const actionHtml=cancelled?`<div class="project-lifecycle-danger-v44"><strong>Este projeto foi cancelado.</strong><span>O histórico permanece disponível. O cancelamento não é revertido por esta tela.</span></div>`:`<div class="project-lifecycle-action-grid-v44"><label class="active"><input type="radio" name="lifecycle-v45-action" value="pause" checked><strong>Pausar</strong><small>Interrupção temporária. O trabalho volta quando a condição for resolvida.</small></label><label><input type="radio" name="lifecycle-v45-action" value="suspend"><strong>Suspender</strong><small>Bloqueio formal por impedimento contratual, financeiro ou operacional.</small></label><label><input type="radio" name="lifecycle-v45-action" value="cancel"><strong>Cancelar</strong><small>Encerramento definitivo do escopo escolhido.</small></label></div><label class="project-lifecycle-field-v44"><span>Escopo</span><select id="lifecycle-v45-scope"><option value="project">Projeto inteiro</option><option value="front">Uma frente</option><option value="deliverable">Um entregável</option></select></label><label class="project-lifecycle-field-v44" id="lifecycle-v45-target-field" hidden><span id="lifecycle-v45-target-label">Selecionar</span><select id="lifecycle-v45-target"></select></label><label class="project-lifecycle-field-v44"><span>Motivo principal</span><select id="lifecycle-v45-reason-kind">${reasonOptions('pause')}</select></label><label class="project-lifecycle-field-v44" id="lifecycle-v45-resume-field"><span>Previsão de retomada (opcional)</span><input id="lifecycle-v45-resume-date" type="date"></label><label class="project-lifecycle-field-v44"><span>Justificativa / mensagem ao cliente</span><textarea id="lifecycle-v45-details" placeholder="Explique o contexto de forma objetiva. Esta mensagem ficará registrada e, se o cronograma já foi compartilhado, será enviada ao cliente."></textarea></label><div class="project-lifecycle-note-v44"><strong>Impacto no cronograma</strong><br>A pausa ou suspensão não altera o escopo nem a qualidade da entrega. O cronograma fica congelado durante a interrupção. Na retomada, o Workspace contabiliza o período efetivamente interrompido em dias úteis, desloca os prazos afetados e recalcula a <strong>Previsão CALI</strong>. A Meta desejada permanece como referência.</div><label class="project-lifecycle-danger-v44" id="lifecycle-v45-cancel-confirm" hidden><input type="checkbox" id="lifecycle-v45-cancel-check"><span>Confirmo que desejo cancelar definitivamente o escopo selecionado.</span></label>`;
  overlay.innerHTML=`<section class="project-lifecycle-dialog-v44" role="dialog" aria-modal="true"><header><div><span>CONTROLE DE EXECUÇÃO</span><h2>Gerenciar projeto</h2></div><button type="button" class="project-lifecycle-close-v44" data-close>×</button></header><div class="project-lifecycle-body-v44">${holdsHtml}${actionHtml}</div><footer><button type="button" data-close>Fechar</button>${cancelled?'':'<button type="button" class="primary" data-apply>Aplicar ação</button>'}</footer></section>`;
  overlay.querySelectorAll('[data-close]').forEach((node)=>node.addEventListener('click',closeDialog));overlay.addEventListener('click',(eventTarget)=>{if(eventTarget.target===overlay)closeDialog();});
  holds.forEach((event)=>overlay.querySelector(`[data-resume-id="${event.id}"]`)?.addEventListener('click',()=>openResumeDialog(ctx,event)));
  if(!cancelled){
    const radios=Array.from(overlay.querySelectorAll<HTMLInputElement>('input[name="lifecycle-v45-action"]'));
    const scope=overlay.querySelector<HTMLSelectElement>('#lifecycle-v45-scope')!,targetField=overlay.querySelector<HTMLElement>('#lifecycle-v45-target-field')!,target=overlay.querySelector<HTMLSelectElement>('#lifecycle-v45-target')!,targetLabel=overlay.querySelector<HTMLElement>('#lifecycle-v45-target-label')!,reasonKind=overlay.querySelector<HTMLSelectElement>('#lifecycle-v45-reason-kind')!,resumeField=overlay.querySelector<HTMLElement>('#lifecycle-v45-resume-field')!,cancelConfirm=overlay.querySelector<HTMLElement>('#lifecycle-v45-cancel-confirm')!;
    const action=()=>((radios.find((radio)=>radio.checked)?.value||'pause') as 'pause'|'suspend'|'cancel');
    const updateAction=()=>{radios.forEach((radio)=>radio.closest('label')?.classList.toggle('active',radio.checked));reasonKind.innerHTML=reasonOptions(action());resumeField.hidden=action()==='cancel';cancelConfirm.hidden=action()!=='cancel';};
    const updateTargets=()=>{const type=scope.value as ScopeType;targetField.hidden=type==='project';target.replaceChildren();if(type==='project')return;targetLabel.textContent=type==='front'?'Frente':'Entregável';const rows=type==='front'?ctx.fronts.filter((item)=>item.status!=='cancelled'):ctx.deliverables.filter((item)=>item.status!=='cancelled');const empty=document.createElement('option');empty.value='';empty.textContent=type==='front'?'Selecionar frente':'Selecionar entregável';target.append(empty);rows.forEach((row:any)=>{const option=document.createElement('option');option.value=row.id;option.textContent=type==='front'?row.name:`${row.title}${row.workstream?` · ${row.workstream}`:''}`;target.append(option);});};
    radios.forEach((radio)=>radio.addEventListener('change',updateAction));scope.addEventListener('change',updateTargets);updateTargets();
    overlay.querySelector('[data-apply]')?.addEventListener('click',async()=>{const chosen=action(),scopeType=scope.value as ScopeType,scopeId=scopeType==='project'?null:(target.value||null),reasonLabel=reasonKind.value,details=(overlay.querySelector<HTMLTextAreaElement>('#lifecycle-v45-details')?.value||'').trim(),resumeDate=(overlay.querySelector<HTMLInputElement>('#lifecycle-v45-resume-date')?.value||'')||null;if(scopeType!=='project'&&!scopeId){showError(`Selecione ${scopeType==='front'?'a frente':'o entregável'}.`);return;}if(!reasonLabel){showError('Selecione o motivo principal.');return;}if(details.length<4){showError('Explique brevemente o contexto para registrar e comunicar ao cliente.');return;}if(chosen==='cancel'&&!overlay.querySelector<HTMLInputElement>('#lifecycle-v45-cancel-check')?.checked){showError('Confirme o cancelamento definitivo antes de continuar.');return;}const fullReason=`${reasonLabel} — ${details}`;const button=overlay.querySelector<HTMLButtonElement>('[data-apply]')!;button.disabled=true;try{await runAction(ctx,chosen,scopeType,scopeId,fullReason,resumeDate);location.reload();}catch(error){button.disabled=false;showError(error instanceof Error?error.message:'Não foi possível aplicar a ação.');}});
  }
  document.body.append(overlay);
}

function patchLifecycleCopy(){
  const admin=document.querySelector<HTMLElement>('.project-lifecycle-banner-v44 p');
  if(admin&&admin.textContent?.includes('Nenhuma deadline foi alterada automaticamente.'))admin.textContent=admin.textContent.replace('Nenhuma deadline foi alterada automaticamente.','O cronograma está congelado. Na retomada, o período efetivamente interrompido será contabilizado e os prazos afetados serão recalculados.');
  const client=document.querySelector<HTMLElement>('.client-lifecycle-banner-v44 p');
  if(client&&client.textContent?.includes('O cronograma permanece registrado e nenhuma data foi alterada automaticamente por esta ação.'))client.textContent=client.textContent.replace('O cronograma permanece registrado e nenhuma data foi alterada automaticamente por esta ação.','O cronograma permanece registrado e congelado durante esta interrupção. Na retomada, os prazos afetados serão recalculados pelo período efetivamente interrompido.');
}

function schedulePatch(){window.clearTimeout(observerTimer);observerTimer=window.setTimeout(patchLifecycleCopy,100);}

export function installProjectLifecycleRecalcUxV45(){
  if(installed||typeof window==='undefined')return;installed=true;
  document.addEventListener('click',async(event)=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const manage=target.closest('.project-lifecycle-manage-v44,.project-lifecycle-banner-v44 button');
    if(!manage||dialogOpen||!location.pathname.startsWith('/admin/projetos'))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const ctx=await loadAdminContext();if(ctx)openManager(ctx);else showError('Não foi possível carregar o contexto deste projeto.');
  },true);
  const observer=new MutationObserver(schedulePatch);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  schedulePatch();window.addEventListener('focus',schedulePatch);window.addEventListener('popstate',schedulePatch);
}
