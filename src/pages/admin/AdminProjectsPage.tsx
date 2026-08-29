import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  History,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import {
  caliWorkstreams,
  complexityMeta,
  deliverableLabels,
  formatProjectDate,
  previewProjects,
  projectPlanningLabels,
  projectProgress,
  type DeliverableStatus,
  type MaterialComplexity,
  type ProjectDeliverable,
  type ProjectPlanningStatus,
  type WorkspaceProject,
} from '../../domain/projects';

type ProjectView = 'roadmap' | 'deliverables' | 'history';
type DeliverableView = 'list' | 'kanban';

type ProjectForm = {
  companyId: string;
  name: string;
  service: string;
  startDate: string;
  endDate: string;
  clientResponseBusinessDays: number;
};

type DeliverableForm = {
  title: string;
  workstream: string;
  complexity: MaterialComplexity;
  monthStart: number;
  monthEnd: number;
  dueDate: string;
  isDocument: boolean;
  clientVisible: boolean;
};

const statuses: DeliverableStatus[] = ['not_started', 'in_progress', 'internal_review', 'client_review', 'adjustment_requested', 'approved', 'cancelled'];

const projectStatusTone: Record<ProjectPlanningStatus, string> = {
  draft: 'neutral', client_review: 'warning', adjustment_requested: 'warning', approved: 'success', active: 'success', rebriefing: 'danger', closed: 'neutral',
};

const statusTone: Record<DeliverableStatus, string> = {
  not_started: 'neutral', in_progress: 'info', internal_review: 'warning', client_review: 'warning', adjustment_requested: 'danger', approved: 'success', cancelled: 'neutral',
};

function emptyProjectForm(companyId = ''): ProjectForm {
  return { companyId, name: '', service: 'Assessoria Estratégica Mensal', startDate: '', endDate: '', clientResponseBusinessDays: 3 };
}

function emptyDeliverableForm(): DeliverableForm {
  return { title: '', workstream: 'Gestão & Governança de RH', complexity: 'MC2', monthStart: 1, monthEnd: 1, dueDate: '', isDocument: true, clientVisible: true };
}

function hoursLabel(hours: number) {
  return `${hours.toLocaleString('pt-BR', { minimumFractionDigits: hours % 1 ? 1 : 0, maximumFractionDigits: 1 })}h`;
}

