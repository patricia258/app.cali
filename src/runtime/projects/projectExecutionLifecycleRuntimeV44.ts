import runtimeStyles from './project-execution-lifecycle-runtime-v44.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import { readClientProjectLifecycle, readProjectLifecycle, readProjectLifecycleContext } from '../../api/projects/lifecycle';

type ScopeType = 'project' | 'front' | 'deliverable';
type Action = 'pause' | 'suspend' | 'cancel' | 'resume';
type ProjectRow = {
  id:string; protocol:string|null; company_id:string; name:string; planning_status:string; status:string;
  execution_status:string; start_date:string|null; target_end_date:string|null; roadmap_end_date:string|null;
  lifecycle_reason:string|null; lifecycle_resume_date:string|null; lifecycle_updated_at:string|null;
};
type FrontRow = { id:string; project_id:string; protocol:string|null; name:string; status:string; execution_status:string };
type DeliverableRow = { id:string; project_id:string; protocol:string|null; title:string; workstream_id:string|null; workstream:string|null; status:string; execution_status:string; due_at:string|null };
type LifecycleEvent = { id:string; project_id:string; scope_type:ScopeType; scope_id:string|null; scope_label:string; action:Action; reason:string; resume_date:string|null; created_at:string; resolved_at:string|null };
type Context = { project:ProjectRow; fronts:FrontRow[]; deliverables:DeliverableRow[]; events:LifecycleEvent[] };

const KANBAN_STATUSES = ['not_started','in_progress','internal_review','client_review','adjustment_requested','rebriefing','approved'] as const;
type KanbanStatus = typeof KANBAN_STATUSES[number];

let installed=false;
let timer=0;
let busy=false;
let adminCache:{protocol:string;at:number;ctx:Context|null}|null=null;
let clientCache:{projectId:string;at:number;ctx:Context|null}|null=null;
let draggedKanbanCard:HTMLButtonElement|null=null;

function escapeHtml(value=''){return value.replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));}
function formatDate(value?:string|null){if(!value)return'A definir';const d=new Date(value.length===10?`${value}T12:00:00`:value);return Number.isNaN(d.getTime())?'A definir':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.','');}
function protocolFromHero(){const text=document.querySelector<HTMLElement>('.project-hero-v2 > div:first-of-type > span')?.textContent||'';return text.match(/CALI-PRJ-[A-Z0-9-]+/i)?.[0]||'';}
function pageIsAdmin(){return location.pathname.startsWith('/admin/projetos');}
function pageIsClient(){return location.pathname.startsWith('/cliente/entregaveis');}

function injectStyles(){
  if(document.getElementById('project-lifecycle-styles-v44'))return;
  const style=document.createElement('style');
  style.id='project-lifecycle-styles-v44';
  style.textContent=runtimeStyles;
  document.head.append(style);
}

async function loadContext(project:ProjectRow):Promise<Context|null>{
  if(!isSupabaseConfigured)return null;
  return { project, ...await readProjectLifecycleContext(project.id, 40) } as Context;
}

async function loadAdminContext(force=false):Promise<Context|null>{
  if(!isSupabaseConfigured)return null;
  const protocol=protocolFromHero();
  if(!protocol)return null;
  if(!force&&adminCache?.protocol===protocol&&Date.now()-adminCache.at<1400)return adminCache.ctx;
  const project = await readProjectLifecycle(protocol);
  if (!project) return null;
  const ctx = await loadContext(project as ProjectRow);
  adminCache={protocol,at:Date.now(),ctx};
  return ctx;
}

async function selectedClientProject(): Promise<ProjectRow | null> {
  if (!isSupabaseConfigured) return null;
  const selected=document.querySelector<HTMLSelectElement>(":is(.client-project-picker-v33,[data-v2-operation~=\"client-project-picker-v33\"]) select")?.value||'';
  return await readClientProjectLifecycle(selected) as ProjectRow | null;
}

async function loadClientContext(force=false):Promise<Context|null>{
  const project=await selectedClientProject();
  if(!project)return null;
  if(!force&&clientCache?.projectId===project.id&&Date.now()-clientCache.at<1400)return clientCache.ctx;
  const ctx=await loadContext(project);
  clientCache={projectId:project.id,at:Date.now(),ctx};
  return ctx;
}

function activeHolds(ctx:Context){return ctx.events.filter((event)=>!event.resolved_at&&['pause','suspend'].includes(event.action));}

function ensureManageButton(ctx:Context){
  const hero=document.querySelector<HTMLElement>('.project-hero-v2');
  if(!hero)return;
  const buttons=hero.querySelector<HTMLElement>('.project-hero-buttons');
  if(!buttons)return;
  let button=buttons.querySelector<HTMLButtonElement>('.project-lifecycle-manage-v44');
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.className='light-button project-lifecycle-manage-v44';
    button.textContent='Gerenciar projeto';
    buttons.append(button);
  }
  button.dataset.projectId=ctx.project.id;
}

