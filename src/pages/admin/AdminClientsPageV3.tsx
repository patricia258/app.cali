import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Banknote,
  Ban,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Cake,
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
  MessageCircle,
  PauseCircle,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ClientProject = { name: string; status: string };
type AccountHistory = { title: string; detail: string; date: string };
type AccountTab = 'data' | 'contract' | 'financial' | 'operation' | 'communications' | 'history';
type RegistrationTab = 'data' | 'contract' | 'financial' | 'documents';
type LifecycleAction = 'pause' | 'archive' | 'close' | 'reactivate';
type TerminationPenaltyType = 'none' | 'remaining_balance_percent' | 'contract_total_percent' | 'fixed_amount' | 'monthly_fee_multiple';
type TerminationPaymentRule = 'calendar_days' | 'business_days';

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
  decisionBirthday?: string;
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
  lateFeePercent?: number;
  dailyInterestPercent?: number;
  penaltyEnabled?: boolean;
  penaltyText?: string;
  terminationPenaltyType?: TerminationPenaltyType;
  terminationPenaltyValue?: number;
  terminationPaymentDays?: number;
  terminationPaymentRule?: TerminationPaymentRule;
  automationEnabled?: boolean;
  welcomeEmailEnabled?: boolean;
  dueReminderEnabled?: boolean;
  overdueEmailEnabled?: boolean;
  overdueEmailAfterDays?: number;
  extrajudicialEmailEnabled?: boolean;
  extrajudicialAfterDays?: number | null;
  birthdayEmailEnabled?: boolean;
  terminationEmailEnabled?: boolean;
  terminationSignedAt?: string;
  terminationPaymentDueAt?: string;
  terminationPenaltyAmount?: number | null;
  terminationBalanceSnapshot?: number | null;
  responsibilities?: string[];
  projects?: ClientProject[];
  documents?: string[];
  history?: AccountHistory[];
};

type PortfolioMetrics = { active: number; joined: number; exited: number; net: number };
type LifecycleState = { type: LifecycleAction; client: ClientRow } | null;

type FormState = {
  company: string;
  segment: string;
  segmentOther: string;
  contact: string;
  decisionTitle: string;
  decisionBirthday: string;
  email: string;
  phone: string;
  whatsapp: string;
  service: string;
  hours: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  addressStreet: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  hasBranches: boolean;
  branchesText: string;
  contractValue: string;
  billingFrequency: string;
  paymentMethod: string;
  billingDay: string;
  billingDueRule: string;
  billingLeadDays: string;
  notes: string;
  lateFeePercent: string;
  dailyInterestPercent: string;
  penaltyEnabled: boolean;
  penaltyText: string;
  terminationPenaltyType: TerminationPenaltyType;
  terminationPenaltyValue: string;
  terminationPaymentDays: string;
  terminationPaymentRule: TerminationPaymentRule;
};

const segments = ['Tecnologia','Serviços','Serviços corporativos','Indústria','Varejo','Saúde','Educação','Logística e transportes','Construção e engenharia','Financeiro','Alimentação e hospitalidade','Outro'];
const services = ['CALI Partner','CALI Full','Assessoria Estratégica Mensal','Mentoria para RH','Treinamento','Projeto de Estruturação','Solução personalizada'];

const emptyForm: FormState = {
  company: '', segment: '', segmentOther: '', contact: '', decisionTitle: '', decisionBirthday: '', email: '', phone: '', whatsapp: '', service: '', hours: '',
  startDate: '', endDate: '', autoRenew: false, addressStreet: '', addressNumber: '', neighborhood: '', city: '', state: 'PR', hasBranches: false, branchesText: '',
  contractValue: '', billingFrequency: 'monthly', paymentMethod: 'pix', billingDay: '', billingDueRule: 'fixed_day', billingLeadDays: '3', notes: '', lateFeePercent: '', dailyInterestPercent: '',
  penaltyEnabled: false, penaltyText: '', terminationPenaltyType: 'none', terminationPenaltyValue: '', terminationPaymentDays: '', terminationPaymentRule: 'calendar_days',
};

