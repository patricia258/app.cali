import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Circle,
  FileCheck2, FileText, FolderKanban, GitBranch, History, Loader2,
  MessageCircle, RefreshCw, Send, Star, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { demoDeliverables } from '../../data/demo';
import {
  loadClientDeliveryReality,
  subscribeClientDeliveryReality,
  type ClientDeliveryItem,
  type ClientDeliveryReality,
  type ClientDeliveryStatus,
  type ClientDeliveryWorkstream,
  type ClientPublishedDocument,
} from '../../lib/clientDeliveryReality';
import {
  loadClientDeliverableConversation,
  sendClientDeliverableMessage,
  subscribeClientDeliverableConversation,
  type ClientDeliverableMessage,
} from '../../lib/clientDeliverableConversation';
import { supabase } from '../../lib/supabase';

type DetailTab = 'overview' | 'tasks' | 'conversation' | 'history';

const statusLabel: Record<ClientDeliveryStatus, string> = {
  not_started: 'Programada',
  in_progress: 'Em andamento',
  standby: 'Em espera',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando você',
  adjustment_requested: 'Ajuste em andamento',
  rebriefing: 'Em rebriefing',
  approved: 'Concluída',
  cancelled: 'Cancelada',
};

const statusTone: Record<ClientDeliveryStatus, string> = {
  not_started: 'status-neutral',
  in_progress: 'status-progress',
  standby: 'status-standby',
  internal_review: 'status-review',
  client_review: 'status-client',
  adjustment_requested: 'status-adjustment',
  rebriefing: 'status-rebriefing',
  approved: 'status-approved',
  cancelled: 'status-cancelled',
};

const taskStatusLabel: Record<string, string> = {
  todo: 'A fazer', in_progress: 'Em andamento', doing: 'Em andamento',
  done: 'Concluída', completed: 'Concluída', standby: 'Em espera', cancelled: 'Cancelada',
};

const complexityCopy: Record<string, string> = {
  MC1: 'Construção mais direta, com menor volume de análise e dependências.',
  MC2: 'Entrega com análise intermediária, validações e dependências moderadas.',
  MC3: 'Entrega de maior profundidade, com múltiplas dependências, análises e validações.',
};