function roadmapLabel(item: ProjectDeliverable) {
  if (!item.roadmapMonthStart) return 'Sem mês';
  if (!item.roadmapMonthEnd || item.roadmapMonthEnd === item.roadmapMonthStart) return `M${item.roadmapMonthStart}`;
  return `M${item.roadmapMonthStart}–M${item.roadmapMonthEnd}`;
}

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<WorkspaceProject[]>(previewProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(previewProjects[0].id);
  const [projectView, setProjectView] = useState<ProjectView>('roadmap');
  const [deliverableView, setDeliverableView] = useState<DeliverableView>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectPlanningStatus>('all');
  const [selectedDeliverable, setSelectedDeliverable] = useState<ProjectDeliverable | null>(null);
  const [openProjectModal, setOpenProjectModal] = useState(false);
  const [openDeliverableModal, setOpenDeliverableModal] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>(() => emptyProjectForm());
  const [deliverableForm, setDeliverableForm] = useState<DeliverableForm>(() => emptyDeliverableForm());
  const [saving, setSaving] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentImpact, setAdjustmentImpact] = useState(0);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);

  useEffect(() => { void loadProjects(); }, []);
  useEffect(() => {
    const active = openProjectModal || openDeliverableModal || Boolean(selectedDeliverable);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [openProjectModal, openDeliverableModal, selectedDeliverable]);

  async function loadProjects() {
    if (!supabase) return;
    try {
      const [{ data: companyRows }, { data: projectRows }, { data: deliverableRows }, { data: hourRows }] = await Promise.all([
        supabase.from('companies').select('id, display_name, logo_url, service_type').neq('status', 'closed').order('display_name'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('deliverables').select('*').order('sort_order'),
        supabase.from('hour_entries').select('deliverable_id, minutes'),
      ]);
      if (!projectRows?.length) return;
      const companies = new Map((companyRows || []).map((row: any) => [row.id, row]));
      const hours = new Map<string, number>();
      (hourRows || []).forEach((row: any) => hours.set(row.deliverable_id, (hours.get(row.deliverable_id) || 0) + Number(row.minutes || 0) / 60));
      const next: WorkspaceProject[] = projectRows.map((row: any) => {
        const company: any = companies.get(row.company_id) || {};
        const projectDeliverables: ProjectDeliverable[] = (deliverableRows || []).filter((d: any) => d.project_id === row.id).map((d: any) => ({
          id: d.id, protocol: d.protocol || d.code || '—', title: d.title, description: d.description, status: d.status as DeliverableStatus,
          workstream: d.workstream || 'Gestão & Governança de RH', complexity: (d.complexity || 'MC2') as MaterialComplexity,
          roadmapMonthStart: d.roadmap_month_start, roadmapMonthEnd: d.roadmap_month_end, dueAt: d.due_at, originalDueAt: d.original_due_at,
          clientResponseDueAt: d.client_response_due_at, clientDelayBusinessDays: Number(d.client_delay_business_days || 0), adjustmentCount: Number(d.adjustment_count || 0),
          rebriefingRequired: Boolean(d.rebriefing_required), isDocument: Boolean(d.is_document), hours: hours.get(d.id) || 0, taskCount: 0, taskDone: 0,
          sortOrder: Number(d.sort_order || 0), clientVisible: Boolean(d.client_visible),
        }));
        return {
          id: row.id, protocol: row.protocol || '—', companyId: row.company_id, company: company.display_name || 'Cliente', companyLogo: company.logo_url,
          name: row.name, service: company.service_type || 'Serviço CALI', description: row.description, planningStatus: (row.planning_status || (row.status === 'active' ? 'active' : 'draft')) as ProjectPlanningStatus,
          startDate: row.start_date, endDate: row.target_end_date, clientResponseBusinessDays: Number(row.client_response_business_days || 3), adjustmentLimit: Number(row.adjustment_limit || 3), deliverables: projectDeliverables,
        };
      });
      setProjects(next);
      setSelectedProjectId((current) => next.some((p) => p.id === current) ? current : next[0].id);
    } catch (error) {
      console.error('Falha ao carregar projetos', error);
    }
  }

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const text = `${project.company} ${project.name} ${project.protocol} ${project.service}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (statusFilter !== 'all' && project.planningStatus !== statusFilter) return false;
    return true;
  }), [projects, query, statusFilter]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || filteredProjects[0] || projects[0];
  const summary = useMemo(() => ({
    active: projects.filter((p) => p.planningStatus === 'active').length,
    waiting: projects.filter((p) => p.planningStatus === 'client_review').length + projects.reduce((sum, p) => sum + p.deliverables.filter((d) => d.status === 'client_review').length, 0),
    rebriefing: projects.filter((p) => p.planningStatus === 'rebriefing').length + projects.reduce((sum, p) => sum + p.deliverables.filter((d) => d.rebriefingRequired).length, 0),
    impacted: projects.reduce((sum, p) => sum + p.deliverables.filter((d) => Boolean(d.originalDueAt) || d.clientDelayBusinessDays > 0).length, 0),
  }), [projects]);

  const maxRoadmapMonth = Math.max(8, ...(selectedProject?.deliverables.map((d) => d.roadmapMonthEnd || d.roadmapMonthStart || 1) || [8]));
  const months = Array.from({ length: maxRoadmapMonth }, (_, index) => index + 1);

  async function loadHistory(projectId: string) {
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(projectId)) { setHistoryRows([]); return; }
    const { data } = await supabase.from('activity_log').select('*').eq('entity_type', 'project').eq('entity_id', projectId).order('created_at', { ascending: false }).limit(30);
    setHistoryRows(data || []);
  }

  useEffect(() => { if (projectView === 'history' && selectedProject) void loadHistory(selectedProject.id); }, [projectView, selectedProject?.id]);

  function openNewProject() {
    setProjectForm(emptyProjectForm(selectedProject?.companyId || ''));
    setOpenProjectModal(true);
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectForm.name.trim() || !projectForm.companyId) return;
    setSaving(true);
    try {
      const canPersist = Boolean(supabase && /^[0-9a-f-]{36}$/i.test(projectForm.companyId));
      if (canPersist && supabase) {
        const { data, error } = await supabase.from('projects').insert({
          company_id: projectForm.companyId, name: projectForm.name.trim(), status: 'planned', planning_status: 'draft',
          start_date: projectForm.startDate || null, target_end_date: projectForm.endDate || null,
          roadmap_start_date: projectForm.startDate || null, roadmap_end_date: projectForm.endDate || null,
          client_response_business_days: projectForm.clientResponseBusinessDays, adjustment_limit: 3,
        }).select('id').single();
        if (error) throw error;
        setOpenProjectModal(false);
        await loadProjects();
        if (data?.id) setSelectedProjectId(data.id);
      } else {
        const company = projects.find((p) => p.companyId === projectForm.companyId)?.company || 'Cliente';
        const local: WorkspaceProject = { id: `local-project-${Date.now()}`, protocol: `CALI-PRJ-PREVIEW-${Date.now().toString().slice(-5)}`, companyId: projectForm.companyId, company, name: projectForm.name.trim(), service: projectForm.service, planningStatus: 'draft', startDate: projectForm.startDate || null, endDate: projectForm.endDate || null, clientResponseBusinessDays: projectForm.clientResponseBusinessDays, adjustmentLimit: 3, deliverables: [] };
        setProjects((current) => [local, ...current]); setSelectedProjectId(local.id); setOpenProjectModal(false);
      }
    } catch (error) { console.error('Falha ao criar cronograma', error); } finally { setSaving(false); }
  }

  async function createDeliverable(event: FormEvent) {
    event.preventDefault();
    if (!selectedProject || !deliverableForm.title.trim()) return;
    setSaving(true);
    try {
      const canPersist = Boolean(supabase && /^[0-9a-f-]{36}$/i.test(selectedProject.id));
      if (canPersist && supabase) {
        const { error } = await supabase.from('deliverables').insert({
          company_id: selectedProject.companyId, project_id: selectedProject.id, title: deliverableForm.title.trim(), status: 'not_started', priority: 'normal',
          workstream: deliverableForm.workstream, complexity: deliverableForm.complexity, roadmap_month_start: deliverableForm.monthStart, roadmap_month_end: deliverableForm.monthEnd,
          due_at: deliverableForm.dueDate ? `${deliverableForm.dueDate}T18:00:00-03:00` : null, is_document: deliverableForm.isDocument, client_visible: deliverableForm.clientVisible,
          sort_order: selectedProject.deliverables.length + 1,
        });
        if (error) throw error;
        await loadProjects();
      } else {
        const local: ProjectDeliverable = { id: `local-del-${Date.now()}`, protocol: `CALI-ENT-PREVIEW-${Date.now().toString().slice(-5)}`, title: deliverableForm.title.trim(), status: 'not_started', workstream: deliverableForm.workstream, complexity: deliverableForm.complexity, roadmapMonthStart: deliverableForm.monthStart, roadmapMonthEnd: deliverableForm.monthEnd, dueAt: deliverableForm.dueDate ? `${deliverableForm.dueDate}T18:00:00-03:00` : null, clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: deliverableForm.isDocument, hours: 0, taskCount: 0, taskDone: 0, sortOrder: selectedProject.deliverables.length + 1, clientVisible: deliverableForm.clientVisible };
        setProjects((current) => current.map((p) => p.id === selectedProject.id ? { ...p, deliverables: [...p.deliverables, local] } : p));
      }
      setOpenDeliverableModal(false); setDeliverableForm(emptyDeliverableForm());
    } catch (error) { console.error('Falha ao criar entregável', error); } finally { setSaving(false); }
  }

  async function moveDeliverable(item: ProjectDeliverable, next: DeliverableStatus) {
    if (item.status === 'approved') return;
    if (supabase && /^[0-9a-f-]{36}$/i.test(item.id)) {
      const payload: any = { status: next };
      if (next === 'client_review') payload.approval_requested_at = new Date().toISOString();
      if (next === 'approved') { payload.approved_at = new Date().toISOString(); payload.locked_at = new Date().toISOString(); }
      await supabase.from('deliverables').update(payload).eq('id', item.id);
      await loadProjects();
    } else {
      setProjects((current) => current.map((p) => ({ ...p, deliverables: p.deliverables.map((d) => d.id === item.id ? { ...d, status: next } : d) })));
    }
    setSelectedDeliverable((current) => current?.id === item.id ? { ...current, status: next } : current);
  }

  async function requestAdjustment() {
    if (!selectedDeliverable || !adjustmentReason.trim()) return;
    const nextNumber = selectedDeliverable.adjustmentCount + 1;
    const isRebriefing = nextNumber > (selectedProject?.adjustmentLimit || 3);
    if (supabase && /^[0-9a-f-]{36}$/i.test(selectedDeliverable.id)) {
      const { error } = await supabase.rpc('request_deliverable_adjustment', { p_deliverable_id: selectedDeliverable.id, p_reason: adjustmentReason.trim(), p_impact_business_days: adjustmentImpact });
      if (error) console.error(error); else await loadProjects();
    } else {
      setProjects((current) => current.map((p) => p.id === selectedProject?.id ? { ...p, planningStatus: isRebriefing ? 'rebriefing' : p.planningStatus, deliverables: p.deliverables.map((d) => d.id === selectedDeliverable.id ? { ...d, status: 'adjustment_requested', adjustmentCount: nextNumber, rebriefingRequired: isRebriefing } : d) } : p));
    }
    setSelectedDeliverable((current) => current ? { ...current, status: 'adjustment_requested', adjustmentCount: nextNumber, rebriefingRequired: isRebriefing } : current);
    setAdjustmentReason(''); setAdjustmentImpact(0); setShowAdjustment(false);
  }

  async function sendScheduleToClient() {
    if (!selectedProject) return;
    if (supabase && /^[0-9a-f-]{36}$/i.test(selectedProject.id)) {
      await supabase.from('projects').update({ planning_status: 'client_review' }).eq('id', selectedProject.id);
      const { data: userData } = await supabase.auth.getUser();
      const due = new Date(); due.setDate(due.getDate() + selectedProject.clientResponseBusinessDays);
      await supabase.from('project_review_requests').insert({ company_id: selectedProject.companyId, project_id: selectedProject.id, review_type: 'schedule', response_due_at: due.toISOString(), created_by: userData.user?.id || null });
      await loadProjects();
    } else {
      setProjects((current) => current.map((p) => p.id === selectedProject.id ? { ...p, planningStatus: 'client_review' } : p));
    }
  }

  if (!selectedProject) return <Shell role="admin"><section className="page"><h1>Projetos</h1><p>Nenhum projeto disponível.</p></section></Shell>;

  return (
    <Shell role="admin">
      <section className="page projects-page-v2">
        <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
        <div className="page-heading projects-heading">
          <div><h1>Projetos</h1><p>Ciclos, roadmap, entregáveis e dependências no mesmo fluxo. O cliente acompanha, valida e solicita ajustes; a CALI mantém a condução do cronograma.</p></div>
          <button className="primary compact-action" onClick={openNewProject}><Plus size={17} />Novo cronograma</button>
        </div>

        <section className="project-kpi-grid">
          <article><span>Projetos vigentes</span><strong>{summary.active}</strong><small>em execução</small></article>
          <article><span>Aguardando cliente</span><strong>{summary.waiting}</strong><small>cronogramas + entregáveis</small></article>
          <article className={summary.rebriefing ? 'attention' : ''}><span>Rebriefing</span><strong>{summary.rebriefing}</strong><small>4º ajuste ou mais</small></article>
          <article className={summary.impacted ? 'attention' : ''}><span>Prazos impactados</span><strong>{summary.impacted}</strong><small>datas recalculadas</small></article>
        </section>

        <section className="project-portfolio-toolbar panel">
          <label className="project-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente, projeto ou protocolo" /></label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}><option value="all">Todos os status</option>{Object.entries(projectPlanningLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        </section>

        <div className="project-portfolio-strip">
          {filteredProjects.map((project) => <button key={project.id} className={`project-selector-card ${project.id === selectedProject.id ? 'active' : ''}`} onClick={() => setSelectedProjectId(project.id)}>
            <div className="project-company-mark">{project.company.slice(0,1)}</div>
            <div><span>{project.protocol}</span><strong>{project.company}</strong><small>{project.name}</small></div>
            <b className={`project-status-pill ${projectStatusTone[project.planningStatus]}`}>{projectPlanningLabels[project.planningStatus]}</b>
          </button>)}
        </div>

        <section className="project-hero-card">
          <div className="project-hero-main">
            <span className="section-kicker light">{selectedProject.company} · {selectedProject.protocol}</span>
            <h2>{selectedProject.name}</h2>
            <p>{selectedProject.service} · {formatProjectDate(selectedProject.startDate)} → {formatProjectDate(selectedProject.endDate)}</p>
            <div className="project-hero-tags"><span><Clock3 size={14} /> resposta do cliente: {selectedProject.clientResponseBusinessDays} dias úteis</span><span><RefreshCw size={14} /> até {selectedProject.adjustmentLimit} ajustes antes de rebriefing</span></div>
          </div>
          <div className="project-progress-block"><strong>{projectProgress(selectedProject.deliverables)}%</strong><span>andamento estimado</span><div><i style={{ width: `${projectProgress(selectedProject.deliverables)}%` }} /></div></div>
          <div className="project-hero-actions">{selectedProject.planningStatus === 'draft' && <button className="secondary" onClick={() => void sendScheduleToClient()}><Send size={15} />Enviar cronograma ao cliente</button>}<button className="secondary" onClick={() => { setDeliverableForm(emptyDeliverableForm()); setOpenDeliverableModal(true); }}><Plus size={15} />Entregável</button></div>
        </section>

        {selectedProject.deliverables.some((d) => d.clientDelayBusinessDays > 0) && <section className="project-delay-banner"><AlertTriangle size={19} /><div><strong>Resposta do cliente impactou o cronograma</strong><p>O atraso não gera aprovação automática. As próximas deadlines são deslocadas em dias úteis e o cliente é avisado de que a demora altera a sequência das entregas.</p></div></section>}
        {selectedProject.planningStatus === 'rebriefing' && <section className="project-rebriefing-banner"><GitBranch size={19} /><div><strong>Rebriefing necessário</strong><p>O limite de 3 ajustes foi ultrapassado. O próximo movimento precisa revalidar contexto, escopo e novas deadlines antes de seguir.</p></div></section>}

        <nav className="project-tabs">{(['roadmap','deliverables','history'] as ProjectView[]).map((tab) => <button key={tab} className={projectView === tab ? 'active' : ''} onClick={() => setProjectView(tab)}>{tab === 'roadmap' ? 'Roadmap & ciclos' : tab === 'deliverables' ? 'Entregáveis' : 'Histórico'}</button>)}</nav>

        {projectView === 'roadmap' && <section className="project-roadmap-panel panel">
          <div className="project-roadmap-header"><div><span className="section-kicker">SEQUÊNCIA DE IMPLANTAÇÃO</span><h2>Ciclos e fases</h2><p>M1, M2, M3… representam meses do roadmap. A complexidade MC é uma leitura separada do material.</p></div><div className="roadmap-legend"><span><i className="mc1" />MC1</span><span><i className="mc2" />MC2</span><span><i className="mc3" />MC3</span></div></div>
          <div className="roadmap-month-head"><span>Entregável / frente</span>{months.map((month) => <b key={month}>M{month}</b>)}</div>
          <div className="roadmap-rows">{selectedProject.deliverables.filter((d) => d.status !== 'cancelled').map((item) => <button key={item.id} className="roadmap-row" onClick={() => setSelectedDeliverable(item)}>
            <div className="roadmap-row-copy"><span>{item.protocol}</span><strong>{item.title}</strong><small>{item.workstream} · {item.complexity}</small></div>
            <div className="roadmap-timeline" style={{ '--roadmap-columns': months.length } as React.CSSProperties}>{months.map((month) => <i key={month} />)}<span className={`roadmap-bar ${item.complexity.toLowerCase()}`} style={{ gridColumn: `${item.roadmapMonthStart || 1} / ${Math.min(months.length + 1, (item.roadmapMonthEnd || item.roadmapMonthStart || 1) + 1)}` }}><b>{roadmapLabel(item)}</b></span></div>
            <div className="roadmap-deadline"><span>{formatProjectDate(item.dueAt)}</span>{item.originalDueAt && <small>era {formatProjectDate(item.originalDueAt)}</small>}</div>
          </button>)}</div>
        </section>}

        {projectView === 'deliverables' && <>
          <div className="deliverable-toolbar"><div className="deliverable-view-switch"><button className={deliverableView === 'list' ? 'active' : ''} onClick={() => setDeliverableView('list')}><List size={15} />Lista</button><button className={deliverableView === 'kanban' ? 'active' : ''} onClick={() => setDeliverableView('kanban')}><LayoutGrid size={15} />Kanban</button></div><span>{selectedProject.deliverables.length} entregáveis</span></div>
          {deliverableView === 'list' ? <section className="panel project-deliverable-list">{selectedProject.deliverables.map((item) => <button key={item.id} className={`project-deliverable-row ${item.rebriefingRequired ? 'rebriefing' : ''}`} onClick={() => setSelectedDeliverable(item)}>
            <div className="deliverable-type-icon">{item.isDocument ? <FileText size={18} /> : <CheckCircle2 size={18} />}</div>
            <div className="deliverable-main"><span>{item.protocol}</span><strong>{item.title}</strong><small>{item.workstream}</small></div>
            <span className={`complexity-pill ${item.complexity.toLowerCase()}`}>{item.complexity}</span>
            <span className={`deliverable-status ${statusTone[item.status]}`}>{deliverableLabels[item.status]}</span>
            <div className="deliverable-task-progress"><span>{item.taskDone}/{item.taskCount} subtarefas</span><div><i style={{ width: `${item.taskCount ? (item.taskDone / item.taskCount) * 100 : 0}%` }} /></div></div>
            <div className="deliverable-hours"><span>{hoursLabel(item.hours)}</span><small>registradas</small></div>
            <div className="deliverable-date"><strong>{formatProjectDate(item.dueAt)}</strong>{item.originalDueAt && <small>impactado</small>}</div>
            <ArrowRight size={16} />
          </button>)}</section> : <section className="project-kanban">{statuses.filter((s) => s !== 'cancelled').map((status) => <div className="project-kanban-column" key={status}><header><strong>{deliverableLabels[status]}</strong><span>{selectedProject.deliverables.filter((d) => d.status === status).length}</span></header>{selectedProject.deliverables.filter((d) => d.status === status).map((item) => <button className="project-kanban-card" key={item.id} onClick={() => setSelectedDeliverable(item)}><span>{item.protocol}</span><strong>{item.title}</strong><small>{item.workstream}</small><div><b className={`complexity-pill ${item.complexity.toLowerCase()}`}>{item.complexity}</b><time>{formatProjectDate(item.dueAt)}</time></div>{item.rebriefingRequired && <em><GitBranch size={13} />Rebriefing</em>}</button>)}</div>)}</section>}
        </>}

        {projectView === 'history' && <section className="panel project-history"><div className="panel-title"><div><span className="section-kicker">RASTREABILIDADE</span><h2>Histórico do projeto</h2></div></div>{historyRows.length ? historyRows.map((row) => <article key={row.id}><span className="history-dot" /><div><strong>{String(row.event_type).replaceAll('_',' ')}</strong><p>{row.metadata?.reason || row.metadata?.note || 'Alteração registrada no Workspace.'}</p><small>{new Date(row.created_at).toLocaleString('pt-BR')}</small></div></article>) : <div className="project-history-preview"><article><span className="history-dot" /><div><strong>Cronograma criado</strong><p>Roadmap inicial organizado pela CALI.</p><small>19 ago 2026</small></div></article><article><span className="history-dot" /><div><strong>Cultura e Clima enviado ao cliente</strong><p>Aguardando validação para avançar a próxima dependência.</p><small>24 ago 2026</small></div></article><article><span className="history-dot warning" /><div><strong>Resposta atrasada · +2 dias úteis</strong><p>Deadlines posteriores recalculadas automaticamente.</p><small>28 ago 2026</small></div></article></div>}</section>}
      </section>

      {openProjectModal && <div className="modal-backdrop full-screen-modal project-modal-backdrop"><form className="modal-card project-create-modal" onSubmit={createProject} role="dialog" aria-modal="true"><button type="button" className="modal-close" onClick={() => setOpenProjectModal(false)}><X size={20} /></button><div className="project-modal-heading"><span className="section-kicker">NOVO CRONOGRAMA</span><h2>Estruturar roadmap</h2><p>O cronograma nasce em rascunho. Depois você envia ao cliente para validação; o cliente não reordena itens, apenas aprova ou solicita ajuste justificado.</p></div><div className="project-modal-body"><label className="stacked-label">Cliente<select value={projectForm.companyId} onChange={(e) => setProjectForm((c) => ({ ...c, companyId: e.target.value }))}>{Array.from(new Map(projects.map((p) => [p.companyId,p.company])).entries()).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="stacked-label">Nome do projeto<input value={projectForm.name} onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))} placeholder="Ex.: Roadmap People · ciclo estratégico" /></label><label className="stacked-label">Serviço<select value={projectForm.service} onChange={(e) => setProjectForm((c) => ({ ...c, service: e.target.value }))}><option>Assessoria Estratégica Mensal</option><option>Projeto de Estruturação</option><option>People Advisory</option><option>Diagnóstico & Plano</option><option>Customizado</option></select></label><div className="project-form-grid"><label className="stacked-label">Início<input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((c) => ({ ...c, startDate: e.target.value }))} /></label><label className="stacked-label">Previsão final<input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((c) => ({ ...c, endDate: e.target.value }))} /></label></div><label className="stacked-label">Prazo esperado para resposta do cliente<input type="number" min={1} max={30} value={projectForm.clientResponseBusinessDays} onChange={(e) => setProjectForm((c) => ({ ...c, clientResponseBusinessDays: Number(e.target.value) }))} /><small>Dias úteis. A ausência de resposta não aprova nada; apenas passa a sinalizar impacto de cronograma.</small></label><div className="project-rule-note"><ShieldCheck size={18} /><div><strong>Regra de ajuste CALI</strong><p>Até 3 pedidos de alteração com justificativa. O 4º pedido vira rebriefing e exige revalidação de prazo e escopo.</p></div></div></div><div className="project-modal-footer"><button type="button" className="secondary" onClick={() => setOpenProjectModal(false)}>Cancelar</button><button className="primary" disabled={saving || !projectForm.name.trim()}>{saving ? 'Salvando…' : 'Criar cronograma'}</button></div></form></div>}

      {openDeliverableModal && <div className="modal-backdrop full-screen-modal project-modal-backdrop"><form className="modal-card deliverable-create-modal" onSubmit={createDeliverable} role="dialog" aria-modal="true"><button type="button" className="modal-close" onClick={() => setOpenDeliverableModal(false)}><X size={20} /></button><div className="project-modal-heading"><span className="section-kicker">NOVO ENTREGÁVEL</span><h2>Adicionar ao roadmap</h2><p>Complexidade MC mede a densidade do material. Prazo e meses do roadmap são definidos separadamente.</p></div><div className="project-modal-body"><label className="stacked-label">Entregável<input value={deliverableForm.title} onChange={(e) => setDeliverableForm((c) => ({ ...c, title: e.target.value }))} placeholder="Ex.: Política de cargos e movimentação" /></label><div className="project-form-grid"><label className="stacked-label">Frente<select value={deliverableForm.workstream} onChange={(e) => setDeliverableForm((c) => ({ ...c, workstream: e.target.value }))}>{caliWorkstreams.map((item) => <option key={item}>{item}</option>)}</select></label><label className="stacked-label">Complexidade<select value={deliverableForm.complexity} onChange={(e) => setDeliverableForm((c) => ({ ...c, complexity: e.target.value as MaterialComplexity }))}>{Object.keys(complexityMeta).map((key) => <option key={key} value={key}>{complexityMeta[key as MaterialComplexity].label}</option>)}</select></label></div><div className="complexity-explain"><strong>{complexityMeta[deliverableForm.complexity].label}</strong><p>{complexityMeta[deliverableForm.complexity].description}</p></div><div className="project-form-grid triple"><label className="stacked-label">Mês inicial<input type="number" min={1} max={60} value={deliverableForm.monthStart} onChange={(e) => setDeliverableForm((c) => ({ ...c, monthStart: Number(e.target.value) }))} /></label><label className="stacked-label">Mês final<input type="number" min={deliverableForm.monthStart} max={60} value={deliverableForm.monthEnd} onChange={(e) => setDeliverableForm((c) => ({ ...c, monthEnd: Number(e.target.value) }))} /></label><label className="stacked-label">Deadline<input type="date" value={deliverableForm.dueDate} onChange={(e) => setDeliverableForm((c) => ({ ...c, dueDate: e.target.value }))} /></label></div><label className="project-check"><input type="checkbox" checked={deliverableForm.isDocument} onChange={(e) => setDeliverableForm((c) => ({ ...c, isDocument: e.target.checked }))} /><span><strong>Este entregável gera documento</strong><small>Quando aprovado, poderá ser publicado na Biblioteca de Documentos.</small></span></label><label className="project-check"><input type="checkbox" checked={deliverableForm.clientVisible} onChange={(e) => setDeliverableForm((c) => ({ ...c, clientVisible: e.target.checked }))} /><span><strong>Visível ao cliente</strong><small>O cliente acompanha prazo, contexto e status, sem poder reordenar.</small></span></label></div><div className="project-modal-footer"><button type="button" className="secondary" onClick={() => setOpenDeliverableModal(false)}>Cancelar</button><button className="primary" disabled={saving || !deliverableForm.title.trim()}>{saving ? 'Salvando…' : 'Adicionar entregável'}</button></div></form></div>}

      {selectedDeliverable && <div className="modal-backdrop full-screen-modal project-modal-backdrop"><section className="modal-card deliverable-detail-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => { setSelectedDeliverable(null); setShowAdjustment(false); }}><X size={20} /></button><div className="deliverable-detail-heading"><div className="deliverable-detail-icon">{selectedDeliverable.isDocument ? <FileText size={22} /> : <CheckCircle2 size={22} />}</div><div><span className="section-kicker">{selectedDeliverable.protocol}</span><h2>{selectedDeliverable.title}</h2><p>{selectedDeliverable.workstream} · {selectedDeliverable.complexity} · {roadmapLabel(selectedDeliverable)}</p></div><span className={`deliverable-status ${statusTone[selectedDeliverable.status]}`}>{deliverableLabels[selectedDeliverable.status]}</span></div><div className="deliverable-detail-body"><div className="deliverable-detail-facts"><article><CalendarDays size={17} /><span>Deadline</span><strong>{formatProjectDate(selectedDeliverable.dueAt)}</strong>{selectedDeliverable.originalDueAt && <small>Original: {formatProjectDate(selectedDeliverable.originalDueAt)}</small>}</article><article><Clock3 size={17} /><span>Horas</span><strong>{hoursLabel(selectedDeliverable.hours)}</strong><small>registradas</small></article><article><RefreshCw size={17} /><span>Ajustes</span><strong>{selectedDeliverable.adjustmentCount}/{selectedProject.adjustmentLimit}</strong><small>{selectedDeliverable.rebriefingRequired ? 'rebriefing necessário' : 'antes de rebriefing'}</small></article></div>{selectedDeliverable.clientDelayBusinessDays > 0 && <div className="deliverable-delay-note"><AlertTriangle size={18} /><div><strong>Resposta do cliente em atraso</strong><p>{selectedDeliverable.clientDelayBusinessDays} dia(s) útil(eis) de atraso. O cronograma posterior foi sinalizado para recálculo.</p></div></div>}<section className="deliverable-context"><strong>Complexidade</strong><p>{complexityMeta[selectedDeliverable.complexity].description} A complexidade não define sozinha a deadline.</p></section><section className="deliverable-task-preview"><div><strong>Subtarefas</strong><span>{selectedDeliverable.taskDone}/{selectedDeliverable.taskCount}</span></div><p>As subtarefas serão rastreadas com protocolo próprio, prazo e conclusão. O cliente visualiza somente as que forem marcadas como compartilháveis.</p></section>{showAdjustment && <section className="deliverable-adjustment-box"><strong>Registrar pedido de alteração</strong><p>Até o 3º pedido é ajuste. O 4º será classificado automaticamente como rebriefing.</p><textarea rows={3} value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Justificativa obrigatória do ajuste" /><label>Impacto estimado no prazo<input type="number" min={0} max={90} value={adjustmentImpact} onChange={(e) => setAdjustmentImpact(Number(e.target.value))} /><span>dias úteis</span></label><div><button className="secondary" onClick={() => setShowAdjustment(false)}>Cancelar</button><button className="primary" disabled={!adjustmentReason.trim()} onClick={() => void requestAdjustment()}>Registrar alteração</button></div></section>}</div><div className="deliverable-detail-footer"><button className="secondary"><MessageSquare size={15} />Conversa</button><button className="secondary"><History size={15} />Histórico</button>{selectedDeliverable.status !== 'approved' && <button className="secondary" onClick={() => setShowAdjustment(true)}><RefreshCw size={15} />Registrar ajuste</button>}{selectedDeliverable.status === 'not_started' && <button className="primary" onClick={() => void moveDeliverable(selectedDeliverable, 'in_progress')}>Iniciar</button>}{selectedDeliverable.status === 'in_progress' && <button className="primary" onClick={() => void moveDeliverable(selectedDeliverable, 'client_review')}><Send size={15} />Enviar ao cliente</button>}{selectedDeliverable.status === 'approved' && <span className="deliverable-locked"><ShieldCheck size={15} />Aprovado e protegido</span>}</div></section></div>}
    </Shell>
  );
}
