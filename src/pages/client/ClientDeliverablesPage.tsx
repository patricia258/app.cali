import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, CircleDot,
  Clock3, FileCheck2, FileText, History, ListChecks, Loader2, MessageSquareText,
  RefreshCw, Star, X,
} from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoDeliverables } from '../../data/demo';
import {
  loadClientDeliveryReality,
  subscribeClientDeliveryReality,
  type ClientDeliveryItem,
  type ClientDeliveryReality,
  type ClientDeliveryStatus,
  type ClientPublishedDocument,
} from '../../lib/clientDeliveryReality';
import { supabase } from '../../lib/supabase';

const statusLabel: Record<ClientDeliveryStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  standby: 'Em espera',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado',
  rebriefing: 'Em rebriefing',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

const taskStatusLabel: Record<string, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluída',
  completed: 'Concluída',
  standby: 'Em espera',
  cancelled: 'Cancelada',
};

const activeStatuses = new Set<ClientDeliveryStatus>([
  'not_started', 'in_progress', 'standby', 'internal_review',
  'client_review', 'adjustment_requested', 'rebriefing',
]);

function formatDate(value?: string | null, withYear = true) {
  if (!value) return 'A definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A definir';
  return new Intl.DateTimeFormat('pt-BR', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date).replace('.', '');
}

