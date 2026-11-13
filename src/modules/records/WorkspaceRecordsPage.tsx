import { WorkflowPage } from '../../components/ds/WorkflowPage';
import { StatusBadge } from '../../components/ds/StatusBadge';
import { WorkflowDialogOverlay, WorkflowDialogForm, WorkflowDialogHeader, WorkflowDialogActions } from '../../components/ds/WorkflowDialog';
import { WorkspaceAdminPage } from '../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowControls, WorkflowSegments, WorkflowControlsAside } from '../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../components/ds/WorkflowHeading';
import { WorkflowList, WorkflowListRow } from '../../components/ds/WorkflowList';
import './record-drawer-motion.css';
import { z } from 'zod';
import { Button } from '../../components/ds/Button';
import { DialogFrame } from '../../components/ds/DialogFrame';
import { EmptyState } from '../../components/ds/EmptyState';
import { FieldLabel } from '../../components/ds/FieldLabel';
import { FilterSelect } from '../../components/ds/FilterSelect';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { WorkspaceToast } from '../../components/workspace/components/WorkspaceToast';
import { SensitiveDataNote } from '../../components/privacy/SensitiveDataNote';
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRecordDeepLink } from './hooks/useRecordDeepLink';
import { ArrowRight,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  MessageCircle, Pencil, Plus, Search, Trash2, X, UserPlus } from 'lucide-react';
import { confirmAction } from '../../components/feedback/workspaceDialogs';
import type { JsonObject, JsonValue } from '../../domain/json';
import { Shell, type Role } from '../../components/workspace/WorkspaceShell';
import { recordsAvailable } from '../../api/records/client';
import { postRecordMessage } from '../../api/records/conversation';
import { RecordConversation } from './conversation/RecordConversation';
import { useRefreshRecordMessages } from './conversation/hooks/useRefreshRecordMessages';
import type { RecordMessageReceipt } from './conversation/hooks/usePostRecordMessage';
import {
  changeRecordStatus, checkRecordExists, deleteInternalRecord, insertRecord, notifyRecordShared,
  readClientRecordCompany, readPartnerRecordTimer, readPendingRecordClosures, readRecord, readRecordAuthor,
  readRecordAuthors, readRecordCompanies, readRecordContext, readRecordEditorReferences, requestPartnerRecordClose,
  startPartnerRecordTimer, stopPartnerRecordTimer, subscribeWorkspaceRecords, updateRecord,
} from '../../api/records/workspace';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { CompanyConversationHistory } from './CompanyConversationHistory';
import { RecordOperations } from './components/RecordOperations';
import { RecordClosureAdminSummary } from './closure/components/RecordClosureAdminSummary';
import { RecordClosureClientActions } from './closure/components/RecordClosureClientActions';
import { RecordClosureClientHistory } from './closure/components/RecordClosureClientHistory';
import { RecordClosureDialogs } from './closure/components/RecordClosureDialogs';
import { useRecordClosureExperience } from './closure/hooks/useRecordClosureExperience';
import { AdditionalAccessDialog, type AdditionalAccessDraft } from './components/AdditionalAccessDialog';

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

type Company = { id: string; name: string; logo?: string | null; logoFallback?: string | null };
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
const archivedStatuses = new Set<WorkflowStatus>(['standby', 'completed', 'cancelled']);

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
const recordRowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  project_id: z.string().nullable(),
  event_id: z.string().nullable(),
  protocol: z.string().nullable(),
  record_type: z.enum(adminTypes),
  title: z.string(),
  occurred_at: z.string(),
  visibility: z.enum(['internal', 'client']),
  source_actor: z.enum(['admin', 'client', 'calendar', 'import']),
  participants: z.json(),
  summary: z.string().nullable(),
  transcript: z.string().nullable(),
  decisions: z.json(),
  attention_points: z.json(),
  next_actions: z.json(),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']),
  include_in_report: z.boolean(),
  requires_action: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  workflow_status: z.enum(Object.keys(workflowLabels) as WorkflowStatus[]).nullable(),
  last_activity_at: z.string().nullable(),
  closed_at: z.string().nullable(),
});

type RecordRow = z.infer<typeof recordRowSchema>;

function mapRecord(row: RecordRow): AccountRecordRow {
  return {
    id: row.id, companyId: row.company_id, projectId: row.project_id, eventId: row.event_id,
    protocol: row.protocol, type: row.record_type, title: row.title, occurredAt: row.occurred_at,
    visibility: row.visibility, sourceActor: row.source_actor,
    participants: Array.isArray(row.participants) ? row.participants.map((item: JsonValue) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return typeof item.name === 'string' && item.name ? item.name : typeof item.email === 'string' ? item.email : '';
      }
      return '';
    }).filter(Boolean) : [],
    summary: row.summary, transcript: row.transcript,
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    attentionPoints: Array.isArray(row.attention_points) ? row.attention_points.map(String) : [],
    nextActions: Array.isArray(row.next_actions) ? row.next_actions.map(String) : [],
    impactLevel: row.impact_level, includeInReport: Boolean(row.include_in_report), requiresAction: Boolean(row.requires_action),
    createdBy: row.created_by, createdAt: row.created_at, workflowStatus: row.workflow_status,
    lastActivityAt: row.last_activity_at, closedAt: row.closed_at,
  };
}
function statusLabel(status: WorkflowStatus | null | undefined, role: Role) {
  if (!status) return 'Memória';
  if (status === 'waiting_client' && role === 'client') return 'Aguardando você';
  return workflowLabels[status];
}

/* Moldura: a administradora e o cliente usam o Shell; a Equipe CALI já está dentro da própria moldura. */
function RecordsFrame({ staff, role, children }: { staff: boolean; role: Role; children: ReactNode }) { return staff ? <>{children}</> : <Shell role={role}>{children}</Shell>; }
/* `staff`: o Partner (Equipe CALI) usa esta mesma tela da administradora, com as funções "partner_*" do banco:
   conversa com o cliente e nota interna, Assumir / Aguardar cliente / Stand by / Retomar, cronômetro que vai para aprovação
   e "Enviar para aprovação da Patricia" no lugar de Finalizar. Sem criar, enriquecer ou excluir registros. */
export type StaffRecordsScope = { companies: Company[] };
export function StaffRecordsPage({ companies }: StaffRecordsScope) { return <WorkspaceRecordsPage role="admin" staff={{ companies }} />; }
const adminFilterClass = 'tw:h-[2.77rem] tw:min-w-0 tw:flex-[0_1_14.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:py-0 tw:pr-[2.15rem] tw:pl-[.85rem] tw:text-[.85rem] tw:text-[#322f2c]';
const actionBadgeClass = 'tw:inline-flex tw:items-center tw:rounded-[.38rem] tw:bg-[#fbe9ec] tw:px-[.54rem] tw:py-[.23rem] tw:align-middle tw:text-[.69rem] tw:font-bold tw:tracking-[.04em] tw:text-[#b7495d]';
const adminRecordColumns = 'tw:grid-cols-[2.62rem_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,.9fr)_minmax(0,1fr)_minmax(0,.9fr)_1.38rem]! tw:[@media(max-width:860px)]:grid-cols-[2.62rem_minmax(0,1fr)_1.38rem]!';
const adminRecordDetail = 'tw:[@media(max-width:860px)]:hidden!';
const recordDrawerFooter = 'tw:m-0 tw:flex tw:flex-none tw:items-center tw:justify-between tw:gap-[.62rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:px-[1.54rem] tw:py-[.92rem] tw:[@media(max-width:480px)]:flex-wrap';
const recordDrawerActions = 'tw:m-0 tw:flex tw:min-w-0 tw:items-center tw:gap-[.46rem]';
const recordDrawerButton = 'tw:inline-flex tw:min-h-[3.23rem] tw:flex-[0_1_auto] tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.62rem] tw:whitespace-nowrap tw:rounded-[.85rem] tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-[.69rem] tw:py-[.69rem] tw:text-[.81rem] tw:leading-[1.2] tw:font-bold tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-45';
const recordDrawerPrimary = `${recordDrawerButton} tw:border-cali-brand! tw:bg-cali-brand! tw:text-white!`;
const adminFormGrid = 'tw:grid tw:grid-cols-3! tw:gap-x-[1.08rem] tw:gap-y-[.92rem] tw:[@media(max-width:760px)]:grid-cols-1!';


