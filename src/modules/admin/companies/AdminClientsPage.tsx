import { WorkspaceConfirmDialog } from '../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import { WorkspacePageHeader } from '../../../components/workspace/WorkspacePageHeader';
import '../../../components/workspace/components/workspace-dialog-motion.css';
import { CompanyMetrics } from './components/CompanyMetrics';
import { CompanyDataAction, CompanyDataButton, CompanyDataStatus } from './components/CompanyDataAction';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { CompanyAccessCheckbox, CompanyCheckCard, CompanyField, CompanyFileInput, CompanyFormFields, CompanyFormHint, CompanyInput, CompanySelect, CompanyTextarea } from './components/CompanyFormFields';
import { CompanyProfileFooter } from './components/CompanyProfileFooter';
import { CompanyProfileHeader } from './components/CompanyProfileHeader';
import { CompanyTabs } from './components/CompanyTabs';
import { CompanyList } from './components/CompanyList';
import { AccountPaneHeading } from './components/AccountPaneHeading';
import { errorMessage } from '../../../lib/errorMessage';
import { DialogForm } from '../../../components/ds/DialogForm';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Banknote,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Cake,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FolderKanban,
  History,
  ImagePlus,
  Mail,
  MessageCircle,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { uploadCompanyContractDocument, uploadCompanyLogo } from '../../../api/admin/companies/assets';
import { changeCompanyLifecycle } from '../../../api/admin/companies/lifecycle';
import { readCompanyPortfolio } from '../../../api/admin/companies/portfolio';
import { saveExistingCompanyProfile, saveNewCompanyProfile } from '../../../api/admin/companies/profile';
import { planForService, type ClientRow, type ExtraPerson, type FormState, type LifecycleAction, type TerminationPaymentRule, type TerminationPenaltyType } from '../../../domain/company';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { scheduleCompanyLogoBackfill } from '../../../lib/companyLogoBackfill';
import { ContractAgendaSettings } from './components/ContractAgendaSettings';
import { ContractFrontsAdmin } from './components/ContractFrontsAdmin';
import { exportCompanyData } from './companyDataExport';
import {
  eliminateCompanyData, eliminationDeadlineDate, previewCompanyElimination, type CompanyEliminationPreview,
} from '../../../api/admin/companies/elimination';
import { createCompanyDraft, saveCompanyAccessDraft, type AccessDraft } from '../../../api/admin/companies/onboarding';
import type { PreRegistrationFields } from '../../../api/public/pre-registration';
import { CompanyOnboardingPanel } from './components/CompanyOnboardingPanel';

type AccountTab = 'data' | 'access' | 'contract' | 'fronts' | 'agenda' | 'financial' | 'operation' | 'communications' | 'history';
type RegistrationTab = 'data' | 'access' | 'contract' | 'financial' | 'documents';
const contractTypes = ['CALI Partner','CALI Full','Outro'];
const contractModels = ['Assessoria mensal','Projeto','Treinamento'];
const roleToDb = (role:string) => role==='Decisor adicional'?'decision_maker':'additional';
const roleFromDb = (role?: string | null) => role==='decision_maker'?'Decisor adicional':'Acesso adicional';
// Até 4 acessos por empresa: o principal e mais três.
const maxExtraPeople = 3;
type DraftPerson = ExtraPerson & { key: string };
type CompanyDraft = Omit<ClientRow, 'extraAccesses'> & { extraAccesses?: DraftPerson[] };
const blankPerson = (): DraftPerson => ({ key: crypto.randomUUID(), name: '', job: '', email: '', phone: '', access: true, role: 'Decisor adicional' });

function toCompanyDraft(client: ClientRow): CompanyDraft {
  return {
    ...client,
    extraAccesses: client.extraAccesses?.map(person => ({ ...person, key: person.id || crypto.randomUUID() })),
    branches: [...(client.branches || [])],
    projects: [...(client.projects || [])],
    documents: [...(client.documents || [])],
    history: [...(client.history || [])],
  };
}
type LifecycleState = { type: LifecycleAction; client: ClientRow } | null;

const segments = ['Tecnologia','Serviços','Serviços corporativos','Indústria','Varejo','Saúde','Educação','Logística e transportes','Construção e engenharia','Financeiro','Alimentação e hospitalidade','Outro'];
const services = ['CALI Partner','CALI Full','CALI Build Essencial','CALI Build Completo','Assessoria Estratégica Mensal','Mentoria para RH','Treinamento','Projeto de Estruturação','Solução personalizada'];

