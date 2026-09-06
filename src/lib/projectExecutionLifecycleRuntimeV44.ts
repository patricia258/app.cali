import { supabase } from './supabase';

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
  style.textContent=`
.project-lifecycle-manage-v44{white-space:nowrap}
.project-lifecycle-banner-v44{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:14px 0;padding:14px 16px;border:1px solid color-mix(in srgb,#B58C52 38%,var(--theme-line));border-radius:14px;background:color-mix(in srgb,#B58C52 8%,var(--theme-surface));color:var(--theme-text)}
.project-lifecycle-banner-v44[data-state="suspended"]{border-color:color-mix(in srgb,#9C364E 34%,var(--theme-line));background:color-mix(in srgb,#9C364E 7%,var(--theme-surface))}
.project-lifecycle-banner-v44[data-state="cancelled"]{border-color:color-mix(in srgb,#8F2D43 42%,var(--theme-line));background:color-mix(in srgb,#8F2D43 10%,var(--theme-surface))}
.project-lifecycle-banner-v44>div{display:grid;gap:3px}.project-lifecycle-banner-v44 span{font-size:8.5px;font-weight:900;letter-spacing:.11em;color:#8C6637}
.project-lifecycle-banner-v44 strong{font-size:13px}.project-lifecycle-banner-v44 p{margin:0;color:var(--theme-muted);font-size:10.5px;line-height:1.45}
.project-lifecycle-banner-v44 button{min-height:36px;padding:0 12px;border:1px solid var(--theme-line);border-radius:10px;background:var(--theme-surface);color:var(--theme-text);font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}
.project-lifecycle-backdrop-v44{position:fixed;inset:0;z-index:15500;display:grid;place-items:center;padding:22px;background:rgba(39,24,29,.42);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
.project-lifecycle-dialog-v44{width:min(650px,calc(100vw - 34px));max-height:min(790px,calc(100vh - 44px));overflow:auto;border:1px solid var(--theme-line);border-radius:20px;background:var(--theme-surface);color:var(--theme-text);box-shadow:0 30px 85px rgba(31,18,23,.28)}
.project-lifecycle-dialog-v44>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 16px;border-bottom:1px solid var(--theme-line)}
.project-lifecycle-dialog-v44>header>div{display:grid;gap:4px}.project-lifecycle-dialog-v44>header span{font-size:8.5px;font-weight:900;letter-spacing:.12em;color:#87505F}
.project-lifecycle-dialog-v44 h2{margin:0;font-size:21px;letter-spacing:-.02em}.project-lifecycle-close-v44{width:37px;height:37px;border:0;border-radius:11px;background:var(--theme-surface-soft);color:var(--theme-text);font-size:22px;cursor:pointer}
.project-lifecycle-body-v44{display:grid;gap:14px;padding:18px 22px}.project-lifecycle-current-v44{display:grid;gap:7px}
.project-lifecycle-current-v44 article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--theme-line);border-radius:11px;background:var(--theme-surface-soft)}
.project-lifecycle-current-v44 article>div{display:grid;gap:2px}.project-lifecycle-current-v44 article strong{font-size:11px}.project-lifecycle-current-v44 article small{font-size:9px;color:var(--theme-muted)}
.project-lifecycle-current-v44 article button{height:32px;padding:0 10px;border:1px solid var(--theme-line);border-radius:9px;background:var(--theme-surface);color:var(--theme-text);font:inherit;font-size:9.5px;font-weight:800;cursor:pointer}
.project-lifecycle-action-grid-v44{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.project-lifecycle-action-grid-v44 label{position:relative;display:grid;gap:4px;padding:12px;border:1px solid var(--theme-line);border-radius:12px;background:var(--theme-surface-soft);cursor:pointer}
.project-lifecycle-action-grid-v44 input{position:absolute;opacity:0}.project-lifecycle-action-grid-v44 label.active{border-color:#8B5262;box-shadow:inset 0 0 0 1px #8B5262;background:color-mix(in srgb,#5A1E2D 4%,var(--theme-surface))}
.project-lifecycle-action-grid-v44 strong{font-size:11px}.project-lifecycle-action-grid-v44 small{font-size:9px;line-height:1.4;color:var(--theme-muted)}
.project-lifecycle-field-v44{display:grid;gap:6px}.project-lifecycle-field-v44>span{font-size:10px;font-weight:800}
.project-lifecycle-field-v44 select,.project-lifecycle-field-v44 textarea,.project-lifecycle-field-v44 input[type="date"]{width:100%;box-sizing:border-box;border:1px solid var(--theme-line);border-radius:11px;background:var(--theme-surface);color:var(--theme-text);font:inherit;font-size:12px;padding:10px 11px}
.project-lifecycle-field-v44 textarea{min-height:105px;resize:vertical}.project-lifecycle-note-v44{padding:10px 12px;border:1px solid color-mix(in srgb,#B58C52 32%,var(--theme-line));border-radius:11px;background:color-mix(in srgb,#B58C52 7%,var(--theme-surface));font-size:9.5px;line-height:1.5;color:var(--theme-muted)}
.project-lifecycle-danger-v44{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid rgba(159,48,74,.24);border-radius:11px;background:rgba(159,48,74,.07);font-size:9.5px;color:var(--theme-text)}
.project-lifecycle-dialog-v44>footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid var(--theme-line);background:var(--theme-surface-soft)}
.project-lifecycle-dialog-v44>footer button{min-height:39px;padding:0 13px;border:1px solid var(--theme-line);border-radius:10px;background:var(--theme-surface);color:var(--theme-text);font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}
.project-lifecycle-dialog-v44>footer button.primary{background:#5A1E2D;border-color:#5A1E2D;color:#fff}
.client-lifecycle-banner-v44{margin:10px 0 16px;padding:14px 16px;border:1px solid color-mix(in srgb,#B58C52 35%,var(--theme-line));border-radius:14px;background:color-mix(in srgb,#B58C52 8%,var(--theme-surface));display:grid;gap:4px}
.client-lifecycle-banner-v44 span{font-size:8.5px;font-weight:900;letter-spacing:.1em;color:#8A6638}.client-lifecycle-banner-v44 strong{font-size:12.5px}.client-lifecycle-banner-v44 p{margin:0;font-size:10.5px;line-height:1.5;color:var(--theme-muted)}
[data-workspace-theme="night"] .project-lifecycle-backdrop-v44{background:rgba(8,6,7,.66)}

.kanban-v2{display:flex!important;flex-wrap:nowrap!important;gap:10px!important;overflow-x:auto!important;overflow-y:hidden!important;padding-bottom:4px!important;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-inline:contain}
.kanban-v2::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
.kanban-v2>div{flex:0 0 244px!important;min-width:244px!important}
.kanban-v2>div.kanban-drop-target-v46{outline:2px solid color-mix(in srgb,var(--theme-accent) 55%,transparent);outline-offset:-2px;background:color-mix(in srgb,var(--theme-accent) 6%,var(--theme-surface-muted))}
.kanban-v2>div>button[data-kanban-draggable-v46="1"]{cursor:grab}.kanban-v2>div>button[data-kanban-draggable-v46="1"]:active{cursor:grabbing}
.kanban-v2>div>button.kanban-dragging-v46{opacity:.45}

.front-header-v2{position:relative}
.front-header-v2>img.front-collapse-trigger-v46{cursor:pointer;transition:opacity .18s ease,transform .18s ease}
.front-header-v2>img.front-collapse-trigger-v46:hover{opacity:1!important;transform:scale(1.05)}
.front-section-v2.front-collapsed-v46>.front-deliverables-v2{display:none!important}
.front-header-v2:has(>img.front-collapse-trigger-v46:hover)::after{content:attr(data-front-toggle-tip);position:absolute;left:14px;top:calc(100% - 7px);z-index:40;max-width:240px;padding:7px 9px;border:1px solid var(--theme-line);border-radius:9px;background:var(--theme-surface);color:var(--theme-text);box-shadow:0 8px 22px rgba(42,25,30,.12);font-size:10px;font-weight:750;line-height:1.3;pointer-events:none;white-space:normal}
.front-section-v2.front-collapsed-v46>.front-header-v2{border-bottom:0}
@media(max-width:720px){.project-lifecycle-action-grid-v44{grid-template-columns:1fr}.project-lifecycle-banner-v44{align-items:flex-start;flex-direction:column}.project-lifecycle-dialog-v44{width:100%;max-height:calc(100vh - 20px)}.kanban-v2>div{flex-basis:220px!important;min-width:220px!important}}
`;
  document.head.append(style);
}