function renderAdminBanner(ctx:Context){
  const hero=document.querySelector<HTMLElement>('.project-hero-v2');
  if(!hero)return;
  const holds=activeHolds(ctx);
  const state=ctx.project.execution_status;
  let banner=document.querySelector<HTMLElement>('.project-lifecycle-banner-v44');
  if(state==='normal'&&!holds.length){banner?.remove();return;}
  const mainEvent=holds.find((event)=>event.scope_type==='project')||holds[0];
  const title=state==='paused'?'Projeto pausado':state==='suspended'?'Projeto suspenso':state==='cancelled'?'Projeto cancelado':holds.length===1?'Interrupção parcial ativa':`${holds.length} interrupções parciais ativas`;
  const reason=ctx.project.lifecycle_reason||mainEvent?.reason||'Há uma interrupção operacional registrada neste projeto.';
  const resume=ctx.project.lifecycle_resume_date||mainEvent?.resume_date;
  const copy=`${reason}${resume?` · retomada prevista ${formatDate(resume)}`:''}. O cronograma está congelado; na retomada, o período efetivamente interrompido será contabilizado e a Previsão CALI será recalculada.`;
  const sig=[state,title,copy].join('|');
  if(!banner){
    banner=document.createElement('section');
    banner.className='project-lifecycle-banner-v44';
    hero.insertAdjacentElement('afterend',banner);
  }
  banner.dataset.state=state;
  if(banner.dataset.sig!==sig){
    banner.dataset.sig=sig;
    banner.innerHTML=`<div><span>CONTROLE DE EXECUÇÃO</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div><button type="button">Gerenciar</button>`;
  }
}

function renderClientBanner(ctx:Context){
  const heading=document.querySelector<HTMLElement>(":is(.client-roadmap-heading-v33,[data-v2-operation~=\"client-roadmap-heading-v33\"])");
  if(!heading)return;
  const holds=activeHolds(ctx);
  const state=ctx.project.execution_status;
  let banner=document.querySelector<HTMLElement>('.client-lifecycle-banner-v44');
  if(state==='normal'&&!holds.length){banner?.remove();return;}
  const main=holds.find((event)=>event.scope_type==='project')||holds[0];
  const title=state==='paused'?'Projeto pausado pela CALI':state==='suspended'?'Projeto suspenso pela CALI':state==='cancelled'?'Projeto cancelado':holds.length===1?`${main?.scope_type==='front'?'Frente':'Entregável'} temporariamente interrompido`:`${holds.length} itens do cronograma estão interrompidos`;
  const reason=ctx.project.lifecycle_reason||main?.reason||'Existe uma atualização operacional neste cronograma.';
  const resume=ctx.project.lifecycle_resume_date||main?.resume_date;
  const copy=`${reason}${resume?` · previsão de retomada ${formatDate(resume)}`:''}. A qualidade e o escopo permanecem preservados; o prazo será recalculado na retomada conforme o período efetivamente interrompido.`;
  const sig=[state,title,copy].join('|');
  if(!banner){
    banner=document.createElement('section');
    banner.className='client-lifecycle-banner-v44';
    heading.insertAdjacentElement('afterend',banner);
  }
  if(banner.dataset.sig!==sig){
    banner.dataset.sig=sig;
    banner.innerHTML=`<span>ATUALIZAÇÃO DO PROJETO</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p>`;
  }
}

