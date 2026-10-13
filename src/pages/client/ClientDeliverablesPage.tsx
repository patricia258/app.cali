import { useEffect, useMemo, useRef, useState } from 'react';
import { complexityMeta, complexityRange, complexityClientNote } from '../../domain/projects';
import { AlertCircle, AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileCheck2, FileText, FolderKanban, History, Leaf, Loader2, MessageCircle, RefreshCw, Star, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
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
  todo: 'A fazer', not_started: 'Pendente', pending: 'Pendente', in_progress: 'Em andamento', doing: 'Em andamento',
  done: 'Concluída', completed: 'Concluída', standby: 'Em espera', cancelled: 'Cancelada',
};

const complexityCopy: Record<string, string> = { MC1: complexityMeta.MC1.description, MC2: complexityMeta.MC2.description, MC3: complexityMeta.MC3.description };
const complexityDays: Record<string, string> = { MC1: `Prazo estimado: ${complexityRange('MC1')}.`, MC2: `Prazo estimado: ${complexityRange('MC2')}.`, MC3: `Prazo estimado: ${complexityRange('MC3')}.` };

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
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const [companyId, setCompanyId] = useState('');
  const [reality, setReality] = useState<ClientDeliveryReality | null>(null);
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [projectTab, setProjectTab] = useState<'timeline' | 'deliverables' | 'history'>('timeline');
  const [closedSubs, setClosedSubs] = useState<Record<string, boolean>>({});
  const [expandedFronts, setExpandedFronts] = useState<Record<string, boolean>>({});
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
  const [loading, setLoading] = useState(true);
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
    if (!supabase) return;
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
    if (!selected) {
      setMessages([]);
      return;
    }
    void loadConversation(selected.id);
    return subscribeClientDeliverableConversation(selected.id, () => void loadConversation(selected.id, false));
  }, [selected?.id]);

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
    if (!companyId) return;
    try {
      applyReality(await loadClientDeliveryReality(companyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar os dados.');
    }
  }

  async function loadConversation(deliverableId: string, showLoading = true) {
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
      await sendClientDeliverableMessage(selected.id, body);
      await loadConversation(selected.id, false);
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
      if (!supabase) throw new Error('Serviço indisponível. Tente novamente em instantes.');
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
      if (!supabase) throw new Error('Serviço indisponível. Tente novamente em instantes.');
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
    if (!supabase) return;
    if (document.storagePath) {
      const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(document.storagePath, 300);
      if (signedError || !data?.signedUrl) { setError(signedError?.message || 'Não foi possível abrir o documento.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando cronograma…</section></Shell>;

  return <Shell role="client">
    <section className="v2-client-module" data-v2-operation="client-roadmap-page-v33">
      <div className="v4-projects">
        <div className="page-head" data-v2-operation="client-roadmap-heading-v33"><div><div className="eyebrow">ÁREA DA EMPRESA / EXECUÇÃO</div><h1>Projetos<span className="title-dot">.</span></h1><p>Execução, planejamento e acompanhamento da assessoria em um só lugar.</p></div></div>
        {reality && project && <div className="dv-toolbar"><label data-v2-operation="client-project-picker-v33"><strong>Projeto · </strong><select aria-label="Projeto" value={project?.id || ''} onChange={(event) => { setProjectId(event.target.value); closeDeliverable(); }}>{reality.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span>{project.protocol || reality.company.displayName}</span></div>}
        {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
        {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}
        {reality && project && <div data-v2-operation="client-roadmap-table-v33">
          <div className="v2-project-tabs" role="tablist" aria-label="Seções do projeto">{([['timeline','Cronograma'],['deliverables','Entregáveis'],['history','Histórico']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={projectTab===id} className={projectTab===id?'current':''} onClick={()=>setProjectTab(id)}>{label}</button>)}</div>
          {projectDeliverables.some(item=>item.status==='client_review') && <div className="dv-next-action v2-project-attention"><AlertCircle size={16}/><div><strong>Há uma validação aguardando você</strong><p>{projectDeliverables.find(item=>item.status==='client_review')!.title} · sua análise define se seguimos para publicação ou para uma nova versão.</p></div><button type="button" onClick={()=>openDeliverable(projectDeliverables.find(item=>item.status==='client_review')!)}>Abrir entrega <ArrowRight size={13}/></button></div>}
          {projectTab==='timeline' && (()=>{const dated=projectDeliverables.map(item=>item.dueAt?Date.parse(item.dueAt):NaN).filter(value=>!Number.isNaN(value));const start=Math.min(...dated),end=Math.max(...dated);const has=dated.length>0;const span=Math.max(86400000,end-start);const tone:Record<string,string>={approved:'green',client_review:'purple',internal_review:'purple',not_started:'red',adjustment_requested:'red',rebriefing:'red'};const tick=(value:number)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(value)).replace('.','');return <section className="wf-panel v2-project-timeline"><div className="v2-project-timeline-head"><small>CRONOGRAMA</small><h2>Prazos das entregas</h2><p>Cada entrega no ponto do período em que está prevista. Clique para abrir.</p></div>{projectDeliverables.length?<div className="ch-gantt" aria-label="Prazos e andamento das entregas"><div className="ch-gantt-header"><span>ENTREGA / STATUS</span><span>INÍCIO</span><span>MEIO</span><span>CONCLUSÃO</span></div><div className="ch-gantt-lanes">{[...projectDeliverables].sort((a,b)=>String(a.dueAt||'9').localeCompare(String(b.dueAt||'9'))).map(item=>{const due=item.dueAt?Date.parse(item.dueAt):NaN;const position=has&&!Number.isNaN(due)?Math.max(4,Math.min(84,(due-start)/span*100)):50;return <button type="button" className="ch-gantt-row" key={item.id} onClick={()=>openDeliverable(item)}><div className="ch-delivery-name"><strong>{item.title}</strong><small>{item.workstream||'Frente CALI'} · {statusLabel[item.status]}</small></div><div className="ch-gantt-track" aria-hidden="true">{!Number.isNaN(due)?<span className={`ch-milestone ${tone[item.status]||''}`} style={{left:`${position}%`}}>{formatDate(item.dueAt)}</span>:<span className="ch-undated">Prazo a definir</span>}</div></button>;})}</div>{has&&<div className="ch-gantt-foot" aria-hidden="true">{[start,start+span/2,end].map(value=><time key={value}>{tick(value)}</time>)}</div>}</div>:<p className="wf-empty">Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.</p>}</section>;})()}
          {projectTab==='history' && (()=>{const events=projectDeliverables.flatMap(item=>item.history.map(entry=>({...entry,title:item.title}))).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));return <section className="wf-panel v2-project-timeline"><div className="dv-history-intro"><History size={19}/><div><strong>Histórico do projeto</strong><p>Mudanças de situação das entregas compartilhadas, da mais recente para a mais antiga.</p></div></div>{events.length?<div className="dv-history-list">{events.map(entry=><div className="dv-history-row" key={entry.id}><span className={'dv-history-dot '+(entry.toStatus==='approved'?'green':entry.toStatus==='client_review'||entry.toStatus==='adjustment_requested'?'gold':'neutral')}/><div><time>{formatDateTime(entry.createdAt)}</time><strong>{entry.title}</strong><p>{entry.fromStatus?`${statusLabel[entry.fromStatus as ClientDeliveryStatus]||entry.fromStatus} → ${statusLabel[entry.toStatus as ClientDeliveryStatus]||entry.toStatus}`:statusLabel[entry.toStatus as ClientDeliveryStatus]||entry.toStatus}</p></div></div>)}</div>:<p className="dv-history-footnote">Ainda não há movimentações registradas neste projeto.</p>}</section>;})()}
          {projectTab==='deliverables' && <div className="dv"><header><div><small>ÁREA DA EMPRESA / PROJETOS</small><h1>Entregáveis</h1><p>Frentes contratadas, cronograma, arquivos e decisões em um só fluxo.</p></div></header>{fronts.length ? fronts.map((front,frontIndex)=>{
            const items=projectDeliverables.filter(item=>item.workstreamId===front.id || item.workstream===front.name);
            const expanded=expandedFronts[front.id]!==false;
            return <section className="dv-project" key={front.id}><div className="dv-project-title"><button type="button" className="dv-front-title dv-front-toggle" aria-expanded={expanded} onClick={()=>setExpandedFronts(current=>({...current,[front.id]:!expanded}))}><span className="dv-front-logo"><span className={`v2-brand-mark ${frontIndex%2?'lime':'oak'}`} aria-hidden="true"/></span><span className="dv-front-text"><small>{front.protocol || project.protocol || 'FRENTE CALI'}</small><strong>{front.name}</strong><em>{front.objective || `Frente contratada · clique para ${expanded?'recolher':'visualizar'} entregáveis`}</em></span>{expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button><div className="dv-months" style={{gridTemplateColumns:`repeat(${months.length},minmax(25px,1fr))`}}>{months.map(month=><span key={month} className={month>=(front.monthStart||1)&&month<=(front.monthEnd||front.monthStart||1)?'current':''}>M{month}</span>)}</div><span className="dv-count">{items.length} {items.length===1?'entregável':'entregáveis'}</span></div>{expanded && items.length > 0 && <div className="dv-row dv-head" aria-hidden="true"><span className="dv-square"/><span className="dv-title">Entregável</span><span className="dv-subcol">Subtarefas</span><span className="dv-mc">Complexidade</span><span className="dv-status">Situação</span><span className="dv-due">Prazo</span><span className="dv-subend"/></div>}{expanded && (items.length ? items.map(item=><button className="dv-row" key={item.id} onClick={() => openDeliverable(item)} aria-label={`Abrir ${item.title}`}><span className="dv-square">{item.isDocument?<FileText size={16}/>:<FolderKanban size={16}/>}</span><span className="dv-title"><strong>{item.title}</strong><small>{item.protocol || item.code || 'ENTREGÁVEL'}</small></span><span className="dv-subcol">{(item.visibleTasks || []).length > 0 ? <span role="button" tabIndex={0} className="dv-subbtn" aria-expanded={!closedSubs[item.id]} title={closedSubs[item.id] ? 'Mostrar subtarefas' : 'Recolher subtarefas'} onClick={(event) => { event.stopPropagation(); setClosedSubs((current) => ({ ...current, [item.id]: !current[item.id] })); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setClosedSubs((current) => ({ ...current, [item.id]: !current[item.id] })); } }}>{closedSubs[item.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}{item.visibleTasks.length} {item.visibleTasks.length === 1 ? 'subtarefa' : 'subtarefas'}</span> : '—'}</span><b className={`mc-chip dv-mc ${(item.complexity || 'MC1').toLowerCase()}`} data-tip={complexityCopy[item.complexity || 'MC1'] || ''}>{item.complexity || 'MC1'}</b><span className={`dv-status ${item.status==='client_review'?'d0':item.status==='not_started'?'d2':''}`}>{statusLabel[item.status]}</span><span className="dv-due">{formatDate(item.dueAt)}</span><ArrowRight size={15}/></button>).flatMap((row, index) => { const item = items[index]; const subs = item.visibleTasks || []; const closed = Boolean(closedSubs[item.id]); return [row,  ...(closed ? [] : subs).map((task) => <div className="dv-row dv-subrow" key={`${item.id}:${task.id}`}><span className="dv-subline" aria-hidden="true"/><span className="dv-title"><strong>{task.title}</strong><small>{task.protocol || 'SUBTAREFA'}</small></span><span className="dv-subcol"/>{task.complexity ? <b className={`mc-chip dv-mc ${task.complexity.toLowerCase()}`} data-tip={complexityCopy[task.complexity] || ''}>{task.complexity}</b> : <b className="dv-mc dv-mc-empty">—</b>}<span className={`dv-status ${task.status === 'client_review' ? 'd0' : task.status === 'todo' ? 'd2' : ''}`}>{task.status === 'todo' ? 'Programada' : task.status === 'client_review' ? 'Aguardando você' : ['done', 'approved', 'completed'].includes(task.status) ? 'Concluída' : 'Em andamento'}</span><span className="dv-due">{formatDate(task.dueAt)}</span><span className="dv-subend"/></div>)]; }) : <p className="wf-empty">Nenhum entregável compartilhado nesta frente ainda.</p>)}</section>;
          }):<p className="wf-empty">O cronograma ainda não possui frentes compartilhadas.</p>}</div>}
        </div>}
      </div>
    </section>

    {selected && <div className="v2-client-module v2-client-dialog"><div className="dv-overlay">
      <section className="dv-modal" role="dialog" aria-modal="true" aria-label={selected.title} data-v2-operation="deliverable-workspace-modal-v2">
        <header data-v2-operation="deliverable-workspace-header-v2">
          <div data-v2-operation="deliverable-title-v2"><small><span className="section-kicker">{selected.protocol || selected.code || 'ENTREGÁVEL'}</span> · {selected.complexity || 'MC1'}</small><h2>{selected.title}</h2><p>{selected.workstream || 'Frente CALI'} · {roadmapLabel(selected)}</p></div>
          <button aria-label="Fechar entrega" onClick={closeDeliverable}><X size={18} /></button>
        </header>

        <nav aria-label="Detalhes da entrega">{(['overview', 'conversation', 'history'] as DetailTab[]).map((tab) => <button key={tab} className={detailTab === tab ? 'selected' : ''} onClick={() => setDetailTab(tab)}>{tab === 'overview' ? 'Visão geral' : tab === 'tasks' ? 'Etapas' : tab === 'conversation' ? 'Conversas' : 'Histórico'}</button>)}</nav>

        {/* Os runtimes da conversa procuram a lista e o campo de resposta dentro de "conversation-pane-v2"; este invólucro (display: contents) reúne a área rolável e o campo fixo sem alterar a composição aprovada. */}
        <div className="dv-pane" data-v2-operation="conversation-pane-v2">
        <div className="dv-modal-content">
          {detailTab === 'overview' && <>
            <div className="dv-summary">
              <span><Clock3 size={14} /> Prazo <b>{formatDate(selected.dueAt)}</b></span>
              <span><CheckCircle2 size={14} /> Situação <b>{statusLabel[selected.status]}</b></span>
              <span><FileText size={14} /> Versão <b>{selected.document?.versionLabel || '—'}</b></span>
              <span><Leaf size={14} /> Frente de atuação <b>{selected.workstream || 'Frente CALI'}</b></span>
            </div>
            <div className="dv-overview-copy"><h3>Sobre esta entrega</h3>{selected.description && <p>{selected.description}</p>}<div className={`v2-mc-card ${(selected.complexity || 'MC1').toLowerCase()}`}><b className={`mc-chip ${(selected.complexity || 'MC1').toLowerCase()}`}>{selected.complexity || 'MC1'}</b><div><strong>{complexityCopy[selected.complexity || 'MC1'] || 'Complexidade definida pela CALI conforme volume de análise e dependências.'}</strong><span>{complexityDays[selected.complexity || 'MC1'] || ''}</span></div></div><p className="v2-mc-clientnote"><span aria-hidden="true">* </span>{complexityClientNote}</p>{selected.originalDueAt && selected.originalDueAt !== selected.dueAt && <p>Prazo original: {formatDate(selected.originalDueAt)}.</p>}</div>
            {selected.isDocument && <div className="dv-file"><FileText size={20} /><div><strong>{selected.document ? selected.document.title : 'Arquivo ainda não publicado'}</strong><small>{selected.document ? `${selected.document.versionLabel ? `Versão ${selected.document.versionLabel} · ` : ''}publicado em ${formatDateTime(selected.document.publishedAt)}` : 'Quando a versão compartilhável estiver pronta, ela aparecerá aqui e em Documentos.'}</small></div>{selected.document ? <button type="button" className="dv-file-open" onClick={() => void openPublishedDocument(selected.document!)}>Abrir</button> : <span className="dv-file-status">{statusLabel[selected.status]}</span>}</div>}
            {selected.feedback && <div className="dv-file"><Star size={20} /><div><strong>Sua avaliação: {selected.feedback.score}/5</strong><small>{selected.feedback.comment || 'Sem comentário adicional.'}</small></div></div>}
            {selected.status === 'client_review' && <div className="dv-next-action"><AlertCircle size={16} /><div><strong>O que precisa acontecer agora</strong><p>{selected.clientResponseDueAt ? `Revise esta entrega e responda até ${formatDateTime(selected.clientResponseDueAt)}.` : 'Revise esta entrega e escolha entre aprovar ou solicitar ajuste.'}</p></div></div>}
            {selected.status === 'adjustment_requested' && <div className="dv-next-action"><AlertCircle size={16} /><div><strong>Seu ajuste está com a CALI</strong><p>{selected.latestAdjustment?.reason || 'A nova versão voltará para sua validação assim que estiver pronta.'}</p></div></div>}
          </>}

          {detailTab === 'tasks' && (() => { const done = selected.visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)); const total = selected.visibleTasks.length; const current = selected.visibleTasks.find((task) => !['done', 'completed'].includes(task.status)); const percent = total ? Math.round(done.length / total * 100) : 0; return <>
            <div className="dv-progress-head"><div><small>ANDAMENTO DA ENTREGA</small><h3>{total ? `${done.length} de ${total} ${total === 1 ? 'etapa concluída' : 'etapas concluídas'}` : 'Nenhuma etapa compartilhada'}</h3><p>{current ? `Etapa atual: ${current.title}` : total ? 'Todas as etapas compartilhadas foram concluídas.' : 'Aqui aparecem as etapas que a CALI define como visíveis para você.'}</p></div><b>{total ? `${percent}%` : '—'}</b></div>
            <div className="dv-progress-track"><span style={{ width: `${percent}%` }} /></div>
            {total > 0 && <div className="dv-steps">{selected.visibleTasks.map((task, index) => { const isDone = ['done', 'completed'].includes(task.status); const isCurrent = task.id === current?.id; return <div className={'dv-step ' + (isCurrent ? 'current' : '')} key={task.id}><span className={'dv-step-mark ' + (isDone ? 'done' : '')}>{isDone ? <Check size={15} /> : String(index + 1).padStart(2, '0')}</span><div><strong>{task.title}</strong><p>{[task.protocol, task.dueAt ? `prazo ${formatDate(task.dueAt)}` : ''].filter(Boolean).join(' · ') || 'Etapa compartilhada pela CALI'}</p></div><span className={'dv-step-state ' + (isCurrent ? 'attention' : '')}>{taskStatusLabel[task.status] || task.status}</span></div>; })}</div>}
            <div className="dv-next-action"><AlertCircle size={16} /><div><strong>Próxima ação</strong><p>{selected.status === 'client_review' ? 'Revisar a entrega e registrar sua devolutiva: aprovar, pedir ajuste ou conversar.' : 'Acompanhar o andamento e conversar com a CALI se precisar.'}</p></div><button type="button" onClick={() => setDetailTab('conversation')}>Conversar <ArrowRight size={13} /></button></div>
          </>; })()}

          {detailTab === 'conversation' && <section className="dv-conversation">
            <div className="dv-chat workspace-chat-list" data-v2-operation="conversation-list-v2" ref={conversationRef} aria-live="polite" />
          </section>}

          {detailTab === 'history' && <>
            <div className="dv-history-intro"><History size={19} /><div><strong>Histórico da entrega</strong><p>Registro cronológico de mudanças de situação, validações e decisões — diferente das mensagens da conversa.</p></div></div>
            {selected.history.length ? <div className="dv-history-list">{selected.history.map((item) => <div className="dv-history-row" key={item.id}><span className={'dv-history-dot ' + (item.toStatus === 'approved' ? 'green' : item.toStatus === 'client_review' || item.toStatus === 'adjustment_requested' ? 'gold' : 'neutral')} /><div><time>{formatDateTime(item.createdAt)}</time><strong>{statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}</strong><p>{item.fromStatus ? `${statusLabel[item.fromStatus as ClientDeliveryStatus] || item.fromStatus} → ${statusLabel[item.toStatus as ClientDeliveryStatus] || item.toStatus}` : 'Situação registrada.'}</p></div></div>)}</div> : <p className="dv-history-footnote">Ainda não há movimentações registradas para esta entrega.</p>}
          </>}
        </div>

        {detailTab === 'conversation' && <div className="dv-reply dv-reply-fixed workspace-chat-compose" data-v2-operation="conversation-composer-v2">
          <div className="workspace-chat-runtime-pending-host" />
          <div className="workspace-chat-runtime-tools-host" />
          <textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Escreva sua mensagem sobre esta entrega..." onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void sendMessage(); }} />
          <div className="workspace-chat-send-actions"><button className="primary" onClick={() => void sendMessage()} disabled={sendingMessage || !messageDraft.trim()}>{sendingMessage ? <Loader2 className="spin" size={14} /> : null}Enviar <ArrowRight size={14} /></button></div>
        </div>}

        </div>

        <footer className="dv-actions">
          <span>{statusLabel[selected.status]}{selected.updatedAt ? ` · atualizado em ${formatDateTime(selected.updatedAt)}` : ''}</span>
          <div className="dv-action-buttons">
            {selected.status === 'client_review' && <><button className="dv-secondary" onClick={() => { setAdjustmentText(''); setAdjustmentOpen(true); }}><RefreshCw size={14} /> Solicitar ajuste</button><button className="dv-converse-bottom" onClick={() => { setScore(0); setNpsComment(''); setNpsOpen(true); }}><FileCheck2 size={14} /> Aprovar entrega</button></>}
            {selected.status !== 'client_review' && detailTab === 'overview' && <button className="dv-converse-bottom" onClick={() => setDetailTab('conversation')}><MessageCircle size={14} /> Conversar sobre esta entrega <ArrowRight size={14} /></button>}
          </div>
        </footer>
      </section>
    </div></div>}

    {adjustmentOpen && selected && <div className="v2-client-module v2-client-dialog"><div className="wf-overlay"><section className="wf-modal wf-create" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setAdjustmentOpen(false)}><X size={20} /></button><span className="section-kicker">SOLICITAR AJUSTE</span><h2>O que precisa ser revisto?</h2><p>Descreva o ponto que precisa mudar. O pedido fica vinculado a <strong>{selected.protocol || selected.title}</strong>.</p><textarea value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar este indicador por unidade antes da validação final." rows={5} autoFocus /><div className="v2-dialog-actions"><button className="secondary" onClick={() => setAdjustmentOpen(false)}>Cancelar</button><button className="primary" disabled={saving || adjustmentText.trim().length < 3} onClick={() => void submitAdjustment()}>{saving ? 'Registrando…' : 'Enviar ajuste'}</button></div></section></div></div>}

    {npsOpen && selected && <div className="v2-client-module v2-client-dialog"><div className="wf-overlay"><section className="wf-modal wf-create v2-rating" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setNpsOpen(false)}><X size={20} /></button><span className="section-kicker">APROVAÇÃO DA ENTREGA</span><h2>Como foi esta entrega?</h2><p>Escolha sua nota, revise e só depois confirme.</p><div className="client-delivery-rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={score === value ? 'selected' : ''} onClick={() => setScore(value)}><Star size={21} fill={score === value ? 'currentColor' : 'none'} /><span>{value}</span></button>)}</div>{reaction && <div className={`client-delivery-score-reaction score-${score}`}><span>{reaction.emoji}</span><div><strong>{reaction.title}</strong><p>{reaction.copy}</p></div></div>}{score > 0 && <label className="stacked-label">{npsCommentRequired ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?'}<textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} placeholder={npsCommentRequired ? 'Sua justificativa ajuda a CALI a entender exatamente o que precisa melhorar.' : 'Opcional — deixe um comentário se quiser.'} /></label>}<button className="primary full" disabled={saving || score === 0 || (npsCommentRequired && npsComment.trim().length < 3)} onClick={() => void submitNps()}>{saving ? 'Confirmando…' : 'Confirmar aprovação e avaliação'}</button></section></div></div>}
  </Shell>;
}
