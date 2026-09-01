import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarDays, CheckCircle2, FileText, Filter, Loader2,
  MessageSquareText, Pencil, Plus, Search, Trash2, UsersRound, X,
} from 'lucide-react';
import { Shell, type Role } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type RecordType =
  | 'meeting' | 'occurrence' | 'decision' | 'request' | 'people_movement'
  | 'leadership' | 'risk' | 'context_change' | 'client_input' | 'cali_perception'
  | 'milestone' | 'other';

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
  meeting: 'Reunião',
  occurrence: 'Ocorrência',
  decision: 'Decisão',
  request: 'Solicitação',
  people_movement: 'Movimentação de pessoas',
  leadership: 'Liderança',
  risk: 'Risco',
  context_change: 'Mudança de contexto',
  client_input: 'Informação do cliente',
  cali_perception: 'Percepção CALI',
  milestone: 'Marco',
  other: 'Outro',
};

const clientTypes: RecordType[] = ['occurrence', 'people_movement', 'leadership', 'request', 'context_change', 'other'];
const adminTypes = Object.keys(typeLabels) as RecordType[];

function localDateTime(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}
function joinLines(value: unknown) {
  return Array.isArray(value) ? value.map(String).join('\n') : '';
}
function participantList(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}
function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date).replace('.', '');
}
function emptyForm(role: Role): FormState {
  return {
    companyId: '', projectId: '', eventId: '', type: role === 'admin' ? 'meeting' : 'occurrence',
    title: '', occurredAt: localDateTime(), visibility: role === 'admin' ? 'internal' : 'client',
    participants: '', summary: '', transcript: '', decisions: '', attentionPoints: '', nextActions: '',
    impactLevel: 'medium', includeInReport: true, requiresAction: false,
  };
}

