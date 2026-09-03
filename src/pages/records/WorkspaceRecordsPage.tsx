import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, FileText, Filter,
  MessageCircle, MessageSquareText, Pencil, Plus, Search, Send, Trash2, X,
} from 'lucide-react';
import { Shell, type Role } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type RecordType =
  | 'meeting' | 'occurrence' | 'decision' | 'request' | 'people_movement'
  | 'leadership' | 'risk' | 'context_change' | 'client_input' | 'cali_perception'
  | 'milestone' | 'other';

type WorkflowStatus = 'open' | 'in_progress' | 'waiting_client' | 'standby' | 'completed' | 'cancelled';

type AccountRecordRow = {
  id: string;
  companyId: string;
  projectId?: string | null;
  eventId?: string | null;
  protocol?: string | null;
  type: RecordType;
  title: string;
  occurredAt: string;
  visibility: 'internal' | 'client';
  sourceActor: 'admin' | 'client' | 'calendar' | 'import';
  participants: string[];
  summary?: string | null;
  transcript?: string | null;
  decisions: string[];
  attentionPoints: string[];
  nextActions: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  includeInReport: boolean;
  requiresAction: boolean;
  createdBy?: string | null;
  createdAt: string;
  workflowStatus?: WorkflowStatus | null;
  lastActivityAt?: string | null;
  closedAt?: string | null;
};

type ConversationMessage = {
  id: string;
  recordId: string;
  authorId?: string | null;
  authorRole: 'admin' | 'client' | 'system';
  body: string;
  visibility: 'client' | 'internal';
  createdAt: string;
};

type Company = { id: string; name: string };
type Project = { id: string; companyId: string; name: string };
type Event = { id: string; companyId?: string | null; title: string; startsAt: string; type: string; cancelledAt?: string | null };

type FormState = {
  companyId: string;
  projectId: string;
  eventId: string;
  type: RecordType;
  title: string;
  occurredAt: string;
  visibility: 'internal' | 'client';
  participants: string;
  summary: string;
  transcript: string;
  decisions: string;
  attentionPoints: string;
  nextActions: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  includeInReport: boolean;
  requiresAction: boolean;
};

const typeLabels: Record<RecordType, string> = {
  meeting: 'Reunião', occurrence: 'Ocorrência', decision: 'Decisão', request: 'Solicitação',
  people_movement: 'Movimentação de pessoas', leadership: 'Liderança', risk: 'Risco',
  context_change: 'Mudança de contexto', client_input: 'Informação do cliente',
  cali_perception: 'Percepção CALI', milestone: 'Marco', other: 'Outro',
};
const clientTypes: RecordType[] = ['occurrence', 'people_movement', 'leadership', 'request', 'context_change', 'other'];
const adminTypes = Object.keys(typeLabels) as RecordType[];
const conversationalTypes = new Set<RecordType>(['occurrence', 'request', 'context_change', 'other']);

const workflowLabels: Record<WorkflowStatus, string> = {
  open: 'Aberta', in_progress: 'Em andamento', waiting_client: 'Aguardando cliente',
  standby: 'Stand by', completed: 'Finalizada', cancelled: 'Cancelada',
};

function localDateTime(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function participantList(value: string) { return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean); }
function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}
function emptyForm(role: Role): FormState {
  return {
    companyId: '', projectId: '', eventId: '', type: role === 'admin' ? 'meeting' : 'occurrence',
    title: '', occurredAt: localDateTime(), visibility: role === 'admin' ? 'internal' : 'client',
    participants: '', summary: '', transcript: '', decisions: '', attentionPoints: '', nextActions: '',
    impactLevel: 'medium', includeInReport: role === 'admin', requiresAction: role === 'client',
  };
}
function mapRecord(row: any): AccountRecordRow {
  return {
    id: row.id, companyId: row.company_id, projectId: row.project_id, eventId: row.event_id,
    protocol: row.protocol, type: row.record_type, title: row.title, occurredAt: row.occurred_at,
    visibility: row.visibility, sourceActor: row.source_actor,
    participants: Array.isArray(row.participants) ? row.participants.map((item: any) => typeof item === 'string' ? item : item?.name || item?.email || '').filter(Boolean) : [],
    summary: row.summary, transcript: row.transcript,
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    attentionPoints: Array.isArray(row.attention_points) ? row.attention_points.map(String) : [],
    nextActions: Array.isArray(row.next_actions) ? row.next_actions.map(String) : [],
    impactLevel: row.impact_level, includeInReport: Boolean(row.include_in_report), requiresAction: Boolean(row.requires_action),
    createdBy: row.created_by, createdAt: row.created_at, workflowStatus: row.workflow_status,
    lastActivityAt: row.last_activity_at, closedAt: row.closed_at,
  };
}
function mapMessage(row: any): ConversationMessage {
  return { id: row.id, recordId: row.record_id, authorId: row.author_id, authorRole: row.author_role, body: row.body, visibility: row.visibility, createdAt: row.created_at };
}
function statusLabel(status: WorkflowStatus | null | undefined, role: Role) {
  if (!status) return 'Memória';
  if (status === 'waiting_client' && role === 'client') return 'Aguardando você';
  return workflowLabels[status];
}

