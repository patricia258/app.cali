import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Edit3, FileText,
  FolderKanban, GitBranch, History, LayoutGrid, List, MessageSquare, MoreHorizontal, Paperclip,
  PauseCircle, Play, Plus, RefreshCw, Search, Send, ShieldCheck, Square, Trash2, X, XCircle,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import {
  complexityMeta, deliverableLabels, formatProjectDate, previewProjects, projectPlanningLabels,
  projectProgress, type DeliverableStatus, type MaterialComplexity, type ProjectDeliverable,
  type ProjectPlanningStatus, type WorkspaceProject,
} from '../../domain/projects';

type ProjectView = 'roadmap' | 'deliverables' | 'history';
type DeliverableView = 'list' | 'kanban';
type DetailTab = 'overview' | 'tasks' | 'conversation' | 'history';
type ConversationChannel = 'internal' | 'client';
type ConfirmAction = 'cancel' | 'delete' | null;

type ProjectFront = {
  id: string; protocol: string; projectId: string; companyId: string; name: string; objective: string;
  monthStart: number | null; monthEnd: number | null; status: 'planned' | 'active' | 'completed' | 'cancelled'; sortOrder: number;
};
type TaskItem = {
  id: string; protocol: string; deliverableId: string; title: string; description?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'; dueAt?: string | null; clientVisible: boolean;
  estimatedMinutes: number; sortOrder: number;
};
type CommentItem = { id: string; body: string; clientVisible: boolean; createdAt: string; author?: string };
type HistoryItem = { id: string; title: string; detail: string; createdAt: string };
type ActiveTimer = { id?: string; deliverableId: string; startedAt: string; preview: boolean } | null;

type ProjectForm = { companyId: string; name: string; startDate: string; endDate: string; clientResponseBusinessDays: number };
type FrontDraft = { id: string; name: string; objective: string; monthStart: number; monthEnd: number };
type FrontForm = { name: string; objective: string; monthStart: number; monthEnd: number };
type DeliverableForm = {
  title: string; description: string; frontId: string; complexity: MaterialComplexity;
  monthStart: number; monthEnd: number; dueDate: string; isDocument: boolean; clientVisible: boolean;
};
type TaskForm = { title: string; description: string; dueDate: string; estimatedHours: string; clientVisible: boolean };

const statuses: DeliverableStatus[] = ['not_started','in_progress','internal_review','client_review','adjustment_requested','approved','cancelled'];
const statusTone: Record<DeliverableStatus,string> = {
  not_started:'neutral', in_progress:'accent', internal_review:'gold', client_review:'gold',
  adjustment_requested:'danger', approved:'success', cancelled:'neutral',
};
const projectTone: Record<ProjectPlanningStatus,string> = {
  draft:'neutral', client_review:'gold', adjustment_requested:'gold', approved:'success', active:'success', rebriefing:'danger', closed:'neutral',
};

