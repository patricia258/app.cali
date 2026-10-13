import { Fragment, createContext, FormEvent, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SubtaskModal, SUBTASK_STATUS, subtaskStatusOptions, subtaskStatusLabel } from './SubtaskPanel';
import { NoteLog } from './NoteLog';
import { ChevronDown, ChevronRight, Pause,
  AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Edit3,
  FileText, FolderKanban, GitBranch, History, LayoutGrid, List, Paperclip, Play,
  Plus, RefreshCw, Search, Send, ShieldCheck, Square, Trash2, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import '../../projects-planning-intelligence-v36.css';
import '../../project-approval-workflow-v38.css';
import '../../project-approval-rules-v39.css';
import '../../project-client-portfolio-v39.css';
import '../../admin-projects-stability-v62.css';
import { supabase } from '../../lib/supabase';
import { optimizeImageForUpload } from '../../lib/imageUpload';
import {
  complexityMeta, deliverableLabels, formatProjectDate, previewProjects, projectPlanningLabels,
  projectProgress, type DeliverableStatus, type MaterialComplexity, type ProjectDeliverable,
  type ProjectPlanningStatus, type WorkspaceProject,
} from '../../domain/projects';

type ProjectView = 'overview' | 'roadmap' | 'deliverables' | 'history';
type DeliverableView = 'list' | 'kanban';
type DetailTab = 'overview' | 'tasks' | 'conversation' | 'history';
type ConversationChannel = 'internal' | 'client';

type ProjectFront = {
  id: string; protocol: string; projectId: string; companyId: string; name: string; objective: string;
  monthStart: number | null; monthEnd: number | null; status: 'planned' | 'active' | 'completed' | 'cancelled'; sortOrder: number;
};
type TaskItem = {
  id: string; protocol: string; deliverableId: string; title: string; description?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'; dueAt?: string | null; clientVisible: boolean;
  estimatedMinutes: number; sortOrder: number;
};
type CommentItem = {
  id: string; body: string; clientVisible: boolean; createdAt: string; author?: string;

};
type HistoryItem = { id: string; title: string; detail: string; createdAt: string };
type ActiveTimer = { id?: string; taskId?: string | null; deliverableId: string; startedAt: string; preview: boolean } | null;
type ProjectForm = { companyId: string; name: string; startDate: string; endDate: string; clientResponseBusinessDays: number };
type FrontDraft = { id: string; name: string; objective: string; monthStart: number; monthEnd: number };
type FrontForm = { name: string; objective: string; monthStart: number; monthEnd: number };
type DeliverableForm = {
  title: string; description: string; frontId: string; complexity: MaterialComplexity;
  monthStart: number; monthEnd: number; dueDate: string; isDocument: boolean; clientVisible: boolean;
};
type TaskForm = { title: string; description: string; dueDate: string; estimatedHours: string; clientVisible: boolean; complexity: string; isDocument: boolean };
type PendingStatus = { item: ProjectDeliverable; status: DeliverableStatus } | null;

const statuses: DeliverableStatus[] = ['not_started','in_progress','standby','internal_review','client_review','adjustment_requested','rebriefing','approved','cancelled'];
const statusTone: Record<DeliverableStatus,string> = {
  not_started:'status-neutral', in_progress:'status-progress', standby:'status-standby', internal_review:'status-review',
  client_review:'status-client', adjustment_requested:'status-adjustment', rebriefing:'status-rebriefing',
  approved:'status-approved', cancelled:'status-cancelled',
};
const projectTone: Record<ProjectPlanningStatus,string> = {
  draft:'neutral', client_review:'gold', adjustment_requested:'gold', approved:'success', active:'success', rebriefing:'danger', closed:'neutral',
};

const servicePlanLabel = (service?: string, plan?: string | null) => {
  if (service === 'CALI Partner') return 'Assessoria Estratégica Mensal · CALI Partner';
  if (service === 'CALI Full') return 'Assessoria Estratégica Mensal · CALI Full';
  if (service === 'Assessoria Estratégica Mensal' && plan === 'partner') return 'Assessoria Estratégica Mensal · CALI Partner';
  if (service === 'Assessoria Estratégica Mensal' && plan === 'full') return 'Assessoria Estratégica Mensal · CALI Full';
  return service || 'Serviço CALI';
};
const isUuid = (value?: string | null) => Boolean(value && /^[0-9a-f-]{36}$/i.test(value));
const roadmapLabel = (item: ProjectDeliverable) => !item.roadmapMonthStart ? 'Sem mês' : (!item.roadmapMonthEnd || item.roadmapMonthEnd === item.roadmapMonthStart ? `M${item.roadmapMonthStart}` : `M${item.roadmapMonthStart}–M${item.roadmapMonthEnd}`);
const hoursLabel = (hours: number) => `${hours.toLocaleString('pt-BR',{minimumFractionDigits:hours%1?1:0,maximumFractionDigits:1})}h`;
const estimateLabel = (minutes: number) => minutes ? `${Math.floor(minutes/60)}h${minutes%60 ? String(minutes%60).padStart(2,'0') : ''}` : 'sem estimativa';
const emptyProjectForm = (companyId=''): ProjectForm => ({ companyId, name:'', startDate:'', endDate:'', clientResponseBusinessDays:3 });
const emptyFrontForm = (): FrontForm => ({ name:'', objective:'', monthStart:1, monthEnd:1 });
const emptyDeliverableForm = (frontId=''): DeliverableForm => ({ title:'', description:'', frontId, complexity:'MC2', monthStart:1, monthEnd:1, dueDate:'', isDocument:true, clientVisible:true });
const emptyTaskForm = (): TaskForm => ({ title:'', description:'', dueDate:'', estimatedHours:'', clientVisible:false, complexity:'MC2', isDocument:false });

function previewFronts(project: WorkspaceProject): ProjectFront[] {
  const grouped = new Map<string, ProjectDeliverable[]>();
  project.deliverables.forEach((item) => grouped.set(item.workstream, [...(grouped.get(item.workstream)||[]), item]));
  return Array.from(grouped.entries()).map(([name,items],index) => ({
    id:`preview-front-${project.id}-${index}`, protocol:`CALI-FRT-PREVIEW-${String(index+1).padStart(2,'0')}`,
    projectId:project.id, companyId:project.companyId, name,
    objective: name === 'Cultura & Engajamento' ? 'Definir direcionadores, leitura de clima e rituais que sustentem as próximas decisões.' : name === 'Estrutura & Processos' ? 'Organizar processos prioritários, responsáveis e critérios de execução.' : 'Consolidar esta frente no roadmap e transformar decisões em rotina aplicável.',
    monthStart:Math.min(...items.map((i)=>i.roadmapMonthStart||1)), monthEnd:Math.max(...items.map((i)=>i.roadmapMonthEnd||i.roadmapMonthStart||1)),
    status:items.every((i)=>i.status==='approved')?'completed':items.some((i)=>['in_progress','client_review'].includes(i.status))?'active':'planned', sortOrder:index+1,
  }));
}

function previewTasks(deliverable: ProjectDeliverable): TaskItem[] {
  const base: Record<string,string[]> = {
    a1:['Consolidar briefing e documentos recebidos','Realizar leitura diagnóstica','Validar prioridades com liderança','Registrar direcionadores do ciclo'],
    a2:['Consolidar evidências de clima','Estruturar direcionadores culturais','Preparar material de validação','Validar com liderança','Incorporar ajustes','Publicar versão final'],
    a3:['Mapear processos críticos','Definir responsáveis e entradas','Desenhar fluxo prioritário','Validar dependências','Documentar versão inicial','Revisar com cliente','Publicar versão final'],
  };
  const names = base[deliverable.id] || Array.from({length:deliverable.taskCount||3},(_,i)=>`Etapa ${i+1} de ${deliverable.title}`);
  const finalDate = deliverable.dueAt ? new Date(deliverable.dueAt) : null;
  return names.map((title,index)=>{
    const due = finalDate ? new Date(finalDate) : null;
    if (due) due.setDate(due.getDate() - Math.max(0,(names.length-index-1)*2));
    return { id:`preview-task-${deliverable.id}-${index}`, protocol:`CALI-TSK-PREVIEW-${String(index+1).padStart(3,'0')}`, deliverableId:deliverable.id, title,
      status:index<(deliverable.taskDone||0)?'done':index===(deliverable.taskDone||0)&&deliverable.status==='in_progress'?'in_progress':'todo',
      dueAt:due?.toISOString()||deliverable.dueAt, clientVisible:index===names.length-1, estimatedMinutes:60+(index%3)*30, sortOrder:index+1 };
  });
}

/* Equipe CALI (Partner): usa esta mesma tela com as funções "partner_*" do banco. Não cria, não edita, não exclui e não envia
   ao cliente; muda a situação entre Não iniciado / Em andamento / Stand by / Revisão interna e pede o envio à administradora. */
export type StaffProjectsScope = { companies: { id:string; display_name:string; logo_url:string|null; service_type?:string|null; service_plan?:string|null }[] };
const StaffModeContext = createContext(false);
const staffStatuses: DeliverableStatus[] = ['not_started','in_progress','standby','internal_review'];
const staffLocked = (status: DeliverableStatus) => !staffStatuses.includes(status);
function ProjectsFrame({ staff, children }: { staff:boolean; children:ReactNode }) { return staff ? <>{children}</> : <Shell role="admin">{children}</Shell>; }
function StatusSelect({ item, onChange, compact=false }: { item:ProjectDeliverable; onChange:(status:DeliverableStatus)=>void; compact?:boolean }) {
  const staffMode = useContext(StaffModeContext);
  if (staffMode) return <label className={`inline-status-select-v3 ${statusTone[item.status]} ${compact?'compact':''}`} onClick={(e)=>e.stopPropagation()}>
    <span className="status-dot-v3"/><select aria-label={`Status de ${item.title}`} value={item.status} disabled={staffLocked(item.status)} title={staffLocked(item.status)?'Só a Patricia altera esta situação':undefined} onChange={(e)=>onChange(e.target.value as DeliverableStatus)}>
      {(staffLocked(item.status)?[item.status]:staffStatuses).map((status)=><option key={status} value={status}>{status==='internal_review'?'Revisão da Patricia':deliverableLabels[status]}</option>)}
    </select>
  </label>;
  return <label className={`inline-status-select-v3 ${statusTone[item.status]} ${compact?'compact':''}`} onClick={(e)=>e.stopPropagation()}>
    <span className="status-dot-v3"/><select aria-label={`Status de ${item.title}`} value={item.status} disabled={item.status==='approved'} onChange={(e)=>onChange(e.target.value as DeliverableStatus)}>
      {statuses.map((status)=><option key={status} value={status}>{deliverableLabels[status]}</option>)}
    </select>
  </label>;
}

export function StaffProjectsPage({ companies }: StaffProjectsScope) { return <StaffModeContext.Provider value={true}><AdminProjectsPageV3 staff={{ companies }} /></StaffModeContext.Provider>; }
export function AdminProjectsPageV3({ staff }: { staff?: StaffProjectsScope } = {}) {
  useEffect(()=>{ if(!staff)return; const refresh=()=>void loadWorkspace(); window.addEventListener('cali:staff-refresh',refresh); return()=>window.removeEventListener('cali:staff-refresh',refresh); },[staff]);
  const [openTaskId,setOpenTaskId] = useState<string|null>(null);
  const [staffOpenFronts,setStaffOpenFronts] = useState<Record<string,boolean>>({});
  const [staffChat,setStaffChat] = useState<{id:string;body:string;authorId:string|null;actor:string;createdAt:string}[]>([]); const [staffPeople,setStaffPeople] = useState<Record<string,{name:string;photo:string}>>({}); const [staffUserId,setStaffUserId] = useState(''); const [staffReviewPending,setStaffReviewPending] = useState<Record<string,boolean>>({}); const [staffNotice,setStaffNotice] = useState('');
  useEffect(()=>{ if(!staffNotice)return; const timer=window.setTimeout(()=>setStaffNotice(''),4500); return()=>window.clearTimeout(timer); },[staffNotice]);
  const [projects,setProjects] = useState<WorkspaceProject[]>(previewProjects);
  const [selectedProjectId,setSelectedProjectId] = useState(previewProjects[0].id);
  const [fronts,setFronts] = useState<ProjectFront[]>(previewProjects.flatMap(previewFronts));
  const [tasks,setTasks] = useState<TaskItem[]>(previewProjects.flatMap((p)=>p.deliverables.flatMap(previewTasks)));
  const [comments,setComments] = useState<CommentItem[]>([]);
  const [history,setHistory] = useState<HistoryItem[]>([]);
  const [projectView,setProjectView] = useState<ProjectView>('roadmap');
  const [deliverableView,setDeliverableView] = useState<DeliverableView>('list');
  const [query,setQuery] = useState('');
  const [statusFilter,setStatusFilter] = useState<'all'|ProjectPlanningStatus>('all');
  const [selectedDeliverable,setSelectedDeliverable] = useState<ProjectDeliverable|null>(null);
  const [detailTab,setDetailTab] = useState<DetailTab>('overview');
  const [conversationChannel,setConversationChannel] = useState<ConversationChannel>('client');
  const [messageText,setMessageText] = useState('');
  const [messageFile,setMessageFile] = useState<File|null>(null);
  const [taskForm,setTaskForm] = useState<TaskForm>(emptyTaskForm());
  const [showTaskForm,setShowTaskForm] = useState(false);
  const [projectModal,setProjectModal] = useState(false);
  const [projectForm,setProjectForm] = useState<ProjectForm>(()=>emptyProjectForm());
  const [frontDrafts,setFrontDrafts] = useState<FrontDraft[]>([{id:'f1',name:'',objective:'',monthStart:1,monthEnd:1}]);
  const [frontModal,setFrontModal] = useState(false);
  const [frontForm,setFrontForm] = useState<FrontForm>(emptyFrontForm());
  const [deliverableModal,setDeliverableModal] = useState(false);
  const [editingDeliverable,setEditingDeliverable] = useState<ProjectDeliverable|null>(null);
  const [deliverableForm,setDeliverableForm] = useState<DeliverableForm>(emptyDeliverableForm());
  const [pendingStatus,setPendingStatus] = useState<PendingStatus>(null);
  const [statusReason,setStatusReason] = useState('');
  const [confirmDelete,setConfirmDelete] = useState(false);
  // Equipe CALI: quem é quem na conversa (nome e foto), pedidos de aprovação pendentes e mensagens do canal aberto.
  useEffect(()=>{ if(!staff||!supabase)return; let alive=true; void (async()=>{
    const [{data:auth},profiles,admins,pending]=await Promise.all([supabase.auth.getUser(),supabase.from('profiles').select('id,full_name,avatar_url'),supabase.rpc('staff_admin_contacts'),supabase.from('staff_review_requests').select('entity_id').eq('kind','deliverable').eq('status','pending')]);
    if(!alive)return; setStaffUserId(auth.user?.id||''); setStaffReviewPending(Object.fromEntries(((pending.data||[]) as any[]).map((row)=>[row.entity_id,true])));
    const people=[...((profiles.data||[]) as any[]),...((admins.data||[]) as any[])]; const resolved=await Promise.all(people.map(async(row)=>[row.id,{name:row.full_name||'',photo:row.avatar_url?(await resolveWorkspaceMedia(row.avatar_url,3600))||'':''}] as [string,{name:string;photo:string}]));
    if(alive)setStaffPeople(Object.fromEntries(resolved));
  })(); return()=>{alive=false;}; },[Boolean(staff)]);
  useEffect(()=>{ if(!staff||!selectedDeliverable||detailTab!=='conversation'){ return; } void staffLoadChat(selectedDeliverable.id,conversationChannel); },[Boolean(staff),selectedDeliverable?.id,detailTab,conversationChannel]);
  const [showAdjustment,setShowAdjustment] = useState(false);
  const [adjustmentReason,setAdjustmentReason] = useState('');
  const [adjustmentImpact,setAdjustmentImpact] = useState(0);
  const [activeTimer,setActiveTimer] = useState<ActiveTimer>(null);
  const [timerSeconds,setTimerSeconds] = useState(0);
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement|null>(null);

  const selectedProject = projects.find((p)=>p.id===selectedProjectId) || projects[0];
  const selectedFronts = fronts.filter((f)=>f.projectId===selectedProject?.id && f.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder);
  const selectedTasks = selectedDeliverable ? tasks.filter((t)=>t.deliverableId===selectedDeliverable.id && t.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder) : [];

  useEffect(()=>{ void loadWorkspace(); },[]);
  useEffect(()=>{
    const active=projectModal||frontModal||deliverableModal||Boolean(selectedDeliverable)||Boolean(pendingStatus)||confirmDelete;
    document.body.classList.toggle('workspace-modal-open',active);
    return()=>document.body.classList.remove('workspace-modal-open');
  },[projectModal,frontModal,deliverableModal,selectedDeliverable,pendingStatus,confirmDelete]);
  useEffect(()=>{
    if (!activeTimer) { setTimerSeconds(0); return; }
    const tick=()=>setTimerSeconds(Math.max(0,Math.floor((Date.now()-new Date(activeTimer.startedAt).getTime())/1000)));
    tick(); const id=window.setInterval(tick,1000); return()=>window.clearInterval(id);
  },[activeTimer]);
  useEffect(()=>{ if(selectedDeliverable) void loadDeliverableContext(selectedDeliverable.id); },[selectedDeliverable?.id]);

  async function loadWorkspace() {
    if(!supabase){ setLoading(false); return; }
    try {
      const [{data:companyRows},{data:projectRows},{data:frontRows},{data:deliverableRows},{data:taskRows},{data:hourRows},{data:timerRows}] = await Promise.all([
        staff ? Promise.resolve({ data: staff.companies.map((c)=>({ id:c.id, display_name:c.display_name, logo_url:c.logo_url, service_type:c.service_type||null, service_plan:c.service_plan||null })), error: null }) as any : supabase.from('companies').select('id,display_name,logo_url,service_type,service_plan').neq('status','closed').order('display_name'),
        supabase.from('projects').select('id,protocol,company_id,name,description,status,planning_status,start_date,target_end_date,client_response_business_days,adjustment_limit').order('created_at',{ascending:false}),
        supabase.from('project_workstreams').select('id,protocol,project_id,company_id,name,objective,roadmap_month_start,roadmap_month_end,status,sort_order').order('sort_order'),
        supabase.from('deliverables').select('id,protocol,code,project_id,company_id,title,description,status,workstream,workstream_id,complexity,roadmap_month_start,roadmap_month_end,due_at,original_due_at,client_response_due_at,client_delay_business_days,adjustment_count,rebriefing_required,is_document,sort_order,client_visible').order('sort_order'),
        supabase.from('deliverable_tasks').select('id,protocol,deliverable_id,title,description,status,due_at,client_visible,estimated_minutes,sort_order').order('sort_order'),
        supabase.from('hour_entries').select('deliverable_id,minutes'),
        supabase.from('work_timers').select('id,deliverable_id,task_id,started_at,status').eq('status','active').order('started_at',{ascending:false}).limit(1),
      ]);
      if(!projectRows?.length) return;
      const companyMap=new Map((companyRows||[]).map((r:any)=>[r.id,r]));
      const taskMap=new Map<string,TaskItem[]>();
      (taskRows||[]).forEach((r:any)=>{
        const item:TaskItem={id:r.id,protocol:r.protocol||'—',deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0),complexity:r.complexity||null,isDocument:Boolean(r.is_document)} as any;
        taskMap.set(r.deliverable_id,[...(taskMap.get(r.deliverable_id)||[]),item]);
      });
      const hours=new Map<string,number>(); (hourRows||[]).forEach((r:any)=>hours.set(r.deliverable_id,(hours.get(r.deliverable_id)||0)+Number(r.minutes||0)/60));
      const nextProjects:WorkspaceProject[]=projectRows.map((row:any)=>{
        const c:any=companyMap.get(row.company_id)||{};
        const ds:ProjectDeliverable[]=(deliverableRows||[]).filter((d:any)=>d.project_id===row.id).map((d:any)=>{
          const related=taskMap.get(d.id)||[];
          return { id:d.id,protocol:d.protocol||d.code||'—',title:d.title,description:d.description,status:d.status as DeliverableStatus,workstream:d.workstream||'Frente não definida',complexity:(d.complexity||'MC2') as MaterialComplexity,roadmapMonthStart:d.roadmap_month_start,roadmapMonthEnd:d.roadmap_month_end,dueAt:d.due_at,originalDueAt:d.original_due_at,clientResponseDueAt:d.client_response_due_at,clientDelayBusinessDays:Number(d.client_delay_business_days||0),adjustmentCount:Number(d.adjustment_count||0),rebriefingRequired:Boolean(d.rebriefing_required),isDocument:Boolean(d.is_document),hours:hours.get(d.id)||0,taskCount:related.length,taskDone:related.filter((t)=>t.status==='done').length,sortOrder:Number(d.sort_order||0),clientVisible:Boolean(d.client_visible),workstreamId:d.workstream_id } as ProjectDeliverable & {workstreamId?:string};
        });
        return { id:row.id,protocol:row.protocol||'—',companyId:row.company_id,company:c.display_name||'Cliente',companyLogo:c.logo_url,name:row.name,service:servicePlanLabel(c.service_type,c.service_plan),description:row.description,planningStatus:(row.planning_status||(row.status==='active'?'active':'draft')) as ProjectPlanningStatus,startDate:row.start_date,endDate:row.target_end_date,clientResponseBusinessDays:Number(row.client_response_business_days||3),adjustmentLimit:Number(row.adjustment_limit||3),deliverables:ds };
      });
      const nextFronts:ProjectFront[]=(frontRows||[]).map((r:any)=>({id:r.id,protocol:r.protocol||'—',projectId:r.project_id,companyId:r.company_id,name:r.name,objective:r.objective||'',monthStart:r.roadmap_month_start,monthEnd:r.roadmap_month_end,status:r.status,sortOrder:Number(r.sort_order||0),complexity:r.complexity||null,isDocument:Boolean(r.is_document)} as any));
      setProjects(nextProjects); setFronts(nextFronts); setTasks((taskRows||[]).map((r:any)=>({id:r.id,protocol:r.protocol||'—',deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0),complexity:r.complexity||null,isDocument:Boolean(r.is_document)} as any)));
      const targetId = new URLSearchParams(window.location.search).get('deliverable');
      const targetProjectId = new URLSearchParams(window.location.search).get('project');
      const targetProject = targetId ? nextProjects.find((project) => project.deliverables.some((item) => item.id === targetId)) : null;
      const targetDeliverable = targetProject?.deliverables.find((item) => item.id === targetId);
      if (targetProject && targetDeliverable) { setSelectedProjectId(targetProject.id); setSelectedDeliverable(targetDeliverable); setDetailTab('conversation'); }
      if (!targetProject && targetProjectId) setSelectedProjectId(nextProjects.some((p)=>p.id===targetProjectId) ? targetProjectId : nextProjects[0].id);
      else if (!targetProject) setSelectedProjectId((current)=>nextProjects.some((p)=>p.id===current)?current:nextProjects[0].id);
      if(timerRows?.[0]) setActiveTimer({id:timerRows[0].id,deliverableId:timerRows[0].deliverable_id,taskId:timerRows[0].task_id||null,startedAt:timerRows[0].started_at,preview:false});
    } catch(error){ console.error('Falha ao carregar projetos',error); }
    finally { setLoading(false); }
  }

  async function loadDeliverableContext(deliverableId:string) {
    if(!supabase || !isUuid(deliverableId)) {
      setComments([
        {id:'p1',body:'Material organizado e pronto para validação.',clientVisible:true,createdAt:'2026-08-27T12:00:00-03:00',author:'Patrícia · CALI'},
        {id:'p2',body:'Revisar dependência com a próxima frente antes de publicar.',clientVisible:false,createdAt:'2026-08-27T09:00:00-03:00',author:'Patrícia · CALI'},
      ]);
      setHistory([{id:'h1',title:'Entregável criado',detail:'Incluído no cronograma e vinculado à frente.',createdAt:'2026-08-20T10:00:00-03:00'},{id:'h2',title:'Status alterado',detail:`Status atual: ${deliverableLabels[selectedDeliverable?.status||'not_started']}.`,createdAt:'2026-08-27T09:00:00-03:00'}]); return;
    }
    const [{data:commentRows},{data:statusRows}] = await Promise.all([
      supabase.from('comments').select('id,body,client_visible,created_at').eq('target_type','deliverable').eq('target_id',deliverableId).order('created_at'),
      supabase.from('deliverable_status_history').select('*').eq('deliverable_id',deliverableId).order('created_at',{ascending:false}),
      supabase.auth.getUser(),
    ]);

    setComments((commentRows||[]).map((r:any)=>{
      return {id:r.id,body:r.body,clientVisible:Boolean(r.client_visible),createdAt:r.created_at,author:r.client_visible?'Conversa com cliente':'Nota interna CALI'};
    }));
    setHistory((statusRows||[]).map((r:any)=>({id:String(r.id),title:`${r.from_status?deliverableLabels[r.from_status as DeliverableStatus]+' → ':''}${deliverableLabels[r.to_status as DeliverableStatus]||r.to_status}`,detail:r.note||'Mudança registrada no fluxo.',createdAt:r.created_at})));
  }

  const filteredProjects=useMemo(()=>projects.filter((p)=>{const text=`${p.company} ${p.name} ${p.protocol} ${p.service}`.toLowerCase(); return (!query||text.includes(query.toLowerCase()))&&(statusFilter==='all'||p.planningStatus===statusFilter);}),[projects,query,statusFilter]);
  const summary=useMemo(()=>({active:projects.filter((p)=>p.planningStatus==='active').length,waiting:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>d.status==='client_review').length,0),rebriefing:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>d.rebriefingRequired||d.status==='rebriefing').length,0),impacted:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>Boolean(d.originalDueAt)||d.clientDelayBusinessDays>0).length,0)}),[projects]);
  const maxMonth=Math.max(8,...selectedFronts.map((f)=>f.monthEnd||f.monthStart||1),...selectedProject.deliverables.map((d)=>d.roadmapMonthEnd||d.roadmapMonthStart||1));
  const months=Array.from({length:maxMonth},(_,i)=>i+1);

  function openNewProject(){ setProjectForm(emptyProjectForm(selectedProject?.companyId||'')); setFrontDrafts([{id:crypto.randomUUID(),name:'',objective:'',monthStart:1,monthEnd:1}]); setProjectModal(true); }
  function addFrontDraft(){ setFrontDrafts((c)=>[...c,{id:crypto.randomUUID(),name:'',objective:'',monthStart:1,monthEnd:1}]); }
  function patchFrontDraft(id:string,patch:Partial<FrontDraft>){ setFrontDrafts((c)=>c.map((f)=>f.id===id?{...f,...patch}:f)); }
  function removeFrontDraft(id:string){ setFrontDrafts((c)=>c.length===1?c:c.filter((f)=>f.id!==id)); }

  async function createProject(event:FormEvent){
    event.preventDefault(); if(!projectForm.name.trim()||!projectForm.companyId) return; setSaving(true);
    try{
      const validFronts=frontDrafts.filter((f)=>f.name.trim());
      if(staff){ const ok=await staffSubmitChange('project_create',`Novo projeto: ${projectForm.name.trim()}`,{project:{company_id:projectForm.companyId,name:projectForm.name.trim(),status:'planned',planning_status:'draft',start_date:projectForm.startDate||null,target_end_date:projectForm.endDate||null,roadmap_start_date:projectForm.startDate||null,roadmap_end_date:projectForm.endDate||null,client_response_business_days:projectForm.clientResponseBusinessDays,adjustment_limit:3},fronts:validFronts.map((f,index)=>({name:f.name.trim(),objective:f.objective.trim()||null,roadmap_month_start:f.monthStart,roadmap_month_end:f.monthEnd,sort_order:index+1}))},projectForm.companyId); if(ok)setProjectModal(false); return; }
      if(supabase&&isUuid(projectForm.companyId)){
        const {data,error}=await supabase.from('projects').insert({company_id:projectForm.companyId,name:projectForm.name.trim(),status:'planned',planning_status:'draft',start_date:projectForm.startDate||null,target_end_date:projectForm.endDate||null,roadmap_start_date:projectForm.startDate||null,roadmap_end_date:projectForm.endDate||null,client_response_business_days:projectForm.clientResponseBusinessDays,adjustment_limit:3}).select('id').single();
        if(error) throw error;
        if(validFronts.length&&data?.id){ const {error:frontError}=await supabase.from('project_workstreams').insert(validFronts.map((f,index)=>({company_id:projectForm.companyId,project_id:data.id,name:f.name.trim(),objective:f.objective.trim()||null,roadmap_month_start:f.monthStart,roadmap_month_end:f.monthEnd,sort_order:index+1}))); if(frontError) throw frontError; }
        setProjectModal(false); await loadWorkspace(); if(data?.id)setSelectedProjectId(data.id);
      } else {
        const company=projects.find((p)=>p.companyId===projectForm.companyId)?.company||'Cliente';
        const local:WorkspaceProject={id:`preview-project-${Date.now()}`,protocol:`CALI-PRJ-PREVIEW-${Date.now().toString().slice(-5)}`,companyId:projectForm.companyId,company,name:projectForm.name.trim(),service:projects.find((p)=>p.companyId===projectForm.companyId)?.service||'Serviço CALI',planningStatus:'draft',startDate:projectForm.startDate||null,endDate:projectForm.endDate||null,clientResponseBusinessDays:projectForm.clientResponseBusinessDays,adjustmentLimit:3,deliverables:[]};
        const localFronts=validFronts.map((f,index):ProjectFront=>({id:`preview-front-${Date.now()}-${index}`,protocol:`CALI-FRT-PREVIEW-${index+1}`,projectId:local.id,companyId:local.companyId,name:f.name,objective:f.objective,monthStart:f.monthStart,monthEnd:f.monthEnd,status:'planned',sortOrder:index+1}));
        setProjects((c)=>[local,...c]); setFronts((c)=>[...c,...localFronts]); setSelectedProjectId(local.id); setProjectModal(false);
      }
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  async function createFront(event:FormEvent){
    event.preventDefault(); if(!frontForm.name.trim())return; setSaving(true);
    try{
      if(staff){ const ok=await staffSubmitChange('front_create',`Nova frente em ${selectedProject.name}: ${frontForm.name.trim()}`,{row:{company_id:selectedProject.companyId,project_id:selectedProject.id,name:frontForm.name.trim(),objective:frontForm.objective.trim()||null,roadmap_month_start:frontForm.monthStart,roadmap_month_end:frontForm.monthEnd,sort_order:selectedFronts.length+1}},selectedProject.companyId); if(ok){ setFrontModal(false); setFrontForm(emptyFrontForm()); } return; }
      if(supabase&&isUuid(selectedProject.id)){ const {error}=await supabase.from('project_workstreams').insert({company_id:selectedProject.companyId,project_id:selectedProject.id,name:frontForm.name.trim(),objective:frontForm.objective.trim()||null,roadmap_month_start:frontForm.monthStart,roadmap_month_end:frontForm.monthEnd,sort_order:selectedFronts.length+1}); if(error)throw error; await loadWorkspace(); }
      else setFronts((c)=>[...c,{id:`preview-front-${Date.now()}`,protocol:`CALI-FRT-PREVIEW-${Date.now().toString().slice(-4)}`,projectId:selectedProject.id,companyId:selectedProject.companyId,name:frontForm.name.trim(),objective:frontForm.objective.trim(),monthStart:frontForm.monthStart,monthEnd:frontForm.monthEnd,status:'planned',sortOrder:selectedFronts.length+1}]);
      setFrontModal(false); setFrontForm(emptyFrontForm());
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  function openDeliverable(front?:ProjectFront,item?:ProjectDeliverable){
    setEditingDeliverable(item||null);
    const relatedFront=item ? selectedFronts.find((f)=>f.name===item.workstream || (item as any).workstreamId===f.id) : front;
    setDeliverableForm(item?{title:item.title,description:item.description||'',frontId:relatedFront?.id||'',complexity:item.complexity,monthStart:item.roadmapMonthStart||relatedFront?.monthStart||1,monthEnd:item.roadmapMonthEnd||relatedFront?.monthEnd||1,dueDate:item.dueAt?.slice(0,10)||'',isDocument:item.isDocument,clientVisible:item.clientVisible}:emptyDeliverableForm(front?.id||''));
    setDeliverableModal(true);
  }

  async function saveDeliverable(event:FormEvent){
    event.preventDefault(); if(!deliverableForm.title.trim())return; const front=selectedFronts.find((f)=>f.id===deliverableForm.frontId); if(!front)return; setSaving(true);
    try{
      if(supabase&&isUuid(selectedProject.id)){
        const payload={title:deliverableForm.title.trim(),description:deliverableForm.description.trim()||null,workstream:front.name,workstream_id:isUuid(front.id)?front.id:null,complexity:deliverableForm.complexity,roadmap_month_start:deliverableForm.monthStart,roadmap_month_end:deliverableForm.monthEnd,due_at:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,is_document:deliverableForm.isDocument,client_visible:deliverableForm.clientVisible};
        if(staff){ const ok=editingDeliverable&&isUuid(editingDeliverable.id)?await staffSubmitChange('deliverable_update',`Editar entregável: ${editingDeliverable.title}`,{id:editingDeliverable.id,row:payload},selectedProject.companyId):await staffSubmitChange('deliverable_create',`Novo entregável em ${selectedProject.name}: ${payload.title}`,{row:{...payload,company_id:selectedProject.companyId,project_id:selectedProject.id,status:'not_started',priority:'normal',sort_order:selectedProject.deliverables.length+1}},selectedProject.companyId); if(ok){ setDeliverableModal(false); setEditingDeliverable(null); } return; }
        const result=editingDeliverable&&isUuid(editingDeliverable.id)?await supabase.from('deliverables').update(payload).eq('id',editingDeliverable.id):await supabase.from('deliverables').insert({...payload,company_id:selectedProject.companyId,project_id:selectedProject.id,status:'not_started',priority:'normal',sort_order:selectedProject.deliverables.length+1}); if(result.error)throw result.error; await loadWorkspace();
      } else if(editingDeliverable){ setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,deliverables:p.deliverables.map((d)=>d.id===editingDeliverable.id?{...d,title:deliverableForm.title,description:deliverableForm.description,workstream:front.name,complexity:deliverableForm.complexity,roadmapMonthStart:deliverableForm.monthStart,roadmapMonthEnd:deliverableForm.monthEnd,dueAt:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,isDocument:deliverableForm.isDocument,clientVisible:deliverableForm.clientVisible}:d)}:p)); }
      else { const local:ProjectDeliverable={id:`preview-del-${Date.now()}`,protocol:`CALI-ENT-PREVIEW-${Date.now().toString().slice(-5)}`,title:deliverableForm.title,description:deliverableForm.description,status:'not_started',workstream:front.name,complexity:deliverableForm.complexity,roadmapMonthStart:deliverableForm.monthStart,roadmapMonthEnd:deliverableForm.monthEnd,dueAt:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,clientDelayBusinessDays:0,adjustmentCount:0,rebriefingRequired:false,isDocument:deliverableForm.isDocument,hours:0,taskCount:0,taskDone:0,sortOrder:selectedProject.deliverables.length+1,clientVisible:deliverableForm.clientVisible}; setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,deliverables:[...p.deliverables,local]}:p)); }
      setDeliverableModal(false); setEditingDeliverable(null);
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  function statusChoice(item:ProjectDeliverable,next:DeliverableStatus){
    if(next===item.status||item.status==='approved')return;
    if(next==='adjustment_requested'){
      setSelectedDeliverable(item); setDetailTab('overview'); setShowAdjustment(true); return;
    }
    if(['standby','rebriefing','cancelled'].includes(next)){
      setPendingStatus({item,status:next}); setStatusReason(''); return;
    }
    void persistStatus(item,next,'');
  }

  async function persistStatus(item:ProjectDeliverable,next:DeliverableStatus,note:string){
    if(item.status==='approved'||next===item.status)return;
    if(supabase&&isUuid(item.id)){
      const {error}=await supabase.rpc(staff?'partner_change_deliverable_status':'change_deliverable_status',{p_deliverable_id:item.id,p_status:next,p_note:note||null});
      if(error){console.error(error);return;}
      await loadWorkspace();
      if(selectedDeliverable?.id===item.id) await loadDeliverableContext(item.id);
    } else {
      setProjects((c)=>c.map((p)=>({...p,planningStatus:next==='rebriefing'&&p.id===selectedProject.id?'rebriefing':p.planningStatus,deliverables:p.deliverables.map((d)=>d.id===item.id?{...d,status:next,rebriefingRequired:next==='rebriefing'?true:d.rebriefingRequired}:d)})));
      setHistory((c)=>[{id:`preview-history-${Date.now()}`,title:`${deliverableLabels[item.status]} → ${deliverableLabels[next]}`,detail:note||'Mudança registrada no fluxo.',createdAt:new Date().toISOString()},...c]);
    }
    setSelectedDeliverable((current)=>current?.id===item.id?{...current,status:next,rebriefingRequired:next==='rebriefing'?true:current.rebriefingRequired}:current);
  }

  async function confirmPendingStatus(){ if(!pendingStatus||!statusReason.trim())return; if(staff&&pendingStatus.status==='cancelled'){ const item=pendingStatus.item; const ok=await staffSubmitChange('deliverable_cancel',`Cancelar entregável: ${item.title}`,{id:item.id,reason:statusReason.trim()},selectedProject.companyId); if(ok){ setPendingStatus(null); setStatusReason(''); } return; } const current=pendingStatus; setPendingStatus(null); await persistStatus(current.item,current.status,statusReason.trim()); setStatusReason(''); }

  async function requestAdjustment(){
    if(!selectedDeliverable||!adjustmentReason.trim())return; const next=selectedDeliverable.adjustmentCount+1; const rebrief=next>(selectedProject.adjustmentLimit||3);
    if(supabase&&isUuid(selectedDeliverable.id)){ const {error}=await supabase.rpc('request_deliverable_adjustment',{p_deliverable_id:selectedDeliverable.id,p_reason:adjustmentReason.trim(),p_impact_business_days:adjustmentImpact}); if(error)console.error(error); else { await loadWorkspace(); await loadDeliverableContext(selectedDeliverable.id); } }
    else setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,planningStatus:rebrief?'rebriefing':p.planningStatus,deliverables:p.deliverables.map((d)=>d.id===selectedDeliverable.id?{...d,status:rebrief?'rebriefing':'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:d)}:p));
    setSelectedDeliverable((c)=>c?{...c,status:rebrief?'rebriefing':'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:c); setAdjustmentReason('');setAdjustmentImpact(0);setShowAdjustment(false);
  }

  async function sendScheduleToClient(){ if(!selectedProject)return; if(supabase&&isUuid(selectedProject.id)){await supabase.from('projects').update({planning_status:'client_review'}).eq('id',selectedProject.id);await loadWorkspace();}else setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,planningStatus:'client_review'}:p)); }

  async function addTask(event:FormEvent){
    event.preventDefault(); if(!selectedDeliverable||!taskForm.title.trim())return; const estimated=Math.round((Number(taskForm.estimatedHours.replace(',','.'))||0)*60); setSaving(true);
    try{
      if(taskForm.dueDate&&selectedDeliverable.dueAt&&taskForm.dueDate>String(selectedDeliverable.dueAt).slice(0,10)){ setStaffNotice(`O prazo da subtarefa não pode passar do prazo do entregável (${formatProjectDate(selectedDeliverable.dueAt)}).`); return; }
      if(staff){ if(!supabase)return; const created=await supabase.rpc('partner_create_task',{p_deliverable_id:selectedDeliverable.id,p_title:taskForm.title.trim(),p_description:taskForm.description.trim()||null,p_due_at:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,p_estimated_minutes:estimated,p_client_visible:taskForm.clientVisible,p_complexity:taskForm.complexity,p_is_document:taskForm.isDocument}); if(created.error){ setStaffNotice(created.error.message||'Não foi possível criar a subtarefa.'); return; } setTaskForm(emptyTaskForm()); setShowTaskForm(false); setStaffNotice('Subtarefa criada.'); await loadWorkspace(); return; }
      if(supabase&&isUuid(selectedDeliverable.id)){ const {error}=await supabase.from('deliverable_tasks').insert({company_id:selectedProject.companyId,deliverable_id:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description.trim()||null,status:'todo',due_at:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,client_visible:taskForm.clientVisible,estimated_minutes:estimated,sort_order:selectedTasks.length+1,complexity:taskForm.complexity,is_document:taskForm.isDocument}); if(error)throw error; const {data}=await supabase.from('deliverable_tasks').select('*').eq('deliverable_id',selectedDeliverable.id).order('sort_order'); setTasks((current)=>[...current.filter((t)=>t.deliverableId!==selectedDeliverable.id),...(data||[]).map((r:any)=>({id:r.id,protocol:r.protocol,deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0),complexity:r.complexity||null,isDocument:Boolean(r.is_document)} as any))]); }
      else setTasks((c)=>[...c,{id:`preview-task-${Date.now()}`,protocol:`CALI-TSK-PREVIEW-${Date.now().toString().slice(-4)}`,deliverableId:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description,status:'todo',dueAt:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,clientVisible:taskForm.clientVisible,estimatedMinutes:estimated,sortOrder:selectedTasks.length+1}]);
      setTaskForm(emptyTaskForm());setShowTaskForm(false);
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  async function toggleTask(task:TaskItem){ const next=task.status==='done'?'todo':'done'; if(staff){ if(task.status==='done'){ setStaffNotice('Etapa já concluída. Só a Patricia pode reabrir.'); return; } if(selectedDeliverable)await staffSubmitChange('task_complete',`Concluir subtarefa em ${selectedDeliverable.title}: ${task.title}`,{id:task.id},selectedProject.companyId); return; } if(supabase&&isUuid(task.id)){await supabase.from('deliverable_tasks').update({status:next,completed_at:next==='done'?new Date().toISOString():null}).eq('id',task.id);} setTasks((c)=>c.map((t)=>t.id===task.id?{...t,status:next}:t)); }

  async function staffOpenAttachment(path:string){ if(!supabase)return; const {data,error}=await supabase.storage.from('cali-workspace-private').createSignedUrl(path,300); if(error||!data?.signedUrl){ setStaffNotice('Não foi possível abrir este anexo agora.'); return; } window.open(data.signedUrl,'_blank','noopener,noreferrer'); }
  async function staffLoadChat(deliverableId:string, channel:ConversationChannel){
    if(!supabase||!staff)return;
    const result=await supabase.from('comments').select('id,body,author_user_id,source_actor,created_at').eq('target_type','deliverable').eq('target_id',deliverableId).eq('client_visible',channel==='client').order('created_at');
    setStaffChat(((result.data||[]) as any[]).map((row)=>({id:row.id,body:row.body,authorId:row.author_user_id,actor:row.source_actor||'admin',createdAt:row.created_at})));
  }
  /* Equipe CALI: criar, editar, excluir ou cancelar NÃO grava direto — vira um pedido para a administradora autorizar. */
  async function staffSubmitChange(action:string,title:string,payload:Record<string,unknown>,companyId:string){
    if(!supabase||!staff)return false;
    const {data:auth}=await supabase.auth.getUser();
    const {error}=await supabase.from('staff_review_requests').insert({staff_user_id:auth.user?.id,company_id:companyId,kind:'change',title:title.slice(0,200),payload:{action,...payload}});
    if(error){ setStaffNotice('Não foi possível enviar o pedido. Tente de novo.'); return false; }
    setStaffNotice('Pedido enviado. Vale depois da aprovação.'); return true;
  }
  async function staffRequestReview(){
    if(!supabase||!staff||!selectedDeliverable)return;
    const {error}=await supabase.rpc('partner_request_deliverable_review',{p_deliverable_id:selectedDeliverable.id,p_note:null});
    if(error){ setStaffNotice(error.message||'Não foi possível enviar para aprovação.'); return; }
    setStaffReviewPending((c)=>({...c,[selectedDeliverable.id]:true})); setStaffNotice('Entregável enviado para a Patricia aprovar.'); await loadWorkspace();
  }
  async function sendMessage(){
    if(staff){ if(!supabase||!selectedDeliverable||!selectedProject||(!messageText.trim()&&!messageFile))return; const toClient=conversationChannel==='client'; let attachmentNote='';
      if(messageFile){ const allowed=['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        if(!allowed.includes(messageFile.type)){ setStaffNotice('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; } if(messageFile.size>10*1024*1024){ setStaffNotice('O anexo pode ter até 10 MB.'); return; }
        const safeName=messageFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,90)||'arquivo'; const path=`deliverable-chat/${selectedProject.companyId}/${selectedDeliverable.id}/${staffUserId}/${Date.now()}-${safeName}`;
        const upload=await supabase.storage.from('cali-workspace-private').upload(path,messageFile,{contentType:messageFile.type,upsert:false});
        if(upload.error){ setStaffNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.'); return; } attachmentNote=`\n[[arquivo|${encodeURIComponent(messageFile.name)}|${encodeURIComponent(path)}|${encodeURIComponent(messageFile.type)}|${messageFile.size}]]`; }
      const {error}=await supabase.rpc('partner_post_deliverable_comment',{p_deliverable_id:selectedDeliverable.id,p_body:`${messageText.trim()}${attachmentNote}`.trim(),p_client_visible:toClient}); if(error){ setStaffNotice(error.message||'Não foi possível enviar a mensagem.'); return; } setMessageText(''); setMessageFile(null); await staffLoadChat(selectedDeliverable.id,conversationChannel); return; }
    if(!selectedDeliverable||(!messageText.trim()&&!messageFile))return; const body=messageText.trim()||`Anexo: ${messageFile?.name}`; const visible=conversationChannel==='client';
    if(supabase&&isUuid(selectedDeliverable.id)){ const {data:user}=await supabase.auth.getUser(); let attachmentNote=''; if(messageFile){ const prepared=messageFile.type.startsWith('image/')?await optimizeImageForUpload(messageFile,'attachment'):{blob:messageFile,contentType:messageFile.type||'application/octet-stream',extension:messageFile.name.split('.').pop()?.toLowerCase()||'bin'}; const safeName=messageFile.name.replace(/[^A-Za-z0-9._-]/g,'_'); const storedName=messageFile.type.startsWith('image/')?`${safeName.replace(/\.[^.]+$/,'')}.webp`:safeName; const path=`${selectedProject.companyId}/deliverables/${selectedDeliverable.id}/${Date.now()}-${storedName}`; const upload=await supabase.storage.from('cali-workspace-private').upload(path,prepared.blob,{contentType:prepared.contentType,cacheControl:messageFile.type.startsWith('image/')?'31536000':'3600'}); if(!upload.error){await supabase.from('files').insert({company_id:selectedProject.companyId,project_id:selectedProject.id,deliverable_id:selectedDeliverable.id,title:messageFile.name,category:'deliverable',storage_path:path,original_filename:messageFile.name,file_type:prepared.contentType,file_size_bytes:prepared.blob.size,client_visible:visible,status:'published'});attachmentNote=`\nAnexo: ${messageFile.name}`;}}
      const {error}=await supabase.from('comments').insert({company_id:selectedProject.companyId,target_type:'deliverable',target_id:selectedDeliverable.id,author_user_id:user.user?.id||null,body:`${body}${attachmentNote}`,client_visible:visible}); if(error)console.error(error); await loadDeliverableContext(selectedDeliverable.id);
    } else setComments((c)=>[...c,{id:`preview-comment-${Date.now()}`,body:messageFile?`${body}\nAnexo: ${messageFile.name}`:body,clientVisible:visible,createdAt:new Date().toISOString(),author:'Patrícia · CALI'}]);
    setMessageText('');setMessageFile(null);
  }


  /* O mês do cronograma (M1, M2…) sai do prazo: a proprietária pediu para tirar os campos "Mês inicial/final" (2026-10-13). */
  useEffect(()=>{ const start=(selectedProject as any)?.startDate as string|undefined; if(!deliverableForm.dueDate||!start)return; const a=new Date(`${String(start).slice(0,10)}T12:00:00`),b=new Date(`${deliverableForm.dueDate}T12:00:00`); if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return; const month=Math.max(1,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())+1); setDeliverableForm((c)=>c.monthStart===month&&c.monthEnd===month?c:{...c,monthStart:month,monthEnd:month}); },[deliverableForm.dueDate,(selectedProject as any)?.startDate]);
  async function adminStartTaskTimer(task:{id:string;title:string}){
    if(!supabase||!selectedDeliverable||!selectedProject||activeTimer)return;
    const {data,error}=await supabase.rpc('start_work_timer',{p_company_id:selectedProject.companyId,p_project_id:selectedProject.id,p_deliverable_id:selectedDeliverable.id,p_task_id:task.id,p_note:task.title});
    if(error){ setStaffNotice(error.message||'Não foi possível iniciar o cronômetro.'); return; }
    setActiveTimer({id:data as string,deliverableId:selectedDeliverable.id,taskId:task.id,startedAt:new Date().toISOString(),preview:false}); window.dispatchEvent(new CustomEvent('cali:timers-changed'));
  }
  async function adminPauseTimer(){ if(!supabase||!activeTimer?.id)return; const {error}=await supabase.rpc('pause_work_timer',{p_timer_id:activeTimer.id}); if(error){ setStaffNotice(error.message||'Não foi possível pausar o cronômetro.'); return; } setActiveTimer(null); window.dispatchEvent(new CustomEvent('cali:timers-changed')); setStaffNotice('Sessão registrada. Dê play para continuar depois.'); }
  function taskTimer(task:{id:string;title:string;status:string}){
    if(!selectedDeliverable||['done','approved','cancelled'].includes(String(task.status))||selectedDeliverable.status==='approved'||selectedDeliverable.status==='cancelled')return null;
    if(activeTimer?.taskId===task.id)return <button type="button" className="v2-task-timer on" onClick={()=>void (staff?stopTimer():adminPauseTimer())}><Pause size={13}/> Pausar · {timerLabel}</button>;
    return <button type="button" className="v2-task-timer" disabled={Boolean(activeTimer)} title={activeTimer?'Pause o cronômetro ligado antes de iniciar outro':'Iniciar cronômetro nesta subtarefa'} onClick={()=>void (staff?staffStartTaskTimer(task):adminStartTaskTimer(task))}><Play size={13}/> Iniciar</button>;
  }
  async function setTaskStatus(task:{id:string;status:string},next:string){ if(next===task.status)return;
    if(supabase&&isUuid(task.id)){ const result=staff?await supabase.rpc('partner_set_task_status',{p_task_id:task.id,p_status:next}):await supabase.from('deliverable_tasks').update({status:next,completed_at:(next==='done'||next==='approved')?new Date().toISOString():null}).eq('id',task.id); if(result.error){ setStaffNotice(result.error.message||'Não foi possível mudar a situação da subtarefa.'); return; } }
    setTasks((current)=>current.map((t)=>t.id===task.id?{...t,status:next as any}:t)); }
  /* Equipe CALI: play dentro da etapa (subtarefa), como na tela da administradora. */
  async function staffStartTaskTimer(task:{id:string;title:string}){
    if(!supabase||!staff||!selectedDeliverable||!selectedProject||activeTimer)return;
    const {data,error}=await supabase.rpc('partner_start_timer',{p_company_id:selectedProject.companyId,p_project_id:selectedProject.id,p_deliverable_id:selectedDeliverable.id,p_task_id:task.id,p_category:'Execução',p_description:task.title});
    if(error){ setStaffNotice(error.message||'Não foi possível iniciar o cronômetro.'); return; }
    setActiveTimer({id:data as string,deliverableId:selectedDeliverable.id,taskId:task.id,startedAt:new Date().toISOString(),preview:false}); window.dispatchEvent(new Event('cali-staff-timer-changed'));
    if(selectedDeliverable.status==='not_started')void persistStatus(selectedDeliverable,'in_progress','Iniciado pelo cronômetro');
  }
  async function startTimer(){
    if(!selectedDeliverable||activeTimer)return;
    if(supabase&&isUuid(selectedDeliverable.id)){ const {data,error}=staff?await supabase.rpc('partner_start_deliverable_timer',{p_deliverable_id:selectedDeliverable.id}):await supabase.rpc('start_work_timer',{p_company_id:selectedProject.companyId,p_project_id:selectedProject.id,p_deliverable_id:selectedDeliverable.id,p_task_id:null,p_note:selectedDeliverable.title}); if(error){console.error(error);if(staff)setStaffNotice(error.message||'Não foi possível iniciar o cronômetro.');return;} setActiveTimer({id:data,deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:false}); }
    else setActiveTimer({deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:true});
    if(selectedDeliverable.status==='not_started')void persistStatus(selectedDeliverable,'in_progress','Timer iniciado');
  }
  async function stopTimer(){ if(!activeTimer)return; if(!activeTimer.preview&&supabase&&activeTimer.id){const {data:stopped,error}=await supabase.rpc(staff?'partner_stop_timer':'stop_work_timer',{p_timer_id:activeTimer.id,p_description:selectedDeliverable?.title||'Atividade de projeto'});if(error)console.error(error);else{ if(staff)setStaffNotice((stopped as any)?.discarded?'Sessão com menos de 30 segundos: não foi registrada.':`Sessão de ${(stopped as any)?.minutes} min registrada. Dê play para continuar depois.`); await loadWorkspace(); }} setActiveTimer(null); }
  const timerLabel=`${String(Math.floor(timerSeconds/3600)).padStart(2,'0')}:${String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`;

  async function deleteDeliverable(){
    if(!selectedDeliverable||selectedDeliverable.status!=='not_started')return;
    if(staff){ const ok=await staffSubmitChange('deliverable_delete',`Excluir entregável: ${selectedDeliverable.title}`,{id:selectedDeliverable.id},selectedProject.companyId); if(ok){ setConfirmDelete(false); } return; }
    if(supabase&&isUuid(selectedDeliverable.id)){await supabase.from('deliverables').delete().eq('id',selectedDeliverable.id);await loadWorkspace();}
    else setProjects((c)=>c.map((p)=>({...p,deliverables:p.deliverables.filter((d)=>d.id!==selectedDeliverable.id)})));
    setConfirmDelete(false);setSelectedDeliverable(null);
  }

  if(loading) return <ProjectsFrame staff={Boolean(staff)}><div className="ap-app v2-admin-page"><div className="ap-content"><p className="v2-admin-empty data-loading" aria-live="polite" aria-busy="true">Carregando execução e cronograma…</p></div></div></ProjectsFrame>;

  const visibleDeliverables=selectedProject.deliverables.filter((d)=>d.status!=='cancelled');
  const waitingClient=visibleDeliverables.filter((d)=>d.status==='client_review');
  const openDetail=(item:ProjectDeliverable)=>{setSelectedDeliverable(item);setDetailTab('overview');};
  const planningTone:Record<string,string>={neutral:'purple',gold:'amber',success:'green',danger:'red'};
  const deliveryTone=(status:DeliverableStatus)=>status==='approved'?'green':status==='client_review'||status==='adjustment_requested'?'amber':status==='in_progress'||status==='internal_review'?'blue':status==='rebriefing'||status==='cancelled'?'red':'purple';
  const upcoming=[...visibleDeliverables].filter((d)=>d.dueAt).sort((a,b)=>String(a.dueAt).localeCompare(String(b.dueAt))).slice(0,4);

  /* As classes antigas mantidas ao lado das novas (projects-flow-page, project-kpis-v2, project-tools-v2, project-selector-v2,
     project-hero-v2, project-hero-buttons, roadmap-v2, front-*, kanban-v2, project-history-v2, project-modal-v2, deliverable-*-v2…)
     são pontos de encaixe dos módulos automáticos de Projetos (carteira por cliente, aprovação de cronograma, ciclo de vida,
     inteligência de prazos, timer, histórico de entregas). Não remover sem migrar o módulo correspondente. */
  return <ProjectsFrame staff={Boolean(staff)}><div className={`ap-app v2-admin-page v2-client-module ${staff?'v2-staff-projects':''}`}><div className="ap-content projects-flow-page">
    {staffNotice&&<div className="inline-notice success v2-toast" role="status"><CheckCircle2 size={18}/><span>{staffNotice}</span></div>}
    <div className="ap-title"><div><small>{staff?'EQUIPE CALI / PROJETOS':'BACKOFFICE / CALI RH'}</small><h1>Projetos e entregáveis<span>.</span></h1><p>{staff?'Cronograma e entregas das empresas que você atende.':'Um projeto organiza frentes, prazos, entregáveis e validações.'}</p></div><div className="ap-title-actions"><button className="ap-outline" onClick={()=>{setFrontForm(emptyFrontForm());setFrontModal(true);}}><Plus size={15}/> Nova frente</button><button className="ap-outline" onClick={()=>openDeliverable()}><Plus size={15}/> Novo entregável</button><button className="ap-primary" onClick={openNewProject}><Plus size={15}/> Novo projeto</button></div></div>

    {/* Indicadores da carteira: fora da tela a pedido da proprietária; o elemento permanece porque um módulo atualiza a contagem. */}
    <section className="project-kpis-v2" hidden><article><strong>{summary.active}</strong></article></section>

    <div className="v2-admin-project-bar">
      <label>Empresa<select aria-label="Empresa" value={selectedProject.companyId} onChange={(e)=>{const first=filteredProjects.find((p)=>p.companyId===e.target.value)||projects.find((p)=>p.companyId===e.target.value);if(first)setSelectedProjectId(first.id);}}>{Array.from(new Map(projects.map((p)=>[p.companyId,p.company])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Projeto<select aria-label="Projeto" value={selectedProject.id} onChange={(e)=>setSelectedProjectId(e.target.value)}>{projects.filter((p)=>p.companyId===selectedProject.companyId).map((p)=><option key={p.id} value={p.id}>{p.name}{p.startDate?` · ${new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(`${String(p.startDate).slice(0,10)}T12:00:00`)).replace('.','').replace(' de ','/')}`:''}</option>)}</select></label>
      <div className="ap-filters project-tools-v2"><label><select aria-label="Situação do cronograma" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}><option value="all">Todos os status</option>{Object.entries(projectPlanningLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="v2-admin-search"><Search size={14}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar projeto ou protocolo"/></label></div>
    </div>
    {(query||statusFilter!=='all')&&<div className="v2-admin-project-results">{filteredProjects.length?filteredProjects.map((project)=><button key={project.id} className={project.id===selectedProject.id?'current':''} onClick={()=>setSelectedProjectId(project.id)}><strong>{project.company}</strong> · {project.name}<span className={`ap-status ${planningTone[projectTone[project.planningStatus]]}`}>{projectPlanningLabels[project.planningStatus]}</span></button>):<span>Nenhum projeto corresponde à busca.</span>}</div>}

    <div className="project-selector-v2" hidden>{projects.map((project)=><button key={project.id} className={project.id===selectedProject.id?'active':''} onClick={()=>setSelectedProjectId(project.id)}><span className="project-client-mark">{project.company[0]}</span><span><small>{project.protocol}</small><strong>{project.company}</strong><em>{project.name}</em></span><b className="status-chip">{projectPlanningLabels[project.planningStatus]}</b></button>)}</div>

    <section className="ap-project-context project-hero-v2 v2-admin-hero"><div><span>{selectedProject.company} · {selectedProject.protocol}</span><h2>{selectedProject.name}</h2><em className="v2-hero-service">{selectedProject.service}</em><p>{selectedProject.service}</p><div className="project-rule-tags"><span><CalendarDays size={13}/>Início {formatProjectDate(selectedProject.startDate)}</span><span className="v2-hero-meta"><CalendarDays size={13}/>Meta {formatProjectDate(selectedProject.endDate)}</span><span><Clock3 size={13}/>{selectedProject.clientResponseBusinessDays} dias úteis para resposta</span><span><RefreshCw size={13}/>até {selectedProject.adjustmentLimit} ajustes</span></div></div><div className="v2-admin-project-side"><b className={`status-chip ap-status ${planningTone[projectTone[selectedProject.planningStatus]]}`}>{projectPlanningLabels[selectedProject.planningStatus]}</b><div className="project-progress-v2"><strong>{projectProgress(selectedProject.deliverables)}%</strong><span>andamento</span><div><i style={{width:`${projectProgress(selectedProject.deliverables)}%`}}/></div></div><div className="project-hero-buttons">{selectedProject.planningStatus==='draft'&&!staff&&<button className="light-button" onClick={()=>void sendScheduleToClient()}><Send size={14}/>Enviar ao cliente</button>}<button className="light-button" onClick={()=>{setFrontForm(emptyFrontForm());setFrontModal(true);}}><Plus size={14}/>Adicionar frente</button></div></div></section>

    {selectedProject.deliverables.some((d)=>d.clientDelayBusinessDays>0)&&<div className="project-impact-note v2-admin-notice"><AlertTriangle size={16}/><div><strong>Atraso do cliente impactando o cronograma</strong><p>A ausência de resposta não aprova automaticamente. As próximas deadlines podem ser deslocadas em dias úteis e o impacto fica registrado.</p></div></div>}

    <nav className="v2-project-tabs ap-project-tabs project-tabs-v2" role="tablist" aria-label="Gestão de projetos">{([['roadmap','Cronograma'],['deliverables','Entregáveis'],['history','Histórico']] as [ProjectView,string][]).map(([tab,label])=><button key={tab} role="tab" aria-selected={projectView===tab} className={projectView===tab?'current active':''} onClick={()=>setProjectView(tab)}>{label}</button>)}</nav>

    {projectView==='roadmap'&&(()=>{const dated=visibleDeliverables.map((item)=>item.dueAt?new Date(item.dueAt).getTime():NaN).filter((value)=>!Number.isNaN(value));const edges=[selectedProject.startDate,selectedProject.endDate].filter(Boolean).map((value)=>new Date(`${String(value).slice(0,10)}T12:00:00`).getTime());const start=Math.min(...dated,...edges),end=Math.max(...dated,...edges);const span=Math.max(86400000,end-start);const has=Number.isFinite(start)&&Number.isFinite(end);const tone:Record<string,string>={approved:'green',client_review:'purple',internal_review:'purple',not_started:'red',adjustment_requested:'red',rebriefing:'red'};const tick=(value:number)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(value)).replace('.','');return <section className="ap-pane v2-admin-timeline"><div className="ap-pane-head"><div><small>CRONOGRAMA</small><h2>Prazos das entregas</h2><p>Cada entrega no ponto do período em que está prevista. Clique para abrir.</p></div></div>{visibleDeliverables.length?<div className="ch-gantt" aria-label="Prazos e andamento das entregas"><div className="ch-gantt-header"><span>ENTREGA / STATUS</span><span>INÍCIO</span><span>MEIO</span><span>CONCLUSÃO</span></div><div className="ch-gantt-lanes">{[...visibleDeliverables].sort((a,b)=>String(a.dueAt||'9').localeCompare(String(b.dueAt||'9'))).map((item)=>{const due=item.dueAt?new Date(item.dueAt).getTime():NaN;const position=has&&!Number.isNaN(due)?Math.max(4,Math.min(84,(due-start)/span*100)):50;return <button type="button" className="ch-gantt-row" key={item.id} onClick={()=>openDetail(item)}><div className="ch-delivery-name"><strong>{item.title}</strong><small>{item.workstream} · {deliverableLabels[item.status]}</small></div><div className="ch-gantt-track" aria-hidden="true">{!Number.isNaN(due)?<span className={`ch-milestone ${tone[item.status]||''}`} style={{left:`${position}%`}}>{formatProjectDate(item.dueAt)}</span>:<span className="ch-undated">Prazo a definir</span>}</div></button>;})}</div>{has&&<div className="ch-gantt-foot" aria-hidden="true"><span/>{[start,start+span/2,end].map((value)=><time key={value}>{tick(value)}</time>)}</div>}</div>:<p className="v2-admin-empty">Este projeto ainda não tem entregáveis.</p>}</section>;})()}

    {projectView==='deliverables'&&<section className="ap-pane ap-project-calendar ap-admin-roadmap roadmap-v2"><header className="ap-pane-head"><div><small>FRENTES E ENTREGÁVEIS</small><h2>{visibleDeliverables.length} {visibleDeliverables.length===1?'entregável':'entregáveis'} em {selectedFronts.length} {selectedFronts.length===1?'frente':'frentes'}</h2><p>Clique na frente para abrir ou recolher os entregáveis.</p></div><div className="ie-switch deliverable-toolbar-v2"><button className={deliverableView==='list'?'on active':''} onClick={()=>setDeliverableView('list')}><List size={13}/> Lista</button><button className={deliverableView==='kanban'?'on active':''} onClick={()=>setDeliverableView('kanban')}><LayoutGrid size={13}/> Kanban</button></div></header>{deliverableView==='list'?<><div className="front-list-v2">{selectedFronts.map((front,index)=>{const ds=selectedProject.deliverables.filter((d)=>d.workstream===front.name||(d as any).workstreamId===front.id).filter((d)=>d.status!=='cancelled');return <section className={`ap-roadmap-front front-section-v2${staff&&!staffOpenFronts[front.id]?' front-collapsed-v46':''}`} key={front.id}><div className="ap-roadmap-front-header front-header-v2"><img src={index%2?'/brand/cali-lime-mark.svg':'/brand/cali-oak-mark.svg'} alt="" {...(staff?{className:'front-collapse-trigger-v46',role:'button',tabIndex:0,title:staffOpenFronts[front.id]?'Clique para recolher os entregáveis':'Clique para visualizar os entregáveis','aria-expanded':Boolean(staffOpenFronts[front.id]),onClick:()=>setStaffOpenFronts((c)=>({...c,[front.id]:!c[front.id]})),onKeyDown:(e:any)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStaffOpenFronts((c)=>({...c,[front.id]:!c[front.id]}));}}}:{})}/><div className="front-copy-v2"><span>{front.protocol}</span><strong>{front.name}</strong><p>{front.objective||'Frente do cronograma CALI.'}</p></div><div className="front-monthbar-v2" style={{'--months':months.length} as any}>{months.map((m)=><i key={m}/>)}<b style={{gridColumn:`${front.monthStart||1} / ${Math.min(months.length+1,(front.monthEnd||front.monthStart||1)+1)}`}}>M{front.monthStart||1}{front.monthEnd&&front.monthEnd!==front.monthStart?`–M${front.monthEnd}`:''}</b></div><button className="ap-outline" onClick={()=>openDeliverable(front)}><Plus size={14}/>Entregável</button></div><div className="ap-roadmap-list front-deliverables-v2 front-deliverables-v3">{ds.length?<><div className="ap-roadmap-head"><span>Entregável</span><span>Complexidade</span><span>Situação</span><span>Prazo</span><span/></div>{ds.map((item)=><div className="ap-roadmap-row front-deliverable-row-v3" key={item.id}><button className="ap-roadmap-delivery front-deliverable-open-v3" onClick={()=>openDetail(item)}><FileText size={17}/><span><strong>{item.title}</strong><small>{item.protocol}</small></span></button><b className={`ap-roadmap-moment mc-chip ${item.complexity.toLowerCase()}`} title={complexityMeta[item.complexity].description} aria-label={`${item.complexity}: ${complexityMeta[item.complexity].description}`}>{item.complexity}</b><StatusSelect item={item} compact onChange={(next)=>statusChoice(item,next)}/><time>{formatProjectDate(item.dueAt)}</time><button className="row-arrow-v3" onClick={()=>openDetail(item)} aria-label={`Abrir ${item.title}`}><ArrowRight size={15}/></button>{(()=>{ const subs=tasks.filter((t)=>t.deliverableId===item.id); return subs.length>0&&<div className="v2-subtask-tree">{subs.map((t)=><button type="button" key={t.id} className="v2-subtask-node" onClick={()=>{openDetail(item);setDetailTab('tasks');setOpenTaskId(t.id);}}><span className="v2-subtask-name"><i aria-hidden="true"/><span><strong>{t.title}</strong><small>{t.protocol}</small></span></span>{(t as any).complexity?<b className={`mc-chip ${String((t as any).complexity).toLowerCase()}`}>{(t as any).complexity}</b>:<b className="v2-st-muted">—</b>}<em className={`v2-subtask-chip ${SUBTASK_STATUS[String(t.status)]?.tone||'purple'}`}>{subtaskStatusLabel(String(t.status),Boolean(staff))}</em><time>{t.dueAt?formatProjectDate(t.dueAt):'sem prazo'}</time><ArrowRight size={14} className="v2-subtask-arrow"/></button>)}</div>; })()}</div>)}</>:<div className="front-empty-v2 v2-admin-empty">Nenhum entregável nesta frente ainda.</div>}</div></section>})}{!selectedFronts.length&&<p className="v2-admin-empty">Este projeto ainda não tem frentes. Use "Nova frente" para começar.</p>}</div></>:<div className="kanban-v2">{statuses.filter((status)=>!['cancelled','standby'].includes(status)).map((status)=><div key={status} onDragOver={staff&&staffStatuses.includes(status)?(e)=>{e.preventDefault();}:undefined} onDrop={staff&&staffStatuses.includes(status)?(e)=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const item=selectedProject.deliverables.find((d)=>d.id===id);if(item&&!staffLocked(item.status))statusChoice(item,status);}:undefined}><header><strong>{staff&&status==='internal_review'?'Revisão da Patricia':deliverableLabels[status]}</strong><span>{selectedProject.deliverables.filter((d)=>d.status===status).length}</span></header>{selectedProject.deliverables.filter((d)=>d.status===status).map((item)=><button key={item.id} draggable={Boolean(staff)&&!staffLocked(item.status)} onDragStart={staff?(e)=>{e.dataTransfer.setData('text/plain',item.id);}:undefined} onClick={()=>openDetail(item)}><small>{item.protocol}</small><strong>{item.title}</strong><p>{item.workstream}</p><footer><b className={`mc-chip ${item.complexity.toLowerCase()}`} title={complexityMeta[item.complexity].description} aria-label={`${item.complexity}: ${complexityMeta[item.complexity].description}`}>{item.complexity}</b><time>{formatProjectDate(item.dueAt)}</time></footer></button>)}</div>)}</div>}</section>}

    {projectView==='history'&&<section className="ap-pane project-history-v2"><header className="ap-pane-head"><div><small>REGISTRO DO PROJETO</small><h2>Histórico do projeto</h2><p>Desempenho das entregas, decisões e impactos de prazo registrados.</p></div></header></section>}

  {projectModal&&<div className="ap-pd-overlay"><form className="ap-pd-modal project-modal-v2" role="dialog" aria-modal="true" aria-label="Novo projeto" onSubmit={createProject}><header className="ap-pd-head"><div><small>OPERAÇÃO / PROJETOS</small><h2>Estruturar cronograma e frentes</h2><p>Cadastre o projeto e já deixe as frentes iniciais organizadas. Depois cada frente recebe seus entregáveis e subtarefas.</p></div><button type="button" className="ap-pd-close" aria-label="Fechar" onClick={()=>setProjectModal(false)}><X size={19}/></button></header><div className="ap-pd-body project-modal-scroll-v2"><div className="ap-pd-fields form-grid"><label className="ap-pd-field stacked-label"><span>Cliente</span><select value={projectForm.companyId} onChange={(e)=>setProjectForm((c)=>({...c,companyId:e.target.value}))}>{Array.from(new Map(projects.map((p)=>[p.companyId,p.company])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="ap-pd-field stacked-label"><span>Nome do projeto</span><input value={projectForm.name} onChange={(e)=>setProjectForm((c)=>({...c,name:e.target.value}))} placeholder="Roadmap People · ciclo estratégico"/></label><label className="ap-pd-field stacked-label"><span>Início</span><input type="date" value={projectForm.startDate} onChange={(e)=>setProjectForm((c)=>({...c,startDate:e.target.value}))}/></label><label className="ap-pd-field stacked-label"><span>Previsão final</span><input type="date" value={projectForm.endDate} onChange={(e)=>setProjectForm((c)=>({...c,endDate:e.target.value}))}/></label></div><div className="front-drafts-v2"><div className="ap-pd-subhead front-drafts-title"><div><h3>Frentes iniciais</h3><span>Ex.: Cultura & Clima, Processos, Comunicação Interna.</span></div><button type="button" onClick={addFrontDraft}><Plus size={14}/> Frente</button></div>{frontDrafts.map((front,index)=><div className="ap-pd-front front-draft-row" key={front.id}><span>{String(index+1).padStart(2,'0')}</span><input value={front.name} onChange={(e)=>patchFrontDraft(front.id,{name:e.target.value})} placeholder="Nome da frente"/><input value={front.objective} onChange={(e)=>patchFrontDraft(front.id,{objective:e.target.value})} placeholder="Objetivo / contexto"/><label>M<input type="number" min={1} value={front.monthStart} onChange={(e)=>patchFrontDraft(front.id,{monthStart:Number(e.target.value)})}/></label><label>até M<input type="number" min={front.monthStart} value={front.monthEnd} onChange={(e)=>patchFrontDraft(front.id,{monthEnd:Number(e.target.value)})}/></label><button type="button" onClick={()=>removeFrontDraft(front.id)} aria-label="Remover frente"><X size={15}/></button></div>)}</div><label className="ap-pd-field stacked-label"><span>Prazo esperado de resposta do cliente (dias úteis)</span><input type="number" min={1} max={30} value={projectForm.clientResponseBusinessDays} onChange={(e)=>setProjectForm((c)=>({...c,clientResponseBusinessDays:Number(e.target.value)}))}/></label><p className="ap-pd-note">A falta de resposta gera aviso e impacto de prazo, nunca aprovação automática.</p></div><footer className="ap-pd-footer"><span/><div><button type="button" onClick={()=>setProjectModal(false)}>Cancelar</button><button className="ap-pd-primary primary" disabled={saving||!projectForm.name.trim()}>{saving?'Salvando…':'Criar cronograma'}</button></div></footer></form></div>}

  {frontModal&&<div className="ap-pd-overlay"><form className="ap-pd-modal v2-pd-narrow simple-project-modal-v2" role="dialog" aria-modal="true" aria-label="Nova frente" onSubmit={createFront}><header className="ap-pd-head"><div><small>OPERAÇÃO / PROJETOS</small><h2>Adicionar frente ao cronograma</h2><p>A frente organiza um bloco de trabalho. Dentro dela serão criados os entregáveis e suas subtarefas.</p><div className="ap-pd-context"><span>Conta <strong>{selectedProject.company}</strong></span><span>Projeto / cronograma <strong>{selectedProject.name}</strong></span></div></div><button type="button" className="ap-pd-close" aria-label="Fechar" onClick={()=>setFrontModal(false)}><X size={19}/></button></header><div className="ap-pd-body project-modal-scroll-v2"><div className="ap-pd-fields"><label className="ap-pd-field ap-pd-wide stacked-label"><span>Nome da frente</span><input value={frontForm.name} onChange={(e)=>setFrontForm((c)=>({...c,name:e.target.value}))} placeholder="Ex.: Cultura & Clima"/></label><label className="ap-pd-field ap-pd-wide stacked-label"><span>Objetivo / contexto</span><textarea rows={3} value={frontForm.objective} onChange={(e)=>setFrontForm((c)=>({...c,objective:e.target.value}))}/></label><label className="ap-pd-field stacked-label"><span>Mês inicial</span><input type="number" min={1} value={frontForm.monthStart} onChange={(e)=>setFrontForm((c)=>({...c,monthStart:Number(e.target.value)}))}/></label><label className="ap-pd-field stacked-label"><span>Mês final</span><input type="number" min={frontForm.monthStart} value={frontForm.monthEnd} onChange={(e)=>setFrontForm((c)=>({...c,monthEnd:Number(e.target.value)}))}/></label></div></div><footer className="ap-pd-footer"><span/><div><button type="button" onClick={()=>setFrontModal(false)}>Cancelar</button><button className="ap-pd-primary primary" disabled={saving||!frontForm.name.trim()}>Adicionar frente</button></div></footer></form></div>}

  {(()=>{ const openTask=openTaskId?tasks.find((t)=>t.id===openTaskId):null; return openTask&&selectedDeliverable&&selectedProject&&isUuid(openTask.id)?<SubtaskModal task={{id:openTask.id,title:openTask.title,description:openTask.description,status:String(openTask.status),dueAt:openTask.dueAt,protocol:openTask.protocol,clientVisible:openTask.clientVisible,complexity:(openTask as any).complexity,isDocument:(openTask as any).isDocument}} deliverableId={selectedDeliverable.id} deliverableTitle={selectedDeliverable.title} companyId={selectedProject.companyId} staff={Boolean(staff)} timer={taskTimer({id:openTask.id,title:openTask.title,status:String(openTask.status)})} formatDate={(value)=>formatProjectDate(value||undefined)} onStatus={(next)=>void setTaskStatus(openTask,next)} onClose={()=>setOpenTaskId(null)} onNotice={setStaffNotice}/>:null; })()}
  {deliverableModal&&<div className="ap-pd-overlay"><form className="ap-pd-modal simple-project-modal-v2" role="dialog" aria-modal="true" aria-label="Entregável" onSubmit={saveDeliverable}><header className="ap-pd-head"><div><small>OPERAÇÃO / PROJETOS</small><h2>{editingDeliverable?'Atualizar entregável':'Criar entregável'}</h2><p>O entregável pertence a uma frente e pode ser desdobrado em quantas subtarefas forem necessárias.</p><div className="ap-pd-context"><span>Conta <strong>{selectedProject.company}</strong></span><span>Projeto / cronograma <strong>{selectedProject.name}</strong></span></div></div><button type="button" className="ap-pd-close" aria-label="Fechar" onClick={()=>setDeliverableModal(false)}><X size={19}/></button></header><div className="ap-pd-body project-modal-scroll-v2"><div className="ap-pd-fields"><label className="ap-pd-field stacked-label"><span>Título</span><input value={deliverableForm.title} onChange={(e)=>setDeliverableForm((c)=>({...c,title:e.target.value}))}/></label><label className="ap-pd-field stacked-label"><span>Frente</span><select value={deliverableForm.frontId} onChange={(e)=>setDeliverableForm((c)=>({...c,frontId:e.target.value}))}><option value="">Selecionar frente</option>{selectedFronts.map((f)=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label className="ap-pd-field stacked-label"><span>Complexidade</span><select value={deliverableForm.complexity} onChange={(e)=>setDeliverableForm((c)=>({...c,complexity:e.target.value as MaterialComplexity}))}>{(Object.keys(complexityMeta) as MaterialComplexity[]).map((key)=><option key={key} value={key}>{complexityMeta[key].label}</option>)}</select></label><label className="ap-pd-field stacked-label"><span>Prazo</span><input type="date" value={deliverableForm.dueDate} onChange={(e)=>setDeliverableForm((c)=>({...c,dueDate:e.target.value}))}/></label><label className="ap-pd-field ap-pd-wide stacked-label"><span>Descrição / resultado esperado</span><textarea rows={3} value={deliverableForm.description} onChange={(e)=>setDeliverableForm((c)=>({...c,description:e.target.value}))}/></label><label className="ap-pd-check"><input type="checkbox" checked={deliverableForm.clientVisible} onChange={(e)=>setDeliverableForm((c)=>({...c,clientVisible:e.target.checked}))}/> Visível para o cliente</label><label className="ap-pd-check"><input type="checkbox" checked={deliverableForm.isDocument} onChange={(e)=>setDeliverableForm((c)=>({...c,isDocument:e.target.checked}))}/> Entrega documental</label></div><p className="ap-pd-note complexity-note-v2"><strong>{complexityMeta[deliverableForm.complexity].label}:</strong> {complexityMeta[deliverableForm.complexity].description}</p></div><footer className="ap-pd-footer"><span/><div><button type="button" onClick={()=>setDeliverableModal(false)}>Cancelar</button><button className="ap-pd-primary primary" disabled={saving||!deliverableForm.title.trim()||!deliverableForm.frontId}>{saving?'Salvando…':editingDeliverable?'Salvar alterações':'Adicionar entregável'}</button></div></footer></form></div>}

  {selectedDeliverable&&(()=>{const doneTasks=selectedTasks.filter((task)=>task.status==='done');const percent=selectedTasks.length?Math.round(doneTasks.length/selectedTasks.length*100):0;const currentTask=selectedTasks.find((task)=>task.status!=='done');return <div className="dv-overlay v2-admin-dv"><section className="dv-modal deliverable-workspace-modal-v2" role="dialog" aria-modal="true" aria-label={selectedDeliverable.title}>
    <header className="deliverable-workspace-header-v2"><div className="deliverable-title-v2"><small><span className="section-kicker">{selectedDeliverable.protocol}</span> · {selectedDeliverable.complexity}</small><h2>{selectedDeliverable.title}</h2><p>{selectedDeliverable.workstream} · {roadmapLabel(selectedDeliverable)}</p></div><div className="deliverable-head-actions-v2">{staff&&selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&(activeTimer?.deliverableId===selectedDeliverable.id&&!activeTimer?.taskId?<button type="button" className="v2-head-timer on" onClick={()=>void stopTimer()}><Pause size={14}/> Pausar · {timerLabel}</button>:<button type="button" className="v2-head-timer" disabled={Boolean(activeTimer)} title={activeTimer?'Pause o cronômetro ligado antes de iniciar outro':'Iniciar cronômetro neste entregável'} onClick={()=>void startTimer()}><Play size={14}/> Iniciar timer</button>)}<span className={`v2-head-status ${deliveryTone(selectedDeliverable.status)}`} title="Situação do entregável — clique para alterar"><StatusSelect item={selectedDeliverable} onChange={(next)=>statusChoice(selectedDeliverable,next)}/></span><button className="modal-close-static" aria-label="Fechar" onClick={()=>{setSelectedDeliverable(null);setShowAdjustment(false);}}><X size={18}/></button></div></header>
    <nav className="deliverable-tabs-v2" aria-label="Detalhes da entrega">{(['overview','tasks','conversation','history'] as DetailTab[]).map((tab)=><button key={tab} className={detailTab===tab?'selected active':''} onClick={()=>setDetailTab(tab)}>{tab==='overview'?'Visão geral':tab==='tasks'?`Subtarefas (${selectedTasks.length})`:tab==='conversation'?`Conversas (${comments.length})`:'Histórico'}</button>)}</nav>
    {/* Os módulos da conversa procuram a lista e o campo dentro de "conversation-pane-v2"; o invólucro (display: contents) reúne a área rolável e o campo fixo. */}
    <div className="dv-pane conversation-pane-v2 workspace-chat-standard">
    <div className="dv-modal-content deliverable-workspace-scroll-v2">
      {detailTab==='overview'&&<><div className="dv-summary deliverable-summary-lines-v2"><span><Clock3 size={14}/> Prazo <b>{formatProjectDate(selectedDeliverable.dueAt)}</b></span><span><CheckCircle2 size={14}/> Horas registradas <b>{hoursLabel(selectedDeliverable.hours)}</b></span><span><RefreshCw size={14}/> Ajustes <b>{selectedDeliverable.adjustmentCount}/{selectedProject.adjustmentLimit}</b></span><span><GitBranch size={14}/> Frente de atuação <b>{selectedDeliverable.workstream}</b></span></div>
        <div className="dv-overview-copy"><h3>Sobre esta entrega</h3>{selectedDeliverable.description&&<p>{selectedDeliverable.description}</p>}<p>{selectedDeliverable.complexity}: {complexityMeta[selectedDeliverable.complexity].description}</p>{selectedDeliverable.originalDueAt&&selectedDeliverable.originalDueAt!==selectedDeliverable.dueAt&&<p>Prazo original: {formatProjectDate(selectedDeliverable.originalDueAt)}.</p>}{selectedDeliverable.rebriefingRequired&&<p>Rebriefing necessário.</p>}</div>
        {selectedProject&&isUuid(selectedDeliverable.id)&&<NoteLog deliverableId={selectedDeliverable.id} companyId={selectedProject.companyId} staff={Boolean(staff)} title="Notas internas" hint="Anotações, fontes e referências deste entregável. O cliente não vê." onNotice={setStaffNotice}/>}
        {selectedDeliverable.clientDelayBusinessDays>0&&<div className="dv-next-action deliverable-warning-v2"><AlertTriangle size={16}/><div><strong>Resposta do cliente em atraso</strong><p>{selectedDeliverable.clientDelayBusinessDays} dia(s) útil(eis) de impacto. O atraso altera as próximas deadlines e fica registrado no histórico.</p></div></div>}
        {showAdjustment&&<form className="v2-pd-inline-form adjustment-form-v2" onSubmit={(e)=>{e.preventDefault();void requestAdjustment();}}><h3>Registrar pedido de alteração</h3><p>Até o 3º pedido é ajuste. O 4º passa automaticamente para rebriefing.</p><label>Justificativa<textarea rows={3} value={adjustmentReason} onChange={(e)=>setAdjustmentReason(e.target.value)} placeholder="Justificativa obrigatória"/></label><label>Impacto na deadline (dias úteis)<input type="number" min={0} max={90} value={adjustmentImpact} onChange={(e)=>setAdjustmentImpact(Number(e.target.value))}/></label><div className="v2-pd-inline-actions"><button type="button" className="dv-secondary" onClick={()=>setShowAdjustment(false)}>Cancelar</button><button className="dv-converse-bottom" disabled={!adjustmentReason.trim()}>Registrar ajuste</button></div></form>}</>}
      {detailTab==='tasks'&&<section className="tasks-pane-v2"><div className="dv-progress-head"><div><small>ANDAMENTO DA ENTREGA</small><h3>{selectedTasks.length?`${doneTasks.length} de ${selectedTasks.length} ${selectedTasks.length===1?'subtarefa concluída':'subtarefas concluídas'}`:'Nenhuma subtarefa cadastrada'}</h3><p>{currentTask?`Próxima: ${currentTask.title}`:selectedTasks.length?'Todas as subtarefas foram concluídas.':'Use "Nova subtarefa" para desdobrar este entregável.'}</p></div><b>{selectedTasks.length?`${percent}%`:'—'}</b></div><div className="dv-progress-track"><span style={{width:`${percent}%`}}/></div>
        <div className="v2-dv-task-bar"><span>Cada subtarefa tem o próprio prazo, sempre dentro do prazo do entregável.</span><button className="dv-secondary" onClick={()=>setShowTaskForm(true)}><Plus size={14}/> Nova subtarefa</button></div>
        {showTaskForm&&<form className="v2-pd-inline-form task-form-v2" onSubmit={addTask}><div className="v2-dv-form-grid"><label>Título da subtarefa<input value={taskForm.title} onChange={(e)=>setTaskForm((c)=>({...c,title:e.target.value}))}/></label><label>Complexidade<select value={taskForm.complexity} onChange={(e)=>setTaskForm((c)=>({...c,complexity:e.target.value}))}>{Object.keys(complexityMeta).map((key)=><option key={key} value={key}>{(complexityMeta as any)[key].label||key}</option>)}</select></label><label>Prazo{selectedDeliverable.dueAt?` (até ${formatProjectDate(selectedDeliverable.dueAt)})`:''}<input aria-label="Prazo da subtarefa" type="date" max={selectedDeliverable.dueAt?String(selectedDeliverable.dueAt).slice(0,10):undefined} value={taskForm.dueDate} onChange={(e)=>setTaskForm((c)=>({...c,dueDate:e.target.value}))}/></label><div className="v2-task-form-checks"><label className="v2-dv-check"><input type="checkbox" checked={taskForm.clientVisible} onChange={(e)=>setTaskForm((c)=>({...c,clientVisible:e.target.checked}))}/> Visível para o cliente</label><label className="v2-dv-check"><input type="checkbox" checked={taskForm.isDocument} onChange={(e)=>setTaskForm((c)=>({...c,isDocument:e.target.checked}))}/> Entrega documental</label></div></div><label>Descrição / resultado esperado<textarea rows={2} value={taskForm.description} onChange={(e)=>setTaskForm((c)=>({...c,description:e.target.value}))}/></label><div className="v2-pd-inline-actions"><button type="button" className="dv-secondary" onClick={()=>setShowTaskForm(false)}>Cancelar</button><button className="dv-converse-bottom" disabled={!taskForm.title.trim()}>Adicionar subtarefa</button></div></form>}
        {selectedTasks.length>0&&<div className="dv-steps task-list-v2 v2-st-table"><div className="v2-st-head"><span/><span>Subtarefa</span><span>Complexidade</span><span>Situação</span><span>Prazo</span><span>Cronômetro</span></div>{selectedTasks.map((task)=><Fragment key={task.id}><article className={'dv-step v2-st-row '+(task.status==='done'||String(task.status)==='approved'?'done':'')}><button type="button" className="v2-st-toggle" title="Abrir a subtarefa" aria-label={`Abrir ${task.title}`} onClick={()=>setOpenTaskId(task.id)}><ChevronRight size={16}/></button><div className="v2-subtask-open" role="button" tabIndex={0} onClick={()=>setOpenTaskId(task.id)} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpenTaskId(task.id);}}}><strong>{task.title}</strong><small>{[task.protocol,task.clientVisible?'cliente vê':'interno',(task as any).isDocument?'entrega documental':''].filter(Boolean).join(' · ')}</small></div>{(task as any).complexity?<b className={`mc-chip ${String((task as any).complexity).toLowerCase()}`}>{(task as any).complexity}</b>:<span className="v2-st-muted">—</span>}<label className={`v2-st-status ${SUBTASK_STATUS[String(task.status)]?.tone||'purple'}`}><i/><select aria-label={`Situação de ${task.title}`} value={String(task.status)} disabled={subtaskStatusOptions(Boolean(staff),String(task.status)).length===1} onChange={(e)=>void setTaskStatus(task,e.target.value)}>{subtaskStatusOptions(Boolean(staff),String(task.status)).map((value)=><option key={value} value={value}>{subtaskStatusLabel(value,Boolean(staff))}</option>)}</select></label><time>{task.dueAt?formatProjectDate(task.dueAt):'sem prazo'}</time><span className="v2-st-timer">{taskTimer({id:task.id,title:task.title,status:String(task.status)})}</span></article></Fragment>)}</div>}</section>}
      {detailTab==='conversation'&&(staff
        ? <div className="dv-chat workspace-chat-list v2-staff-project-chat" aria-live="polite">{staffChat.length?staffChat.map((m)=>{ const mine=m.authorId===staffUserId; const who=(m.authorId&&staffPeople[m.authorId])||{name:m.actor==='client'?'Cliente':m.actor==='system'?'CALI Workspace':'CALI',photo:''}; const avatar=<span className="workspace-chat-avatar v2-chat-photo">{who.photo?<img src={who.photo} alt=""/>:who.name.split(/\s+/).filter(Boolean).slice(0,2).map((x)=>x[0]?.toUpperCase()).join('')}</span>; return <div key={m.id} className={`workspace-chat-line role-${m.actor} ${mine?'mine':'other'} ${conversationChannel==='client'?'':'internal'}`}>{!mine&&avatar}<div className="workspace-chat-bubble"><div className="workspace-chat-head"><strong>{conversationChannel==='client'?who.name:`${who.name} · nota interna`}</strong><time>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt)).replace('.','')}</time></div>{(()=>{ const files:{name:string;path:string;size:number}[]=[]; const clean=m.body.replace(/\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g,(_x:string,n:string,pth:string,_t:string,sz:string)=>{ try{files.push({name:decodeURIComponent(n),path:decodeURIComponent(pth),size:Number(sz||0)});}catch{files.push({name:n,path:pth,size:Number(sz||0)});} return ''; }).trim(); return <>{clean&&<p>{clean}</p>}{files.length>0&&<div className="workspace-chat-attachments">{files.map((f)=><button key={f.path} type="button" className="workspace-chat-attachment" onClick={()=>void staffOpenAttachment(f.path)}><span>📎</span><span><strong>{f.name}</strong><small>{f.size?`${Math.max(1,Math.round(f.size/1024))} KB`:'arquivo'}</small></span></button>)}</div>}</>; })()}</div>{mine&&avatar}</div>; }):<p className="v2-admin-empty">{conversationChannel==='client'?'Ainda não há mensagens com o cliente neste entregável.':'Ainda não há notas internas neste entregável.'}</p>}</div>
        : <div className="dv-chat conversation-list-v2 workspace-chat-list" aria-live="polite"/>)}
      {detailTab==='history'&&<><div className="dv-history-intro"><History size={19}/><div><strong>Histórico da entrega</strong><p>Registro cronológico de mudanças de situação, ajustes e decisões — diferente das mensagens da conversa.</p></div></div>{history.length?<div className="dv-history-list deliverable-history-v2">{history.map((item)=><div className="dv-history-row" key={item.id}><span className="dv-history-dot neutral"/><div><time>{typeof item.createdAt==='string'&&item.createdAt.includes('T')?new Date(item.createdAt).toLocaleString('pt-BR'):item.createdAt}</time><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div>:<p className="dv-history-footnote">Ainda não há movimentações registradas para este entregável.</p>}</>}
    </div>
    {detailTab==='conversation'&&<div className="dv-reply dv-reply-fixed conversation-composer-v2 workspace-chat-compose"><div className="ie-switch conversation-channel-compact-v64 conversation-channels-v2" aria-label="Canal da conversa"><button className={conversationChannel==='client'?'on active':''} onClick={()=>setConversationChannel('client')}>Cliente</button><button className={conversationChannel==='internal'?'on active':''} onClick={()=>setConversationChannel('internal')}>Interno</button></div><div className="workspace-chat-runtime-pending-host"/><div className="workspace-chat-runtime-tools-host"/><textarea value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder={conversationChannel==='client'?'Escreva uma mensagem para o cliente…':'Registre uma nota interna…'}/><input ref={fileInputRef} type="file" hidden onChange={(e)=>setMessageFile(e.target.files?.[0]||null)}/><div className="workspace-chat-send-actions"><button className="secondary dv-secondary" onClick={()=>fileInputRef.current?.click()}><Paperclip size={14}/>{messageFile?messageFile.name:'Anexar'}</button><button className="primary" onClick={()=>void sendMessage()} disabled={!messageText.trim()&&!messageFile}>Enviar <ArrowRight size={14}/></button></div></div>}
    </div>
    {detailTab!=='conversation'&&<footer className="dv-actions deliverable-actions-v2"><div className="deliverable-actions-left-v2">{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&<button className="dv-secondary" onClick={()=>openDeliverable(undefined,selectedDeliverable)}><Edit3 size={13}/> Editar</button>}{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&<button hidden={Boolean(staff)} className="dv-secondary" onClick={()=>setShowAdjustment(true)}><RefreshCw size={13}/> Ajuste</button>}<button className="dv-secondary danger-text" onClick={()=>{setPendingStatus({item:selectedDeliverable,status:'cancelled'});setStatusReason('');}} disabled={selectedDeliverable.status==='approved'||selectedDeliverable.status==='cancelled'}><X size={13}/> Cancelar entregável</button><button className="dv-secondary danger-text" onClick={()=>setConfirmDelete(true)} disabled={selectedDeliverable.status!=='not_started'}><Trash2 size={13}/> Excluir</button></div><div className="deliverable-actions-right-v2">{selectedDeliverable.status==='in_progress'&&<button className="dv-secondary" disabled={Boolean(staff&&staffReviewPending[selectedDeliverable.id])} onClick={()=>staff?void staffRequestReview():void persistStatus(selectedDeliverable,'client_review','Enviado para validação do cliente')}><Send size={13}/> {staff?(staffReviewPending[selectedDeliverable.id]?'Aguardando aprovação':'Enviar para aprovação'):'Enviar ao cliente'}</button>}{selectedDeliverable.status==='approved'?<span className="locked-v2"><ShieldCheck size={14}/> Aprovado e protegido</span>:activeTimer?.deliverableId===selectedDeliverable.id&&!activeTimer?.taskId?<button className="dv-converse-bottom timer-button-v2 active" onClick={()=>void stopTimer()}>{staff?<><Pause size={13}/> Pausar · {timerLabel}</>:<><Square size={13}/> Parar timer · {timerLabel}</>}</button>:<button className="dv-converse-bottom timer-button-v2" onClick={()=>void startTimer()} disabled={Boolean(activeTimer)}><Play size={13}/> Iniciar timer</button>}</div></footer>}
  </section></div>;})()}

  {pendingStatus&&<div className="ap-pd-overlay v2-pd-top"><section className="ap-status-confirm confirm-project-modal-v2" role="dialog" aria-modal="true" aria-label="Alterar status"><div><small>ALTERAR STATUS</small><h2>{deliverableLabels[pendingStatus.status]}</h2><p><strong>{pendingStatus.item.title}</strong></p><p>Registre o motivo. Ele fica associado à data e hora da mudança no histórico e pode alimentar o relatório do projeto.</p></div><label>Motivo<textarea autoFocus value={statusReason} onChange={(e)=>setStatusReason(e.target.value)} placeholder={pendingStatus.status==='standby'?'Por que este entregável ficará em standby?':pendingStatus.status==='rebriefing'?'O que exige rebriefing?':'Motivo do cancelamento'}/></label><footer><button onClick={()=>setPendingStatus(null)}>Voltar</button><button disabled={!statusReason.trim()} onClick={()=>void confirmPendingStatus()}>Confirmar status</button></footer></section></div>}

  {confirmDelete&&selectedDeliverable&&<div className="ap-pd-overlay v2-pd-top"><section className="ap-status-confirm confirm-project-modal-v2" role="alertdialog" aria-modal="true" aria-label="Excluir entregável"><div><small>CONFIRMAÇÃO</small><h2>Excluir entregável</h2><p><strong>{selectedDeliverable.title}</strong></p><p>A exclusão só é permitida antes do início. Depois disso, o correto é cancelar para preservar o histórico.</p></div><footer><button onClick={()=>setConfirmDelete(false)}>Voltar</button><button onClick={()=>void deleteDeliverable()}>Excluir</button></footer></section></div>}
  </div></div>
  </ProjectsFrame>;
}