const emptyForm: FormState = {
  company: '', legalName: '', segment: '', segmentOther: '', contact: '', decisionTitle: '', decisionBirthday: '', email: '', phone: '', whatsapp: '', service: '', hours: '',
  startDate: '', endDate: '', autoRenew: false, addressStreet: '', addressNumber: '', neighborhood: '', city: '', state: 'PR', hasBranches: false, branchesText: '',
  contractValue: '', billingFrequency: 'monthly', paymentMethod: 'pix', billingDay: '', billingDueRule: 'fixed_day', billingLeadDays: '3', notes: '', lateFeePercent: '', dailyInterestPercent: '',
  penaltyEnabled: false, penaltyText: '', contractType: '', contractModel: '', paymentTermDays: '', driveUrl: '', documentNotes: '', documentOwner: '', terminationPenaltyType: 'none', terminationPenaltyValue: '', terminationPaymentDays: '', terminationPaymentRule: 'calendar_days',
};

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}
function formatCurrency(value?: number | null) { return value == null ? '—' : new Intl.NumberFormat('pt-BR',{ style:'currency',currency:'BRL' }).format(value); }
function formatDate(value?: string) { if (!value) return '—'; const date = new Date(`${value.slice(0,10)}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date); }
function statusLabel(status: ClientRow['status']) { return ({ active:'Ativo',paused:'Pausado',blocked:'Bloqueado',closed:'Encerrado',archived:'Arquivado' } as const)[status]; }
function paymentMethodLabel(value?: string) { return ({pix:'Pix',boleto:'Boleto',transfer:'Transferência',card:'Cartão',other:'Outra'} satisfies Record<string,string>)[value || ''] || value || '—'; }
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

export function AdminClientsPage() {

  const [clients,setClients] = useState<ClientRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [statusFilter,setStatusFilter] = useState<'all'|ClientRow['status']>('all');
  const [query,setQuery] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  const [exportState,setExportState] = useState<{busy:boolean;note:string;failed?:boolean}>({busy:false,note:''});
  const [elimination,setElimination] = useState<{open:boolean;name:string;busy:boolean;note:string;failed?:boolean;reviewed?:boolean;preview?:CompanyEliminationPreview}>({open:false,name:'',busy:false,note:''});
  const [exportRecipient,setExportRecipient] = useState('');
  const [createOpen,setCreateOpen] = useState(false);
  const createRequest = useRef<string | null>(null);
  const resumeAccessAfterSave = useRef(false);
  const [registrationTab,setRegistrationTab] = useState<RegistrationTab>('data');
  const [form,setForm] = useState<FormState>(emptyForm);
  const [extraPeople,setExtraPeople] = useState<DraftPerson[]>([]);
  const [logoFile,setLogoFile] = useState<File|null>(null);
  const logoPreview = useObjectUrl(logoFile);
  const [contractFile,setContractFile] = useState<File|null>(null);
  const [contractDate,setContractDate] = useState('');
  const [addendumFile,setAddendumFile] = useState<File|null>(null);
  const [addendumDate,setAddendumDate] = useState('');
  const [manageOpen,setManageOpen] = useState(false);
  const [accountTab,setAccountTab] = useState<AccountTab>('data');
  const [editDraft,setEditDraft] = useState<CompanyDraft|null>(null);
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

  async function resolveLogo(raw?: string|null, workspaceRaw?: string|null) {
    return await resolveWorkspaceMedia(raw || workspaceRaw) || await resolveWorkspaceMedia(workspaceRaw);
  }

  async function loadClients() {
    setLoading(true); setError('');
    const portfolio = await readCompanyPortfolio().catch((reason: Error) => {
      setError(`Não consegui carregar a carteira: ${reason.message}`);
      setLoading(false);
      return null;
    });
    if (!portfolio) return;
    const { companies, invites, profiles, hourRows, npsRows, projectRows, documentRows, historyRows } = portfolio;
    const rows:ClientRow[] = companies.map((item) => {
      const invite = invites.find((entry) => entry.company_id === item.id && entry.is_primary);
      const extras:ExtraPerson[] = invites.filter((entry) => entry.company_id === item.id && !entry.is_primary).map((entry) => ({id:entry.id,name:entry.full_name||'',job:entry.job_title||'',email:entry.email||'',phone:entry.phone||entry.whatsapp||'',access:entry.platform_access===true,active:Boolean(entry.active)&&entry.platform_access!==false,role:roleFromDb(entry.access_role)}));
      const profile = profiles.find((entry) => entry.company_id === item.id && entry.is_primary && (!invite || String(entry.email).trim().toLowerCase()===String(invite.email).trim().toLowerCase()));
      const primaryReleased = invite ? Boolean(invite.active && invite.platform_access) : Boolean(profile?.active);
      const consumed = hourRows.filter((entry) => entry.company_id===item.id).reduce((total:number,entry)=>total+Number(entry.minutes||0),0);
      const contracted = Number(item.monthly_hours_contracted || 0), scores = npsRows.filter((entry)=>entry.company_id===item.id).map((entry)=>Number(entry.score));
      const avg = scores.length ? scores.reduce((a:number,b:number)=>a+b,0)/scores.length : null;
      return {
        contractType:item.contract_type||'',contractModel:item.contract_model||'',paymentTermDays:item.payment_term_days==null?null:Number(item.payment_term_days),driveUrl:item.drive_folder_url||'',documentNotes:item.document_notes||'',documentOwner:item.document_owner||'',extraAccesses:extras,
        id:item.id,name:item.display_name,legalName:item.legal_name||'',logoUrl:item.logo_url||'',status:item.status || 'active',createdAt:item.created_at,closedAt:item.closed_at||'',dataEliminatedAt:item.data_eliminated_at||'',contact:profile?.full_name||invite?.full_name||'',email:invite?.email||profile?.email||'',primaryInviteId:invite?.id,primaryAccessRequested:invite?Boolean(invite.platform_access):Boolean(profile?.active),primaryAccessActive:primaryReleased,primaryProfileLinked:Boolean(profile),decisionTitle:profile?.job_title||invite?.job_title||item.decision_maker_title||'',decisionBirthday:invite?.birthday||'',phone:profile?.phone||invite?.phone||'',whatsapp:profile?.whatsapp||invite?.whatsapp||'',service:item.service_plan==='partner'?'CALI Partner':item.service_plan==='full'?'CALI Full':item.service_plan==='build_essential'?'CALI Build Essencial':item.service_plan==='build_complete'?'CALI Build Completo':item.service_type||'',segment:item.segment||'',contractedHours:contracted,hours:`${formatHours(consumed)} / ${contracted?`${contracted}h`:'—'}`,usage:contracted>0?Math.min(100,Math.round(consumed/(contracted*60)*100)):0,nps:avg===null?'—':avg.toFixed(1).replace('.',','),access:primaryReleased?(profile?.active?'Ativo':'Convite preparado'):invite?.platform_access?'Aguardando liberação':'Sem acesso',drive:item.drive_folder_url?'Conectado':'Não conectado',startDate:item.start_date||'',endDate:item.end_date||'',autoRenew:Boolean(item.auto_renew),addressStreet:item.address_street||'',addressNumber:item.address_number||'',neighborhood:item.address_neighborhood||'',city:item.address_city||'',state:item.address_state||'',hasBranches:Boolean(item.has_branches),branches:Array.isArray(item.branches)?item.branches.map(String):[],contractValue:item.contract_value==null?null:Number(item.contract_value),billingFrequency:item.billing_frequency||'monthly',paymentMethod:item.payment_method||'pix',billingStatus:item.billing_status==='overdue'?'Em atraso':item.billing_status==='pending'?'Pendente':item.billing_status==='current'?'Em dia':'A acompanhar',billingDay:item.billing_day==null?null:Number(item.billing_day),billingDueRule:item.billing_due_rule||'fixed_day',billingLeadDays:Number(item.billing_lead_days??3),financialNote:item.payment_notes||'',lateFeePercent:Number(item.late_fee_percent||0),dailyInterestPercent:Number(item.daily_interest_percent||0),penaltyEnabled:Boolean(item.contract_penalty_enabled),penaltyText:item.contract_penalty_text||'',terminationPenaltyType:(item.termination_penalty_type||'none') as TerminationPenaltyType,terminationPenaltyValue:Number(item.termination_penalty_value||0),terminationPaymentDays:Number(item.termination_payment_days||0),terminationPaymentRule:(item.termination_payment_rule||'calendar_days') as TerminationPaymentRule,automationEnabled:Boolean(item.automation_enabled),welcomeEmailEnabled:Boolean(item.welcome_email_enabled),dueReminderEnabled:Boolean(item.due_reminder_enabled),overdueEmailEnabled:Boolean(item.overdue_email_enabled),overdueEmailAfterDays:Number(item.overdue_email_after_days??1),extrajudicialEmailEnabled:Boolean(item.extrajudicial_email_enabled),extrajudicialAfterDays:item.extrajudicial_after_days==null?null:Number(item.extrajudicial_after_days),birthdayEmailEnabled:Boolean(item.birthday_email_enabled),terminationEmailEnabled:Boolean(item.termination_email_enabled),terminationSignedAt:item.termination_signed_at||'',terminationPaymentDueAt:item.termination_payment_due_at||'',terminationPenaltyAmount:item.termination_penalty_amount==null?null:Number(item.termination_penalty_amount),terminationBalanceSnapshot:item.termination_balance_snapshot==null?null:Number(item.termination_balance_snapshot),projects:projectRows.filter((entry)=>entry.company_id===item.id).slice(0,6).map((entry)=>({id:entry.id,name:entry.name,status:String(entry.status).replaceAll('_',' ')})),documents:documentRows.filter((entry)=>entry.company_id===item.id).map((entry)=>`${entry.title}${entry.document_date?` · ${formatDate(entry.document_date)}`:''}`),history:historyRows.filter((entry)=>entry.company_id===item.id).slice(0,8).map((entry)=>({id:entry.id,title:String(entry.event_type).replaceAll('_',' '),detail:typeof entry.metadata==='object'?JSON.stringify(entry.metadata):'',date:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(entry.created_at))})),
      };
    });
    const logoRows=await Promise.all(rows.map(async (row) => { const company=companies.find((item) => item.id === row.id); return [row.id, await resolveLogo(company?.logo_url, company?.logo_workspace_url)] as const; }));
    const logoMap=new Map(logoRows);
    const readyRows=rows.map((row)=>({...row,logoUrl:logoMap.get(row.id)||''}));
    setClients(readyRows);
    setLoading(false);
    return readyRows;
  }
  useEffect(()=>{ void loadClients(); },[]);

  function patchForm(patch:Partial<FormState>) { setForm((current)=>({...current,...patch})); }
  function patchDraft(patch:Partial<CompanyDraft>) { setEditDraft((current)=>current?{...current,...patch}:current); }
  function openClient(client:ClientRow,tab:AccountTab='data') { resumeAccessAfterSave.current=false; setEditDraft(toCompanyDraft(client)); setEditLogoFile(null); setExportState({busy:false,note:''}); setExportRecipient(''); setAccountTab(tab); setManageOpen(true); }
  function applyPreRegistration(fields: PreRegistrationFields) {
    resumeAccessAfterSave.current = true;
    patchDraft({
      name: fields.name, legalName: fields.legalName, city: fields.city, state: fields.state,
      ...(editDraft?.primaryProfileLinked ? {} : {
        contact: fields.contact, email: fields.email, primaryAccessRequested: true,
      }),
    });
    setAccountTab('data');
  }

  function requestLifecycle(client:ClientRow,type:LifecycleAction) { setLifecycle({client,type}); setLifecycleReason(''); setLifecycleDate(new Date().toISOString().slice(0,10)); }

  async function saveAccessDraft(companyId: string, primary: AccessDraft, people: ExtraPerson[], previous: ExtraPerson[]) {
    const rows: AccessDraft[] = [];
    if (primary.name.trim() || primary.email.trim()) rows.push(primary);
    for (const person of people) {
      if (!person.name.trim() && !person.email.trim()) continue;
      rows.push({
        id: person.id, name: person.name, email: person.email, job: person.job, phone: person.phone,
        primary_contact: false, requested: person.access, access_role: roleToDb(person.role),
      });
    }
    const removed = previous.flatMap((person) =>
      person.id && !people.some((item) => item.id === person.id) ? [person.id] : [],
    );
    if (rows.length || removed.length) await saveCompanyAccessDraft(companyId, rows, removed);
  }

  async function createClient(event:FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if(!form.company.trim()){setRegistrationTab('data');setError('Informe o nome da empresa.');return;}
    if(Boolean(form.contact.trim())!==Boolean(form.email.trim())){setRegistrationTab('access');setError('Informe nome e e-mail da pessoa de contato.');return;}
    const contracted=Number(form.hours.replace(',','.')||0),value=currencyToNumber(form.contractValue),segment=form.segment==='Outro'?form.segmentOther.trim():form.segment,branches=form.hasBranches?form.branchesText.split('\n').map((v)=>v.trim()).filter(Boolean):[];



    setSaving(true);
    try{
      const requestId = createRequest.current ?? crypto.randomUUID();
      createRequest.current = requestId;
      const id = await createCompanyDraft(requestId, form.company.trim(), contracted > 0 ? contracted : null, form.service);
      const logo = logoFile ? await uploadCompanyLogo(id, logoFile) : null;
      await saveNewCompanyProfile(id, form, logo, value, segment, branches);
      await saveAccessDraft(id, {
        name: form.contact, email: form.email, job: form.decisionTitle, phone: form.phone,
        whatsapp: form.whatsapp, birthday: form.decisionBirthday || null,
        primary_contact: true, requested: true, access_role: 'primary',
      }, extraPeople, []);
      if(contractFile) await uploadCompanyContractDocument(id,contractFile,'contract',contractDate); if(addendumFile) await uploadCompanyContractDocument(id,addendumFile,'addendum',addendumDate);
      setCreateOpen(false); setForm(emptyForm); setLogoFile(null); setContractFile(null); setAddendumFile(null);
      createRequest.current = null;
      setMessage(`${form.company.trim()} foi cadastrada. Confira o pré-cadastro e a liberação na aba Acessos.`);
      const rows = await loadClients();
      const created = rows?.find((client) => client.id === id);
      if (created) openClient(created, 'access');
    }catch(err){/* O erro do banco não é um Error do JavaScript: sem isto a tela escondia o motivo real. */const reason=errorMessage(err, '');setError(reason?`Não foi possível cadastrar o cliente: ${reason}`:'Não foi possível cadastrar o cliente.');}finally{setSaving(false);}
  }

  async function saveClient() {
    if(!editDraft)return; setSaving(true); setError('');
    try{
      let logoValue=editDraft.logoUrl;

      if(editLogoFile)logoValue=await uploadCompanyLogo(editDraft.id,editLogoFile);
      const next={...editDraft,logoUrl:logoValue};
      const previousService=clients.find(client=>client.id===next.id)?.service;
      await saveExistingCompanyProfile(next, previousService);
      await saveAccessDraft(next.id, {
        id: next.primaryInviteId, name: next.contact, email: next.email, job: next.decisionTitle,
        phone: next.phone, whatsapp: next.whatsapp, birthday: next.decisionBirthday || null,
        primary_contact: true, requested: next.primaryAccessRequested, access_role: 'primary',
      }, next.extraAccesses || [], clients.find((client) => client.id === next.id)?.extraAccesses || []);
      setMessage(`Alterações de ${next.name} salvas.`);
      const rows = await loadClients();
      const saved = rows?.find((client) => client.id === next.id);
      if (resumeAccessAfterSave.current && saved) openClient(saved, 'access');
      else setManageOpen(false);
    }catch(err){setError(errorMessage(err, 'Não foi possível salvar as alterações.'));}finally{setSaving(false);}
  }

  async function runCompanyExport(client:ClientRow){
    if(exportState.busy)return; if(exportRecipient.trim().length<3){setExportState({busy:false,failed:true,note:'Informe para quem os dados serão entregues (nome e cargo do representante autorizado).'});return;} setExportState({busy:true,note:''});
    try{const done=await exportCompanyData(client.id,client.name,exportRecipient.trim());setExportState({busy:false,note:`Dois arquivos baixados: os dados e o índice com ${done.documents} documento(s). Os links dos documentos valem até ${done.until}.`});}
    catch(err){setExportState({busy:false,failed:true,note:err instanceof Error?err.message:'Não foi possível gerar a exportação.'});}
  }

  async function openElimination(client: ClientRow) {
    setElimination({ open: true, name: '', busy: true, note: '' });
    try {
      const preview = await previewCompanyElimination(client.id);
      setElimination({ open: true, name: '', busy: false, note: '', preview });
    } catch (error) {
      setElimination({ open: true, name: '', busy: false, failed: true,
        note: error instanceof Error ? error.message : 'Não foi possível consultar o escopo da eliminação.' });
    }
  }

  async function runElimination(client: ClientRow) {
    if (elimination.busy || !elimination.reviewed) return;
    setElimination((current) => ({ ...current, busy: true, note: '', failed: false }));
    try {
      const job = await eliminateCompanyData(client.id, elimination.name.trim(), elimination.reviewed);
      if (job.state !== 'completed' || !job.receipt) {
        setElimination((current) => ({
          ...current, busy: false, failed: job.state === 'retry',
          note: job.state === 'retry'
            ? 'A execução foi interrompida. Retome a mesma operação para reconciliar os arquivos pendentes.'
            : 'Eliminação em andamento. Volte à ficha para acompanhar ou retomar a operação.',
        }));
        return;
      }
      const receipt = job.receipt;
      const rows = Object.values(receipt.rows_removed).reduce((total, count) => total + count, 0);
      setElimination({ open: false, name: '', busy: false,
        note: `Dados eliminados. ${rows} registro(s), ${receipt.files_removed} arquivo(s) e ${receipt.people_anonymized} pessoa(s) anonimizada(s).` });
      const refreshed = (await loadClients())?.find((row) => row.id === client.id);
      if (refreshed) {
        const draft = toCompanyDraft(refreshed);
        setEditDraft(current => current?.id === draft.id ? draft : current);
      }
    } catch (error) {
      setElimination((current) => ({ ...current, busy: false, failed: true,
        note: error instanceof Error ? error.message : 'Não foi possível executar a eliminação.' }));
    }
  }

  async function applyLifecycle() {
    if(!lifecycle)return; if(lifecycle.type!=='reactivate'&&!lifecycleReason.trim())return;
    const projection=lifecycle.type==='close'?terminationProjection(lifecycle.client,lifecycleDate):null;
    setSaving(true);
    try{
      await changeCompanyLifecycle(lifecycle.client, lifecycle.type, lifecycleReason, lifecycleDate, projection);
      setLifecycle(null);setMessage(`Status de ${lifecycle.client.name} atualizado.`);await loadClients();
    }catch(err){setError(errorMessage(err, 'Não foi possível atualizar a conta.'));}finally{setSaving(false);}
  }

  const registrationItems:Array<{id:RegistrationTab;label:string}>=[{id:'data',label:'Dados cadastrais'},{id:'access',label:'Decisores e acessos'},{id:'contract',label:'Contrato'},{id:'financial',label:'Financeiro'},{id:'documents',label:'Documentos'}];
  const accountItems:Array<{id:AccountTab;label:string}>=[{id:'data',label:'Dados cadastrais'},{id:'access',label:'Acessos'},{id:'contract',label:'Contrato'},{id:'fronts',label:'Frentes'},{id:'agenda',label:'Agenda do contrato'},{id:'financial',label:'Financeiro'},{id:'operation',label:'Operação'},{id:'communications',label:'Comunicações'},{id:'history',label:'Histórico'}];
  const regIndex=registrationItems.findIndex((item)=>item.id===registrationTab);
  const closeProjection=lifecycle?.type==='close'?terminationProjection(lifecycle.client,lifecycleDate):null;

  const wanted=query.trim().toLocaleLowerCase('pt-BR');
  const visibleClients=clients.filter((client)=>(statusFilter==='all'||client.status===statusFilter)&&(!wanted||[client.name,client.legalName,client.contact,client.email].some((value)=>String(value||'').toLocaleLowerCase('pt-BR').includes(wanted))));
  const initials=(name:string)=>name.split(/\s+/).filter(Boolean).map((word)=>word[0]).join('').slice(0,2).toUpperCase()||'C';

  return <Shell role="admin">
    <div className="ap-app v2-admin-page"><div className="ap-content">
      <WorkspacePageHeader eyebrow="BACKOFFICE / CALI RH" title="Contas e clientes" description="Acompanhamento das empresas, contratos e prioridades por conta.">
        <Button variant="adminPrimary" onClick={()=>{createRequest.current=null;setForm(emptyForm);setExtraPeople([]);setLogoFile(null);setContractFile(null);setContractDate('');setAddendumFile(null);setAddendumDate('');setError('');setRegistrationTab('data');setCreateOpen(true);}}><Plus size={15}/> Nova conta</Button>
      </WorkspacePageHeader>

      <section className="ap-pane ap-accounts-v2">
        <div className="ap-pane-head">
          <h2>Contas e clientes</h2>
          <div className="tw:flex tw:items-center tw:gap-[.769rem] tw:max-[47.5rem]:flex-wrap">
            <select
              aria-label="Filtrar situação"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="tw:m-0 tw:h-[3.077rem] tw:min-w-[11.154rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e6dad2] tw:bg-white tw:px-[.846rem] tw:text-[#544640]"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="blocked">Bloqueado</option>
              <option value="archived">Arquivado</option>
              <option value="closed">Encerrado</option>
            </select>
            <label className="tw:m-0 tw:flex tw:h-[3.077rem] tw:items-center tw:gap-[.615rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:p-[.615rem] tw:focus-within:border-cali-gold">
              <Search aria-hidden="true" className="tw:size-[1.077rem]" />
              <input
                aria-label="Buscar empresa"
                placeholder="Buscar empresa"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="tw:min-w-0 tw:border-0 tw:outline-none"
              />
            </label>
          </div>
        </div>
        <CompanyList
          clients={visibleClients}
          loading={loading}
          hasClients={clients.length > 0}
          statusLabel={statusLabel}
          onOpen={openClient}
          onEdit={(client) => openClient(client, 'data')}
          onLifecycle={requestLifecycle}
        />
      </section>
      {message&&<p className="v2-admin-notice ok"><CheckCircle2 size={15}/> {message}</p>}{error&&<p className="v2-admin-notice">{error}</p>}

    {createOpen && (
      <div className="tw:fixed tw:inset-0 tw:z-[800] tw:motion-safe:animate-[workspace-dialog-fade_.22s_ease-out_backwards] tw:grid tw:place-items-center tw:bg-[#161018b8] tw:p-[1.692rem] tw:backdrop-blur-sm tw:max-[43.75rem]:p-[.615rem]" role="presentation">
        <DialogForm
          aria-label="Cadastrar cliente"
          onSubmit={createClient}
          className="tw:flex tw:motion-safe:animate-[workspace-dialog-enter_.34s_cubic-bezier(.2,.7,.2,1)_backwards] tw:max-h-[min(63.846rem,94dvh)] tw:w-full tw:max-w-[83.846rem] tw:flex-col tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-[#fffdfb] tw:text-[#302b29] tw:shadow-[0_1.5rem_5.9375rem_#28172440]"
        >
          <header className="tw:flex tw:items-start tw:justify-between tw:gap-[1.154rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#ebded4] tw:bg-[linear-gradient(112deg,#f6f0eb,#fff)] tw:px-[2.308rem] tw:py-[2.077rem] tw:max-[43.75rem]:p-[1.385rem]">
            <div>
              <small className="tw:text-[.769rem] tw:font-extrabold tw:tracking-[.14em] tw:text-[#9f7349]">NOVA CONTA</small>
              <h2 className="tw:mx-0 tw:mt-[.462rem] tw:mb-[.615rem] tw:text-[1.923rem] tw:tracking-[-.04em] tw:text-cali-brand">Cadastrar cliente</h2>
              <p className="tw:m-0 tw:text-[.923rem] tw:text-[#867d77]">Ficha da empresa, contrato, cobrança, acesso e documentos.</p>
            </div>
            <button type="button" aria-label="Fechar cadastro" onClick={() => setCreateOpen(false)} className="tw:grid tw:shrink-0 tw:place-items-center tw:rounded-[.538rem] tw:border-0 tw:bg-[#f4ebe6] tw:p-[.615rem]">
              <X aria-hidden="true" className="tw:size-[1.462rem]" />
            </button>
          </header>
          <CompanyTabs mode="registration" value={registrationTab} onChange={setRegistrationTab} items={registrationItems} />
          <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto tw:px-[2.692rem] tw:pt-[1.692rem] tw:pb-[2.308rem] tw:max-[43.75rem]:p-[1.385rem]">
      {registrationTab==='data'&&<><CompanyFormHint>Dados de identificação, serviço e endereço</CompanyFormHint><CompanyFormFields>
        <CompanyField><span>Empresa</span><CompanyInput placeholder="Nome fantasia" value={form.company} onChange={(e)=>patchForm({company:e.target.value})} required/></CompanyField>
        <CompanyField><span>Razão social</span><CompanyInput placeholder="Como consta no contrato" value={form.legalName} onChange={(e)=>patchForm({legalName:e.target.value})}/></CompanyField>
        <CompanyField><span>Segmento</span><CompanySelect value={form.segment} onChange={(e)=>patchForm({segment:e.target.value})}><option value="">Selecionar</option>{segments.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField>
        <CompanyField><span>Serviço</span><CompanySelect value={form.service} onChange={(e)=>patchForm({service:e.target.value})}><option value="">Selecionar</option>{services.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField>
        {form.segment==='Outro'&&<CompanyField fullWidth><span>Qual segmento?</span><CompanyInput value={form.segmentOther} onChange={(e)=>patchForm({segmentOther:e.target.value})}/></CompanyField>}
        <CompanyField><span>Horas contratadas</span><CompanyInput inputMode="decimal" placeholder="15" value={form.hours} onChange={(e)=>patchForm({hours:e.target.value.replace(/[^0-9.,]/g,'')})}/></CompanyField>
        <CompanyField><span>Cidade</span><CompanyInput placeholder="Curitiba" value={form.city} onChange={(e)=>patchForm({city:e.target.value})}/></CompanyField>
        <CompanyField><span>Estado</span><CompanyInput maxLength={2} placeholder="PR" value={form.state} onChange={(e)=>patchForm({state:e.target.value.toUpperCase().slice(0,2)})}/></CompanyField>
        <CompanyField><span>Endereço</span><CompanyInput placeholder="Rua e complemento" value={form.addressStreet} onChange={(e)=>patchForm({addressStreet:e.target.value})}/></CompanyField>
        <CompanyField><span>Número</span><CompanyInput placeholder="Número" value={form.addressNumber} onChange={(e)=>patchForm({addressNumber:e.target.value})}/></CompanyField>
        <CompanyField><span>Bairro</span><CompanyInput placeholder="Bairro" value={form.neighborhood} onChange={(e)=>patchForm({neighborhood:e.target.value})}/></CompanyField>
        <CompanyField><span>Possui filiais</span><CompanySelect value={form.hasBranches?'sim':'nao'} onChange={(e)=>patchForm({hasBranches:e.target.value==='sim'})}><option value="nao">Não</option><option value="sim">Sim</option></CompanySelect></CompanyField>
        <CompanyField><span>Logo da empresa</span><CompanyFileInput preview={logoPreview} accept="image/*,.svg" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} /></CompanyField>
        {form.hasBranches&&<CompanyField fullWidth><span>Filiais</span><CompanyTextarea rows={2} placeholder="Uma localidade por linha" value={form.branchesText} onChange={(e)=>patchForm({branchesText:e.target.value})}/></CompanyField>}
      </CompanyFormFields></>}
      {registrationTab==='access'&&<><CompanyFormHint>Responsáveis pela tomada de decisão e acessos autorizados</CompanyFormHint><div className="tw:mb-[1.154rem] tw:flex tw:flex-col tw:gap-[1.077rem]">
        <section className="tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e8dcd4] tw:bg-[#fdfaf7] tw:p-[1.231rem]"><header className="tw:mb-[1.077rem] tw:flex tw:items-center tw:justify-between"><strong>Decisor principal</strong></header><CompanyFormFields>
          <CompanyField><span>Nome completo</span><CompanyInput value={form.contact} onChange={(e)=>patchForm({contact:e.target.value})}/></CompanyField>
          <CompanyField><span>Cargo</span><CompanyInput value={form.decisionTitle} onChange={(e)=>patchForm({decisionTitle:e.target.value})}/></CompanyField>
          <CompanyField><span>E-mail de acesso</span><CompanyInput type="email" value={form.email} onChange={(e)=>patchForm({email:e.target.value})}/></CompanyField>
          <CompanyField><span>Telefone</span><CompanyInput value={form.phone} onChange={(e)=>patchForm({phone:e.target.value})}/></CompanyField>
          <CompanyField><span>WhatsApp</span><CompanyInput value={form.whatsapp} onChange={(e)=>patchForm({whatsapp:e.target.value})}/></CompanyField>
          <CompanyField><span>Aniversário</span><CompanyInput type="date" value={form.decisionBirthday} onChange={(e)=>patchForm({decisionBirthday:e.target.value})}/></CompanyField>
          <CompanyField><span>Tipo de contato</span><CompanySelect value="Principal" disabled><option>Principal</option></CompanySelect></CompanyField>
          <CompanyAccessCheckbox checked disabled readOnly />
        </CompanyFormFields></section>
        {extraPeople.map((person,index)=><section key={person.key} className="tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e8dcd4] tw:bg-[#fdfaf7] tw:p-[1.231rem]"><header className="tw:mb-[1.077rem] tw:flex tw:items-center tw:justify-between"><strong>Decisor / acesso adicional {index+1}</strong><button type="button" className="tw:border-0 tw:bg-transparent tw:text-[#a15f67]" onClick={()=>setExtraPeople((list)=>list.filter((_,n)=>n!==index))}>Remover</button></header><CompanyFormFields>
          {([['name','Nome completo'],['job','Cargo'],['email','E-mail'],['phone','Telefone / WhatsApp']] as const).map(([key,label])=><CompanyField key={key}><span>{label}</span><CompanyInput type={key==='email'?'email':'text'} value={person[key]} onChange={(e)=>setExtraPeople((list)=>list.map((item,n)=>n===index?{...item,[key]:e.target.value}:item))}/></CompanyField>)}
          <CompanyField><span>Tipo de contato</span><CompanySelect value={person.role} onChange={(e)=>setExtraPeople((list)=>list.map((item,n)=>n===index?{...item,role:e.target.value}:item))}><option>Decisor adicional</option><option>Acesso adicional</option></CompanySelect></CompanyField>
          <CompanyAccessCheckbox checked={person.access} onChange={(e)=>setExtraPeople((list)=>list.map((item,n)=>n===index?{...item,access:e.target.checked}:item))} />
        </CompanyFormFields></section>)}
        {extraPeople.length<maxExtraPeople&&<Button type="button" variant="adminOutline" onClick={() => { const person = blankPerson(); setExtraPeople(list => [...list, person]); }}><Plus size={14}/> Adicionar decisor ou acesso</Button>}
        <p className="tw:mt-[1.385rem] tw:mb-0 tw:text-[.846rem] tw:leading-[1.6] tw:text-[#9a8c83]">Até quatro acessos equivalentes. O cadastro salva as solicitações. A liberação acontece na ficha, após conferência do contrato assinado.</p>
      </div></>}
      {registrationTab==='contract'&&<><CompanyFormHint>Configuração contratual e vigência</CompanyFormHint><CompanyFormFields>
        <CompanyField><span>Início</span><CompanyInput type="date" value={form.startDate} onChange={(e)=>patchForm({startDate:e.target.value})}/></CompanyField>
        <CompanyField><span>Término</span><CompanyInput type="date" value={form.endDate} onChange={(e)=>patchForm({endDate:e.target.value})}/></CompanyField>
        <CompanyField><span>Duração</span><CompanyInput readOnly tabIndex={-1} value={contractDuration(form.startDate,form.endDate)}/></CompanyField>
        <CompanyField><span>Contrato</span><CompanySelect value={form.contractType} onChange={(e)=>patchForm({contractType:e.target.value})}><option value="">Selecionar</option>{contractTypes.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField>
        <CompanyField><span>Modelo</span><CompanySelect value={form.contractModel} onChange={(e)=>patchForm({contractModel:e.target.value})}><option value="">Selecionar</option>{contractModels.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField>
        <CompanyField><span>Renovação</span><CompanySelect value={form.autoRenew?'auto':'manual'} onChange={(e)=>patchForm({autoRenew:e.target.value==='auto'})}><option value="manual">Manual</option><option value="auto">Automática, conforme contrato</option></CompanySelect></CompanyField>
        <CompanyField><span>Multa por encerramento antecipado</span><CompanySelect value={form.penaltyEnabled?'sim':'nao'} onChange={(e)=>patchForm({penaltyEnabled:e.target.value==='sim',terminationPenaltyType:e.target.value==='sim'?form.terminationPenaltyType:'none'})}><option value="nao">Não consta no contrato</option><option value="sim">Sim, consta no contrato</option></CompanySelect></CompanyField>
        {form.penaltyEnabled&&<><CompanyField><span>Base da multa</span><CompanySelect value={form.terminationPenaltyType} onChange={(e)=>patchForm({terminationPenaltyType:e.target.value as TerminationPenaltyType})}><option value="none">Somente regra textual</option><option value="remaining_balance_percent">% sobre saldo restante</option><option value="contract_total_percent">% sobre valor total estimado</option><option value="fixed_amount">Valor fixo</option><option value="monthly_fee_multiple">Múltiplos da mensalidade</option></CompanySelect></CompanyField>
        <CompanyField><span>Parâmetro</span><CompanyInput inputMode="decimal" placeholder="Ex.: 20 ou 1,5" value={form.terminationPenaltyValue} onChange={(e)=>patchForm({terminationPenaltyValue:e.target.value.replace(/[^0-9.,]/g,'')})}/></CompanyField>
        <CompanyField><span>Prazo para pagamento (dias após o distrato)</span><CompanyInput inputMode="numeric" placeholder="Dias" value={form.terminationPaymentDays} onChange={(e)=>patchForm({terminationPaymentDays:e.target.value.replace(/\D/g,'').slice(0,3)})}/></CompanyField>
        <CompanyField><span>Contagem</span><CompanySelect value={form.terminationPaymentRule} onChange={(e)=>patchForm({terminationPaymentRule:e.target.value as TerminationPaymentRule})}><option value="calendar_days">Dias corridos</option><option value="business_days">Dias úteis</option></CompanySelect></CompanyField>
        <CompanyField fullWidth><span>Regra / cláusula</span><CompanyTextarea rows={2} value={form.penaltyText} onChange={(e)=>patchForm({penaltyText:e.target.value})}/></CompanyField></>}
      </CompanyFormFields></>}
      {registrationTab==='financial'&&<><CompanyFormHint>Condições financeiras e cobrança</CompanyFormHint><CompanyFormFields>
        <CompanyField><span>Valor do contrato</span><CompanyInput placeholder="Valor mensal" value={form.contractValue} onChange={(e)=>patchForm({contractValue:e.target.value})}/></CompanyField>
        <CompanyField><span>Recorrência</span><CompanySelect value={form.billingFrequency} onChange={(e)=>patchForm({billingFrequency:e.target.value})}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></CompanySelect></CompanyField>
        <CompanyField><span>Pagamento</span><CompanySelect value={form.paymentMethod} onChange={(e)=>patchForm({paymentMethod:e.target.value})}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></CompanySelect></CompanyField>
        <CompanyField><span>Regra de vencimento</span><CompanySelect value={form.billingDueRule} onChange={(e)=>patchForm({billingDueRule:e.target.value})}><option value="fixed_day">Dia fixo</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></CompanySelect></CompanyField>
        {form.billingDueRule==='fixed_day'&&<CompanyField><span>Dia de vencimento</span><CompanyInput placeholder="Dia" value={form.billingDay} onChange={(e)=>patchForm({billingDay:e.target.value.replace(/\D/g,'').slice(0,2)})}/></CompanyField>}
        <CompanyField><span>Aviso antecipado (dias antes)</span><CompanyInput placeholder="Dias" value={form.billingLeadDays} onChange={(e)=>patchForm({billingLeadDays:e.target.value.replace(/\D/g,'').slice(0,2)})}/></CompanyField>
        <CompanyField><span>Prazo para pagamento</span><CompanyInput inputMode="numeric" placeholder="Dias" value={form.paymentTermDays} onChange={(e)=>patchForm({paymentTermDays:e.target.value.replace(/\D/g,'').slice(0,3)})}/></CompanyField>
        <CompanyField><span>Multa por atraso (%)</span><CompanyInput inputMode="decimal" placeholder="Percentual" value={form.lateFeePercent} onChange={(e)=>patchForm({lateFeePercent:e.target.value.replace(/[^0-9.,]/g,'')})}/></CompanyField>
        <CompanyField><span>Juros diário (%)</span><CompanyInput inputMode="decimal" placeholder="Percentual" value={form.dailyInterestPercent} onChange={(e)=>patchForm({dailyInterestPercent:e.target.value.replace(/[^0-9.,]/g,'')})}/></CompanyField>
        <CompanyField fullWidth><span>Observação financeira</span><CompanyInput value={form.notes} onChange={(e)=>patchForm({notes:e.target.value})}/></CompanyField>
      </CompanyFormFields><p className="tw:mt-[1.385rem] tw:mb-0 tw:text-[.846rem] tw:leading-[1.6] tw:text-[#9a8c83]">O registro financeiro terá vencimento, baixa de pagamento, multa e juros. A automação de cobrança só é ativada depois, na gestão da conta.</p></>}
      {registrationTab==='documents'&&<><CompanyFormHint>Vínculos documentais da conta</CompanyFormHint><CompanyFormFields>
        <CompanyField><span>Link do Drive</span><CompanyInput type="url" placeholder="https://drive.google.com/..." value={form.driveUrl} onChange={(e)=>patchForm({driveUrl:e.target.value})}/></CompanyField>
        <CompanyField><span>Responsável documental</span><CompanyInput placeholder="Nome do responsável" value={form.documentOwner} onChange={(e)=>patchForm({documentOwner:e.target.value})}/></CompanyField>
        <CompanyField fullWidth><span>Observação documental</span><CompanyInput placeholder="Documentos necessários" value={form.documentNotes} onChange={(e)=>patchForm({documentNotes:e.target.value})}/></CompanyField>
        <CompanyField><span>Contrato assinado (PDF, DOC ou imagem)</span><CompanyFileInput accept=".pdf,.doc,.docx,image/*" onChange={(e)=>setContractFile(e.target.files?.[0]||null)} /></CompanyField>
        <CompanyField><span>Data do contrato</span><CompanyInput type="date" value={contractDate} onChange={(e)=>setContractDate(e.target.value)}/></CompanyField>
        <CompanyField><span>Aditivo contratual (opcional)</span><CompanyFileInput accept=".pdf,.doc,.docx,image/*" onChange={(e)=>setAddendumFile(e.target.files?.[0]||null)} /></CompanyField>
        <CompanyField><span>Data do aditivo</span><CompanyInput type="date" value={addendumDate} onChange={(e)=>setAddendumDate(e.target.value)}/></CompanyField>
      </CompanyFormFields></>}
          </div>
          <footer className="tw:flex tw:items-center tw:justify-between tw:gap-[1.154rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#ede4df] tw:bg-[#faf7f4] tw:px-[2.154rem] tw:py-[1.231rem] tw:text-[#8a8079] tw:max-[43.75rem]:flex-wrap tw:max-[43.75rem]:p-[.923rem]">
            <span className="tw:min-w-0">Etapa {regIndex + 1} de {registrationItems.length}{error ? ` · ${error}` : ''}</span>
            <div className="tw:flex tw:gap-[.615rem]">
              {regIndex > 0 && <Button type="button" variant="adminOutline" onClick={() => setRegistrationTab(registrationItems[regIndex - 1].id)}><ChevronLeft size={14} /> Voltar</Button>}
              {regIndex < registrationItems.length - 1
                ? <Button type="button" variant="adminPrimary" onClick={() => setRegistrationTab(registrationItems[regIndex + 1].id)}>Continuar <ChevronRight size={14} /></Button>
                : <Button type="submit" variant="adminPrimary" disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar conta'}</Button>}
            </div>
          </footer>
        </DialogForm>
      </div>
    )}

    {manageOpen && editDraft && (
      <div className="tw:fixed tw:inset-0 tw:z-[850] tw:motion-safe:animate-[workspace-dialog-fade_.22s_ease-out_backwards] tw:grid tw:place-items-center tw:bg-[#100c10b3] tw:p-[1.846rem] tw:backdrop-blur-[.385rem] tw:max-[45rem]:p-[.615rem]">
        <DialogFrame
          aria-label={`Gerenciar ${editDraft.name}`}
          className="tw:flex tw:motion-safe:animate-[workspace-dialog-enter_.34s_cubic-bezier(.2,.7,.2,1)_backwards] tw:h-[min(60.769rem,94dvh)] tw:w-full tw:max-w-[91.846rem] tw:flex-col tw:overflow-hidden tw:rounded-[1.308rem] tw:border tw:border-solid tw:border-[#e4d9d0] tw:bg-[#fffdfb] tw:text-[.923rem] tw:text-[#322f2c] tw:shadow-[0_1.75rem_6.25rem_#24142455]"
        >
          <CompanyProfileHeader company={editDraft} initials={initials(editDraft.name)} status={statusLabel(editDraft.status)} onClose={() => setManageOpen(false)} />
          <CompanyTabs mode="profile" value={accountTab} onChange={setAccountTab} items={accountItems} />
          <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto tw:px-[max(1.846rem,7%)] tw:py-[1.692rem] tw:max-[45rem]:p-[1.154rem]">
      {accountTab==='access'&&<CompanyOnboardingPanel
        key={editDraft.id}
        companyId={editDraft.id}
        isActive={editDraft.status==='active'}
        onApplyPreRegistration={applyPreRegistration}
        onAccessChanged={async () => {
          const rows = await loadClients();
          const updated = rows?.find((client) => client.id === editDraft.id);
          if (updated) setEditDraft(toCompanyDraft(updated));
        }}
        onUploadContract={(file,date) => uploadCompanyContractDocument(editDraft.id,file,'contract',date)}
      />}
      {accountTab==='fronts'&&<ContractFrontsAdmin company={{id:editDraft.id,display_name:editDraft.name,service_plan:planForService(clients.find(client=>client.id===editDraft.id)?.service||''),service_type:editDraft.service}}/>}
      {accountTab==='data'&&<section className="account-tab-pane"><AccountPaneHeading icon={Building2} title="Dados cadastrais" description="Identidade, serviço, localização e decisor." /><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[.923rem] tw:pt-[.308rem] tw:pb-[1.077rem] tw:text-[.846rem] tw:text-[#9a8c83]"><label className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[.538rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:font-semibold tw:text-cali-brand tw:focus-within:outline-2 tw:focus-within:outline-cali-gold"><ImagePlus aria-hidden="true" className="tw:size-[1.154rem]" />Alterar logo<input className="tw:sr-only" type="file" accept="image/*,.svg" onChange={(event) => { setEditLogoFile(event.target.files?.[0] || null); scheduleCompanyLogoBackfill(); }}/></label>{editLogoFile&&<span>{editLogoFile.name}</span>}</div><CompanyFormFields profile><CompanyField>Empresa<CompanyInput value={editDraft.name} onChange={(e)=>patchDraft({name:e.target.value})}/></CompanyField><CompanyField>Razão social<CompanyInput value={editDraft.legalName||''} onChange={(e)=>patchDraft({legalName:e.target.value})} placeholder="Como consta no contrato"/></CompanyField><CompanyField>Segmento<CompanySelect value={editDraft.segment||''} onChange={(e)=>patchDraft({segment:e.target.value})}><option value="">Selecionar</option>{segments.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField><CompanyField>Serviço<CompanySelect value={editDraft.service} onChange={(e)=>patchDraft({service:e.target.value})}><option value="">Selecionar</option>{services.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField><CompanyField>Horas contratadas<CompanyInput inputMode="decimal" value={editDraft.contractedHours||''} onChange={(e)=>patchDraft({contractedHours:Number(e.target.value.replace(',','.'))||0})}/></CompanyField><CompanyField>Cidade<CompanyInput value={editDraft.city||''} onChange={(e)=>patchDraft({city:e.target.value})}/></CompanyField><CompanyField>Estado<CompanyInput maxLength={2} value={editDraft.state||''} onChange={(e)=>patchDraft({state:e.target.value.toUpperCase().slice(0,2)})}/></CompanyField><CompanyField>Endereço<CompanyInput value={editDraft.addressStreet||''} onChange={(e)=>patchDraft({addressStreet:e.target.value})}/></CompanyField><CompanyField>Número<CompanyInput value={editDraft.addressNumber||''} onChange={(e)=>patchDraft({addressNumber:e.target.value})}/></CompanyField><CompanyField>Bairro<CompanyInput value={editDraft.neighborhood||''} onChange={(e)=>patchDraft({neighborhood:e.target.value})}/></CompanyField><CompanyCheckCard fullWidth checked={Boolean(editDraft.hasBranches)} onChange={(e)=>patchDraft({hasBranches:e.target.checked,branches:e.target.checked?editDraft.branches:[]})} title="Possui filiais" description="Registre as demais localidades." />{editDraft.hasBranches&&<CompanyField fullWidth>Filiais<CompanyTextarea rows={2} value={(editDraft.branches||[]).join('\n')} onChange={(e)=>patchDraft({branches:e.target.value.split('\n').map((v)=>v.trim()).filter(Boolean)})}/></CompanyField>}<div className="tw:col-span-full tw:flex tw:items-center tw:gap-[.538rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.846rem] tw:font-semibold tw:text-cali-brand"><span className="tw:shrink-0"><CheckCircle2 size={19}/></span><div><strong>{editDraft.access==='Ativo'?'Decisor conectado à conta':'Aguardando primeiro acesso'}</strong><p>{editDraft.access==='Ativo'?<>As mudanças em <b>nome, cargo e contato</b> também atualizam o perfil de {editDraft.contact||'quem representa a empresa'}. O e-mail de login fica protegido nesta ficha; caso precise trocá-lo, solicite a alteração à administração da CALI.</>:<>Os dados abaixo serão vinculados ao perfil quando o convite de acesso for aceito.</>}</p></div></div><CompanyField>Nome do decisor<CompanyInput value={editDraft.contact} onChange={(e)=>patchDraft({contact:e.target.value})}/></CompanyField><CompanyField>Cargo<CompanyInput value={editDraft.decisionTitle||''} onChange={(e)=>patchDraft({decisionTitle:e.target.value})}/></CompanyField><CompanyField><span className="tw:inline-flex tw:items-center tw:gap-[.462rem]"><Cake aria-hidden="true" className="tw:size-[1.077rem]" />Aniversário</span><CompanyInput type="date" value={editDraft.decisionBirthday||''} onChange={(e)=>patchDraft({decisionBirthday:e.target.value})}/></CompanyField><CompanyField>E-mail de acesso<CompanyInput type="email" value={editDraft.email} disabled={editDraft.primaryProfileLinked} onChange={(e)=>patchDraft({email:e.target.value})}/></CompanyField><CompanyCheckCard fullWidth checked={editDraft.primaryAccessRequested} onChange={(e)=>patchDraft({primaryAccessRequested:e.target.checked})} title="Solicitar acesso para o contato principal" description="Novas solicitações são liberadas na aba Acessos." /><CompanyField>Telefone<CompanyInput value={editDraft.phone||''} onChange={(e)=>patchDraft({phone:e.target.value})}/></CompanyField><CompanyField>WhatsApp<CompanyInput value={editDraft.whatsapp||''} onChange={(e)=>patchDraft({whatsapp:e.target.value})}/></CompanyField><CompanyField>Link do Drive<CompanyInput type="url" placeholder="https://drive.google.com/..." value={editDraft.driveUrl||''} onChange={(e)=>patchDraft({driveUrl:e.target.value})}/></CompanyField><CompanyField>Responsável documental<CompanyInput value={editDraft.documentOwner||''} onChange={(e)=>patchDraft({documentOwner:e.target.value})}/></CompanyField><CompanyField fullWidth>Observação documental<CompanyInput value={editDraft.documentNotes||''} onChange={(e)=>patchDraft({documentNotes:e.target.value})}/></CompanyField></CompanyFormFields>
        <AccountPaneHeading icon={ShieldCheck} title="Decisores e acessos adicionais" description="Até 4 acessos por empresa, contando o principal. Todos veem as mesmas informações." className="tw:mt-[1.692rem]" />
        <div className="tw:mb-[1.154rem] tw:flex tw:flex-col tw:gap-[1.077rem]">{(editDraft.extraAccesses||[]).map((person,index)=><section key={person.key} className="tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e8dcd4] tw:bg-[#fdfaf7] tw:p-[1.231rem]"><header className="tw:mb-[1.077rem] tw:flex tw:items-center tw:justify-between"><strong>Decisor / acesso adicional {index+1}</strong><button type="button" className="tw:border-0 tw:bg-transparent tw:text-[#a15f67]" onClick={()=>patchDraft({extraAccesses:(editDraft.extraAccesses||[]).filter((_,n)=>n!==index)})}>Remover</button></header><CompanyFormFields>
          {([['name','Nome completo'],['job','Cargo'],['email','E-mail'],['phone','Telefone / WhatsApp']] as const).map(([key,label])=><CompanyField key={key}><span>{label}</span><CompanyInput type={key==='email'?'email':'text'} value={person[key]} onChange={(e)=>patchDraft({extraAccesses:(editDraft.extraAccesses||[]).map((item,n)=>n===index?{...item,[key]:e.target.value}:item)})}/></CompanyField>)}
          <CompanyField><span>Tipo de contato</span><CompanySelect value={person.role} onChange={(e)=>patchDraft({extraAccesses:(editDraft.extraAccesses||[]).map((item,n)=>n===index?{...item,role:e.target.value}:item)})}><option>Decisor adicional</option><option>Acesso adicional</option></CompanySelect></CompanyField>
          <CompanyAccessCheckbox checked={person.access} onChange={(e)=>patchDraft({extraAccesses:(editDraft.extraAccesses||[]).map((item,n)=>n===index?{...item,access:e.target.checked}:item)})} />
        </CompanyFormFields></section>)}
        {(editDraft.extraAccesses||[]).length<maxExtraPeople&&<Button type="button" variant="adminOutline" onClick={()=>patchDraft({extraAccesses:[...(editDraft.extraAccesses||[]),blankPerson()]})}><Plus size={14}/> Adicionar decisor ou acesso</Button>}</div>
      </section>}
      {accountTab==='contract'&&<section className="account-tab-pane"><AccountPaneHeading icon={FileCheck2} title="Contrato" description="Prazo, renovação e encerramento." /><CompanyMetrics values={[['Duração', contractDuration(editDraft.startDate,editDraft.endDate)], ['Renovação', editDraft.autoRenew?'Automática':'Manual / não prevista'], ['Valor estimado do período', formatCurrency(estimateContractTotal(editDraft))]]} /><CompanyFormFields profile><CompanyField>Início<CompanyInput type="date" value={editDraft.startDate||''} onChange={(e)=>patchDraft({startDate:e.target.value})}/></CompanyField><CompanyField>Término<CompanyInput type="date" value={editDraft.endDate||''} onChange={(e)=>patchDraft({endDate:e.target.value})}/></CompanyField><CompanyField>Contrato<CompanySelect value={editDraft.contractType||''} onChange={(e)=>patchDraft({contractType:e.target.value})}><option value="">Selecionar</option>{contractTypes.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField><CompanyField>Modelo<CompanySelect value={editDraft.contractModel||''} onChange={(e)=>patchDraft({contractModel:e.target.value})}><option value="">Selecionar</option>{contractModels.map((item)=><option key={item}>{item}</option>)}</CompanySelect></CompanyField><CompanyCheckCard checked={Boolean(editDraft.autoRenew)} onChange={(e)=>patchDraft({autoRenew:e.target.checked})} title="Renovação automática" description="Conforme o contrato." /><CompanyCheckCard checked={Boolean(editDraft.penaltyEnabled)} onChange={(e)=>patchDraft({penaltyEnabled:e.target.checked,terminationPenaltyType:e.target.checked?(editDraft.terminationPenaltyType||'remaining_balance_percent'):'none'})} title="Multa de encerramento" description="Usada na simulação de distrato." />{editDraft.penaltyEnabled&&<><CompanyField>Base da multa<CompanySelect value={editDraft.terminationPenaltyType||'none'} onChange={(e)=>patchDraft({terminationPenaltyType:e.target.value as TerminationPenaltyType})}><option value="none">Somente regra textual</option><option value="remaining_balance_percent">% sobre saldo restante</option><option value="contract_total_percent">% sobre valor total estimado</option><option value="fixed_amount">Valor fixo</option><option value="monthly_fee_multiple">Múltiplos da mensalidade</option></CompanySelect></CompanyField><CompanyField>Parâmetro<CompanyInput inputMode="decimal" value={editDraft.terminationPenaltyValue??0} onChange={(e)=>patchDraft({terminationPenaltyValue:Number(e.target.value.replace(',','.'))||0})}/></CompanyField><CompanyField>Prazo para pagamento<CompanyInput inputMode="numeric" value={editDraft.terminationPaymentDays??0} onChange={(e)=>patchDraft({terminationPaymentDays:Number(e.target.value.replace(/\D/g,''))||0})}/></CompanyField><CompanyField>Contagem<CompanySelect value={editDraft.terminationPaymentRule||'calendar_days'} onChange={(e)=>patchDraft({terminationPaymentRule:e.target.value as TerminationPaymentRule})}><option value="calendar_days">Dias corridos</option><option value="business_days">Dias úteis</option></CompanySelect></CompanyField><CompanyField fullWidth>Regra / cláusula<CompanyTextarea rows={2} value={editDraft.penaltyText||''} onChange={(e)=>patchDraft({penaltyText:e.target.value})}/></CompanyField></>}</CompanyFormFields>{editDraft.terminationSignedAt&&<div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.462rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem]"><FileCheck2 size={17}/><div><strong>Distrato registrado em {formatDate(editDraft.terminationSignedAt)}</strong><p>Multa registrada: {formatCurrency(editDraft.terminationPenaltyAmount)} · vencimento: {formatDate(editDraft.terminationPaymentDueAt)}.</p></div></div>}
        <CompanyDataAction
          icon={Download}
          action={<CompanyDataButton onClick={() => void runCompanyExport(editDraft)} busy={exportState.busy}>{exportState.busy ? 'Gerando…' : 'Exportar'}</CompanyDataButton>}
        >
          <strong>Exportar dados da empresa</strong>
          <p className="tw:m-0">Prepare a entrega aplicável dentro dos 30 dias corridos do encerramento: baixa todos os dados da empresa e um índice dos documentos com links de download por 7 dias. Anotações internas da CALI ficam de fora. Salários, gênero e filhos saem separados, como dados restritos: entregue só a representante autorizado. A exportação e o destinatário ficam registrados no histórico.</p>
          <label className="tw:mt-[.308rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[.769rem] tw:font-semibold tw:text-[#3e3533]">
            <span>Entregar para</span>
            <CompanyInput
              value={exportRecipient}
              maxLength={200}
              onChange={(event) => setExportRecipient(event.target.value)}
              placeholder="Nome e cargo do representante autorizado"
              className="tw:min-h-0! tw:min-w-0 tw:max-w-[27.692rem] tw:flex-1 tw:px-[.769rem]! tw:py-[.538rem]!"
            />
          </label>
          {exportState.note && <CompanyDataStatus failed={exportState.failed}>{exportState.note}</CompanyDataStatus>}
        </CompanyDataAction>
        {editDraft.status==='closed'&&editDraft.closedAt&&(() => {
        const deadline = eliminationDeadlineDate(editDraft.closedAt);
        const due = !editDraft.dataEliminatedAt && deadline.getTime() <= Date.now();
        return <CompanyDataAction
          icon={Trash2}
          tone={editDraft.dataEliminatedAt ? 'done' : due ? 'due' : 'neutral'}
          action={!editDraft.dataEliminatedAt && <CompanyDataButton onClick={() => void openElimination(editDraft)} danger={due}>Revisar eliminação</CompanyDataButton>}
        >
            <strong>{editDraft.dataEliminatedAt?'Dados eliminados':due?'Prazo de eliminação atingido':'Eliminação de dados'}</strong>
            <p className="tw:m-0">{editDraft.dataEliminatedAt
              ? `Eliminação concluída em ${formatDate(editDraft.dataEliminatedAt)}. O comprovante e os registros de guarda residual ficam com a CALI.`
              : `Concluir até ${deadline.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}, 30 dias corridos após o encerramento. Confira a exportação aplicável e autorize a eliminação.`}
            </p>
            {elimination.note && !elimination.open && <CompanyDataStatus failed={elimination.failed}>{elimination.note}</CompanyDataStatus>}
        </CompanyDataAction>;
      })()}</section>}
      {accountTab==='agenda'&&<ContractAgendaSettings companyId={editDraft.id}/>}
      {accountTab==='financial'&&<section className="account-tab-pane"><AccountPaneHeading icon={Banknote} title="Financeiro" description="Valor, vencimento, atraso e regras de cobrança." /><CompanyMetrics values={[['Valor', formatCurrency(editDraft.contractValue)], ['Vencimento', dueRuleLabel(editDraft)], ['Situação', editDraft.billingStatus||'A acompanhar']]} /><CompanyFormFields profile><CompanyField>Valor do contrato<CompanyInput inputMode="decimal" value={editDraft.contractValue??''} onChange={(e)=>patchDraft({contractValue:Number(e.target.value.replace(',','.'))||null})}/></CompanyField><CompanyField>Recorrência<CompanySelect value={editDraft.billingFrequency||'monthly'} onChange={(e)=>patchDraft({billingFrequency:e.target.value})}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></CompanySelect></CompanyField><CompanyField>Pagamento<CompanySelect value={editDraft.paymentMethod||'pix'} onChange={(e)=>patchDraft({paymentMethod:e.target.value})}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></CompanySelect></CompanyField><CompanyField>Regra de vencimento<CompanySelect value={editDraft.billingDueRule||'fixed_day'} onChange={(e)=>patchDraft({billingDueRule:e.target.value})}><option value="fixed_day">Dia fixo</option><option value="first_business_day">Primeiro dia útil</option><option value="last_business_day">Último dia útil</option><option value="custom">Personalizada</option></CompanySelect></CompanyField>{(editDraft.billingDueRule||'fixed_day')==='fixed_day'&&<CompanyField>Dia<CompanyInput value={editDraft.billingDay??''} onChange={(e)=>patchDraft({billingDay:Number(e.target.value.replace(/\D/g,'').slice(0,2))||null})}/></CompanyField>}<CompanyField>Aviso antecipado<CompanyInput value={editDraft.billingLeadDays??3} onChange={(e)=>patchDraft({billingLeadDays:Number(e.target.value.replace(/\D/g,''))||0})}/><small className="tw:text-[.769rem] tw:font-normal tw:text-[#9a8c83]">dias antes</small></CompanyField><CompanyField>Prazo para pagamento<CompanyInput inputMode="numeric" placeholder="Dias" value={editDraft.paymentTermDays??''} onChange={(e)=>patchDraft({paymentTermDays:e.target.value?Number(e.target.value.replace(/\D/g,'').slice(0,3)):null})}/></CompanyField><CompanyField>Multa por atraso (%)<CompanyInput inputMode="decimal" value={editDraft.lateFeePercent??0} onChange={(e)=>patchDraft({lateFeePercent:Number(e.target.value.replace(',','.'))||0})}/></CompanyField><CompanyField>Juros diário (%)<CompanyInput inputMode="decimal" value={editDraft.dailyInterestPercent??0} onChange={(e)=>patchDraft({dailyInterestPercent:Number(e.target.value.replace(',','.'))||0})}/></CompanyField><CompanyField fullWidth>Observação financeira<CompanyInput value={editDraft.financialNote||''} onChange={(e)=>patchDraft({financialNote:e.target.value})}/></CompanyField></CompanyFormFields><div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.462rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem]"><ReceiptText size={17}/><div><strong>Fluxo financeiro</strong><p>{editDraft.billingLeadDays??3} dias antes de {dueRuleLabel(editDraft).toLowerCase()}, preparar cobrança com relatório + {paymentMethodLabel(editDraft.paymentMethod)}. Se não houver baixa, a régua de atraso começa no dia seguinte ao vencimento.</p></div></div></section>}
      {accountTab==='operation'&&<section className="account-tab-pane"><AccountPaneHeading icon={FolderKanban} title="Operação" description="Horas, satisfação e projetos vinculados." /><CompanyMetrics values={[["Horas", editDraft.hours], ["Consumo", `${editDraft.usage}%`], ["NPS", editDraft.nps], ["Acesso", editDraft.access]]} /><article className="tw:mb-[1.077rem] tw:flex tw:min-w-0 tw:flex-col tw:gap-[.462rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem]"><div className="tw:mb-[.308rem] tw:flex tw:items-center tw:gap-[.615rem] tw:text-[1rem]"><BriefcaseBusiness size={17}/><strong>Projetos em andamento</strong></div>{editDraft.projects?.length?<ul className="tw:m-0 tw:list-none tw:p-0 tw:[&>li]:flex tw:[&>li]:items-center tw:[&>li]:justify-between tw:[&>li]:gap-[.923rem] tw:[&>li]:border-0 tw:[&>li]:border-b tw:[&>li]:border-solid tw:[&>li]:border-[#f0e8e1] tw:[&>li]:px-[.154rem] tw:[&>li]:py-4 tw:[&>li]:text-[.923rem] tw:[&_small]:text-[#9a8c83]">{editDraft.projects.map((project)=><li key={project.id}><span>{project.name}</span><small>{({active:'Em andamento',paused:'Em pausa',closed:'Encerrado',completed:'Concluído',planning:'Em planejamento'} satisfies Record<string,string>)[project.status]||project.status}</small></li>)}</ul>:<p>Nenhum projeto vinculado ainda.</p>}</article><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[.923rem] tw:pt-[.308rem] tw:pb-[1.077rem] tw:text-[.846rem] tw:[&_a]:inline-flex tw:[&_a]:items-center tw:[&_a]:gap-[.538rem] tw:[&_a]:rounded-[.538rem] tw:[&_a]:border tw:[&_a]:border-solid tw:[&_a]:border-[#e5d8d0] tw:[&_a]:bg-white tw:[&_a]:px-[.923rem] tw:[&_a]:py-[.692rem] tw:[&_a]:font-semibold tw:[&_a]:text-cali-brand"><a href={`mailto:${editDraft.email}`}><Mail size={16}/>E-mail</a>{editDraft.whatsapp&&<a href={`https://wa.me/55${editDraft.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a>}</div></section>}
      {accountTab==='communications'&&<section className="account-tab-pane"><AccountPaneHeading icon={BellRing} title="Comunicações automáticas" description="Régua por evento da conta. O envio fica desligado até você ativar esta empresa." /><label className="tw:mb-[.923rem] tw:flex tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.automationEnabled)} onChange={(e)=>patchDraft({automationEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Automação desta conta</strong><small>{editDraft.automationEnabled?'Ativa: eventos habilitados podem entrar na fila automática.':'Desligada: nenhum e-mail automático será disparado.'}</small></span></label><div className="tw:mb-[1.077rem] tw:grid tw:grid-cols-3 tw:gap-[.923rem] tw:max-[43.75rem]:grid-cols-1"><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.welcomeEmailEnabled)} onChange={(e)=>patchDraft({welcomeEmailEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Boas-vindas</strong><small>Ao ativar o acesso principal.</small></span></label><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.dueReminderEnabled)} onChange={(e)=>patchDraft({dueReminderEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Lembrete de vencimento</strong><small>{editDraft.billingLeadDays??3} dias antes do vencimento.</small></span></label><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.overdueEmailEnabled)} onChange={(e)=>patchDraft({overdueEmailEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Pagamento em aberto</strong><small><input className="tw:mx-[.231rem] tw:inline-block tw:w-[3.538rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.462rem] tw:py-[.154rem] tw:text-center tw:text-[.923rem]" inputMode="numeric" value={editDraft.overdueEmailAfterDays??1} onChange={(e)=>patchDraft({overdueEmailAfterDays:Number(e.target.value.replace(/\D/g,''))||0})}/> dia(s) depois, se não houver baixa.</small></span></label><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.extrajudicialEmailEnabled)} onChange={(e)=>patchDraft({extrajudicialEmailEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Notificação extrajudicial</strong><small>Depois de <input className="tw:mx-[.231rem] tw:inline-block tw:w-[3.538rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.462rem] tw:py-[.154rem] tw:text-center tw:text-[.923rem]" inputMode="numeric" value={editDraft.extrajudicialAfterDays??''} onChange={(e)=>patchDraft({extrajudicialAfterDays:e.target.value?Number(e.target.value.replace(/\D/g,'')):null})}/> dia(s) em aberto.</small></span></label><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.terminationEmailEnabled)} onChange={(e)=>patchDraft({terminationEmailEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Encerramento</strong><small>Após registrar o distrato.</small></span></label><label className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#9a8c83]"><input type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" checked={Boolean(editDraft.birthdayEmailEnabled)} onChange={(e)=>patchDraft({birthdayEmailEnabled:e.target.checked})}/><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]"><strong>Aniversário</strong><small>{editDraft.decisionBirthday?`Data: ${formatDate(editDraft.decisionBirthday)}`:'Cadastre a data do decisor.'}</small></span></label></div><div className="tw:flex tw:flex-col tw:[&>div]:flex tw:[&>div]:items-center tw:[&>div]:gap-[.769rem] tw:[&>div]:border-0 tw:[&>div]:border-b tw:[&>div]:border-solid tw:[&>div]:border-[#f0e8e1] tw:[&>div]:px-[.154rem] tw:[&>div]:py-4 tw:[&>div]:text-[.846rem]"><div><strong>Boas-vindas</strong><span>“Bem-vindo(a) ao CALI Workspace · {editDraft.name}”</span></div><div><strong>Vencimento</strong><span>“CALI RH · vencimento em [data] · {editDraft.name}”</span></div><div><strong>Atraso</strong><span>“CALI RH · pagamento em aberto · {editDraft.name}”</span></div><div><strong>Notificação</strong><span>“CALI RH · notificação referente a pagamento em aberto · {editDraft.name}”</span></div><div><strong>Encerramento</strong><span>“CALI RH · encerramento contratual · {editDraft.name}”</span></div></div></section>}
      {accountTab==='history'&&<section className="account-tab-pane"><AccountPaneHeading icon={History} title="Histórico da relação" description="Movimentos importantes da conta." />{editDraft.history?.length ? (
        <ul className="tw:m-0 tw:list-none tw:p-0">
          {editDraft.history.map((item) => (
            <li key={item.id} className="tw:flex tw:items-center tw:gap-[.923rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0e8e1] tw:px-[.154rem] tw:py-4 tw:text-[.923rem]">
              <span aria-hidden="true" className="tw:size-[.692rem] tw:shrink-0 tw:rounded-full tw:bg-[#bd996a]" />
              <div className="tw:min-w-0 tw:flex-1">
                <strong>{item.title}</strong>
                <p className="tw:mt-[.231rem] tw:mb-0 tw:text-[.846rem] tw:text-[#92847b]">{item.detail}</p>
              </div>
              <time className="tw:text-[.769rem] tw:whitespace-nowrap tw:text-[#978579]">{item.date}</time>
            </li>
          ))}
        </ul>
      ) : <p>Ainda não há movimentações registradas.</p>}</section>}
          </div>
          <CompanyProfileFooter
            status={editDraft.status}
            onLifecycle={(action) => {
              setManageOpen(false);
              requestLifecycle(editDraft, action);
            }}
            onCancel={() => setManageOpen(false)}
            onSave={() => void saveClient()}
            saving={saving}
          />
        </DialogFrame>
      </div>
    )}

    {elimination.open&&editDraft&&<WorkspaceDialogOverlay>
      <WorkspaceConfirmDialog aria-label="Eliminar dados">
        <div><small>FIM DE CONTRATO</small><h2>Eliminar dados</h2><p><strong>{editDraft.name}</strong></p>
          <p>O executor remove os dados operacionais e anonimiza as pessoas vinculadas. A CALI mantém os registros de guarda residual aplicável.</p>
        </div>
        {elimination.preview && <>
          <p>{elimination.preview.files} arquivo(s) no escopo. Prazo até {new Date(elimination.preview.deadlineAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p>
          {elimination.preview.externalCopies && <p>Há vínculos de integração. Confira as cópias externas sob responsabilidade da CALI.</p>}
          <label>Digite o nome da empresa para confirmar
            <input value={elimination.name} onChange={(event)=>setElimination((current)=>({...current,name:event.target.value}))} autoFocus />
          </label>
          <label className="check-line">
            <input type="checkbox" checked={Boolean(elimination.reviewed)} onChange={(event)=>setElimination((current)=>({...current,reviewed:event.target.checked}))} />
            Conferi a exportação aplicável e as cópias sob responsabilidade da CALI.
          </label>
        </>}
        {elimination.note && <CompanyDataStatus failed={elimination.failed}>{elimination.note}</CompanyDataStatus>}
        <footer>
          <button type="button" disabled={elimination.busy} onClick={()=>setElimination({open:false,name:'',busy:false,note:''})}>Fechar</button>
          <button type="button" className="tw:border-[#b42318]! tw:bg-[#b42318]!" disabled={elimination.busy||!elimination.preview||!elimination.reviewed||elimination.name.trim().toLowerCase()!==editDraft.name.trim().toLowerCase()} onClick={()=>void runElimination(editDraft)}>
            {elimination.busy?'Processando…':elimination.preview?.job||elimination.note?'Retomar eliminação':'Autorizar eliminação'}
          </button>
        </footer>
      </WorkspaceConfirmDialog>
    </WorkspaceDialogOverlay>}
    {lifecycle&&<WorkspaceDialogOverlay onMouseDown={(e)=>{if(e.target===e.currentTarget)setLifecycle(null);}}><WorkspaceConfirmDialog aria-label="Gestão da conta"><div><small>GESTÃO DA CONTA</small><h2>{lifecycle.type==='pause'?'Pausar temporariamente':lifecycle.type==='block'?'Bloquear acesso':lifecycle.type==='archive'?'Arquivar conta':lifecycle.type==='close'?'Encerrar contrato':'Reativar conta'}</h2><p><strong>{lifecycle.client.name}</strong> · {lifecycle.client.service}</p><p>{lifecycle.type==='close'?'Registre a data do distrato. O Workspace calcula a projeção financeira usando a cláusula cadastrada. O acesso das pessoas do cliente é bloqueado na hora. Antes de confirmar, se quiser, exporte os dados na aba Contrato.':lifecycle.type==='pause'?'O contrato fica em espera. O cliente continua entrando e consultando. A ação ficará registrada no histórico da conta.':lifecycle.type==='block'?'O cliente deixa de conseguir entrar no Workspace até a conta ser reativada. A ação ficará registrada no histórico da conta.':lifecycle.type==='archive'?'O acesso das pessoas do cliente é bloqueado. A ação ficará registrada no histórico da conta.':'A ação ficará registrada no histórico da conta.'}</p></div>{lifecycle.type==='close'&&<><label>Data do distrato<input className="tw:h-[3.308rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:px-[.923rem] tw:font-normal" type="date" value={lifecycleDate} onChange={(e)=>setLifecycleDate(e.target.value)}/></label>{closeProjection&&<CompanyMetrics values={[["Saldo contratual estimado", formatCurrency(closeProjection.remainingBalance)], ["Multa calculada", formatCurrency(closeProjection.penalty)], ["Pagamento até", formatDate(closeProjection.dueDate)]]} />}</>}{lifecycle.type!=='reactivate'&&<label>Motivo<textarea value={lifecycleReason} onChange={(e)=>setLifecycleReason(e.target.value)} placeholder="Registre o motivo" autoFocus/></label>}<footer><button type="button" onClick={()=>setLifecycle(null)}>Cancelar</button><button type="button" disabled={saving||(lifecycle.type!=='reactivate'&&!lifecycleReason.trim())} onClick={()=>void applyLifecycle()}>{saving?'Salvando…':'Confirmar'}</button></footer></WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
    </div></div>
  </Shell>;
}
