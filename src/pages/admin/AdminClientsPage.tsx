import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Banknote,
  Ban,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FileCheck2,
  FolderKanban,
  History,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ClientProject = { name: string; status: string };
type AccountHistory = { title: string; detail: string; date: string };
type AccountTab = 'data' | 'contract' | 'financial' | 'operation' | 'history';
type RegistrationTab = 'data' | 'contract' | 'financial' | 'documents';
type LifecycleAction = 'pause' | 'archive' | 'close' | 'reactivate';

type ClientRow = {
  id: string;
  name: string;
  logoUrl?: string;
  status: 'active' | 'paused' | 'closed' | 'archived';
  createdAt?: string;
  closedAt?: string;
  contact: string;
  email: string;
  decisionTitle?: string;
  phone?: string;
  whatsapp?: string;
  service: string;
  segment?: string;
  contractedHours: number;
  hours: string;
  usage: number;
  nps: string;
  access: string;
  drive: string;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  addressStreet?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  hasBranches?: boolean;
  branches?: string[];
  contractValue?: number | null;
  billingFrequency?: string;
  paymentMethod?: string;
  billingStatus?: string;
  billingDay?: number | null;
  billingDueRule?: string;
  billingLeadDays?: number;
  financialNote?: string;
  penaltyEnabled?: boolean;
  penaltyText?: string;
  contractStatus?: string;
  contractDate?: string;
  responsibilities?: string[];
  projects?: ClientProject[];
  documents?: string[];
  history?: AccountHistory[];
};

type PortfolioMetrics = { active: number; joined: number; exited: number; net: number };

type LifecycleState = { type: LifecycleAction; client: ClientRow } | null;

const segments = [
  'Tecnologia',
  'Serviços',
  'Serviços corporativos',
  'Indústria',
  'Varejo',
  'Saúde',
  'Educação',
  'Logística e transportes',
  'Construção e engenharia',
  'Financeiro',
  'Alimentação e hospitalidade',
  'Outro',
];

const services = ['CALI Partner', 'CALI Full', 'Assessoria Estratégica Mensal', 'Mentoria para RH', 'Treinamento', 'Projeto de Estruturação', 'Solução personalizada'];

const previewClients: ClientRow[] = [
  {
    id: 'c1',
    name: 'Grupo Aurora',
    status: 'active',
    createdAt: '2026-05-12T10:00:00Z',
    contact: 'Marina Costa',
    email: 'marina@grupoaurora.com.br',
    decisionTitle: 'CEO',
    phone: '(41) 3333-2080',
    whatsapp: '(41) 99912-4080',
    service: 'Assessoria Estratégica Mensal',
    segment: 'Serviços corporativos',
    contractedHours: 30,
    hours: '24h10 / 30h',
    usage: 81,
    nps: '4,9',
    access: 'Ativo',
    drive: 'Não conectado',
    startDate: '2026-05-19',
    endDate: '2027-05-18',
    autoRenew: true,
    addressStreet: 'Av. Sete de Setembro',
    addressNumber: '2451',
    neighborhood: 'Água Verde',
    city: 'Curitiba',
    state: 'PR',
    hasBranches: true,
    branches: ['São José dos Pinhais · PR', 'Joinville · SC'],
    contractValue: 5800,
    billingFrequency: 'monthly',
    paymentMethod: 'pix',
    billingStatus: 'Em dia',
    billingDay: 1,
    billingDueRule: 'first_business_day',
    billingLeadDays: 3,
    financialNote: 'NF emitida antes da cobrança mensal.',
    penaltyEnabled: true,
    penaltyText: 'Multa contratual conforme cláusula de rescisão antecipada.',
    contractStatus: 'Ativo · contrato assinado',
    contractDate: '2026-05-19',
    responsibilities: ['Governança de RH e indicadores', 'Ritual mensal com liderança', 'Plano de ação de People e acompanhamento executivo'],
    projects: [
      { name: 'Estrutura de indicadores de People', status: 'Em andamento · 62%' },
      { name: 'Ritual de gestão com lideranças', status: 'Validação do cliente' },
    ],
    documents: ['Contrato assinado · 19/05/2026', 'Proposta comercial aprovada · v3'],
    history: [
      { title: 'Relatório mensal disponibilizado', detail: 'Agosto · horas, entregáveis e leitura executiva', date: '28 ago' },
      { title: 'Indicadores enviados para validação', detail: 'Projeto Estrutura de indicadores de People', date: '26 ago' },
      { title: 'Conta criada', detail: 'Contrato e acesso principal preparados', date: '19 mai' },
    ],
  },
  {
    id: 'c2',
    name: 'Novatech',
    status: 'active',
    createdAt: '2026-08-04T10:00:00Z',
    contact: 'Ricardo Martins',
    email: 'ricardo@novatech.com.br',
    decisionTitle: 'Diretor Executivo',
    phone: '(41) 3022-9180',
    whatsapp: '(41) 99808-7011',
    service: 'Assessoria Estratégica Mensal',
    segment: 'Tecnologia',
    contractedHours: 40,
    hours: '32h50 / 40h',
    usage: 82,
    nps: '4,7',
    access: 'Ativo',
    drive: 'Conectado',
    startDate: '2026-07-23',
    endDate: '2027-07-22',
    autoRenew: true,
    city: 'Curitiba',
    state: 'PR',
    hasBranches: false,
    branches: [],
    contractValue: 7200,
    billingFrequency: 'monthly',
    paymentMethod: 'boleto',
    billingStatus: 'Em dia',
    billingDay: 5,
    billingDueRule: 'fixed_day',
    billingLeadDays: 3,
    financialNote: 'Boleto mensal enviado ao financeiro.',
    contractStatus: 'Ativo · contrato + aditivo',
    contractDate: '2026-07-23',
    responsibilities: ['Estrutura de liderança', 'Indicadores e fóruns de gestão', 'Apoio ao RH em decisões críticas'],
    projects: [{ name: 'Governança de RH', status: 'Em andamento · 74%' }],
    documents: ['Contrato assinado · 23/07/2026', 'Aditivo de escopo · 12/08/2026'],
    history: [{ title: 'Aditivo anexado', detail: 'Ampliação de escopo da assessoria', date: '12 ago' }],
  },
  {
    id: 'c3',
    name: 'Studio Norte',
    status: 'active',
    createdAt: '2026-08-21T10:00:00Z',
    contact: 'Aline Rocha',
    email: 'aline@studionorte.com.br',
    decisionTitle: 'Sócia-diretora',
    service: 'Projeto de Estruturação',
    segment: 'Serviços',
    contractedHours: 20,
    hours: '11h25 / 20h',
    usage: 57,
    nps: '5,0',
    access: 'Ativo',
    drive: 'Não conectado',
    startDate: '2026-08-28',
    endDate: '2026-10-30',
    autoRenew: false,
    city: 'Pinhais',
    state: 'PR',
    hasBranches: false,
    branches: [],
    contractValue: 4500,
    billingFrequency: 'single',
    paymentMethod: 'pix',
    billingStatus: 'Pendente',
    billingDay: 30,
    billingDueRule: 'fixed_day',
    billingLeadDays: 3,
    financialNote: 'Segunda parcela prevista para 30/09.',
    contractStatus: 'Ativo · projeto pontual',
    contractDate: '2026-08-28',
    responsibilities: ['Estruturação de papéis', 'Rituais de gestão', 'Documentação de processos'],
    projects: [{ name: 'Estrutura organizacional', status: 'Em andamento · 41%' }],
    documents: ['Contrato assinado · 28/08/2026'],
    history: [{ title: 'Projeto iniciado', detail: 'Kick-off e abertura do cronograma', date: '28 ago' }],
  },
];

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { start: date(start), next: date(next), startIso: start.toISOString(), nextIso: next.toISOString() };
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function currencyToNumber(value: string) {
  const clean = value.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(clean || 0);
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}