function formatHours(minutes: number | null) {
  if (minutes == null) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${hours}h`;
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
    workstream: item.workstream,
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
    visibleMinutes: Math.round(item.hours * 60),
    visibleTasks: [],
    visibleTaskProgress: null,
    document: null,
    feedback: null,
    latestAdjustment: null,
    history: [],
  }));
  const nonCancelled = deliverables.filter((item) => item.status !== 'cancelled');
  const approved = nonCancelled.filter((item) => item.status === 'approved').length;
  return {
    company: { id: 'preview-aurora', displayName: 'Aurora Tech', monthlyHoursContracted: 20, showHoursToClient: true },
    projects: [{ id: 'preview-project', name: 'Estruturação People', status: 'active' }],
    deliverables,
    metrics: {
      total: nonCancelled.length,
      active: nonCancelled.filter((item) => item.status !== 'approved').length,
      waitingClient: nonCancelled.filter((item) => item.status === 'client_review').length,
      approved,
      cancelled: 0,
      overdue: 0,
      completionPct: nonCancelled.length ? Math.round((approved / nonCancelled.length) * 100) : 0,
      visibleMinutes: deliverables.reduce((sum, item) => sum + Number(item.visibleMinutes || 0), 0),
      averageDeliveryScore: null,
      feedbackCount: 0,
    },
  };
}

export function ClientDeliverablesPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const previewData = useMemo(() => previewReality(), []);
  const refreshTimer = useRef<number | null>(null);
  const [companyId, setCompanyId] = useState(preview ? previewData.company.id : '');
  const [reality, setReality] = useState<ClientDeliveryReality | null>(preview ? previewData : null);
  const [selectedId, setSelectedId] = useState(previewData.deliverables.find((item) => item.status === 'client_review')?.id || previewData.deliverables[0]?.id || '');
  const [projectFilter, setProjectFilter] = useState('all');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [npsOpen, setNpsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const allItems = reality?.deliverables || [];
  const filteredItems = useMemo(() => projectFilter === 'all'
    ? allItems
    : allItems.filter((item) => item.projectId === projectFilter), [allItems, projectFilter]);
  const selected = useMemo(() => allItems.find((item) => item.id === selectedId) || filteredItems[0] || allItems[0], [allItems, filteredItems, selectedId]);
  const waitingItems = filteredItems.filter((item) => item.status === 'client_review');
  const activeItems = filteredItems.filter((item) => activeStatuses.has(item.status) && item.status !== 'client_review');
  const historyItems = filteredItems.filter((item) => ['approved', 'cancelled'].includes(item.status));
  const npsCommentRequired = score > 0 && score <= 3;
  const reaction = score ? scoreReaction(score) : null;

  useEffect(() => {
    if (preview || !supabase) return;
    void bootstrap();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  useEffect(() => {
    if (preview || !companyId) return;
    const unsubscribe = subscribeClientDeliveryReality(companyId, () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refreshReality(false), 220);
    });
    return unsubscribe;
  }, [companyId, preview]);

  useEffect(() => {
    const modalOpen = adjustmentOpen || npsOpen;
    document.body.classList.toggle('workspace-modal-open', modalOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [adjustmentOpen, npsOpen]);

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
      const nextReality = await loadClientDeliveryReality(nextCompanyId);
      applyReality(nextReality);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os entregáveis.');
    } finally {
      setLoading(false);
    }
  }

  function applyReality(nextReality: ClientDeliveryReality) {
    setReality(nextReality);
    setSelectedId((current) => nextReality.deliverables.some((item) => item.id === current)
      ? current
      : nextReality.deliverables.find((item) => item.status === 'client_review')?.id || nextReality.deliverables[0]?.id || '');
    setProjectFilter((current) => current === 'all' || nextReality.projects.some((project) => project.id === current) ? current : 'all');
  }

  async function refreshReality(showIndicator = true) {
    if (preview || !companyId) return;
    if (showIndicator) setSyncing(true);
    try {
      const nextReality = await loadClientDeliveryReality(companyId);
      applyReality(nextReality);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível sincronizar os dados.');
    } finally {
      if (showIndicator) setSyncing(false);
    }
  }

  function approveDeliverable() {
    if (!selected || selected.status !== 'client_review') return;
    setScore(0);
    setNpsComment('');
    setNpsOpen(true);
    setMessage('');
    setError('');
  }

  async function submitAdjustment() {
    if (!selected || adjustmentText.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      if (preview || !supabase) {
        setAdjustmentOpen(false);
        setAdjustmentText('');
        setMessage('Seu pedido de ajuste foi registrado.');
        return;
      }
      const result = await supabase.rpc('request_deliverable_adjustment', {
        p_deliverable_id: selected.id,
        p_reason: adjustmentText.trim(),
        p_impact_business_days: 0,
      });
      if (result.error) throw result.error;
      setMessage('Seu pedido de ajuste foi registrado e já está disponível para acompanhamento da CALI.');
      setAdjustmentOpen(false);
      setAdjustmentText('');
      await refreshReality(false);
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
        setMessage('Entregável aprovado. Sua avaliação também foi registrada.');
        return;
      }
      const result = await supabase.rpc('client_approve_deliverable_with_feedback', {
        p_deliverable_id: selected.id,
        p_score: score,
        p_comment: npsComment.trim() || null,
      });
      if (result.error) throw result.error;
      setNpsOpen(false);
      setMessage(selected.isDocument
        ? 'Entregável aprovado. Sua avaliação foi registrada e o documento segue para finalização da CALI.'
        : 'Entregável aprovado. Sua avaliação também foi registrada.');
      setScore(0);
      setNpsComment('');
      await refreshReality(false);
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
      if (signedError || !data?.signedUrl) {
        setError(signedError?.message || 'Não foi possível abrir o documento.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  function selectProject(value: string) {
    setProjectFilter(value);
    const candidate = value === 'all' ? allItems : allItems.filter((item) => item.projectId === value);
    setSelectedId(candidate.find((item) => item.status === 'client_review')?.id || candidate[0]?.id || '');
  }

  function renderListGroup(title: string, kicker: string, list: ClientDeliveryItem[]) {
    if (!list.length) return null;
    return <div className="client-delivery-group">
      <div className="client-delivery-group-title"><div><span>{kicker}</span><strong>{title}</strong></div><b>{list.length}</b></div>
      {list.map((item) => <button key={item.id} type="button" className={`client-delivery-select ${selected?.id === item.id ? 'selected' : ''} ${item.status === 'client_review' ? 'needs-action' : ''}`} onClick={() => setSelectedId(item.id)}>
        <span className={`client-delivery-dot status-${item.status}`} />
        <div>
          <small>{item.protocol || item.code || 'ENTREGÁVEL'} · {item.projectName || 'Projeto CALI'}</small>
          <strong>{item.title}</strong>
          <span>{statusLabel[item.status]}{item.dueAt ? ` · ${formatDate(item.dueAt, false)}` : ''}</span>
        </div>
        <ChevronRight size={16} />
      </button>)}
    </div>;
  }

  const metrics = reality?.metrics;
  const showHours = Boolean(reality?.company.showHoursToClient);

  return <Shell role="client">
    <section className="page client-deliverables-v31">
      <header className="client-deliverables-heading">
        <div>
          <span className="eyebrow">ENTREGAS · DADOS DO WORKSPACE</span>
          <h1>Entregáveis</h1>
          <p>Acompanhe o que a CALI está executando, o que precisa da sua validação e o histórico do que já foi aprovado.</p>
        </div>
        <div className="client-delivery-heading-actions">
          {reality && reality.projects.length > 1 && <label><span>Projeto</span><select value={projectFilter} onChange={(event) => selectProject(event.target.value)}><option value="all">Todos os projetos</option>{reality.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
          {!preview && <button type="button" className="secondary client-sync-button" disabled={syncing} onClick={() => void refreshReality()}><RefreshCw size={15} className={syncing ? 'spin' : ''} />Sincronizar</button>}
        </div>
      </header>

      {message && <div className="inline-notice success"><CheckCircle2 size={19} />{message}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}
      {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando dados reais dos entregáveis…</div>}

      {!loading && reality && <>
        <section className={`client-delivery-kpis ${showHours ? '' : 'without-hours'}`}>
          <article className={metrics?.waitingClient ? 'attention' : ''}><span>AGUARDANDO VOCÊ</span><strong>{metrics?.waitingClient || 0}</strong><small>{metrics?.waitingClient ? 'validação pendente' : 'nenhuma ação pendente'}</small></article>
          <article><span>EM ACOMPANHAMENTO</span><strong>{metrics?.active || 0}</strong><small>entregas ainda abertas</small></article>
          <article><span>APROVADAS</span><strong>{metrics?.approved || 0}</strong><small>de {metrics?.total || 0} entregas visíveis</small></article>
          {showHours ? <article><span>HORAS VISÍVEIS</span><strong>{formatHours(metrics?.visibleMinutes ?? 0)}</strong><small>{reality.company.monthlyHoursContracted ? `referência mensal: ${reality.company.monthlyHoursContracted}h` : 'registros compartilhados pela CALI'}</small></article>
            : <article className={metrics?.overdue ? 'warning' : ''}><span>PRAZOS</span><strong>{metrics?.overdue || 0}</strong><small>{metrics?.overdue ? 'entrega com prazo ultrapassado' : 'nenhum prazo ultrapassado'}</small></article>}
        </section>

        {!allItems.length ? <section className="panel data-empty"><strong>Nenhum entregável disponível.</strong><span>Quando a CALI compartilhar uma entrega, ela aparecerá aqui automaticamente.</span></section> : <div className="client-delivery-layout">
          <aside className="panel client-delivery-list-panel">
            <div className="panel-title"><div><span className="section-kicker">VISÃO DO CLIENTE</span><h2>{projectFilter === 'all' ? 'Todas as entregas' : reality.projects.find((project) => project.id === projectFilter)?.name || 'Projeto'}</h2></div><span className="count">{filteredItems.length}</span></div>
            <div className="client-delivery-list-scroll">
              {renderListGroup('Prontas para sua validação', 'PRECISA DE VOCÊ', waitingItems)}
              {renderListGroup('Em movimento', 'CALI EM AÇÃO', activeItems)}
              {renderListGroup('Concluídas e arquivadas', 'HISTÓRICO', historyItems)}
              {!filteredItems.length && <div className="client-delivery-empty-filter">Nenhuma entrega neste projeto.</div>}
            </div>
          </aside>

          {selected && <section className="panel client-delivery-detail-panel">
            <div className="client-delivery-detail-head">
              <div><span>{selected.protocol || selected.code || 'ENTREGÁVEL'}</span><h2>{selected.title}</h2><p>{selected.projectName || 'Projeto CALI'}{selected.workstream ? ` · ${selected.workstream}` : ''}</p></div>
              <span className={`client-delivery-status status-${selected.status}`}>{statusLabel[selected.status]}</span>
            </div>

            {selected.description && <p className="client-delivery-description">{selected.description}</p>}

            {selected.status === 'client_review' && <div className="client-delivery-action-callout"><div><span>SUA AÇÃO É NECESSÁRIA</span><strong>Esta entrega está pronta para sua validação.</strong><p>{selected.clientResponseDueAt ? `Responda até ${formatDateTime(selected.clientResponseDueAt)}.` : 'Revise o material e aprove ou solicite o ajuste necessário.'}</p></div><CalendarClock size={21} /></div>}

            <div className="client-delivery-meta-grid">
              <div><span>Prazo da entrega</span><strong>{formatDate(selected.dueAt)}</strong>{selected.originalDueAt && selected.originalDueAt !== selected.dueAt && <small>Original: {formatDate(selected.originalDueAt)}</small>}</div>
              <div><span>Início real</span><strong>{formatDateTime(selected.startedAt)}</strong></div>
              <div><span>Última atualização</span><strong>{formatDateTime(selected.updatedAt)}</strong></div>
              {showHours && <div><span>Horas compartilhadas</span><strong>{formatHours(selected.visibleMinutes)}</strong></div>}
            </div>

            {selected.visibleTaskProgress != null && <section className="client-delivery-real-progress">
              <div><span>ETAPAS COMPARTILHADAS</span><strong>{selected.visibleTaskProgress}%</strong></div>
              <Progress value={selected.visibleTaskProgress} />
              <small>Percentual calculado somente pelas etapas visíveis abaixo — não por uma estimativa de status.</small>
            </section>}

            {selected.visibleTasks.length > 0 && <section className="client-delivery-section">
              <div className="client-delivery-section-title"><ListChecks size={17} /><div><span>ETAPAS VISÍVEIS</span><strong>Acompanhamento desta entrega</strong></div><b>{selected.visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)).length}/{selected.visibleTasks.length}</b></div>
              <div className="client-delivery-task-list">{selected.visibleTasks.map((task) => <div key={task.id} className={`client-delivery-task status-${task.status}`}><span>{['done', 'completed'].includes(task.status) ? <Check size={14} /> : <CircleDot size={14} />}</span><div><strong>{task.title}</strong><small>{taskStatusLabel[task.status] || task.status}{task.dueAt ? ` · prazo ${formatDate(task.dueAt, false)}` : ''}</small></div></div>)}</div>
            </section>}

            {selected.isDocument && <section className="client-delivery-document">
              <FileText size={20} />
              <div>
                <span>DOCUMENTO DESTA ENTREGA</span>
                <strong>{selected.document ? selected.document.title : selected.status === 'approved' ? 'Arquivo final em preparação' : 'Documento ainda não publicado'}</strong>
                <p>{selected.document ? `${selected.document.versionLabel ? `${selected.document.versionLabel} · ` : ''}Publicado ${formatDateTime(selected.document.publishedAt)} e também disponível na Biblioteca.` : selected.status === 'approved' ? 'A aprovação está registrada. A CALI ainda está preparando/publicando o arquivo final.' : 'Quando houver uma versão publicada para o cliente, ela aparecerá aqui automaticamente.'}</p>
              </div>
              {selected.document && <button type="button" className="secondary" onClick={() => void openPublishedDocument(selected.document!)}>Abrir documento</button>}
            </section>}

            {selected.latestAdjustment && <section className="client-delivery-adjustment-history">
              <MessageSquareText size={18} />
              <div><span>ÚLTIMO PEDIDO DE AJUSTE · #{selected.latestAdjustment.requestNumber}</span><strong>{selected.latestAdjustment.reason}</strong><small>{formatDateTime(selected.latestAdjustment.createdAt)} · {selected.latestAdjustment.status === 'open' ? 'em acompanhamento' : 'resolvido'}</small></div>
            </section>}

            {selected.feedback && <section className="client-delivery-feedback-history">
              <div className="client-delivery-feedback-score"><span>{scoreReaction(selected.feedback.score).emoji}</span><strong>{selected.feedback.score}<small>/5</small></strong></div>
              <div><span>SUA AVALIAÇÃO DESTA ENTREGA</span><strong>{scoreReaction(selected.feedback.score).title}</strong><p>{selected.feedback.comment || 'Você não deixou comentário adicional.'}</p><small>Registrada {formatDateTime(selected.feedback.createdAt)}</small></div>
            </section>}

            {selected.history.length > 0 && <details className="client-delivery-history-details">
              <summary><History size={16} /><span>Ver histórico de status</span><ChevronRight size={15} /></summary>
              <div>{selected.history.slice(0, 8).map((item) => <div key={item.id}><span className={`client-delivery-dot status-${item.toStatus}`} /><strong>{statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}</strong><small>{formatDateTime(item.createdAt)}</small></div>)}</div>
            </details>}

            {selected.status === 'client_review' && <div className="client-delivery-review-actions">
              <button className="secondary" type="button" onClick={() => { setAdjustmentOpen(true); setAdjustmentText(''); setError(''); }}>Solicitar ajuste</button>
              <button className="primary" type="button" onClick={approveDeliverable}><FileCheck2 size={16} />Aprovar entrega</button>
            </div>}

            {selected.status === 'adjustment_requested' && <div className="inline-notice"><Clock3 size={18} />A CALI recebeu seu pedido de ajuste. A nova versão voltará para sua validação quando estiver pronta.</div>}
            {selected.status === 'rebriefing' && <div className="inline-notice"><AlertTriangle size={18} />Esta entrega entrou em rebriefing. Escopo e prazo estão sendo reorganizados antes da nova validação.</div>}
            {selected.status === 'approved' && <div className="inline-notice success"><CheckCircle2 size={19} />Entrega aprovada e preservada no histórico do projeto.</div>}
          </section>}
        </div>}
      </>}
    </section>

    {adjustmentOpen && selected && <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
      <section className="modal-card client-delivery-modal" role="dialog" aria-modal="true" aria-labelledby="adjustment-title">
        <button className="modal-close" type="button" onClick={() => setAdjustmentOpen(false)} aria-label="Fechar"><X size={20} /></button>
        <span className="section-kicker">SOLICITAR AJUSTE</span>
        <h2 id="adjustment-title">O que precisa ser revisto?</h2>
        <p>Descreva o ponto que precisa mudar. O pedido fica vinculado a <strong>{selected.protocol || selected.title}</strong> e entra no acompanhamento da CALI.</p>
        <textarea value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar este indicador por unidade antes da validação final." rows={5} autoFocus />
        <div className="modal-actions"><button className="secondary" type="button" onClick={() => setAdjustmentOpen(false)}>Cancelar</button><button className="primary" type="button" disabled={saving || adjustmentText.trim().length < 3} onClick={() => void submitAdjustment()}>{saving ? 'Registrando…' : 'Enviar ajuste'}</button></div>
      </section>
    </div>}

    {npsOpen && selected && <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
      <section className="modal-card client-delivery-modal client-delivery-rating-modal" role="dialog" aria-modal="true" aria-labelledby="nps-title">
        <button className="modal-close" type="button" onClick={() => setNpsOpen(false)} aria-label="Fechar"><X size={20} /></button>
        <span className="section-kicker">APROVAÇÃO DA ENTREGA</span>
        <h2 id="nps-title">Como foi esta entrega?</h2>
        <p>Escolha sua nota, revise e só depois confirme. A aprovação e a avaliação ficam registradas juntas.</p>
        <div className="client-delivery-rating-row" aria-label="Avaliação de 1 a 5">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={score === value ? 'selected' : ''} onClick={() => setScore(value)}><Star size={21} fill={score === value ? 'currentColor' : 'none'} /><span>{value}</span></button>)}</div>
        {reaction && <div className={`client-delivery-score-reaction score-${score}`}><span>{reaction.emoji}</span><div><strong>{reaction.title}</strong><p>{reaction.copy}</p></div></div>}
        {score > 0 && <label className="stacked-label">{npsCommentRequired ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?'}<textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} placeholder={npsCommentRequired ? 'Sua justificativa ajuda a CALI a entender exatamente o que precisa melhorar.' : 'Opcional — deixe um comentário se quiser.'} /></label>}
        <button className="primary full" type="button" disabled={saving || score === 0 || (npsCommentRequired && npsComment.trim().length < 3)} onClick={() => void submitNps()}>{saving ? 'Confirmando…' : 'Confirmar aprovação e avaliação'}</button>
      </section>
    </div>}
  </Shell>;
}