function frontStorageKey(section:HTMLElement){
  const protocol=section.querySelector<HTMLElement>('.front-copy-v2>span')?.textContent?.trim()||'front';
  const name=section.querySelector<HTMLElement>('.front-copy-v2>strong')?.textContent?.trim()||'';
  const project=pageIsClient()?document.querySelector<HTMLSelectElement>(":is(.client-project-picker-v33,[data-v2-operation~=\"client-project-picker-v33\"]) select")?.value||'client':protocolFromHero()||'admin';
  return `cali-front-expanded-v46:${location.pathname}:${project}:${protocol}:${name}`;
}

function setFrontExpanded(section:HTMLElement,expanded:boolean){
  section.classList.toggle('front-collapsed-v46',!expanded);
  const header=section.querySelector<HTMLElement>('.front-header-v2');
  const image=header?.querySelector<HTMLImageElement>(':scope>img');
  const tip=expanded?'Clique para recolher os entregáveis':'Clique para visualizar os entregáveis';
  if(header)header.dataset.frontToggleTip=tip;
  if(image){
    image.setAttribute('aria-expanded',String(expanded));
    image.title=tip;
  }
  try{sessionStorage.setItem(frontStorageKey(section),expanded?'1':'0');}catch{}
}

function enhanceFrontCollapse(){
  document.querySelectorAll<HTMLElement>('.front-section-v2').forEach((section)=>{
    const header=section.querySelector<HTMLElement>('.front-header-v2');
    const image=header?.querySelector<HTMLImageElement>(':scope>img');
    const list=section.querySelector<HTMLElement>(':scope>.front-deliverables-v2');
    if(!header||!image||!list)return;
    if(section.dataset.frontCollapseReadyV46!=='1'){
      section.dataset.frontCollapseReadyV46='1';
      image.classList.add('front-collapse-trigger-v46');
      image.setAttribute('role','button');
      image.tabIndex=0;
      let expanded=false;
      try{expanded=sessionStorage.getItem(frontStorageKey(section))==='1';}catch{}
      setFrontExpanded(section,expanded);
      const toggle=(event:Event)=>{
        event.preventDefault();
        event.stopPropagation();
        setFrontExpanded(section,section.classList.contains('front-collapsed-v46'));
      };
      image.addEventListener('click',toggle);
      image.addEventListener('keydown',(event)=>{
        if(event.key==='Enter'||event.key===' '){toggle(event);}
      });
    }
  });
}

function waitForStatusSelect(timeout=1600){
  return new Promise<HTMLSelectElement|null>((resolve)=>{
    const started=Date.now();
    const check=()=>{
      const select=document.querySelector<HTMLSelectElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) .inline-status-select-v3 select");
      if(select){resolve(select);return;}
      if(Date.now()-started>=timeout){resolve(null);return;}
      window.setTimeout(check,30);
    };
    check();
  });
}

async function applyKanbanDrop(card:HTMLButtonElement,targetStatus:KanbanStatus){
  const sourceColumn=card.closest<HTMLElement>('.kanban-v2>div');
  const sourceStatus=sourceColumn?.dataset.kanbanStatusV46 as KanbanStatus|undefined;
  if(!sourceStatus||sourceStatus===targetStatus||sourceStatus==='approved')return;
  card.click();
  const select=await waitForStatusSelect();
  if(!select||select.disabled)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')?.set;
  setter?.call(select,targetStatus);
  select.dispatchEvent(new Event('change',{bubbles:true}));
  if(!['adjustment_requested','rebriefing'].includes(targetStatus)){
    window.setTimeout(()=>document.querySelector<HTMLButtonElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) .modal-close-static")?.click(),180);
  }
}

function clearKanbanDropTargets(){
  document.querySelectorAll('.kanban-v2>div.kanban-drop-target-v46').forEach((column)=>column.classList.remove('kanban-drop-target-v46'));
}