function mapRecord(row: any): AccountRecordRow {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    eventId: row.event_id,
    protocol: row.protocol,
    type: row.record_type,
    title: row.title,
    occurredAt: row.occurred_at,
    visibility: row.visibility,
    sourceActor: row.source_actor,
    participants: Array.isArray(row.participants) ? row.participants.map((item: any) => typeof item === 'string' ? item : item?.name || item?.email || '').filter(Boolean) : [],
    summary: row.summary,
    transcript: row.transcript,
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    attentionPoints: Array.isArray(row.attention_points) ? row.attention_points.map(String) : [],
    nextActions: Array.isArray(row.next_actions) ? row.next_actions.map(String) : [],
    impactLevel: row.impact_level,
    includeInReport: Boolean(row.include_in_report),
    requiresAction: Boolean(row.requires_action),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function WorkspaceRecordsPage({ role }: { role: Role }) {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<AccountRecordRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [form, setForm] = useState<FormState>(() => emptyForm(role));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    document.body.classList.toggle('workspace-modal-open', editorOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen]);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      let resolvedCompanyId = '';
      if (role === 'admin') {
        const companyResult = await supabase.from('companies').select('id,display_name').neq('status', 'archived').order('display_name');
        if (companyResult.error) throw companyResult.error;
        const nextCompanies = (companyResult.data || []).map((row: any) => ({ id: row.id, name: row.display_name }));
        setCompanies(nextCompanies);
        resolvedCompanyId = companyId || nextCompanies[0]?.id || '';
      } else {
        const userResult = await supabase.auth.getUser();
        if (userResult.error) throw userResult.error;
        const profileResult = await supabase.from('profiles').select('company_id').eq('id', userResult.data.user?.id || '').maybeSingle();
        if (profileResult.error) throw profileResult.error;
        resolvedCompanyId = profileResult.data?.company_id || '';
      }
      setCompanyId(resolvedCompanyId);
      await loadContext(resolvedCompanyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os registros.');
    } finally {
      setLoading(false);
    }
  }

  async function loadContext(targetCompanyId: string) {
    if (!supabase || !targetCompanyId) return;
    const [recordResult, projectResult, eventResult] = await Promise.all([
      supabase.from('account_records').select('*').eq('company_id', targetCompanyId).order('occurred_at', { ascending: false }),
      supabase.from('projects').select('id,company_id,name').eq('company_id', targetCompanyId).neq('status', 'cancelled').order('name'),
      supabase.from('events').select('id,company_id,title,starts_at,event_type,cancelled_at').eq('company_id', targetCompanyId).is('cancelled_at', null).order('starts_at', { ascending: false }),
    ]);
    if (recordResult.error) throw recordResult.error;
    if (projectResult.error) throw projectResult.error;
    if (eventResult.error) throw eventResult.error;
    setRecords((recordResult.data || []).map(mapRecord));
    setProjects((projectResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, name: row.name })));
    setEvents((eventResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, title: row.title, startsAt: row.starts_at, type: row.event_type, cancelledAt: row.cancelled_at })));

    const eventParam = searchParams.get('event');
    if (eventParam && !editorOpen) {
      const found = (eventResult.data || []).find((row: any) => row.id === eventParam);
      if (found) openFromEvent({ id: found.id, companyId: found.company_id, title: found.title, startsAt: found.starts_at, type: found.event_type });
    }
  }

  async function changeCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    setLoading(true);
    try { await loadContext(nextCompanyId); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Falha ao trocar cliente.'); }
    finally { setLoading(false); }
  }

  const companyMap = useMemo(() => new Map(companies.map((item) => [item.id, item.name])), [companies]);
  const visible = useMemo(() => records.filter((record) => {
    if (typeFilter !== 'all' && record.type !== typeFilter) return false;
    if (query && !`${record.title} ${record.summary || ''} ${record.protocol || ''} ${typeLabels[record.type]}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [records, typeFilter, query]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm(role), companyId });
    setEditorOpen(true);
  }

  function openFromEvent(event: Event) {
    setEditing(null);
    setForm({
      ...emptyForm(role),
      companyId: event.companyId || companyId,
      eventId: event.id,
      type: 'meeting',
      title: event.title,
      occurredAt: localDateTime(new Date(event.startsAt)),
      visibility: role === 'admin' ? 'client' : 'client',
    });
    setEditorOpen(true);
  }

  function openEdit(record: AccountRecordRow) {
    if (role !== 'admin') return;
    setEditing(record);
    setForm({
      companyId: record.companyId,
      projectId: record.projectId || '',
      eventId: record.eventId || '',
      type: record.type,
      title: record.title,
      occurredAt: localDateTime(new Date(record.occurredAt)),
      visibility: record.visibility,
      participants: record.participants.join(', '),
      summary: record.summary || '',
      transcript: record.transcript || '',
      decisions: record.decisions.join('\n'),
      attentionPoints: record.attentionPoints.join('\n'),
      nextActions: record.nextActions.join('\n'),
      impactLevel: record.impactLevel,
      includeInReport: record.includeInReport,
      requiresAction: record.requiresAction,
    });
    setEditorOpen(true);
  }

  function selectEvent(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      setForm((current) => ({ ...current, eventId }));
      return;
    }
    setForm((current) => ({
      ...current,
      eventId,
      type: event.type === 'meeting' ? 'meeting' : current.type,
      title: current.title || event.title,
      occurredAt: localDateTime(new Date(event.startsAt)),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !form.companyId || !form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const payload = {
        company_id: form.companyId,
        project_id: form.projectId || null,
        event_id: form.eventId || null,
        record_type: form.type,
        title: form.title.trim(),
        occurred_at: new Date(form.occurredAt).toISOString(),
        visibility: role === 'client' ? 'client' : form.visibility,
        source_actor: role === 'client' ? 'client' : form.eventId ? 'calendar' : 'admin',
        participants: participantList(form.participants),
        summary: form.summary.trim() || null,
        transcript: form.transcript.trim() || null,
        decisions: lines(form.decisions),
        attention_points: lines(form.attentionPoints),
        next_actions: lines(form.nextActions),
        impact_level: form.impactLevel,
        include_in_report: form.includeInReport,
        requires_action: form.requiresAction,
        created_by: editing?.createdBy || userResult.data.user?.id || null,
        updated_at: new Date().toISOString(),
      };
      const result = editing
        ? await supabase.from('account_records').update(payload).eq('id', editing.id).select('id').single()
        : await supabase.from('account_records').insert(payload).select('id').single();
      if (result.error) throw result.error;
      setEditorOpen(false);
      setNotice(editing ? 'Registro atualizado.' : role === 'client' ? 'Ocorrência registrada e enviada à CALI.' : 'Registro adicionado à memória da conta.');
      await loadContext(form.companyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o registro.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: AccountRecordRow) {
    if (!supabase || role !== 'admin') return;
    if (!window.confirm(`Excluir “${record.title}”? O registro deixará de alimentar os relatórios.`)) return;
    const result = await supabase.from('account_records').delete().eq('id', record.id);
    if (result.error) setError(result.error.message);
    else {
      setNotice('Registro excluído.');
      await loadContext(record.companyId);
    }
  }

  if (loading && !records.length) {
    return <Shell role={role}><section className="page records-v12"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando memória da conta…</div></section></Shell>;
  }

  const allowedTypes = role === 'admin' ? adminTypes : clientTypes;

  return <Shell role={role}>
    <section className="page records-v12">
      <header className="records-v12-heading">
        <div>
          <span className="eyebrow">MEMÓRIA DA CONTA</span>
          <h1>{role === 'admin' ? 'Registros' : 'Ocorrências e contexto'}</h1>
          <p>{role === 'admin'
            ? 'Registre o que aconteceu com o cliente fora do fluxo de entregáveis: reuniões, decisões, mudanças de contexto, ocorrências e percepções. Esses registros alimentam a leitura executiva do mês.'
            : 'Conte à CALI acontecimentos que podem mudar prioridades, prazos ou decisões do trabalho. O registro fica associado ao mês em que aconteceu.'}</p>
        </div>
        <button className="primary" type="button" onClick={openNew}><Plus size={17} />{role === 'admin' ? 'Novo registro' : 'Registrar ocorrência'}</button>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      <section className="records-v12-toolbar panel">
        {role === 'admin' && <label><span>Cliente</span><select value={companyId} onChange={(event) => void changeCompany(event.target.value)}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>}
        <label className="records-v12-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registro ou protocolo" /></label>
        <label><Filter size={15} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as RecordType | 'all')}><option value="all">Todos os tipos</option>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</select></label>
      </section>

      {role === 'admin' && events.some((event) => event.type === 'meeting') && <section className="records-v12-calendar panel">
        <div><CalendarDays size={19} /><span><strong>Reuniões do calendário</strong><small>Transforme uma reunião em memória consultiva sem duplicar data, cliente ou horário.</small></span></div>
        <div className="records-v12-calendar-list">{events.filter((event) => event.type === 'meeting').slice(0, 4).map((event) => {
          const already = records.some((record) => record.eventId === event.id);
          return <button type="button" key={event.id} disabled={already} onClick={() => openFromEvent(event)}><span>{formatDateTime(event.startsAt)}</span><strong>{event.title}</strong><em>{already ? 'Registro criado' : 'Registrar reunião'}</em></button>;
        })}</div>
      </section>}

      <section className="records-v12-list">
        {visible.map((record) => <article className={`records-v12-card impact-${record.impactLevel}`} key={record.id}>
          <div className="records-v12-card-top">
            <div className="records-v12-type"><MessageSquareText size={16} /><span>{typeLabels[record.type]}</span></div>
            <div className="records-v12-badges">
              {record.requiresAction && <span className="action">ação necessária</span>}
              {record.includeInReport && <span>relatório</span>}
              {record.visibility === 'internal' && <span>interno</span>}
            </div>
          </div>
          <div className="records-v12-card-copy">
            <span>{formatDateTime(record.occurredAt)}{role === 'admin' && companyMap.get(record.companyId) ? ` · ${companyMap.get(record.companyId)}` : ''}</span>
            <h2>{record.title}</h2>
            {record.summary && <p>{record.summary}</p>}
          </div>
          {(record.decisions.length > 0 || record.attentionPoints.length > 0 || record.nextActions.length > 0) && <div className="records-v12-card-facts">
            {record.decisions.length > 0 && <div><strong>Decisões</strong><span>{record.decisions.slice(0, 2).join(' · ')}</span></div>}
            {record.attentionPoints.length > 0 && <div><strong>Atenção</strong><span>{record.attentionPoints.slice(0, 2).join(' · ')}</span></div>}
            {record.nextActions.length > 0 && <div><strong>Próximas ações</strong><span>{record.nextActions.slice(0, 2).join(' · ')}</span></div>}
          </div>}
          <footer><small>{record.protocol || 'Sem protocolo'} · origem {record.sourceActor === 'client' ? 'cliente' : record.sourceActor === 'calendar' ? 'calendário' : 'CALI'}</small>{role === 'admin' && <div><button type="button" onClick={() => openEdit(record)}><Pencil size={14} />Editar</button><button type="button" className="danger-text" onClick={() => void remove(record)}><Trash2 size={14} />Excluir</button></div>}</footer>
        </article>)}
        {!visible.length && <div className="panel records-v12-empty"><FileText size={28} /><div><strong>Nenhum registro neste recorte.</strong><span>{role === 'admin' ? 'Adicione reuniões, ocorrências ou contexto para aprofundar a leitura mensal.' : 'Quando algo relevante acontecer na empresa, registre aqui para a CALI considerar no trabalho.'}</span></div></div>}
      </section>
    </section>

    {editorOpen && <div className="modal-backdrop workspace-modal-backdrop records-v12-modal-backdrop"><form className="modal-card records-v12-modal" onSubmit={save} role="dialog" aria-modal="true">
      <button className="modal-close" type="button" onClick={() => setEditorOpen(false)}><X size={20} /></button>
      <header><span className="section-kicker">{editing ? 'EDITAR REGISTRO' : role === 'admin' ? 'NOVO REGISTRO' : 'NOVA OCORRÊNCIA'}</span><h2>{role === 'admin' ? 'Memória da conta' : 'O que aconteceu?'}</h2><p>{role === 'admin' ? 'O registro passa a compor a base interpretativa dos relatórios. Transcrição é opcional e fica preservada como fonte.' : 'Registre fatos que a CALI precisa conhecer para orientar o trabalho. Evite dados pessoais desnecessários.'}</p></header>
      <div className="records-v12-form">
        {role === 'admin' && <div className="records-v12-grid three">
          <label className="stacked-label">Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, projectId: '', eventId: '' }))}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
          <label className="stacked-label">Projeto<select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}><option value="">Sem projeto específico</option>{projects.filter((project) => project.companyId === form.companyId).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
          <label className="stacked-label">Reunião do calendário<select value={form.eventId} onChange={(event) => selectEvent(event.target.value)}><option value="">Sem evento vinculado</option>{events.filter((item) => item.companyId === form.companyId).map((item) => <option value={item.id} key={item.id}>{formatDateTime(item.startsAt)} · {item.title}</option>)}</select></label>
        </div>}
        <div className="records-v12-grid three">
          <label className="stacked-label">Tipo<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RecordType }))}>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</select></label>
          <label className="stacked-label">Data e horário<input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} /></label>
          <label className="stacked-label">Impacto<select value={form.impactLevel} onChange={(event) => setForm((current) => ({ ...current, impactLevel: event.target.value as FormState['impactLevel'] }))}><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></label>
        </div>
        <label className="stacked-label">Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={role === 'admin' ? 'Ex.: Reunião mensal de liderança / desligamento em posição crítica' : 'Ex.: Desligamento de gerente / mudança na equipe / nova necessidade'} /></label>
        <label className="stacked-label">Contexto / registro<textarea rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="O que aconteceu, por que importa e qual contexto a CALI precisa considerar?" /></label>
        {role === 'admin' && <>
          <label className="stacked-label">Pessoas envolvidas<input value={form.participants} onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))} placeholder="Nome ou e-mail, separados por vírgula" /></label>
          <label className="stacked-label">Transcrição / notas completas<textarea rows={8} value={form.transcript} onChange={(event) => setForm((current) => ({ ...current, transcript: event.target.value }))} placeholder="Cole aqui a transcrição da reunião ou notas detalhadas. Ela fica como fonte para a leitura executiva." /></label>
          <div className="records-v12-grid three textareas">
            <label className="stacked-label">Decisões<textarea rows={5} value={form.decisions} onChange={(event) => setForm((current) => ({ ...current, decisions: event.target.value }))} placeholder="Uma decisão por linha" /></label>
            <label className="stacked-label">Pontos de atenção<textarea rows={5} value={form.attentionPoints} onChange={(event) => setForm((current) => ({ ...current, attentionPoints: event.target.value }))} placeholder="Um ponto por linha" /></label>
            <label className="stacked-label">Próximas ações<textarea rows={5} value={form.nextActions} onChange={(event) => setForm((current) => ({ ...current, nextActions: event.target.value }))} placeholder="Uma ação por linha" /></label>
          </div>
          <div className="records-v12-options">
            <label><input type="checkbox" checked={form.includeInReport} onChange={(event) => setForm((current) => ({ ...current, includeInReport: event.target.checked }))} /><span>Pode alimentar o relatório do período</span></label>
            <label><input type="checkbox" checked={form.requiresAction} onChange={(event) => setForm((current) => ({ ...current, requiresAction: event.target.checked }))} /><span>Exige ação / acompanhamento</span></label>
            <label><input type="checkbox" checked={form.visibility === 'client'} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.checked ? 'client' : 'internal' }))} /><span>Compartilhar este registro com o cliente</span></label>
          </div>
        </>}
      </div>
      <footer><button className="secondary" type="button" onClick={() => setEditorOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving || !form.title.trim() || !form.companyId}>{saving ? <><Loader2 className="spin" size={16} />Salvando…</> : editing ? 'Salvar alterações' : 'Salvar registro'}</button></footer>
    </form></div>}
  </Shell>;
}

export function AdminRecordsPage() { return <WorkspaceRecordsPage role="admin" />; }
export function ClientRecordsPage() { return <WorkspaceRecordsPage role="client" />; }
