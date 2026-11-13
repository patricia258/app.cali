import { ProjectMessage } from './components/ProjectMessage';
import { DeliveryDetailDialog } from '../../components/projects/DeliveryDetailDialog';
import { DeliveryDetailHeader } from '../../components/projects/DeliveryDetailHeader';
import { DeliveryDetailTabs } from '../../components/projects/DeliveryDetailTabs';
import { DeliverySummary } from '../../components/projects/DeliverySummary';
import { DeliveryNotice } from '../../components/projects/DeliveryNotice';
import { DeliveryActionButton } from '../../components/projects/DeliveryActionButton';
import { WorkspaceAdminPage } from '../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../components/workspace/components/WorkspaceAdminContent';
import { WorkspaceAdminPanel } from '../../components/workspace/components/WorkspaceAdminPanel';
import { WorkspaceAdminPanelHeader } from '../../components/workspace/components/WorkspaceAdminPanelHeader';
import { ProjectComplexityBadge } from '../../components/projects/ProjectComplexityBadge';
import { ProjectComplexityCard } from '../../components/projects/ProjectComplexityCard';
import { ProjectTimerButton } from './components/ProjectTimerButton';
import { projectStatusColor } from './components/projectStatusColor';
import { DeliveryHistory } from '../../components/projects/DeliveryHistory';
import { DeliveryProgress } from '../../components/projects/DeliveryProgress';
import { ProjectSectionTabs } from '../../components/projects/ProjectSectionTabs';
import { DeliverySchedule } from '../../components/projects/DeliverySchedule';
import { WorkspaceConfirmDialog } from '../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../components/workspace/components/WorkspaceDialogOverlay';
import { WorkspacePageHeader } from '../../components/workspace/WorkspacePageHeader';
import { ProjectKanban } from './components/ProjectKanban';
import { Button } from '../../components/ds/Button';
import { EmptyState } from '../../components/ds/EmptyState';
import { WorkspaceToast } from '../../components/workspace/components/WorkspaceToast';
import { StatusBadge } from '../../components/ds/StatusBadge';
import { TimerFinalizationDialog } from '../../components/hours/TimerFinalizationDialog';
import { withMentions } from '../../lib/mentionText';
import { createContext, FormEvent, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SubtaskModal, subtaskStatusOptions, subtaskStatusLabel } from './components/SubtaskPanel';
import { NoteLog } from './components/NoteLog';
import { DeliverableDependencies } from '../../components/projects/DeliverableDependencies';
import { DeliverableFiles } from './components/DeliverableFiles';
import { ProjectDeliveryHistory } from './components/ProjectDeliveryHistory';
import { ProjectWorkTimer } from './components/ProjectWorkTimer';
import { normalizeFrontName } from './components/FrontCatalogField';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { CreateProjectFrontDialog } from './components/CreateProjectFrontDialog';
import { DeliverableEditorDialog } from './components/DeliverableEditorDialog';
import { ComplexityLegend } from './components/ComplexityLegend';
import { EditProjectFrontDialog } from './components/EditProjectFrontDialog';
import { DeleteProjectFrontDialog } from './components/DeleteProjectFrontDialog';
import type { DeliverableForm, FrontDraft, FrontForm, ProjectForm } from './projectForms';
import { ProjectForecast } from './components/ProjectForecast';
import { ProjectForecastAlert } from './components/ProjectForecastAlert';
import { ProjectLifecycleControls } from './components/ProjectLifecycleControls';
import { AdminScheduleReview } from './components/AdminScheduleReview';
import { ProjectDraftReadiness } from './components/ProjectDraftReadiness';
import { ProjectFrontDisclosure } from './components/ProjectFrontDisclosure';
import { ConfirmProjectSubmissionDialog } from './components/ConfirmProjectSubmissionDialog';
import { useProjectDeepLink } from './hooks/useProjectDeepLink';
import { useProjectTaskHighlight } from './hooks/useProjectTaskHighlight';
import { usePublishProjectSchedule } from './hooks/usePublishProjectSchedule';
import { useAdminProjectTimer } from './hooks/useAdminProjectTimer';
import { ChevronDown, ChevronRight, Pause,
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, Edit3,
  FileText, FolderKanban, GitBranch, LayoutGrid, List, Paperclip, Play,
  Plus, RefreshCw, Search, Send, ShieldCheck, Square, Trash2, X,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import type { ProfileMedia } from '../../api/workspace/identity';
import { ConversationAttachmentButton } from '../../components/projects/conversation/components/ConversationAttachmentButton';
import './project-task-highlight.css';
import { isSupabaseConfigured } from '../../api/access/session';
import {
  changeDeliverableStatus, createProjectFront, createProjectWithFronts, deleteDeliverableDraft, insertDeliverable,
  logDeliverableDeadlineEdit, readDeliverableContext, readProjectPartnerContext, readProjectsWorkspace,
  reopenDeliverableReview, requestDeliverableAdjustment, requestPartnerDeliverableReview, startPartnerDeliverableTimer,
  submitPartnerProjectChange, updateDeliverable, type ProjectCompany,
} from '../../api/projects/workspace';
import { addDeliverableTask, addPartnerDeliverableTask, changeDeliverableTaskStatus, readDeliverableTasks } from '../../api/projects/tasks';
import {
  postPartnerDeliverableComment, readPartnerDeliverableConversation, uploadDeliverableAttachment,
} from '../../api/projects/conversation';
import { DeliverableConversation } from '../../components/projects/conversation/DeliverableConversation';
import { DeliverableConversationTabLabel } from '../../components/projects/conversation/DeliverableConversationTabLabel';
import { startPartnerTimer, stopPartnerTimer } from '../../api/hours/timers';
import { openPrivateWorkspaceFile } from '../../api/files/workspace';
import type { JsonObject } from '../../domain/json';
import {
  businessDaysLate, complexityMeta, deliverableLabels, formatProjectDate, previewProjects, projectPlanningLabels,
  projectProgress, type DeliverableStatus, type MaterialComplexity, type ProjectDeliverable,
  type ProjectPlanningStatus, type WorkspaceProject,
} from '../../domain/projects';

type ProjectView = 'overview' | 'roadmap' | 'deliverables' | 'history';
type DeliverableView = 'list' | 'kanban';
type DetailTab = 'overview' | 'tasks' | 'conversation' | 'files' | 'history';
type ConversationChannel = 'internal' | 'client';

type ProjectFront = {
  id: string; protocol: string; projectId: string; companyId: string; name: string; objective: string;
  monthStart: number | null; monthEnd: number | null; status: 'planned' | 'active' | 'completed' | 'cancelled'; sortOrder: number;
};
type TaskItem = {
  id: string; protocol: string; deliverableId: string; title: string; description?: string | null;
  status: string; dueAt?: string | null; clientVisible: boolean;
  estimatedMinutes: number; sortOrder: number; complexity?: MaterialComplexity | null; isDocument?: boolean;
};
type TaskRow = {
  id: string; protocol: string | null; deliverable_id: string; title: string; description?: string | null;
  status: string; due_at?: string | null; client_visible: boolean; estimated_minutes?: number | null;
  sort_order?: number | null; complexity?: MaterialComplexity | null; is_document?: boolean | null;
};
type ProjectRow = {
  id: string; protocol: string | null; company_id: string; name: string; description?: string | null; status: string;
  planning_status: ProjectPlanningStatus | null; start_date?: string | null; roadmap_start_date?: string | null; target_end_date?: string | null; roadmap_end_date?: string | null;
  client_response_business_days?: number | null; adjustment_limit?: number | null;
};
type DeliverableRow = {
  id: string; protocol?: string | null; code?: string | null; project_id: string; title: string; description?: string | null;
  status: DeliverableStatus; workstream?: string | null; workstream_id?: string | null; complexity?: MaterialComplexity | null;
  roadmap_month_start?: number | null; roadmap_month_end?: number | null; due_at?: string | null; original_due_at?: string | null;
  client_response_due_at?: string | null; client_delay_business_days?: number | null; adjustment_count?: number | null;
  rebriefing_required?: boolean | null; is_document?: boolean | null; sort_order?: number | null;
  client_visible?: boolean | null; review_revision?: number | null;
};
type FrontRow = {
  id: string; protocol?: string | null; project_id: string; company_id: string; name: string; objective?: string | null;
  roadmap_month_start: number | null; roadmap_month_end: number | null; status: ProjectFront['status']; sort_order?: number | null;
};
type PartnerCommentRow = { id: string; body: string; author_user_id: string | null; source_actor?: string | null; created_at: string };
type StatusHistoryRow = { id: string | number; from_status?: DeliverableStatus | null; to_status: DeliverableStatus; note?: string | null; created_at: string };
type HistoryItem = { id: string; title: string; detail: string; createdAt: string };
type ActiveTimer = { id?: string; taskId?: string | null; deliverableId: string; startedAt: string; preview: boolean } | null;
type TaskForm = { title: string; description: string; dueDate: string; estimatedHours: string; clientVisible: boolean; complexity: string; isDocument: boolean };
type PendingStatus = { item: ProjectDeliverable; status: DeliverableStatus | 'reopen' } | null;

const draftActionClass = 'tw:grid tw:size-[2.3077rem] tw:place-items-center tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:p-0 tw:text-cali-brand tw:cursor-pointer tw:hover:border-[#8e5665] tw:hover:bg-[#f7f0f2] tw:disabled:cursor-not-allowed';

const statuses: DeliverableStatus[] = ['not_started','in_progress','standby','internal_review','client_review','adjustment_requested','rebriefing','approved','cancelled'];
const statusTone: Record<DeliverableStatus,string> = {
  not_started:'status-neutral', in_progress:'status-progress', standby:'status-standby', internal_review:'status-review',
  client_review:'status-client', adjustment_requested:'status-adjustment', rebriefing:'status-rebriefing',
  approved:'status-approved', cancelled:'status-cancelled',
};
const projectTone: Record<ProjectPlanningStatus,string> = {
  draft:'neutral', client_review:'gold', adjustment_requested:'gold', approved:'success', active:'success', rebriefing:'danger', closed:'neutral',
};

const servicePlanLabel = (service?: string | null, plan?: string | null) => {
  if (service === 'CALI Partner') return 'Assessoria Estratégica Mensal · CALI Partner';
  if (service === 'CALI Full') return 'Assessoria Estratégica Mensal · CALI Full';
  if (service === 'Assessoria Estratégica Mensal' && plan === 'partner') return 'Assessoria Estratégica Mensal · CALI Partner';
  if (service === 'Assessoria Estratégica Mensal' && plan === 'full') return 'Assessoria Estratégica Mensal · CALI Full';
  return service || 'Serviço CALI';
};
const isUuid = (value?: string | null) => Boolean(value && /^[0-9a-f-]{36}$/i.test(value));
const roadmapLabel = (item: ProjectDeliverable) => !item.roadmapMonthStart ? 'Sem mês' : (!item.roadmapMonthEnd || item.roadmapMonthEnd === item.roadmapMonthStart ? `M${item.roadmapMonthStart}` : `M${item.roadmapMonthStart}–M${item.roadmapMonthEnd}`);
const hoursLabel = (hours: number) => `${hours.toLocaleString('pt-BR',{minimumFractionDigits:hours%1?1:0,maximumFractionDigits:1})}h`;
const emptyProjectForm = (companyId=''): ProjectForm => ({ companyId, name:'', startDate:'', endDate:'', clientResponseBusinessDays:3 });
const emptyFrontForm = (): FrontForm => ({ name:'', objective:'', monthStart:1, monthEnd:1 });
const emptyDeliverableForm = (frontId=''): DeliverableForm => ({ title:'', description:'', frontId, complexity:'MC2', monthStart:1, monthEnd:1, dueDate:'', isDocument:true, clientVisible:true });
function toTaskItem(row: TaskRow): TaskItem {
  return {
    id: row.id, protocol: row.protocol || '—', deliverableId: row.deliverable_id, title: row.title,
    description: row.description, status: row.status, dueAt: row.due_at, clientVisible: Boolean(row.client_visible),
    estimatedMinutes: Number(row.estimated_minutes || 0), sortOrder: Number(row.sort_order || 0),
    complexity: row.complexity || null, isDocument: Boolean(row.is_document),
  };
}

const projectTabs: [ProjectView, string][] = [['roadmap', 'Cronograma'], ['deliverables', 'Entregáveis'], ['history', 'Histórico']];
const deliverableTabs: DetailTab[] = ['overview', 'tasks', 'conversation', 'files', 'history'];

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
const projectStatusControl = 'tw:inline-flex tw:w-fit tw:min-w-0 tw:max-w-full tw:items-center tw:gap-[.46rem] tw:justify-self-start tw:rounded-[.46rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-[.62rem]';
const projectStatusSelect = 'tw:max-w-full tw:border-0 tw:bg-transparent tw:px-[.15rem] tw:py-[.54rem] tw:text-[.85rem] tw:font-semibold tw:text-cali-brand tw:outline-none';
const projectStatusDot = 'tw:size-[.54rem] tw:shrink-0 tw:rounded-full';
const dotColorByStatus: Partial<Record<DeliverableStatus, string>> = {
  approved: 'tw:bg-[#3caf80]', in_progress: 'tw:bg-[#7aafcd]', internal_review: 'tw:bg-[#7aafcd]',
  cancelled: 'tw:bg-[#b7495d]', rebriefing: 'tw:bg-[#b7495d]', not_started: 'tw:bg-[#c9bcb2]',
};

const subtaskTone: Partial<Record<string, DeliverableStatus>> = { todo:'not_started', doing:'in_progress', standby:'standby', internal_review:'internal_review', client_review:'client_review', approved:'approved', done:'approved', cancelled:'cancelled' };
/** Situação da subtarefa: mesmo desenho do seletor do entregável, com as opções que cada perfil pode usar. */
function SubtaskStatusSelect({ title, status, onChange }: { title:string; status:string; onChange:(next:string)=>void }) {
  const staffMode = Boolean(useContext(StaffModeContext)); const options = subtaskStatusOptions(staffMode, status);
  const tone = subtaskTone[status] || 'not_started';
  return <label className={`${projectStatusControl} ${statusTone[tone]}`} onClick={(e)=>e.stopPropagation()}>
    <span className={`status-dot-v3 ${projectStatusDot} ${dotColorByStatus[tone] ?? 'tw:bg-cali-gold'}`}/><select className={projectStatusSelect} aria-label={`Situação de ${title}`} value={status} disabled={options.length===1} title={options.length===1?'Só a Patricia altera esta situação':undefined} onChange={(e)=>onChange(e.target.value)}>{options.map((value)=><option key={value} value={value}>{subtaskStatusLabel(value,staffMode)}</option>)}</select>
  </label>;
}
function StatusSelect({ item, onChange, headerTone }: {
  item: ProjectDeliverable;
  onChange: (status: DeliverableStatus) => void;
  headerTone?: string;
}) {
  const staffMode = useContext(StaffModeContext);
  const disabled = staffMode ? staffLocked(item.status) : item.status === 'approved';
  const choices = staffMode ? (disabled ? [item.status] : staffStatuses) : statuses.filter((status) => (
    (status !== 'approved' || item.status === 'approved' || (item.reviewRevision ?? 1) === 1)
    && (status !== 'adjustment_requested' || item.clientVisible || (item.reviewRevision ?? 1) === 1)
  ));
  return <label
    className={headerTone
      ? `tw:order-1 tw:inline-flex tw:h-[3.077rem] tw:min-w-0 tw:items-center tw:gap-[.615rem] tw:rounded-[.692rem] tw:pr-[.308rem] tw:pl-[.923rem] tw:text-white ${projectStatusColor[headerTone] ?? projectStatusColor.purple}`
      : `${projectStatusControl} ${statusTone[item.status]}`}
    title={headerTone ? 'Situação do entregável — clique para alterar' : undefined}
    onClick={(event) => event.stopPropagation()}
  >
    <span aria-hidden="true" className={`${projectStatusDot} ${headerTone ? 'tw:bg-white tw:opacity-90' : dotColorByStatus[item.status] ?? 'tw:bg-cali-gold'}`} />
    <select
      className={headerTone
        ? 'tw:h-full tw:min-w-0 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:pr-[.462rem] tw:text-[.962rem] tw:font-extrabold tw:text-white tw:disabled:cursor-default tw:disabled:opacity-100 tw:[&_option]:bg-white tw:[&_option]:text-cali-ink'
        : projectStatusSelect}
      aria-label={`Status de ${item.title}`}
      value={item.status}
      disabled={disabled}
      title={staffMode && disabled ? 'Só a Patricia altera esta situação' : undefined}
      onChange={(event) => onChange(event.target.value as DeliverableStatus)}
    >
      {choices.map((status) => (
        <option key={status} value={status}>{staffMode && status === 'internal_review' ? 'Revisão da Patricia' : deliverableLabels[status]}</option>
      ))}
    </select>
  </label>;
}

export function StaffProjectsPage({ companies }: StaffProjectsScope) { return <StaffModeContext.Provider value={true}><AdminProjectsPage staff={{ companies }} /></StaffModeContext.Provider>; }
export function AdminProjectsPage({ staff, emptyPortfolio = false }: { staff?: StaffProjectsScope; emptyPortfolio?: boolean } = {}) {
  useEffect(()=>{ if(!staff)return; const refresh=()=>void loadWorkspace(); window.addEventListener('cali:staff-refresh',refresh); return()=>window.removeEventListener('cali:staff-refresh',refresh); },[staff]);
  const { entryKey, projectId: targetProjectId, deliverableId: targetId, taskId: targetTaskId, view: targetView } = useProjectDeepLink();
  const openedDeepLink = useRef('');
  const { id: highlightedTaskId, ref: highlightedTaskRef, highlight: highlightTask, clear: clearTaskHighlight } = useProjectTaskHighlight();
  const [openTaskId,setOpenTaskId] = useState<string|null>(null); const [closedSubs,setClosedSubs] = useState<Record<string,boolean>>({});
  const [staffChat,setStaffChat] = useState<{id:string;body:string;authorId:string|null;actor:string;createdAt:string}[]>([]); const [staffPeople,setStaffPeople] = useState<Record<string, ProfileMedia>>({}); const [staffUserId,setStaffUserId] = useState(''); const [staffReviewPending,setStaffReviewPending] = useState<Record<string,boolean>>({}); const [staffNotice,setStaffNotice] = useState('');
  useEffect(()=>{ if(!staffNotice)return; const timer=window.setTimeout(()=>setStaffNotice(''),4500); return()=>window.clearTimeout(timer); },[staffNotice]);
  const [projects,setProjects] = useState<WorkspaceProject[]>(emptyPortfolio ? [] : previewProjects);
  const [selectedProjectId,setSelectedProjectId] = useState(emptyPortfolio ? '' : previewProjects[0].id);
  const [projectCompanies, setProjectCompanies] = useState<ProjectCompany[] | null>(null);
  const [fronts,setFronts] = useState<ProjectFront[]>(() => emptyPortfolio ? [] : previewProjects.flatMap(previewFronts));
  const [tasks,setTasks] = useState<TaskItem[]>(() => emptyPortfolio ? [] : previewProjects.flatMap((p)=>p.deliverables.flatMap(previewTasks)));
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
  const [frontAction, setFrontAction] = useState<{ type: 'edit' | 'delete'; front: ProjectFront } | null>(null);
  const [frontModal,setFrontModal] = useState(false);
  const [frontForm,setFrontForm] = useState<FrontForm>(emptyFrontForm());
  const [deliverableModal,setDeliverableModal] = useState(false);
  const [editingDeliverable,setEditingDeliverable] = useState<ProjectDeliverable|null>(null);
  const [deliverableForm,setDeliverableForm] = useState<DeliverableForm>(emptyDeliverableForm());
  const [pendingStatus,setPendingStatus] = useState<PendingStatus>(null);
  const [statusError, setStatusError] = useState('');
  const [statusReason,setStatusReason] = useState('');
  const [confirmDelete,setConfirmDelete] = useState<ProjectDeliverable | null>(null);
  const [submission, setSubmission] = useState<'project' | ProjectDeliverable | null>(null);
  const [submissionPending, setSubmissionPending] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  // Equipe CALI: quem é quem na conversa (nome e foto), pedidos de aprovação pendentes e mensagens do canal aberto.
  useEffect(()=>{ if(!staff||!isSupabaseConfigured)return; let alive=true; void (async()=>{
    const { userId, people, pending } = await readProjectPartnerContext();
    if (!alive) return;
    setStaffUserId(userId);
    setStaffReviewPending(pending);
    setStaffPeople(Object.fromEntries(people.flatMap((person) => person.id ? [[person.id, person]] : [])));
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
  const publishSchedule = usePublishProjectSchedule(loadWorkspace);

  const selectedProject = projects.find((p)=>p.id===selectedProjectId) || projects[0];
  const selectedFronts = fronts.filter((f)=>f.projectId===selectedProject?.id && f.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder);
  const selectedTasks = selectedDeliverable ? tasks.filter((t)=>t.deliverableId===selectedDeliverable.id && t.status!=='cancelled').sort((a,b)=>a.sortOrder-b.sortOrder) : [];
  const adminTimer = useAdminProjectTimer(
    !staff && selectedProject && selectedDeliverable && isUuid(selectedDeliverable.id)
      ? { companyId: selectedProject.companyId, projectId: selectedProject.id, deliverable: selectedDeliverable }
      : undefined,
    () => loadWorkspace(true),
  );

  useEffect(()=>{ void loadWorkspace(); },[]);
  useEffect(() => {
    const key = JSON.stringify([entryKey, targetProjectId, targetId, targetTaskId, targetView]);
    if (loading || openedDeepLink.current === key) return;
    openedDeepLink.current = key;
    if (!targetProjectId && !targetId) return;

    const requestedProject = projects.find(({ id, protocol }) => id === targetProjectId || protocol === targetProjectId);
    const matchesDeliverable = ({ id, protocol }: ProjectDeliverable) => id === targetId || protocol === targetId;
    const project = requestedProject ?? projects.find(({ deliverables }) => deliverables.some(matchesDeliverable));
    if (!project) return;

    const deliverable = project.deliverables.find(matchesDeliverable);
    setSelectedProjectId(project.id);
    setSelectedDeliverable(deliverable ?? null);
    setOpenTaskId(null);
    clearTaskHighlight();
    if (!deliverable) return;

    const task = tasks.find(({ id, deliverableId, status }) => id === targetTaskId && deliverableId === deliverable.id && status !== 'cancelled');
    if (targetView === 'overview' || targetTaskId) setProjectView('deliverables');
    setDetailTab(task ? 'tasks' : targetView);
    if (task) highlightTask(task.id);
  }, [clearTaskHighlight, entryKey, highlightTask, loading, projects, targetId, targetProjectId, targetTaskId, targetView, tasks]);
  useEffect(()=>{
    const active=projectModal||frontModal||Boolean(frontAction)||deliverableModal||Boolean(selectedDeliverable)||Boolean(pendingStatus)||Boolean(confirmDelete)||Boolean(submission);
    document.body.classList.toggle('workspace-modal-open',active);
    return()=>document.body.classList.remove('workspace-modal-open');
  },[projectModal,frontModal,frontAction,deliverableModal,selectedDeliverable,pendingStatus,confirmDelete,submission]);
  useEffect(()=>{
    if (!activeTimer) { setTimerSeconds(0); return; }
    const tick=()=>setTimerSeconds(Math.max(0,Math.floor((Date.now()-new Date(activeTimer.startedAt).getTime())/1000)));
    tick(); const id=window.setInterval(tick,1000); return()=>window.clearInterval(id);
  },[activeTimer]);
  useEffect(()=>{ if(selectedDeliverable) void loadDeliverableContext(selectedDeliverable.id); },[selectedDeliverable?.id]);

  async function loadWorkspace(syncDeliverable = false) {
    if(!isSupabaseConfigured){ setLoading(false); return; }
    try {
      const { companyRows, projectRows, frontRows, deliverableRows, taskRows, hourRows, timerRows } = await readProjectsWorkspace(staff?.companies);
      if (companyRows) setProjectCompanies(companyRows);
      if(!projectRows?.length) return;
      const companyMap = new Map<string, ProjectCompany>((companyRows || []).map((row: ProjectCompany) => [row.id, row]));
      const nextTasks = (taskRows || []).map(toTaskItem);
      const taskMap = new Map<string, TaskItem[]>();
      nextTasks.forEach((item) => {
        taskMap.set(item.deliverableId, [...(taskMap.get(item.deliverableId) || []), item]);
      });
      const hours = new Map<string, number>();
      (hourRows || []).forEach((row: { deliverable_id: string | null; minutes: number | null }) => {
        if (row.deliverable_id) hours.set(row.deliverable_id, (hours.get(row.deliverable_id) || 0) + Number(row.minutes || 0) / 60);
      });
      const nextProjects = projectRows.map((row: ProjectRow): WorkspaceProject => {
        const company = companyMap.get(row.company_id);
        const deliverables = (deliverableRows || []).filter((item: DeliverableRow) => item.project_id === row.id).map((item: DeliverableRow): ProjectDeliverable => {
          const related = taskMap.get(item.id) || [];
          return {
            id: item.id, protocol: item.protocol || item.code || '—', title: item.title, description: item.description,
            status: item.status, workstream: item.workstream || 'Frente não definida', workstreamId: item.workstream_id,
            complexity: item.complexity || 'MC2', roadmapMonthStart: item.roadmap_month_start, roadmapMonthEnd: item.roadmap_month_end,
            dueAt: item.due_at, originalDueAt: item.original_due_at, clientResponseDueAt: item.client_response_due_at,
            clientDelayBusinessDays: Number(item.client_delay_business_days || 0), adjustmentCount: Number(item.adjustment_count || 0),
            rebriefingRequired: Boolean(item.rebriefing_required), isDocument: Boolean(item.is_document), hours: hours.get(item.id) || 0,
            taskCount: related.length, taskDone: related.filter((task) => task.status === 'done').length,
            sortOrder: Number(item.sort_order || 0), clientVisible: Boolean(item.client_visible), reviewRevision: Number(item.review_revision || 1),
          };
        });
        return {
          id: row.id, protocol: row.protocol || '—', companyId: row.company_id, company: company?.display_name || 'Cliente',
          companyLogo: company?.logo_url, name: row.name, service: servicePlanLabel(company?.service_type, company?.service_plan),
          description: row.description, planningStatus: row.planning_status || (row.status === 'active' ? 'active' : 'draft'),
          startDate: row.start_date, roadmapStartDate: row.roadmap_start_date, endDate: row.target_end_date, forecastEndDate: row.roadmap_end_date,
          clientResponseBusinessDays: Number(row.client_response_business_days || 3),
          adjustmentLimit: Number(row.adjustment_limit || 3), deliverables,
        };
      });
      const nextFronts = (frontRows || []).map((row: FrontRow): ProjectFront => ({
        id: row.id, protocol: row.protocol || '—', projectId: row.project_id, companyId: row.company_id,
        name: row.name, objective: row.objective || '', monthStart: row.roadmap_month_start, monthEnd: row.roadmap_month_end,
        status: row.status, sortOrder: Number(row.sort_order || 0),
      }));
      setProjects(nextProjects);
      setFronts(nextFronts);
      setTasks(nextTasks);
      if (syncDeliverable) setSelectedDeliverable((current) => current
        ? nextProjects.flatMap(({ deliverables }) => deliverables).find(({ id }) => id === current.id) ?? current
        : null);
      setSelectedProjectId((current)=>nextProjects.some((p)=>p.id===current)?current:nextProjects[0].id);
      if(staff && timerRows?.[0]) setActiveTimer({id:timerRows[0].id,deliverableId:timerRows[0].deliverable_id,taskId:timerRows[0].task_id||null,startedAt:timerRows[0].started_at,preview:false});
    } catch(error){ console.error('Falha ao carregar projetos',error); }
    finally { setLoading(false); }
  }

  async function loadDeliverableContext(deliverableId:string) {
    if(!isSupabaseConfigured || !isUuid(deliverableId)) {
      setHistory([{id:'h1',title:'Entregável criado',detail:'Incluído no cronograma e vinculado à frente.',createdAt:'2026-08-20T10:00:00-03:00'},{id:'h2',title:'Status alterado',detail:`Status atual: ${deliverableLabels[selectedDeliverable?.status||'not_started']}.`,createdAt:'2026-08-27T09:00:00-03:00'}]); return;
    }
    const { statusRows, correctionRows } = await readDeliverableContext(deliverableId, Boolean(staff));

    const corrections = (correctionRows ?? []) as { review_revision: number; opened_at: string | null; reason: string | null; approved_at: string | null; score: number | null }[];
    const statusHistory = (statusRows ?? [])
      .filter((row: StatusHistoryRow) => !corrections.length || row.note !== 'Entregável reaberto para correção.')
      .map((r: StatusHistoryRow): HistoryItem => ({ id: String(r.id), title: `${r.from_status ? deliverableLabels[r.from_status] + ' → ' : ''}${deliverableLabels[r.to_status] || r.to_status}`, detail: r.note || 'Mudança registrada no fluxo.', createdAt: r.created_at }));
    const correctionHistory = corrections.flatMap((row): HistoryItem[] => {
      const rows: HistoryItem[] = [];
      if (row.opened_at && row.reason) rows.push({ id: `reopen-${row.review_revision}`, title: `Revisão ${row.review_revision} aberta para correção`, detail: row.reason, createdAt: row.opened_at });
      if (row.approved_at && row.score) rows.push({ id: `review-${row.review_revision}`, title: `Avaliação da revisão ${row.review_revision}`, detail: `Nota ${row.score}/5`, createdAt: row.approved_at });
      return rows;
    });
    setHistory([...statusHistory, ...correctionHistory].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  }

  const filteredProjects=useMemo(()=>projects.filter((p)=>{const text=`${p.company} ${p.name} ${p.protocol} ${p.service}`.toLowerCase(); return (!query||text.includes(query.toLowerCase()))&&(statusFilter==='all'||p.planningStatus===statusFilter);}),[projects,query,statusFilter]);
  const creationAccounts = !staff && projectCompanies
    ? projectCompanies.map(({ id, display_name }) => [id, display_name] as const)
    : Array.from(new Map(projects.map((project) => [project.companyId, project.company])).entries());

  const duplicateInitialFronts = new Set(frontDrafts.map(({ name }) => normalizeFrontName(name)).filter(Boolean)).size
    !== frontDrafts.filter(({ name }) => name.trim()).length;
  const duplicateNewFront = Boolean(frontForm.name.trim()) && selectedFronts.some(
    ({ name }) => normalizeFrontName(name) === normalizeFrontName(frontForm.name),
  );
  const draftProject = selectedProject?.planningStatus === 'draft';
  const isPersistedAdminProject = !staff && isSupabaseConfigured && isUuid(selectedProject?.id);
  const draftIssues: string[] = [];
  if (isPersistedAdminProject && draftProject) {
    const deliveries = selectedProject.deliverables.filter(({ status }) => status !== 'cancelled');
    const missing = deliveries.filter(({ dueAt }) => !dueAt).length;
    const empty = selectedFronts.filter(({ id, name }) => !deliveries.some(({ workstreamId, workstream }) =>
      workstreamId === id || (!workstreamId && normalizeFrontName(workstream) === normalizeFrontName(name)),
    )).length;
    if (!deliveries.length) draftIssues.push('Inclua pelo menos um entregável.');
    if (empty) draftIssues.push(`${empty} ${empty === 1 ? 'frente ainda não tem' : 'frentes ainda não têm'} entregáveis.`);
    if (missing) draftIssues.push(`${missing} ${missing === 1 ? 'entregável ainda não tem prazo' : 'entregáveis ainda não têm prazo'}.`);
    if (!selectedProject.startDate && !selectedProject.roadmapStartDate) draftIssues.push('Defina a data planejada de início.');
  }
  const showForecast = !staff && isSupabaseConfigured && isUuid(selectedProject?.id);
  const forecastDelay = showForecast && selectedProject.endDate && selectedProject.forecastEndDate
    ? businessDaysLate(selectedProject.endDate, new Date(`${selectedProject.forecastEndDate.slice(0, 10)}T12:00:00`))
    : 0;

  function openFront() {
    setFrontForm(emptyFrontForm());
    setFrontModal(true);
  }

  async function finishFrontAction() {
    await loadWorkspace();
    setFrontAction(null);
  }

  function openNewProject() {
    const currentCompanyId = selectedProject?.companyId;
    const companyId = creationAccounts.some(([id]) => id === currentCompanyId) ? currentCompanyId : creationAccounts[0]?.[0];
    setProjectForm(emptyProjectForm(companyId || ''));
    setFrontDrafts([{ id: crypto.randomUUID(), name: '', objective: '', monthStart: 1, monthEnd: 1 }]);
    setProjectModal(true);
  }
  function addFrontDraft(){ setFrontDrafts((c)=>[...c,{id:crypto.randomUUID(),name:'',objective:'',monthStart:1,monthEnd:1}]); }
  function patchFrontDraft(id:string,patch:Partial<FrontDraft>){ setFrontDrafts((c)=>c.map((f)=>f.id===id?{...f,...patch}:f)); }
  function removeFrontDraft(id:string){ setFrontDrafts((c)=>c.length===1?c:c.filter((f)=>f.id!==id)); }

  async function createProject(event:FormEvent){
    event.preventDefault(); if(!projectForm.name.trim()||!projectForm.companyId||duplicateInitialFronts) return; setSaving(true);
    try{
      const validFronts=frontDrafts.filter((f)=>f.name.trim());
      if(staff){ const ok=await staffSubmitChange('project_create',`Novo projeto: ${projectForm.name.trim()}`,{project:{company_id:projectForm.companyId,name:projectForm.name.trim(),status:'planned',planning_status:'draft',start_date:projectForm.startDate||null,target_end_date:projectForm.endDate||null,roadmap_start_date:projectForm.startDate||null,roadmap_end_date:projectForm.endDate||null,client_response_business_days:projectForm.clientResponseBusinessDays,adjustment_limit:3},fronts:validFronts.map((f,index)=>({name:f.name.trim(),objective:f.objective.trim()||null,roadmap_month_start:f.monthStart,roadmap_month_end:f.monthEnd,sort_order:index+1}))},projectForm.companyId); if(ok)setProjectModal(false); return; }
      if(isSupabaseConfigured&&isUuid(projectForm.companyId)){
        const id = await createProjectWithFronts({
          company_id: projectForm.companyId, name: projectForm.name.trim(), status: 'planned', planning_status: 'draft',
          start_date: projectForm.startDate || null, target_end_date: projectForm.endDate || null,
          roadmap_start_date: projectForm.startDate || null, roadmap_end_date: projectForm.endDate || null,
          client_response_business_days: projectForm.clientResponseBusinessDays, adjustment_limit: 3,
        }, validFronts.map((front, index) => ({
          name: front.name.trim(), objective: front.objective.trim() || null, roadmap_month_start: front.monthStart,
          roadmap_month_end: front.monthEnd, sort_order: index + 1,
        })));
        setProjectModal(false);
        await loadWorkspace();
        if (id) setSelectedProjectId(id);
      } else {
        const company=projects.find((p)=>p.companyId===projectForm.companyId)?.company||'Cliente';
        const local:WorkspaceProject={id:`preview-project-${Date.now()}`,protocol:`CALI-PRJ-PREVIEW-${Date.now().toString().slice(-5)}`,companyId:projectForm.companyId,company,name:projectForm.name.trim(),service:projects.find((p)=>p.companyId===projectForm.companyId)?.service||'Serviço CALI',planningStatus:'draft',startDate:projectForm.startDate||null,endDate:projectForm.endDate||null,clientResponseBusinessDays:projectForm.clientResponseBusinessDays,adjustmentLimit:3,deliverables:[]};
        const localFronts=validFronts.map((f,index):ProjectFront=>({id:`preview-front-${Date.now()}-${index}`,protocol:`CALI-FRT-PREVIEW-${index+1}`,projectId:local.id,companyId:local.companyId,name:f.name,objective:f.objective,monthStart:f.monthStart,monthEnd:f.monthEnd,status:'planned',sortOrder:index+1}));
        setProjects((c)=>[local,...c]); setFronts((c)=>[...c,...localFronts]); setSelectedProjectId(local.id); setProjectModal(false);
      }
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  async function createFront(event:FormEvent){
    event.preventDefault(); if(!frontForm.name.trim()||duplicateNewFront)return; setSaving(true);
    try{
      if(staff){ const ok=await staffSubmitChange('front_create',`Nova frente em ${selectedProject.name}: ${frontForm.name.trim()}`,{row:{company_id:selectedProject.companyId,project_id:selectedProject.id,name:frontForm.name.trim(),objective:frontForm.objective.trim()||null,roadmap_month_start:frontForm.monthStart,roadmap_month_end:frontForm.monthEnd,sort_order:selectedFronts.length+1}},selectedProject.companyId); if(ok){ setFrontModal(false); setFrontForm(emptyFrontForm()); } return; }
      if(isSupabaseConfigured&&isUuid(selectedProject.id)){ const {error}=await createProjectFront({company_id:selectedProject.companyId,project_id:selectedProject.id,name:frontForm.name.trim(),objective:frontForm.objective.trim()||null,roadmap_month_start:frontForm.monthStart,roadmap_month_end:frontForm.monthEnd,sort_order:selectedFronts.length+1}); if(error)throw error; await loadWorkspace(); }
      else setFronts((c)=>[...c,{id:`preview-front-${Date.now()}`,protocol:`CALI-FRT-PREVIEW-${Date.now().toString().slice(-4)}`,projectId:selectedProject.id,companyId:selectedProject.companyId,name:frontForm.name.trim(),objective:frontForm.objective.trim(),monthStart:frontForm.monthStart,monthEnd:frontForm.monthEnd,status:'planned',sortOrder:selectedFronts.length+1}]);
      setFrontModal(false); setFrontForm(emptyFrontForm());
    }catch(error){console.error(error);}finally{setSaving(false);}
  }

  function openDeliverable(front?:ProjectFront,item?:ProjectDeliverable){
    setEditingDeliverable(item||null);
    const relatedFront=item ? selectedFronts.find((f)=>f.name===item.workstream || item.workstreamId===f.id) : front;
    setDeliverableForm(item?{title:item.title,description:item.description||'',frontId:relatedFront?.id||'',complexity:item.complexity,monthStart:item.roadmapMonthStart||relatedFront?.monthStart||1,monthEnd:item.roadmapMonthEnd||relatedFront?.monthEnd||1,dueDate:item.dueAt?.slice(0,10)||'',isDocument:item.isDocument,clientVisible:item.clientVisible}:emptyDeliverableForm(front?.id||''));
    setDeliverableModal(true);
  }

  async function saveDeliverable(event:FormEvent){
    event.preventDefault(); if(!deliverableForm.title.trim())return; const front=selectedFronts.find((f)=>f.id===deliverableForm.frontId); if(!front)return; setSaving(true);
    try{
      if(isSupabaseConfigured&&isUuid(selectedProject.id)){
        const payload={title:deliverableForm.title.trim(),description:deliverableForm.description.trim()||null,workstream:front.name,workstream_id:isUuid(front.id)?front.id:null,complexity:deliverableForm.complexity,roadmap_month_start:deliverableForm.monthStart,roadmap_month_end:deliverableForm.monthEnd,due_at:deliverableForm.dueDate?`${deliverableForm.dueDate}T18:00:00-03:00`:null,is_document:deliverableForm.isDocument,client_visible:deliverableForm.clientVisible};
        if(staff){ const ok=editingDeliverable&&isUuid(editingDeliverable.id)?await staffSubmitChange('deliverable_update',`Editar entregável: ${editingDeliverable.title}`,{id:editingDeliverable.id,row:payload},selectedProject.companyId):await staffSubmitChange('deliverable_create',`Novo entregável em ${selectedProject.name}: ${payload.title}`,{row:{...payload,company_id:selectedProject.companyId,project_id:selectedProject.id,status:'not_started',priority:'normal',sort_order:selectedProject.deliverables.length+1}},selectedProject.companyId); if(ok){ setDeliverableModal(false); setEditingDeliverable(null); } return; }
        const result=editingDeliverable&&isUuid(editingDeliverable.id)?await updateDeliverable(editingDeliverable.id, payload):await insertDeliverable({...payload,company_id:selectedProject.companyId,project_id:selectedProject.id,status:'not_started',priority:'normal',sort_order:selectedProject.deliverables.length+1}); if(result.error)throw result.error; /* Prazo mudado pelo "Editar" também entra no histórico do prazo (fora de rascunho, onde o cliente ainda não vê nada). */ if(editingDeliverable&&isUuid(editingDeliverable.id)&&payload.due_at&&editingDeliverable.dueAt&&String(editingDeliverable.dueAt).slice(0,10)!==String(payload.due_at).slice(0,10)&&selectedProject.planningStatus!=='draft'){ await logDeliverableDeadlineEdit(editingDeliverable.id, selectedProject.companyId, editingDeliverable.dueAt, payload.due_at); } await loadWorkspace();
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

  async function persistStatus(item:ProjectDeliverable,next:DeliverableStatus,note:string,onError = setStaffNotice){
    if(item.status==='approved'||next===item.status)return;
    if(isSupabaseConfigured&&isUuid(item.id)){
      const { error } = await changeDeliverableStatus(item.id, next, note || null, item.reviewRevision ?? 1, Boolean(staff));
      if(error){onError(error.message);return false;}
      await loadWorkspace();
      if(selectedDeliverable?.id===item.id) await loadDeliverableContext(item.id);
    } else {
      setProjects((c)=>c.map((p)=>({...p,planningStatus:next==='rebriefing'&&p.id===selectedProject.id?'rebriefing':p.planningStatus,deliverables:p.deliverables.map((d)=>d.id===item.id?{...d,status:next,rebriefingRequired:next==='rebriefing'?true:d.rebriefingRequired}:d)})));
      setHistory((c)=>[{id:`preview-history-${Date.now()}`,title:`${deliverableLabels[item.status]} → ${deliverableLabels[next]}`,detail:note||'Mudança registrada no fluxo.',createdAt:new Date().toISOString()},...c]);
    }
    setSelectedDeliverable((current)=>current?.id===item.id?{...current,status:next,
      clientVisible: next === 'client_review' || ((current.reviewRevision ?? 1) === 1 && current.clientVisible),
      rebriefingRequired:next==='rebriefing'?true:current.rebriefingRequired}:current);
    return true;
  }

  async function confirmPendingStatus() {
    if (!pendingStatus || !statusReason.trim() || saving) return;
    const current = pendingStatus;
    if (current.status === 'reopen') {
      if (!isSupabaseConfigured || staff) return;
      setSaving(true);
      setStatusError('');
      try {
        const result = await reopenDeliverableReview(current.item.id, current.item.reviewRevision ?? 1, statusReason.trim());
        if (result.error) throw new Error(result.error.message);
        const revision = Number(result.data?.review_revision);
        const status = (result.data?.status ?? 'internal_review') as DeliverableStatus;
        await loadWorkspace();
        setSelectedDeliverable((item) => item?.id === current.item.id
          ? { ...item, status, clientVisible: Boolean(result.data?.client_visible), reviewRevision: revision }
          : item);
        await loadDeliverableContext(current.item.id);
        setPendingStatus(null);
        setStatusReason('');
        setStaffNotice('Entregável reaberto para correção. Libere a revisão para voltar a exibi-lo ao cliente.');
      } catch (error) {
        setStatusError(error instanceof Error ? error.message : 'Não foi possível reabrir o entregável.');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (staff && current.status === 'cancelled') {
      const item = current.item;
      const ok = await staffSubmitChange('deliverable_cancel', `Cancelar entregável: ${item.title}`, { id: item.id, reason: statusReason.trim() }, selectedProject.companyId);
      if (!ok) return;
    } else {
      await persistStatus(current.item, current.status, statusReason.trim());
    }
    setPendingStatus(null);
    setStatusReason('');
  }

  async function requestAdjustment(){
    if(!selectedDeliverable||!adjustmentReason.trim())return; const next=selectedDeliverable.adjustmentCount+1; const rebrief=next>(selectedProject.adjustmentLimit||3);
    if(isSupabaseConfigured&&isUuid(selectedDeliverable.id)){ const {error}=await requestDeliverableAdjustment(selectedDeliverable.id, adjustmentReason.trim(), adjustmentImpact); if(error){setStaffNotice(error.message);return;} await loadWorkspace(); await loadDeliverableContext(selectedDeliverable.id); }
    else setProjects((c)=>c.map((p)=>p.id===selectedProject.id?{...p,planningStatus:rebrief?'rebriefing':p.planningStatus,deliverables:p.deliverables.map((d)=>d.id===selectedDeliverable.id?{...d,status:rebrief?'rebriefing':'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:d)}:p));
    setSelectedDeliverable((c)=>c?{...c,status:rebrief?'rebriefing':'adjustment_requested',adjustmentCount:next,rebriefingRequired:rebrief}:c); setAdjustmentReason('');setAdjustmentImpact(0);setShowAdjustment(false);
  }

  function openSubmission(target: 'project' | ProjectDeliverable) {
    setSubmissionError('');
    setSubmission(target);
  }

  function releaseDeliverable(item: ProjectDeliverable) {
    if (staff) void staffRequestReview();
    else if ((item.reviewRevision ?? 1) > 1) void persistStatus(item, 'client_review', 'Enviado para validação do cliente');
    else openSubmission(item);
  }

  async function confirmSubmission() {
    if (!submission || submissionPending) return;
    setSubmissionPending(true);
    setSubmissionError('');
    try {
      if (submission === 'project') {
        if (!selectedProject || !draftProject || draftIssues.length) return;
        if (isPersistedAdminProject) await publishSchedule.mutateAsync(selectedProject.id);
        else setProjects((current) => current.map((project) => project.id === selectedProject.id ? { ...project, planningStatus: 'client_review' } : project));
      } else if (!await persistStatus(submission, 'client_review', 'Enviado para validação do cliente', setSubmissionError)) {
        return;
      }
      setSubmission(null);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Não foi possível enviar para validação.');
    } finally {
      setSubmissionPending(false);
    }
  }

  async function addTask(event:FormEvent){
    event.preventDefault(); if(!selectedDeliverable||!taskForm.title.trim())return; const estimated=Math.round((Number(taskForm.estimatedHours.replace(',','.'))||0)*60); setSaving(true);
    try{
      if(taskForm.dueDate&&selectedDeliverable.dueAt&&taskForm.dueDate>String(selectedDeliverable.dueAt).slice(0,10)){ setStaffNotice(`O prazo da subtarefa não pode passar do prazo do entregável (${formatProjectDate(selectedDeliverable.dueAt)}).`); return; }
      if(staff){ if(!isSupabaseConfigured)return; const created=await addPartnerDeliverableTask({p_deliverable_id:selectedDeliverable.id,p_title:taskForm.title.trim(),p_description:taskForm.description.trim()||null,p_due_at:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,p_estimated_minutes:estimated,p_client_visible:taskForm.clientVisible,p_complexity:taskForm.complexity,p_is_document:taskForm.isDocument}); if(created.error){ setStaffNotice(created.error.message||'Não foi possível criar a subtarefa.'); return; } setTaskForm(emptyTaskForm()); setShowTaskForm(false); setStaffNotice('Subtarefa criada.'); await loadWorkspace(); return; }
      if(isSupabaseConfigured&&isUuid(selectedDeliverable.id)){ const {error}=await addDeliverableTask({company_id:selectedProject.companyId,deliverable_id:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description.trim()||null,status:'todo',due_at:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,client_visible:taskForm.clientVisible,estimated_minutes:estimated,sort_order:selectedTasks.length+1,complexity:taskForm.complexity,is_document:taskForm.isDocument}); if(error)throw error; const {data}=await readDeliverableTasks(selectedDeliverable.id); setTasks((current)=>[...current.filter((t)=>t.deliverableId!==selectedDeliverable.id),...(data || []).map(toTaskItem)]); }
      else setTasks((c)=>[...c,{id:`preview-task-${Date.now()}`,protocol:`CALI-TSK-PREVIEW-${Date.now().toString().slice(-4)}`,deliverableId:selectedDeliverable.id,title:taskForm.title.trim(),description:taskForm.description,status:'todo',dueAt:taskForm.dueDate?`${taskForm.dueDate}T18:00:00-03:00`:null,clientVisible:taskForm.clientVisible,estimatedMinutes:estimated,sortOrder:selectedTasks.length+1}]);
      setTaskForm(emptyTaskForm());setShowTaskForm(false);
    }catch(error){console.error(error);}finally{setSaving(false);}
  }


  async function staffOpenAttachment(path: string) {
    try {
      await openPrivateWorkspaceFile(path);
    } catch {
      setStaffNotice('Não foi possível abrir este anexo agora.');
    }
  }
  async function staffLoadChat(deliverableId:string, channel:ConversationChannel){
    if(!isSupabaseConfigured||!staff)return;
    const result=await readPartnerDeliverableConversation(deliverableId, channel === 'client');
    setStaffChat((result.data || []).map((row: PartnerCommentRow) =>({id:row.id,body:row.body,authorId:row.author_user_id,actor:row.source_actor||'admin',createdAt:row.created_at})));
  }
  /* Equipe CALI: criar, editar, excluir ou cancelar NÃO grava direto — vira um pedido para a administradora autorizar. */
  async function staffSubmitChange(action:string,title:string,payload:JsonObject,companyId:string){
    if(!isSupabaseConfigured||!staff)return false;
    const { error } = await submitPartnerProjectChange(companyId, action, title, payload);
    if(error){ setStaffNotice('Não foi possível enviar o pedido. Tente de novo.'); return false; }
    setStaffNotice('Pedido enviado. Vale depois da aprovação.'); return true;
  }
  async function staffRequestReview(){
    if(!isSupabaseConfigured||!staff||!selectedDeliverable)return;
    const {error}=await requestPartnerDeliverableReview(selectedDeliverable.id);
    if(error){ setStaffNotice(error.message||'Não foi possível enviar para aprovação.'); return; }
    setStaffReviewPending((c)=>({...c,[selectedDeliverable.id]:true})); setStaffNotice('Entregável enviado para a Patricia aprovar.'); await loadWorkspace();
  }
  async function sendStaffMessage(){
    if(!isSupabaseConfigured||!selectedDeliverable||!selectedProject||(!messageText.trim()&&!messageFile))return; const toClient=conversationChannel==='client'; let attachmentNote='';
      if(messageFile){ const allowed=['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        if(!allowed.includes(messageFile.type)){ setStaffNotice('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; } if(messageFile.size>10*1024*1024){ setStaffNotice('O anexo pode ter até 10 MB.'); return; }
        const safeName=messageFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,90)||'arquivo'; const path=`deliverable-chat/${selectedProject.companyId}/${selectedDeliverable.id}/${staffUserId}/${Date.now()}-${safeName}`;
        const upload=await uploadDeliverableAttachment(path, messageFile, messageFile.type);
        if(upload.error){ setStaffNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.'); return; } attachmentNote=`\n[[arquivo|${encodeURIComponent(messageFile.name)}|${encodeURIComponent(path)}|${encodeURIComponent(messageFile.type)}|${messageFile.size}]]`; }
      const {error}=await postPartnerDeliverableComment(selectedDeliverable.id, `${messageText.trim()}${attachmentNote}`.trim(), toClient); if(error){ setStaffNotice(error.message||'Não foi possível enviar a mensagem.'); return; } setMessageText(''); setMessageFile(null); await staffLoadChat(selectedDeliverable.id,conversationChannel);
  }

  /* O mês do cronograma (M1, M2…) sai do prazo: a proprietária pediu para tirar os campos "Mês inicial/final" (2026-10-13). */
  useEffect(()=>{ const start=selectedProject?.startDate; if(!deliverableForm.dueDate||!start)return; const a=new Date(`${String(start).slice(0,10)}T12:00:00`),b=new Date(`${deliverableForm.dueDate}T12:00:00`); if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return; const month=Math.max(1,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())+1); setDeliverableForm((c)=>c.monthStart===month&&c.monthEnd===month?c:{...c,monthStart:month,monthEnd:month}); },[deliverableForm.dueDate,selectedProject?.startDate]);
  function staffTaskTimer(task:{id:string;title:string;status:string}){
    if(!selectedDeliverable||['done','approved','cancelled'].includes(String(task.status))||selectedDeliverable.status==='approved'||selectedDeliverable.status==='cancelled')return <span className="tw:inline-flex tw:h-[2.462rem] tw:items-center tw:gap-[.462rem] tw:rounded-[.615rem] tw:bg-[#eef5f0] tw:px-[.846rem] tw:text-[.846rem] tw:font-bold tw:whitespace-nowrap tw:text-[#356448]" title="Trabalho encerrado: não recebe novas horas"><Square size={12}/> Encerrada</span>;
    if(activeTimer?.taskId===task.id)return <ProjectTimerButton scope="task" running onClick={() => void stopStaffTimer()}><Pause size={13} /> Pausar · {timerLabel}</ProjectTimerButton>;
    return <ProjectTimerButton scope="task" disabled={Boolean(activeTimer)} title={activeTimer?'Pause o cronômetro ligado antes de iniciar outro':'Iniciar cronômetro nesta subtarefa'} onClick={()=>void staffStartTaskTimer(task)}><Play size={13} /> Iniciar</ProjectTimerButton>;
  }
  async function setTaskStatus(task:{id:string;status:string},next:string){ if(next===task.status)return;
    if(isSupabaseConfigured&&isUuid(task.id)){ const result=await changeDeliverableTaskStatus(task.id, next, Boolean(staff)); if(result.error){ setStaffNotice(result.error.message||'Não foi possível mudar a situação da subtarefa.'); return; } }
    setTasks((current)=>current.map((t)=>t.id===task.id?{...t,status:next}:t)); }
  /* Equipe CALI: play dentro da etapa (subtarefa), como na tela da administradora. */
  async function staffStartTaskTimer(task:{id:string;title:string}){
    if(!isSupabaseConfigured||!staff||!selectedDeliverable||!selectedProject||activeTimer)return;
    const {data,error}=await startPartnerTimer({p_company_id:selectedProject.companyId,p_project_id:selectedProject.id,p_deliverable_id:selectedDeliverable.id,p_task_id:task.id,p_category:'Execução',p_description:task.title});
    if(error){ setStaffNotice(error.message||'Não foi possível iniciar o cronômetro.'); return; }
    setActiveTimer({id:data as string,deliverableId:selectedDeliverable.id,taskId:task.id,startedAt:new Date().toISOString(),preview:false}); window.dispatchEvent(new Event('cali-staff-timer-changed'));
    if(selectedDeliverable.status==='not_started')void persistStatus(selectedDeliverable,'in_progress','Iniciado pelo cronômetro');
  }
  async function startStaffTimer(){
    if(!staff||!selectedDeliverable||activeTimer)return;
    if(isSupabaseConfigured&&isUuid(selectedDeliverable.id)){ const {data,error}=await startPartnerDeliverableTimer(selectedDeliverable.id); if(error){console.error(error);setStaffNotice(error.message||'Não foi possível iniciar o cronômetro.');return;} setActiveTimer({id:data,deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:false}); }
    else setActiveTimer({deliverableId:selectedDeliverable.id,startedAt:new Date().toISOString(),preview:true});
    if(selectedDeliverable.status==='not_started')void persistStatus(selectedDeliverable,'in_progress','Timer iniciado');
  }
  async function stopStaffTimer() {
    if (!activeTimer) return;
    if (!activeTimer.preview && isSupabaseConfigured && activeTimer.id) {
      const description = selectedDeliverable?.title || 'Atividade de projeto';
      const { data, error } = await stopPartnerTimer(activeTimer.id, description);
      if (error) console.error(error);
      else {
        setStaffNotice(data?.discarded ? 'Sessão com menos de 30 segundos: não foi registrada.' : `Sessão de ${data?.minutes} min enviada para aprovação da Patrícia.`);
        await loadWorkspace();
      }
    }
    setActiveTimer(null);
  }
  const timerLabel=`${String(Math.floor(timerSeconds/3600)).padStart(2,'0')}:${String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`;

  async function deleteDeliverable() {
    const item = confirmDelete;
    if (!item || item.status !== 'not_started') return;
    if (staff) {
      const ok = await staffSubmitChange('deliverable_delete', `Excluir entregável: ${item.title}`, { id: item.id }, selectedProject.companyId);
      if (ok) setConfirmDelete(null);
      return;
    }
    if (isSupabaseConfigured && isUuid(item.id)) {
      const { error } = await deleteDeliverableDraft(item.id);
      if (error) {
        setStaffNotice('Não foi possível excluir o entregável.');
        return;
      }
      await loadWorkspace();
    } else {
      setProjects((current) => current.map((project) => ({
        ...project, deliverables: project.deliverables.filter((deliverable) => deliverable.id !== item.id),
      })));
    }
    setConfirmDelete(null);
    setSelectedDeliverable((selected) => selected?.id === item.id ? null : selected);
  }

  if(loading) return <ProjectsFrame staff={Boolean(staff)}><WorkspaceAdminPage><WorkspaceAdminContent><EmptyState as="p" variant="admin" className="data-loading" aria-live="polite" aria-busy="true">Carregando execução e cronograma…</EmptyState></WorkspaceAdminContent></WorkspaceAdminPage></ProjectsFrame>;

  const projectDialog = projectModal && <CreateProjectDialog
    staff={Boolean(staff)}
    projectForm={projectForm}
    frontDrafts={frontDrafts}
    creationAccounts={creationAccounts}
    duplicateInitialFronts={duplicateInitialFronts}
    saving={saving}
    onClose={() => setProjectModal(false)}
    onSubmit={createProject}
    onChange={(patch) => setProjectForm((current) => ({ ...current, ...patch }))}
    addFrontDraft={addFrontDraft}
    patchFrontDraft={patchFrontDraft}
    removeFrontDraft={removeFrontDraft}
  />;

  if (!selectedProject) {
    return (
      <ProjectsFrame staff={Boolean(staff)}>
        <section className="page projects-flow-page">
          <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
          <div className="page-heading"><div><h1>Projetos</h1></div></div>
          <section className="project-real-data-gate tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#eae3dd] tw:bg-white">
            <div className="project-real-data-gate-icon"><FolderKanban size={28}/></div>
            <div>
              <h2>Nenhum projeto cadastrado</h2>
              <p>{creationAccounts.length > 0
                ? 'Crie o primeiro projeto para organizar frentes, entregáveis e prazos.'
                : 'Cadastre uma empresa em Clientes para criar o primeiro projeto.'}</p>
              {creationAccounts.length > 0 && <Button variant="adminPrimary" className="tw:mt-3" type="button" onClick={openNewProject}><Plus size={15}/> Novo projeto</Button>}
            </div>
          </section>
          {projectModal && <WorkspaceAdminPage className="v2-client-module">{projectDialog}</WorkspaceAdminPage>}
        </section>
      </ProjectsFrame>
    );
  }

  const maxMonth=Math.max(8,...selectedFronts.map((f)=>f.monthEnd||f.monthStart||1),...selectedProject.deliverables.map((d)=>d.roadmapMonthEnd||d.roadmapMonthStart||1));
  const months=Array.from({length:maxMonth},(_,i)=>i+1);
  const monthStyle: CSSProperties & { '--months': number } = { '--months': months.length };
  const visibleDeliverables=selectedProject.deliverables.filter((d)=>d.status!=='cancelled');
  const openDetail=(item:ProjectDeliverable)=>{setSelectedDeliverable(item);setDetailTab('overview');};
  const planningTone:Record<string,string>={neutral:'purple',gold:'amber',success:'green',danger:'red'};
  const deliveryTone=(status:DeliverableStatus)=>status==='approved'?'green':status==='client_review'||status==='adjustment_requested'?'amber':status==='in_progress'||status==='internal_review'?'blue':status==='rebriefing'||status==='cancelled'?'red':'purple';

  return <ProjectsFrame staff={Boolean(staff)}><WorkspaceAdminPage className={`v2-client-module tw:[&_[hidden]]:hidden!`}><WorkspaceAdminContent className="projects-flow-page">
    {staffNotice&&<WorkspaceToast><CheckCircle2 size={18}/><span>{staffNotice}</span></WorkspaceToast>}
    <WorkspacePageHeader eyebrow={staff ? 'EQUIPE CALI / PROJETOS' : 'BACKOFFICE / CALI RH'} title="Projetos e entregáveis" description={staff ? 'Cronograma e entregas das empresas que você atende.' : 'Um projeto organiza frentes, prazos, entregáveis e validações.'}>
      <Button variant="adminOutline" onClick={()=>{setFrontForm(emptyFrontForm());setFrontModal(true);}}><Plus size={15}/> Nova frente</Button><Button variant="adminOutline" onClick={()=>openDeliverable()}><Plus size={15}/> Novo entregável</Button><Button variant="adminPrimary" onClick={openNewProject}><Plus size={15}/> Novo projeto</Button>
    </WorkspacePageHeader>

    <div className="tw:mb-[1.23rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[1.08rem]">
      <label className="tw:m-0 tw:inline-flex tw:items-center tw:gap-[.69rem] tw:text-[.85rem] tw:text-[#8c7e74]">Empresa<select className="tw:max-w-[21.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.77rem] tw:py-[.69rem] tw:font-bold tw:text-cali-brand" aria-label="Empresa" value={selectedProject.companyId} onChange={(e)=>{const first=filteredProjects.find((p)=>p.companyId===e.target.value)||projects.find((p)=>p.companyId===e.target.value);if(first)setSelectedProjectId(first.id);}}>{Array.from(new Map(projects.map((p)=>[p.companyId,p.company])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label className="tw:m-0 tw:inline-flex tw:items-center tw:gap-[.69rem] tw:text-[.85rem] tw:text-[#8c7e74]">Projeto<select className="tw:max-w-[21.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.77rem] tw:py-[.69rem] tw:font-bold tw:text-cali-brand" aria-label="Projeto" value={selectedProject.id} onChange={(e)=>setSelectedProjectId(e.target.value)}>{projects.filter((p)=>p.companyId===selectedProject.companyId).map((p)=><option key={p.id} value={p.id}>{p.name}{p.startDate?` · ${new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(`${String(p.startDate).slice(0,10)}T12:00:00`)).replace('.','').replace(' de ','/')}`:''}</option>)}</select></label>
      <div className="tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-[.615rem]"><label><select className="tw:rounded-[.538rem] tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:px-[.769rem] tw:py-[.692rem] tw:text-[.846rem] tw:text-cali-text" aria-label="Situação do cronograma" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as ProjectPlanningStatus | 'all')}><option value="all">Todos os status</option>{Object.entries(projectPlanningLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="tw:flex tw:min-w-0 tw:max-w-full tw:flex-[0_1_17.69rem] tw:items-center tw:gap-[.462rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:px-[.769rem] tw:text-cali-muted"><Search size={14}/><input className="tw:w-full tw:border-0! tw:bg-transparent! tw:px-[.38rem] tw:py-[.77rem] tw:text-[.85rem] tw:text-cali-text tw:shadow-none! tw:outline-none! tw:placeholder:text-cali-muted tw:placeholder:opacity-[.82] tw:workspace-night:[color-scheme:dark]" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar projeto ou protocolo"/></label></div>
    </div>
    {(query||statusFilter!=='all')&&<div className="tw:mb-[1.23rem] tw:flex tw:flex-wrap tw:gap-[.62rem] tw:text-[.85rem] tw:text-[#857870]">{filteredProjects.length?filteredProjects.map((project)=><button key={project.id} className={`tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:bg-white tw:px-[.77rem] tw:py-[.62rem] tw:text-[.85rem] tw:text-[#554744] ${project.id === selectedProject.id ? 'tw:border-cali-brand' : 'tw:border-[#eadfd5]'}`} onClick={()=>setSelectedProjectId(project.id)}><strong>{project.company}</strong> · {project.name}<StatusBadge variant="admin" tone={planningTone[projectTone[project.planningStatus]]}>{projectPlanningLabels[project.planningStatus]}</StatusBadge></button>):<span>Nenhum projeto corresponde à busca.</span>}</div>}


    <ProjectLifecycleControls key={selectedProject.id} projectId={isPersistedAdminProject ? selectedProject.id : null} onChanged={loadWorkspace}
      renderHero={(manage) => <section className="tw:relative tw:flex tw:flex-wrap tw:gap-[1.54rem] tw:mb-[1.23rem] tw:items-center! tw:rounded-[.92rem] tw:border-0! tw:[background:linear-gradient(120deg,#582031,#6d2c40_62%,#8a5a4a)]! tw:px-[2.15rem]! tw:py-[1.85rem]! tw:text-white"><div className="tw:flex tw:min-w-[min(16.15rem,100%)] tw:flex-1 tw:flex-col tw:gap-[.15rem]"><span className="tw:order-first tw:text-[.77rem] tw:tracking-[.046rem] tw:text-[#e9cbb9]">{selectedProject.company} · {selectedProject.protocol}</span><h2 className="tw:mt-[.31rem] tw:mb-[.15rem] tw:text-[1.85rem]! tw:text-white!">{selectedProject.name}</h2><em className="tw:text-[.92rem] tw:text-[#f1e2e5] tw:not-italic">{selectedProject.service}</em><div className="tw:mt-[.62rem] tw:flex tw:flex-wrap tw:gap-[.62rem] tw:[&>span]:inline-flex tw:[&>span]:items-center tw:[&>span]:gap-[.46rem] tw:[&>span]:rounded-[.46rem] tw:[&>span]:border tw:[&>span]:border-solid tw:[&>span]:border-white/25 tw:[&>span]:bg-white/10 tw:[&>span]:px-[.69rem] tw:[&>span]:py-[.38rem] tw:[&>span]:text-[.77rem] tw:[&>span]:text-white"><span><CalendarDays size={13}/>Início {formatProjectDate(selectedProject.startDate)}</span>{!showForecast && <span><CalendarDays size={13}/>Meta {formatProjectDate(selectedProject.endDate)}</span>}<span><Clock3 size={13}/>{selectedProject.clientResponseBusinessDays*24}h para o cliente responder</span><span><RefreshCw size={13}/>até {selectedProject.adjustmentLimit} ajustes</span></div>{showForecast && <ProjectForecast project={selectedProject}/>}</div><div className="v2-admin-project-side tw:flex tw:flex-wrap tw:items-center tw:gap-[1.38rem]"><StatusBadge as="b" variant="admin" tone={planningTone[projectTone[selectedProject.planningStatus]]} className="tw:absolute tw:top-[1.69rem] tw:right-[2rem]">{projectPlanningLabels[selectedProject.planningStatus]}</StatusBadge><div className="tw:flex tw:min-w-[8.46rem] tw:flex-col tw:gap-[.23rem]"><strong className="tw:text-[2rem] tw:text-white">{projectProgress(selectedProject.deliverables)}%</strong><span className="tw:text-[.77rem] tw:text-[#f1e2e5]">andamento</span><div className="tw:h-[.46rem] tw:overflow-hidden tw:rounded-[.31rem] tw:bg-white/20"><i className="tw:block tw:h-full tw:bg-[#e3bf7b]" style={{width:`${projectProgress(selectedProject.deliverables)}%`}}/></div></div><div className="tw:flex tw:flex-wrap tw:gap-[.62rem] tw:[&>button]:inline-flex tw:[&>button]:cursor-pointer tw:[&>button]:items-center tw:[&>button]:gap-[.62rem] tw:[&>button]:whitespace-nowrap tw:[&>button]:rounded-[.54rem] tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:border-white/40 tw:[&>button]:bg-white/8 tw:[&>button]:px-[1rem] tw:[&>button]:py-[.77rem] tw:[&>button]:text-[.85rem] tw:[&>button]:font-semibold tw:[&>button]:text-white">{selectedProject.planningStatus==='draft'&&!staff&&<button type="button" className="light-button" onClick={() => openSubmission('project')} disabled={Boolean(draftIssues.length) || publishSchedule.isPending} title={draftIssues.join(' ') || 'Enviar cronograma para aprovação do cliente'}><Send size={14}/>{publishSchedule.isPending ? 'Enviando…' : 'Enviar ao cliente'}</button>}<button className="light-button" onClick={openFront}><Plus size={14}/>Adicionar frente</button>{manage}</div></div>{forecastDelay > 0 && <ProjectForecastAlert days={forecastDelay}/>}</section>} />

    {draftProject && <ProjectDraftReadiness issues={draftIssues}/>}
    {isPersistedAdminProject && (selectedProject.planningStatus === 'client_review' || selectedProject.planningStatus === 'adjustment_requested') &&
      <AdminScheduleReview key={selectedProject.id} project={selectedProject} onChanged={loadWorkspace} onNotice={setStaffNotice}/>}

    {selectedProject.deliverables.some((d)=>d.clientDelayBusinessDays>0)&&<div className="tw:mx-0 tw:mt-0 tw:mb-[1.23rem] tw:flex tw:items-start tw:gap-[0.615rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.231rem] tw:py-[0.923rem] tw:text-[0.923rem]/[inherit] tw:text-[#7a5a2c]"><AlertTriangle size={16}/><div><strong>Atraso do cliente impactando o cronograma</strong><p className="tw:mt-[.23rem] tw:mb-0 tw:text-[.85rem]">A ausência de resposta não aprova automaticamente. As próximas deadlines podem ser deslocadas em dias úteis e o impacto fica registrado.</p></div></div>}

    <ProjectSectionTabs label="Gestão de projetos" tabs={projectTabs} value={projectView} onChange={setProjectView} className="tw:mt-[.462rem] tw:mb-[1.23rem]!" />

    {projectView === 'roadmap' && (
      <DeliverySchedule
        items={visibleDeliverables}
        labels={deliverableLabels}
        bounds={[selectedProject.startDate, selectedProject.endDate]}
        formatDue={(timestamp) => formatProjectDate(new Date(timestamp).toISOString())}
        empty={<EmptyState as="p" variant="admin">Este projeto ainda não tem entregáveis.</EmptyState>}
        onOpen={openDetail}
      />
    )}

    {projectView==='deliverables'&&<WorkspaceAdminPanel aria-label="Frentes e entregáveis"><WorkspaceAdminPanelHeader><div className="tw:flex tw:flex-col tw:gap-[.23rem]"><small className="tw:text-[.77rem] tw:font-extrabold tw:tracking-[.12em] tw:text-[#a77e52]">FRENTES E ENTREGÁVEIS</small><h2>{visibleDeliverables.length} {visibleDeliverables.length===1?'entregável':'entregáveis'} em {selectedFronts.length} {selectedFronts.length===1?'frente':'frentes'}</h2><p className="tw:mt-[.31rem] tw:mb-0 tw:text-[.85rem] tw:text-[#978980]">Clique na frente para abrir ou recolher os entregáveis.</p></div><div className="ie-switch deliverable-toolbar-v2 tw:flex tw:flex-row tw:flex-nowrap tw:[&>button]:inline-flex tw:[&>button]:items-center tw:[&>button]:gap-[.46rem] tw:[&>button]:border-0 tw:[&>button]:bg-white tw:[&>button]:px-[.77rem] tw:[&>button]:py-[.69rem] tw:[&>button]:text-[.77rem] tw:[&>button]:text-[#897a71] tw:[&>button.on]:bg-cali-brand tw:[&>button.on]:text-white"><button className={deliverableView==='list'?'on active':''} onClick={()=>setDeliverableView('list')}><List size={13}/> Lista</button><button className={deliverableView==='kanban'?'on active':''} onClick={()=>setDeliverableView('kanban')}><LayoutGrid size={13}/> Kanban</button></div>{!staff && draftProject && <Button variant="secondary" className="tw:ml-auto tw:self-start tw:whitespace-nowrap" type="button" onClick={openFront}>+ Nova frente</Button>}</WorkspaceAdminPanelHeader>{deliverableView==='list'?<><div className="front-list-v2 tw:flex tw:flex-col tw:gap-[1.08rem]">{selectedFronts.map((front,index)=>{const ds=selectedProject.deliverables.filter((d)=>d.workstream===front.name||d.workstreamId===front.id).filter((d)=>d.status!=='cancelled');return <ProjectFrontDisclosure
      key={front.id}
      name={front.name}
      emblem={index % 2 ? '/brand/cali-lime-mark.svg' : '/brand/cali-oak-mark.svg'}
      storageKey={staff ? null : `cali-front-expanded-v46:/admin/projetos:${selectedProject.protocol}:${front.protocol}:${front.name}`}
      heading={<>
      <div className="front-copy-v2 tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem]"><span className="tw:text-[.69rem] tw:tracking-[.046rem] tw:text-[#a39790]">{front.protocol}</span><strong className="tw:text-[1rem]">{front.name}</strong><p className="tw:m-0 tw:text-[.77rem] tw:text-[#978980]">{front.objective||'Frente do cronograma CALI.'}</p></div><div className="front-monthbar-v2 tw:relative tw:grid tw:grid-cols-[repeat(var(--months,8),minmax(0,1fr))] tw:items-center tw:gap-[.23rem] tw:[@media(max-width:820px)]:col-[2/-1] tw:[@media(max-width:820px)]:w-full" style={monthStyle}>{months.map((m)=><i key={m} className="tw:first-of-type:col-start-1 tw:row-start-1 tw:h-[1.69rem] tw:rounded-[.31rem] tw:bg-[#f1e9e2]"/>)}<b className={`tw:z-1 tw:row-start-1 tw:grid tw:h-[1.69rem] tw:place-items-center tw:rounded-[.31rem] tw:bg-cali-brand tw:text-[.69rem] tw:text-white ${!staff && !ds.length ? "tw:border tw:border-dashed tw:border-[color-mix(in_srgb,var(--cali-color-gold)_50%,var(--theme-line))] tw:bg-transparent! tw:text-[.6923rem] tw:whitespace-nowrap tw:text-cali-muted tw:opacity-[.58] tw:shadow-none!" : ""}`} style={{gridColumn:`${front.monthStart||1} / ${Math.min(months.length+1,(front.monthEnd||front.monthStart||1)+1)}`}}>{!staff && !ds.length ? 'janela após entregáveis' : `M${front.monthStart || 1}${front.monthEnd && front.monthEnd !== front.monthStart ? `–M${front.monthEnd}` : ''}`}</b></div>{!staff && draftProject && isUuid(front.id) && <div className="tw:col-start-4 tw:inline-flex tw:items-center tw:gap-[.4615rem] tw:justify-self-end tw:[@media(max-width:820px)]:col-start-3">
      <button type="button" className={draftActionClass} aria-label="Editar frente" title="Editar frente" onClick={() => setFrontAction({ type: 'edit', front })}><Edit3 size={14} strokeWidth={1.8}/></button>
      <button type="button" className={`${draftActionClass} tw:hover:border-[#c17b8c] tw:hover:bg-[#fff7f9] tw:hover:text-[#a4314c]`} aria-label="Excluir frente" title="Excluir frente" onClick={() => setFrontAction({ type: 'delete', front })}><Trash2 size={14} strokeWidth={1.8}/></button>
    </div>}<Button variant="adminOutline" className="tw:col-start-5 tw:inline-flex tw:min-h-[2.92rem] tw:min-w-[8.62rem] tw:items-center tw:justify-center tw:gap-[.46rem] tw:justify-self-end tw:whitespace-nowrap tw:[@media(max-width:820px)]:col-start-4 tw:[@media(max-width:820px)]:min-w-[8rem]" onClick={()=>openDeliverable(front)}><Plus size={14}/>Entregável</Button></>}>{ds.length?<><div className="tw:grid tw:min-w-[72rem] tw:px-[1.385rem] tw:grid-cols-[minmax(0,1fr)_11.54rem_10rem_16.92rem_13.08rem_3.08rem]! tw:gap-x-[1.23rem]! tw:items-center tw:gap-[.92rem] tw:pt-[.92rem] tw:pb-[.62rem] tw:text-[.69rem] tw:font-extrabold tw:tracking-[.05em] tw:text-[#988980] tw:uppercase"><span>Entregável</span><span>Subtarefas</span><span>Complexidade</span><span>Situação</span><span>Prazo</span><span/></div>{ds.map((item)=><div className={`tw:grid tw:min-h-[5.308rem] tw:min-w-[72rem] tw:px-[1.385rem] tw:text-left tw:text-[#423733] tw:hover:bg-[#fdf9f6] tw:grid-cols-[minmax(0,1fr)_11.54rem_10rem_16.92rem_13.08rem_3.08rem]! tw:gap-x-[1.23rem]! tw:has-[>section]:gap-y-0! tw:w-auto tw:items-center tw:gap-[.92rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#f0e8e1] tw:bg-transparent tw:py-[.85rem]`} key={item.id}><button className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-[.77rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[#392f2a]" onClick={()=>openDetail(item)}><FileText size={17} className="tw:shrink-0 tw:text-[#77394d]"/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem]"><strong className="tw:text-[.92rem]">{item.title}</strong><small className="tw:text-[.69rem] tw:text-[#a39790]">{item.protocol}</small></span></button>{(()=>{ const count=tasks.filter((t)=>t.deliverableId===item.id).length; return count>0?<button type="button" className="tw:inline-flex tw:h-[2.15rem] tw:cursor-pointer tw:items-center tw:gap-[.54rem] tw:justify-self-start tw:rounded-[.62rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-white tw:px-[.85rem] tw:text-[.885rem] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand" aria-expanded={!closedSubs[item.id]} title={closedSubs[item.id]?'Mostrar subtarefas':'Recolher subtarefas'} onClick={()=>setClosedSubs((c)=>({...c,[item.id]:!c[item.id]}))}>{closedSubs[item.id]?<ChevronRight size={14}/>:<ChevronDown size={14}/>}{count} {count===1?'subtarefa':'subtarefas'}</button>:<span className="tw:justify-self-start tw:pl-[.92rem] tw:font-normal tw:text-[#b5a79d]">—</span>; })()}<ProjectComplexityBadge code={item.complexity} explain className="tw:w-fit" /><StatusSelect item={item} onChange={(next)=>statusChoice(item,next)}/><time className="tw:whitespace-nowrap tw:text-[.85rem] tw:font-extrabold tw:text-cali-gold">{formatProjectDate(item.dueAt)}</time><button className="row-arrow-v3 tw:grid tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:p-[.31rem] tw:text-[#8a4b60]" onClick={()=>openDetail(item)} aria-label={`Abrir ${item.title}`}><ArrowRight size={15}/></button>{!staff && draftProject && <span className="tw:inline-flex tw:items-center tw:gap-[.4615rem] tw:pr-[.6154rem]">
      <button type="button" className={draftActionClass} aria-label="Editar entregável" title="Editar entregável" disabled={item.status === 'approved'} onClick={() => openDeliverable(undefined, item)}><Edit3 size={14} strokeWidth={1.8}/></button>
      <button type="button" className={`${draftActionClass} tw:text-[#b7495d]`} aria-label="Excluir entregável" title="Excluir entregável" disabled={item.status !== 'not_started'} onClick={() => setConfirmDelete(item)}><Trash2 size={14} strokeWidth={1.8}/></button>
    </span>}{(() => {
      const subtasks = tasks.filter((task) => task.deliverableId === item.id);
      if (!subtasks.length || closedSubs[item.id]) return null;

      return <section aria-label={`Subtarefas de ${item.title}`} className="tw:col-span-full tw:mt-[.77rem] tw:mb-[.15rem] tw:grid tw:w-full tw:grid-cols-subgrid tw:gap-y-[.46rem]">
        {subtasks.map((task) => {
          const openSubtask = () => {
            openDetail(item);
            setDetailTab('tasks');
            setOpenTaskId(task.id);
          };

          return <div key={task.id} className="tw:relative tw:col-span-full tw:grid tw:w-full tw:grid-cols-subgrid tw:items-center tw:border-0 tw:border-t tw:border-dashed tw:border-[#eadfd5] tw:bg-transparent tw:pt-[.77rem] tw:pb-[.31rem] tw:text-left tw:text-cali-ink tw:hover:bg-[#fbf7f4]">
            <button type="button" className="tw:flex tw:min-w-0 tw:cursor-pointer tw:flex-col tw:items-start tw:border-0 tw:bg-transparent tw:p-0 tw:pl-[3.54rem] tw:text-left tw:after:absolute tw:after:inset-0 tw:after:content-['']" onClick={openSubtask}>
              <span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:-top-[.46rem] tw:left-[1.85rem] tw:h-[calc(50%+.46rem)] tw:w-[1.08rem] tw:rounded-bl-[.62rem] tw:border-l-[.115rem] tw:border-b-[.115rem] tw:border-solid tw:border-[#d9c7ba]" />
              <strong className="tw:max-w-full tw:truncate tw:text-[.96rem]">{task.title}</strong>
              <small className="tw:text-[.77rem] tw:text-[#9a8d85]">{task.protocol}</small>
            </button>
            <span aria-hidden="true" />
            {task.complexity
              ? <ProjectComplexityBadge code={task.complexity} explain className="tw:z-10 tw:justify-self-start" />
              : <b className="tw:justify-self-start tw:font-normal tw:text-[#b5a79d]">—</b>}
            <div className="tw:relative tw:z-10 tw:w-fit">
              <SubtaskStatusSelect title={task.title} status={task.status} onChange={(next) => void setTaskStatus(task, next)} />
            </div>
            <time className="tw:text-[.92rem] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand!">{task.dueAt ? formatProjectDate(task.dueAt) : 'sem prazo'}</time>
            <ArrowRight size={14} className="tw:justify-self-center tw:text-[#8a4b60]" />
          </div>;
        })}
      </section>;
    })()}</div>)}</>:<div className="front-empty-v2 v2-admin-empty">Nenhum entregável nesta frente ainda.</div>}</ProjectFrontDisclosure>})}{!selectedFronts.length&&<EmptyState as="p" variant="admin">Este projeto ainda não tem frentes. Use &quot;Nova frente&quot; para começar.</EmptyState>}</div></>:<ProjectKanban key={selectedProject.id} items={selectedProject.deliverables} staff={Boolean(staff)} onOpen={openDetail} onMove={statusChoice}/>}</WorkspaceAdminPanel>}

    {projectView==='history'&&<WorkspaceAdminPanel className="project-history-v2"><WorkspaceAdminPanelHeader><div className="tw:flex tw:flex-col tw:gap-[.23rem]"><small className="tw:text-[.77rem] tw:font-extrabold tw:tracking-[.12em] tw:text-[#a77e52]">REGISTRO DO PROJETO</small><h2>Histórico do projeto</h2><p className="tw:mt-[.31rem] tw:mb-0 tw:text-[.85rem] tw:text-[#978980]">Desempenho das entregas, decisões e impactos de prazo registrados.</p></div></WorkspaceAdminPanelHeader>{!staff && isUuid(selectedProject.id) && <ProjectDeliveryHistory projectId={selectedProject.id} />}</WorkspaceAdminPanel>}

  {projectDialog}

  {frontAction?.type === 'edit' && <EditProjectFrontDialog key={frontAction.front.id}
    front={frontAction.front}
    otherNames={selectedFronts.filter(({ id }) => id !== frontAction.front.id).map(({ name }) => name)}
    onClose={() => setFrontAction(null)}
    onSaved={finishFrontAction}
  />}
  {frontAction?.type === 'delete' && <DeleteProjectFrontDialog key={frontAction.front.id}
    front={frontAction.front}
    totalDeliverables={visibleDeliverables.filter((item) => item.workstreamId === frontAction.front.id
      || (!item.workstreamId && normalizeFrontName(item.workstream) === normalizeFrontName(frontAction.front.name))).length}
    targets={selectedFronts.filter(({ id }) => id !== frontAction.front.id)}
    onClose={() => setFrontAction(null)}
    onSaved={finishFrontAction}
  />}

  {frontModal && <CreateProjectFrontDialog
    project={selectedProject}
    front={frontForm}
    taken={selectedFronts.map(({ name }) => name)}
    duplicate={duplicateNewFront}
    staff={Boolean(staff)}
    saving={saving}
    onClose={() => setFrontModal(false)}
    onSubmit={createFront}
    onChange={(patch) => setFrontForm((current) => ({ ...current, ...patch }))}
  />}

  {(()=>{ const openTask=openTaskId?tasks.find((t)=>t.id===openTaskId):null; return openTask&&selectedDeliverable&&selectedProject&&isUuid(openTask.id)?<SubtaskModal task={{id:openTask.id,title:openTask.title,description:openTask.description,status:String(openTask.status),dueAt:openTask.dueAt,protocol:openTask.protocol,clientVisible:openTask.clientVisible,complexity:openTask.complexity,isDocument:openTask.isDocument}} deliverableId={selectedDeliverable.id} deliverableTitle={selectedDeliverable.title} companyId={selectedProject.companyId} projectId={selectedProject.id} staff={Boolean(staff)} timer={staff ? staffTaskTimer(openTask) : null} adminTimer={adminTimer} formatDate={(value)=>formatProjectDate(value||undefined)} onStatus={(next)=>void setTaskStatus(openTask,next)} onClose={()=>setOpenTaskId(null)} onNotice={setStaffNotice}/>:null; })()}
  {deliverableModal && <DeliverableEditorDialog
    project={selectedProject}
    fronts={selectedFronts}
    deliverable={deliverableForm}
    editing={Boolean(editingDeliverable)}
    reviewed={(editingDeliverable?.reviewRevision ?? 1) > 1}
    saving={saving}
    onClose={() => setDeliverableModal(false)}
    onSubmit={saveDeliverable}
    onChange={(patch) => setDeliverableForm((current) => ({ ...current, ...patch }))}
  />}

  {selectedDeliverable&&(()=>{const doneTasks=selectedTasks.filter((task)=>task.status==='done');const currentTask=selectedTasks.find((task)=>task.status!=='done');return <DeliveryDetailDialog title={selectedDeliverable.title} wide hidden={Boolean(openTaskId)}>
    <DeliveryDetailHeader title={selectedDeliverable.title} code={selectedDeliverable.protocol} complexity={selectedDeliverable.complexity}
      description={`${selectedDeliverable.workstream} · ${roadmapLabel(selectedDeliverable)}`}>
      {!staff && !openTaskId && <ProjectWorkTimer state={adminTimer} deliverableId={selectedDeliverable.id} />}{staff&&selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&(activeTimer?.deliverableId===selectedDeliverable.id&&!activeTimer?.taskId?<ProjectTimerButton scope="deliverable" running onClick={() => void stopStaffTimer()}><Pause size={14} /> Pausar · {timerLabel}</ProjectTimerButton>:<ProjectTimerButton scope="deliverable" disabled={Boolean(activeTimer)} title={activeTimer?'Pause o cronômetro ligado antes de iniciar outro':'Iniciar cronômetro neste entregável'} onClick={()=>void startStaffTimer()}><Play size={14} /> Iniciar timer</ProjectTimerButton>)}<StatusSelect item={selectedDeliverable} headerTone={deliveryTone(selectedDeliverable.status)} onChange={(next) => statusChoice(selectedDeliverable, next)} /><Button variant="inlineClose" className="tw:order-3 tw:grid tw:cursor-pointer tw:place-items-center tw:rounded-[.62rem] tw:border tw:border-solid tw:border-[#ecded5] tw:bg-white tw:p-[.62rem]" aria-label="Fechar" onClick={()=>{setSelectedDeliverable(null);setShowAdjustment(false);clearTaskHighlight();}}><X size={18}/></Button>
    </DeliveryDetailHeader>
    <DeliveryDetailTabs tabs={deliverableTabs} selected={detailTab} onChange={setDetailTab}
      label={(tab) => tab === 'overview' ? 'Visão geral' : tab === 'tasks' ? `Subtarefas (${selectedTasks.length})` : tab === 'conversation'
        ? (staff ? 'Conversas (0)' : <DeliverableConversationTabLabel companyId={selectedProject.companyId} deliverableId={selectedDeliverable.id} enabled={isSupabaseConfigured && isUuid(selectedDeliverable.id)} />)
        : tab === 'files' ? 'Arquivos' : 'Histórico'} />
    {!staff && isSupabaseConfigured && isUuid(selectedDeliverable.id) && <DeliverableConversation
      key={selectedDeliverable.id} role="admin" companyId={selectedProject.companyId} deliverableId={selectedDeliverable.id} active={detailTab === 'conversation'}
    />}
    <div className="tw:contents">
    {(detailTab !== 'conversation' || staff) && <div className={`tw:min-h-0 tw:flex-1 tw:px-[2.077rem] tw:py-[1.538rem] tw:[scrollbar-width:none] ${staff && detailTab === 'conversation' ? 'tw:flex tw:flex-col tw:overflow-hidden' : 'tw:overflow-y-auto'}`}>
      {detailTab === 'overview' && <>
        <DeliverySummary items={[
          { icon: <Clock3 size={14} />, label: 'Prazo', value: formatProjectDate(selectedDeliverable.dueAt) },
          { icon: <CheckCircle2 size={14} />, label: 'Horas registradas', value: hoursLabel(selectedDeliverable.hours) },
          { icon: <RefreshCw size={14} />, label: 'Ajustes', value: `${selectedDeliverable.adjustmentCount}/${selectedProject.adjustmentLimit}` },
          { icon: <GitBranch size={14} />, label: 'Frente de atuação', value: selectedDeliverable.workstream },
        ]} />
        <div className="tw:pt-[.308rem] tw:pb-[.923rem] tw:[&_p]:m-0 tw:[&_p]:text-[.923rem]/[1.65] tw:[&_p]:text-[#766b64]"><h3 className="tw:mt-0 tw:mb-[.769rem] tw:text-[1.077rem]">Sobre esta entrega</h3>{selectedDeliverable.description&&<p>{selectedDeliverable.description}</p>}<ProjectComplexityCard code={selectedDeliverable.complexity} />{selectedDeliverable.originalDueAt&&selectedDeliverable.originalDueAt!==selectedDeliverable.dueAt&&<p>Prazo original: {formatProjectDate(selectedDeliverable.originalDueAt)}.</p>}{selectedDeliverable.rebriefingRequired&&<p>Rebriefing necessário.</p>}</div>
        {selectedProject&&isUuid(selectedDeliverable.id)&&<DeliverableDependencies deliverableId={selectedDeliverable.id} companyId={selectedProject.companyId} title={selectedDeliverable.title} dueAt={selectedDeliverable.dueAt||null} originalDueAt={selectedDeliverable.originalDueAt||null} complexity={selectedDeliverable.complexity} mode={staff?'staff':'admin'} siblings={selectedProject.deliverables.filter((item)=>item.id!==selectedDeliverable.id&&item.workstream===selectedDeliverable.workstream&&Boolean(item.dueAt)&&Boolean(selectedDeliverable.dueAt)&&String(item.dueAt)>=String(selectedDeliverable.dueAt)&&!['approved','cancelled'].includes(item.status)).map((item)=>({id:item.id,title:item.title,dueAt:item.dueAt||null}))} onNotice={setStaffNotice} onChanged={()=>void loadWorkspace()}/>}
        {selectedProject&&isUuid(selectedDeliverable.id)&&<NoteLog deliverableId={selectedDeliverable.id} companyId={selectedProject.companyId} staff={Boolean(staff)} title="Notas internas" hint="Anotações, fontes e referências deste entregável. O cliente não vê." onNotice={setStaffNotice}/>}
        {selectedDeliverable.clientDelayBusinessDays>0&&<DeliveryNotice icon={<AlertTriangle size={16} />} title="Resposta do cliente em atraso">{selectedDeliverable.clientDelayBusinessDays} dia(s) útil(eis) de impacto. O atraso altera as próximas deadlines e fica registrado no histórico.</DeliveryNotice>}
        {showAdjustment&&<form className="v2-pd-inline-form adjustment-form-v2 tw:my-[1.08rem] tw:flex tw:flex-col tw:gap-[.92rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-[#fbf7f4] tw:px-[1.23rem] tw:py-[1.08rem] tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-[.46rem] tw:[&_label]:text-[.85rem] tw:[&_label]:font-bold tw:[&_textarea]:rounded-[.62rem] tw:[&_textarea]:border tw:[&_textarea]:border-solid tw:[&_textarea]:border-[#dfd3ca] tw:[&_textarea]:bg-white tw:[&_textarea]:px-[.92rem] tw:[&_textarea]:py-[.77rem] tw:[&_textarea]:text-[.92rem]" onSubmit={(e)=>{e.preventDefault();void requestAdjustment();}}><h3>Registrar pedido de alteração</h3><p>Até o 3º pedido é ajuste. O 4º passa automaticamente para rebriefing.</p><label>Justificativa<textarea rows={3} value={adjustmentReason} onChange={(e)=>setAdjustmentReason(e.target.value)} placeholder="Justificativa obrigatória"/></label><label>Impacto na deadline (dias úteis)<input type="number" min={0} max={90} value={adjustmentImpact} onChange={(e)=>setAdjustmentImpact(Number(e.target.value))}/></label><div className="v2-pd-inline-actions tw:mt-[.92rem] tw:flex tw:justify-end tw:gap-[.62rem]"><DeliveryActionButton onClick={()=>setShowAdjustment(false)}>Cancelar</DeliveryActionButton><DeliveryActionButton tone="primary" type="submit" disabled={!adjustmentReason.trim()}>Registrar ajuste</DeliveryActionButton></div></form>}</>}
      {detailTab==='tasks'&&<section className="tasks-pane-v2">
        <DeliveryProgress
          complete={doneTasks.length}
          total={selectedTasks.length}
          title={selectedTasks.length
            ? `${doneTasks.length} de ${selectedTasks.length} ${selectedTasks.length === 1 ? 'subtarefa concluída' : 'subtarefas concluídas'}`
            : 'Nenhuma subtarefa cadastrada'}
          description={currentTask
            ? `Próxima: ${currentTask.title}`
            : selectedTasks.length
              ? 'Todas as subtarefas foram concluídas.'
              : 'Use "Nova subtarefa" para desdobrar este entregável.'}
        />
        <div className="v2-dv-task-bar tw:my-[1.08rem] tw:flex tw:items-center tw:justify-between tw:gap-[.92rem] tw:text-[.85rem] tw:text-[#8c7e74]"><span>Cada subtarefa tem o próprio prazo, sempre dentro do prazo do entregável.</span><DeliveryActionButton onClick={()=>setShowTaskForm(true)}><Plus size={14}/> Nova subtarefa</DeliveryActionButton></div>
        {showTaskForm&&<form className="v2-pd-inline-form task-form-v2 tw:my-[1.08rem] tw:flex tw:flex-col tw:gap-[.92rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-cali-line! tw:bg-[color-mix(in_srgb,var(--theme-surface-soft)_72%,var(--theme-surface))]! tw:p-[1.38rem]! tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-[.46rem] tw:[&_label]:text-[.85rem] tw:[&_label]:font-bold" onSubmit={addTask}><div className="v2-dv-form-grid tw:grid tw:grid-cols-2 tw:items-end tw:gap-x-[1.23rem] tw:gap-y-[.92rem] tw:[@media(max-width:760px)]:grid-cols-1!"><label>Título da subtarefa<input className="tw:border tw:border-solid tw:border-cali-input-line! tw:bg-cali-surface! tw:text-[.92rem] tw:font-normal tw:text-cali-text! tw:shadow-none! tw:outline-none! tw:focus:border-cali-gold! tw:focus:shadow-[0_0_0_.23rem_#b58c5226]! tw:placeholder:text-cali-muted! tw:placeholder:opacity-[.82] tw:workspace-night:border-[#4a343b]! tw:workspace-night:bg-[#2a1d21]! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:[color-scheme:dark] tw:min-h-[3.38rem] tw:rounded-[.85rem]! tw:px-[1rem]! tw:py-0!" value={taskForm.title} onChange={(e)=>setTaskForm((c)=>({...c,title:e.target.value}))}/></label><label>Complexidade<select value={taskForm.complexity} onChange={(e)=>setTaskForm((c)=>({...c,complexity:e.target.value}))}>{Object.entries(complexityMeta).map(([key, meta])=><option key={key} value={key}>{meta.label||key}</option>)}</select></label><label>Prazo{selectedDeliverable.dueAt?` (até ${formatProjectDate(selectedDeliverable.dueAt)})`:''}<input className="tw:border tw:border-solid tw:border-cali-input-line! tw:bg-cali-surface! tw:text-[.92rem] tw:font-normal tw:text-cali-text! tw:shadow-none! tw:outline-none! tw:focus:border-cali-gold! tw:focus:shadow-[0_0_0_.23rem_#b58c5226]! tw:placeholder:text-cali-muted! tw:placeholder:opacity-[.82] tw:workspace-night:border-[#4a343b]! tw:workspace-night:bg-[#2a1d21]! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:[color-scheme:dark] tw:min-h-[3.38rem] tw:rounded-[.85rem]! tw:px-[1rem]! tw:py-0!" aria-label="Prazo da subtarefa" type="date" max={selectedDeliverable.dueAt?String(selectedDeliverable.dueAt).slice(0,10):undefined} value={taskForm.dueDate} onChange={(e)=>setTaskForm((c)=>({...c,dueDate:e.target.value}))}/></label><div className="tw:flex tw:min-h-[3.231rem] tw:flex-wrap tw:items-center tw:gap-[1.692rem] tw:self-end"><label className="v2-dv-check tw:flex-row! tw:items-center tw:gap-[.62rem] tw:pb-[.77rem]"><input type="checkbox" checked={taskForm.clientVisible} onChange={(e)=>setTaskForm((c)=>({...c,clientVisible:e.target.checked}))}/> Visível para o cliente</label><label className="v2-dv-check tw:flex-row! tw:items-center tw:gap-[.62rem] tw:pb-[.77rem]"><input type="checkbox" checked={taskForm.isDocument} onChange={(e)=>setTaskForm((c)=>({...c,isDocument:e.target.checked}))}/> Entrega documental</label></div></div><div className="tw:mt-[.154rem] tw:mb-[.308rem]"><ComplexityLegend current={taskForm.complexity}/></div><label className="tw:h-auto! tw:min-h-0! tw:rounded-none! tw:border-0! tw:bg-transparent! tw:p-0! tw:shadow-none!">Descrição / resultado esperado<textarea className="tw:border tw:border-solid tw:border-cali-input-line! tw:bg-cali-surface! tw:text-[.92rem] tw:font-normal tw:text-cali-text! tw:shadow-none! tw:outline-none! tw:focus:border-cali-gold! tw:focus:shadow-[0_0_0_.23rem_#b58c5226]! tw:placeholder:text-cali-muted! tw:placeholder:opacity-[.82] tw:workspace-night:border-[#4a343b]! tw:workspace-night:bg-[#2a1d21]! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:[color-scheme:dark] tw:min-h-[6.77rem] tw:w-full tw:resize-y tw:rounded-[.92rem]! tw:px-[1rem]! tw:py-[.92rem]!" rows={2} value={taskForm.description} onChange={(e)=>setTaskForm((c)=>({...c,description:e.target.value}))}/></label><div className="v2-pd-inline-actions tw:mt-[.92rem] tw:flex tw:justify-end tw:gap-[.62rem]"><DeliveryActionButton onClick={()=>setShowTaskForm(false)}>Cancelar</DeliveryActionButton><DeliveryActionButton tone="primary" type="submit" disabled={!taskForm.title.trim()}>Adicionar subtarefa</DeliveryActionButton></div></form>}
        {selectedTasks.length > 0 && <div className="tw:mt-[1.08rem] tw:overflow-x-auto">
          <div className="tw:grid tw:min-w-[40rem] tw:grid-cols-[2.62rem_minmax(0,1fr)_8.46rem_14.62rem_10rem] tw:gap-x-[1.08rem] tw:gap-y-[.62rem]">
            <div className="tw:col-span-full tw:grid tw:grid-cols-subgrid tw:items-center tw:px-[1.23rem] tw:pb-[.15rem] tw:text-[.73rem] tw:font-extrabold tw:tracking-[.06em] tw:text-[#988980] tw:uppercase">
              <span /><span>Subtarefa</span><span>Complexidade</span><span>Situação</span><span>Prazo</span>
            </div>
            {selectedTasks.map((task) => {
              const done = task.status === 'done' || task.status === 'approved';
              const highlighted = task.id === highlightedTaskId;
              return <article key={task.id} ref={highlighted ? highlightedTaskRef : undefined}
                className={`tw:col-span-full tw:grid tw:w-full tw:grid-cols-subgrid tw:items-center tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:px-[1.23rem] tw:py-[.92rem] tw:text-[.85rem] ${done ? 'tw:bg-[#f6faf7]' : 'tw:bg-white'} ${highlighted ? 'tw:outline-2 tw:outline-solid tw:outline-(--theme-accent) tw:-outline-offset-2 tw:motion-safe:animate-[project-task-highlight_.8s_ease-in-out_3]' : ''}`}
                data-highlighted={highlighted || undefined}>
                <button type="button" className="tw:grid tw:size-[2.31rem] tw:cursor-pointer tw:place-items-center tw:rounded-[.62rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-white tw:p-0 tw:text-cali-brand" title="Abrir a subtarefa" aria-label={`Abrir ${task.title}`} onClick={() => setOpenTaskId(task.id)}>
                  <ChevronRight size={16} />
                </button>
                <button type="button" className="tw:flex tw:min-w-0 tw:cursor-pointer tw:flex-col tw:items-start tw:gap-[.15rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left" onClick={() => setOpenTaskId(task.id)}>
                  <strong className="tw:max-w-full tw:truncate tw:text-[1.04rem] tw:text-[#413936]">{task.title}</strong>
                  <small className="tw:text-[.81rem] tw:text-[#9a8d85]">{[task.protocol, task.clientVisible ? 'cliente vê' : 'interno', task.isDocument ? 'entrega documental' : ''].filter(Boolean).join(' · ')}</small>
                </button>
                {task.complexity
                  ? <ProjectComplexityBadge code={task.complexity} explain className="tw:justify-self-start" />
                  : <span className="tw:font-normal tw:text-[#b5a79d]">—</span>}
                <SubtaskStatusSelect title={task.title} status={task.status} onChange={(next) => void setTaskStatus(task, next)} />
                <time className="tw:text-[.92rem] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand">{task.dueAt ? formatProjectDate(task.dueAt) : 'sem prazo'}</time>
              </article>;
            })}
          </div>
        </div>}</section>}
      {detailTab === 'conversation' && staff && <div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-[1.46rem] tw:overflow-y-auto tw:overscroll-contain tw:pb-[1.538rem] tw:[scrollbar-width:none]" aria-live="polite">
        {staffChat.length ? staffChat.map((message) => {
          const identity = message.authorId ? staffPeople[message.authorId] : undefined;
          const name = identity?.full_name || (message.actor === 'client' ? 'Cliente' : message.actor === 'system' ? 'CALI Workspace' : 'CALI');
          const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            .format(new Date(message.createdAt)).replace('.', '');
          return <ProjectMessage key={message.id} identity={identity} name={name} date={date} mine={message.authorId === staffUserId} internal={conversationChannel !== 'client'}>
            {(()=>{ const files:{name:string;path:string;size:number}[]=[]; const clean=message.body.replace(/\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g,(_x:string,n:string,pth:string,_t:string,sz:string)=>{ try{files.push({name:decodeURIComponent(n),path:decodeURIComponent(pth),size:Number(sz||0)});}catch{files.push({name:n,path:pth,size:Number(sz||0)});} return ''; }).trim(); return <>{clean&&<p>{withMentions(clean)}</p>}{files.length>0&&<div className="tw:mt-[.62rem] tw:flex tw:flex-col tw:items-start tw:gap-[.46rem]">{files.map((f)=><ConversationAttachmentButton key={f.path} name={f.name} size={f.size} onOpen={()=>void staffOpenAttachment(f.path)}/>)}</div>}</>; })()}
          </ProjectMessage>;
        }) : <EmptyState as="p" variant="admin">{conversationChannel === 'client' ? 'Ainda não há mensagens com o cliente neste entregável.' : 'Ainda não há notas internas neste entregável.'}</EmptyState>}
      </div>}
      {detailTab==='files'&&isUuid(selectedDeliverable.id)&&<DeliverableFiles deliverableId={selectedDeliverable.id} deliverableTitle={selectedDeliverable.title} companyId={selectedProject.companyId} projectId={selectedProject.id} staff={Boolean(staff)} tasks={selectedTasks.map((task)=>({id:task.id,title:task.title}))} onNotice={setStaffNotice}/>}
      {detailTab === 'history' && <DeliveryHistory
        title="Histórico da entrega"
        description="Registro cronológico de mudanças de situação, ajustes e decisões — diferente das mensagens da conversa."
        emptyMessage="Ainda não há movimentações registradas para este entregável."
        entries={history.map((item) => ({
          id: item.id,
          title: item.title,
          date: typeof item.createdAt === 'string' && item.createdAt.includes('T')
            ? new Date(item.createdAt).toLocaleString('pt-BR')
            : item.createdAt,
          description: item.detail,
        }))}
      />}
    </div>}
    {detailTab==='conversation'&&staff&&<div className="tw:relative tw:z-2 tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-[.923rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#e9ddd6] tw:bg-white tw:px-[2.077rem] tw:py-[1.308rem]"><div className="ie-switch conversation-channel-compact-v64 conversation-channels-v2" aria-label="Canal da conversa"><button className={conversationChannel==='client'?'on active':''} onClick={()=>setConversationChannel('client')}>Cliente</button><button className={conversationChannel==='internal'?'on active':''} onClick={()=>setConversationChannel('internal')}>Interno</button></div><textarea className="tw:max-h-[7.385rem] tw:min-h-[4.769rem] tw:min-w-0 tw:flex-1 tw:resize-none tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:p-[.923rem]" value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder={conversationChannel==='client'?'Escreva uma mensagem para o cliente…':'Registre uma nota interna…'}/><input ref={fileInputRef} type="file" hidden onChange={(e)=>setMessageFile(e.target.files?.[0]||null)}/><div className="tw:mt-[.769rem] tw:flex tw:justify-end"><DeliveryActionButton onClick={()=>fileInputRef.current?.click()}><Paperclip size={14}/>{messageFile?messageFile.name:'Anexar'}</DeliveryActionButton><Button variant="primary" onClick={()=>void sendStaffMessage()} disabled={!messageText.trim()&&!messageFile}>Enviar <ArrowRight size={14}/></Button></div></div>}
    </div>
    {detailTab!=='conversation'&&<footer className="tw:flex tw:min-h-[4.462rem] tw:shrink-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-[.769rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#efe4dc] tw:px-[2.077rem] tw:py-[1.154rem] tw:text-[.769rem] tw:text-[#9c897e]"><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[.62rem]">
      {!staff && selectedDeliverable.status === 'approved' && isUuid(selectedDeliverable.id) && <DeliveryActionButton onClick={() => {
          setPendingStatus({ item: selectedDeliverable, status: 'reopen' });
          setStatusReason('');
          setStatusError('');
        }}
      ><RefreshCw size={13}/> Reabrir para correção</DeliveryActionButton>}{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&<DeliveryActionButton onClick={()=>openDeliverable(undefined,selectedDeliverable)}><Edit3 size={13}/> Editar</DeliveryActionButton>}{selectedDeliverable.status!=='approved'&&selectedDeliverable.status!=='cancelled'&&(selectedDeliverable.clientVisible||(selectedDeliverable.reviewRevision??1)===1)&&<DeliveryActionButton hidden={Boolean(staff)} onClick={()=>setShowAdjustment(true)}><RefreshCw size={13}/> Ajuste</DeliveryActionButton>}<DeliveryActionButton className="tw:text-[#b7495d]!" onClick={()=>{setPendingStatus({item:selectedDeliverable,status:'cancelled'});setStatusReason('');}} disabled={selectedDeliverable.status==='approved'||selectedDeliverable.status==='cancelled'}><X size={13}/> Cancelar entregável</DeliveryActionButton><DeliveryActionButton className="tw:text-[#b7495d]!" onClick={()=>setConfirmDelete(selectedDeliverable)} disabled={selectedDeliverable.status!=='not_started'}><Trash2 size={13}/> Excluir</DeliveryActionButton></div><div className="tw:ml-auto tw:flex tw:flex-wrap tw:items-center tw:gap-[.62rem]">{(selectedDeliverable.status==='in_progress'||(!staff&&(selectedDeliverable.reviewRevision??1)>1&&selectedDeliverable.status==='internal_review'))&&<DeliveryActionButton disabled={Boolean(staff&&staffReviewPending[selectedDeliverable.id])} onClick={() => releaseDeliverable(selectedDeliverable)}><Send size={13}/> {staff?(staffReviewPending[selectedDeliverable.id]?'Aguardando aprovação':'Enviar para aprovação'):((selectedDeliverable.reviewRevision??1)>1?'Liberar revisão ao cliente':'Enviar ao cliente')}</DeliveryActionButton>}{selectedDeliverable.status==='approved'?<span className="locked-v2 tw:inline-flex tw:items-center tw:gap-[.46rem] tw:text-[.85rem] tw:text-[#42785a]"><ShieldCheck size={14}/> Aprovado e protegido</span>:null}</div></footer>}
  </DeliveryDetailDialog>;})()}

  {selectedDeliverable && <TimerFinalizationDialog {...adminTimer.dialog} />}

  {submission && <ConfirmProjectSubmissionDialog kind={submission === 'project' ? 'project' : 'deliverable'}
    pending={submissionPending} error={submissionError} onClose={() => setSubmission(null)} onConfirm={() => void confirmSubmission()}/>}

  {pendingStatus&&<WorkspaceDialogOverlay aboveDialog><WorkspaceConfirmDialog className="confirm-project-modal-v2" aria-label={pendingStatus.status==='reopen'?'Reabrir entregável':'Alterar status'}><div><h2>{pendingStatus.status==='reopen'?'Reabrir entregável':deliverableLabels[pendingStatus.status]}</h2><p><strong>{pendingStatus.item.title}</strong></p><p>{pendingStatus.status==='reopen'?'O cliente volta a ver o entregável quando a revisão for liberada para nova aprovação.':'Registre o motivo para manter a mudança no histórico do projeto.'}</p></div><label>Motivo<textarea autoFocus maxLength={pendingStatus.status==='reopen'?2000:undefined} value={statusReason} onChange={(e)=>setStatusReason(e.target.value)} placeholder={pendingStatus.status==='standby'?'Por que este entregável ficará em standby?':pendingStatus.status==='rebriefing'?'O que exige rebriefing?':pendingStatus.status==='reopen'?'O que precisa ser corrigido?':'Motivo do cancelamento'}/></label>{statusError&&<p role="alert">{statusError}</p>}<footer><button disabled={saving} onClick={()=>{setPendingStatus(null);setStatusError('');}}>Voltar</button><button disabled={saving||statusReason.trim().length<3} onClick={()=>void confirmPendingStatus()}>{saving?'Salvando…':pendingStatus.status==='reopen'?'Reabrir para correção':'Confirmar status'}</button></footer></WorkspaceConfirmDialog></WorkspaceDialogOverlay>}

  {confirmDelete&&<WorkspaceDialogOverlay aboveDialog><WorkspaceConfirmDialog className="confirm-project-modal-v2" role="alertdialog" aria-label="Excluir entregável"><div><small>CONFIRMAÇÃO</small><h2>Excluir entregável</h2><p><strong>{confirmDelete.title}</strong></p><p>A exclusão só é permitida antes do início. Depois disso, o correto é cancelar para preservar o histórico.</p></div><footer><button onClick={()=>setConfirmDelete(null)}>Voltar</button><button onClick={()=>void deleteDeliverable()}>Excluir</button></footer></WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </WorkspaceAdminContent></WorkspaceAdminPage>
  </ProjectsFrame>;
}