function contractDuration(start?: string, end?: string) {
  if (!start || !end) return 'A definir';
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const months = Math.max(0, (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth());
  if (months < 1) return `${Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000))} dias`;
  if (months === 1) return '1 mês';
  if (months % 12 === 0) return months === 12 ? '1 ano' : `${months / 12} anos`;
  return `${months} meses`;
}

function paymentMethodLabel(value?: string) {
  return ({ pix: 'Pix', boleto: 'Boleto', transfer: 'Transferência', card: 'Cartão', other: 'Outra' } as Record<string, string>)[value || ''] || value || '—';
}

function frequencyLabel(value?: string) {
  return ({ monthly: 'Mensal', single: 'Única', quarterly: 'Trimestral', custom: 'Personalizada' } as Record<string, string>)[value || ''] || value || '—';
}

function dueRuleLabel(client: ClientRow) {
  if (client.billingDueRule === 'first_business_day') return '1º dia útil do mês';
  if (client.billingDueRule === 'last_business_day') return 'Último dia útil do mês';
  if (client.billingDueRule === 'custom') return 'Regra personalizada';
  return client.billingDay ? `Dia ${client.billingDay}` : 'A definir';
}

function statusLabel(status: ClientRow['status']) {
  return ({ active: 'Ativo', paused: 'Bloqueado', closed: 'Encerrado', archived: 'Arquivado' } as const)[status];
}

function RegistrationTabs({ active, onChange }: { active: RegistrationTab; onChange: (tab: RegistrationTab) => void }) {
  const tabs: Array<{ id: RegistrationTab; label: string }> = [
    { id: 'data', label: 'Dados cadastrais' },
    { id: 'contract', label: 'Contrato' },
    { id: 'financial', label: 'Financeiro' },
    { id: 'documents', label: 'Documentos' },
  ];
  return <div className="account-tabs compact-tabs" role="tablist">{tabs.map((tab) => <button type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? 'active' : ''} key={tab.id} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}

function AccountTabs({ active, onChange }: { active: AccountTab; onChange: (tab: AccountTab) => void }) {
  const tabs: Array<{ id: AccountTab; label: string }> = [
    { id: 'data', label: 'Dados cadastrais' },
    { id: 'contract', label: 'Contrato' },
    { id: 'financial', label: 'Financeiro' },
    { id: 'operation', label: 'Operação' },
    { id: 'history', label: 'Histórico' },
  ];
  return <div className="account-tabs" role="tablist">{tabs.map((tab) => <button type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? 'active' : ''} key={tab.id} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}

export function AdminClientsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [clients, setClients] = useState<ClientRow[]>(preview ? previewClients : []);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(preview ? { active: 3, joined: 2, exited: 1, net: 1 } : { active: 0, joined: 0, exited: 0, net: 0 });
  const [loading, setLoading] = useState(!preview);
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [registrationTab, setRegistrationTab] = useState<RegistrationTab>('data');
  const [manageOpen, setManageOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<AccountTab>('data');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [editDraft, setEditDraft] = useState<ClientRow | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleState>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');

  const [company, setCompany] = useState('');
  const [segment, setSegment] = useState('');
  const [segmentOther, setSegmentOther] = useState('');
  const [contact, setContact] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [service, setService] = useState('');
  const [hours, setHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('PR');
  const [hasBranches, setHasBranches] = useState(false);
  const [branchesText, setBranchesText] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [contractValue, setContractValue] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [billingDay, setBillingDay] = useState('');
  const [billingDueRule, setBillingDueRule] = useState('fixed_day');
  const [billingLeadDays, setBillingLeadDays] = useState('3');
  const [notes, setNotes] = useState('');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyText, setPenaltyText] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [addendumDate, setAddendumDate] = useState('');
  const [addendumFile, setAddendumFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);

  const empty = useMemo(() => !loading && clients.length === 0, [clients.length, loading]);
  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId) ?? null, [clients, selectedClientId]);
  const anyModalOpen = open || manageOpen || Boolean(lifecycle);

  useEffect(() => {
    if (!anyModalOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [anyModalOpen]);

  useEffect(() => () => { if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  async function resolveLogo(raw?: string | null) {
    if (!raw || !supabase) return raw || '';
    if (!raw.startsWith('private:')) return raw;
    const path = raw.slice('private:'.length);
    const { data } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }

  async function loadClients() {
    if (preview || !supabase) return;
    setLoading(true);
    setError('');
    const { start, next, startIso, nextIso } = monthBounds();
    const [companiesResult, invitesResult, profilesResult, hoursResult, npsResult, projectsResult, documentsResult, historyResult] = await Promise.all([
      supabase.from('companies').select('id, display_name, logo_url, status, service_type, monthly_hours_contracted, drive_folder_url, segment, decision_maker_title, start_date, end_date, contract_value, billing_frequency, payment_method, billing_status, billing_day, payment_notes, created_at, address_street, address_number, address_neighborhood, address_city, address_state, has_branches, branches, auto_renew, billing_due_rule, billing_lead_days, contract_penalty_enabled, contract_penalty_text, closed_at').order('created_at', { ascending: false }),
      supabase.from('client_invites').select('company_id, email, full_name, accepted_at, active, job_title, phone, whatsapp').eq('is_primary', true),
      supabase.from('profiles').select('company_id, active, role').eq('role', 'client'),
      supabase.from('hour_entries').select('company_id, minutes').gte('work_date', start).lt('work_date', next),
      supabase.from('nps_responses').select('company_id, score'),
      supabase.from('projects').select('company_id, name, status').order('updated_at', { ascending: false }),
      supabase.from('account_documents').select('company_id, title, document_date, document_type').order('created_at', { ascending: false }),
      supabase.from('activity_log').select('company_id, event_type, metadata, created_at').order('created_at', { ascending: false }).limit(100),
    ]);

    if (companiesResult.error) {
      setError(`Não consegui carregar a carteira: ${companiesResult.error.message}`);
      setLoading(false);
      return;
    }

    const companyRows = companiesResult.data ?? [];
    const invites = invitesResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const hourRows = hoursResult.data ?? [];
    const npsRows = npsResult.data ?? [];
    const projectRows = projectsResult.data ?? [];
    const documentRows = documentsResult.data ?? [];
    const historyRows = historyResult.data ?? [];

    const rows = await Promise.all(companyRows.map(async (item) => {
      const invite = invites.find((entry) => entry.company_id === item.id);
      const clientProfile = profiles.find((entry) => entry.company_id === item.id);
      const consumedMinutes = hourRows.filter((entry) => entry.company_id === item.id).reduce((total, entry) => total + (entry.minutes ?? 0), 0);
      const contracted = Number(item.monthly_hours_contracted ?? 0);
      const scores = npsRows.filter((entry) => entry.company_id === item.id).map((entry) => Number(entry.score));
      const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      const logoUrl = await resolveLogo(item.logo_url);
      const documents = documentRows.filter((entry) => entry.company_id === item.id).map((entry) => `${entry.title}${entry.document_date ? ` · ${formatDate(entry.document_date)}` : ''}`);
      const projects = projectRows.filter((entry) => entry.company_id === item.id).slice(0, 6).map((entry) => ({ name: entry.name, status: String(entry.status).replaceAll('_', ' ') }));
      const history = historyRows.filter((entry) => entry.company_id === item.id).slice(0, 8).map((entry) => ({ title: String(entry.event_type).replaceAll('_', ' '), detail: typeof entry.metadata === 'object' ? JSON.stringify(entry.metadata) : '', date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(entry.created_at)) }));
      return {
        id: item.id,
        name: item.display_name,
        logoUrl,
        status: (item.status || 'active') as ClientRow['status'],
        createdAt: item.created_at,
        closedAt: item.closed_at || undefined,
        contact: invite?.full_name ?? 'Contato principal não definido',
        email: invite?.email ?? '—',
        decisionTitle: invite?.job_title || item.decision_maker_title || '',
        phone: invite?.phone || '',
        whatsapp: invite?.whatsapp || '',
        service: item.service_type ?? 'Serviço a definir',
        segment: item.segment || '',
        contractedHours: contracted,
        hours: `${formatHours(consumedMinutes)} / ${contracted ? `${contracted}h` : '—'}`,
        usage: contracted > 0 ? Math.min(100, Math.round((consumedMinutes / (contracted * 60)) * 100)) : 0,
        nps: average === null ? '—' : average.toFixed(1).replace('.', ','),
        access: clientProfile?.active ? 'Ativo' : invite ? 'Convite preparado' : 'Sem acesso',
        drive: item.drive_folder_url ? 'Conectado' : 'Não conectado',
        startDate: item.start_date || '',
        endDate: item.end_date || '',
        autoRenew: Boolean(item.auto_renew),
        addressStreet: item.address_street || '',
        addressNumber: item.address_number || '',
        neighborhood: item.address_neighborhood || '',
        city: item.address_city || '',
        state: item.address_state || '',
        hasBranches: Boolean(item.has_branches),
        branches: Array.isArray(item.branches) ? item.branches.map(String) : [],
        contractValue: item.contract_value == null ? null : Number(item.contract_value),
        billingFrequency: item.billing_frequency || 'monthly',
        paymentMethod: item.payment_method || 'pix',
        billingStatus: item.billing_status === 'overdue' ? 'Em atraso' : item.billing_status === 'pending' ? 'Pendente' : item.billing_status === 'current' ? 'Em dia' : 'A acompanhar',
        billingDay: item.billing_day == null ? null : Number(item.billing_day),
        billingDueRule: item.billing_due_rule || 'fixed_day',
        billingLeadDays: Number(item.billing_lead_days ?? 3),
        financialNote: item.payment_notes || '',
        penaltyEnabled: Boolean(item.contract_penalty_enabled),
        penaltyText: item.contract_penalty_text || '',
        contractStatus: item.status === 'active' ? 'Ativo' : statusLabel((item.status || 'active') as ClientRow['status']),
        responsibilities: [],
        projects,
        documents,
        history,
      } satisfies ClientRow;
    }));

    setClients(rows);
    const active = companyRows.filter((item) => item.status === 'active').length;
    const joined = companyRows.filter((item) => item.created_at >= startIso && item.created_at < nextIso).length;
    const exited = companyRows.filter((item) => item.closed_at && item.closed_at >= startIso && item.closed_at < nextIso).length;
    setMetrics({ active, joined, exited, net: joined - exited });
    setLoading(false);
  }

  useEffect(() => { void loadClients(); }, []);

  function resetForm() {
    setCompany(''); setSegment(''); setSegmentOther(''); setContact(''); setDecisionTitle(''); setEmail(''); setPhone(''); setWhatsapp(''); setService(''); setHours('');
    setStartDate(''); setEndDate(''); setAutoRenew(false); setAddressStreet(''); setAddressNumber(''); setNeighborhood(''); setCity(''); setState('PR'); setHasBranches(false); setBranchesText('');
    setLogoFile(null); setLogoPreview(''); setContractValue(''); setBillingFrequency('monthly'); setPaymentMethod('pix'); setBillingDay(''); setBillingDueRule('fixed_day'); setBillingLeadDays('3');
    setNotes(''); setPenaltyEnabled(false); setPenaltyText(''); setContractDate(''); setContractFile(null); setAddendumDate(''); setAddendumFile(null); setRegistrationTab('data');
  }

  function handleLogoSelection(file: File | null) {
    setLogoFile(file);
    if (!file) { setLogoPreview(''); return; }
    setLogoPreview(URL.createObjectURL(file));
  }

  async function uploadAccountDocument(companyId: string, file: File, type: 'contract' | 'addendum', documentDate: string) {
    if (!supabase) return;
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `${companyId}/account/${type}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: documentError } = await supabase.from('account_documents').insert({ company_id: companyId, document_type: type, title: type === 'contract' ? 'Contrato assinado' : 'Aditivo contratual', document_date: documentDate || null, storage_path: path, client_visible: true, created_by: sessionData.session?.user.id ?? null });
    if (documentError) throw documentError;
  }

  async function uploadCompanyLogo(companyId: string, file: File) {
    if (!supabase) return '';
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${companyId}/brand/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    return `private:${path}`;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(''); setCreated('');
    if (!company.trim() || !contact.trim() || !email.trim()) { setRegistrationTab('data'); return; }
    const contracted = Number(hours.replace(',', '.') || 0);
    const value = currencyToNumber(contractValue);
    const finalSegment = segment === 'Outro' ? segmentOther.trim() : segment;
    const branches = hasBranches ? branchesText.split('\n').map((item) => item.trim()).filter(Boolean) : [];

    if (preview || !supabase) {
      const id = `c-${Date.now()}`;
      const localLogo = logoFile ? URL.createObjectURL(logoFile) : '';
      const client: ClientRow = {
        id, name: company.trim(), logoUrl: localLogo, status: 'active', createdAt: new Date().toISOString(), contact: contact.trim(), email: email.trim(), decisionTitle, phone, whatsapp,
        service: service || 'A definir', segment: finalSegment || '—', contractedHours: contracted, hours: `0h / ${contracted || 0}h`, usage: 0, nps: '—', access: 'Convite preparado', drive: 'Não conectado',
        startDate, endDate, autoRenew, addressStreet, addressNumber, neighborhood, city, state, hasBranches, branches, contractValue: value || null, billingFrequency, paymentMethod,
        billingStatus: 'A acompanhar', billingDay: billingDay ? Number(billingDay) : null, billingDueRule, billingLeadDays: Number(billingLeadDays || 3), financialNote: notes,
        penaltyEnabled, penaltyText, contractStatus: 'Ativo', contractDate, responsibilities: [], projects: [], documents: [contractFile?.name, addendumFile?.name].filter(Boolean) as string[],
        history: [{ title: 'Conta criada', detail: 'Cadastro, contrato e acesso preparados', date: 'agora' }],
      };
      setClients((current) => [...current, client]);
      setMetrics((current) => ({ ...current, active: current.active + 1, joined: current.joined + 1, net: current.net + 1 }));
      setCreated(`${client.name} foi cadastrada e a gestão da conta já está preparada.`);
      resetForm(); setOpen(false); openClient(client);
      return;
    }

    try {
      setSaving(true);
      const { data: companyId, error: createError } = await supabase.rpc('create_client_account', { p_company: company.trim(), p_contact: contact.trim(), p_email: email.trim().toLowerCase(), p_hours: contracted > 0 ? contracted : null, p_service_type: service || null });
      if (createError) throw createError;
      const id = String(companyId);
      const storedLogo = logoFile ? await uploadCompanyLogo(id, logoFile) : null;
      const { error: updateError } = await supabase.from('companies').update({
        logo_url: storedLogo, segment: finalSegment || null, decision_maker_title: decisionTitle || null, start_date: startDate || null, end_date: endDate || null, auto_renew: autoRenew,
        address_street: addressStreet || null, address_number: addressNumber || null, address_neighborhood: neighborhood || null, address_city: city || null, address_state: state || null,
        has_branches: hasBranches, branches, contract_value: value > 0 ? value : null, billing_frequency: billingFrequency || null, payment_method: paymentMethod || null,
        billing_day: billingDay ? Number(billingDay) : null, billing_due_rule: billingDueRule, billing_lead_days: Number(billingLeadDays || 3), payment_notes: notes || null,
        contract_penalty_enabled: penaltyEnabled, contract_penalty_text: penaltyText || null, status: 'active',
      }).eq('id', id);
      if (updateError) throw updateError;
      await supabase.from('client_invites').update({ job_title: decisionTitle || null, phone: phone || null, whatsapp: whatsapp || null }).eq('company_id', id).eq('is_primary', true);
      if (contractFile) await uploadAccountDocument(id, contractFile, 'contract', contractDate);
      if (addendumFile) await uploadAccountDocument(id, addendumFile, 'addendum', addendumDate);
      const createdCompany = company.trim();
      resetForm(); setOpen(false); setCreated(`${createdCompany} foi cadastrado. Dados, contrato, financeiro e acesso estão conectados.`);
      await loadClients();
      setSelectedClientId(id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível cadastrar o cliente.');
    } finally { setSaving(false); }
  }

  function openClient(client: ClientRow, tab: AccountTab = 'data') {
    setSelectedClientId(client.id);
    setEditDraft({ ...client, branches: [...(client.branches || [])], responsibilities: [...(client.responsibilities || [])], projects: [...(client.projects || [])], documents: [...(client.documents || [])], history: [...(client.history || [])] });
    setEditLogoFile(null);
    setAccountTab(tab);
    setManageOpen(true);
  }

  function patchDraft(patch: Partial<ClientRow>) {
    setEditDraft((current) => current ? { ...current, ...patch } : current);
  }

  async function saveClient() {
    if (!editDraft) return;
    setSaving(true); setError('');
    try {
      let logoValue: string | undefined = editDraft.logoUrl;
      if (editLogoFile && !preview && supabase) logoValue = await uploadCompanyLogo(editDraft.id, editLogoFile);
      if (editLogoFile && preview) logoValue = URL.createObjectURL(editLogoFile);

      const nextDraft = { ...editDraft, logoUrl: logoValue };
      if (preview || !supabase) {
        setClients((current) => current.map((client) => client.id === nextDraft.id ? nextDraft : client));
        setEditDraft(nextDraft); setCreated(`Alterações de ${nextDraft.name} salvas na prévia.`); setManageOpen(false); return;
      }

      const { error: companyError } = await supabase.from('companies').update({
        display_name: nextDraft.name, logo_url: logoValue?.startsWith('blob:') ? null : logoValue, segment: nextDraft.segment || null, service_type: nextDraft.service || null,
        monthly_hours_contracted: nextDraft.contractedHours || null, start_date: nextDraft.startDate || null, end_date: nextDraft.endDate || null, auto_renew: Boolean(nextDraft.autoRenew),
        address_street: nextDraft.addressStreet || null, address_number: nextDraft.addressNumber || null, address_neighborhood: nextDraft.neighborhood || null, address_city: nextDraft.city || null,
        address_state: nextDraft.state || null, has_branches: Boolean(nextDraft.hasBranches), branches: nextDraft.hasBranches ? (nextDraft.branches || []) : [], contract_value: nextDraft.contractValue || null,
        billing_frequency: nextDraft.billingFrequency || null, payment_method: nextDraft.paymentMethod || null, billing_day: nextDraft.billingDay || null, billing_due_rule: nextDraft.billingDueRule || 'fixed_day',
        billing_lead_days: nextDraft.billingLeadDays ?? 3, payment_notes: nextDraft.financialNote || null, contract_penalty_enabled: Boolean(nextDraft.penaltyEnabled), contract_penalty_text: nextDraft.penaltyText || null,
      }).eq('id', nextDraft.id);
      if (companyError) throw companyError;
      const { error: inviteError } = await supabase.from('client_invites').update({ full_name: nextDraft.contact, email: nextDraft.email.toLowerCase(), job_title: nextDraft.decisionTitle || null, phone: nextDraft.phone || null, whatsapp: nextDraft.whatsapp || null }).eq('company_id', nextDraft.id).eq('is_primary', true);
      if (inviteError) throw inviteError;
      await loadClients(); setCreated(`Alterações de ${nextDraft.name} salvas.`); setManageOpen(false);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar as alterações.'); }
    finally { setSaving(false); }
  }

  function requestLifecycle(client: ClientRow, type: LifecycleAction) {
    setLifecycle({ client, type }); setLifecycleReason('');
  }

  async function applyLifecycle() {
    if (!lifecycle) return;
    if (lifecycle.type !== 'reactivate' && !lifecycleReason.trim()) return;
    const nextStatus: ClientRow['status'] = lifecycle.type === 'pause' ? 'paused' : lifecycle.type === 'archive' ? 'archived' : lifecycle.type === 'close' ? 'closed' : 'active';
    const clientId = lifecycle.client.id;
    const nextAccess = nextStatus === 'active' ? 'Ativo' : nextStatus === 'paused' ? 'Bloqueado' : 'Encerrado';

    if (preview || !supabase) {
      setClients((current) => current.map((client) => client.id === clientId ? { ...client, status: nextStatus, access: nextAccess, closedAt: nextStatus === 'closed' ? new Date().toISOString() : client.closedAt, history: [{ title: statusLabel(nextStatus), detail: lifecycleReason || 'Conta reativada', date: 'agora' }, ...(client.history || [])] } : client));
      if (lifecycle.type === 'close') setMetrics((current) => ({ ...current, active: Math.max(0, current.active - 1), exited: current.exited + 1, net: current.net - 1 }));
      if (lifecycle.type === 'reactivate') setMetrics((current) => ({ ...current, active: current.active + 1 }));
      setLifecycle(null); setCreated(`Status de ${lifecycle.client.name} atualizado para ${statusLabel(nextStatus).toLowerCase()}.`); return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status: nextStatus };
      if (lifecycle.type === 'pause') Object.assign(patch, { paused_at: now, paused_reason: lifecycleReason });
      if (lifecycle.type === 'close') Object.assign(patch, { closed_at: now, closed_reason: lifecycleReason });
      if (lifecycle.type === 'archive') Object.assign(patch, { archived_at: now });
      if (lifecycle.type === 'reactivate') Object.assign(patch, { paused_at: null, paused_reason: null });
      const { error: statusError } = await supabase.from('companies').update(patch).eq('id', clientId);
      if (statusError) throw statusError;
      await supabase.from('profiles').update({ active: nextStatus === 'active' }).eq('company_id', clientId).eq('role', 'client');
      await supabase.from('activity_log').insert({ company_id: clientId, event_type: `account_${lifecycle.type}`, entity_type: 'company', entity_id: clientId, metadata: { reason: lifecycleReason || null } });
      setLifecycle(null); await loadClients(); setCreated(`Status de ${lifecycle.client.name} atualizado.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o status da conta.'); }
    finally { setSaving(false); }
  }

  const registrationOrder: RegistrationTab[] = ['data', 'contract', 'financial', 'documents'];
  const registrationIndex = registrationOrder.indexOf(registrationTab);

  return (
    <Shell role="admin">
      <section className="page clients-page-v2">
        <div className="eyebrow">CARTEIRA CALI</div>
        <div className="page-heading">
          <div><h1>Clientes</h1><p>Gestão da conta, contrato, financeiro, acesso e operação em uma única visão.</p></div>
          <button className="primary" onClick={() => { resetForm(); setOpen(true); }}><Plus size={18} />Cadastrar cliente</button>
        </div>

        <section className="client-portfolio-metrics" aria-label="Movimentação da carteira">
          <article><span>Contas ativas</span><strong>{metrics.active}</strong><small>contratos em operação</small></article>
          <article><span>Entraram no mês</span><strong>+{metrics.joined}</strong><small>novas contas na carteira</small></article>
          <article><span>Saíram no mês</span><strong>{metrics.exited}</strong><small>encerramentos registrados</small></article>
          <article className={metrics.net >= 0 ? 'positive' : 'negative'}><span>Saldo do mês</span><strong>{metrics.net > 0 ? `+${metrics.net}` : metrics.net}</strong><small>entradas menos saídas</small></article>
        </section>

        {created && <div className="inline-notice success"><CheckCircle2 size={19} />{created}</div>}
        {error && <div className="inline-notice">{error}</div>}

        <section className="panel data-panel client-list-panel">
          <div className="data-head client-data-head"><span>Cliente</span><span>Horas do ciclo</span><span>NPS</span><span>Acesso</span><span>Drive</span><span aria-label="Ações">Ações</span></div>
          {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando carteira…</div>}
          {empty && <div className="data-empty"><strong>Nenhum cliente cadastrado ainda.</strong><span>Cadastre o primeiro cliente para abrir a gestão da conta no Workspace.</span></div>}
          {clients.map((client) => (
            <div className="client-data-row client-data-row-v2" key={client.id} role="button" tabIndex={0} onClick={() => openClient(client)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openClient(client); }} aria-label={`Abrir ficha 360 de ${client.name}`}>
              <div className="client-identity">
                <div className="company-mark company-logo-slot">{client.logoUrl ? <img src={client.logoUrl} alt={`Logo ${client.name}`} /> : client.name[0]}</div>
                <div><strong>{client.name}</strong><span>{client.contact} · {client.email}</span><small>{client.service}</small></div>
              </div>
              <div className="hours-cell"><span>{client.hours}</span><Progress value={client.usage} /></div>
              <strong className="nps-cell">{client.nps}</strong>
              <span className={`status-pill ${client.status === 'active' ? 'ok' : client.status === 'paused' ? 'warn' : ''}`}><Mail size={15} />{statusLabel(client.status)}</span>
              <span className={`status-pill ${client.drive === 'Conectado' ? 'ok' : ''}`}><Cloud size={15} />{client.drive}</span>
              <div className="client-quick-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" title="Editar cliente" aria-label={`Editar ${client.name}`} onClick={() => openClient(client, 'data')}><Pencil size={16} /></button>
                {client.status === 'paused' ? <button type="button" title="Reativar acesso" aria-label={`Reativar ${client.name}`} onClick={() => requestLifecycle(client, 'reactivate')}><RotateCcw size={16} /></button> : <button type="button" title="Bloquear temporariamente" aria-label={`Bloquear temporariamente ${client.name}`} onClick={() => requestLifecycle(client, 'pause')}><PauseCircle size={16} /></button>}
                <button type="button" title="Arquivar conta" aria-label={`Arquivar ${client.name}`} onClick={() => requestLifecycle(client, 'archive')}><Archive size={16} /></button>
                <button type="button" title="Encerrar contrato" aria-label={`Encerrar contrato de ${client.name}`} onClick={() => requestLifecycle(client, 'close')}><Ban size={16} /></button>
              </div>
            </div>
          ))}
        </section>
        <p className="client-list-hint">Clique em qualquer linha para abrir a ficha completa da conta.</p>
      </section>

      {open && <div className="modal-backdrop full-screen-modal" role="presentation">
        <form className="modal-card client-account-modal tabbed-account-modal" role="dialog" aria-modal="true" aria-label="Cadastrar cliente" onSubmit={handleCreate}>
          <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
          <div className="account-modal-intro"><span className="section-kicker">NOVA CONTA</span><h2>Cadastrar cliente</h2><p>O cadastro abre a ficha 360º da empresa e conecta contrato, cobrança, acesso e operação.</p></div>
          <RegistrationTabs active={registrationTab} onChange={setRegistrationTab} />

          <div className="account-tab-scroll">
            {registrationTab === 'data' && <section className="account-tab-pane">
              <div className="account-pane-heading"><Building2 size={20} /><div><strong>Dados cadastrais</strong><span>Empresa, localização, serviço e decisor principal.</span></div></div>
              <div className="logo-registration-row">
                <div className="company-logo-editor">{logoPreview ? <img src={logoPreview} alt="Prévia da logo" /> : <Building2 size={30} />}</div>
                <label className="secondary logo-upload-button"><ImagePlus size={17} />Subir logo da empresa<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => handleLogoSelection(e.target.files?.[0] ?? null)} /></label>
                <span>A logo será usada no acesso do cliente e nas visões da conta.</span>
              </div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label">Empresa<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" required /></label>
                <label className="stacked-label">Segmento<select value={segment} onChange={(e) => setSegment(e.target.value)}><option value="">Selecionar segmento</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
                {segment === 'Outro' && <label className="stacked-label wide">Qual segmento?<input value={segmentOther} onChange={(e) => setSegmentOther(e.target.value)} placeholder="Descreva o segmento" /></label>}
                <label className="stacked-label">Serviço<select value={service} onChange={(e) => setService(e.target.value)}><option value="">Selecionar serviço</option>{services.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Horas contratadas<input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="30" /></label>
                <label className="stacked-label"><span className="label-with-icon"><MapPin size={15} />Cidade</span><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Curitiba" /></label>
                <label className="stacked-label">Estado<input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="PR" /></label>
                <label className="stacked-label">Endereço<input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua / Avenida" /></label>
                <label className="stacked-label">Número<input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Nº" /></label>
                <label className="stacked-label">Bairro<input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Bairro" /></label>
                <label className="check-line account-check wide"><input type="checkbox" checked={hasBranches} onChange={(e) => setHasBranches(e.target.checked)} /><span><strong>Possui filiais</strong><small>Ative para registrar as demais localidades da empresa.</small></span></label>
                {hasBranches && <label className="stacked-label wide">Localização das filiais<textarea rows={3} value={branchesText} onChange={(e) => setBranchesText(e.target.value)} placeholder={'São José dos Pinhais · PR\nJoinville · SC'} /></label>}
                <label className="stacked-label">Nome do decisor<input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nome completo" required /></label>
                <label className="stacked-label">Cargo<input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="Ex.: CEO, Diretora de RH" /></label>
                <label className="stacked-label wide">E-mail de acesso<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="decisor@empresa.com.br" required /></label>
                <label className="stacked-label"><span className="label-with-icon"><Phone size={15} />Telefone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(41) 3333-3333" /></label>
                <label className="stacked-label">WhatsApp<input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(41) 99999-9999" /></label>
              </div>
            </section>}

            {registrationTab === 'contract' && <section className="account-tab-pane">
              <div className="account-pane-heading"><FileCheck2 size={20} /><div><strong>Contrato</strong><span>Prazo, renovação e condições relevantes da relação.</span></div></div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label"><span className="label-with-icon"><CalendarDays size={15} />Início do contrato</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label className="stacked-label"><span className="label-with-icon"><CalendarDays size={15} />Término do contrato</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                <div className="derived-field"><span>Tempo de contrato</span><strong>{contractDuration(startDate, endDate)}</strong><small>Calculado automaticamente pelas datas.</small></div>
                <label className="check-line account-check"><input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} /><span><strong>Renovação automática</strong><small>O contrato renova automaticamente ao fim do período.</small></span></label>
                <label className="check-line account-check wide"><input type="checkbox" checked={penaltyEnabled} onChange={(e) => setPenaltyEnabled(e.target.checked)} /><span><strong>Existe multa / condição de rescisão</strong><small>Registre a regra para que ela fique disponível na gestão da conta.</small></span></label>
                {penaltyEnabled && <label className="stacked-label wide">Regra de multa ou rescisão<textarea rows={3} value={penaltyText} onChange={(e) => setPenaltyText(e.target.value)} placeholder="Ex.: multa de X% em caso de rescisão antes do prazo..." /></label>}
              </div>
            </section>}

            {registrationTab === 'financial' && <section className="account-tab-pane">
              <div className="account-pane-heading"><WalletCards size={20} /><div><strong>Financeiro</strong><span>Parâmetros que orientarão a cobrança automática e os lembretes.</span></div></div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label">Valor do contrato<input value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="R$ 5.800,00" /></label>
                <label className="stacked-label">Recorrência<select value={billingFrequency} onChange={(e) => setBillingFrequency(e.target.value)}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></select></label>
                <label className="stacked-label">Forma de pagamento<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></select></label>
                <label className="stacked-label">Regra de vencimento<select value={billingDueRule} onChange={(e) => setBillingDueRule(e.target.value)}><option value="fixed_day">Dia fixo do mês</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></select></label>
                {billingDueRule === 'fixed_day' && <label className="stacked-label">Dia de vencimento<input inputMode="numeric" maxLength={2} value={billingDay} onChange={(e) => setBillingDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" /></label>}
                <label className="stacked-label">Avisar com antecedência<input inputMode="numeric" value={billingLeadDays} onChange={(e) => setBillingLeadDays(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="3" /><small className="field-helper">dias antes do vencimento</small></label>
                <label className="stacked-label wide">Observação financeira<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: emitir NF antes da cobrança" /></label>
              </div>
              <div className="automation-preview"><ReceiptText size={18} /><div><strong>Cobrança preparada para automação</strong><p>O vencimento será calculado pela regra do contrato. A rotina poderá enviar relatório + Pix, boleto ou link de pagamento alguns dias antes.</p></div></div>
            </section>}

            {registrationTab === 'documents' && <section className="account-tab-pane">
              <div className="account-pane-heading"><FileCheck2 size={20} /><div><strong>Documentos</strong><span>Contrato assinado e aditivos vinculados à conta.</span></div></div>
              <div className="document-upload-grid document-upload-grid-v2">
                <div className="account-upload-card"><div><strong>Contrato assinado</strong><span>{contractFile?.name || 'PDF, DOC ou imagem'}</span></div><label><Upload size={16} />Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setContractFile(e.target.files?.[0] ?? null)} /></label><input aria-label="Data do contrato" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
                <div className="account-upload-card"><div><strong>Aditivo contratual</strong><span>{addendumFile?.name || 'Opcional neste cadastro'}</span></div><label><Upload size={16} />Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setAddendumFile(e.target.files?.[0] ?? null)} /></label><input aria-label="Data do aditivo" type="date" value={addendumDate} onChange={(e) => setAddendumDate(e.target.value)} /></div>
              </div>
              <div className="automation-preview muted-preview"><FileCheck2 size={18} /><div><strong>Leitura inteligente de contrato preparada</strong><p>A estrutura já prevê extração de cláusulas e revisão antes de preencher automaticamente prazo, multa e regras financeiras. A leitura automática fica para a etapa de integração documental.</p></div></div>
            </section>}
          </div>

          <div className="account-modal-footer tabbed-modal-footer">
            <span>Etapa {registrationIndex + 1} de {registrationOrder.length}</span>
            <div className="modal-actions">
              {registrationIndex > 0 && <button type="button" className="secondary" onClick={() => setRegistrationTab(registrationOrder[registrationIndex - 1])}><ChevronLeft size={16} />Voltar</button>}
              {registrationIndex < registrationOrder.length - 1 ? <button type="button" className="primary" onClick={() => setRegistrationTab(registrationOrder[registrationIndex + 1])}>Continuar<ChevronRight size={16} /></button> : <button className="primary" type="submit" disabled={saving}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Cadastrar conta'}</button>}
            </div>
          </div>
        </form>
      </div>}

      {manageOpen && editDraft && <div className="modal-backdrop full-screen-modal" role="presentation">
        <div className="modal-card client-account-modal account-management-modal" role="dialog" aria-modal="true" aria-label={`Gestão de ${editDraft.name}`}>
          <button type="button" className="modal-close" onClick={() => setManageOpen(false)} aria-label="Fechar"><X size={20} /></button>
          <header className="account-management-header">
            <div className="account-client-brand">
              <div className="company-logo-editor management-logo">{editDraft.logoUrl ? <img src={editDraft.logoUrl} alt={`Logo ${editDraft.name}`} /> : editDraft.name[0]}</div>
              <div><span className="section-kicker">GESTÃO DA CONTA</span><h2>{editDraft.name}</h2><p>{editDraft.segment || 'Segmento não informado'} · {editDraft.service}</p></div>
            </div>
            <div className="account-header-status"><span className={`status-pill ${editDraft.status === 'active' ? 'ok' : editDraft.status === 'paused' ? 'warn' : ''}`}><ShieldCheck size={15} />{statusLabel(editDraft.status)}</span><span className={`status-pill ${editDraft.drive === 'Conectado' ? 'ok' : ''}`}><Cloud size={15} />Drive {editDraft.drive.toLowerCase()}</span></div>
          </header>
          <AccountTabs active={accountTab} onChange={setAccountTab} />

          <div className="account-tab-scroll account-management-scroll">
            {accountTab === 'data' && <section className="account-tab-pane">
              <div className="account-pane-heading"><Building2 size={20} /><div><strong>Dados cadastrais</strong><span>Identidade, serviço, localização e acesso principal.</span></div></div>
              <div className="logo-registration-row edit-logo-row"><label className="secondary logo-upload-button"><ImagePlus size={17} />Alterar logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)} /></label>{editLogoFile && <span>{editLogoFile.name}</span>}</div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label">Empresa<input value={editDraft.name} onChange={(e) => patchDraft({ name: e.target.value })} /></label>
                <label className="stacked-label">Segmento<select value={editDraft.segment || ''} onChange={(e) => patchDraft({ segment: e.target.value })}><option value="">Selecionar segmento</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Serviço<select value={editDraft.service} onChange={(e) => patchDraft({ service: e.target.value })}>{services.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Horas contratadas<input inputMode="decimal" value={editDraft.contractedHours || ''} onChange={(e) => patchDraft({ contractedHours: Number(e.target.value.replace(',', '.')) || 0 })} /></label>
                <label className="stacked-label">Cidade<input value={editDraft.city || ''} onChange={(e) => patchDraft({ city: e.target.value })} /></label>
                <label className="stacked-label">Estado<input maxLength={2} value={editDraft.state || ''} onChange={(e) => patchDraft({ state: e.target.value.toUpperCase().slice(0, 2) })} /></label>
                <label className="stacked-label">Endereço<input value={editDraft.addressStreet || ''} onChange={(e) => patchDraft({ addressStreet: e.target.value })} /></label>
                <label className="stacked-label">Número<input value={editDraft.addressNumber || ''} onChange={(e) => patchDraft({ addressNumber: e.target.value })} /></label>
                <label className="stacked-label">Bairro<input value={editDraft.neighborhood || ''} onChange={(e) => patchDraft({ neighborhood: e.target.value })} /></label>
                <label className="check-line account-check wide"><input type="checkbox" checked={Boolean(editDraft.hasBranches)} onChange={(e) => patchDraft({ hasBranches: e.target.checked, branches: e.target.checked ? editDraft.branches : [] })} /><span><strong>Possui filiais</strong><small>Registre as demais localidades abaixo.</small></span></label>
                {editDraft.hasBranches && <label className="stacked-label wide">Filiais<textarea rows={3} value={(editDraft.branches || []).join('\n')} onChange={(e) => patchDraft({ branches: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label>}
                <label className="stacked-label">Nome do decisor<input value={editDraft.contact} onChange={(e) => patchDraft({ contact: e.target.value })} /></label>
                <label className="stacked-label">Cargo<input value={editDraft.decisionTitle || ''} onChange={(e) => patchDraft({ decisionTitle: e.target.value })} /></label>
                <label className="stacked-label wide">E-mail de acesso<input type="email" value={editDraft.email} onChange={(e) => patchDraft({ email: e.target.value })} /></label>
                <label className="stacked-label">Telefone<input value={editDraft.phone || ''} onChange={(e) => patchDraft({ phone: e.target.value })} /></label>
                <label className="stacked-label">WhatsApp<input value={editDraft.whatsapp || ''} onChange={(e) => patchDraft({ whatsapp: e.target.value })} /></label>
              </div>
            </section>}

            {accountTab === 'contract' && <section className="account-tab-pane">
              <div className="account-pane-heading"><FileCheck2 size={20} /><div><strong>Contrato</strong><span>Prazo, renovação, multa e documentos contratuais.</span></div></div>
              <div className="account-summary-strip"><div><span>Status</span><strong>{editDraft.contractStatus || statusLabel(editDraft.status)}</strong></div><div><span>Duração</span><strong>{contractDuration(editDraft.startDate, editDraft.endDate)}</strong></div><div><span>Renovação</span><strong>{editDraft.autoRenew ? 'Automática' : 'Manual / não prevista'}</strong></div></div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label">Início<input type="date" value={editDraft.startDate || ''} onChange={(e) => patchDraft({ startDate: e.target.value })} /></label>
                <label className="stacked-label">Término<input type="date" value={editDraft.endDate || ''} onChange={(e) => patchDraft({ endDate: e.target.value })} /></label>
                <label className="check-line account-check wide"><input type="checkbox" checked={Boolean(editDraft.autoRenew)} onChange={(e) => patchDraft({ autoRenew: e.target.checked })} /><span><strong>Renovação automática</strong><small>Ative quando essa condição constar no contrato.</small></span></label>
                <label className="check-line account-check wide"><input type="checkbox" checked={Boolean(editDraft.penaltyEnabled)} onChange={(e) => patchDraft({ penaltyEnabled: e.target.checked })} /><span><strong>Multa / condição de rescisão</strong><small>Use a regra contratual como referência em encerramentos.</small></span></label>
                {editDraft.penaltyEnabled && <label className="stacked-label wide">Regra contratual<textarea rows={3} value={editDraft.penaltyText || ''} onChange={(e) => patchDraft({ penaltyText: e.target.value })} /></label>}
              </div>
              <div className="document-list-v2">{editDraft.documents?.length ? editDraft.documents.map((document) => <div key={document}><FileCheck2 size={17} /><span>{document}</span></div>) : <p>Nenhum documento contratual anexado.</p>}</div>
            </section>}

            {accountTab === 'financial' && <section className="account-tab-pane">
              <div className="account-pane-heading"><Banknote size={20} /><div><strong>Financeiro</strong><span>Valor, recorrência e regra que orientará a cobrança automática.</span></div></div>
              <div className="account-summary-strip"><div><span>Valor</span><strong>{formatCurrency(editDraft.contractValue)}</strong></div><div><span>Vencimento</span><strong>{dueRuleLabel(editDraft)}</strong></div><div><span>Situação atual</span><strong>{editDraft.billingStatus || 'A acompanhar'}</strong></div></div>
              <div className="form-grid account-tab-form">
                <label className="stacked-label">Valor do contrato<input inputMode="decimal" value={editDraft.contractValue ?? ''} onChange={(e) => patchDraft({ contractValue: Number(e.target.value.replace(',', '.')) || null })} /></label>
                <label className="stacked-label">Recorrência<select value={editDraft.billingFrequency || 'monthly'} onChange={(e) => patchDraft({ billingFrequency: e.target.value })}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></select></label>
                <label className="stacked-label">Forma de pagamento<select value={editDraft.paymentMethod || 'pix'} onChange={(e) => patchDraft({ paymentMethod: e.target.value })}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></select></label>
                <label className="stacked-label">Regra de vencimento<select value={editDraft.billingDueRule || 'fixed_day'} onChange={(e) => patchDraft({ billingDueRule: e.target.value })}><option value="fixed_day">Dia fixo do mês</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></select></label>
                {(editDraft.billingDueRule || 'fixed_day') === 'fixed_day' && <label className="stacked-label">Dia de vencimento<input inputMode="numeric" value={editDraft.billingDay ?? ''} onChange={(e) => patchDraft({ billingDay: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || null })} /></label>}
                <label className="stacked-label">Antecedência do aviso<input inputMode="numeric" value={editDraft.billingLeadDays ?? 3} onChange={(e) => patchDraft({ billingLeadDays: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0 })} /><small className="field-helper">dias antes do vencimento</small></label>
                <label className="stacked-label wide">Observação financeira<input value={editDraft.financialNote || ''} onChange={(e) => patchDraft({ financialNote: e.target.value })} /></label>
              </div>
              <div className="billing-flow-preview"><ReceiptText size={18} /><div><strong>Próximo fluxo de cobrança</strong><p>{editDraft.billingLeadDays ?? 3} dias antes de {dueRuleLabel(editDraft).toLowerCase()}, preparar e-mail com relatório do ciclo + {paymentMethodLabel(editDraft.paymentMethod)}. Feriados e fins de semana serão considerados pela regra de dia útil quando aplicável.</p></div></div>
            </section>}

            {accountTab === 'operation' && <section className="account-tab-pane">
              <div className="account-pane-heading"><FolderKanban size={20} /><div><strong>Operação</strong><span>Horas, satisfação, responsabilidades e projetos vinculados.</span></div></div>
              <div className="account-summary-strip"><div><span>Horas</span><strong>{editDraft.hours}</strong></div><div><span>Consumo</span><strong>{editDraft.usage}%</strong></div><div><span>NPS</span><strong>{editDraft.nps}</strong></div><div><span>Acesso</span><strong>{editDraft.access}</strong></div></div>
              <article className="account-operation-card"><div className="account-detail-title"><BriefcaseBusiness size={18} /><strong>Responsabilidades da CALI</strong></div>{editDraft.responsibilities?.length ? <ul className="account-responsibility-list">{editDraft.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul> : <p>As responsabilidades do escopo aparecerão aqui quando o projeto for estruturado.</p>}</article>
              <article className="account-operation-card"><div className="account-detail-title"><FolderKanban size={18} /><strong>Projetos em andamento</strong></div>{editDraft.projects?.length ? <ul className="account-project-list">{editDraft.projects.map((project) => <li key={project.name}><span>{project.name}</span><small>{project.status}</small></li>)}</ul> : <p>Nenhum projeto vinculado ainda.</p>}</article>
              <div className="contact-action-row"><a href={`mailto:${editDraft.email}`}><Mail size={17} />E-mail</a>{editDraft.whatsapp && <a href={`https://wa.me/55${editDraft.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>}</div>
            </section>}

            {accountTab === 'history' && <section className="account-tab-pane">
              <div className="account-pane-heading"><History size={20} /><div><strong>Histórico da relação</strong><span>Movimentos importantes da conta, sem perder contexto.</span></div></div>
              <div className="account-history-list">{editDraft.history?.length ? editDraft.history.map((item, index) => <div key={`${item.title}-${index}`}><span className="history-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.date}</time></div>) : <p>Ainda não há movimentações registradas.</p>}</div>
            </section>}
          </div>

          <footer className="account-modal-footer management-footer">
            <div className="management-danger-actions">
              {editDraft.status === 'paused' ? <button type="button" className="ghost-action" onClick={() => { setManageOpen(false); requestLifecycle(editDraft, 'reactivate'); }}><RotateCcw size={16} />Reativar</button> : <button type="button" className="ghost-action" onClick={() => { setManageOpen(false); requestLifecycle(editDraft, 'pause'); }}><PauseCircle size={16} />Bloquear temporariamente</button>}
              <button type="button" className="ghost-action" onClick={() => { setManageOpen(false); requestLifecycle(editDraft, 'archive'); }}><Archive size={16} />Arquivar</button>
              <button type="button" className="ghost-action danger" onClick={() => { setManageOpen(false); requestLifecycle(editDraft, 'close'); }}><Ban size={16} />Encerrar contrato</button>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setManageOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving} onClick={() => void saveClient()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Salvar alterações'}</button></div>
          </footer>
        </div>
      </div>}

      {lifecycle && <div className="modal-backdrop full-screen-modal" role="presentation">
        <div className="modal-card lifecycle-modal" role="dialog" aria-modal="true">
          <button type="button" className="modal-close" onClick={() => setLifecycle(null)} aria-label="Fechar"><X size={20} /></button>
          <span className="section-kicker">GESTÃO DA CONTA</span>
          <h2>{lifecycle.type === 'pause' ? 'Bloquear temporariamente' : lifecycle.type === 'archive' ? 'Arquivar conta' : lifecycle.type === 'close' ? 'Encerrar contrato' : 'Reativar conta'}</h2>
          <p>{lifecycle.type === 'pause' ? 'O cliente deixa de acessar o Workspace até a reativação.' : lifecycle.type === 'archive' ? 'A conta sai da carteira ativa, mas todo o histórico permanece preservado.' : lifecycle.type === 'close' ? 'O contrato será encerrado e o acesso do cliente será retirado. O motivo ficará registrado para a comunicação de encerramento.' : 'O acesso e a conta voltam ao estado ativo.'}</p>
          {lifecycle.type !== 'reactivate' && <label className="stacked-label lifecycle-reason">Motivo<textarea rows={4} value={lifecycleReason} onChange={(e) => setLifecycleReason(e.target.value)} placeholder="Registre o motivo para manter o histórico da conta." autoFocus /></label>}
          <div className="modal-actions lifecycle-actions"><button type="button" className="secondary" onClick={() => setLifecycle(null)}>Cancelar</button><button type="button" className={`primary ${lifecycle.type === 'close' ? 'danger-primary' : ''}`} disabled={saving || (lifecycle.type !== 'reactivate' && !lifecycleReason.trim())} onClick={() => void applyLifecycle()}>{saving ? 'Salvando…' : 'Confirmar'}</button></div>
        </div>
      </div>}
    </Shell>
  );
}