function formatDate(value?: string | null) {
  if (!value) return 'A definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A definir';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

function roadmapLabel(item: ClientDeliveryItem) {
  const start = item.roadmapMonthStart;
  const end = item.roadmapMonthEnd;
  if (!start) return 'Sem mês';
  return !end || end === start ? `M${start}` : `M${start}–M${end}`;
}

function scoreReaction(score: number) {
  if (score <= 2) return { emoji: '😞', title: 'Poxa, que pena.', copy: 'Conte o que podemos melhorar nesta entrega.' };
  if (score === 3) return { emoji: '😐', title: 'Obrigada por me contar.', copy: 'O que poderia ter sido melhor nesta entrega?' };
  if (score === 4) return { emoji: '😊', title: 'Fico muito feliz por essa nota.', copy: 'Se quiser, deixe um comentário adicional.' };
  return { emoji: '🤩', title: 'Uau! Muito obrigada.', copy: 'Se quiser contar o que funcionou bem, vou adorar ler.' };
}

function previewReality(): ClientDeliveryReality {
  const deliverables: ClientDeliveryItem[] = demoDeliverables.map((item, index) => ({
    id: item.id,
    companyId: 'preview-aurora',
    projectId: 'preview-project',
    projectName: 'Estruturação People',
    projectStatus: 'active',
    projectPlanningStatus: 'active',
    protocol: item.code,
    code: item.code,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: 'normal',
    complexity: index % 3 === 0 ? 'MC1' : index % 3 === 1 ? 'MC2' : 'MC3',
    workstream: item.workstream,
    workstreamId: `preview-front-${item.workstream}`,
    roadmapMonthStart: Math.max(1, index + 1),
    roadmapMonthEnd: Math.max(1, index + 1),
    dueAt: new Date(Date.now() + (index + 2) * 86400000).toISOString(),
    originalDueAt: null,
    clientResponseDueAt: item.status === 'client_review' ? new Date(Date.now() + 2 * 86400000).toISOString() : null,
    startedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    approvalRequestedAt: item.status === 'client_review' ? new Date().toISOString() : null,
    clientResponseAt: null,
    approvedAt: item.status === 'approved' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
    adjustmentCount: 0,
    rebriefingRequired: false,
    isDocument: Boolean(item.isDocument),
    finalDriveUrl: null,
    visibleMinutes: null,
    visibleTasks: [],
    visibleTaskProgress: null,
    document: null,
    feedback: null,
    latestAdjustment: null,
    history: [],
  }));
  const grouped = Array.from(new Set(deliverables.map((item) => item.workstream || 'Frente CALI')));
  const workstreams: ClientDeliveryWorkstream[] = grouped.map((name, index) => ({
    id: `preview-front-${name}`,
    companyId: 'preview-aurora',
    projectId: 'preview-project',
    protocol: `CALI-FRT-PREVIEW-${String(index + 1).padStart(2, '0')}`,
    name,
    objective: 'Frente compartilhada do cronograma CALI.',
    monthStart: Math.min(...deliverables.filter((item) => item.workstream === name).map((item) => item.roadmapMonthStart || 1)),
    monthEnd: Math.max(...deliverables.filter((item) => item.workstream === name).map((item) => item.roadmapMonthEnd || item.roadmapMonthStart || 1)),
    status: 'active',
    sortOrder: index + 1,
  }));
  const visible = deliverables.filter((item) => item.status !== 'cancelled');
  const approved = visible.filter((item) => item.status === 'approved').length;
  return {
    company: { id: 'preview-aurora', displayName: 'Aurora Tech', monthlyHoursContracted: null, showHoursToClient: false },
    projects: [{ id: 'preview-project', name: 'Estruturação People', status: 'active' }],
    workstreams,
    deliverables,
    metrics: {
      total: visible.length,
      active: visible.filter((item) => item.status !== 'approved').length,
      waitingClient: visible.filter((item) => item.status === 'client_review').length,
      approved,
      cancelled: 0,
      overdue: 0,
      completionPct: visible.length ? Math.round((approved / visible.length) * 100) : 0,
      visibleMinutes: null,
      averageDeliveryScore: null,
      feedbackCount: 0,
    },
  };
}

function deriveFronts(reality: ClientDeliveryReality, projectId: string): ClientDeliveryWorkstream[] {
  const real = reality.workstreams.filter((front) => front.projectId === projectId && front.status !== 'cancelled');
  if (real.length) return real;
  const items = reality.deliverables.filter((item) => item.projectId === projectId && item.status !== 'cancelled');
  const names = Array.from(new Set(items.map((item) => item.workstream || 'Frente CALI')));
  return names.map((name, index) => {
    const related = items.filter((item) => (item.workstream || 'Frente CALI') === name);
    return {
      id: `derived-${projectId}-${index}`,
      companyId: reality.company.id,
      projectId,
      protocol: null,
      name,
      objective: null,
      monthStart: Math.min(...related.map((item) => item.roadmapMonthStart || 1)),
      monthEnd: Math.max(...related.map((item) => item.roadmapMonthEnd || item.roadmapMonthStart || 1)),
      status: 'active',
      sortOrder: index + 1,
    };
  });
}

export function ClientDeliverablesPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const previewData = useMemo(() => previewReality(), []);
  const refreshTimer = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const [companyId, setCompanyId] = useState(preview ? previewData.company.id : '');
  const [reality, setReality] = useState<ClientDeliveryReality | null>(preview ? previewData : null);
  const [projectId, setProjectId] = useState(preview ? previewData.projects[0]?.id || '' : '');
  const [selectedId, setSelectedId] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [messages, setMessages] = useState<ClientDeliverableMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [npsOpen, setNpsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => reality?.deliverables.find((item) => item.id === selectedId) || null, [reality?.deliverables, selectedId]);
  const project = useMemo(() => reality?.projects.find((item) => item.id === projectId) || reality?.projects[0] || null, [reality?.projects, projectId]);
  const projectDeliverables = useMemo(() => (reality?.deliverables || []).filter((item) => item.projectId === project?.id && item.status !== 'cancelled'), [reality?.deliverables, project?.id]);
  const fronts = useMemo(() => reality && project ? deriveFronts(reality, project.id) : [], [reality, project]);
  const maxMonth = useMemo(() => Math.max(8, ...fronts.map((front) => front.monthEnd || front.monthStart || 1), ...projectDeliverables.map((item) => item.roadmapMonthEnd || item.roadmapMonthStart || 1)), [fronts, projectDeliverables]);
  const months = useMemo(() => Array.from({ length: maxMonth }, (_, index) => index + 1), [maxMonth]);
  const npsCommentRequired = score > 0 && score <= 3;
  const reaction = score ? scoreReaction(score) : null;

  useEffect(() => {
    if (preview || !supabase) return;
    void bootstrap();
    return () => { if (refreshTimer.current) window.clearTimeout(refreshTimer.current); };
  }, []);

  useEffect(() => {
    if (preview || !companyId) return;
    return subscribeClientDeliveryReality(companyId, () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refreshReality(), 180);
    });
  }, [companyId, preview]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    if (preview) return;
    void loadConversation(selected.id);
    return subscribeClientDeliverableConversation(selected.id, () => void loadConversation(selected.id, false));
  }, [selected?.id, preview]);

  useEffect(() => {
    if (!conversationRef.current) return;
    conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages.length, detailTab]);

  useEffect(() => {
    const modalOpen = Boolean(selected) || adjustmentOpen || npsOpen;
    document.body.classList.toggle('workspace-modal-open', modalOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [selected, adjustmentOpen, npsOpen]);

  async function bootstrap() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');
      const profileResult = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      const nextCompanyId = profileResult.data?.company_id || '';
      if (!nextCompanyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');
      setCompanyId(nextCompanyId);
      applyReality(await loadClientDeliveryReality(nextCompanyId), true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os entregáveis.');
    } finally {
      setLoading(false);
    }
  }

  function applyReality(nextReality: ClientDeliveryReality, initial = false) {
    setReality(nextReality);
    setProjectId((current) => {
      if (!initial && nextReality.projects.some((item) => item.id === current)) return current;
      const withDeliverables = nextReality.projects.find((candidate) => nextReality.deliverables.some((item) => item.projectId === candidate.id && item.status !== 'cancelled'));
      return withDeliverables?.id || nextReality.projects[0]?.id || '';
    });
    setSelectedId((current) => nextReality.deliverables.some((item) => item.id === current) ? current : '');
  }

  async function refreshReality() {
    if (preview || !companyId) return;
    try {
      applyReality(await loadClientDeliveryReality(companyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar os dados.');
    }
  }

  async function loadConversation(deliverableId: string, showLoading = true) {
    if (preview) return;
    if (showLoading) setConversationLoading(true);
    try {
      setMessages(await loadClientDeliverableConversation(deliverableId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a conversa desta entrega.');
    } finally {
      if (showLoading) setConversationLoading(false);
    }
  }

  function openDeliverable(item: ClientDeliveryItem, tab: DetailTab = 'overview') {
    setSelectedId(item.id);
    setDetailTab(tab);
    setNotice('');
  }

  function closeDeliverable() {
    setSelectedId('');
    setDetailTab('overview');
    setMessageDraft('');
  }

  async function sendMessage() {
    if (!selected || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setSendingMessage(true);
    setError('');
    try {
      if (preview) {
        setMessages((current) => [...current, { id: `preview-${Date.now()}`, deliverableId: selected.id, body, sourceActor: 'client', createdAt: new Date().toISOString() }]);
      } else {
        await sendClientDeliverableMessage(selected.id, body);
        await loadConversation(selected.id, false);
      }
      setMessageDraft('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSendingMessage(false);
    }
  }

  async function submitAdjustment() {
    if (!selected || adjustmentText.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      if (preview || !supabase) {
        setAdjustmentOpen(false);
        setAdjustmentText('');
        setNotice('Seu pedido de ajuste foi registrado.');
        return;
      }
      const result = await supabase.rpc('request_deliverable_adjustment', { p_deliverable_id: selected.id, p_reason: adjustmentText.trim(), p_impact_business_days: 0 });
      if (result.error) throw result.error;
      setNotice('Seu pedido de ajuste foi registrado e já está com a CALI.');
      setAdjustmentOpen(false);
      setAdjustmentText('');
      await refreshReality();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível registrar o ajuste.');
    } finally {
      setSaving(false);
    }
  }

  async function submitNps() {
    if (!selected || score === 0 || (npsCommentRequired && npsComment.trim().length < 3)) return;
    setSaving(true);
    setError('');
    try {
      if (preview || !supabase) {
        setNpsOpen(false);
        setNotice('Entrega aprovada. Sua avaliação também foi registrada.');
        return;
      }
      const result = await supabase.rpc('client_approve_deliverable_with_feedback', { p_deliverable_id: selected.id, p_score: score, p_comment: npsComment.trim() || null });
      if (result.error) throw result.error;
      setNpsOpen(false);
      setNotice('Entrega aprovada. Sua avaliação foi registrada.');
      setScore(0);
      setNpsComment('');
      await refreshReality();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir a aprovação.');
    } finally {
      setSaving(false);
    }
  }

  async function openPublishedDocument(document: ClientPublishedDocument) {
    if (preview || !supabase) return;
    if (document.storagePath) {
      const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(document.storagePath, 300);
      if (signedError || !data?.signedUrl) { setError(signedError?.message || 'Não foi possível abrir o documento.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  return <Shell role="client">
    <section className="page client-roadmap-page-v33">
      <header className="client-roadmap-heading-v33">
        <div>
          <span className="eyebrow">CRONOGRAMA COMPARTILHADO</span>
          <h1>Entregáveis</h1>
          <p>Acompanhe as frentes do trabalho, os entregáveis de cada etapa e abra cada item para ver somente o que é relevante para você.</p>
        </div>
        {reality && reality.projects.length > 1 && <label className="client-project-picker-v33"><span>Projeto</span><select value={project?.id || ''} onChange={(event) => { setProjectId(event.target.value); closeDeliverable(); }}>{reality.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}
      {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando cronograma…</div>}

      {!loading && reality && project && <section className="roadmap-v2 panel client-roadmap-table-v33">
        <header>
          <div><span className="section-kicker">SEQUÊNCIA DE IMPLANTAÇÃO</span><h2>Frentes do cronograma</h2><p>M1, M2, M3… representam meses. MC1, MC2 e MC3 representam complexidade do material, não prazo.</p></div>
          <div className="mc-legend"><span>MC1</span><span>MC2</span><span>MC3</span></div>
        </header>
        <div className="roadmap-months-v2"><span>Frente / entregáveis</span>{months.map((month) => <b key={month}>M{month}</b>)}</div>
        <div className="front-list-v2">
          {fronts.length ? fronts.map((front, index) => {
            const items = projectDeliverables.filter((item) => item.workstreamId === front.id || item.workstream === front.name);
            return <section className="front-section-v2" key={front.id}>
              <div className="front-header-v2 client-front-header-v33">
                <img src={index % 2 ? '/brand/cali-lime-mark.svg' : '/brand/cali-oak-mark.svg'} alt="" />
                <div className="front-copy-v2"><span>{front.protocol || project.protocol || 'FRENTE CALI'}</span><strong>{front.name}</strong><p>{front.objective || 'Frente compartilhada do cronograma CALI.'}</p></div>
                <div className="front-monthbar-v2" style={{ '--months': months.length } as any}>{months.map((month) => <i key={month} />)}<b style={{ gridColumn: `${front.monthStart || 1} / ${Math.min(months.length + 1, (front.monthEnd || front.monthStart || 1) + 1)}` }}>M{front.monthStart || 1}{front.monthEnd && front.monthEnd !== front.monthStart ? `–M${front.monthEnd}` : ''}</b></div>
                <span className="client-front-count-v33">{items.length} {items.length === 1 ? 'entregável' : 'entregáveis'}</span>
              </div>
              <div className="front-deliverables-v2 front-deliverables-v3">
                {items.length ? items.map((item) => <div className="front-deliverable-row-v3 client-front-deliverable-row-v33" key={item.id}>
                  <button className="front-deliverable-open-v3" onClick={() => openDeliverable(item)}>
                    {item.isDocument ? <FileText size={18} /> : <FolderKanban size={18} />}
                    <span><small>{item.protocol || item.code || 'ENTREGÁVEL'}</small><strong>{item.title}</strong></span>
                    <b className={`mc-chip ${(item.complexity || 'MC1').toLowerCase()}`}>{item.complexity || 'MC1'}</b>
                  </button>
                  <span className={`client-readonly-status-v33 ${statusTone[item.status]}`}><i />{statusLabel[item.status]}</span>
                  <time>{formatDate(item.dueAt)}</time>
                  <button className="row-arrow-v3" onClick={() => openDeliverable(item)} aria-label={`Abrir ${item.title}`}><ArrowRight size={17} /></button>
                </div>) : <div className="front-empty-v2">Nenhum entregável compartilhado nesta frente ainda.</div>}
              </div>
            </section>;
          }) : <div className="front-empty-v2">O cronograma ainda não possui frentes compartilhadas.</div>}
        </div>
      </section>}
    </section>

    {selected && <div className="modal-backdrop full-screen-modal">
      <section className="modal-card deliverable-workspace-modal-v2 client-deliverable-workspace-v33">
        <header className="deliverable-workspace-header-v2">
          <div className="deliverable-big-icon">{selected.isDocument ? <FileText size={25} /> : <FolderKanban size={25} />}</div>
          <div className="deliverable-title-v2"><span className="section-kicker">{selected.protocol || selected.code || 'ENTREGÁVEL'}</span><h2>{selected.title}</h2><p>{selected.workstream || 'Frente CALI'} · {selected.complexity || 'MC1'} · {roadmapLabel(selected)}</p></div>
          <div className="deliverable-head-actions-v2"><span className={`status-chip-v3 ${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span><button className="modal-close-static" onClick={closeDeliverable}><X size={23} /></button></div>
        </header>

        <nav className="deliverable-tabs-v2">{(['overview', 'tasks', 'conversation', 'history'] as DetailTab[]).map((tab) => <button key={tab} className={detailTab === tab ? 'active' : ''} onClick={() => setDetailTab(tab)}>{tab === 'overview' ? 'Visão geral' : tab === 'tasks' ? `Etapas (${selected.visibleTasks.length})` : tab === 'conversation' ? `Conversa (${messages.length})` : 'Histórico'}</button>)}</nav>

        <div className="deliverable-workspace-scroll-v2">
          {detailTab === 'overview' && <>
            <div className="deliverable-summary-lines-v2 client-summary-lines-v33">
              <div><CalendarDays size={19} /><span>Deadline</span><strong>{formatDate(selected.dueAt)}</strong>{selected.originalDueAt && <small>Original: {formatDate(selected.originalDueAt)}</small>}</div>
              <div><RefreshCw size={19} /><span>Atualizado</span><strong>{formatDateTime(selected.updatedAt)}</strong><small>{statusLabel[selected.status]}</small></div>
              <div><CheckCircle2 size={19} /><span>Etapas</span><strong>{selected.visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)).length}/{selected.visibleTasks.length}</strong><small>compartilhadas</small></div>
              <div><GitBranch size={19} /><span>Frente</span><strong>{selected.workstream || 'Frente CALI'}</strong><small>{roadmapLabel(selected)}</small></div>
            </div>

            {selected.status === 'client_review' && <div className="deliverable-warning-v2 client-action-warning-v33"><AlertTriangle size={18} /><div><strong>Sua validação é necessária</strong><p>{selected.clientResponseDueAt ? `Revise esta entrega e responda até ${formatDateTime(selected.clientResponseDueAt)}.` : 'Revise esta entrega e escolha entre aprovar ou solicitar ajuste.'}</p></div></div>}
            {selected.status === 'adjustment_requested' && <div className="deliverable-warning-v2 client-adjustment-note-v33"><RefreshCw size={18} /><div><strong>Seu ajuste está com a CALI</strong><p>{selected.latestAdjustment?.reason || 'A nova versão voltará para sua validação assim que estiver pronta.'}</p></div></div>}

            <section className="deliverable-description-v2 client-description-v33">
              <div><strong>Sobre esta entrega</strong><span className={`mc-chip ${(selected.complexity || 'MC1').toLowerCase()}`}>{selected.complexity || 'MC1'}</span></div>
              <p>{complexityCopy[selected.complexity || 'MC1'] || 'Complexidade definida pela CALI conforme volume de análise e dependências.'}</p>
              {selected.description && <p>{selected.description}</p>}
            </section>

            {selected.isDocument && <section className="client-file-strip-v33"><FileText size={20} /><div><span>ARQUIVO DA ENTREGA</span><strong>{selected.document ? selected.document.title : 'Ainda não publicado'}</strong><p>{selected.document ? `Publicado em ${formatDateTime(selected.document.publishedAt)}.` : 'Quando a versão compartilhável estiver pronta, ela aparecerá aqui e também na Biblioteca.'}</p></div>{selected.document && <button className="secondary" onClick={() => void openPublishedDocument(selected.document!)}>Abrir</button>}</section>}

            {selected.feedback && <section className="client-feedback-strip-v33"><span>{scoreReaction(selected.feedback.score).emoji}</span><div><small>SUA AVALIAÇÃO</small><strong>{selected.feedback.score}/5</strong><p>{selected.feedback.comment || 'Sem comentário adicional.'}</p></div></section>}
          </>}

          {detailTab === 'tasks' && <section className="tasks-pane-v2 client-tasks-pane-v33">
            <header><div><strong>Etapas compartilhadas</strong><p>Aqui aparecem somente as etapas que a CALI definiu como visíveis para você.</p></div></header>
            <div className="client-task-columns-v33"><span>Etapa</span><span>Status</span><span>Prazo</span></div>
            <div className="client-task-list-v33">{selected.visibleTasks.length ? selected.visibleTasks.map((task) => <article key={task.id} className={['done', 'completed'].includes(task.status) ? 'done' : ''}><span className="client-task-check-v33">{['done', 'completed'].includes(task.status) ? <Check size={15} /> : <Circle size={12} />}</span><div><small>{task.protocol || 'ETAPA'}</small><strong>{task.title}</strong></div><span>{taskStatusLabel[task.status] || task.status}</span><time>{formatDate(task.dueAt)}</time></article>) : <div className="empty-inline-v2">Nenhuma etapa foi compartilhada para esta entrega.</div>}</div>
          </section>}

          {detailTab === 'conversation' && <section className="conversation-pane-v2 client-conversation-pane-v33">
            <header><div className="client-conversation-title-v33"><MessageCircle size={18} /><div><strong>Conversa desta entrega</strong><p>Tudo o que você enviar aqui fica vinculado a {selected.protocol || selected.title}.</p></div></div></header>
            <div className="conversation-list-v2 client-conversation-list-v33" ref={conversationRef}>
              {conversationLoading ? <div className="empty-inline-v2"><Loader2 className="spin" size={17} />Carregando conversa…</div> : messages.length ? messages.map((message) => <article key={message.id} className={message.sourceActor === 'client' ? 'client-message' : 'cali-message'}><span className="conversation-avatar-v2">{message.sourceActor === 'client' ? 'VC' : 'CA'}</span><div><header><strong>{message.sourceActor === 'client' ? 'Você' : message.sourceActor === 'system' ? 'CALI Workspace' : 'CALI'}</strong><time>{formatDateTime(message.createdAt)}</time></header><p>{message.body}</p></div></article>) : <div className="empty-inline-v2">Ainda não há mensagens nesta entrega.</div>}
            </div>
            <div className="conversation-composer-v2"><textarea rows={3} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Escreva uma mensagem sobre esta entrega…" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void sendMessage(); }} /><div><button className="primary" onClick={() => void sendMessage()} disabled={sendingMessage || !messageDraft.trim()}>{sendingMessage ? <Loader2 className="spin" size={16} /> : <Send size={16} />}Enviar</button></div></div>
          </section>}

          {detailTab === 'history' && <section className="deliverable-history-v2"><header><History size={20} /><div><strong>Histórico do entregável</strong><p>As mudanças relevantes desta entrega ficam preservadas aqui.</p></div></header>{selected.history.length ? selected.history.map((item) => <article key={item.id}><i /><div><strong>{statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}</strong><p>{item.fromStatus ? `${statusLabel[item.fromStatus as ClientDeliveryStatus] || item.fromStatus} → ${statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}` : 'Status registrado.'}</p><small>{formatDateTime(item.createdAt)}</small></div></article>) : <div className="empty-inline-v2">Ainda não há movimentações registradas.</div>}</section>}
        </div>

        <footer className="deliverable-actions-v2 client-deliverable-actions-v33">
          <div className="deliverable-actions-left-v2"><span className={`client-footer-status-v33 ${statusTone[selected.status]}`}><i />{statusLabel[selected.status]}</span></div>
          <div className="deliverable-actions-right-v2">
            {selected.status === 'client_review' && <><button className="secondary" onClick={() => { setAdjustmentText(''); setAdjustmentOpen(true); }}><RefreshCw size={16} />Solicitar ajuste</button><button className="primary" onClick={() => { setScore(0); setNpsComment(''); setNpsOpen(true); }}><FileCheck2 size={16} />Aprovar entrega</button></>}
            {selected.status !== 'client_review' && <button className="secondary" onClick={() => setDetailTab('conversation')}><MessageCircle size={16} />Conversar sobre esta entrega</button>}
          </div>
        </footer>
      </section>
    </div>}

    {adjustmentOpen && selected && <div className="modal-backdrop workspace-modal-backdrop"><section className="modal-card client-delivery-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setAdjustmentOpen(false)}><X size={20} /></button><span className="section-kicker">SOLICITAR AJUSTE</span><h2>O que precisa ser revisto?</h2><p>Descreva o ponto que precisa mudar. O pedido fica vinculado a <strong>{selected.protocol || selected.title}</strong>.</p><textarea value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar este indicador por unidade antes da validação final." rows={5} autoFocus /><div className="modal-actions"><button className="secondary" onClick={() => setAdjustmentOpen(false)}>Cancelar</button><button className="primary" disabled={saving || adjustmentText.trim().length < 3} onClick={() => void submitAdjustment()}>{saving ? 'Registrando…' : 'Enviar ajuste'}</button></div></section></div>}

    {npsOpen && selected && <div className="modal-backdrop workspace-modal-backdrop"><section className="modal-card client-delivery-modal client-delivery-rating-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setNpsOpen(false)}><X size={20} /></button><span className="section-kicker">APROVAÇÃO DA ENTREGA</span><h2>Como foi esta entrega?</h2><p>Escolha sua nota, revise e só depois confirme.</p><div className="client-delivery-rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={score === value ? 'selected' : ''} onClick={() => setScore(value)}><Star size={21} fill={score === value ? 'currentColor' : 'none'} /><span>{value}</span></button>)}</div>{reaction && <div className={`client-delivery-score-reaction score-${score}`}><span>{reaction.emoji}</span><div><strong>{reaction.title}</strong><p>{reaction.copy}</p></div></div>}{score > 0 && <label className="stacked-label">{npsCommentRequired ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?'}<textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} placeholder={npsCommentRequired ? 'Sua justificativa ajuda a CALI a entender exatamente o que precisa melhorar.' : 'Opcional — deixe um comentário se quiser.'} /></label>}<button className="primary full" disabled={saving || score === 0 || (npsCommentRequired && npsComment.trim().length < 3)} onClick={() => void submitNps()}>{saving ? 'Confirmando…' : 'Confirmar aprovação e avaliação'}</button></section></div>}
  </Shell>;
}