async function loadContext(project:ProjectRow):Promise<Context|null>{
  if(!supabase)return null;
  const [fronts,deliverables,events]=await Promise.all([
    supabase.from('project_workstreams').select('id,project_id,protocol,name,status,execution_status').eq('project_id',project.id).order('sort_order'),
    supabase.from('deliverables').select('id,project_id,protocol,title,workstream_id,workstream,status,execution_status,due_at').eq('project_id',project.id).order('sort_order'),
    supabase.from('project_lifecycle_events').select('id,project_id,scope_type,scope_id,scope_label,action,reason,resume_date,created_at,resolved_at').eq('project_id',project.id).order('created_at',{ascending:false}).limit(40),
  ]);
  return{project,fronts:(fronts.data||[])as FrontRow[],deliverables:(deliverables.data||[])as DeliverableRow[],events:(events.data||[])as LifecycleEvent[]};
}

async function loadAdminContext(force=false):Promise<Context|null>{
  if(!supabase)return null;
  const protocol=protocolFromHero();
  if(!protocol)return null;
  if(!force&&adminCache?.protocol===protocol&&Date.now()-adminCache.at<1400)return adminCache.ctx;
  const p=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,status,execution_status,start_date,target_end_date,roadmap_end_date,lifecycle_reason,lifecycle_resume_date,lifecycle_updated_at').eq('protocol',protocol).maybeSingle();
  if(p.error||!p.data)return null;
  const ctx=await loadContext(p.data as ProjectRow);
  adminCache={protocol,at:Date.now(),ctx};
  return ctx;
}

