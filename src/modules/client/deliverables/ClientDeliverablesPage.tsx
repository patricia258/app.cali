import { CompactPageHeading } from '../../../components/workspace/components/CompactPageHeading';
import { WorkflowDialogOverlay, WorkflowDialog } from '../../../components/ds/WorkflowDialog';
import { DeliveryDetailDialog } from '../../../components/projects/DeliveryDetailDialog';
import { DeliveryDetailHeader } from '../../../components/projects/DeliveryDetailHeader';
import { DeliveryDetailTabs } from '../../../components/projects/DeliveryDetailTabs';
import { DeliverySummary } from '../../../components/projects/DeliverySummary';
import { DeliveryNotice } from '../../../components/projects/DeliveryNotice';
import { DeliveryActionButton } from '../../../components/projects/DeliveryActionButton';
import { ClientDeliveryFile } from './components/ClientDeliveryFile';
import { ProjectComplexityCard } from '../../../components/projects/ProjectComplexityCard';
import { ProjectSectionTabs } from '../../../components/projects/ProjectSectionTabs';
import { DeliveryHistory } from '../../../components/projects/DeliveryHistory';
import { ClientDeliverySteps } from './components/ClientDeliverySteps';
import { DeliverySchedule } from '../../../components/projects/DeliverySchedule';
import { ClientDeliveryFront } from './components/ClientDeliveryFront';
import { ClientDeliveryRow } from './components/ClientDeliveryRow';
import { EmptyState } from '../../../components/ds/EmptyState';
import { Button } from '../../../components/ds/Button';
import { FieldLabel } from '../../../components/ds/FieldLabel';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClientSubtaskModal } from './components/ClientSubtaskModal';
import { ClientProjectLifecycleBanner } from './components/ClientProjectLifecycleBanner';
import { ClientScheduleReviewPanel } from './components/ClientScheduleReviewPanel';
import { DeliverableDependencies } from '../../../components/projects/DeliverableDependencies';
import { complexityClientNote, validDeliverableFeedback } from '../../../domain/projects';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileCheck2, FileText, Leaf, MessageCircle, RefreshCw, Star, X } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import {
  loadClientDeliveryReality, approveClientDeliveryReview, readClientDeliveryCompany, requestClientDeliveryAdjustment,
  subscribeClientDeliveryReality,
  type ClientDeliveryItem,
  type ClientVisibleTask,
  type ClientDeliveryReality,
  type ClientDeliveryStatus,
  type ClientDeliveryWorkstream,
  type ClientPublishedDocument,
} from '../../../api/projects/client-delivery';
import { DeliverableConversation } from '../../../components/projects/conversation/DeliverableConversation';
import { isSupabaseConfigured } from '../../../api/access/session';

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


function historyStatusLabel(status: string) {
  return statusLabel[status as ClientDeliveryStatus] || status;
}