export function WorkspaceRecordsPage({ role, staff }: { role: Role; staff?: StaffRecordsScope }) {
  const { user } = useWorkspaceAuth();
  const [staffPhotos, setStaffPhotos] = useState<Record<string, string>>({});
  const [staffTimer, setStaffTimer] = useState<{ id: string; startedAt: string } | null>(null); const [, staffTick] = useState(0); const [closeRequested, setCloseRequested] = useState<Record<string, boolean>>({});
  useEffect(() => { if (!staffTimer) return; const timer = window.setInterval(() => staffTick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [staffTimer]);
  const linkedRecordId = useRecordDeepLink();
  const refreshMessages = useRefreshRecordMessages(user?.id);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const deepLinkHandled = useRef('');
  const [records, setRecords] = useState<AccountRecordRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [reopenByRecord, setReopenByRecord] = useState<Record<string, 'pending'>>({});
  const [companyId, setCompanyId] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  // Administradora: visão de todas as empresas, agrupamento e listas recolhíveis.
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<'status' | 'company' | 'type' | 'none'>('status');
  const [actionOnly, setActionOnly] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const [groupLimit, setGroupLimit] = useState<Record<string, number>>({});
  const [form, setForm] = useState<FormState>(() => emptyForm(role));
  const [accessOpen, setAccessOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRecordRow | null>(null);
  const [selected, setSelected] = useState<AccountRecordRow | null>(null);
  const selectedRecordId = useRef('');
  useEffect(() => { selectedRecordId.current = selected?.id ?? ''; }, [selected?.id]);
  useEffect(() => {
    if (!staff || !selected?.id) return;
    const refresh = () => void staffLoadTimer(selected.id);
    window.addEventListener('cali-staff-timer-changed', refresh);
    return () => window.removeEventListener('cali-staff-timer-changed', refresh);
  }, [staff, selected?.id]);
  const [conversationOpen, setConversationOpen] = useState(false);
  const closure = useRecordClosureExperience({
    protocol: selected?.protocol,
    recordId: selected?.id,
    role,
    actorId: user?.id,
    workflowStatus: selected?.workflowStatus,
    enabled: !staff && conversationOpen,
    onRecordChanged: () => {
      if (selected) void refreshSelectedRecord(selected);
    },
  });
  const [statusSaving, setStatusSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  /* Avisos de confirmação aparecem num cartão flutuante e somem sozinhos. */
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer); }, [notice]);
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    document.body.classList.toggle('workspace-modal-open', editorOpen || conversationOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, conversationOpen]);
  useEffect(() => {
    const recordId = linkedRecordId;
    if (!recordId || !records.length || deepLinkHandled.current === recordId) return;
    const found = records.find((record) => record.id === recordId);
    if (!found) return;
    deepLinkHandled.current = recordId;
    void openRecord(found);
  }, [records, linkedRecordId]);
  useEffect(() => {
    if (!recordsAvailable || !companyId) return;
    const refresh = () => void loadContext(companyId).catch(() => setError('Não foi possível atualizar as ocorrências.'));
    const unsubscribe = subscribeWorkspaceRecords(companyId, role, refresh, (row) => {
      const parsed = recordRowSchema.safeParse(row);
      if (parsed.success) {
        const next = mapRecord(parsed.data);
        setRecords((current) => current.map((record) => record.id === next.id ? next : record));
        setSelected((current) => current?.id === next.id ? next : current);
      }
      refresh();
    });
    const refreshOnFocus = () => {
      refresh();
      const openedId = selectedRecordId.current;
      if (!openedId) return;
      void checkRecordExists(openedId).then((exists) => {
        if (!exists) setSelected((current) => current?.id === openedId ? null : current);
      });
    };
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      unsubscribe();
    };
  }, [companyId, role]);

  async function load() {
    if (!recordsAvailable) return;
    setLoading(true); setError('');
    try {
      const userId = user?.id || '';
      if (!userId) throw new Error('Sessão não encontrada.');
      let resolvedCompanyId = '';
      if (staff) {
        setCompanies(staff.companies);
        const people = await readRecordAuthors(true);
        if (people) {
          setAuthors(Object.fromEntries(people.map((row) => [row.id, row.full_name || ''])));
          const avatars = people.filter((row) => row.avatar_url).map(async (row) =>
            [row.id, (await resolveWorkspaceMedia(row.avatar_url, 3600)) || ''] as const);
          void Promise.all(avatars).then((list) => setStaffPhotos(Object.fromEntries(list.filter(([, url]) => url))));
        }
        setCloseRequested(await readPendingRecordClosures());
        resolvedCompanyId = companyId || 'all';
      } else if (role === 'admin') {
        setCompanies(await readRecordCompanies());
        const people = await readRecordAuthors(false);
        if (people) setAuthors(Object.fromEntries(people.map((row) => [row.id, row.full_name || ''])));
        resolvedCompanyId = companyId || 'all';
      } else {
        resolvedCompanyId = await readClientRecordCompany(userId);
      }
      setCompanyId(resolvedCompanyId);
      await loadContext(resolvedCompanyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os registros.');
    } finally { setLoading(false); }
  }

  async function loadContext(targetCompanyId: string) {
    if (!recordsAvailable || !targetCompanyId) return;
    const context = await readRecordContext(targetCompanyId, Boolean(staff));
    setMessageCounts(context.counts);
    setReopenByRecord(context.pendingReopens);
    setRecords(context.records.map(mapRecord));

    if (role === 'admin' && !staff) {
      const references = await readRecordEditorReferences(targetCompanyId);
      setProjects(references.projects);
      setEvents(references.events);
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
  const companyById = useMemo(() => new Map(companies.map((item) => [item.id, item])), [companies]);
  const visible = useMemo(() => records.filter((record) => {
    if (typeFilter !== 'all' && record.type !== typeFilter) return false;
    if (statusFilter !== 'all' && record.workflowStatus !== statusFilter) return false;
    if (actionOnly && !record.requiresAction) return false;
    if (query && !`${record.title} ${record.summary || ''} ${record.protocol || ''} ${companyMap.get(record.companyId) || ''} ${typeLabels[record.type]} ${record.workflowStatus ? workflowLabels[record.workflowStatus] : ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [records, typeFilter, statusFilter, query, actionOnly, companyMap]);
  const activeVisible = useMemo(() => visible.filter((record) => !record.workflowStatus || !archivedStatuses.has(record.workflowStatus)), [visible]);
  const archivedVisible = useMemo(() => visible.filter((record) => Boolean(record.workflowStatus && archivedStatuses.has(record.workflowStatus))), [visible]);
  const adminGroups = useMemo(() => {
    if (role !== 'admin') return [];
    const time = (record: AccountRecordRow) => new Date(record.lastActivityAt || record.occurredAt).getTime() || 0;
    const sorted = [...visible].sort((a, b) => Number(b.requiresAction) - Number(a.requiresAction) || time(b) - time(a));
    const isArchived = (record: AccountRecordRow) => Boolean(record.workflowStatus && archivedStatuses.has(record.workflowStatus));
    const make = (key: string, kicker: string, label: string, rows: AccountRecordRow[], closed = false) => ({ key: `${groupBy}:${key}`, kicker, label, rows, closed, action: rows.filter((record) => record.requiresAction).length });
    if (groupBy === 'none') return [make('all', 'TODAS', 'Ocorrências no recorte', sorted)];
    if (groupBy === 'status') {
      const order: [WorkflowStatus | 'memory', string, string, boolean][] = [['open', 'AGUARDAM A CALI', 'Abertas', false], ['in_progress', 'EM ATENDIMENTO', 'Em andamento', false], ['waiting_client', 'COM O CLIENTE', 'Aguardando cliente', false], ['memory', 'MEMÓRIA DA CONTA', 'Registros consultivos', true], ['standby', 'HISTÓRICO', 'Em stand by', true], ['completed', 'HISTÓRICO', 'Finalizadas', true], ['cancelled', 'HISTÓRICO', 'Canceladas', true]];
      return order.map(([status, kicker, label, closed]) => make(status, kicker, label, sorted.filter((record) => (record.workflowStatus || 'memory') === status), closed)).filter((group) => group.rows.length);
    }
    const buckets = new Map<string, AccountRecordRow[]>();
    for (const record of sorted) { const key = groupBy === 'company' ? record.companyId : record.type; buckets.set(key, [...(buckets.get(key) || []), record]); }
    return [...buckets.entries()].map(([key, rows]) => make(key, groupBy === 'company' ? 'EMPRESA' : 'TIPO', groupBy === 'company' ? (companyMap.get(key) || 'Empresa sem nome') : typeLabels[key as RecordType], rows, rows.every(isArchived)))
      .sort((a, b) => b.action - a.action || b.rows.filter((record) => !isArchived(record)).length - a.rows.filter((record) => !isArchived(record)).length || a.label.localeCompare(b.label));
  }, [role, visible, groupBy, companyMap]);

  // Pedido de acesso adicional: vira uma ocorrência do tipo "solicitação", com os dados da pessoa e a ciência das condições.
  async function requestAccess(access: AdditionalAccessDraft) {
    if (!recordsAvailable || !companyId) return;
    setError('');
    try {
      const userResult = await readRecordAuthor();
      if (userResult.error) throw userResult.error;
      const now = new Date();
      const body = ['Solicitação de acesso adicional ao CALI Workspace.', '', `Nome: ${access.name.trim()}`, `Cargo: ${access.job.trim() || 'não informado'}`, `E-mail: ${access.email.trim().toLowerCase()}`, `Telefone: ${access.phone.trim() || 'não informado'}`, access.notes.trim() ? `Observações: ${access.notes.trim()}` : '', '', `Ciência das condições registrada em ${formatDateTime(now.toISOString())}.`].filter((line, index, all) => line || all[index - 1]).join('\n');
      const result = await insertRecord({
        company_id: companyId, record_type: 'request', title: `Solicitação de acesso adicional — ${access.name.trim()}`.slice(0, 180), occurred_at: now.toISOString(),
        visibility: 'client', source_actor: 'client', participants: [], summary: body, decisions: [], attention_points: [], next_actions: [],
        impact_level: emptyForm(role).impactLevel, include_in_report: false, requires_action: true, created_by: userResult.data.user?.id || null,
        workflow_status: 'open', last_activity_at: now.toISOString(), updated_at: now.toISOString(),
      });
      if (result.error) throw result.error;
      const messageResult = await postRecordMessage(result.data.id, body);
      if (messageResult.error) throw messageResult.error;
      setAccessOpen(false);
      setNotice('Solicitação de acesso enviada à CALI.');
      await loadContext(companyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar a solicitação.');
    }
  }
  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm(role), companyId: companyId === 'all' ? (companies[0]?.id || '') : companyId });
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
    if (!recordsAvailable || !form.companyId || !form.title.trim()) return;
    setSaving(true); setError('');
    try {
      const userResult = await readRecordAuthor();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id || null;
      const conversational = form.visibility === 'client' && conversationalTypes.has(form.type);
      const payload: JsonObject = {
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
        const result = await updateRecord(editing.id, payload);
        if (result.error) throw result.error;
      } else {
        payload.created_by = userId;
        payload.workflow_status = conversational ? (role === 'client' ? 'open' : 'waiting_client') : null;
        payload.last_activity_at = new Date().toISOString();
        const result = await insertRecord(payload);
        if (result.error) throw result.error;
        recordId = result.data.id;
        if (conversational && form.summary.trim()) {
          const messageResult = await postRecordMessage(recordId, form.summary.trim());
          if (messageResult.error) throw messageResult.error;
        } else if (role === 'admin' && form.visibility === 'client') {
          await notifyRecordShared(form.companyId, userId, recordId, form.title.trim());
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
    if (!recordsAvailable || role !== 'admin' || record.workflowStatus) return;
    if (!await confirmAction(`Excluir “${record.title}”? O registro deixará de alimentar os relatórios.`)) return;
    const result = await deleteInternalRecord(record.id);
    if (result.error) setError(result.error.message);
    else { setNotice('Registro excluído.'); await loadContext(record.companyId); }
  }

  async function openRecord(record: AccountRecordRow) {
    if (!recordsAvailable) return;
    setSelected(record); setConversationOpen(true); setError('');
    if (staff) void staffLoadTimer(record.id);
  }

  async function refreshSelectedRecord(record: AccountRecordRow) {
    const { data } = await readRecord(record.id);
    if (data) setSelected((current) => current?.id === record.id ? mapRecord(data) : current);
    void refreshMessages(record.id);
    await loadContext(record.companyId);
  }

  async function openHistoryRecord(recordId: string) {
    if (!recordsAvailable) return;
    const { data, error: requestError } = await readRecord(recordId);
    if (requestError || !data) {
      setError('Ocorrência indisponível. Atualize o histórico.');
      return;
    }
    await openRecord(mapRecord(data));
  }

  async function onMessageSent(record: AccountRecordRow, result: RecordMessageReceipt, internal: boolean) {
    setSelected((current) => current?.id === record.id ? {
      ...current,
      workflowStatus: result?.workflow_status ?? current.workflowStatus,
      lastActivityAt: new Date().toISOString(),
      requiresAction: internal ? current.requiresAction : role === 'client',
    } : current);
    await loadContext(record.companyId);
  }

  async function staffRequestClose() {
    if (!recordsAvailable || !selected || !staff) return;
    setStatusSaving(true); setError('');
    const result = await requestPartnerRecordClose(selected.id);
    setStatusSaving(false);
    if (result.error) { setError(result.error.message || 'Não foi possível enviar para aprovação.'); return; }
    setCloseRequested((current) => ({ ...current, [selected.id]: true })); setNotice('Encerramento enviado para a Patricia aprovar.');
  }
  async function staffLoadTimer(recordId: string) {
    if (!recordsAvailable || !staff || !user?.id) return;
    setStaffTimer(null);
    const timer = await readPartnerRecordTimer(recordId, user.id);
    if (timer) setStaffTimer(timer);
  }
  async function staffToggleTimer() {
    if (!recordsAvailable || !selected || !staff) return; setError('');
    if (staffTimer) {
      const result = await stopPartnerRecordTimer(staffTimer.id);
      if (result.error) { setError(result.error.message || 'Não foi possível pausar o cronômetro.'); return; }
      const outcome = result.data as { discarded?: boolean; minutes?: number } | null;
      setStaffTimer(null); setNotice(outcome?.discarded ? 'Sessão com menos de 30 segundos: não foi registrada.' : `Sessão de ${outcome?.minutes} min enviada para aprovação da Patrícia.`);
    } else {
      const result = await startPartnerRecordTimer(selected.id);
      if (result.error) { setError(result.error.message || 'Não foi possível iniciar o cronômetro.'); return; }
      setStaffTimer({ id: String(result.data), startedAt: new Date().toISOString() });
    }
    window.dispatchEvent(new Event('cali-staff-timer-changed'));
  }

  async function changeStatus(status: WorkflowStatus) {
    if (!recordsAvailable || !selected || role !== 'admin') return;
    setStatusSaving(true); setError('');
    try {
      const result = await changeRecordStatus(selected.id, status, Boolean(staff));
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
    return <RecordsFrame staff={Boolean(staff)} role={role}><section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">Carregando ocorrências…</section></RecordsFrame>;
  }

  const allowedTypes = role === 'admin' ? adminTypes : clientTypes;
  const clientSegments: [WorkflowStatus | 'all', string][] = [
    ['all', 'Todas'], ['waiting_client', 'Aguardando você'], ['in_progress', 'Em acompanhamento'], ['completed', 'Concluídas'],
  ];
  const archiveFilterSelected = statusFilter !== 'all' && archivedStatuses.has(statusFilter);
  const showStaffTimer = Boolean(staff && selected?.workflowStatus && !['completed', 'cancelled'].includes(selected.workflowStatus));
  const clientConversationLocked = Boolean(role === 'client' && selected?.workflowStatus && archivedStatuses.has(selected.workflowStatus));
  const reopenPending = Boolean(selected && reopenByRecord[selected.id] === 'pending');

  function recordsTable(rows: AccountRecordRow[], emptyCopy: string) {
    return <WorkflowList className={`${role==='admin'?'v2-admin-records-list tw:m-0! tw:rounded-none! tw:border-0! tw:shadow-none!':''}`}><WorkflowListRow header className={`${role === 'admin' ? `${adminRecordColumns} ${adminRecordDetail}` : ''}`}>{role==='admin' && <span/>}<span>Protocolo / Assunto</span>{role==='admin' && <span>Aberta por</span>}<span>Tipo</span><span>Última atualização</span><span>Situação</span><span/></WorkflowListRow>{rows.map(record=><WorkflowListRow className={`${role === 'admin' ? adminRecordColumns : ''}`} key={record.id} role="button" tabIndex={0} onClick={() => void openRecord(record)} onKeyDown={event=>{if(event.target===event.currentTarget && (event.key==='Enter'||event.key===' ')){event.preventDefault();void openRecord(record)}}}>{role==='admin' && <RecordCompanyLogo company={companyById.get(record.companyId)} />}<span className={role === 'admin' ? 'tw:block!' : undefined}><small>{record.protocol || '—'}{role==='admin' && companyId==='all' && groupBy!=='company' && <em className="v2-record-company-name tw:ml-[.62rem] tw:inline-flex tw:items-center tw:rounded-[.38rem] tw:bg-[#f4e6d2] tw:px-[.54rem] tw:py-[.23rem] tw:align-middle tw:text-[.69rem] tw:font-bold tw:tracking-[.02em] tw:text-[#8a5a2b] tw:not-italic">{companyMap.get(record.companyId) || ''}</em>}{role==='admin' && record.requiresAction && <b className={`${actionBadgeClass} tw:ml-[.62rem]`}>Ação necessária</b>}</small><strong>{record.title}</strong>{record.summary && <small>{record.summary}</small>}</span>{role==='admin' && <span className={`v2-record-author tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem] tw:[&>small]:text-[.69rem] tw:[&>small]:text-[#a18e80] tw:[&>strong]:block! tw:[&>strong]:truncate tw:[&>strong]:text-[.85rem] tw:[&>strong]:font-semibold tw:[&>strong]:text-[#322f2c] ${adminRecordDetail}`}>{record.sourceActor==='client' ? <><strong>{(record.createdBy && authors[record.createdBy]) || 'Cliente'}</strong><small>Cliente</small></> : <><strong>{(record.createdBy && authors[record.createdBy]) || 'CALI'}</strong><small>{record.sourceActor==='calendar'?'CALI · pela agenda':record.sourceActor==='import'?'CALI · importado':'CALI'}</small></>}</span>}<span className={role === 'admin' ? adminRecordDetail : undefined}>{typeLabels[record.type]}</span><span className={role === 'admin' ? adminRecordDetail : undefined}>{formatDateTime(record.lastActivityAt || record.occurredAt)}<small className="tw:mt-[0.462rem] tw:flex tw:items-center tw:gap-[0.308rem] tw:text-[0.692rem]/[inherit] tw:text-[#a18e80]!"><MessageCircle size={12}/> {messageCounts[record.id] || 0} mensagens</small></span><span className={role === 'admin' ? adminRecordDetail : undefined}><StatusBadge variant="workflow" tone={record.workflowStatus==='completed'?'green':record.workflowStatus==='waiting_client'?'yellow':record.workflowStatus==='cancelled'?'red':record.workflowStatus==='open'?'blue':'purple'}>{statusLabel(record.workflowStatus, role)}</StatusBadge></span><button type="button" className="tw:grid tw:justify-self-end tw:place-items-center tw:border-0 tw:bg-transparent tw:p-0 tw:text-inherit" aria-label={`Abrir ${record.title}`} onClick={(event) => { event.stopPropagation(); void openRecord(record); }}><ChevronRight size={16}/></button></WorkflowListRow>)}{!rows.length && <EmptyState variant="workflow"><strong>Nenhuma ocorrência neste recorte.</strong><p>{emptyCopy}</p></EmptyState>}</WorkflowList>;
  }

  const Page = role === 'admin' ? WorkspaceAdminPage : 'div';
  const Content = role === 'admin' ? WorkspaceAdminContent : 'div';
  return <RecordsFrame staff={Boolean(staff)} role={role}><Page className={role === 'admin' ? 'v2-admin-records v2-client-module' : 'v2-client-module'}><Content className={role === 'client' ? 'tw:contents' : undefined}>
    <WorkflowPage as="section">
      {role==='client' && <WorkflowHeading><div><small>ÁREA DA EMPRESA / CANAL COM A CALI</small><h1>Ocorrências</h1><p>Uma conversa por assunto, com decisões e histórico no mesmo lugar.</p></div><div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="workflowSecondary" className="tw:border-[#dec9c3]! tw:px-[1.077rem]! tw:py-[0.769rem]! tw:font-bold!" type="button" onClick={() => { setError(''); setAccessOpen(true); }}><UserPlus size={15}/> Solicitar acesso</Button><Button variant="workflowPrimary" type="button" onClick={openNew}><Plus size={15}/> Nova ocorrência</Button></div></WorkflowHeading>}
      {role==='admin' && <WorkflowHeading className="tw:items-start"><div><small>{staff ? 'EQUIPE CALI / OCORRÊNCIAS' : 'BACKOFFICE / CALI RH'}</small><h1>Ocorrências</h1><p>{staff ? 'Solicitações das empresas que você atende.' : 'Solicitações dos clientes e memória consultiva de cada conta, com histórico no mesmo lugar.'}</p></div>{!staff && <div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="workflowPrimary" type="button" onClick={openNew}><Plus size={15}/> Novo registro</Button></div>}</WorkflowHeading>}

      {notice && <WorkspaceToast><CheckCircle2 size={18} /><span>{notice}</span></WorkspaceToast>}
      {error && <InlineNotice><AlertTriangle size={18} />{error}</InlineNotice>}

      <CompanyConversationHistory companyId={companyId} companies={companies} role={role} staff={Boolean(staff)}
        openRecord={(recordId) => void openHistoryRecord(recordId)} />

      <>
        <div className="tw:mb-[1.077rem] tw:flex tw:items-center tw:gap-[1.769rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#e8ded5] tw:px-[0.231rem] tw:pt-[0.385rem] tw:pb-[1.308rem] tw:text-[0.769rem]/[inherit] tw:text-[#81756c] tw:[&>span]:flex tw:[&>span]:items-center tw:[&>span]:gap-[0.538rem] tw:[&_strong]:text-[1.231rem]/[inherit] tw:[&_strong]:text-cali-brand tw:[@media(max-width:47.5rem)]:flex-wrap tw:[@media(max-width:47.5rem)]:gap-y-[0.462rem] tw:[@media(max-width:43.75rem)]:gap-x-[0.923rem]"><span><strong>{records.length}</strong> {records.length===1?'registro':'registros'}</span><span><i className="tw:inline-block tw:size-[0.615rem] tw:rounded-[0.231rem] tw:bg-[#e0b04d]"/>{records.filter(record=>record.workflowStatus==='waiting_client').length} {role==='admin'?'aguardando cliente':'aguardando você'}</span><span><i className="tw:inline-block tw:size-[0.615rem] tw:rounded-[0.231rem] tw:bg-[#9e84ce]"/>{records.filter(record=>record.workflowStatus==='open'||record.workflowStatus==='in_progress'||record.workflowStatus==='standby').length} em acompanhamento</span><span><i className="tw:inline-block tw:size-[0.615rem] tw:rounded-[0.231rem] tw:bg-[#43b68c]"/>{records.filter(record=>record.workflowStatus==='completed').length} {records.filter(record=>record.workflowStatus==='completed').length===1?'concluído':'concluídos'}</span></div>
        {role==='admin' ? <WorkflowControls className="v2-record-controls tw:flex tw:flex-nowrap! tw:items-center tw:gap-[.77rem] tw:[@media(max-width:1100px)]:flex-wrap!">
          <FilterSelect className={`v2-record-company ${adminFilterClass} tw:max-w-none! tw:flex-[0_1_16.92rem]! tw:font-semibold`} aria-label="Empresa" value={companyId} onChange={(event) => void changeCompany(event.target.value)}><option value="all">Todas as empresas</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</FilterSelect>
          <FilterSelect className={adminFilterClass} aria-label="Situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkflowStatus | 'all')}><option value="all">Todas as situações</option>{(Object.keys(workflowLabels) as WorkflowStatus[]).map((status) => <option value={status} key={status}>{statusLabel(status, role)}</option>)}</FilterSelect>
          <FilterSelect className={adminFilterClass} aria-label="Tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as RecordType | 'all')}><option value="all">Todos os tipos</option>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</FilterSelect>
          <FilterSelect className={adminFilterClass} aria-label="Agrupar por" value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}><option value="status">Agrupar por situação</option><option value="company">Agrupar por empresa</option><option value="type">Agrupar por tipo</option><option value="none">Sem agrupamento</option></FilterSelect>
          <button type="button" className="v2-record-toggle tw:inline-flex tw:h-[2.77rem] tw:flex-none tw:items-center tw:gap-[.54rem] tw:whitespace-nowrap tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.92rem] tw:text-[.85rem] tw:font-semibold tw:text-[#67574c] tw:aria-pressed:border-[#b7495d] tw:aria-pressed:bg-[#fbe9ec] tw:aria-pressed:text-[#b7495d]" aria-pressed={actionOnly} onClick={() => setActionOnly((current) => !current)}><i className="tw:inline-block tw:size-[0.615rem] tw:rounded-[0.231rem] tw:bg-[#b7495d]"/>Só com ação necessária</button>
          <label className="v2-record-search tw:ml-auto tw:flex tw:h-[2.77rem] tw:min-w-[12.31rem] tw:flex-[1_1_15.38rem] tw:items-center tw:gap-[.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.85rem] tw:text-[#9a8c83] tw:[@media(max-width:1100px)]:ml-0"><Search size={14} /><input className="tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-[.85rem] tw:text-[#322f2c] tw:outline-none" aria-label="Buscar ocorrências" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar assunto, protocolo ou empresa" /></label>
        </WorkflowControls> : <WorkflowControls>
          <WorkflowSegments>{clientSegments.map(([value,label])=><button type="button" key={value} className={statusFilter===value?'on':''} onClick={()=>setStatusFilter(value)}>{label}</button>)}</WorkflowSegments>
          <WorkflowControlsAside>
            <FilterSelect aria-label="Tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as RecordType | 'all')}><option value="all">Todos os tipos</option>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</FilterSelect>
            <FilterSelect aria-label="Situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkflowStatus | 'all')}><option value="all">Todas as situações</option>{(Object.keys(workflowLabels) as WorkflowStatus[]).map((status) => <option value={status} key={status}>{statusLabel(status, role)}</option>)}</FilterSelect>
            <Search size={14} /><input aria-label="Buscar ocorrências" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ocorrência..." />
          </WorkflowControlsAside>
        </WorkflowControls>}
      </>

      {role==='admin' ? <div className="v2-record-groups tw:mt-[1.23rem] tw:flex tw:flex-col tw:gap-[1.08rem]">
        {adminGroups.map((group) => { const open = groupOpen[group.key] ?? !group.closed; const limit = groupLimit[group.key] || 8; return <section className="v2-record-group tw:overflow-hidden tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white" key={group.key}>
          <button type="button" className="v2-record-group-head tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:gap-[.92rem] tw:border-0 tw:bg-[#fffdfb] tw:px-[1.23rem] tw:py-4 tw:text-left tw:aria-expanded:border-b tw:aria-expanded:border-solid tw:aria-expanded:border-[#efe7df]" aria-expanded={open} onClick={() => setGroupOpen((current) => ({ ...current, [group.key]: !open }))}>
            <span className="v2-record-group-chevron tw:grid tw:size-[1.85rem] tw:flex-none tw:place-items-center tw:rounded-[.46rem] tw:bg-[#f6f0eb] tw:text-cali-brand">{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
            <span className="v2-record-group-title tw:mr-auto tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem]"><small className="tw:text-[.69rem] tw:tracking-[.092rem] tw:text-[#ad8259]">{group.kicker}</small><strong className="tw:truncate tw:text-[1rem] tw:font-semibold tw:text-[#322f2c]">{group.label}</strong></span>
            <b className="v2-record-group-count tw:min-w-[2.31rem] tw:flex-none tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e7d7c8] tw:bg-[#f2e9e2] tw:px-[.69rem] tw:py-[.38rem] tw:text-center tw:text-[.85rem] tw:text-[#6d404c]">{group.rows.length}</b>
          </button>
          {open && recordsTable(group.rows.slice(0, limit), '')}
          {open && group.rows.length > limit && <button type="button" className="v2-record-more tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:border-t tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-[1.23rem] tw:py-[.85rem] tw:text-[.85rem] tw:font-bold tw:text-cali-brand" onClick={() => setGroupLimit((current) => ({ ...current, [group.key]: limit + 20 }))}>Mostrar mais {Math.min(20, group.rows.length - limit)} de {group.rows.length - limit}</button>}
        </section>; })}
        {!adminGroups.length && <EmptyState variant="workflow"><strong>Nenhuma ocorrência neste recorte.</strong><p>Altere os filtros ou adicione um novo registro.</p></EmptyState>}
      </div> : <>
      {!archiveFilterSelected && <>
        <div className="tw:mt-8 tw:mb-[1rem] tw:flex tw:items-center tw:justify-between tw:[&>div]:flex tw:[&>div]:flex-col tw:[&>div]:gap-[0.385rem] tw:[&_span]:text-[0.692rem]/[inherit] tw:[&_span]:tracking-[0.092rem] tw:[&_span]:text-[#ad8259] tw:[&_strong]:text-[1.077rem]/[inherit] tw:[&_strong]:font-semibold tw:[&>b]:rounded-[0.538rem] tw:[&>b]:border tw:[&>b]:border-solid tw:[&>b]:border-[#e7d7c8] tw:[&>b]:bg-[#f2e9e2] tw:[&>b]:px-[0.769rem] tw:[&>b]:py-[0.462rem] tw:[&>b]:text-[0.846rem]/[inherit] tw:[&>b]:text-[#6d404c]"><div><span>EM ACOMPANHAMENTO</span><strong>Suas solicitações ativas</strong></div><b>{activeVisible.length}</b></div>
        {recordsTable(activeVisible, 'Quando precisar falar com a CALI, sua solicitação aparecerá aqui com todo o histórico.')}
      </>}

      {archivedVisible.length > 0 && <>
        <div className="tw:mt-8 tw:mb-[1rem] tw:flex tw:items-center tw:justify-between tw:[&>div]:flex tw:[&>div]:flex-col tw:[&>div]:gap-[0.385rem] tw:[&_span]:text-[0.692rem]/[inherit] tw:[&_span]:tracking-[0.092rem] tw:[&_span]:text-[#ad8259] tw:[&_strong]:text-[1.077rem]/[inherit] tw:[&_strong]:font-semibold tw:[&>b]:rounded-[0.538rem] tw:[&>b]:border tw:[&>b]:border-solid tw:[&>b]:border-[#e7d7c8] tw:[&>b]:bg-[#f2e9e2] tw:[&>b]:px-[0.769rem] tw:[&>b]:py-[0.462rem] tw:[&>b]:text-[0.846rem]/[inherit] tw:[&>b]:text-[#6d404c] archived"><div><span>HISTÓRICO</span><strong>Finalizados, cancelados e em stand by</strong></div><b>{archivedVisible.length}</b></div>
        {recordsTable(archivedVisible, 'Os registros encerrados e em stand by ficam preservados aqui para consulta.')}
      </>}
      </>}
    </WorkflowPage>
    </Content>

    {conversationOpen && selected && <WorkflowDialogOverlay className="tw:justify-end! tw:p-0!" onMouseDown={(event) => { if (event.target === event.currentTarget) setConversationOpen(false); }}>
      <DialogFrame className={`wf-record-drawer tw:relative tw:ml-auto tw:flex tw:h-dvh tw:max-h-dvh tw:flex-col tw:overflow-hidden tw:bg-white tw:shadow-[-0.769rem_0_3.077rem_#0002] tw:w-[min(46.154rem,96vw)]! tw:max-w-[96vw]! tw:motion-safe:animate-[record-drawer-enter_.26s_cubic-bezier(.2,.7,.2,1)_backwards] ${role==='admin'?'v2-admin-record-drawer':''}`} data-v2-operation="records-v13-drawer" as="aside" aria-label={selected.title}>
        <header className={`tw:relative tw:z-7 tw:flex tw:items-start tw:justify-between tw:border-0 tw:border-b tw:border-solid tw:border-[#eee7e1] tw:bg-white tw:px-[1.85rem]! tw:pt-[1.38rem]! tw:pb-[1.08rem]!
          tw:[&_small]:text-[0.692rem]/[inherit] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.115rem] tw:[&_small]:text-[#a5866b]
          tw:[&_h2]:mt-[0.846rem] tw:[&_h2]:mb-0 tw:[&_h2]:text-[1.615rem]/[inherit] tw:[&_h2]:font-bold tw:[&_h2]:tracking-[-0.046rem] ${showStaffTimer ? 'tw:flex tw:items-start tw:gap-0' : ''}`}>
          <div className="tw:min-w-0 tw:flex-1"><small className={role === 'admin' && !staff ? 'tw:block tw:truncate tw:pr-[12.69rem]' : showStaffTimer ? 'tw:block tw:overflow-visible tw:leading-normal tw:whitespace-normal' : undefined}>{role==='admin'?'REGISTRO':'OCORRÊNCIA'}{selected.protocol ? ' · ' : ''}<span className="tw:inline tw:text-inherit tw:[font:inherit]">{selected.protocol || ''}</span></small><h2 className={role === 'admin' ? 'tw:mt-[1.69rem]!' : undefined}>{selected.title}</h2>{role==='admin' && <p className="tw:mt-[.46rem] tw:mb-0 tw:text-[.85rem] tw:text-[#857870]">{companyMap.get(selected.companyId) || ''}</p>}</div>
          {showStaffTimer && <button type="button" className={`tw:static! tw:mr-[.77rem] tw:ml-auto tw:inline-flex tw:h-[2.92rem] tw:w-auto! tw:min-w-0 tw:flex-none tw:cursor-pointer tw:items-center tw:gap-[.62rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-cali-brand tw:px-[1.08rem] tw:text-[.923rem] tw:font-bold tw:whitespace-nowrap tw:tabular-nums ${staffTimer ? 'tw:bg-white tw:text-cali-brand' : 'tw:bg-cali-brand tw:text-white'}`} onClick={() => void staffToggleTimer()}>{staffTimer ? <><span aria-hidden="true">❚❚</span> Pausar · {(() => { const total = Math.max(0, Math.floor((Date.now() - new Date(staffTimer.startedAt).getTime()) / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor(total % 3600 / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; })()}</> : <><span aria-hidden="true">▶</span> Iniciar</>}</button>}
          <button ref={drawerClose} type="button" className={`drawer-close tw:grid tw:size-[2.31rem] tw:flex-none tw:place-items-center tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#ece4dd] tw:bg-[#faf6f3] tw:p-0 tw:text-[#6b4d4a] ${showStaffTimer ? 'tw:static!' : ''}`} aria-label="Fechar" onClick={() => setConversationOpen(false)}><X size={18} /></button>
        </header>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee7e1] tw:px-[1.85rem] tw:py-[0.77rem] tw:text-[0.769rem]/[inherit] tw:text-[#8e8177]">
          {<><StatusBadge variant="workflow" tone={selected.workflowStatus==='completed'?'green':selected.workflowStatus==='waiting_client'?'yellow':selected.workflowStatus==='cancelled'?'red':selected.workflowStatus==='open'?'blue':'purple'}>{statusLabel(selected.workflowStatus, role)}</StatusBadge><span>{typeLabels[selected.type]}</span></>}
          <span>Atualizado {formatDateTime(selected.lastActivityAt || selected.occurredAt)}</span>
          {selected.requiresAction && role === 'admin' && <b className={`${actionBadgeClass} tw:ml-[.62rem]`}>Ação necessária</b>}
        </div>
        {role === 'client' ? (
          <details className="tw:group tw:mx-[1.692rem] tw:shrink-0 tw:border-0 tw:border-b tw:border-solid tw:border-[#eaded7] tw:px-[0.308rem] tw:pt-[0.769rem] tw:pb-[0.923rem]">
            <summary className="tw:flex tw:cursor-pointer tw:list-none tw:items-center tw:gap-[0.615rem] tw:text-[0.846rem]/[inherit] tw:font-bold tw:text-[#6c4753] tw:[&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="tw:text-[1.385rem]/[inherit] tw:text-cali-gold tw:transition-transform tw:duration-180 tw:group-open:rotate-90 tw:motion-reduce:transition-none">›</span>
              Contexto inicial · ver detalhes
            </summary>
            <section className="tw:grid tw:gap-[.77rem] tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-[color-mix(in_srgb,var(--theme-surface)_96%,var(--theme-surface-soft))] tw:px-[1.54rem] tw:py-[.92rem]" aria-label="Resumo do atendimento">
              <RecordOperations key={selected.id} actorId={user?.id} protocol={selected.protocol ?? ''} recordId={selected.id} role={role} onDeleted={() => {
                setConversationOpen(false);
                setSelected(null);
                void loadContext(selected.companyId);
              }} />
            </section>
          </details>
        ) : (
          <section className="tw:m-0 tw:block tw:border-0 tw:bg-transparent tw:p-0" aria-label="Resumo do atendimento">
            {!staff && <>
              <RecordOperations key={selected.id} actorId={user?.id} protocol={selected.protocol ?? ''} recordId={selected.id} role={role} />
              <RecordClosureAdminSummary experience={closure} />
            </>}
          </section>
        )}

        {selected.workflowStatus ? <div className="tw:flex tw:min-h-0 tw:flex-[1_1_auto] tw:flex-col" data-v2-operation="records-v13-conversation">
          <h3 className="tw:mx-[1.85rem] tw:mt-[1.15rem] tw:mb-[.46rem] tw:flex-none tw:text-[.92rem] tw:font-bold tw:text-[#322f2c]">Conversa e encaminhamentos</h3>
          <RecordConversation
            key={selected.id}
            recordId={selected.id}
            companyId={selected.companyId}
            actorId={user?.id}
            role={role}
            partner={Boolean(staff)}
            authors={authors}
            staffPhotos={staffPhotos}
            locked={clientConversationLocked || ['completed', 'cancelled'].includes(selected.workflowStatus)}
            onSent={(result, internal) => onMessageSent(selected, result, internal)}
            onHistoryFocus={() => drawerClose.current?.focus()}
          />
          {role === 'client' && <RecordClosureClientHistory experience={closure} />}
          {clientConversationLocked && <div className="tw:m-0 tw:flex tw:flex-none tw:flex-col tw:items-center tw:justify-between tw:gap-[.92rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eee7e1] tw:bg-[color-mix(in_srgb,#b58c52_7%,var(--theme-surface))] tw:px-[1.85rem] tw:pt-[1.38rem] tw:pb-[1.54rem] tw:text-[.85rem] tw:text-[#655b57] tw:[@media(max-width:720px)]:items-stretch tw:[&>button]:min-h-[3.08rem] tw:[&>button]:flex-none tw:[&>button]:whitespace-nowrap tw:[@media(max-width:720px)]:[&>button]:w-full">
            <div className="tw:grid tw:min-w-0 tw:gap-[.31rem]"><span className="tw:text-[.69rem] tw:font-bold tw:tracking-[.1rem] tw:text-[#a4836f]">CONVERSA ENCERRADA</span><strong className="tw:my-[.31rem] tw:block tw:text-[.92rem] tw:text-[#322f2c]">{selected.workflowStatus === 'standby' ? 'Esta solicitação está em stand by.' : selected.workflowStatus === 'cancelled' ? 'Esta solicitação foi cancelada.' : 'Esta solicitação foi finalizada.'}</strong><p className="tw:m-0 tw:max-w-[44.62rem] tw:text-[.81rem] tw:leading-[1.6] tw:text-cali-muted">O histórico continua disponível, mas novas mensagens só são liberadas depois que a CALI aprovar a reabertura. O tempo já consumido permanece contabilizado e não é devolvido ao saldo de horas.</p></div>
            <RecordClosureClientActions experience={closure} />
          </div>}
        </div> : <div className="tw:min-h-[24.615rem] tw:overflow-auto tw:p-[1.846rem] tw:text-[0.923rem]/[1.7] tw:[&_span]:text-[0.769rem]/[inherit] tw:[&_span]:tracking-[0.054rem] tw:[&_span]:text-[#af8056] tw:[&_span]:uppercase">
          <div><span>Contexto</span><p>{selected.summary || 'Sem resumo registrado.'}</p></div>
          {selected.decisions.length > 0 && <div><span>Decisões</span><ul>{selected.decisions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {selected.attentionPoints.length > 0 && <div><span>Pontos de atenção</span><ul>{selected.attentionPoints.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {selected.nextActions.length > 0 && <div><span>Próximas ações</span><ul>{selected.nextActions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </div>}

        {staff && selected.workflowStatus && <footer className={recordDrawerFooter}>
          <div className={recordDrawerActions}>
            {selected.workflowStatus === 'open' && <Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Assumir</Button>}
            {selected.workflowStatus === 'in_progress' && <><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('waiting_client')}>Aguardar cliente</Button><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</Button></>}
            {selected.workflowStatus === 'waiting_client' && <><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Retomar</Button><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</Button></>}
            {selected.workflowStatus === 'standby' && <Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Retomar</Button>}
            {['in_progress', 'waiting_client', 'standby'].includes(selected.workflowStatus) && <Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving || closeRequested[selected.id]} onClick={() => void staffRequestClose()}>{closeRequested[selected.id] ? 'Aguardando a Patricia' : 'Enviar para aprovação da Patricia'}</Button>}
            {['completed', 'cancelled'].includes(selected.workflowStatus) && <span className="tw:text-[.923rem] tw:text-[#8c7e74]">Ocorrência encerrada. Só a Patricia pode reabrir.</span>}
          </div>
        </footer>}
        {role === 'admin' && !staff && <footer className={recordDrawerFooter}>
          <div className={recordDrawerActions}>
            {selected.workflowStatus === 'open' && <Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Assumir atendimento</Button>}
            {selected.workflowStatus === 'in_progress' && <><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('waiting_client')}>Aguardar cliente</Button><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</Button><Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving} onClick={() => void changeStatus('completed')}>Finalizar</Button></>}
            {selected.workflowStatus === 'waiting_client' && <><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>Retomar</Button><Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('standby')}>Stand by</Button><Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving} onClick={() => void changeStatus('completed')}>Finalizar</Button></>}
            {!closure.pendingReopen && selected.workflowStatus === 'standby' && <Button className={recordDrawerPrimary} variant="primary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>{reopenPending ? 'Aprovar reabertura' : 'Retomar'}</Button>}
            {!closure.pendingReopen && selected.workflowStatus && ['completed', 'cancelled'].includes(selected.workflowStatus) && <Button className={recordDrawerButton} variant="secondary" disabled={statusSaving} onClick={() => void changeStatus('in_progress')}>{reopenPending ? 'Aprovar reabertura' : 'Reabrir'}</Button>}
          </div>
          <div className={recordDrawerActions}>
            <Button className={`${recordDrawerButton} tw:border-[#b58c5261]! tw:bg-[#b58c520f]! tw:text-[#8a6426]!`} variant="secondary" type="button" onClick={() => { setConversationOpen(false); openEdit(selected); }}><Pencil size={14} />Salvar na memória da conta</Button>
            {!selected.workflowStatus && <button className={`${recordDrawerButton} tw:border-[#ecd0d5]! tw:text-[#b7495d]!`} type="button" onClick={() => void remove(selected)}><Trash2 size={14} />Excluir</button>}
          </div>
        </footer>}
        {!staff && <RecordClosureDialogs experience={closure} />}
      </DialogFrame>
    </WorkflowDialogOverlay>}

    {editorOpen && <WorkflowDialogOverlay><WorkflowDialogForm create aria-label="Registrar ocorrência" className={`${role==='admin'?'tw:w-[min(63.08rem,100%)]!':''}`} onSubmit={save}>
      {role === 'client' ? <>
        <WorkflowDialogHeader><span>NOVA OCORRÊNCIA</span><button type="button" onClick={() => setEditorOpen(false)} aria-label="Fechar"><X size={17} /></button></WorkflowDialogHeader>
        <h2>O que você precisa acompanhar?</h2>
        <p>Registre o contexto de forma objetiva. A equipe CALI avaliará e conduzirá os próximos passos conforme o serviço contratado.</p>
      </> : <>
        <WorkflowDialogHeader><span>{editing ? 'CONTEXTO CONSULTIVO' : 'NOVO REGISTRO'}</span><button type="button" onClick={() => setEditorOpen(false)} aria-label="Fechar"><X size={17} /></button></WorkflowDialogHeader>
        <h2>{editing ? 'Enriquecer memória da conta' : 'Registrar contexto'}</h2>
        <p>{editing ? 'Aqui entram interpretação, decisões e contexto para relatório. A conversa original permanece intacta.' : 'Registre um fato consultivo ou abra uma interação com o cliente.'}</p>
      </>}
      <div className="tw:flex tw:flex-col tw:gap-[1.154rem] tw:[&_label]:m-0 tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-[0.538rem]
        tw:[&_label]:text-[0.846rem]/[inherit] tw:[&_label]:font-semibold tw:[&_label]:text-[#665751]
        tw:[&_:is(input,select,textarea)]:h-auto tw:[&_:is(input,select,textarea)]:min-h-0 tw:[&_:is(input,select,textarea)]:w-full
        tw:[&_:is(input,select,textarea)]:rounded-[0.615rem] tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid
        tw:[&_:is(input,select,textarea)]:border-[#e9e0d8] tw:[&_:is(input,select,textarea)]:bg-white tw:[&_:is(input,select,textarea)]:p-[0.846rem]
        tw:[&_:is(input,select,textarea)]:font-cali-body tw:[&_:is(input,select,textarea)]:text-[0.846rem]/[inherit]
        tw:[&_:is(input,select,textarea)]:text-[#322f2c] tw:[&_:is(input,select,textarea)]:outline-cali-gold tw:[&_textarea]:h-[7.692rem] tw:[&_textarea]:resize-y">
        {role === 'admin' && <div className={`tw:grid tw:grid-cols-2 tw:gap-[1.154rem] tw:[@media(max-width:40.625rem)]:grid-cols-1 ${adminFormGrid}`}>
          <FieldLabel>Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, projectId: '', eventId: '' }))}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></FieldLabel>
          <FieldLabel>Projeto<select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}><option value="">Sem projeto específico</option>{projects.filter((project) => project.companyId === form.companyId).map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></FieldLabel>
          <FieldLabel>Reunião do calendário<select value={form.eventId} onChange={(event) => selectEvent(event.target.value)}><option value="">Sem evento vinculado</option>{events.filter((item) => item.companyId === form.companyId).map((item) => <option value={item.id} key={item.id}>{formatDateTime(item.startsAt)} · {item.title}</option>)}</select></FieldLabel>
        </div>}
        <div className={`tw:grid tw:grid-cols-2 tw:gap-[1.154rem] tw:[@media(max-width:40.625rem)]:grid-cols-1 ${role === 'admin' ? adminFormGrid : ''}`}>
          <FieldLabel>{role === 'client' ? 'Tipo de ocorrência' : 'Tipo'}<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RecordType }))}>{allowedTypes.map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}</select></FieldLabel>
          <FieldLabel>Data e horário<input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} /></FieldLabel>
          {role === 'admin' && <FieldLabel>Impacto<select value={form.impactLevel} onChange={(event) => setForm((current) => ({ ...current, impactLevel: event.target.value as FormState['impactLevel'] }))}><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></FieldLabel>}
        </div>
        <FieldLabel>{role === 'client' ? 'Assunto' : 'Título'}<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={role === 'admin' ? 'Ex.: Reunião mensal / mudança de prioridade' : 'Ex.: Revisão de responsabilidades'} /></FieldLabel>
        <FieldLabel>{role === 'admin' ? 'Contexto / registro' : 'Descreva a situação'}<textarea rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder={role === 'admin' ? 'Descreva com clareza o que aconteceu ou o que precisa ser acompanhado.' : 'Qual é o contexto, o que mudou e qual apoio você precisa?'} />{role !== 'admin' && <SensitiveDataNote />}</FieldLabel>
        {role === 'admin' && <>
          <FieldLabel>Pessoas envolvidas<input value={form.participants} onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))} placeholder="Nome ou e-mail, separados por vírgula" /></FieldLabel>
          <FieldLabel>Transcrição / notas completas<textarea rows={7} value={form.transcript} onChange={(event) => setForm((current) => ({ ...current, transcript: event.target.value }))} placeholder="Fonte completa para a leitura executiva, quando houver." /></FieldLabel>
          <div className={`tw:grid tw:grid-cols-2 tw:gap-[1.154rem] tw:[@media(max-width:40.625rem)]:grid-cols-1 ${adminFormGrid}`}>
            <FieldLabel>Decisões<textarea rows={4} value={form.decisions} onChange={(event) => setForm((current) => ({ ...current, decisions: event.target.value }))} placeholder="Uma decisão por linha" /></FieldLabel>
            <FieldLabel>Pontos de atenção<textarea rows={4} value={form.attentionPoints} onChange={(event) => setForm((current) => ({ ...current, attentionPoints: event.target.value }))} placeholder="Um ponto por linha" /></FieldLabel>
            <FieldLabel>Próximas ações<textarea rows={4} value={form.nextActions} onChange={(event) => setForm((current) => ({ ...current, nextActions: event.target.value }))} placeholder="Uma ação por linha" /></FieldLabel>
          </div>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-[1.69rem] tw:gap-y-[.77rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-[1.08rem] tw:py-[.92rem] tw:[&>label]:m-0 tw:[&>label]:inline-flex! tw:[&>label]:w-auto tw:[&>label]:flex-row! tw:[&>label]:items-center! tw:[&>label]:gap-[.62rem]! tw:[&>label]:text-[.85rem] tw:[&>label]:font-semibold tw:[&>label]:text-[#322f2c] tw:[&_input]:m-0 tw:[&_input]:size-[1.15rem]! tw:[&_input]:min-h-0! tw:[&_input]:flex-none tw:[&_input]:p-0! tw:[&_input]:accent-cali-brand">
            <label><input type="checkbox" checked={form.includeInReport} onChange={(event) => setForm((current) => ({ ...current, includeInReport: event.target.checked }))} /><span>Pode alimentar o relatório</span></label>
            <label><input type="checkbox" checked={form.requiresAction} onChange={(event) => setForm((current) => ({ ...current, requiresAction: event.target.checked }))} /><span>Exige acompanhamento</span></label>
            <label><input type="checkbox" checked={form.visibility === 'client'} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.checked ? 'client' : 'internal' }))} /><span>Compartilhar com o cliente</span></label>
          </div>
        </>}
      </div>
      {role === 'client' ? <WorkflowDialogActions><button type="button" onClick={() => setEditorOpen(false)}>Cancelar</button><Button variant="workflowPrimary" type="submit" disabled={saving || !form.title.trim() || !form.companyId}>{saving ? 'Enviando…' : <>Registrar ocorrência <ArrowRight size={14} /></>}</Button></WorkflowDialogActions> : <WorkflowDialogActions><button type="button" onClick={() => setEditorOpen(false)}>Cancelar</button><Button variant="workflowPrimary" type="submit" disabled={saving || !form.title.trim() || !form.companyId}>{saving ? 'Salvando…' : editing ? 'Salvar contexto' : 'Salvar registro'}</Button></WorkflowDialogActions>}
    </WorkflowDialogForm></WorkflowDialogOverlay>}

    {accessOpen && role === 'client' && <AdditionalAccessDialog available={Boolean(companyId)} error={error}
      onClose={() => setAccessOpen(false)} onRequest={requestAccess} />}
  </Page></RecordsFrame>;
}

function RecordCompanyLogo({ company }: { company?: Company }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let active = true; setSrc(''); void resolveWorkspaceMedia(company?.logo || company?.logoFallback, 86400).then((value) => { if (active) setSrc(value || ''); }); return () => { active = false; }; }, [company?.logo, company?.logoFallback]);
  return <span className="v2-record-logo tw:grid tw:size-[2.62rem] tw:flex-none tw:place-items-center tw:overflow-hidden tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:text-[.92rem] tw:font-extrabold tw:text-cali-brand" title={company?.name || ''}>{src ? <img className="tw:size-full tw:object-contain" src={src} alt={`Logo de ${company?.name || 'empresa'}`} onError={() => setSrc('')} /> : <span aria-hidden="true">{(company?.name || 'C').slice(0, 1)}</span>}</span>;
}

export function AdminRecordsPage() { return <WorkspaceRecordsPage role="admin" />; }
export function ClientRecordsPage() { return <WorkspaceRecordsPage role="client" />; }