function enhanceKanban(){
  if(!pageIsAdmin())return;
  const board=document.querySelector<HTMLElement>('.kanban-v2');
  if(!board)return;
  Array.from(board.children).forEach((node,index)=>{
    if(!(node instanceof HTMLElement))return;
    const status=KANBAN_STATUSES[index];
    if(!status)return;
    node.dataset.kanbanStatusV46=status;
    if(node.dataset.kanbanDropReadyV46!=='1'){
      node.dataset.kanbanDropReadyV46='1';
      node.addEventListener('dragover',(event)=>{
        if(!draggedKanbanCard)return;
        event.preventDefault();
        clearKanbanDropTargets();
        node.classList.add('kanban-drop-target-v46');
      });
      node.addEventListener('dragleave',(event)=>{
        if(!node.contains(event.relatedTarget as Node|null))node.classList.remove('kanban-drop-target-v46');
      });
      node.addEventListener('drop',(event)=>{
        event.preventDefault();
        const card=draggedKanbanCard;
        clearKanbanDropTargets();
        draggedKanbanCard=null;
        if(card)void applyKanbanDrop(card,status);
      });
    }
    node.querySelectorAll<HTMLButtonElement>(':scope>button').forEach((card)=>{
      const draggable=status!=='approved';
      card.draggable=draggable;
      card.dataset.kanbanDraggableV46=draggable?'1':'0';
      if(card.dataset.kanbanDragReadyV46==='1')return;
      card.dataset.kanbanDragReadyV46='1';
      card.addEventListener('dragstart',(event)=>{
        const column=card.closest<HTMLElement>('.kanban-v2>div');
        if(column?.dataset.kanbanStatusV46==='approved'){event.preventDefault();return;}
        draggedKanbanCard=card;
        card.classList.add('kanban-dragging-v46');
        event.dataTransfer?.setData('text/plain',card.querySelector('small')?.textContent||card.textContent||'entregavel');
        if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
      });
      card.addEventListener('dragend',()=>{
        draggedKanbanCard=null;
        card.classList.remove('kanban-dragging-v46');
        clearKanbanDropTargets();
      });
    });
  });
}

async function renderAdmin(){
  if(!pageIsAdmin())return;
  const ctx=await loadAdminContext();
  if(ctx){ensureManageButton(ctx);renderAdminBanner(ctx);}
  enhanceFrontCollapse();
  enhanceKanban();
}

async function renderClient(){
  if(!pageIsClient())return;
  const ctx=await loadClientContext();
  if(ctx)renderClientBanner(ctx);
  enhanceFrontCollapse();
}

async function enhance(){
  if(busy)return;
  busy=true;
  try{
    if(pageIsAdmin())await renderAdmin();
    else if(pageIsClient())await renderClient();
  }finally{busy=false;}
}

function schedule(force=false){
  if(force){adminCache=null;clientCache=null;}
  window.clearTimeout(timer);
  timer=window.setTimeout(()=>void enhance(),70);
}

function relevantMutation(mutation:MutationRecord){
  const added=Array.from(mutation.addedNodes).some((node)=>{
    if(!(node instanceof Element))return false;
    return node.matches(".project-hero-v2,.kanban-v2,.front-section-v2,:is(.client-roadmap-heading-v33,[data-v2-operation~=\"client-roadmap-heading-v33\"]),:is(.client-project-picker-v33,[data-v2-operation~=\"client-project-picker-v33\"])")||
      Boolean(node.querySelector?.(".project-hero-v2,.kanban-v2,.front-section-v2,:is(.client-roadmap-heading-v33,[data-v2-operation~=\"client-roadmap-heading-v33\"]),:is(.client-project-picker-v33,[data-v2-operation~=\"client-project-picker-v33\"])"));
  });
  if(added)return true;
  const target=mutation.target instanceof Element?mutation.target:null;
  if(target?.closest('.project-lifecycle-banner-v44,.client-lifecycle-banner-v44,.project-lifecycle-backdrop-v44'))return false;
  return Boolean(target?.closest(".projects-flow-page,:is(.client-roadmap-page-v33,[data-v2-operation~=\"client-roadmap-page-v33\"])"));
}

export function installProjectExecutionLifecycleRuntimeV44(){
  if(installed||typeof window==='undefined')return;
  installed=true;
  injectStyles();
  schedule(true);
  const observer=new MutationObserver((mutations)=>{if(mutations.some(relevantMutation))schedule();});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',()=>schedule(true));
  window.addEventListener('popstate',()=>schedule(true));
  document.addEventListener('change',(event)=>{
    if((event.target as Element)?.closest?.(":is(.client-project-picker-v33,[data-v2-operation~=\"client-project-picker-v33\"])"))schedule(true);
  },true);
}