const previewClients: ClientRow[] = [
  {
    id: 'c1', name: 'Grupo Aurora', status: 'active', createdAt: '2026-05-12T10:00:00Z', contact: 'Marina Costa', email: 'marina@grupoaurora.com.br', decisionTitle: 'CEO', decisionBirthday: '1984-11-17', phone: '(41) 3333-2080', whatsapp: '(41) 99912-4080',
    service: 'Assessoria Estratégica Mensal', segment: 'Serviços corporativos', contractedHours: 30, hours: '24h10 / 30h', usage: 81, nps: '4,9', access: 'Ativo', drive: 'Não conectado', startDate: '2026-05-19', endDate: '2027-05-18', autoRenew: true,
    addressStreet: 'Av. Sete de Setembro', addressNumber: '2451', neighborhood: 'Água Verde', city: 'Curitiba', state: 'PR', hasBranches: true, branches: ['São José dos Pinhais · PR','Joinville · SC'],
    contractValue: 5800, billingFrequency: 'monthly', paymentMethod: 'pix', billingStatus: 'Em dia', billingDay: 1, billingDueRule: 'first_business_day', billingLeadDays: 3, financialNote: 'NF emitida antes da cobrança mensal.',
    lateFeePercent: 2, dailyInterestPercent: 0.033, penaltyEnabled: true, penaltyText: 'Rescisão antecipada conforme cláusula contratual.', terminationPenaltyType: 'remaining_balance_percent', terminationPenaltyValue: 20, terminationPaymentDays: 5, terminationPaymentRule: 'business_days',
    automationEnabled: false, welcomeEmailEnabled: true, dueReminderEnabled: true, overdueEmailEnabled: true, overdueEmailAfterDays: 1, extrajudicialEmailEnabled: false, extrajudicialAfterDays: null, birthdayEmailEnabled: false, terminationEmailEnabled: true,
    responsibilities: ['Governança de RH e indicadores','Ritual mensal com liderança','Plano de ação de People e acompanhamento executivo'],
    projects: [{ name: 'Estrutura de indicadores de People', status: 'Em andamento · 62%' },{ name: 'Ritual de gestão com lideranças', status: 'Validação do cliente' }],
    documents: ['Contrato assinado · 19/05/2026','Proposta comercial aprovada · v3'],
    history: [{ title: 'Relatório mensal disponibilizado', detail: 'Agosto · horas, entregáveis e leitura executiva', date: '28 ago' },{ title: 'Indicadores enviados para validação', detail: 'Projeto Estrutura de indicadores de People', date: '26 ago' },{ title: 'Conta criada', detail: 'Contrato e acesso principal preparados', date: '19 mai' }],
  },
  {
    id: 'c2', name: 'Novatech', status: 'active', createdAt: '2026-08-04T10:00:00Z', contact: 'Ricardo Martins', email: 'ricardo@novatech.com.br', decisionTitle: 'Diretor Executivo', service: 'Assessoria Estratégica Mensal', segment: 'Tecnologia', contractedHours: 40, hours: '32h50 / 40h', usage: 82, nps: '4,7', access: 'Ativo', drive: 'Conectado', startDate: '2026-07-23', endDate: '2027-07-22', autoRenew: true, city: 'Curitiba', state: 'PR', hasBranches: false, branches: [], contractValue: 7200, billingFrequency: 'monthly', paymentMethod: 'boleto', billingStatus: 'Em dia', billingDay: 5, billingDueRule: 'fixed_day', billingLeadDays: 3, lateFeePercent: 2, dailyInterestPercent: .033, terminationPenaltyType: 'remaining_balance_percent', terminationPenaltyValue: 15, terminationPaymentDays: 5, terminationPaymentRule: 'calendar_days', automationEnabled: false, welcomeEmailEnabled: true, dueReminderEnabled: true, overdueEmailEnabled: true, overdueEmailAfterDays: 1, terminationEmailEnabled: true,
    responsibilities: ['Estrutura de liderança','Indicadores e fóruns de gestão','Apoio ao RH em decisões críticas'], projects: [{ name: 'Governança de RH', status: 'Em andamento · 74%' }], documents: ['Contrato assinado · 23/07/2026','Aditivo de escopo · 12/08/2026'], history: [{ title: 'Aditivo anexado', detail: 'Ampliação de escopo da assessoria', date: '12 ago' }],
  },
  {
    id: 'c3', name: 'Studio Norte', status: 'active', createdAt: '2026-08-21T10:00:00Z', contact: 'Aline Rocha', email: 'aline@studionorte.com.br', decisionTitle: 'Sócia-diretora', service: 'Projeto de Estruturação', segment: 'Serviços', contractedHours: 20, hours: '11h25 / 20h', usage: 57, nps: '5,0', access: 'Ativo', drive: 'Não conectado', startDate: '2026-08-28', endDate: '2026-10-30', autoRenew: false, city: 'Pinhais', state: 'PR', hasBranches: false, branches: [], contractValue: 4500, billingFrequency: 'single', paymentMethod: 'pix', billingStatus: 'Pendente', billingDay: 30, billingDueRule: 'fixed_day', billingLeadDays: 3, lateFeePercent: 2, dailyInterestPercent: .033, terminationPenaltyType: 'fixed_amount', terminationPenaltyValue: 1200, terminationPaymentDays: 3, terminationPaymentRule: 'business_days', automationEnabled: false, welcomeEmailEnabled: true, dueReminderEnabled: true, overdueEmailEnabled: true, overdueEmailAfterDays: 1, terminationEmailEnabled: true,
    responsibilities: ['Estruturação de papéis','Rituais de gestão','Documentação de processos'], projects: [{ name: 'Estrutura organizacional', status: 'Em andamento · 41%' }], documents: ['Contrato assinado · 28/08/2026'], history: [{ title: 'Projeto iniciado', detail: 'Kick-off e abertura do cronograma', date: '28 ago' }],
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
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}
function formatCurrency(value?: number | null) { return value == null ? '—' : new Intl.NumberFormat('pt-BR',{ style:'currency',currency:'BRL' }).format(value); }
function formatDate(value?: string) { if (!value) return '—'; const date = new Date(`${value.slice(0,10)}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date); }
function statusLabel(status: ClientRow['status']) { return ({ active:'Ativo',paused:'Bloqueado',closed:'Encerrado',archived:'Arquivado' } as const)[status]; }
function paymentMethodLabel(value?: string) { return ({pix:'Pix',boleto:'Boleto',transfer:'Transferência',card:'Cartão',other:'Outra'} as Record<string,string>)[value || ''] || value || '—'; }
function currencyToNumber(value: string) { const clean = value.replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'); return Number(clean || 0); }
function contractDuration(start?: string, end?: string) {
  if (!start || !end) return 'A definir';
  const a = new Date(`${start}T12:00:00`), b = new Date(`${end}T12:00:00`);
  const days = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
  const months = Math.max(1, Math.round(days / 30.4375));
  return months === 12 ? '1 ano' : months % 12 === 0 ? `${months / 12} anos` : months === 1 ? '1 mês' : `${months} meses`;
}
function dueRuleLabel(client: ClientRow) {
  if (client.billingDueRule === 'first_business_day') return '1º dia útil do mês';
  if (client.billingDueRule === 'last_business_day') return 'Último dia útil do mês';
  if (client.billingDueRule === 'custom') return 'Regra personalizada';
  return client.billingDay ? `Dia ${client.billingDay}` : 'A definir';
}
function estimateContractTotal(client: ClientRow) {
  const value = Number(client.contractValue || 0);
  if (!value) return 0;
  if (!client.startDate || !client.endDate) return value;
  const start = new Date(`${client.startDate}T12:00:00`), end = new Date(`${client.endDate}T12:00:00`);
  const months = Math.max(1, Math.round(Math.max(1, (end.getTime() - start.getTime()) / 86400000) / 30.4375));
  if (client.billingFrequency === 'monthly') return value * months;
  if (client.billingFrequency === 'quarterly') return value * Math.ceil(months / 3);
  return value;
}
function addDays(dateIso: string, days: number, rule: TerminationPaymentRule) {
  const date = new Date(`${dateIso}T12:00:00`);
  let added = 0;
  while (added < Math.max(0, days)) {
    date.setDate(date.getDate() + 1);
    if (rule === 'calendar_days' || (date.getDay() !== 0 && date.getDay() !== 6)) added += 1;
  }
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function terminationProjection(client: ClientRow, terminationDate: string) {
  if (!terminationDate || !client.startDate || !client.endDate) return null;
  const start = new Date(`${client.startDate}T12:00:00`), end = new Date(`${client.endDate}T12:00:00`), cut = new Date(`${terminationDate}T12:00:00`);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const remainingDays = Math.max(0, Math.min(totalDays, (end.getTime() - cut.getTime()) / 86400000));
  const contractTotal = estimateContractTotal(client);
  const remainingBalance = contractTotal * (remainingDays / totalDays);
  const parameter = Number(client.terminationPenaltyValue || 0);
  let penalty = 0;
  if (client.terminationPenaltyType === 'remaining_balance_percent') penalty = remainingBalance * parameter / 100;
  if (client.terminationPenaltyType === 'contract_total_percent') penalty = contractTotal * parameter / 100;
  if (client.terminationPenaltyType === 'fixed_amount') penalty = parameter;
  if (client.terminationPenaltyType === 'monthly_fee_multiple') penalty = Number(client.contractValue || 0) * parameter;
  const dueDate = addDays(terminationDate, Number(client.terminationPaymentDays || 0), client.terminationPaymentRule || 'calendar_days');
  return { contractTotal, remainingBalance, penalty, dueDate };
}

function Tabs<T extends string>({ value, onChange, items }: { value:T; onChange:(value:T)=>void; items:Array<{id:T;label:string}> }) {
  return <div className="account-tabs account-tabs-v3" role="tablist">{items.map((item) => <button type="button" role="tab" aria-selected={value===item.id} className={value===item.id?'active':''} key={item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}

export function AdminClientsPageV3() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [clients,setClients] = useState<ClientRow[]>(preview ? previewClients : []);
  const [metrics,setMetrics] = useState<PortfolioMetrics>(preview ? {active:3,joined:2,exited:1,net:1} : {active:0,joined:0,exited:0,net:0});
  const [loading,setLoading] = useState(!preview);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  const [createOpen,setCreateOpen] = useState(false);
  const [registrationTab,setRegistrationTab] = useState<RegistrationTab>('data');
  const [form,setForm] = useState<FormState>(emptyForm);
  const [logoFile,setLogoFile] = useState<File|null>(null);
  const [logoPreview,setLogoPreview] = useState('');
  const [contractFile,setContractFile] = useState<File|null>(null);
  const [contractDate,setContractDate] = useState('');
  const [addendumFile,setAddendumFile] = useState<File|null>(null);
  const [addendumDate,setAddendumDate] = useState('');
  const [manageOpen,setManageOpen] = useState(false);
  const [accountTab,setAccountTab] = useState<AccountTab>('data');
  const [editDraft,setEditDraft] = useState<ClientRow|null>(null);
  const [editLogoFile,setEditLogoFile] = useState<File|null>(null);
  const [lifecycle,setLifecycle] = useState<LifecycleState>(null);
  const [lifecycleReason,setLifecycleReason] = useState('');
  const [lifecycleDate,setLifecycleDate] = useState(new Date().toISOString().slice(0,10));

  const anyModalOpen = createOpen || manageOpen || Boolean(lifecycle);
  useEffect(() => {
    if (!anyModalOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  },[anyModalOpen]);
  useEffect(() => () => { if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview); },[logoPreview]);

  async function resolveLogo(raw?: string|null) {
    if (!raw || !supabase) return raw || '';
    if (!raw.startsWith('private:')) return raw;
    const { data } = await supabase.storage.from('cali-workspace-private').createSignedUrl(raw.slice('private:'.length),3600);
    return data?.signedUrl || '';
  }

  async function loadClients() {
    if (preview || !supabase) return;
    setLoading(true); setError('');
    const { start,next,startIso,nextIso } = monthBounds();
    const [companiesResult,invitesResult,profilesResult,hoursResult,npsResult,projectsResult,documentsResult,historyResult] = await Promise.all([
      supabase.from('companies').select('*').order('created_at',{ascending:false}),
      supabase.from('client_invites').select('*').eq('is_primary',true),
      supabase.from('profiles').select('company_id,active,role').eq('role','client'),
      supabase.from('hour_entries').select('company_id,minutes').gte('work_date',start).lt('work_date',next),
      supabase.from('nps_responses').select('company_id,score'),
      supabase.from('projects').select('company_id,name,status').order('updated_at',{ascending:false}),
      supabase.from('account_documents').select('company_id,title,document_date,document_type').order('created_at',{ascending:false}),
      supabase.from('activity_log').select('company_id,event_type,metadata,created_at').order('created_at',{ascending:false}).limit(120),
    ]);
    if (companiesResult.error) { setError(`Não consegui carregar a carteira: ${companiesResult.error.message}`); setLoading(false); return; }
    const companies:any[] = companiesResult.data || [], invites:any[] = invitesResult.data || [], profiles:any[] = profilesResult.data || [], hourRows:any[] = hoursResult.data || [], npsRows:any[] = npsResult.data || [], projectRows:any[] = projectsResult.data || [], documentRows:any[] = documentsResult.data || [], historyRows:any[] = historyResult.data || [];
    const rows:ClientRow[] = await Promise.all(companies.map(async (item:any) => {
      const invite = invites.find((entry:any) => entry.company_id === item.id), profile = profiles.find((entry:any) => entry.company_id === item.id);
      const consumed = hourRows.filter((entry:any) => entry.company_id===item.id).reduce((total:number,entry:any)=>total+Number(entry.minutes||0),0);
      const contracted = Number(item.monthly_hours_contracted || 0), scores = npsRows.filter((entry:any)=>entry.company_id===item.id).map((entry:any)=>Number(entry.score));
      const avg = scores.length ? scores.reduce((a:number,b:number)=>a+b,0)/scores.length : null;
      return {
        id:item.id,name:item.display_name,logoUrl:await resolveLogo(item.logo_url),status:(item.status||'active') as ClientRow['status'],createdAt:item.created_at,closedAt:item.closed_at||'',contact:invite?.full_name||'Contato principal não definido',email:invite?.email||'—',decisionTitle:invite?.job_title||item.decision_maker_title||'',decisionBirthday:invite?.birthday||'',phone:invite?.phone||'',whatsapp:invite?.whatsapp||'',service:item.service_type||'Serviço a definir',segment:item.segment||'',contractedHours:contracted,hours:`${formatHours(consumed)} / ${contracted?`${contracted}h`:'—'}`,usage:contracted>0?Math.min(100,Math.round(consumed/(contracted*60)*100)):0,nps:avg===null?'—':avg.toFixed(1).replace('.',','),access:profile?.active?'Ativo':invite?'Convite preparado':'Sem acesso',drive:item.drive_folder_url?'Conectado':'Não conectado',startDate:item.start_date||'',endDate:item.end_date||'',autoRenew:Boolean(item.auto_renew),addressStreet:item.address_street||'',addressNumber:item.address_number||'',neighborhood:item.address_neighborhood||'',city:item.address_city||'',state:item.address_state||'',hasBranches:Boolean(item.has_branches),branches:Array.isArray(item.branches)?item.branches.map(String):[],contractValue:item.contract_value==null?null:Number(item.contract_value),billingFrequency:item.billing_frequency||'monthly',paymentMethod:item.payment_method||'pix',billingStatus:item.billing_status==='overdue'?'Em atraso':item.billing_status==='pending'?'Pendente':item.billing_status==='current'?'Em dia':'A acompanhar',billingDay:item.billing_day==null?null:Number(item.billing_day),billingDueRule:item.billing_due_rule||'fixed_day',billingLeadDays:Number(item.billing_lead_days??3),financialNote:item.payment_notes||'',lateFeePercent:Number(item.late_fee_percent||0),dailyInterestPercent:Number(item.daily_interest_percent||0),penaltyEnabled:Boolean(item.contract_penalty_enabled),penaltyText:item.contract_penalty_text||'',terminationPenaltyType:(item.termination_penalty_type||'none') as TerminationPenaltyType,terminationPenaltyValue:Number(item.termination_penalty_value||0),terminationPaymentDays:Number(item.termination_payment_days||0),terminationPaymentRule:(item.termination_payment_rule||'calendar_days') as TerminationPaymentRule,automationEnabled:Boolean(item.automation_enabled),welcomeEmailEnabled:Boolean(item.welcome_email_enabled),dueReminderEnabled:Boolean(item.due_reminder_enabled),overdueEmailEnabled:Boolean(item.overdue_email_enabled),overdueEmailAfterDays:Number(item.overdue_email_after_days??1),extrajudicialEmailEnabled:Boolean(item.extrajudicial_email_enabled),extrajudicialAfterDays:item.extrajudicial_after_days==null?null:Number(item.extrajudicial_after_days),birthdayEmailEnabled:Boolean(item.birthday_email_enabled),terminationEmailEnabled:Boolean(item.termination_email_enabled),terminationSignedAt:item.termination_signed_at||'',terminationPaymentDueAt:item.termination_payment_due_at||'',terminationPenaltyAmount:item.termination_penalty_amount==null?null:Number(item.termination_penalty_amount),terminationBalanceSnapshot:item.termination_balance_snapshot==null?null:Number(item.termination_balance_snapshot),responsibilities:[],projects:projectRows.filter((entry:any)=>entry.company_id===item.id).slice(0,6).map((entry:any)=>({name:entry.name,status:String(entry.status).replaceAll('_',' ')})),documents:documentRows.filter((entry:any)=>entry.company_id===item.id).map((entry:any)=>`${entry.title}${entry.document_date?` · ${formatDate(entry.document_date)}`:''}`),history:historyRows.filter((entry:any)=>entry.company_id===item.id).slice(0,8).map((entry:any)=>({title:String(entry.event_type).replaceAll('_',' '),detail:typeof entry.metadata==='object'?JSON.stringify(entry.metadata):'',date:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(entry.created_at))})),
      };
    }));
    setClients(rows);
    const active=companies.filter((item:any)=>item.status==='active').length,joined=companies.filter((item:any)=>item.created_at>=startIso&&item.created_at<nextIso).length,exited=companies.filter((item:any)=>item.closed_at&&item.closed_at>=startIso&&item.closed_at<nextIso).length;
    setMetrics({active,joined,exited,net:joined-exited}); setLoading(false);
  }
  useEffect(()=>{ void loadClients(); },[]);

  function patchForm(patch:Partial<FormState>) { setForm((current)=>({...current,...patch})); }
  function patchDraft(patch:Partial<ClientRow>) { setEditDraft((current)=>current?{...current,...patch}:current); }
  function openClient(client:ClientRow,tab:AccountTab='data') { setEditDraft({...client,branches:[...(client.branches||[])],projects:[...(client.projects||[])],documents:[...(client.documents||[])],history:[...(client.history||[])]}); setEditLogoFile(null); setAccountTab(tab); setManageOpen(true); }
  function requestLifecycle(client:ClientRow,type:LifecycleAction) { setLifecycle({client,type}); setLifecycleReason(''); setLifecycleDate(new Date().toISOString().slice(0,10)); }

  async function uploadLogo(companyId:string,file:File) {
    if (!supabase) return '';
    const extension=file.name.split('.').pop()?.toLowerCase()||'png', path=`${companyId}/brand/logo-${Date.now()}.${extension}`;
    const {error}=await supabase.storage.from('cali-workspace-private').upload(path,file,{upsert:true}); if(error) throw error; return `private:${path}`;
  }
  async function uploadDocument(companyId:string,file:File,type:'contract'|'addendum',documentDate:string) {
    if (!supabase) return;
    const safe=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-'),path=`${companyId}/account/${type}-${Date.now()}-${safe}`;
    const {error:uploadError}=await supabase.storage.from('cali-workspace-private').upload(path,file,{upsert:false}); if(uploadError) throw uploadError;
    const {data:sessionData}=await supabase.auth.getSession(); const {error}=await supabase.from('account_documents').insert({company_id:companyId,document_type:type,title:type==='contract'?'Contrato assinado':'Aditivo contratual',document_date:documentDate||null,storage_path:path,client_visible:true,created_by:sessionData.session?.user.id??null}); if(error) throw error;
  }

  async function createClient(event:FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if(!form.company.trim()||!form.contact.trim()||!form.email.trim()){setRegistrationTab('data');return;}
    const contracted=Number(form.hours.replace(',','.')||0),value=currencyToNumber(form.contractValue),segment=form.segment==='Outro'?form.segmentOther.trim():form.segment,branches=form.hasBranches?form.branchesText.split('\n').map((v)=>v.trim()).filter(Boolean):[];
    const newFields={ decisionBirthday:form.decisionBirthday,lateFeePercent:Number(form.lateFeePercent||0),dailyInterestPercent:Number(form.dailyInterestPercent||0),terminationPenaltyType:form.terminationPenaltyType,terminationPenaltyValue:Number(form.terminationPenaltyValue||0),terminationPaymentDays:Number(form.terminationPaymentDays||0),terminationPaymentRule:form.terminationPaymentRule };
    if(preview||!supabase){
      const client:ClientRow={id:`c-${Date.now()}`,name:form.company.trim(),logoUrl:logoFile?URL.createObjectURL(logoFile):'',status:'active',createdAt:new Date().toISOString(),contact:form.contact.trim(),email:form.email.trim(),decisionTitle:form.decisionTitle,decisionBirthday:form.decisionBirthday,phone:form.phone,whatsapp:form.whatsapp,service:form.service||'A definir',segment:segment||'—',contractedHours:contracted,hours:`0h / ${contracted||0}h`,usage:0,nps:'—',access:'Convite preparado',drive:'Não conectado',startDate:form.startDate,endDate:form.endDate,autoRenew:form.autoRenew,addressStreet:form.addressStreet,addressNumber:form.addressNumber,neighborhood:form.neighborhood,city:form.city,state:form.state,hasBranches:form.hasBranches,branches,contractValue:value||null,billingFrequency:form.billingFrequency,paymentMethod:form.paymentMethod,billingStatus:'A acompanhar',billingDay:form.billingDay?Number(form.billingDay):null,billingDueRule:form.billingDueRule,billingLeadDays:Number(form.billingLeadDays||3),financialNote:form.notes,lateFeePercent:newFields.lateFeePercent,dailyInterestPercent:newFields.dailyInterestPercent,penaltyEnabled:form.penaltyEnabled,penaltyText:form.penaltyText,terminationPenaltyType:newFields.terminationPenaltyType,terminationPenaltyValue:newFields.terminationPenaltyValue,terminationPaymentDays:newFields.terminationPaymentDays,terminationPaymentRule:newFields.terminationPaymentRule,automationEnabled:false,welcomeEmailEnabled:true,dueReminderEnabled:true,overdueEmailEnabled:true,overdueEmailAfterDays:1,extrajudicialEmailEnabled:false,birthdayEmailEnabled:false,terminationEmailEnabled:true,responsibilities:[],projects:[],documents:[contractFile?.name,addendumFile?.name].filter(Boolean) as string[],history:[{title:'Conta criada',detail:'Cadastro, contrato e acesso preparados',date:'agora'}]};
      setClients((current)=>[client,...current]); setMetrics((current)=>({...current,active:current.active+1,joined:current.joined+1,net:current.net+1})); setMessage(`${client.name} foi cadastrado.`); setCreateOpen(false); setForm(emptyForm); openClient(client); return;
    }
    setSaving(true);
    try{
      const {data:companyId,error:createError}=await supabase.rpc('create_client_account',{p_company:form.company.trim(),p_contact:form.contact.trim(),p_email:form.email.trim().toLowerCase(),p_hours:contracted>0?contracted:null,p_service_type:form.service||null}); if(createError) throw createError;
      const id=String(companyId),logo=logoFile?await uploadLogo(id,logoFile):null;
      const {error:updateError}=await supabase.from('companies').update({logo_url:logo,segment:segment||null,decision_maker_title:form.decisionTitle||null,start_date:form.startDate||null,end_date:form.endDate||null,auto_renew:form.autoRenew,address_street:form.addressStreet||null,address_number:form.addressNumber||null,address_neighborhood:form.neighborhood||null,address_city:form.city||null,address_state:form.state||null,has_branches:form.hasBranches,branches,contract_value:value>0?value:null,billing_frequency:form.billingFrequency,payment_method:form.paymentMethod,billing_day:form.billingDay?Number(form.billingDay):null,billing_due_rule:form.billingDueRule,billing_lead_days:Number(form.billingLeadDays||3),payment_notes:form.notes||null,late_fee_percent:newFields.lateFeePercent,daily_interest_percent:newFields.dailyInterestPercent,contract_penalty_enabled:form.penaltyEnabled,contract_penalty_text:form.penaltyText||null,termination_penalty_type:newFields.terminationPenaltyType,termination_penalty_value:newFields.terminationPenaltyValue,termination_payment_days:newFields.terminationPaymentDays,termination_payment_rule:newFields.terminationPaymentRule,status:'active'}).eq('id',id); if(updateError) throw updateError;
      const {error:inviteError}=await supabase.from('client_invites').update({job_title:form.decisionTitle||null,phone:form.phone||null,whatsapp:form.whatsapp||null,birthday:form.decisionBirthday||null}).eq('company_id',id).eq('is_primary',true); if(inviteError) throw inviteError;
      if(contractFile) await uploadDocument(id,contractFile,'contract',contractDate); if(addendumFile) await uploadDocument(id,addendumFile,'addendum',addendumDate);
      setCreateOpen(false); setForm(emptyForm); setLogoFile(null); setLogoPreview(''); setContractFile(null); setAddendumFile(null); setMessage(`${form.company.trim()} foi cadastrado.`); await loadClients();
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível cadastrar o cliente.');}finally{setSaving(false);}
  }

  async function saveClient() {
    if(!editDraft)return; setSaving(true); setError('');
    try{
      let logoValue=editDraft.logoUrl;
      if(editLogoFile&&preview)logoValue=URL.createObjectURL(editLogoFile);
      if(editLogoFile&&!preview&&supabase)logoValue=await uploadLogo(editDraft.id,editLogoFile);
      const next={...editDraft,logoUrl:logoValue};
      if(preview||!supabase){setClients((current)=>current.map((client)=>client.id===next.id?next:client));setManageOpen(false);setMessage(`Alterações de ${next.name} salvas.`);return;}
      const {error:companyError}=await supabase.from('companies').update({display_name:next.name,logo_url:logoValue?.startsWith('blob:')?null:logoValue,segment:next.segment||null,service_type:next.service||null,monthly_hours_contracted:next.contractedHours||null,start_date:next.startDate||null,end_date:next.endDate||null,auto_renew:Boolean(next.autoRenew),address_street:next.addressStreet||null,address_number:next.addressNumber||null,address_neighborhood:next.neighborhood||null,address_city:next.city||null,address_state:next.state||null,has_branches:Boolean(next.hasBranches),branches:next.hasBranches?(next.branches||[]):[],contract_value:next.contractValue||null,billing_frequency:next.billingFrequency||null,payment_method:next.paymentMethod||null,billing_day:next.billingDay||null,billing_due_rule:next.billingDueRule||'fixed_day',billing_lead_days:next.billingLeadDays??3,payment_notes:next.financialNote||null,late_fee_percent:next.lateFeePercent||0,daily_interest_percent:next.dailyInterestPercent||0,contract_penalty_enabled:Boolean(next.penaltyEnabled),contract_penalty_text:next.penaltyText||null,termination_penalty_type:next.terminationPenaltyType||'none',termination_penalty_value:next.terminationPenaltyValue||0,termination_payment_days:next.terminationPaymentDays||0,termination_payment_rule:next.terminationPaymentRule||'calendar_days',automation_enabled:Boolean(next.automationEnabled),welcome_email_enabled:Boolean(next.welcomeEmailEnabled),due_reminder_enabled:Boolean(next.dueReminderEnabled),overdue_email_enabled:Boolean(next.overdueEmailEnabled),overdue_email_after_days:next.overdueEmailAfterDays??1,extrajudicial_email_enabled:Boolean(next.extrajudicialEmailEnabled),extrajudicial_after_days:next.extrajudicialAfterDays??null,birthday_email_enabled:Boolean(next.birthdayEmailEnabled),termination_email_enabled:Boolean(next.terminationEmailEnabled)}).eq('id',next.id); if(companyError) throw companyError;
      const {error:inviteError}=await supabase.from('client_invites').update({full_name:next.contact,email:next.email.toLowerCase(),job_title:next.decisionTitle||null,phone:next.phone||null,whatsapp:next.whatsapp||null,birthday:next.decisionBirthday||null}).eq('company_id',next.id).eq('is_primary',true); if(inviteError) throw inviteError;
      setManageOpen(false);setMessage(`Alterações de ${next.name} salvas.`);await loadClients();
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar as alterações.');}finally{setSaving(false);}
  }

  async function applyLifecycle() {
    if(!lifecycle)return; if(lifecycle.type!=='reactivate'&&!lifecycleReason.trim())return;
    const nextStatus:ClientRow['status']=lifecycle.type==='pause'?'paused':lifecycle.type==='archive'?'archived':lifecycle.type==='close'?'closed':'active';
    const projection=lifecycle.type==='close'?terminationProjection(lifecycle.client,lifecycleDate):null;
    if(preview||!supabase){setClients((current)=>current.map((client)=>client.id===lifecycle.client.id?{...client,status:nextStatus,access:nextStatus==='active'?'Ativo':nextStatus==='paused'?'Bloqueado':'Encerrado',closedAt:nextStatus==='closed'?new Date().toISOString():client.closedAt,terminationSignedAt:lifecycle.type==='close'?lifecycleDate:client.terminationSignedAt,terminationPaymentDueAt:projection?.dueDate||client.terminationPaymentDueAt,terminationPenaltyAmount:projection?.penalty??client.terminationPenaltyAmount,terminationBalanceSnapshot:projection?.remainingBalance??client.terminationBalanceSnapshot}:client));setLifecycle(null);setMessage(`${lifecycle.client.name}: ${statusLabel(nextStatus).toLowerCase()}.`);return;}
    setSaving(true);
    try{
      const now=new Date().toISOString(),patch:Record<string,unknown>={status:nextStatus};
      if(lifecycle.type==='pause')Object.assign(patch,{paused_at:now,paused_reason:lifecycleReason});
      if(lifecycle.type==='archive')Object.assign(patch,{archived_at:now});
      if(lifecycle.type==='reactivate')Object.assign(patch,{paused_at:null,paused_reason:null});
      if(lifecycle.type==='close')Object.assign(patch,{closed_at:now,closed_reason:lifecycleReason,termination_signed_at:lifecycleDate,termination_payment_due_at:projection?.dueDate||null,termination_penalty_amount:projection?.penalty||0,termination_balance_snapshot:projection?.remainingBalance||0});
      const {error:statusError}=await supabase.from('companies').update(patch).eq('id',lifecycle.client.id);if(statusError)throw statusError;
      await supabase.from('profiles').update({active:nextStatus==='active'}).eq('company_id',lifecycle.client.id).eq('role','client');
      await supabase.from('activity_log').insert({company_id:lifecycle.client.id,event_type:`account_${lifecycle.type}`,entity_type:'company',entity_id:lifecycle.client.id,metadata:{reason:lifecycleReason||null,termination_date:lifecycle.type==='close'?lifecycleDate:null,penalty:projection?.penalty||null,due_date:projection?.dueDate||null}});
      if(lifecycle.type==='close'&&lifecycle.client.automationEnabled&&lifecycle.client.terminationEmailEnabled){await supabase.from('communication_outbox').insert({company_id:lifecycle.client.id,template_key:'termination',recipient_email:lifecycle.client.email,recipient_name:lifecycle.client.contact,subject:`CALI RH · encerramento contratual · ${lifecycle.client.name}`,status:'pending',scheduled_for:now,metadata:{termination_date:lifecycleDate,penalty:projection?.penalty||0,due_date:projection?.dueDate||null}});}
      setLifecycle(null);setMessage(`Status de ${lifecycle.client.name} atualizado.`);await loadClients();
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível atualizar a conta.');}finally{setSaving(false);}
  }

  const registrationItems:Array<{id:RegistrationTab;label:string}>=[{id:'data',label:'Dados cadastrais'},{id:'contract',label:'Contrato'},{id:'financial',label:'Financeiro'},{id:'documents',label:'Documentos'}];
  const accountItems:Array<{id:AccountTab;label:string}>=[{id:'data',label:'Dados cadastrais'},{id:'contract',label:'Contrato'},{id:'financial',label:'Financeiro'},{id:'operation',label:'Operação'},{id:'communications',label:'Comunicações'},{id:'history',label:'Histórico'}];
  const regIndex=registrationItems.findIndex((item)=>item.id===registrationTab);
  const closeProjection=lifecycle?.type==='close'?terminationProjection(lifecycle.client,lifecycleDate):null;

  return <Shell role="admin">
    <section className="page clients-page-v3">
      <div className="eyebrow">CARTEIRA CALI</div>
      <div className="page-heading"><div><h1>Clientes</h1><p>Gestão da conta, contrato, financeiro, acesso e operação em uma única visão.</p></div><button className="primary" onClick={()=>{setForm(emptyForm);setRegistrationTab('data');setCreateOpen(true);}}><Plus size={18}/>Cadastrar cliente</button></div>
      <section className="client-portfolio-metrics"><article><span>Contas ativas</span><strong>{metrics.active}</strong><small>contratos em operação</small></article><article><span>Entraram no mês</span><strong>+{metrics.joined}</strong><small>novas contas na carteira</small></article><article><span>Saíram no mês</span><strong>{metrics.exited}</strong><small>encerramentos registrados</small></article><article className={metrics.net>=0?'positive':'negative'}><span>Saldo do mês</span><strong>{metrics.net>0?`+${metrics.net}`:metrics.net}</strong><small>entradas menos saídas</small></article></section>
      {message&&<div className="inline-notice success"><CheckCircle2 size={18}/>{message}</div>}{error&&<div className="inline-notice">{error}</div>}
      <section className="panel data-panel client-list-panel"><div className="data-head client-data-head"><span>Cliente</span><span>Horas do ciclo</span><span>NPS</span><span>Acesso</span><span>Drive</span><span>Ações</span></div>{loading&&<div className="data-loading"><Loader2 className="spin"/>Carregando carteira…</div>}{clients.map((client)=><div className="client-data-row client-data-row-v2" key={client.id} role="button" tabIndex={0} onClick={()=>openClient(client)} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' ')openClient(client);}}><div className="client-identity"><div className="company-mark company-logo-slot">{client.logoUrl?<img src={client.logoUrl} alt={`Logo ${client.name}`}/>:client.name[0]}</div><div><strong>{client.name}</strong><span>{client.contact} · {client.email}</span><small>{client.service}</small></div></div><div className="hours-cell"><span>{client.hours}</span><Progress value={client.usage}/></div><strong className="nps-cell">{client.nps}</strong><span className={`status-pill ${client.status==='active'?'ok':client.status==='paused'?'warn':''}`}><Mail size={15}/>{statusLabel(client.status)}</span><span className={`status-pill ${client.drive==='Conectado'?'ok':''}`}><Cloud size={15}/>{client.drive}</span><div className="client-quick-actions" onClick={(e)=>e.stopPropagation()}><button title="Editar" onClick={()=>openClient(client,'data')}><Pencil size={16}/></button>{client.status==='paused'?<button title="Reativar" onClick={()=>requestLifecycle(client,'reactivate')}><RotateCcw size={16}/></button>:<button title="Bloquear" onClick={()=>requestLifecycle(client,'pause')}><PauseCircle size={16}/></button>}<button title="Arquivar" onClick={()=>requestLifecycle(client,'archive')}><Archive size={16}/></button><button title="Encerrar contrato" onClick={()=>requestLifecycle(client,'close')}><Ban size={16}/></button></div></div>)}</section>
    </section>

    {createOpen&&<div className="modal-backdrop full-screen-modal"><form className="modal-card client-account-modal compact-account-modal" onSubmit={createClient}><button type="button" className="modal-close" onClick={()=>setCreateOpen(false)}><X size={19}/></button><header className="account-modal-intro"><span className="section-kicker">NOVA CONTA</span><h2>Cadastrar cliente</h2><p>Abra a ficha da empresa e conecte contrato, cobrança, acesso e documentos desde o início.</p></header><Tabs value={registrationTab} onChange={setRegistrationTab} items={registrationItems}/><div className="account-tab-scroll">
      {registrationTab==='data'&&<section className="account-tab-pane"><div className="logo-registration-row"><div className="company-logo-editor">{logoPreview?<img src={logoPreview} alt="Prévia da logo"/>:<Building2 size={27}/>}</div><label className="secondary logo-upload-button"><ImagePlus size={16}/>Logo da empresa<input type="file" accept="image/*,.svg" onChange={(e)=>{const file=e.target.files?.[0]||null;setLogoFile(file);setLogoPreview(file?URL.createObjectURL(file):'');}}/></label><span>Usada no acesso do cliente e na gestão da conta.</span></div><div className="form-grid account-tab-form"><label className="stacked-label">Empresa<input value={form.company} onChange={(e)=>patchForm({company:e.target.value})} required/></label><label className="stacked-label">Segmento<select value={form.segment} onChange={(e)=>patchForm({segment:e.target.value})}><option value="">Selecionar</option>{segments.map((item)=><option key={item}>{item}</option>)}</select></label>{form.segment==='Outro'&&<label className="stacked-label wide">Qual segmento?<input value={form.segmentOther} onChange={(e)=>patchForm({segmentOther:e.target.value})}/></label>}<label className="stacked-label">Serviço<select value={form.service} onChange={(e)=>patchForm({service:e.target.value})}><option value="">Selecionar</option>{services.map((item)=><option key={item}>{item}</option>)}</select></label><label className="stacked-label">Horas contratadas<input inputMode="decimal" value={form.hours} onChange={(e)=>patchForm({hours:e.target.value.replace(/[^0-9.,]/g,'')})}/></label><label className="stacked-label">Cidade<input value={form.city} onChange={(e)=>patchForm({city:e.target.value})}/></label><label className="stacked-label">Estado<input maxLength={2} value={form.state} onChange={(e)=>patchForm({state:e.target.value.toUpperCase().slice(0,2)})}/></label><label className="stacked-label">Endereço<input value={form.addressStreet} onChange={(e)=>patchForm({addressStreet:e.target.value})}/></label><label className="stacked-label">Número<input value={form.addressNumber} onChange={(e)=>patchForm({addressNumber:e.target.value})}/></label><label className="stacked-label">Bairro<input value={form.neighborhood} onChange={(e)=>patchForm({neighborhood:e.target.value})}/></label><label className="check-line account-check wide"><input type="checkbox" checked={form.hasBranches} onChange={(e)=>patchForm({hasBranches:e.target.checked})}/><span><strong>Possui filiais</strong><small>Registre as demais localidades quando houver.</small></span></label>{form.hasBranches&&<label className="stacked-label wide">Filiais<textarea rows={2} value={form.branchesText} onChange={(e)=>patchForm({branchesText:e.target.value})}/></label>}<label className="stacked-label">Nome do decisor<input value={form.contact} onChange={(e)=>patchForm({contact:e.target.value})} required/></label><label className="stacked-label">Cargo<input value={form.decisionTitle} onChange={(e)=>patchForm({decisionTitle:e.target.value})}/></label><label className="stacked-label"><span className="label-with-icon"><Cake size={14}/>Aniversário</span><input type="date" value={form.decisionBirthday} onChange={(e)=>patchForm({decisionBirthday:e.target.value})}/></label><label className="stacked-label">E-mail de acesso<input type="email" value={form.email} onChange={(e)=>patchForm({email:e.target.value})} required/></label><label className="stacked-label">Telefone<input value={form.phone} onChange={(e)=>patchForm({phone:e.target.value})}/></label><label className="stacked-label">WhatsApp<input value={form.whatsapp} onChange={(e)=>patchForm({whatsapp:e.target.value})}/></label></div></section>}
      {registrationTab==='contract'&&<section className="account-tab-pane"><div className="account-pane-heading"><FileCheck2 size={18}/><div><strong>Contrato</strong><span>Prazo, renovação e rescisão.</span></div></div><div className="form-grid account-tab-form"><label className="stacked-label">Início<input type="date" value={form.startDate} onChange={(e)=>patchForm({startDate:e.target.value})}/></label><label className="stacked-label">Término<input type="date" value={form.endDate} onChange={(e)=>patchForm({endDate:e.target.value})}/></label><div className="derived-field"><span>Duração</span><strong>{contractDuration(form.startDate,form.endDate)}</strong></div><label className="check-line account-check"><input type="checkbox" checked={form.autoRenew} onChange={(e)=>patchForm({autoRenew:e.target.checked})}/><span><strong>Renovação automática</strong><small>Conforme condição contratual.</small></span></label><label className="check-line account-check wide"><input type="checkbox" checked={form.penaltyEnabled} onChange={(e)=>patchForm({penaltyEnabled:e.target.checked,terminationPenaltyType:e.target.checked?form.terminationPenaltyType:'none'})}/><span><strong>Multa por encerramento antecipado</strong><small>Ative somente quando constar no contrato.</small></span></label>{form.penaltyEnabled&&<><label className="stacked-label">Base da multa<select value={form.terminationPenaltyType} onChange={(e)=>patchForm({terminationPenaltyType:e.target.value as TerminationPenaltyType})}><option value="none">Somente regra textual</option><option value="remaining_balance_percent">% sobre saldo restante</option><option value="contract_total_percent">% sobre valor total estimado</option><option value="fixed_amount">Valor fixo</option><option value="monthly_fee_multiple">Múltiplos da mensalidade</option></select></label><label className="stacked-label">Parâmetro<input inputMode="decimal" value={form.terminationPenaltyValue} onChange={(e)=>patchForm({terminationPenaltyValue:e.target.value.replace(/[^0-9.,]/g,'')})} placeholder="Ex.: 20 ou 1,5"/></label><label className="stacked-label">Prazo para pagamento<input inputMode="numeric" value={form.terminationPaymentDays} onChange={(e)=>patchForm({terminationPaymentDays:e.target.value.replace(/\D/g,'').slice(0,3)})}/><small className="field-helper">dias após o distrato</small></label><label className="stacked-label">Contagem<select value={form.terminationPaymentRule} onChange={(e)=>patchForm({terminationPaymentRule:e.target.value as TerminationPaymentRule})}><option value="calendar_days">Dias corridos</option><option value="business_days">Dias úteis</option></select></label><label className="stacked-label wide">Regra / cláusula<textarea rows={2} value={form.penaltyText} onChange={(e)=>patchForm({penaltyText:e.target.value})}/></label></>}</div></section>}
      {registrationTab==='financial'&&<section className="account-tab-pane"><div className="account-pane-heading"><WalletCards size={18}/><div><strong>Financeiro</strong><span>Vencimento, atraso e parâmetros de cobrança.</span></div></div><div className="form-grid account-tab-form"><label className="stacked-label">Valor do contrato<input value={form.contractValue} onChange={(e)=>patchForm({contractValue:e.target.value})} placeholder="R$ 5.800,00"/></label><label className="stacked-label">Recorrência<select value={form.billingFrequency} onChange={(e)=>patchForm({billingFrequency:e.target.value})}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></select></label><label className="stacked-label">Pagamento<select value={form.paymentMethod} onChange={(e)=>patchForm({paymentMethod:e.target.value})}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></select></label><label className="stacked-label">Regra de vencimento<select value={form.billingDueRule} onChange={(e)=>patchForm({billingDueRule:e.target.value})}><option value="fixed_day">Dia fixo</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></select></label>{form.billingDueRule==='fixed_day'&&<label className="stacked-label">Dia<input value={form.billingDay} onChange={(e)=>patchForm({billingDay:e.target.value.replace(/\D/g,'').slice(0,2)})}/></label>}<label className="stacked-label">Aviso antecipado<input value={form.billingLeadDays} onChange={(e)=>patchForm({billingLeadDays:e.target.value.replace(/\D/g,'').slice(0,2)})}/><small className="field-helper">dias antes</small></label><label className="stacked-label">Multa por atraso (%)<input inputMode="decimal" value={form.lateFeePercent} onChange={(e)=>patchForm({lateFeePercent:e.target.value.replace(/[^0-9.,]/g,'')})}/></label><label className="stacked-label">Juros diário (%)<input inputMode="decimal" value={form.dailyInterestPercent} onChange={(e)=>patchForm({dailyInterestPercent:e.target.value.replace(/[^0-9.,]/g,'')})}/></label><label className="stacked-label wide">Observação financeira<input value={form.notes} onChange={(e)=>patchForm({notes:e.target.value})}/></label></div><div className="automation-preview"><ReceiptText size={17}/><div><strong>Cobrança estruturada</strong><p>O registro financeiro terá vencimento, baixa de pagamento, multa e juros. A automação só será ativada depois na ficha do cliente.</p></div></div></section>}
      {registrationTab==='documents'&&<section className="account-tab-pane"><div className="account-pane-heading"><FileCheck2 size={18}/><div><strong>Documentos</strong><span>Contrato e aditivos vinculados à empresa.</span></div></div><div className="document-upload-grid document-upload-grid-v2"><div className="account-upload-card"><div><strong>Contrato assinado</strong><span>{contractFile?.name||'PDF, DOC ou imagem'}</span></div><label><Upload size={15}/>Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e)=>setContractFile(e.target.files?.[0]||null)}/></label><input type="date" value={contractDate} onChange={(e)=>setContractDate(e.target.value)}/></div><div className="account-upload-card"><div><strong>Aditivo contratual</strong><span>{addendumFile?.name||'Opcional'}</span></div><label><Upload size={15}/>Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e)=>setAddendumFile(e.target.files?.[0]||null)}/></label><input type="date" value={addendumDate} onChange={(e)=>setAddendumDate(e.target.value)}/></div></div></section>}
    </div><footer className="account-modal-footer"><span>Etapa {regIndex+1} de {registrationItems.length}</span><div className="modal-actions">{regIndex>0&&<button type="button" className="secondary" onClick={()=>setRegistrationTab(registrationItems[regIndex-1].id)}><ChevronLeft size={15}/>Voltar</button>}{regIndex<registrationItems.length-1?<button type="button" className="primary" onClick={()=>setRegistrationTab(registrationItems[regIndex+1].id)}>Continuar<ChevronRight size={15}/></button>:<button className="primary" type="submit" disabled={saving}>{saving?'Salvando…':'Cadastrar conta'}</button>}</div></footer></form></div>}

    {manageOpen&&editDraft&&<div className="modal-backdrop full-screen-modal"><div className="modal-card client-account-modal compact-account-modal management-modal-v3"><button type="button" className="modal-close" onClick={()=>setManageOpen(false)}><X size={19}/></button><header className="account-management-header"><div className="account-client-brand"><div className="company-logo-editor management-logo">{editDraft.logoUrl?<img src={editDraft.logoUrl} alt={`Logo ${editDraft.name}`}/>:editDraft.name[0]}</div><div><span className="section-kicker">GESTÃO DA CONTA</span><h2>{editDraft.name}</h2><p>{editDraft.segment||'Segmento não informado'} · {editDraft.service}</p></div></div><div className="account-header-status"><span className={`status-pill ${editDraft.status==='active'?'ok':editDraft.status==='paused'?'warn':''}`}><ShieldCheck size={14}/>{statusLabel(editDraft.status)}</span><span className={`status-pill ${editDraft.drive==='Conectado'?'ok':''}`}><Cloud size={14}/>Drive {editDraft.drive.toLowerCase()}</span></div></header><Tabs value={accountTab} onChange={setAccountTab} items={accountItems}/><div className="account-tab-scroll account-management-scroll">
      {accountTab==='data'&&<section className="account-tab-pane"><div className="account-pane-heading"><Building2 size={18}/><div><strong>Dados cadastrais</strong><span>Identidade, serviço, localização e decisor.</span></div></div><div className="logo-registration-row edit-logo-row"><label className="secondary logo-upload-button"><ImagePlus size={15}/>Alterar logo<input type="file" accept="image/*,.svg" onChange={(e)=>setEditLogoFile(e.target.files?.[0]||null)}/></label>{editLogoFile&&<span>{editLogoFile.name}</span>}</div><div className="form-grid account-tab-form"><label className="stacked-label">Empresa<input value={editDraft.name} onChange={(e)=>patchDraft({name:e.target.value})}/></label><label className="stacked-label">Segmento<select value={editDraft.segment||''} onChange={(e)=>patchDraft({segment:e.target.value})}><option value="">Selecionar</option>{segments.map((item)=><option key={item}>{item}</option>)}</select></label><label className="stacked-label">Serviço<select value={editDraft.service} onChange={(e)=>patchDraft({service:e.target.value})}>{services.map((item)=><option key={item}>{item}</option>)}</select></label><label className="stacked-label">Horas contratadas<input inputMode="decimal" value={editDraft.contractedHours||''} onChange={(e)=>patchDraft({contractedHours:Number(e.target.value.replace(',','.'))||0})}/></label><label className="stacked-label">Cidade<input value={editDraft.city||''} onChange={(e)=>patchDraft({city:e.target.value})}/></label><label className="stacked-label">Estado<input maxLength={2} value={editDraft.state||''} onChange={(e)=>patchDraft({state:e.target.value.toUpperCase().slice(0,2)})}/></label><label className="stacked-label">Endereço<input value={editDraft.addressStreet||''} onChange={(e)=>patchDraft({addressStreet:e.target.value})}/></label><label className="stacked-label">Número<input value={editDraft.addressNumber||''} onChange={(e)=>patchDraft({addressNumber:e.target.value})}/></label><label className="stacked-label">Bairro<input value={editDraft.neighborhood||''} onChange={(e)=>patchDraft({neighborhood:e.target.value})}/></label><label className="check-line account-check wide"><input type="checkbox" checked={Boolean(editDraft.hasBranches)} onChange={(e)=>patchDraft({hasBranches:e.target.checked,branches:e.target.checked?editDraft.branches:[]})}/><span><strong>Possui filiais</strong><small>Registre as demais localidades.</small></span></label>{editDraft.hasBranches&&<label className="stacked-label wide">Filiais<textarea rows={2} value={(editDraft.branches||[]).join('\n')} onChange={(e)=>patchDraft({branches:e.target.value.split('\n').map((v)=>v.trim()).filter(Boolean)})}/></label>}<label className="stacked-label">Nome do decisor<input value={editDraft.contact} onChange={(e)=>patchDraft({contact:e.target.value})}/></label><label className="stacked-label">Cargo<input value={editDraft.decisionTitle||''} onChange={(e)=>patchDraft({decisionTitle:e.target.value})}/></label><label className="stacked-label"><span className="label-with-icon"><Cake size={14}/>Aniversário</span><input type="date" value={editDraft.decisionBirthday||''} onChange={(e)=>patchDraft({decisionBirthday:e.target.value})}/></label><label className="stacked-label">E-mail<input type="email" value={editDraft.email} onChange={(e)=>patchDraft({email:e.target.value})}/></label><label className="stacked-label">Telefone<input value={editDraft.phone||''} onChange={(e)=>patchDraft({phone:e.target.value})}/></label><label className="stacked-label">WhatsApp<input value={editDraft.whatsapp||''} onChange={(e)=>patchDraft({whatsapp:e.target.value})}/></label></div></section>}
      {accountTab==='contract'&&<section className="account-tab-pane"><div className="account-pane-heading"><FileCheck2 size={18}/><div><strong>Contrato</strong><span>Prazo, renovação e encerramento.</span></div></div><div className="account-summary-strip"><div><span>Duração</span><strong>{contractDuration(editDraft.startDate,editDraft.endDate)}</strong></div><div><span>Renovação</span><strong>{editDraft.autoRenew?'Automática':'Manual / não prevista'}</strong></div><div><span>Valor estimado do período</span><strong>{formatCurrency(estimateContractTotal(editDraft))}</strong></div></div><div className="form-grid account-tab-form"><label className="stacked-label">Início<input type="date" value={editDraft.startDate||''} onChange={(e)=>patchDraft({startDate:e.target.value})}/></label><label className="stacked-label">Término<input type="date" value={editDraft.endDate||''} onChange={(e)=>patchDraft({endDate:e.target.value})}/></label><label className="check-line account-check"><input type="checkbox" checked={Boolean(editDraft.autoRenew)} onChange={(e)=>patchDraft({autoRenew:e.target.checked})}/><span><strong>Renovação automática</strong><small>Conforme o contrato.</small></span></label><label className="check-line account-check"><input type="checkbox" checked={Boolean(editDraft.penaltyEnabled)} onChange={(e)=>patchDraft({penaltyEnabled:e.target.checked,terminationPenaltyType:e.target.checked?(editDraft.terminationPenaltyType||'remaining_balance_percent'):'none'})}/><span><strong>Multa de encerramento</strong><small>Usada na simulação de distrato.</small></span></label>{editDraft.penaltyEnabled&&<><label className="stacked-label">Base da multa<select value={editDraft.terminationPenaltyType||'none'} onChange={(e)=>patchDraft({terminationPenaltyType:e.target.value as TerminationPenaltyType})}><option value="none">Somente regra textual</option><option value="remaining_balance_percent">% sobre saldo restante</option><option value="contract_total_percent">% sobre valor total estimado</option><option value="fixed_amount">Valor fixo</option><option value="monthly_fee_multiple">Múltiplos da mensalidade</option></select></label><label className="stacked-label">Parâmetro<input inputMode="decimal" value={editDraft.terminationPenaltyValue??0} onChange={(e)=>patchDraft({terminationPenaltyValue:Number(e.target.value.replace(',','.'))||0})}/></label><label className="stacked-label">Prazo para pagamento<input inputMode="numeric" value={editDraft.terminationPaymentDays??0} onChange={(e)=>patchDraft({terminationPaymentDays:Number(e.target.value.replace(/\D/g,''))||0})}/></label><label className="stacked-label">Contagem<select value={editDraft.terminationPaymentRule||'calendar_days'} onChange={(e)=>patchDraft({terminationPaymentRule:e.target.value as TerminationPaymentRule})}><option value="calendar_days">Dias corridos</option><option value="business_days">Dias úteis</option></select></label><label className="stacked-label wide">Regra / cláusula<textarea rows={2} value={editDraft.penaltyText||''} onChange={(e)=>patchDraft({penaltyText:e.target.value})}/></label></>}</div>{editDraft.terminationSignedAt&&<div className="automation-preview"><FileCheck2 size={17}/><div><strong>Distrato registrado em {formatDate(editDraft.terminationSignedAt)}</strong><p>Multa registrada: {formatCurrency(editDraft.terminationPenaltyAmount)} · vencimento: {formatDate(editDraft.terminationPaymentDueAt)}.</p></div></div>}</section>}
      {accountTab==='financial'&&<section className="account-tab-pane"><div className="account-pane-heading"><Banknote size={18}/><div><strong>Financeiro</strong><span>Valor, vencimento, atraso e regras de cobrança.</span></div></div><div className="account-summary-strip"><div><span>Valor</span><strong>{formatCurrency(editDraft.contractValue)}</strong></div><div><span>Vencimento</span><strong>{dueRuleLabel(editDraft)}</strong></div><div><span>Situação</span><strong>{editDraft.billingStatus||'A acompanhar'}</strong></div></div><div className="form-grid account-tab-form"><label className="stacked-label">Valor do contrato<input inputMode="decimal" value={editDraft.contractValue??''} onChange={(e)=>patchDraft({contractValue:Number(e.target.value.replace(',','.'))||null})}/></label><label className="stacked-label">Recorrência<select value={editDraft.billingFrequency||'monthly'} onChange={(e)=>patchDraft({billingFrequency:e.target.value})}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></select></label><label className="stacked-label">Pagamento<select value={editDraft.paymentMethod||'pix'} onChange={(e)=>patchDraft({paymentMethod:e.target.value})}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></select></label><label className="stacked-label">Regra de vencimento<select value={editDraft.billingDueRule||'fixed_day'} onChange={(e)=>patchDraft({billingDueRule:e.target.value})}><option value="fixed_day">Dia fixo</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></select></label>{(editDraft.billingDueRule||'fixed_day')==='fixed_day'&&<label className="stacked-label">Dia<input value={editDraft.billingDay??''} onChange={(e)=>patchDraft({billingDay:Number(e.target.value.replace(/\D/g,'').slice(0,2))||null})}/></label>}<label className="stacked-label">Aviso antecipado<input value={editDraft.billingLeadDays??3} onChange={(e)=>patchDraft({billingLeadDays:Number(e.target.value.replace(/\D/g,''))||0})}/><small className="field-helper">dias antes</small></label><label className="stacked-label">Multa por atraso (%)<input inputMode="decimal" value={editDraft.lateFeePercent??0} onChange={(e)=>patchDraft({lateFeePercent:Number(e.target.value.replace(',','.'))||0})}/></label><label className="stacked-label">Juros diário (%)<input inputMode="decimal" value={editDraft.dailyInterestPercent??0} onChange={(e)=>patchDraft({dailyInterestPercent:Number(e.target.value.replace(',','.'))||0})}/></label><label className="stacked-label wide">Observação financeira<input value={editDraft.financialNote||''} onChange={(e)=>patchDraft({financialNote:e.target.value})}/></label></div><div className="billing-flow-preview"><ReceiptText size={17}/><div><strong>Fluxo financeiro</strong><p>{editDraft.billingLeadDays??3} dias antes de {dueRuleLabel(editDraft).toLowerCase()}, preparar cobrança com relatório + {paymentMethodLabel(editDraft.paymentMethod)}. Se não houver baixa, a régua de atraso começa no dia seguinte ao vencimento.</p></div></div></section>}
      {accountTab==='operation'&&<section className="account-tab-pane"><div className="account-pane-heading"><FolderKanban size={18}/><div><strong>Operação</strong><span>Horas, satisfação e projetos vinculados.</span></div></div><div className="account-summary-strip"><div><span>Horas</span><strong>{editDraft.hours}</strong></div><div><span>Consumo</span><strong>{editDraft.usage}%</strong></div><div><span>NPS</span><strong>{editDraft.nps}</strong></div><div><span>Acesso</span><strong>{editDraft.access}</strong></div></div><article className="account-operation-card"><div className="account-detail-title"><BriefcaseBusiness size={17}/><strong>Projetos em andamento</strong></div>{editDraft.projects?.length?<ul className="account-project-list">{editDraft.projects.map((project)=><li key={project.name}><span>{project.name}</span><small>{project.status}</small></li>)}</ul>:<p>Nenhum projeto vinculado ainda.</p>}</article><div className="contact-action-row"><a href={`mailto:${editDraft.email}`}><Mail size={16}/>E-mail</a>{editDraft.whatsapp&&<a href={`https://wa.me/55${editDraft.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a>}</div></section>}
      {accountTab==='communications'&&<section className="account-tab-pane"><div className="account-pane-heading"><BellRing size={18}/><div><strong>Comunicações automáticas</strong><span>Régua por evento da conta. O envio fica desligado até você ativar esta empresa.</span></div></div><label className="automation-master"><input type="checkbox" checked={Boolean(editDraft.automationEnabled)} onChange={(e)=>patchDraft({automationEnabled:e.target.checked})}/><span><strong>Automação desta conta</strong><small>{editDraft.automationEnabled?'Ativa: eventos habilitados podem entrar na fila automática.':'Desligada: nenhum e-mail automático será disparado.'}</small></span></label><div className="communication-grid"><label><input type="checkbox" checked={Boolean(editDraft.welcomeEmailEnabled)} onChange={(e)=>patchDraft({welcomeEmailEnabled:e.target.checked})}/><span><strong>Boas-vindas</strong><small>Ao ativar o acesso principal.</small></span></label><label><input type="checkbox" checked={Boolean(editDraft.dueReminderEnabled)} onChange={(e)=>patchDraft({dueReminderEnabled:e.target.checked})}/><span><strong>Lembrete de vencimento</strong><small>{editDraft.billingLeadDays??3} dias antes do vencimento.</small></span></label><label><input type="checkbox" checked={Boolean(editDraft.overdueEmailEnabled)} onChange={(e)=>patchDraft({overdueEmailEnabled:e.target.checked})}/><span><strong>Pagamento em aberto</strong><small><input className="inline-days" inputMode="numeric" value={editDraft.overdueEmailAfterDays??1} onChange={(e)=>patchDraft({overdueEmailAfterDays:Number(e.target.value.replace(/\D/g,''))||0})}/> dia(s) depois, se não houver baixa.</small></span></label><label><input type="checkbox" checked={Boolean(editDraft.extrajudicialEmailEnabled)} onChange={(e)=>patchDraft({extrajudicialEmailEnabled:e.target.checked})}/><span><strong>Notificação extrajudicial</strong><small>Depois de <input className="inline-days" inputMode="numeric" value={editDraft.extrajudicialAfterDays??''} onChange={(e)=>patchDraft({extrajudicialAfterDays:e.target.value?Number(e.target.value.replace(/\D/g,'')):null})}/> dia(s) em aberto.</small></span></label><label><input type="checkbox" checked={Boolean(editDraft.terminationEmailEnabled)} onChange={(e)=>patchDraft({terminationEmailEnabled:e.target.checked})}/><span><strong>Encerramento</strong><small>Após registrar o distrato.</small></span></label><label><input type="checkbox" checked={Boolean(editDraft.birthdayEmailEnabled)} onChange={(e)=>patchDraft({birthdayEmailEnabled:e.target.checked})}/><span><strong>Aniversário</strong><small>{editDraft.decisionBirthday?`Data: ${formatDate(editDraft.decisionBirthday)}`:'Cadastre a data do decisor.'}</small></span></label></div><div className="email-template-list"><div><strong>Boas-vindas</strong><span>“Bem-vindo(a) ao CALI Workspace · {editDraft.name}”</span></div><div><strong>Vencimento</strong><span>“CALI RH · vencimento em [data] · {editDraft.name}”</span></div><div><strong>Atraso</strong><span>“CALI RH · pagamento em aberto · {editDraft.name}”</span></div><div><strong>Notificação</strong><span>“CALI RH · notificação referente a pagamento em aberto · {editDraft.name}”</span></div><div><strong>Encerramento</strong><span>“CALI RH · encerramento contratual · {editDraft.name}”</span></div></div></section>}
      {accountTab==='history'&&<section className="account-tab-pane"><div className="account-pane-heading"><History size={18}/><div><strong>Histórico da relação</strong><span>Movimentos importantes da conta.</span></div></div><div className="account-history-list">{editDraft.history?.length?editDraft.history.map((item,index)=><div key={`${item.title}-${index}`}><span className="history-dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.date}</time></div>):<p>Ainda não há movimentações registradas.</p>}</div></section>}
    </div><footer className="account-modal-footer management-footer"><div className="management-danger-actions">{editDraft.status==='paused'?<button type="button" className="ghost-action" onClick={()=>{setManageOpen(false);requestLifecycle(editDraft,'reactivate')}}><RotateCcw size={15}/>Reativar</button>:<button type="button" className="ghost-action" onClick={()=>{setManageOpen(false);requestLifecycle(editDraft,'pause')}}><PauseCircle size={15}/>Bloquear</button>}<button type="button" className="ghost-action" onClick={()=>{setManageOpen(false);requestLifecycle(editDraft,'archive')}}><Archive size={15}/>Arquivar</button><button type="button" className="ghost-action danger" onClick={()=>{setManageOpen(false);requestLifecycle(editDraft,'close')}}><Ban size={15}/>Encerrar contrato</button></div><div className="modal-actions"><button className="secondary" type="button" onClick={()=>setManageOpen(false)}>Cancelar</button><button className="primary" type="button" disabled={saving} onClick={()=>void saveClient()}>{saving?'Salvando…':'Salvar alterações'}</button></div></footer></div></div>}

    {lifecycle&&<div className="modal-backdrop full-screen-modal"><div className="modal-card lifecycle-modal lifecycle-modal-v3"><button type="button" className="modal-close" onClick={()=>setLifecycle(null)}><X size={18}/></button><span className="section-kicker">GESTÃO DA CONTA</span><h2>{lifecycle.type==='pause'?'Bloquear temporariamente':lifecycle.type==='archive'?'Arquivar conta':lifecycle.type==='close'?'Encerrar contrato':'Reativar conta'}</h2><p>{lifecycle.type==='close'?'Registre a data do distrato. O Workspace calcula a projeção financeira usando a cláusula cadastrada.':'A ação ficará registrada no histórico da conta.'}</p>{lifecycle.type==='close'&&<><label className="stacked-label lifecycle-date">Data do distrato<input type="date" value={lifecycleDate} onChange={(e)=>setLifecycleDate(e.target.value)}/></label>{closeProjection&&<div className="termination-projection"><div><span>Saldo contratual estimado</span><strong>{formatCurrency(closeProjection.remainingBalance)}</strong></div><div><span>Multa calculada</span><strong>{formatCurrency(closeProjection.penalty)}</strong></div><div><span>Pagamento até</span><strong>{formatDate(closeProjection.dueDate)}</strong></div></div>}</>}{lifecycle.type!=='reactivate'&&<label className="stacked-label lifecycle-reason">Motivo<textarea rows={3} value={lifecycleReason} onChange={(e)=>setLifecycleReason(e.target.value)} autoFocus/></label>}<div className="modal-actions lifecycle-actions"><button type="button" className="secondary" onClick={()=>setLifecycle(null)}>Cancelar</button><button type="button" className={`primary ${lifecycle.type==='close'?'danger-primary':''}`} disabled={saving||(lifecycle.type!=='reactivate'&&!lifecycleReason.trim())} onClick={()=>void applyLifecycle()}>{saving?'Salvando…':'Confirmar'}</button></div></div></div>}
  </Shell>;
}