const servicePlanLabel = (service?: string, plan?: string | null) => {
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
const emptyTaskForm = (): TaskForm => ({ title:'', description:'', dueDate:'', estimatedHours:'', clientVisible:false });

function previewFronts(project: WorkspaceProject): ProjectFront[] {
  const grouped = new Map<string, ProjectDeliverable[]>();
  project.deliverables.forEach((item) => grouped.set(item.workstream, [...(grouped.get(item.workstream)||[]), item]));
  return Array.from(grouped.entries()).map(([name,items],index) => ({
    id:`preview-front-${project.id}-${index}`, protocol:`CALI-FRT-PREVIEW-${String(index+1).padStart(2,'0')}`,
    projectId:project.id, companyId:project.companyId, name,
    objective: name === 'Cultura & Engajamento' ? 'Definir direcionadores, leitura de clima e rituais que sustentem as próximas decisões.' : name === 'Estrutura & Processos' ? 'Organizar processos prioritários, responsáveis e critérios de execução.' : 'Consolidar esta frente no roadmap e transformar decisões em rotina aplicável.',
    monthStart:Math.min(...items.map((i)=>i.roadmapMonthStart||1)), monthEnd:Math.max(...items.map((i)=>i.roadmapMonthEnd||i.roadmapMonthStart||1)),
    status:items.every((i)=>i.status==='approved')?'completed':items.some((i)=>i.status==='in_progress'||i.status==='client_review')?'active':'planned', sortOrder:index+1,
  }));
}
function previewTasks(deliverable: ProjectDeliverable): TaskItem[] {
  const base: Record<string,string[]> = {
    a1:['Consolidar briefing e documentos recebidos','Realizar leitura diagnóstica','Validar prioridades com liderança','Registrar direcionadores do ciclo'],
    a2:['Consolidar evidências de clima','Estruturar direcionadores culturais','Preparar material de validação','Validar com liderança','Incorporar ajustes','Publicar versão final'],
    a3:['Mapear processos críticos','Definir responsáveis e entradas','Desenhar fluxo prioritário','Validar dependências','Documentar versão inicial','Revisar com cliente','Publicar versão final'],
  };
  const names = base[deliverable.id] || Array.from({length:deliverable.taskCount||3},(_,i)=>`Etapa ${i+1} de ${deliverable.title}`);
  return names.map((title,index)=>({ id:`preview-task-${deliverable.id}-${index}`, protocol:`CALI-TSK-PREVIEW-${String(index+1).padStart(3,'0')}`, deliverableId:deliverable.id, title, status:index<(deliverable.taskDone||0)?'done':index===(deliverable.taskDone||0)&&deliverable.status==='in_progress'?'in_progress':'todo', dueAt:deliverable.dueAt, clientVisible:index===names.length-1, estimatedMinutes:60+(index%3)*30, sortOrder:index+1 }));
}

export function AdminProjectsPageV2() {
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
  const [confirmAction,setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmReason,setConfirmReason] = useState('');
  const [showAdjustment,setShowAdjustment] = useState(false);
  const [adjustmentReason,setAdjustmentReason] = useState('');
  const [adjustmentImpact,setAdjustmentImpact] = useState(0);
  const [activeTimer,setActiveTimer] = useState<ActiveTimer>(null);
  const [timerSeconds,setTimerSeconds] = useState(0);
  const [saving,setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement|null>(null);

  const selectedProject = projects.find((p)=>p.id===selectedProjectId) || projects[0];
  const selectedFronts = fronts.filter((f)=>f.projectId===selectedProject?.id && f.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder);
  const selectedTasks = selectedDeliverable ? tasks.filter((t)=>t.deliverableId===selectedDeliverable.id && t.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder) : [];

  useEffect(()=>{ void loadWorkspace(); },[]);
  useEffect(()=>{
    document.body.classList.toggle('workspace-modal-open', projectModal||frontModal||deliverableModal||Boolean(selectedDeliverable)||Boolean(confirmAction));
    return()=>document.body.classList.remove('workspace-modal-open');
  },[projectModal,frontModal,deliverableModal,selectedDeliverable,confirmAction]);
  useEffect(()=>{
    if (!activeTimer) { setTimerSeconds(0); return; }
    const tick=()=>setTimerSeconds(Math.max(0,Math.floor((Date.now()-new Date(activeTimer.startedAt).getTime())/1000)));
    tick(); const id=window.setInterval(tick,1000); return()=>window.clearInterval(id);
  },[activeTimer]);
  useEffect(()=>{ if(selectedDeliverable) void loadDeliverableContext(selectedDeliverable.id); },[selectedDeliverable?.id]);

  async function loadWorkspace() {
    if(!supabase) return;
    try {
      const [{data:companyRows},{data:projectRows},{data:frontRows},{data:deliverableRows},{data:taskRows},{data:hourRows},{data:timerRows}] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,service_type,service_plan').neq('status','closed').order('display_name'),
        supabase.from('projects').select('*').order('created_at',{ascending:false}),
        supabase.from('project_workstreams').select('*').order('sort_order'),
        supabase.from('deliverables').select('*').order('sort_order'),
        supabase.from('deliverable_tasks').select('*').order('sort_order'),
        supabase.from('hour_entries').select('deliverable_id,minutes'),
        supabase.from('work_timers').select('id,deliverable_id,started_at,status').eq('status','active').order('started_at',{ascending:false}).limit(1),
      ]);
      if(!projectRows?.length) return;
      const companyMap=new Map((companyRows||[]).map((r:any)=>[r.id,r]));
      const taskMap=new Map<string,TaskItem[]>();
      (taskRows||[]).forEach((r:any)=>{
        const item:TaskItem={id:r.id,protocol:r.protocol||'—',deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0)};
        taskMap.set(r.deliverable_id,[...(taskMap.get(r.deliverable_id)||[]),item]);
      });
      const hours=new Map<string,number>(); (hourRows||[]).forEach((r:any)=>hours.set(r.deliverable_id,(hours.get(r.deliverable_id)||0)+Number(r.minutes||0)/60));
      const nextProjects:WorkspaceProject[]=projectRows.map((row:any)=>{
        const c:any=companyMap.get(row.company_id)||{};
        const ds:ProjectDeliverable[]=(deliverableRows||[]).filter((d:any)=>d.project_id===row.id).map((d:any)=>{
          const related=taskMap.get(d.id)||[];
          return { id:d.id,protocol:d.protocol||d.code||'—',title:d.title,description:d.description,status:d.status,workstream:d.workstream||'Frente não definida',complexity:(d.complexity||'MC2') as MaterialComplexity,roadmapMonthStart:d.roadmap_month_start,roadmapMonthEnd:d.roadmap_month_end,dueAt:d.due_at,originalDueAt:d.original_due_at,clientResponseDueAt:d.client_response_due_at,clientDelayBusinessDays:Number(d.client_delay_business_days||0),adjustmentCount:Number(d.adjustment_count||0),rebriefingRequired:Boolean(d.rebriefing_required),isDocument:Boolean(d.is_document),hours:hours.get(d.id)||0,taskCount:related.length,taskDone:related.filter((t)=>t.status==='done').length,sortOrder:Number(d.sort_order||0),clientVisible:Boolean(d.client_visible),workstreamId:d.workstream_id } as ProjectDeliverable & {workstreamId?:string};
        });
        return { id:row.id,protocol:row.protocol||'—',companyId:row.company_id,company:c.display_name||'Cliente',companyLogo:c.logo_url,name:row.name,service:servicePlanLabel(c.service_type,c.service_plan),description:row.description,planningStatus:(row.planning_status||(row.status==='active'?'active':'draft')) as ProjectPlanningStatus,startDate:row.start_date,endDate:row.target_end_date,clientResponseBusinessDays:Number(row.client_response_business_days||3),adjustmentLimit:Number(row.adjustment_limit||3),deliverables:ds };
      });
      const nextFronts:ProjectFront[]=(frontRows||[]).map((r:any)=>({id:r.id,protocol:r.protocol||'—',projectId:r.project_id,companyId:r.company_id,name:r.name,objective:r.objective||'',monthStart:r.roadmap_month_start,monthEnd:r.roadmap_month_end,status:r.status,sortOrder:Number(r.sort_order||0)}));
      setProjects(nextProjects); setFronts(nextFronts); setTasks((taskRows||[]).map((r:any)=>({id:r.id,protocol:r.protocol||'—',deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0)})));
      setSelectedProjectId((current)=>nextProjects.some((p)=>p.id===current)?current:nextProjects[0].id);
      if(timerRows?.[0]) setActiveTimer({id:timerRows[0].id,deliverableId:timerRows[0].deliverable_id,startedAt:timerRows[0].started_at,preview:false});
    } catch(error){ console.error('Falha ao carregar projetos',error); }
  }

  async function loadDeliverableContext(deliverableId:string) {
    if(!supabase || !isUuid(deliverableId)) {
      setComments([{id:'p1',body:'Material organizado e pronto para validação.',clientVisible:true,createdAt:'2026-08-27T12:00:00-03:00',author:'Patrícia · CALI'},{id:'p2',body:'Revisar dependência com a próxima frente antes de publicar.',clientVisible:false,createdAt:'2026-08-27T09:00:00-03:00',author:'Patrícia · CALI'}]);
      setHistory([{id:'h1',title:'Entregável criado',detail:'Incluído no cronograma e vinculado à frente.',createdAt:'2026-08-20T10:00:00-03:00'},{id:'h2',title:'Status alterado',detail:`Status atual: ${deliverableLabels[selectedDeliverable?.status||'not_started']}.`,createdAt:'2026-08-27T09:00:00-03:00'}]); return;
    }
    const [{data:commentRows},{data:statusRows}] = await Promise.all([
      supabase.from('comments').select('id,body,client_visible,created_at').eq('target_type','deliverable').eq('target_id',deliverableId).order('created_at'),
      supabase.from('deliverable_status_history').select('*').eq('deliverable_id',deliverableId).order('created_at',{ascending:false}),
    ]);
    setComments((commentRows||[]).map((r:any)=>({id:r.id,body:r.body,clientVisible:Boolean(r.client_visible),createdAt:r.created_at,author:r.client_visible?'Conversa com cliente':'Nota interna CALI'})));
    setHistory((statusRows||[]).map((r:any)=>({id:String(r.id),title:`${r.from_status?deliverableLabels[r.from_status as DeliverableStatus]+' → ':''}${deliverableLabels[r.to_status as DeliverableStatus]||r.to_status}`,detail:r.note||'Mudança registrada no fluxo.',createdAt:r.created_at})));
  }

  const filteredProjects=useMemo(()=>projects.filter((p)=>{const text=`${p.company} ${p.name} ${p.protocol} ${p.service}`.toLowerCase(); return (!query||text.includes(query.toLowerCase()))&&(statusFilter==='all'||p.planningStatus===statusFilter);}),[projects,query,statusFilter]);
  const summary=useMemo(()=>({active:projects.filter((p)=>p.planningStatus==='active').length,waiting:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>d.status==='client_review').length,0),rebriefing:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>d.rebriefingRequired).length,0),impacted:projects.reduce((s,p)=>s+p.deliverables.filter((d)=>Boolean(d.originalDueAt)||d.clientDelayBusinessDays>0).length,0)}),[projects]);
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
        const result=editingDeliverable&&isUuid(editingDeliverable.id)?await supabase.from('deliverables').update(payload).eq('id',editingDeliverable.id):await supabase.from('deliverables').insert({...payload,company_id:selectedProject.companyId,project_id:selectedProject.id,status:'not_started',priority:'normal',sort_order:selectedProject.deliverables.length+1}); if(result.error)throw result.error; await loadWorkspace();
      } else if(editingDeliverable){ setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,deliverables:p.deliverables.map((d)=>d.id===editingDeliverable.id?{...d,title:deliverableForm.title,description:deliverableForm.description,workstream:front.name,complexity:deliverableForm.complexity,roadmapMonthStart:deliverableForm.monthStart,roadmapMonthEnd:deliverableForm.monthEnd,dueAt:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,isDocument:deliverableForm.isDocument,clientVisible:deliverableForm.clientVisible}:d)}:p)); }
      else { const local:ProjectDeliverable={id:`preview-del-${Date.now()}`,protocol:`CALI-ENT-PREVIEW-${Date.now().toString().slice(-5)}`,title:deliverableForm.title,description:deliverableForm.description,status:'not_started',workstream:front.name,complexity:deliverableForm.complexity,roadmapMonthStart:deliverableForm.monthStart,roadmapMonthEnd:deliverableForm.monthEnd,dueAt:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,clientDelayBusinessDays:0,adjustmentCount:0,rebriefingRequired:false,isDocument:deliverableForm.isDocument,hours:0,taskCount:0,taskDone:0,sortOrder:selectedProject.deliverables.length+1,clientVisible:deliverableForm.clientVisible}; setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,deliverables:[...p.deliverables,local]}:p)); }
      setDeliverableModal(false); setEditingDeliverable(null);
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  async function changeStatus(item:ProjectDeliverable,next:DeliverableStatus){
    if(item.status==='approved'||next===item.status)return;
    if(supabase&&isUuid(item.id)){ const payload:any={status:next}; if(next==='client_review')payload.approval_requested_at=new Date().toISOString(); if(next==='approved'){payload.approved_at=new Date().toISOString();payload.locked_at=new Date().toISOString();} if(next==='cancelled'){payload.cancelled_at=new Date().toISOString();payload.cancellation_reason='Cancelado pela gestão do projeto';} const {error}=await supabase.from('deliverables').update(payload).eq('id',item.id); if(error){console.error(error);return;} await loadWorkspace(); }
    else setProjects((c)=>c.map((p)=>({...p,deliverables:p.deliverables.map((d)=>d.id===item.id?{...d,status:next}:d)})));
    setSelectedDeliverable((current)=>current?.id===item.id?{...current,status:next}:current);
  }

  async function requestAdjustment(){
    if(!selectedDeliverable||!adjustmentReason.trim())return; const next=selectedDeliverable.adjustmentCount+1; const rebrief=next>(selectedProject.adjustmentLimit||3);
    if(supabase&&isUuid(selectedDeliverable.id)){ const {error}=await supabase.rpc('request_deliverable_adjustment',{p_deliverable_id:selectedDeliverable.id,p_reason:adjustmentReason.trim(),p_impact_business_days:adjustmentImpact}); if(error)console.error(error); else await loadWorkspace(); }
    else setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,planningStatus:rebrief?'rebriefing':p.planningStatus,deliverables:p.deliverables.map((d)=>d.id===selectedDeliverable.id?{...d,status:'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:d)}:p));
    setSelectedDeliverable((c)=>c?{...c,status:'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:c); setAdjustmentReason('');setAdjustmentImpact(0);setShowAdjustment(false);
  }

  async function sendScheduleToClient(){ if(!selectedProject)return; if(supabase&&isUuid(selectedProject.id)){await supabase.from('projects').update({planning_status:'client_review'}).eq('id',selectedProject.id);await loadWorkspace();}else setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,planningStatus:'client_review'}:p)); }

  async function addTask(event:FormEvent){
    event.preventDefault(); if(!selectedDeliverable||!taskForm.title.trim())return; const estimated=Math.round((Number(taskForm.estimatedHours.replace(',','.'))||0)*60); setSaving(true);
    try{
      if(supabase&&isUuid(selectedDeliverable.id)){ const {error}=await supabase.from('deliverable_tasks').insert({company_id:selectedProject.companyId,deliverable_id:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description.trim()||null,status:'todo',due_at:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,client_visible:taskForm.clientVisible,estimated_minutes:estimated,sort_order:selectedTasks.length+1}); if(error)throw error; const {data}=await supabase.from('deliverable_tasks').select('*').eq('deliverable_id',selectedDeliverable.id).order('sort_order'); setTasks((current)=>[...current.filter((t)=>t.deliverableId!==selectedDeliverable.id),...(data||[]).map((r:any)=>({id:r.id,protocol:r.protocol,deliverableId:r.deliverable_id,title:r.title,description:r.description,status:r.status,dueAt:r.due_at,clientVisible:Boolean(r.client_visible),estimatedMinutes:Number(r.estimated_minutes||0),sortOrder:Number(r.sort_order||0)}))]); }
      else setTasks((c)=>[...c,{id:`preview-task-${Date.now()}`,protocol:`CALI-TSK-PREVIEW-${Date.now().toString().slice(-4)}`,deliverableId:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description,status:'todo',dueAt:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,clientVisible:taskForm.clientVisible,estimatedMinutes:estimated,sortOrder:selectedTasks.length+1}]);
      setTaskForm(emptyTaskForm());setShowTaskForm(false);
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  async function toggleTask(task:TaskItem){ const next=task.status==='done'?'todo':'done'; if(supabase&&isUuid(task.id)){await supabase.from('deliverable_tasks').update({status:next,completed_at:next==='done'?new Date().toISOString():null}).eq('id',task.id);} setTasks((c)=>c.map((t)=>t.id===task.id?{...t,status:next}:t)); }

  async function sendMessage(){
    if(!selectedDeliverable||(!messageText.trim()&&!messageFile))return; const body=messageText.trim()||`Anexo: ${messageFile?.name}`; const visible=conversationChannel==='client';
    if(supabase&&isUuid(selectedDeliverable.id)){ const {data:user}=await supabase.auth.getUser(); let attachmentNote=''; if(messageFile){ const path=`${selectedProject.companyId}/deliverables/${selectedDeliverable.id}/${Date.now()}-${messageFile.name.replace(/[^A-Za-z0-9._-]/g,'_')}`; const upload=await supabase.storage.from('cali-workspace-private').upload(path,messageFile); if(!upload.error){await supabase.from('files').insert({company_id:selectedProject.companyId,project_id:selectedProject.id,deliverable_id:selectedDeliverable.id,title:messageFile.name,category:'deliverable',storage_path:path,original_filename:messageFile.name,file_type:messageFile.type,file_size_bytes:messageFile.size,client_visible:visible,status:'published'});attachmentNote=`\nAnexo: ${messageFile.name}`;}}
      const {error}=await supabase.from('comments').insert({company_id:selectedProject.companyId,target_type:'deliverable',target_id:selectedDeliverable.id,author_user_id:user.user?.id||null,body:`${body}${attachmentNote}`,client_visible:visible}); if(error)console.error(error); await loadDeliverableContext(selectedDeliverable.id);
    } else setComments((c)=>[...c,{id:`preview-comment-${Date.now()}`,body:messageFile?`${body}\nAnexo: ${messageFile.name}`:body,clientVisible:visible,createdAt:new Date().toISOString(),author:'Patrícia · CALI'}]);
    setMessageText('');setMessageFile(null);
  }

  async function startTimer(){
    if(!selectedDeliverable||activeTimer)return;
    if(supabase&&isUuid(selectedDeliverable.id)){ const {data,error}=await supabase.rpc('start_work_timer',{p_company_id:selectedProject.companyId,p_project_id:selectedProject.id,p_deliverable_id:selectedDeliverable.id,p_task_id:null,p_note:selectedDeliverable.title}); if(error){console.error(error);return;} setActiveTimer({id:data,deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:false}); }
    else setActiveTimer({deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:true});
    if(selectedDeliverable.status==='not_started')void changeStatus(selectedDeliverable,'in_progress');
  }
  async function stopTimer(){ if(!activeTimer)return; if(!activeTimer.preview&&supabase&&activeTimer.id){const {error}=await supabase.rpc('stop_work_timer',{p_timer_id:activeTimer.id,p_description:selectedDeliverable?.title||'Atividade de projeto'});if(error)console.error(error);else await loadWorkspace();} setActiveTimer(null); }
  const timerLabel=`${String(Math.floor(timerSeconds/3600)).padStart(2,'0')}:${String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`;

  async function confirmDestructive(){
    if(!selectedDeliverable||!confirmAction)return;
    if(confirmAction==='delete'&&selectedDeliverable.status!=='not_started'){setConfirmReason('Só entregáveis ainda não iniciados podem ser excluídos. Para preservar o histórico, use Cancelar.');return;}
    if(supabase&&isUuid(selectedDeliverable.id)){ if(confirmAction==='delete')await supabase.from('deliverables').delete().eq('id',selectedDeliverable.id); else await supabase.from('deliverables').update({status:'cancelled',cancelled_at:new Date().toISOString(),cancellation_reason:confirmReason.trim()||'Cancelado pela gestão'}).eq('id',selectedDeliverable.id); await loadWorkspace(); }
    else setProjects((c)=>c.map((p)=>({...p,deliverables:confirmAction==='delete'?p.deliverables.filter((d)=>d.id!==selectedDeliverable.id):p.deliverables.map((d)=>d.id===selectedDeliverable.id?{...d,status:'cancelled'}:d)})));
    setSelectedDeliverable(null);setConfirmAction(null);setConfirmReason('');
  }

  const projectHistoryPreview=[{id:'ph1',title:'Cronograma estruturado',detail:'Frentes e entregáveis organizados no roadmap.',createdAt:'19 ago 2026'},{id:'ph2',title:'Cronograma enviado ao cliente',detail:'Cliente recebeu a sequência para validação.',createdAt:'24 ago 2026'},{id:'ph3',title:'Impacto de prazo registrado',detail:'Resposta do cliente deslocou dependências posteriores em dias úteis.',createdAt:'28 ago 2026'}];

  return <Shell role="admin"><section className="page projects-flow-page">
    <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
    <div className="page-heading projects-heading-v2"><div><h1>Projetos</h1><p>Organize o cronograma por frentes, desdobre cada frente em entregáveis e acompanhe etapas, conversas, horas e validações sem perder a rastreabilidade.</p></div><button className="primary" onClick={openNewProject}><Plus size={18}/>Novo cronograma</button></div>

    <section className="project-kpis-v2"><article><span>Projetos vigentes</span><strong>{summary.active}</strong></article><article><span>Aguardando cliente</span><strong>{summary.waiting}</strong></article><article><span>Rebriefing</span><strong>{summary.rebriefing}</strong></article><article><span>Prazos impactados</span><strong>{summary.impacted}</strong></article></section>

    <div className="project-tools-v2"><label><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar cliente, projeto ou protocolo"/></label><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}><option value="all">Todos os status</option>{Object.entries(projectPlanningLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>

    <div className="project-selector-v2">{filteredProjects.map((project)=><button key={project.id} className={project.id===selectedProject.id?'active':''} onClick={()=>setSelectedProjectId(project.id)}><span className="project-client-mark">{project.company[0]}</span><span><small>{project.protocol}</small><strong>{project.company}</strong><em>{project.name}</em></span><b className={`status-chip ${projectTone[project.planningStatus]}`}>{projectPlanningLabels[project.planningStatus]}</b></button>)}</div>

    <section className="project-hero-v2"><img src="/brand/cali-oak-mark.svg" className="project-hero-illustration" alt=""/><div><span>{selectedProject.company} · {selectedProject.protocol}</span><h2>{selectedProject.name}</h2><p>{selectedProject.service} · {formatProjectDate(selectedProject.startDate)} → {formatProjectDate(selectedProject.endDate)}</p><div className="project-rule-tags"><span><Clock3 size={15}/>{selectedProject.clientResponseBusinessDays} dias úteis para resposta</span><span><RefreshCw size={15}/>até {selectedProject.adjustmentLimit} ajustes</span></div></div><div className="project-progress-v2"><strong>{projectProgress(selectedProject.deliverables)}%</strong><span>andamento</span><div><i style={{width:`${projectProgress(selectedProject.deliverables)}%`}}/></div></div><div className="project-hero-buttons">{selectedProject.planningStatus==='draft'&&<button className="light-button" onClick={()=>void sendScheduleToClient()}><Send size={16}/>Enviar ao cliente</button>}<button className="light-button" onClick={()=>{setFrontForm(emptyFrontForm());setFrontModal(true);}}><Plus size={16}/>Adicionar frente</button></div></section>

    {selectedProject.deliverables.some((d)=>d.clientDelayBusinessDays>0)&&<div className="project-impact-note"><AlertTriangle size={19}/><div><strong>Atraso do cliente impactando o cronograma</strong><p>A ausência de resposta não aprova automaticamente. As próximas deadlines podem ser deslocadas em dias úteis e o impacto fica registrado.</p></div></div>}

    <nav className="project-tabs-v2">{(['roadmap','deliverables','history'] as ProjectView[]).map((tab)=><button key={tab} className={projectView===tab?'active':''} onClick={()=>setProjectView(tab)}>{tab==='roadmap'?'Roadmap & frentes':tab==='deliverables'?'Entregáveis':'Histórico'}</button>)}</nav>

    {projectView==='roadmap'&&<section className="roadmap-v2 panel"><header><div><span className="section-kicker">SEQUÊNCIA DE IMPLANTAÇÃO</span><h2>Frentes do cronograma</h2><p>M1, M2, M3… representam meses. MC1, MC2 e MC3 representam complexidade do material, não prazo.</p></div><div className="mc-legend"><span>MC1</span><span>MC2</span><span>MC3</span></div></header><div className="roadmap-months-v2"><span>Frente / entregáveis</span>{months.map((m)=><b key={m}>M{m}</b>)}</div><div className="front-list-v2">{selectedFronts.map((front,index)=>{const ds=selectedProject.deliverables.filter((d)=>d.workstream===front.name||(d as any).workstreamId===front.id).filter((d)=>d.status!=='cancelled');return <section className="front-section-v2" key={front.id}><div className="front-header-v2"><img src={index%2?'/brand/cali-lime-mark.svg':'/brand/cali-oak-mark.svg'} alt=""/><div className="front-copy-v2"><span>{front.protocol}</span><strong>{front.name}</strong><p>{front.objective||'Frente do roadmap CALI.'}</p></div><div className="front-monthbar-v2" style={{'--months':months.length} as any}>{months.map((m)=><i key={m}/>)}<b style={{gridColumn:`${front.monthStart||1} / ${Math.min(months.length+1,(front.monthEnd||front.monthStart||1)+1)}`}}>M{front.monthStart||1}{front.monthEnd&&front.monthEnd!==front.monthStart?`–M${front.monthEnd}`:''}</b></div><button className="secondary" onClick={()=>openDeliverable(front)}><Plus size={15}/>Entregável</button></div><div className="front-deliverables-v2">{ds.length?ds.map((item)=><button key={item.id} onClick={()=>{setSelectedDeliverable(item);setDetailTab('overview');}}><FileText size={18}/><span><small>{item.protocol}</small><strong>{item.title}</strong></span><b className={`mc-chip ${item.complexity.toLowerCase()}`}>{item.complexity}</b><em className={`status-chip ${statusTone[item.status]}`}>{deliverableLabels[item.status]}</em><time>{formatProjectDate(item.dueAt)}</time><ArrowRight size={17}/></button>):<div className="front-empty-v2">Nenhum entregável nesta frente ainda.</div>}</div></section>})}</div></section>}

    {projectView==='deliverables'&&<><div className="deliverable-toolbar-v2"><div><button className={deliverableView==='list'?'active':''} onClick={()=>setDeliverableView('list')}><List size={16}/>Lista</button><button className={deliverableView==='kanban'?'active':''} onClick={()=>setDeliverableView('kanban')}><LayoutGrid size={16}/>Kanban</button></div><span>{selectedProject.deliverables.filter((d)=>d.status!=='cancelled').length} entregáveis</span></div>{deliverableView==='list'?<section className="deliverable-list-v2 panel">{selectedProject.deliverables.filter((d)=>d.status!=='cancelled').map((item)=><button key={item.id} onClick={()=>{setSelectedDeliverable(item);setDetailTab('overview');}}><span className="deliverable-icon-v2">{item.isDocument?<FileText size={19}/>:<CheckCircle2 size={19}/>}</span><span className="deliverable-copy-v2"><small>{item.protocol}</small><strong>{item.title}</strong><em>{item.workstream}</em></span><b className={`mc-chip ${item.complexity.toLowerCase()}`}>{item.complexity}</b><span className={`status-chip ${statusTone[item.status]}`}>{deliverableLabels[item.status]}</span><span className="task-count-v2">{item.taskDone}/{item.taskCount} etapas</span><span>{hoursLabel(item.hours)}</span><time>{formatProjectDate(item.dueAt)}</time><ArrowRight size={17}/></button>)}</section>:<section className="kanban-v2">{statuses.filter((s)=>s!=='cancelled').map((status)=><div key={status}><header><strong>{deliverableLabels[status]}</strong><span>{selectedProject.deliverables.filter((d)=>d.status===status).length}</span></header>{selectedProject.deliverables.filter((d)=>d.status===status).map((item)=><button key={item.id} onClick={()=>{setSelectedDeliverable(item);setDetailTab('overview');}}><small>{item.protocol}</small><strong>{item.title}</strong><p>{item.workstream}</p><footer><b className={`mc-chip ${item.complexity.toLowerCase()}`}>{item.complexity}</b><time>{formatProjectDate(item.dueAt)}</time></footer></button>)}</div>)}</section>}</>}

    {projectView==='history'&&<section className="project-history-v2 panel"><header><History size={20}/><div><h2>Histórico do projeto</h2><p>Decisões, impactos e alterações relevantes ficam preservados.</p></div></header>{projectHistoryPreview.map((item)=><article key={item.id}><i/><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.createdAt}</small></div></article>)}</section>}
  </section>

  {projectModal&&<div className="modal-backdrop full-screen-modal"><form className="modal-card project-modal-v2" onSubmit={createProject}><button type="button" className="modal-close" onClick={()=>setProjectModal(false)}><X size={21}/></button><header><span className="section-kicker">NOVO CRONOGRAMA</span><h2>Estruturar cronograma e frentes</h2><p>Cadastre o projeto e já deixe as frentes iniciais organizadas. Depois cada frente recebe seus entregáveis e etapas.</p></header><div className="project-modal-scroll-v2"><div className="form-grid"><label className="stacked-label">Cliente<select value={projectForm.companyId} onChange={(e)=>setProjectForm((c)=>({...c,companyId:e.target.value}))}>{Array.from(new Map(projects.map((p)=>[p.companyId,p.company])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="stacked-label">Nome do projeto<input value={projectForm.name} onChange={(e)=>setProjectForm((c)=>({...c,name:e.target.value}))} placeholder="Ex.: Roadmap People · ciclo estratégico"/></label><label className="stacked-label">Início<input type="date" value={projectForm.startDate} onChange={(e)=>setProjectForm((c)=>({...c,startDate:e.target.value}))}/></label><label className="stacked-label">Previsão final<input type="date" value={projectForm.endDate} onChange={(e)=>setProjectForm((c)=>({...c,endDate:e.target.value}))}/></label></div><div className="front-drafts-v2"><div className="front-drafts-title"><div><strong>Frentes iniciais</strong><span>Ex.: Cultura & Clima, Processos, Comunicação Interna.</span></div><button type="button" className="secondary" onClick={addFrontDraft}><Plus size={15}/>Frente</button></div>{frontDrafts.map((front,index)=><div className="front-draft-row" key={front.id}><span>{String(index+1).padStart(2,'0')}</span><input value={front.name} onChange={(e)=>patchFrontDraft(front.id,{name:e.target.value})} placeholder="Nome da frente"/><input value={front.objective} onChange={(e)=>patchFrontDraft(front.id,{objective:e.target.value})} placeholder="Objetivo / contexto"/><label>M<input type="number" min={1} value={front.monthStart} onChange={(e)=>patchFrontDraft(front.id,{monthStart:Number(e.target.value)})}/></label><label>até M<input type="number" min={front.monthStart} value={front.monthEnd} onChange={(e)=>patchFrontDraft(front.id,{monthEnd:Number(e.target.value)})}/></label><button type="button" onClick={()=>removeFrontDraft(front.id)}><X size={17}/></button></div>)}</div><label className="stacked-label">Prazo esperado de resposta do cliente<input type="number" min={1} max={30} value={projectForm.clientResponseBusinessDays} onChange={(e)=>setProjectForm((c)=>({...c,clientResponseBusinessDays:Number(e.target.value)}))}/><small>Dias úteis. A falta de resposta gera aviso e impacto de prazo, nunca aprovação automática.</small></label></div><footer><button type="button" className="secondary" onClick={()=>setProjectModal(false)}>Cancelar</button><button className="primary" disabled={saving||!projectForm.name.trim()}>{saving?'Salvando…':'Criar cronograma'}</button></footer></form></div>}

  {frontModal&&<div className="modal-backdrop full-screen-modal"><form className="modal-card simple-project-modal-v2" onSubmit={createFront}><button type="button" className="modal-close" onClick={()=>setFrontModal(false)}><X size={21}/></button><header><span className="section-kicker">NOVA FRENTE</span><h2>Adicionar frente ao cronograma</h2><p>A frente organiza um bloco de trabalho. Dentro dela serão criados os entregáveis e suas etapas.</p></header><div className="project-modal-scroll-v2"><label className="stacked-label">Nome da frente<input value={frontForm.name} onChange={(e)=>setFrontForm((c)=>({...c,name:e.target.value}))} placeholder="Ex.: Cultura & Clima"/></label><label className="stacked-label">Objetivo / contexto<textarea rows={3} value={frontForm.objective} onChange={(e)=>setFrontForm((c)=>({...c,objective:e.target.value}))}/></label><div className="form-grid"><label className="stacked-label">Mês inicial<input type="number" min={1} value={frontForm.monthStart} onChange={(e)=>setFrontForm((c)=>({...c,monthStart:Number(e.target.value)}))}/></label><label className="stacked-label">Mês final<input type="number" min={frontForm.monthStart} value={frontForm.monthEnd} onChange={(e)=>setFrontForm((c)=>({...c,monthEnd:Number(e.target.value)}))}/></label></div></div><footer><button type="button" className="secondary" onClick={()=>setFrontModal(false)}>Cancelar</button><button className="primary" disabled={saving||!frontForm.name.trim()}>Adicionar frente</button></footer></form></div>}

  {deliverableModal&&<div className="modal-backdrop full-screen-modal"><form className="modal-card simple-project-modal-v2" onSubmit={saveDeliverable}><button type="button" className="modal-close" onClick={()=>setDeliverableModal(false)}><X size={21}/></button><header><span className="section-kicker">{editingDeliverable?'EDITAR ENTREGÁVEL':'NOVO ENTREGÁVEL'}</span><h2>{editingDeliverable?'Atualizar entregável':'Adicionar entregável à frente'}</h2><p>O entregável pertence a uma frente e pode ser desdobrado em quantas subtarefas/etapas forem necessárias.</p></header><div className="project-modal-scroll-v2"><label className="stacked-label">Frente<select value={deliverableForm.frontId} onChange={(e)=>setDeliverableForm((c)=>({...c,frontId:e.target.value}))}><option value="">Selecionar frente</option>{selectedFronts.map((f)=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label className="stacked-label">Nome do entregável<input value={deliverableForm.title} onChange={(e)=>setDeliverableForm((c)=>({...c,title:e.target.value}))}/></label><label className="stacked-label">Descrição / resultado esperado<textarea rows={3} value={deliverableForm.description} onChange={(e)=>setDeliverableForm((c)=>({...c,description:e.target.value}))}/></label><div className="form-grid"><label className="stacked-label">Complexidade<select value={deliverableForm.complexity} onChange={(e)=>setDeliverableForm((c)=>({...c,complexity:e.target.value as MaterialComplexity}))}>{(Object.keys(complexityMeta) as MaterialComplexity[]).map((key)=><option key={key} value={key}>{complexityMeta[key].label}</option>)}</select></label><label className="stacked-label">Deadline<input type="date" value={deliverableForm.dueDate} onChange={(e)=>setDeliverableForm((c)=>({...c,dueDate:e.target.value}))}/></label><label className="stacked-label">Mês inicial<input type="number" min={1} value={deliverableForm.monthStart} onChange={(e)=>setDeliverableForm((c)=>({...c,monthStart:Number(e.target.value)}))}/></label><label className="stacked-label">Mês final<input type="number" min={deliverableForm.monthStart} value={deliverableForm.monthEnd} onChange={(e)=>setDeliverableForm((c)=>({...c,monthEnd:Number(e.target.value)}))}/></label></div><div className="complexity-note-v2"><strong>{complexityMeta[deliverableForm.complexity].label}</strong><span>{complexityMeta[deliverableForm.complexity].description}</span></div><label className="check-line"><input type="checkbox" checked={deliverableForm.isDocument} onChange={(e)=>setDeliverableForm((c)=>({...c,isDocument:e.target.checked}))}/><span><strong>Gera documento</strong><small>Após aprovação pode ser publicado na Biblioteca.</small></span></label><label className="check-line"><input type="checkbox" checked={deliverableForm.clientVisible} onChange={(e)=>setDeliverableForm((c)=>({...c,clientVisible:e.target.checked}))}/><span><strong>Visível ao cliente</strong><small>O cliente acompanha e valida, mas não reordena.</small></span></label></div><footer><button type="button" className="secondary" onClick={()=>setDeliverableModal(false)}>Cancelar</button><button className="primary" disabled={saving||!deliverableForm.title.trim()||!deliverableForm.frontId}>{saving?'Salvando…':editingDeliverable?'Salvar alterações':'Adicionar entregável'}</button></footer></form></div>}

  {selectedDeliverable&&<div className="modal-backdrop full-screen-modal"><section className="modal-card deliverable-workspace-modal-v2"><header className="deliverable-workspace-header-v2"><div className="deliverable-big-icon">{selectedDeliverable.isDocument?<FileText size={25}/>:<FolderKanban size={25}/>}</div><div className="deliverable-title-v2"><span className="section-kicker">{selectedDeliverable.protocol}</span><h2>{selectedDeliverable.title}</h2><p>{selectedDeliverable.workstream} · {selectedDeliverable.complexity} · {roadmapLabel(selectedDeliverable)}</p></div><div className="deliverable-head-actions-v2"><span className={`status-chip ${statusTone[selectedDeliverable.status]}`}>{deliverableLabels[selectedDeliverable.status]}</span><button className="modal-close-static" onClick={()=>{setSelectedDeliverable(null);setShowAdjustment(false);}}><X size={23}/></button></div></header><nav className="deliverable-tabs-v2">{(['overview','tasks','conversation','history'] as DetailTab[]).map((tab)=><button key={tab} className={detailTab===tab?'active':''} onClick={()=>setDetailTab(tab)}>{tab==='overview'?'Visão geral':tab==='tasks'?`Subtarefas (${selectedTasks.length})`:tab==='conversation'?`Conversa (${comments.length})`:'Histórico'}</button>)}</nav><div className="deliverable-workspace-scroll-v2">\    {detailTab==='overview'&&<><div className="deliverable-summary-lines-v2"><div><CalendarDays size={19}/><span>Deadline</span><strong>{formatProjectDate(selectedDeliverable.dueAt)}</strong>{selectedDeliverable.originalDueAt&&<small>Original: {formatProjectDate(selectedDeliverable.originalDueAt)}</small>}</div><div><Clock3 size={19}/><span>Horas</span><strong>{hoursLabel(selectedDeliverable.hours)}</strong><small>registradas</small></div><div><RefreshCw size={19}/><span>Ajustes</span><strong>{selectedDeliverable.adjustmentCount}/{selectedProject.adjustmentLimit}</strong><small>{selectedDeliverable.rebriefingRequired?'Rebriefing necessário':'com justificativa'}</small></div><div><GitBranch size={19}/><span>Frente</span><strong>{selectedDeliverable.workstream}</strong><small>{roadmapLabel(selectedDeliverable)}</small></div></div>{selectedDeliverable.clientDelayBusinessDays>0&&<div className="deliverable-warning-v2"><AlertTriangle size={18}/><div><strong>Resposta do cliente em atraso</strong><p>{selectedDeliverable.clientDelayBusinessDays} dia(s) útil(eis) de impacto. O atraso altera as próximas deadlines e fica registrado no histórico.</p></div></div>}<section className="deliverable-description-v2"><div><strong>Complexidade</strong><span className={`mc-chip ${selectedDeliverable.complexity.toLowerCase()}`}>{selectedDeliverable.complexity}</span></div><p>{complexityMeta[selectedDeliverable.complexity].description}</p>{selectedDeliverable.description&&<p>{selectedDeliverable.description}</p>}</section>{showAdjustment&&<form className="adjustment-form-v2" onSubmit={(e)=>{e.preventDefault();void requestAdjustment();}}><strong>Registrar pedido de alteração</strong><p>Até o 3º pedido é ajuste. O 4º passa automaticamente para rebriefing.</p><textarea rows={3} value={adjustmentReason} onChange={(e)=>setAdjustmentReason(e.target.value)} placeholder="Justificativa obrigatória"/><label>Impacto na deadline<input type="number" min={0} max={90} value={adjustmentImpact} onChange={(e)=>setAdjustmentImpact(Number(e.target.value))}/><span>dias úteis</span></label><div><button type="button" className="secondary" onClick={()=>setShowAdjustment(false)}>Cancelar</button><button className="primary" disabled={!adjustmentReason.trim()}>Registrar ajuste</button></div></form>}</>}
    {detailTab==='tasks'&&<section className="tasks-pane-v2"><header><div><strong>Subtarefas / etapas</strong><p>O entregável se desdobra aqui. Cada etapa recebe protocolo, prazo, estimativa e visibilidade.</p></div><button className="secondary" onClick={()=>setShowTaskForm(true)}><Plus size={16}/>Subtarefa</button></header>{showTaskForm&&<form className="task-form-v2" onSubmit={addTask}><input value={taskForm.title} onChange={(e)=>setTaskForm((c)=>({...c,title:e.target.value}))} placeholder="Nome da etapa"/><input type="date" value={taskForm.dueDate} onChange={(e)=>setTaskForm((c)=>({...c,dueDate:e.target.value}))}/><input value={taskForm.estimatedHours} onChange={(e)=>setTaskForm((c)=>({...c,estimatedHours:e.target.value.replace(/[^0-9,.]/g,'')}))} placeholder="Estimativa h"/><label><input type="checkbox" checked={taskForm.clientVisible} onChange={(e)=>setTaskForm((c)=>({...c,clientVisible:e.target.checked}))}/> Cliente vê</label><textarea rows={2} value={taskForm.description} onChange={(e)=>setTaskForm((c)=>({...c,description:e.target.value}))} placeholder="Contexto da etapa"/><div><button type="button" className="secondary" onClick={()=>setShowTaskForm(false)}>Cancelar</button><button className="primary" disabled={!taskForm.title.trim()}>Adicionar</button></div></form>}<div className="task-list-v2">{selectedTasks.map((task)=><article key={task.id} className={task.status==='done'?'done':''}><button className="task-check-v2" onClick={()=>void toggleTask(task)}>{task.status==='done'?<Check size={16}/>:null}</button><div><small>{task.protocol}</small><strong>{task.title}</strong>{task.description&&<p>{task.description}</p>}</div><span>{estimateLabel(task.estimatedMinutes)}</span><time>{formatProjectDate(task.dueAt)}</time><em>{task.clientVisible?'Cliente vê':'Interno'}</em></article>)}{!selectedTasks.length&&<div className="empty-inline-v2">Nenhuma subtarefa cadastrada.</div>}</div></section>}
    {detailTab==='conversation'&&<section className="conversation-pane-v2"><header><div className="conversation-channels-v2"><button className={conversationChannel==='client'?'active':''} onClick={()=>setConversationChannel('client')}>Cliente</button><button className={conversationChannel==='internal'?'active':''} onClick={()=>setConversationChannel('internal')}>Interno CALI</button></div><span>{conversationChannel==='client'?'Mensagens compartilhadas com o cliente':'Notas internas, invisíveis ao cliente'}</span></header><div className="conversation-list-v2">{comments.filter((m)=>m.clientVisible===(conversationChannel==='client')).map((m)=><article key={m.id}><span className="conversation-avatar-v2">PL</span><div><header><strong>{m.author||'Patrícia · CALI'}</strong><time>{new Date(m.createdAt).toLocaleString('pt-BR')}</time></header><p>{m.body}</p></div></article>)}{!comments.some((m)=>m.clientVisible===(conversationChannel==='client'))&&<div className="empty-inline-v2">Nenhuma mensagem neste canal.</div>}</div><div className="conversation-composer-v2"><textarea rows={3} value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder={conversationChannel==='client'?'Escreva uma mensagem para o cliente…':'Registre uma nota interna…'}/><input ref={fileInputRef} type="file" hidden onChange={(e)=>setMessageFile(e.target.files?.[0]||null)}/><div><button className="secondary" onClick={()=>fileInputRef.current?.click()}><Paperclip size={16}/>{messageFile?messageFile.name:'Anexar'}</button><button className="primary" onClick={()=>void sendMessage()} disabled={!messageText.trim()&&!messageFile}><Send size={16}/>Enviar</button></div></div></section>}
    {detailTab==='history'&&<section className="deliverable-history-v2"><header><History size={20}/><div><strong>Histórico do entregável</strong><p>Status e decisões ficam rastreados.</p></div></header>{history.map((item)=><article key={item.id}><i/><div><strong>{item.title}</strong><p>{item.detail}</p><small>{typeof item.createdAt==='string'&&item.createdAt.includes('T')?new Date(item.createdAt).toLocaleString('pt-BR'):item.createdAt}</small></div></article>)}</section>}
  </div><footer className="deliverable-actions-v2"><div className="deliverable-actions-left-v2">{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&<button className="secondary" onClick={()=>openDeliverable(undefined,selectedDeliverable)}><Edit3 size={16}/>Editar</button>}<label className="status-select-v2"><MoreHorizontal size={16}/><select value={selectedDeliverable.status} disabled={selectedDeliverable.status==='approved'} onChange={(e)=>void changeStatus(selectedDeliverable,e.target.value as DeliverableStatus)}>{statuses.map((s)=><option key={s} value={s}>{deliverableLabels[s]}</option>)}</select></label>{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&<button className="secondary" onClick={()=>setShowAdjustment(true)}><RefreshCw size={16}/>Ajuste</button>}<button className="secondary danger-text" onClick={()=>{setConfirmAction('cancel');setConfirmReason('');}} disabled={selectedDeliverable.status==='approved'||selectedDeliverable.status==='cancelled'}><XCircle size={16}/>Cancelar</button><button className="secondary danger-text" onClick={()=>{setConfirmAction('delete');setConfirmReason('');}} disabled={selectedDeliverable.status!=='not_started'}><Trash2 size={16}/>Excluir</button></div><div className="deliverable-actions-right-v2">{selectedDeliverable.status==='in_progress'&&<button className="secondary" onClick={()=>void changeStatus(selectedDeliverable,'client_review')}><Send size={16}/>Enviar ao cliente</button>}{selectedDeliverable.status==='approved'?<span className="locked-v2"><ShieldCheck size={16}/>Aprovado e protegido</span>:activeTimer?.deliverableId===selectedDeliverable.id?<button className="timer-button-v2 active" onClick={()=>void stopTimer()}><Square size={15}/>Parar timer · {timerLabel}</button>:<button className="timer-button-v2" onClick={()=>void startTimer()} disabled={Boolean(activeTimer)}><Play size={16}/>Iniciar timer</button>}</div></footer></section></div>}

  {confirmAction&&selectedDeliverable&&<div className="modal-backdrop full-screen-modal"><section className="modal-card confirm-project-modal-v2"><button className="modal-close" onClick={()=>setConfirmAction(null)}><X size={20}/></button><header><span className="section-kicker">CONFIRMAÇÃO</span><h2>{confirmAction==='delete'?'Excluir entregável':'Cancelar entregável'}</h2><p>{confirmAction==='delete'?'A exclusão só é permitida antes do início. Depois disso, o correto é cancelar para preservar o histórico.':'O entregável permanece no histórico e suas horas não são apagadas.'}</p></header><textarea rows={4} value={confirmReason} onChange={(e)=>setConfirmReason(e.target.value)} placeholder={confirmAction==='cancel'?'Motivo do cancelamento':'Observação opcional'}/><footer><button className="secondary" onClick={()=>setConfirmAction(null)}>Voltar</button><button className="primary danger-button" onClick={()=>void confirmDestructive()}>{confirmAction==='delete'?'Excluir':'Confirmar cancelamento'}</button></footer></section></div>}
  </Shell>;
}