async function selectedClientProject():Promise<ProjectRow|null>{
  if(!supabase)return null;
  const user=await supabase.auth.getUser();
  const uid=user.data.user?.id;
  if(!uid)return null;
  const profile=await supabase.from('profiles').select('company_id').eq('id',uid).maybeSingle();
  const companyId=profile.data?.company_id;
  if(!companyId)return null;
  const selected=document.querySelector<HTMLSelectElement>('.client-project-picker-v33 select')?.value||'';
  const result=await supabase.from('projects').select('id,protocol,company_id,name,planning_status,status,execution_status,start_date,target_end_date,roadmap_end_date,lifecycle_reason,lifecycle_resume_date,lifecycle_updated_at').eq('company_id',companyId).neq('planning_status','draft').order('created_at',{ascending:false});
  if(result.error||!result.data?.length)return null;
  if(selected)return(result.data.find((row:any)=>row.id===selected)||result.data[0])as ProjectRow;
  const visible=result.data.find((row:any)=>row.execution_status!=='cancelled'&&row.planning_status!=='closed')||result.data[0];
  return visible as ProjectRow;
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
  const heading=document.querySelector<HTMLElement>('.client-roadmap-heading-v33');
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
  const project=pageIsClient()?document.querySelector<HTMLSelectElement>('.client-project-picker-v33 select')?.value||'client':protocolFromHero()||'admin';
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
      const select=document.querySelector<HTMLSelectElement>('.deliverable-workspace-modal-v2 .inline-status-select-v3 select');
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
    window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.deliverable-workspace-modal-v2 .modal-close-static')?.click(),180);
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
    return node.matches('.project-hero-v2,.kanban-v2,.front-section-v2,.client-roadmap-heading-v33,.client-project-picker-v33')||
      Boolean(node.querySelector?.('.project-hero-v2,.kanban-v2,.front-section-v2,.client-roadmap-heading-v33,.client-project-picker-v33'));
  });
  if(added)return true;
  const target=mutation.target instanceof Element?mutation.target:null;
  if(target?.closest('.project-lifecycle-banner-v44,.client-lifecycle-banner-v44,.project-lifecycle-backdrop-v44'))return false;
  return Boolean(target?.closest('.projects-flow-page,.client-roadmap-page-v33'));
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
    if((event.target as Element)?.closest?.('.client-project-picker-v33'))schedule(true);
  },true);
}