export function WorkspaceRecordsPage({ role }: { role: Role }) {
  const [searchParams] = useSearchParams();
  const deepLinkHandled = useRef('');
  const [records, setRecords] = useState<AccountRecordRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [companyId, setCompanyId] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [form, setForm] = useState<FormState>(() => emptyForm(role));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRecordRow | null>(null);
  const [selected, setSelected] = useState<AccountRecordRow | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    document.body.classList.toggle('workspace-modal-open', editorOpen || conversationOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, conversationOpen]);
  useEffect(() => {
    const recordId = searchParams.get('record');
    if (!recordId || !records.length || deepLinkHandled.current === recordId) return;
    const found = records.find((record) => record.id === recordId);
    if (!found) return;
    deepLinkHandled.current = recordId;
    void openRecord(found);
  }, [records, searchParams]);

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id || '';
      let resolvedCompanyId = '';
      if (role === 'admin') {
        const companyResult = await supabase.from('companies').select('id,display_name').neq('status', 'archived').order('display_name');
        if (companyResult.error) throw companyResult.error;
        const nextCompanies = (companyResult.data || []).map((row: any) => ({ id: row.id, name: row.display_name }));
        setCompanies(nextCompanies);
        resolvedCompanyId = companyId || nextCompanies[0]?.id || '';
      } else {
        const profileResult = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
        if (profileResult.error) throw profileResult.error;
        resolvedCompanyId = profileResult.data?.company_id || '';
      }
      setCompanyId(resolvedCompanyId);
      await loadContext(resolvedCompanyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os registros.');
    } finally { setLoading(false); }
  }

  async function loadContext(targetCompanyId: string) {
    if (!supabase || !targetCompanyId) return;
    const recordResult = await supabase.from('account_records').select('*').eq('company_id', targetCompanyId).order('last_activity_at', { ascending: false, nullsFirst: false }).order('occurred_at', { ascending: false });
    if (recordResult.error) throw recordResult.error;
    const countResult = await supabase.from('account_record_messages').select('id,record_id').eq('company_id', targetCompanyId).is('deleted_at', null);
    if (countResult.error) throw countResult.error;
    const counts: Record<string, number> = {};
    for (const row of countResult.data || []) counts[row.record_id] = (counts[row.record_id] || 0) + 1;
    setMessageCounts(counts);
    setRecords((recordResult.data || []).map(mapRecord));

    if (role === 'admin') {
      const [projectResult, eventResult] = await Promise.all([
        supabase.from('projects').select('id,company_id,name').eq('company_id', targetCompanyId).neq('status', 'cancelled').order('name'),
        supabase.from('events').select('id,company_id,title,starts_at,event_type,cancelled_at').eq('company_id', targetCompanyId).is('cancelled_at', null).order('starts_at', { ascending: false }),
      ]);
      if (projectResult.error) throw projectResult.error;
      if (eventResult.error) throw eventResult.error;
      setProjects((projectResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, name: row.name })));
      setEvents((eventResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, title: row.title, startsAt: row.starts_at, type: row.event_type, cancelledAt: row.cancelled_at })));
    } else {
      setProjects([]); setEvents([]);
    }
  }

  async function changeCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId); setLoading(true); setConversationOpen(false); setSelected(null);
    try { await loadContext(nextCompanyId); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Falha ao trocar cliente.'); }
    finally { setLoading(false); }
  }

  const companyMap = useMemo(() => new Map(companies.map((item) => [item.id, item.name])), [companies]);
  const visible = useMemo(() => records.filter((record) => {
    if (typeFilter !== 'all' && record.type !== typeFilter) return false;
    if (statusFilter !== 'all' && record.workflowStatus !== statusFilter) return false;
    if (query && !`${record.title} ${record.summary || ''} ${record.protocol || ''} ${typeLabels[record.type]} ${record.workflowStatus ? workflowLabels[record.workflowStatus] : ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [records, typeFilter, statusFilter, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm(role), companyId });
    setEditorOpen(true);
  }
  function openFromEvent(event: Event) {
    setEditing(null);
    setForm({ ...emptyForm(role), companyId: event.companyId || companyId, eventId: event.id, type: 'meeting', title: event.title, occurredAt: localDateTime(new Date(event.startsAt)), visibility: 'client' });
    setEditorOpen(true);
  }
  function openEdit(record: AccountRecordRow) {
    if (role !== 'admin') return;
    setEditing(record);
    setForm({
      companyId: record.companyId, projectId: record.projectId || '', eventId: record.eventId || '', type: record.type,
      title: record.title, occurredAt: localDateTime(new Date(record.occurredAt)), visibility: record.visibility,
      participants: record.participants.join(', '), summary: record.summary || '', transcript: record.transcript || '',
      decisions: record.decisions.join('\n'), attentionPoints: record.attentionPoints.join('\n'), nextActions: record.nextActions.join('\n'),
      impactLevel: record.impactLevel, includeInReport: record.includeInReport, requiresAction: record.requiresAction,
    });
    setEditorOpen(true);
  }
  function selectEvent(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) { setForm((current) => ({ ...current, eventId })); return; }
    setForm((current) => ({ ...current, eventId, type: event.type === 'meeting' ? 'meeting' : current.type, title: current.title || event.title, occurredAt: localDateTime(new Date(event.startsAt)) }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !form.companyId || !form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id || null;
      const conversational = form.visibility === 'client' && conversationalTypes.has(form.type);
      const payload: Record<string, unknown> = {
        company_id: form.companyId, project_id: form.projectId || null, event_id: form.eventId || null,
        record_type: form.type, title: form.title.trim(), occurred_at: new Date(form.occurredAt).toISOString(),
        visibility: role === 'client' ? 'client' : form.visibility,
        source_actor: role === 'client' ? 'client' : form.eventId ? 'calendar' : 'admin',
        participants: participantList(form.participants), summary: form.summary.trim() || null, transcript: form.transcript.trim() || null,
        decisions: lines(form.decisions), attention_points: lines(form.attentionPoints), next_actions: lines(form.nextActions),
        impact_level: form.impactLevel, include_in_report: role === 'client' ? false : form.includeInReport,
        requires_action: role === 'client' ? true : form.requiresAction, updated_at: new Date().toISOString(),
      };
      let recordId = editing?.id || '';
      if (editing) {
        const result = await supabase.from('account_records').update(payload).eq('id', editing.id).select('id').single();
        if (result.error) throw result.error;
      } else {
        payload.created_by = userId;
        payload.workflow_status = conversational ? (role === 'client' ? 'open' : 'waiting_client') : null;
        payload.last_activity_at = new Date().toISOString();
        const result = await supabase.from('account_records').insert(payload).select('id').single();
        if (result.error) throw result.error;
        recordId = result.data.id;
        if (conversational && form.summary.trim()) {
          const messageResult = await supabase.rpc('post_account_record_message', { p_record_id: recordId, p_body: form.summary.trim(), p_internal: false });
          if (messageResult.error) throw messageResult.error;
        } else if (role === 'admin' && form.visibility === 'client') {
          await supabase.rpc('notify_workspace_movement', {
            p_company_id: form.companyId, p_actor_id: userId, p_target: 'client', p_notification_type: 'account_record_shared',
            p_title: 'Novo registro compartilhado pela CALI', p_body: form.title.trim(), p_entity_type: 'account_record', p_entity_id: recordId,
            p_action_url: `/cliente/registros?record=${recordId}`, p_relevance: 'normal', p_email_required: false,
          });
        }
      }
      setEditorOpen(false); setEditing(null);
      setNotice(editing ? 'Memória atualizada.' : role === 'client' ? 'Registro enviado à CALI.' : 'Registro adicionado à memória da conta.');
      await loadContext(form.companyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o registro.');
    } finally { setSaving(false); }
  }

  async function remove(record: AccountRecordRow) {
    if (!supabase || role !== 'admin' || record.workflowStatus) return;
    if (!window.confirm(`Excluir “${record.title}”? O registro deixará de alimentar os relatórios.`)) return;
    const result = await supabase.from('account_records').delete().eq('id', record.id);
    if (result.error) setError(result.error.message);
    else { setNotice('Registro excluído.'); await loadContext(record.companyId); }
  }

  async function openRecord(record: AccountRecordRow) {
    if (!supabase) return;
    setSelected(record); setConversationOpen(true); setMessageDraft(''); setMessages([]); setError('');
    const result = await supabase.from('account_record_messages').select('id,record_id,author_id,author_role,body,visibility,created_at').eq('record_id', record.id).is('deleted_at', null).order('created_at');
    if (result.error) { setError(result.error.message); return; }
    setMessages((result.data || []).map(mapMessage));
  }

  async function sendMessage() {
    if (!supabase || !selected || !messageDraft.trim()) return;
    setSendingMessage(true); setError('');
    try {
      const result = await supabase.rpc('post_account_record_message', { p_record_id: selected.id, p_body: messageDraft.trim(), p_internal: false });
      if (result.error) throw result.error;
      setMessageDraft('');
      const nextStatus = (result.data as any)?.workflow_status as WorkflowStatus | undefined;
      if (nextStatus) setSelected((current) => current ? { ...current, workflowStatus: nextStatus, lastActivityAt: new Date().toISOString(), requiresAction: role === 'client' } : current);
      await openRecord({ ...(selected as AccountRecordRow), workflowStatus: nextStatus || selected.workflowStatus, lastActivityAt: new Date().toISOString() });
      await loadContext(selected.companyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar a mensagem.');
    } finally { setSendingMessage(false); }
  }

  async function changeStatus(status: WorkflowStatus) {
    if (!supabase || !selected || role !== 'admin') return;
    setStatusSaving(true); setError('');
    try {
      const result = await supabase.rpc('set_account_record_status', { p_record_id: selected.id, p_status: status });
      if (result.error) throw result.error;
      const next = { ...selected, workflowStatus: status, lastActivityAt: new Date().toISOString(), closedAt: ['completed', 'cancelled'].includes(status) ? new Date().toISOString() : null };
      setSelected(next);
      setNotice(`Status atualizado para ${workflowLabels[status]}.`);
      await loadContext(selected.companyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível alterar o status.');
    } finally { setStatusSaving(false); }
  }

  if (loading && !records.length) {
    return <Shell role={role}><section className="page records-v13"><div className="cali-symbol-loading" aria-label="Carregando"><span className="cali-symbol-dot one" /><span className="cali-symbol-dot two" /><span className="cali-symbol-dot three" /></div></section></Shell>;
  }

  const allowedTypes = role === 'admin' ? adminTypes : clientTypes;
  const meetingEvents = events.filter((event) => event.type === 'meeting');

  return <Shell role={role}>
    <section className="page records-v13">
      <header className="records-v13-heading">
        <div>
          <span className="eyebrow">{role === 'admin' ? 'ACOMPANHAMENTO DA CONTA' : 'CANAL COM A CALI'}</span>
          <h1>{role === 'admin' ? 'Registros e solicitações' : 'Ocorrências e solicitações'}</h1>
          <p>{role === 'admin'
            ? 'Acompanhe solicitações, conversas e fatos relevantes da conta. O histórico operacional permanece separado da memória consultiva que alimenta relatórios.'
            : 'Registre uma situação, faça uma solicitação e acompanhe a conversa com a Patrícia sem perder o histórico.'}</p>
        </div>
        <button className="primary" type="button" onClick={openNew}><Plus size={17} />{role === 'admin' ? 'Novo registro' : 'Nova solicitação'}</button>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      <section className="records-v13-toolbar panel">
        {role === 'admin' && <label><span>Cliente</span><select value={companyId} onChange={(event) => void changeCompany(event.target.value)}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>}
        <label className="records-v13-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar assunto ou protocolo" /></label>
        <label><Filter size={15} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as RecordType | 'all')}><option value="all">Todos os tipos</option>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</select></label>
        <label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkflowStatus | 'all')}><option value="all">Todos os status</option>{(Object.keys(workflowLabels) as WorkflowStatus[]).map((status) => <option value={status} key={status}>{statusLabel(status, role)}</option>)}</select></label>
      </section>

      {role === 'admin' && meetingEvents.length > 0 && <section className="records-v13-calendar panel">
        <div><CalendarDays size={18} /><span><strong>Reuniões recentes</strong><small>Uma reunião pode virar memória consultiva sem duplicar data ou horário.</small></span></div>
        <div>{meetingEvents.slice(0, 3).map((event) => {
          const already = records.some((record) => record.eventId === event.id);
          return <button type="button" key={event.id} disabled={already} onClick={() => openFromEvent(event)}><span>{formatDateTime(event.startsAt)}</span><strong>{event.title}</strong><em>{already ? 'Registrada' : 'Registrar'}</em></button>;
        })}</div>
      </section>}

      <section className="records-v13-table-wrap panel">
        <table className="records-v13-table">
          <thead><tr>
            <th>Protocolo</th>{role === 'admin' && <th>Cliente</th>}<th>Assunto</th><th>Tipo</th><th>Status</th><th>Última atualização</th><th>Histórico</th><th aria-label="Ação" />
          </tr></thead>
          <tbody>
            {visible.map((record) => <tr key={record.id} onClick={() => void openRecord(record)} className={record.requiresAction && role === 'admin' ? 'needs-action' : ''}>
              <td data-label="Protocolo"><strong className="protocol-cell">{record.protocol || '—'}</strong></td>
              {role === 'admin' && <td data-label="Cliente">{companyMap.get(record.companyId) || '—'}</td>}
              <td data-label="Assunto"><div className="subject-cell"><strong>{record.title}</strong>{record.summary && <small>{record.summary}</small>}</div></td>
              <td data-label="Tipo">{typeLabels[record.type]}</td>
              <td data-label="Status"><span className={`record-status status-${record.workflowStatus || 'memory'}`}>{statusLabel(record.workflowStatus, role)}</span></td>
              <td data-label="Atualizado">{formatDateTime(record.lastActivityAt || record.occurredAt)}</td>
              <td data-label="Histórico"><span className="message-count"><MessageCircle size={14} />{messageCounts[record.id] || 0}</span></td>
              <td><button className="row-open" type="button" onClick={(event) => { event.stopPropagation(); void openRecord(record); }}>Abrir <ChevronRight size={14} /></button></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={role === 'admin' ? 8 : 7}><div className="records-v13-empty"><FileText size={26} /><div><strong>Nenhum registro neste recorte.</strong><span>{role === 'admin' ? 'Altere os filtros ou adicione um novo registro.' : 'Quando precisar falar com a CALI, sua solicitação aparecerá aqui com todo o histórico.'}</span></div></div></td></tr>}
          </tbody>
        </table>
      </section>
    </section>

    {conversationOpen && selected && <div className="records-v13-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConversationOpen(false); }}>
      <aside className="records-v13-drawer" role="dialog" aria-modal="true" aria-label={selected.title}>
        <header>
          <div><span className="section-kicker">{selected.protocol || 'MEMÓRIA DA CONTA'}</span><h2>{selected.title}</h2><p>{role === 'admin' ? companyMap.get(selected.companyId) || '' : typeLabels[selected.type]}{role === 'admin' ? ` · ${typeLabels[selected.type]}` : ''}</p></div>
          <button type="button" className="drawer-close" onClick={() => setConversationOpen(false)}><X size={20} /></button>
        </header>
        <div className="records-v13-drawer-meta">
          <span className={`record-status status-${selected.workflowStatus || 'memory'}`}>{statusLabel(selected.workflowStatus, role)}</span>
          <span>Atualizado {formatDateTime(selected.lastActivityAt || selected.occurredAt)}</span>
          {selected.requiresAction && role === 'admin' && <strong>Ação necessária</strong>}
        </div>

        {selected.workflowStatus ? <div className="records-v13-conversation">
          <div className="conversation-history">
            {messages.length === 0 ? <div className="conversation-empty"><MessageSquareText size={24} /><span>A conversa começa aqui.</span></div> : messages.map((message) => {
              const mine = message.authorRole === role;
              const internal = message.visibility === 'internal';
              const author = mine ? 'Você' : message.authorRole === 'admin' ? 'Patrícia · CALI' : message.authorRole === 'client' ? 'Cliente' : 'Sistema';
              return <div className={`conversation-line ${mine ? 'mine' : ''} ${internal ? 'internal' : ''}`} key={message.id}>
                <div className="conversation-bubble"><strong>{internal ? `${author} · nota interna` : author}</strong><p>{message.body}</p><small>{formatDateTime(message.createdAt)}</small></div>
              </div>;
            })}
          </div>
          {!['completed', 'cancelled'].includes(selected.workflowStatus) && <div className="conversation-compose">
            <textarea rows={3} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={role === 'admin' ? 'Responder ao cliente…' : 'Responder à Patrícia…'} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <button className="primary" type="button" disabled={sendingMessage || !messageDraft.trim()} onClick={() => void sendMessage()}><Send size={16} />{sendingMessage ? 'Enviando…' : 'Enviar'}</button>
          </div>}
        </div> : <div className="records-v13-memory-detail">
          <div><span>Contexto</span><p>{selected.summary || 'Sem resumo registrado.'}</p></div>
          {selected.decisions.length > 0 && <div><span>Decisões</span><ul>{selected.decisions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {selected.attentionPoints.length > 0 && <div><span>Pontos de atenção</span><ul>{selected.attentionPoints.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {selected.nextActions.length > 0 && <div><span>Próximas ações</span><ul>{selected.nextActions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </div>}

        {role === 'admin' && <footer className="records-v13-drawer-actions">
          <div className="status-actions">
            {selected.workflowStatus === 'open' && <button className="primary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Assumir</button>}
            {selected.workflowStatus === 'in_progress' && <><button className="secondary" disabled={statusSaving} onClick={() => void changeStatus('waiting_client')}>Aguardar cliente</button><button className="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</button><button className="primary" disabled={statusSaving} onClick={() => void changeStatus('completed')}>Finalizar</button></>}
            {selected.workflowStatus === 'waiting_client' && <><button className="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Retomar</button><button className="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</button><button className="primary" disabled={statusSaving} onClick={() => void changeStatus('completed')}>Finalizar</button></>}
            {selected.workflowStatus === 'standby' && <button className="primary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Retomar</button>}
            {selected.workflowStatus && ['completed', 'cancelled'].includes(selected.workflowStatus) && <button className="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Reabrir</button>}
          </div>
          <div className="memory-actions">
            <button className="secondary" type="button" onClick={() => { setConversationOpen(false); openEdit(selected); }}><Pencil size={14} />Enriquecer memória</button>
            {!selected.workflowStatus && <button className="danger-text" type="button" onClick={() => void remove(selected)}><Trash2 size={14} />Excluir</button>}
          </div>
        </footer>}
      </aside>
    </div>}

    {editorOpen && <div className="modal-backdrop workspace-modal-backdrop records-v13-modal-backdrop"><form className="modal-card records-v13-modal" onSubmit={save} role="dialog" aria-modal="true">
      <button className="modal-close" type="button" onClick={() => setEditorOpen(false)}><X size={20} /></button>
      <header>
        <span className="section-kicker">{editing ? 'CONTEXTO CONSULTIVO' : role === 'admin' ? 'NOVO REGISTRO' : 'NOVA SOLICITAÇÃO'}</span>
        <h2>{editing ? 'Enriquecer memória da conta' : role === 'admin' ? 'Registrar contexto' : 'Falar com a CALI'}</h2>
        <p>{editing ? 'Aqui entram interpretação, decisões e contexto para relatório. A conversa original permanece intacta.' : role === 'admin' ? 'Registre um fato consultivo ou abra uma interação com o cliente.' : 'Conte o que aconteceu ou o que você precisa. Depois do envio, a conversa continua no histórico.'}</p>
      </header>
      <div className="records-v13-form">
        {role === 'admin' && <div className="records-v13-grid three">
          <label className="stacked-label">Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, projectId: '', eventId: '' }))}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
          <label className="stacked-label">Projeto<select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}><option value="">Sem projeto específico</option>{projects.filter((project) => project.companyId === form.companyId).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
          <label className="stacked-label">Reunião do calendário<select value={form.eventId} onChange={(event) => selectEvent(event.target.value)}><option value="">Sem evento vinculado</option>{events.filter((item) => item.companyId === form.companyId).map((item) => <option value={item.id} key={item.id}>{formatDateTime(item.startsAt)} · {item.title}</option>)}</select></label>
        </div>}
        <div className={`records-v13-grid ${role === 'admin' ? 'three' : 'two'}`}>
          <label className="stacked-label">Tipo<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RecordType }))}>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</select></label>
          <label className="stacked-label">Data e horário<input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} /></label>
          {role === 'admin' && <label className="stacked-label">Impacto<select value={form.impactLevel} onChange={(event) => setForm((current) => ({ ...current, impactLevel: event.target.value as FormState['impactLevel'] }))}><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></label>}
        </div>
        <label className="stacked-label">Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={role === 'admin' ? 'Ex.: Reunião mensal / mudança de prioridade' : 'Ex.: Dúvida sobre o projeto / mudança na equipe'} /></label>
        <label className="stacked-label">{role === 'admin' ? 'Contexto / registro' : 'Mensagem / contexto'}<textarea rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Descreva com clareza o que aconteceu ou o que precisa ser acompanhado." /></label>
        {role === 'admin' && <>
          <label className="stacked-label">Pessoas envolvidas<input value={form.participants} onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))} placeholder="Nome ou e-mail, separados por vírgula" /></label>
          <label className="stacked-label">Transcrição / notas completas<textarea rows={7} value={form.transcript} onChange={(event) => setForm((current) => ({ ...current, transcript: event.target.value }))} placeholder="Fonte completa para a leitura executiva, quando houver." /></label>
          <div className="records-v13-grid three textareas">
            <label className="stacked-label">Decisões<textarea rows={4} value={form.decisions} onChange={(event) => setForm((current) => ({ ...current, decisions: event.target.value }))} placeholder="Uma decisão por linha" /></label>
            <label className="stacked-label">Pontos de atenção<textarea rows={4} value={form.attentionPoints} onChange={(event) => setForm((current) => ({ ...current, attentionPoints: event.target.value }))} placeholder="Um ponto por linha" /></label>
            <label className="stacked-label">Próximas ações<textarea rows={4} value={form.nextActions} onChange={(event) => setForm((current) => ({ ...current, nextActions: event.target.value }))} placeholder="Uma ação por linha" /></label>
          </div>
          <div className="records-v13-options">
            <label><input type="checkbox" checked={form.includeInReport} onChange={(event) => setForm((current) => ({ ...current, includeInReport: event.target.checked }))} /><span>Pode alimentar o relatório</span></label>
            <label><input type="checkbox" checked={form.requiresAction} onChange={(event) => setForm((current) => ({ ...current, requiresAction: event.target.checked }))} /><span>Exige acompanhamento</span></label>
            <label><input type="checkbox" checked={form.visibility === 'client'} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.checked ? 'client' : 'internal' }))} /><span>Compartilhar com o cliente</span></label>
          </div>
        </>}
      </div>
      <footer><button className="secondary" type="button" onClick={() => setEditorOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving || !form.title.trim() || !form.companyId}>{saving ? 'Salvando…' : editing ? 'Salvar contexto' : role === 'client' ? 'Enviar à CALI' : 'Salvar registro'}</button></footer>
    </form></div>}
  </Shell>;
}

export function AdminRecordsPage() { return <WorkspaceRecordsPage role="admin" />; }
export function ClientRecordsPage() { return <WorkspaceRecordsPage role="client" />; }