function historyTone(status: string) {
  if (status === 'approved') return 'approved';
  if (status === 'client_review' || status === 'adjustment_requested') return 'review';
  return 'neutral';
}

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
  const refreshTimer = useRef<number | null>(null);
  const detailActionTrigger = useRef<HTMLButtonElement | null>(null);
  const reviewTarget = useRef<{ id: string; revision: number; requestedAt: string | null } | null>(null);

  const [companyId, setCompanyId] = useState('');
  const [reality, setReality] = useState<ClientDeliveryReality | null>(null);
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [projectTab, setProjectTab] = useState<'timeline' | 'deliverables' | 'history'>('timeline');
  const [closedSubs, setClosedSubs] = useState<Record<string, boolean>>({});
  const [openSub, setOpenSub] = useState<{ task: ClientVisibleTask; item: ClientDeliveryItem } | null>(null);
  const [expandedFronts, setExpandedFronts] = useState<Record<string, boolean>>({});
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [npsOpen, setNpsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [reviewError, setReviewError] = useState<{ message: string; stale: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => reality?.deliverables.find((item) => item.id === selectedId) || null, [reality?.deliverables, selectedId]);
  const project = useMemo(() => reality?.projects.find((item) => item.id === projectId) || reality?.projects[0] || null, [reality?.projects, projectId]);
  const projectDeliverables = useMemo(() => (reality?.deliverables || []).filter((item) => item.projectId === project?.id && item.status !== 'cancelled'), [reality?.deliverables, project?.id]);
  const waitingDelivery = projectDeliverables.find((item) => item.status === 'client_review');
  const fronts = useMemo(() => reality && project ? deriveFronts(reality, project.id) : [], [reality, project]);
  const maxMonth = useMemo(() => Math.max(8, ...fronts.map((front) => front.monthEnd || front.monthStart || 1), ...projectDeliverables.map((item) => item.roadmapMonthEnd || item.roadmapMonthStart || 1)), [fronts, projectDeliverables]);
  const months = useMemo(() => Array.from({ length: maxMonth }, (_, index) => index + 1), [maxMonth]);
  const npsCommentRequired = score > 0 && score <= 3;
  const feedbackValid = validDeliverableFeedback(score, npsComment);
  const reaction = score ? scoreReaction(score) : null;
  const detailActionOpen = adjustmentOpen || npsOpen;
  const reviewErrorNotice = reviewError && <>
    <InlineNotice role="alert"><AlertTriangle size={18} aria-hidden="true" />{reviewError.message}</InlineNotice>
    {reviewError.stale && <Button type="button" variant="secondary" disabled={saving} onClick={() => void refreshStaleReview()}>Atualizar dados</Button>}
  </>;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void bootstrap();
    return () => { if (refreshTimer.current) window.clearTimeout(refreshTimer.current); };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    return subscribeClientDeliveryReality(companyId, () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refreshReality(), 180);
    });
  }, [companyId]);

  useEffect(() => {
    document.body.classList.toggle('workspace-modal-open', Boolean(selected));
    return () => document.body.classList.remove('workspace-modal-open');
  }, [selected]);

  useEffect(() => {
    if (detailActionOpen) return;
    detailActionTrigger.current?.focus();
    detailActionTrigger.current = null;
  }, [detailActionOpen]);

  async function bootstrap() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError('');
    try {
      const nextCompanyId = await readClientDeliveryCompany();
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
    const targetId = new URLSearchParams(window.location.search).get('deliverable');
    const targetProjectId = new URLSearchParams(window.location.search).get('project');
    if (targetProjectId && nextReality.projects.some((item) => item.id === targetProjectId)) {
      setProjectId(targetProjectId);
    }
    if (targetId) {
      const target = nextReality.deliverables.find((item) => item.id === targetId);
      if (target) { setSelectedId(target.id); setDetailTab('conversation'); }
    }
  }

  async function refreshReality() {
    if (!companyId) return false;
    try {
      applyReality(await loadClientDeliveryReality(companyId));
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar os dados.');
      return false;
    }
  }

  async function refreshStaleReview() {
    const target = reviewTarget.current;
    setSaving(true);
    try {
      const refreshed = await refreshReality();
      if (reviewTarget.current !== target) return;
      if (!refreshed) {
        setReviewError({ message: 'Não foi possível atualizar os dados. Tente novamente.', stale: true });
        return;
      }
      reviewTarget.current = null;
      setReviewError(null);
      setAdjustmentOpen(false);
      setNpsOpen(false);
      setAdjustmentText('');
      setScore(0);
      setNpsComment('');
    } finally {
      setSaving(false);
    }
  }

  function openDeliverable(item: ClientDeliveryItem, tab: DetailTab = 'overview') {
    setAdjustmentOpen(false);
    setNpsOpen(false);
    reviewTarget.current = null;
    setSelectedId(item.id);
    setDetailTab(tab);
    setNotice('');
  }

  function closeDeliverable() {
    setAdjustmentOpen(false);
    setNpsOpen(false);
    reviewTarget.current = null;
    setSelectedId('');
    setDetailTab('overview');
  }

  async function submitAdjustment() {
    const target = reviewTarget.current;
    if (!target || target.id !== selected?.id || adjustmentText.trim().length < 3) return;
    setSaving(true);
    setReviewError(null);
    try {
      if (!isSupabaseConfigured) throw new Error('Serviço indisponível. Tente novamente em instantes.');
      const result = await requestClientDeliveryAdjustment(target, adjustmentText.trim());
      if (result.error) {
        setReviewError({ message: result.error.message, stale: result.error.code === '40001' });
        return;
      }
      setNotice('Seu pedido de ajuste foi registrado e já está com a CALI.');
      setAdjustmentOpen(false);
      setAdjustmentText('');
      await refreshReality();
    } catch (requestError) {
      setReviewError({ message: requestError instanceof Error ? requestError.message : 'Não foi possível registrar o ajuste.', stale: false });
    } finally {
      setSaving(false);
    }
  }

  async function submitNps() {
    const target = reviewTarget.current;
    if (!target || target.id !== selected?.id || !feedbackValid) return;
    setSaving(true);
    setReviewError(null);
    try {
      if (!isSupabaseConfigured) throw new Error('Serviço indisponível. Tente novamente em instantes.');
      const result = await approveClientDeliveryReview(target, score, npsComment.trim() || null);
      if (result.error) {
        setReviewError({ message: result.error.message, stale: result.error.code === '40001' });
        return;
      }
      setNpsOpen(false);
      setNotice(result.data?.already_approved ? 'Esta revisão já foi aprovada.' : 'Entrega aprovada. Sua avaliação foi registrada.');
      setScore(0);
      setNpsComment('');
      await refreshReality();
    } catch (requestError) {
      setReviewError({ message: requestError instanceof Error ? requestError.message : 'Não foi possível concluir a aprovação.', stale: false });
    } finally {
      setSaving(false);
    }
  }

  async function openPublishedDocument(document: ClientPublishedDocument) {
    if (!isSupabaseConfigured) return;
    if (document.storagePath) {
      try {
        await openPrivateWorkspaceFile(document.storagePath);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Não foi possível abrir o documento.');
      }
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando cronograma…</section></Shell>;

  return <Shell role="client">
    <section className="v2-client-module">
      <div>
        <CompactPageHeading eyebrow="ÁREA DA EMPRESA / EXECUÇÃO" title="Projetos" description="Execução, planejamento e acompanhamento da assessoria em um só lugar." />
        {reality && <ClientProjectLifecycleBanner companyId={reality.company.id} projectId={project?.id ?? null} />}
        {reality && project && <div className="tw:mt-[1.31rem] tw:mb-[1.08rem] tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-[.92rem] tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem] tw:text-[#8b7f77]">
          <label className="tw:inline-flex tw:min-w-0 tw:max-w-full tw:items-center tw:gap-[.615rem] tw:text-[#3e3533]">
            <strong className="tw:shrink-0">Projeto · </strong>
            <select aria-label="Projeto" value={project.id}
              className="tw:min-w-0 tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-[.69rem] tw:py-[.538rem] tw:text-[.85rem] tw:font-semibold tw:text-cali-ink"
              onChange={(event) => { setProjectId(event.target.value); closeDeliverable(); }}>
              {reality.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <span className="tw:text-[.77rem] tw:text-[#9a8273]">{project.protocol || reality.company.displayName}</span>
        </div>}
        {notice && <InlineNotice tone="success"><CheckCircle2 size={18} />{notice}</InlineNotice>}
        {error && <InlineNotice><AlertTriangle size={18} />{error}</InlineNotice>}
        {reality && project && <ClientScheduleReviewPanel key={project.id} companyId={reality.company.id} project={project} refreshProject={refreshReality} />}
        {reality && !project && <section className="tw:mt-2 tw:grid tw:gap-1.5 tw:rounded-2xl tw:border tw:border-dashed tw:border-cali-line tw:bg-cali-surface tw:p-6 tw:text-center">
          <span className="tw:text-[.6875rem] tw:font-black tw:tracking-widest tw:text-cali-accent">NENHUM CRONOGRAMA COMPARTILHADO</span>
          <h2 className="tw:m-0 tw:text-lg tw:font-bold">Não há projeto aguardando sua validação agora.</h2>
          <p className="tw:m-0 tw:mx-auto tw:max-w-[42.5rem] tw:text-xs tw:leading-relaxed tw:text-cali-muted">Rascunhos internos da CALI não aparecem nesta área. Quando um cronograma estiver pronto para sua revisão, ele será disponibilizado aqui e você receberá uma notificação.</p>
        </section>}
        {reality && project && <div>
          <ProjectSectionTabs label="Seções do projeto" tabs={[[ 'timeline', 'Cronograma' ], [ 'deliverables', 'Entregáveis' ], [ 'history', 'Histórico' ]]} value={projectTab} onChange={setProjectTab} />
          {waitingDelivery && <DeliveryNotice icon={<AlertCircle size={16} />} title="Há uma validação aguardando você"
              className="tw:mb-[1.23rem]" action={<DeliveryActionButton tone="primary" className="tw:min-h-0! tw:gap-[0.462rem]! tw:px-[0.923rem]! tw:py-[0.769rem]! tw:text-[0.769rem]! tw:font-semibold! tw:whitespace-nowrap" onClick={() => openDeliverable(waitingDelivery)}>Abrir entrega <ArrowRight size={13} /></DeliveryActionButton>}>
              {waitingDelivery.title} · sua análise define se seguimos para publicação ou para uma nova versão.
            </DeliveryNotice>}
          {projectTab === 'timeline' && <DeliverySchedule items={projectDeliverables} labels={statusLabel} onOpen={openDeliverable} empty={<p className="tw:p-[1.85rem] tw:text-center tw:text-[#999]">Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.</p>} />}
          {projectTab === 'history' && <section className="tw:min-w-0 tw:overflow-hidden tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:p-[1.77rem]">
            <DeliveryHistory
              title="Histórico do projeto"
              description="Mudanças de situação das entregas compartilhadas, da mais recente para a mais antiga."
              emptyMessage="Ainda não há movimentações registradas neste projeto."
              entries={projectDeliverables.flatMap((item) => item.history.map((entry) => ({ ...entry, title: item.title })))
                .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
                .map((entry) => ({
                  id: entry.id,
                  title: entry.title,
                  date: formatDateTime(entry.createdAt),
                  description: entry.fromStatus
                    ? `${historyStatusLabel(entry.fromStatus)} → ${historyStatusLabel(entry.toStatus)}`
                    : historyStatusLabel(entry.toStatus),
                  tone: historyTone(entry.toStatus),
                }))}
            />
          </section>}
          {projectTab === 'deliverables' && <section>
            <header className="tw:mb-[1.54rem]">
              <small className="tw:text-[.77rem] tw:tracking-[.092rem] tw:text-[#af8f72]">ÁREA DA EMPRESA / PROJETOS</small>
              <h1 className="tw:my-[.462rem] tw:text-[2.154rem]">Entregáveis</h1>
              <p className="tw:text-[.923rem] tw:text-[#93857e]">Frentes contratadas, cronograma, arquivos e decisões em um só fluxo.</p>
            </header>
            <div className="tw:grid tw:gap-[1.08rem]">
              {fronts.length ? fronts.map((front, index) => {
                const items = projectDeliverables.filter((item) => item.workstreamId === front.id || item.workstream === front.name);
                const expanded = expandedFronts[front.id] !== false;
                return <ClientDeliveryFront key={front.id} front={front} protocol={project.protocol}
                  months={months} count={items.length} expanded={expanded} useLimeMark={index % 2 !== 0}
                  onToggle={() => setExpandedFronts((current) => ({ ...current, [front.id]: !expanded }))}>
                  {expanded && items.map((item) => <ClientDeliveryRow key={item.id} item={item}
                    statusLabel={statusLabel[item.status]} subtasksExpanded={!closedSubs[item.id]}
                    formatDate={formatDate} onOpen={() => openDeliverable(item)}
                    onToggleSubtasks={() => setClosedSubs((current) => ({ ...current, [item.id]: !current[item.id] }))}
                    onOpenSubtask={(task) => setOpenSub({ task, item })}
                  />)}
                </ClientDeliveryFront>;
              }) : <EmptyState as="p" variant="workflow">O cronograma ainda não possui frentes compartilhadas.</EmptyState>}
            </div>
          </section>}
        </div>}
      </div>
    </section>

    {selected && <DeliveryDetailDialog title={selected.title} hidden={detailActionOpen}>
        <DeliveryDetailHeader
          title={selected.title}
          code={selected.protocol || selected.code || 'ENTREGÁVEL'}
          complexity={selected.complexity || 'MC1'}
          description={`${selected.workstream || 'Frente CALI'} · ${roadmapLabel(selected)}`}
        >
          <Button type="button" variant="inlineClose" className="tw:grid tw:cursor-pointer tw:place-items-center tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#ecded5] tw:bg-white tw:p-[.615rem]" aria-label="Fechar entrega" onClick={closeDeliverable}><X size={18} /></Button>
        </DeliveryDetailHeader>
        <DeliveryDetailTabs<DetailTab> tabs={['overview', 'conversation', 'history']} selected={detailTab} onChange={setDetailTab}
          label={(tab) => tab === 'overview' ? 'Visão geral' : tab === 'conversation' ? 'Conversas' : 'Histórico'} />

        <DeliverableConversation
          key={selected.id} role="client" companyId={companyId} deliverableId={selected.id} active={detailTab === 'conversation'}
        />
        {detailTab !== 'conversation' && <div className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-[2.077rem] tw:py-[1.538rem] tw:[scrollbar-width:none]">
          {detailTab === 'overview' && <>
            <DeliverySummary items={[
              { icon: <Clock3 size={14} />, label: 'Prazo', value: formatDate(selected.dueAt) },
              { icon: <CheckCircle2 size={14} />, label: 'Situação', value: statusLabel[selected.status] },
              { icon: <FileText size={14} />, label: 'Versão', value: selected.document?.versionLabel || '—' },
              { icon: <Leaf size={14} />, label: 'Frente de atuação', value: selected.workstream || 'Frente CALI' },
            ]} />
            <div className="tw:pt-[.308rem] tw:pb-[.923rem] tw:[&_p]:m-0 tw:[&_p]:text-[.923rem]/[1.65] tw:[&_p]:text-[#766b64]">
              <h3 className="tw:mt-0 tw:mb-[.769rem] tw:text-[1.077rem]">Sobre esta entrega</h3>
              {selected.description && <p>{selected.description}</p>}
              <ProjectComplexityCard code={selected.complexity || 'MC1'} />
              <p className="tw:mt-[.615rem]! tw:text-[.808rem]/[1.45]! tw:italic tw:text-[#9a8d85]!"><span aria-hidden="true">* </span>{complexityClientNote}</p>
              {selected.originalDueAt && selected.originalDueAt !== selected.dueAt && <p>Prazo original: {formatDate(selected.originalDueAt)}.</p>}
            </div>
            <DeliverableDependencies deliverableId={selected.id} companyId="" title={selected.title} dueAt={selected.dueAt || null} mode="client" />
            {selected.isDocument && <ClientDeliveryFile
              icon={<FileText size={20} />}
              title={selected.document?.title || 'Arquivo ainda não publicado'}
              description={selected.document
                ? `${selected.document.versionLabel ? `Versão ${selected.document.versionLabel} · ` : ''}publicado em ${formatDateTime(selected.document.publishedAt)}`
                : 'Quando a versão compartilhável estiver pronta, ela aparecerá aqui e em Documentos.'}
              action={selected.document
                ? <DeliveryActionButton tone="primary" onClick={() => void openPublishedDocument(selected.document!)}>Abrir</DeliveryActionButton>
                : <span className="tw:rounded-[.538rem] tw:bg-[#fff1d8] tw:px-[.769rem] tw:py-[.615rem] tw:text-[.769rem] tw:whitespace-nowrap tw:text-[#875c21] tw:max-[34.375rem]:hidden">{statusLabel[selected.status]}</span>}
            />}
            {selected.feedback && <ClientDeliveryFile icon={<Star size={20} />} title={`Sua avaliação: ${selected.feedback.score}/5`} description={selected.feedback.comment || 'Sem comentário adicional.'} />}
            {selected.status === 'client_review' && <DeliveryNotice icon={<AlertCircle size={16} />} title="O que precisa acontecer agora">
              {selected.clientResponseDueAt ? `Revise esta entrega e responda até ${formatDateTime(selected.clientResponseDueAt)}.` : 'Revise esta entrega e escolha entre aprovar ou solicitar ajuste.'}
            </DeliveryNotice>}
            {selected.status === 'adjustment_requested' && <DeliveryNotice icon={<AlertCircle size={16} />} title="Seu ajuste está com a CALI">
              {selected.latestAdjustment?.reason || 'A nova versão voltará para sua validação assim que estiver pronta.'}
            </DeliveryNotice>}
          </>}

          {detailTab === 'tasks' && <>
            <ClientDeliverySteps tasks={selected.visibleTasks} formatDate={formatDate} />
            <DeliveryNotice icon={<AlertCircle size={16} />} title="Próxima ação"
              action={<DeliveryActionButton tone="primary" onClick={() => setDetailTab('conversation')}>Conversar <ArrowRight size={13} /></DeliveryActionButton>}>
              {selected.status === 'client_review' ? 'Revisar a entrega e registrar sua devolutiva: aprovar, pedir ajuste ou conversar.' : 'Acompanhar o andamento e conversar com a CALI se precisar.'}
            </DeliveryNotice>
          </>}

          {detailTab === 'history' && <>
            <DeliveryHistory
              title="Histórico da entrega"
              description="Registro cronológico de mudanças de situação, validações e decisões — diferente das mensagens da conversa."
              emptyMessage="Ainda não há movimentações registradas para esta entrega."
              entries={selected.history.map((item) => ({
                id: item.id,
                date: formatDateTime(item.createdAt),
                title: historyStatusLabel(item.toStatus),
                description: item.fromStatus ? `${historyStatusLabel(item.fromStatus)} → ${historyStatusLabel(item.toStatus)}` : 'Situação registrada.',
                tone: historyTone(item.toStatus),
              }))}
            />
            {selected.feedbackHistory?.map((feedback) => <ClientDeliveryFile key={feedback.id || feedback.createdAt} icon={<Star size={20} />}
              title={`${feedback.reviewRevision ? `Revisão ${feedback.reviewRevision} · ` : ''}Sua avaliação: ${feedback.score}/5`}
              description={`${formatDateTime(feedback.createdAt)}${feedback.comment ? ` · ${feedback.comment}` : ''}`}
            />)}
          </>}
        </div>}

        <footer className="tw:flex tw:min-h-[4.462rem] tw:shrink-0 tw:items-center tw:justify-between tw:gap-[.923rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#efe4dc] tw:px-[2.077rem] tw:py-[1.154rem] tw:text-[.769rem] tw:text-[#9c897e] tw:max-[34.375rem]:flex-col tw:max-[34.375rem]:items-start">
          <span>{statusLabel[selected.status]}{selected.updatedAt ? ` · atualizado em ${formatDateTime(selected.updatedAt)}` : ''}</span>
          <div className="tw:ml-auto tw:flex tw:flex-wrap tw:items-center tw:gap-[.769rem]">
            {selected.status === 'client_review' && <>
              <DeliveryActionButton onClick={(event) => {
                detailActionTrigger.current = event.currentTarget;
                reviewTarget.current = { id: selected.id, revision: selected.reviewRevision ?? 1, requestedAt: selected.approvalRequestedAt ?? null };
                setReviewError(null);
                setAdjustmentText('');
                setAdjustmentOpen(true);
              }}><RefreshCw size={14} /> Solicitar ajuste</DeliveryActionButton>
              <DeliveryActionButton tone="primary" onClick={(event) => {
                detailActionTrigger.current = event.currentTarget;
                reviewTarget.current = { id: selected.id, revision: selected.reviewRevision ?? 1, requestedAt: selected.approvalRequestedAt ?? null };
                setReviewError(null);
                setScore(0);
                setNpsComment('');
                setNpsOpen(true);
              }}><FileCheck2 size={14} /> Aprovar entrega</DeliveryActionButton>
            </>}
            {selected.status !== 'client_review' && detailTab === 'overview' && <DeliveryActionButton tone="primary" onClick={() => setDetailTab('conversation')}><MessageCircle size={14} /> Conversar sobre esta entrega <ArrowRight size={14} /></DeliveryActionButton>}
          </div>
        </footer>
      </DeliveryDetailDialog>}

    {adjustmentOpen && selected && <div className="v2-client-module v2-client-dialog">
      <WorkflowDialogOverlay>
        <WorkflowDialog create className="tw:relative" aria-labelledby="client-deliverable-adjustment-title" onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          setAdjustmentOpen(false);
        }}>
          <Button variant="close" type="button" aria-label="Fechar ajuste" onClick={() => setAdjustmentOpen(false)}><X size={20} /></Button>
          <span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-[#a88b76]">SOLICITAR AJUSTE</span>
          <h2 id="client-deliverable-adjustment-title">O que precisa ser revisto?</h2>
          <p>Descreva o ponto que precisa mudar. O pedido fica vinculado a <strong>{selected.protocol || selected.title}</strong>.</p>
          <textarea className="tw:box-border tw:w-full tw:resize-y tw:rounded-xl tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:px-4 tw:py-3 tw:font-[inherit]" aria-label="Descreva o ajuste" value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar este indicador por unidade antes da validação final." rows={5} maxLength={2000} autoFocus />
          {reviewErrorNotice}
          <div className="tw:mt-[1.385rem] tw:flex tw:flex-wrap tw:justify-end tw:gap-[.769rem]">
            <Button type="button" variant="secondary" onClick={() => setAdjustmentOpen(false)}>Cancelar</Button>
            <Button type="button" variant="primary" disabled={saving || reviewError?.stale || adjustmentText.trim().length < 3} onClick={() => void submitAdjustment()}>{saving ? 'Registrando…' : 'Enviar ajuste'}</Button>
          </div>
        </WorkflowDialog>
      </WorkflowDialogOverlay>
    </div>}

    {npsOpen && selected && <div className="v2-client-module v2-client-dialog">
      <WorkflowDialogOverlay>
        <WorkflowDialog create className="tw:relative" aria-labelledby="client-deliverable-rating-title">
          <Button variant="close" type="button" aria-label="Fechar avaliação" autoFocus onClick={() => setNpsOpen(false)}><X size={20} /></Button>
          <span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-[#a88b76]">APROVAÇÃO DA ENTREGA</span>
          <h2 id="client-deliverable-rating-title">Como foi esta entrega?</h2>
          <p>Escolha sua nota, revise e só depois confirme.</p>
          <div className="tw:my-[1.923rem] tw:flex tw:flex-wrap tw:justify-center tw:gap-[.923rem]">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className="tw:flex tw:cursor-pointer tw:flex-col tw:items-center tw:gap-[.385rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[var(--v2-line-e5d6ca,#e5d6ca)] tw:bg-[var(--v2-surface-fffaf5,#fffaf5)] tw:p-[.923rem] tw:text-[var(--v2-text-8a7366,#8a7366)] tw:aria-pressed:border-cali-brand tw:aria-pressed:bg-cali-brand tw:aria-pressed:text-white" aria-pressed={score === value} onClick={() => setScore(value)}><Star size={21} fill={score === value ? 'currentColor' : 'none'} /><span>{value}</span></button>)}</div>
          {reaction && <div className="tw:my-[1.231rem] tw:flex tw:gap-[.923rem] tw:text-[.923rem]/[1.5]"><span className="tw:text-[2.308rem]" aria-hidden="true">{reaction.emoji}</span><div><strong>{reaction.title}</strong><p>{reaction.copy}</p></div></div>}
          {score > 0 && <FieldLabel>
            {npsCommentRequired ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?'}
            <textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} maxLength={2000} placeholder={npsCommentRequired ? 'Sua justificativa ajuda a CALI a entender exatamente o que precisa melhorar.' : 'Opcional — deixe um comentário se quiser.'} />
          </FieldLabel>}
          {reviewErrorNotice}
          <Button type="button" variant="primary" className="tw:mt-[1.538rem] tw:w-full" disabled={saving || reviewError?.stale || !feedbackValid} onClick={() => void submitNps()}>{saving ? 'Confirmando…' : 'Confirmar aprovação e avaliação'}</Button>
        </WorkflowDialog>
      </WorkflowDialogOverlay>
    </div>}
  {openSub && <ClientSubtaskModal task={{ id: openSub.task.id, title: openSub.task.title, status: openSub.task.status, dueAt: openSub.task.dueAt, protocol: openSub.task.protocol, complexity: openSub.task.complexity }} deliverableId={openSub.item.id} deliverableTitle={openSub.item.title} statusLabel={openSub.task.status === 'todo' ? 'Programada' : openSub.task.status === 'client_review' ? 'Aguardando você' : ['done', 'approved', 'completed'].includes(openSub.task.status) ? 'Concluída' : 'Em andamento'} formatDate={formatDate} onClose={() => setOpenSub(null)} onChanged={() => { setOpenSub(null); void refreshReality(); }} />}
  </Shell>;
}
