import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, ChevronRight, CircleDot, Clock3,
  FileCheck2, FileText, History, ListChecks, Loader2, MessageCircle,
  Send, Star, X,
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
import {
  loadClientDeliverableConversation,
  sendClientDeliverableMessage,
  subscribeClientDeliverableConversation,
  type ClientDeliverableMessage,
} from '../../lib/clientDeliverableConversation';
import { supabase } from '../../lib/supabase';

type DeliveryFilter = 'moving' | 'waiting' | 'done';

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

const taskStatusLabel: Record<string, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  doing: 'Em andamento',
  done: 'Concluída',
  completed: 'Concluída',
  standby: 'Em espera',
  cancelled: 'Cancelada',
};

const movingStatuses = new Set<ClientDeliveryStatus>([
  'not_started', 'in_progress', 'standby', 'internal_review',
  'adjustment_requested', 'rebriefing',
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
    visibleMinutes: null,
    visibleTasks: [],
    visibleTaskProgress: null,
    document: null,
    feedback: null,
    latestAdjustment: null,
    history: [],
  }));
  const visible = deliverables.filter((item) => item.status !== 'cancelled');
  const approved = visible.filter((item) => item.status === 'approved').length;
  return {
    company: { id: 'preview-aurora', displayName: 'Aurora Tech', monthlyHoursContracted: null, showHoursToClient: false },
    projects: [{ id: 'preview-project', name: 'Estruturação People', status: 'active' }],
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

function currentMoment(item: ClientDeliveryItem) {
  const nextTask = item.visibleTasks.find((task) => !['done', 'completed', 'cancelled'].includes(task.status));
  if (item.status === 'client_review') return {
    eyebrow: 'AGORA É COM VOCÊ',
    title: 'Esta entrega está pronta para sua validação.',
    copy: item.clientResponseDueAt
      ? `Revise e responda até ${formatDateTime(item.clientResponseDueAt)}.`
      : 'Revise o material e aprove ou peça o ajuste necessário.',
    tone: 'client',
  };
  if (item.status === 'in_progress') return {
    eyebrow: 'CALI EM AÇÃO',
    title: 'A CALI está trabalhando nesta entrega.',
    copy: nextTask ? `Próxima etapa compartilhada: ${nextTask.title}.` : 'Quando houver uma atualização relevante ou algo para sua validação, ela aparecerá aqui.',
    tone: 'moving',
  };
  if (item.status === 'internal_review') return {
    eyebrow: 'REVISÃO CALI',
    title: 'O material está em revisão interna.',
    copy: 'A CALI está revisando a entrega antes de disponibilizá-la para você.',
    tone: 'moving',
  };
  if (item.status === 'adjustment_requested') return {
    eyebrow: 'AJUSTE RECEBIDO',
    title: 'Seu pedido de ajuste está com a CALI.',
    copy: 'A nova versão voltará para sua validação assim que estiver pronta.',
    tone: 'moving',
  };
  if (item.status === 'rebriefing') return {
    eyebrow: 'REBRIEFING',
    title: 'Escopo e próximos passos estão sendo reorganizados.',
    copy: 'A CALI está revisando o contexto desta entrega antes de retomar a execução.',
    tone: 'warning',
  };
  if (item.status === 'standby') return {
    eyebrow: 'EM ESPERA',
    title: 'Esta entrega está temporariamente em espera.',
    copy: 'Quando a execução for retomada, o status será atualizado automaticamente.',
    tone: 'neutral',
  };
  if (item.status === 'approved') return {
    eyebrow: 'CONCLUÍDA',
    title: 'Esta entrega foi aprovada.',
    copy: item.approvedAt ? `Aprovação registrada em ${formatDateTime(item.approvedAt)}.` : 'A aprovação está registrada no histórico do projeto.',
    tone: 'success',
  };
  if (item.status === 'cancelled') return {
    eyebrow: 'ENCERRADA',
    title: 'Esta entrega foi cancelada.',
    copy: 'O registro permanece disponível no histórico do projeto.',
    tone: 'neutral',
  };
  return {
    eyebrow: 'PROGRAMADA',
    title: 'Esta entrega ainda não foi iniciada.',
    copy: item.dueAt ? `Prazo atual: ${formatDate(item.dueAt)}.` : 'O início e o prazo serão atualizados pela CALI quando definidos.',
    tone: 'neutral',
  };
}

export function ClientDeliverablesPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const previewData = useMemo(() => previewReality(), []);
  const refreshTimer = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const [companyId, setCompanyId] = useState(preview ? previewData.company.id : '');
  const [reality, setReality] = useState<ClientDeliveryReality | null>(preview ? previewData : null);
  const [selectedId, setSelectedId] = useState(previewData.deliverables[0]?.id || '');
  const [projectFilter, setProjectFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('moving');
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

  const projectItems = useMemo(() => {
    const all = reality?.deliverables || [];
    return projectFilter === 'all' ? all : all.filter((item) => item.projectId === projectFilter);
  }, [reality?.deliverables, projectFilter]);

  const movingItems = projectItems.filter((item) => movingStatuses.has(item.status));
  const waitingItems = projectItems.filter((item) => item.status === 'client_review');
  const doneItems = projectItems.filter((item) => ['approved', 'cancelled'].includes(item.status));
  const filteredItems = deliveryFilter === 'moving' ? movingItems : deliveryFilter === 'waiting' ? waitingItems : doneItems;
  const selected = useMemo(() => {
    const all = reality?.deliverables || [];
    return all.find((item) => item.id === selectedId) || filteredItems[0] || all[0];
  }, [reality?.deliverables, selectedId, filteredItems]);
  const moment = selected ? currentMoment(selected) : null;
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
    if (!selected) return;
    if (preview) {
      setMessages([]);
      return;
    }
    void loadConversation(selected.id);
    return subscribeClientDeliverableConversation(selected.id, () => void loadConversation(selected.id, false));
  }, [selected?.id, preview]);

  useEffect(() => {
    if (!conversationRef.current) return;
    conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages.length]);

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
      applyReality(await loadClientDeliveryReality(nextCompanyId), true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os entregáveis.');
    } finally {
      setLoading(false);
    }
  }

  function applyReality(nextReality: ClientDeliveryReality, initial = false) {
    setReality(nextReality);
    if (initial) {
      const waiting = nextReality.deliverables.find((item) => item.status === 'client_review');
      const moving = nextReality.deliverables.find((item) => movingStatuses.has(item.status));
      const fallback = waiting || moving || nextReality.deliverables[0];
      setSelectedId(fallback?.id || '');
      setDeliveryFilter(waiting ? 'waiting' : moving ? 'moving' : 'done');
      return;
    }
    setSelectedId((current) => nextReality.deliverables.some((item) => item.id === current)
      ? current
      : nextReality.deliverables[0]?.id || '');
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

  function chooseFilter(next: DeliveryFilter) {
    setDeliveryFilter(next);
    const pool = next === 'moving' ? movingItems : next === 'waiting' ? waitingItems : doneItems;
    setSelectedId(pool[0]?.id || '');
  }

  function chooseProject(next: string) {
    setProjectFilter(next);
    const pool = next === 'all' ? reality?.deliverables || [] : (reality?.deliverables || []).filter((item) => item.projectId === next);
    const waiting = pool.find((item) => item.status === 'client_review');
    const moving = pool.find((item) => movingStatuses.has(item.status));
    const fallback = waiting || moving || pool[0];
    setDeliveryFilter(waiting ? 'waiting' : moving ? 'moving' : 'done');
    setSelectedId(fallback?.id || '');
  }

  async function sendMessage() {
    if (!selected || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setSendingMessage(true);
    setError('');
    try {
      if (preview) {
        setMessages((current) => [...current, {
          id: `preview-message-${Date.now()}`,
          deliverableId: selected.id,
          body,
          sourceActor: 'client',
          createdAt: new Date().toISOString(),
        }]);
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
      const result = await supabase.rpc('request_deliverable_adjustment', {
        p_deliverable_id: selected.id,
        p_reason: adjustmentText.trim(),
        p_impact_business_days: 0,
      });
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
      const result = await supabase.rpc('client_approve_deliverable_with_feedback', {
        p_deliverable_id: selected.id,
        p_score: score,
        p_comment: npsComment.trim() || null,
      });
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
      if (signedError || !data?.signedUrl) {
        setError(signedError?.message || 'Não foi possível abrir o documento.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  function renderDelivery(item: ClientDeliveryItem) {
    const done = item.visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)).length;
    return <button key={item.id} type="button" className={`client-delivery-v32-item ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)}>
      <span className={`client-delivery-v32-dot status-${item.status}`} />
      <div className="client-delivery-v32-item-main">
        <small>{item.projectName || 'Projeto CALI'}</small>
        <strong>{item.title}</strong>
        <div>
          <span>{statusLabel[item.status]}</span>
          {item.dueAt && <span>Prazo {formatDate(item.dueAt, false)}</span>}
          {item.visibleTasks.length > 0 && <span>{done}/{item.visibleTasks.length} etapas</span>}
        </div>
      </div>
      <ChevronRight size={16} />
    </button>;
  }

  return <Shell role="client">
    <section className="page client-deliverables-v32">
      <header className="client-deliverables-v32-heading">
        <div>
          <span className="eyebrow">ENTREGAS DO PROJETO</span>
          <h1>Entregáveis</h1>
          <p>Veja o que a CALI está fazendo, o que precisa de você e converse dentro de cada entrega.</p>
        </div>
        <div className="client-delivery-v32-tools">
          {reality && reality.projects.length > 1 && <label>
            <span>Projeto</span>
            <select value={projectFilter} onChange={(event) => chooseProject(event.target.value)}>
              <option value="all">Todos os projetos</option>
              {reality.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>}
          <div className="client-delivery-v32-live"><span />Atualização automática</div>
        </div>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}
      {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando entregas…</div>}

      {!loading && reality && <>
        <nav className="client-delivery-v32-tabs" aria-label="Filtrar entregas">
          <button type="button" className={deliveryFilter === 'moving' ? 'active' : ''} onClick={() => chooseFilter('moving')}><span>Em andamento</span><b>{movingItems.length}</b></button>
          <button type="button" className={`${deliveryFilter === 'waiting' ? 'active' : ''} ${waitingItems.length ? 'attention' : ''}`} onClick={() => chooseFilter('waiting')}><span>Aguardando você</span><b>{waitingItems.length}</b></button>
          <button type="button" className={deliveryFilter === 'done' ? 'active' : ''} onClick={() => chooseFilter('done')}><span>Concluídas</span><b>{doneItems.length}</b></button>
        </nav>

        {!projectItems.length ? <section className="panel data-empty"><strong>Nenhum entregável disponível.</strong><span>Quando a CALI compartilhar uma entrega, ela aparecerá aqui automaticamente.</span></section>
          : <div className="client-delivery-v32-layout">
            <aside className="panel client-delivery-v32-list">
              <div className="client-delivery-v32-list-head">
                <strong>{deliveryFilter === 'moving' ? 'Em andamento' : deliveryFilter === 'waiting' ? 'Aguardando você' : 'Concluídas'}</strong>
                <span>{filteredItems.length}</span>
              </div>
              <div className="client-delivery-v32-list-body">
                {filteredItems.length ? filteredItems.map(renderDelivery) : <div className="client-delivery-v32-empty">Nada nesta etapa agora.</div>}
              </div>
            </aside>

            {selected && moment ? <main className="panel client-delivery-v32-detail">
              <header className="client-delivery-v32-detail-head">
                <div>
                  <small>{selected.protocol || selected.code || 'ENTREGÁVEL'}{selected.workstream ? ` · ${selected.workstream}` : ''}</small>
                  <h2>{selected.title}</h2>
                  {selected.description && <p>{selected.description}</p>}
                </div>
                <span className={`client-delivery-v32-status status-${selected.status}`}>{statusLabel[selected.status]}</span>
              </header>

              <section className={`client-delivery-v32-now tone-${moment.tone}`}>
                <div>
                  <span>{moment.eyebrow}</span>
                  <strong>{moment.title}</strong>
                  <p>{moment.copy}</p>
                </div>
                {selected.status === 'client_review' && <div className="client-delivery-v32-now-actions">
                  <button type="button" className="secondary" onClick={() => { setAdjustmentText(''); setAdjustmentOpen(true); }}>Solicitar ajuste</button>
                  <button type="button" className="primary" onClick={() => { setScore(0); setNpsComment(''); setNpsOpen(true); }}><FileCheck2 size={16} />Aprovar entrega</button>
                </div>}
              </section>

              <div className="client-delivery-v32-facts">
                <div><span>Prazo</span><strong>{formatDate(selected.dueAt)}</strong></div>
                <div><span>Atualizado</span><strong>{formatDateTime(selected.updatedAt)}</strong></div>
                <div><span>Etapas visíveis</span><strong>{selected.visibleTasks.length ? `${selected.visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)).length} de ${selected.visibleTasks.length}` : 'Nenhuma publicada'}</strong></div>
              </div>

              {selected.visibleTasks.length > 0 && <section className="client-delivery-v32-section">
                <div className="client-delivery-v32-section-head"><ListChecks size={18} /><div><span>ANDAMENTO</span><strong>Etapas compartilhadas</strong></div><b>{selected.visibleTaskProgress ?? 0}%</b></div>
                <Progress value={selected.visibleTaskProgress ?? 0} />
                <div className="client-delivery-v32-task-list">{selected.visibleTasks.map((task) => <div key={task.id} className={`client-delivery-v32-task status-${task.status}`}>
                  <span>{['done', 'completed'].includes(task.status) ? <Check size={14} /> : <CircleDot size={14} />}</span>
                  <div><strong>{task.title}</strong><small>{taskStatusLabel[task.status] || task.status}{task.dueAt ? ` · ${formatDate(task.dueAt, false)}` : ''}</small></div>
                </div>)}</div>
              </section>}

              {selected.isDocument && <section className="client-delivery-v32-file">
                <div className="client-delivery-v32-file-icon"><FileText size={20} /></div>
                <div>
                  <span>ARQUIVO DA ENTREGA</span>
                  <strong>{selected.document ? selected.document.title : 'Ainda não publicado'}</strong>
                  <p>{selected.document ? `Publicado ${formatDateTime(selected.document.publishedAt)} e disponível também na Biblioteca.` : selected.status === 'approved' ? 'A entrega foi aprovada e o arquivo final ainda está sendo preparado pela CALI.' : 'Quando houver uma versão para você, ela aparecerá aqui.'}</p>
                </div>
                {selected.document && <button type="button" className="secondary" onClick={() => void openPublishedDocument(selected.document!)}>Abrir</button>}
              </section>}

              <section className="client-delivery-v32-conversation">
                <div className="client-delivery-v32-section-head conversation-head"><MessageCircle size={18} /><div><span>CONVERSA DESTA ENTREGA</span><strong>Fale com a CALI sobre {selected.title}</strong></div></div>
                <p className="client-delivery-v32-conversation-note">Tudo o que for enviado aqui fica vinculado a este entregável e aparece para a CALI dentro do projeto.</p>
                <div className="client-delivery-v32-messages" ref={conversationRef}>
                  {conversationLoading ? <div className="client-delivery-v32-message-empty"><Loader2 className="spin" size={17} />Carregando conversa…</div>
                    : messages.length ? messages.map((message) => <div key={message.id} className={`client-delivery-v32-message ${message.sourceActor === 'client' ? 'mine' : message.sourceActor === 'system' ? 'system' : 'cali'}`}>
                      <div className="client-delivery-v32-message-meta"><strong>{message.sourceActor === 'client' ? 'Você' : message.sourceActor === 'system' ? 'Sistema' : 'CALI'}</strong><span>{formatDateTime(message.createdAt)}</span></div>
                      <p>{message.body}</p>
                    </div>) : <div className="client-delivery-v32-message-empty">Ainda não há mensagens nesta entrega. Se precisar alinhar algo, escreva abaixo.</div>}
                </div>
                <div className="client-delivery-v32-composer">
                  <textarea rows={2} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Escreva uma mensagem sobre esta entrega…" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void sendMessage(); }} />
                  <button type="button" className="primary" disabled={sendingMessage || !messageDraft.trim()} onClick={() => void sendMessage()}>{sendingMessage ? <Loader2 className="spin" size={16} /> : <Send size={16} />}Enviar</button>
                </div>
              </section>

              {selected.feedback && <section className="client-delivery-v32-feedback">
                <div><span>{scoreReaction(selected.feedback.score).emoji}</span><strong>{selected.feedback.score}<small>/5</small></strong></div>
                <div><span>SUA AVALIAÇÃO</span><strong>{scoreReaction(selected.feedback.score).title}</strong><p>{selected.feedback.comment || 'Sem comentário adicional.'}</p><small>{formatDateTime(selected.feedback.createdAt)}</small></div>
              </section>}

              {selected.history.length > 0 && <details className="client-delivery-v32-history">
                <summary><History size={16} /><span>Histórico desta entrega</span><ChevronRight size={15} /></summary>
                <div>{selected.history.slice(0, 10).map((item) => <div key={item.id}><span className={`client-delivery-v32-dot status-${item.toStatus}`} /><strong>{statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}</strong><small>{formatDateTime(item.createdAt)}</small></div>)}</div>
              </details>}
            </main> : <section className="panel client-delivery-v32-no-selection"><strong>Selecione uma entrega.</strong><span>Os detalhes aparecerão aqui.</span></section>}
          </div>}
      </>}
    </section>

    {adjustmentOpen && selected && <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
      <section className="modal-card client-delivery-modal" role="dialog" aria-modal="true" aria-labelledby="adjustment-title">
        <button className="modal-close" type="button" onClick={() => setAdjustmentOpen(false)} aria-label="Fechar"><X size={20} /></button>
        <span className="section-kicker">SOLICITAR AJUSTE</span>
        <h2 id="adjustment-title">O que precisa ser revisto?</h2>
        <p>Descreva o ponto que precisa mudar. O pedido fica vinculado a <strong>{selected.protocol || selected.title}</strong>.</p>
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
