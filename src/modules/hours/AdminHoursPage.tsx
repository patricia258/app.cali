import { AdminNotice } from '../../components/ds/AdminNotice';
import { WorkflowDialogOverlay } from '../../components/ds/WorkflowDialog';
import { WorkspaceAdminPage } from '../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../components/workspace/components/WorkspaceAdminContent';
import { WorkspaceAdminPanel } from '../../components/workspace/components/WorkspaceAdminPanel';
import { WorkspaceAdminPanelHeader } from '../../components/workspace/components/WorkspaceAdminPanelHeader';
import { WorkspaceMetricGrid } from '../../components/workspace/components/WorkspaceMetricGrid';
import { WorkspaceConfirmDialog } from '../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../components/workspace/components/WorkspaceDialogOverlay';
import {
  WorkspaceFormDialogBody,
  WorkspaceFormDialogFrame,
  WorkspaceFormDialogHeader,
} from '../../components/workspace/components/WorkspaceFormDialog';
import { WorkspacePageHeader } from '../../components/workspace/WorkspacePageHeader';
import { HourSourceBadge } from './components/HourSourceBadge';
import { HoursMoreButton } from './components/HoursMoreButton';
import { HoursActionButton } from './components/HoursActionButton';
import { HoursField } from './components/HoursField';
import { HoursClientVisibility } from './components/HoursClientVisibility';
import { HoursUsageSection } from './components/HoursUsageSection';
import { HoursAuditDialog } from './components/HoursAuditDialog';
import { AuditedHourEntryDialog } from './components/AuditedHourEntryDialog';
import { HoursCompanyLogo } from './components/HoursCompanyLogo';
import { TIMER_EVENT } from '../../lib/timerSemantics';
import { errorMessage } from '../../lib/errorMessage';
import { StaffDialogBody, StaffDialogFields, StaffDialogFooter, StaffDialogForm, StaffDialogHeader } from '../../components/workspace/StaffDialog';
import { Button } from '../../components/ds/Button';
import { LoadingState } from '../../components/ds/LoadingState';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from '../../components/hours/TimerFinalizationDialog';
import { useFinalizeHoursTimer } from './hooks/useFinalizeHoursTimer';
import { Fragment, FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CapacityPanel } from '../projects/components/CapacityPanel';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock3,
  Download, Filter, Loader2, MessageSquareText, Pause, PenSquare, Pencil, Trash2,
  Play, Square,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import { hoursAvailable } from '../../api/hours/client';
import {
  addExternalInteraction, addManualHourEntry, editAdminHourEntry, editPartnerHourEntry,
  editPartnerSubmission, setHoursVisibility, submitPartnerHours,
} from '../../api/hours/entries';
import { pauseWorkTimer, resumeWorkTimer, startAdminTimer, startPartnerTimer, stopPartnerTimer, stopWorkTimer } from '../../api/hours/timers';
import { readHoursWorkspace, type HourSource, type StaffHoursCompany } from '../../api/hours/workspace';
import type { HourAuditEntry } from '../../api/hours/audit';

type Company = { id: string; name: string; logoUrl?: string | null; logoFallbackUrl?: string | null; monthlyHours: number; servicePlan?: string | null; showHoursToClient: boolean };
type Project = { id: string; companyId: string; name: string; planningStatus?: string | null; status?: string | null };
type Deliverable = { id: string; companyId: string; projectId?: string | null; title: string; status: string; protocol?: string | null; workClosedAt?: string | null };
type Task = { id: string; companyId: string; deliverableId: string; title: string; status: string; protocol?: string | null; workClosedAt?: string | null };
type Cycle = { id: string; companyId: string; projectId?: string | null; contractedHours?: number | null };
type Entry = {
  id: string; companyId: string; projectId?: string | null; deliverableId?: string | null; taskId?: string | null;
  workDate: string; minutes: number; description: string; category?: string | null; sourceType: HourSource;
  clientVisible: boolean; internalNote?: string | null; startedAt?: string | null; endedAt?: string | null; createdAt: string;
  /** Equipe CALI: situação do lançamento na fila de aprovação da administradora. */
  staffStatus?: 'pending' | 'approved' | 'rejected'; staffNote?: string | null;
};
type TimerRow = {
  id: string; companyId: string; projectId?: string | null; deliverableId?: string | null; taskId?: string | null; cycleId?: string | null;
  userId: string; startedAt: string; status: 'active' | 'paused'; pausedAt?: string | null; pausedSeconds: number;
  category?: string | null; description?: string | null; clientVisible: boolean;
};
type Channel = 'WhatsApp' | 'E-mail' | 'Ligação' | 'Reunião' | 'Visita presencial' | 'Outro';
type PendingVisibility = { company: Company; enabled: boolean } | null;
type PendingFinalization = { timer: TimerRow; target: TimerFinalizationTarget; step: 1 | 2 };

const categories = ['Entregáveis','Reuniões e alinhamentos','Análise e consultoria','Documentação','Comunicação e follow-up','Treinamentos / encontros','Outros'];
const channels: Channel[] = ['WhatsApp','E-mail','Ligação','Reunião','Visita presencial','Outro'];


function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
function monthBounds(value: string) { const [year, month] = value.split('-').map(Number); const start = `${year}-${String(month).padStart(2,'0')}-01`; const nextDate = new Date(year, month, 1); const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-01`; return { start, next }; }
function formatMinutes(minutes: number) { const safe=Math.max(0,Math.round(Number(minutes||0))); const h=Math.floor(safe/60); const m=safe%60; if(!h)return `${m}min`; if(!m)return `${h}h`; return `${h}h ${String(m).padStart(2,'0')}min`; }
function timerLabel(seconds: number) { const h=Math.floor(seconds/3600); const m=Math.floor((seconds%3600)/60); const s=seconds%60; return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':'); }
function dateLabel(value: string) { return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0,10)}T12:00:00`)); }
function timeLabel(value?: string|null) { if(!value)return '—'; return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function sourceLabel(source: HourSource) { return source==='timer'?'Timer':source==='manual'?'Manual':source==='interaction'?'Interação':'Calendário'; }
function calculateRangeMinutes(start:string,end:string){ if(!start||!end)return null; const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); if([sh,sm,eh,em].some(v=>!Number.isFinite(v)))return null; const a=sh*60+sm,b=eh*60+em; return b>a?b-a:null; }
function timerSeconds(timer: TimerRow, nowMs: number) { const start=new Date(timer.startedAt).getTime(); const end=timer.status==='paused'&&timer.pausedAt?new Date(timer.pausedAt).getTime():nowMs; return Math.max(0,Math.floor((end-start)/1000)-Number(timer.pausedSeconds||0)); }
function downloadCsv(rows:Entry[],companies:Map<string,Company>,projects:Map<string,Project>,deliverables:Map<string,Deliverable>,tasks:Map<string,Task>,period:string){
  const headers=['Data','Cliente','Projeto','Entregável','Subtarefa','Duração','Tipo','Natureza','Descrição','Visível ao cliente'];
  const lines=rows.map(r=>[r.workDate,companies.get(r.companyId)?.name||'',r.projectId?projects.get(r.projectId)?.name||'':'',r.deliverableId?deliverables.get(r.deliverableId)?.title||'':'',r.taskId?tasks.get(r.taskId)?.title||'':'',formatMinutes(r.minutes),sourceLabel(r.sourceType),r.category||'',r.description,r.clientVisible?'Sim':'Não']);
  const quote=(v:string)=>`"${String(v??'').replaceAll('"','""')}"`; const csv=[headers,...lines].map(line=>line.map(quote).join(';')).join('\n'); const blob=new Blob([`\uFEFF${csv}`],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`CALI-Horas-${period}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

/* Equipe CALI (Partner): usa esta mesma tela. Vê o consumo de cada empresa atribuída (só o total) e os lançamentos DELE;
   cronômetro, lançamento manual e interação externa vão para a aprovação da administradora; edita o que ainda aguarda
   aprovação, com motivo; não exclui e não mexe na visibilidade para o cliente. */
export type StaffHoursScope = { companies: StaffHoursCompany[] };
function HoursFrame({ staff, children }: { staff:boolean; children:ReactNode }) { return staff ? <>{children}</> : <Shell role="admin">{children}</Shell>; }
export function StaffHoursPage({ companies }: StaffHoursScope) { return <AdminHoursPage staff={{ companies }} />; }
export function AdminHoursPage({ staff }: { staff?: StaffHoursScope } = {}){
  const [staffUsage,setStaffUsage]=useState<Record<string,number>>({});
  const [staffEdit,setStaffEdit]=useState<{id:string;kind:'submission'|'entry';date:string;start:string;end:string;minutes:string;description:string;reason:string}|null>(null);
  const [period,setPeriod]=useState(currentMonth());
  const [companies,setCompanies]=useState<Company[]>([]); const [projects,setProjects]=useState<Project[]>([]); const [deliverables,setDeliverables]=useState<Deliverable[]>([]); const [tasks,setTasks]=useState<Task[]>([]); const [cycles,setCycles]=useState<Cycle[]>([]); const [entries,setEntries]=useState<Entry[]>([]); const [activeTimers,setActiveTimers]=useState<TimerRow[]>([]);
  const [nowMs,setNowMs]=useState(Date.now);
  const [finalization, setFinalization] = useState<PendingFinalization | null>(null);
  const finishTimer = useFinalizeHoursTimer();
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<{ kind: 'edit' | 'delete'; entry: HourAuditEntry } | null>(null);
  const hasRunningTimer = activeTimers.some((timer) => timer.status === 'active');
  const [timerCompanyId,setTimerCompanyId]=useState(''); const [timerProjectId,setTimerProjectId]=useState(''); const [timerDeliverableId,setTimerDeliverableId]=useState(''); const [timerTaskId,setTimerTaskId]=useState(''); const [timerCategory,setTimerCategory]=useState(categories[0]); const [timerDescription,setTimerDescription]=useState(''); const [timerClientVisible,setTimerClientVisible]=useState(true);
  const [manualOpen,setManualOpen]=useState(false); const [timerOpen,setTimerOpen]=useState(false); const [usageQuery,setUsageQuery]=useState(''); const [usageAttention,setUsageAttention]=useState(false); const [usageAll,setUsageAll]=useState(false); const [entryLimit,setEntryLimit]=useState(15); const [manualDate,setManualDate]=useState(()=>new Date().toISOString().slice(0,10)); const [manualCompanyId,setManualCompanyId]=useState(''); const [manualProjectId,setManualProjectId]=useState(''); const [manualDeliverableId,setManualDeliverableId]=useState(''); const [manualTaskId,setManualTaskId]=useState(''); const [manualStart,setManualStart]=useState(''); const [manualEnd,setManualEnd]=useState(''); const [manualCategory,setManualCategory]=useState(categories[0]); const [manualDescription,setManualDescription]=useState(''); const [manualJustification,setManualJustification]=useState(''); const [manualClientVisible,setManualClientVisible]=useState(true);
  const [interactionOpen,setInteractionOpen]=useState(false); const [interactionChannel,setInteractionChannel]=useState<Channel>('WhatsApp'); const [interactionDate,setInteractionDate]=useState(()=>new Date().toISOString().slice(0,10)); const [interactionCompanyId,setInteractionCompanyId]=useState(''); const [interactionDeliverableId,setInteractionDeliverableId]=useState(''); const [interactionMinutes,setInteractionMinutes]=useState('15'); const [interactionDescription,setInteractionDescription]=useState(''); const [interactionClientVisible,setInteractionClientVisible]=useState(true);
  const [filterCompany,setFilterCompany]=useState('all'); const [filterSource,setFilterSource]=useState('all'); const [expandedId,setExpandedId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(true); const [notice,setNotice]=useState(''); const [error,setError]=useState(''); const [pendingVisibility,setPendingVisibility]=useState<PendingVisibility>(null);

  useEffect(() => {
    const refresh = () => void load();
    refresh();
    window.addEventListener(TIMER_EVENT, refresh);
    if (staff) {
      window.addEventListener('cali:staff-refresh', refresh);
      window.addEventListener('cali-staff-timer-changed', refresh);
    }
    return () => {
      window.removeEventListener(TIMER_EVENT, refresh);
      if (staff) {
        window.removeEventListener('cali:staff-refresh', refresh);
        window.removeEventListener('cali-staff-timer-changed', refresh);
      }
    };
  }, [period, staff]);
  useEffect(() => {
    if (!hasRunningTimer) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [hasRunningTimer]);
  useEffect(()=>{if(!notice&&!error)return;const id=window.setTimeout(()=>{setNotice('');setError('');},4200);return()=>window.clearTimeout(id);},[notice,error]);

  async function load() {
    if (!hoursAvailable) return;
    setLoading(true);
    setError('');
    try {
      const { start, next } = monthBounds(period);
      const workspace = await readHoursWorkspace(start, next, staff?.companies);
      setCompanies(workspace.companies);
      setProjects(workspace.projects);
      setDeliverables(workspace.deliverables);
      setTasks(workspace.tasks);
      setCycles(workspace.cycles);
      setEntries(workspace.entries);
      setActiveTimers(workspace.timers);
      if (staff) setStaffUsage(workspace.staffUsage);
      const openIds = new Set(workspace.timers.map((timer) => timer.companyId));
      if (!timerCompanyId || openIds.has(timerCompanyId)) {
        setTimerCompanyId(workspace.companies.find((company) => !openIds.has(company.id))?.id || '');
      }
      const firstCompany = workspace.companies[0];
      if (!manualCompanyId && firstCompany) setManualCompanyId(firstCompany.id);
      if (!interactionCompanyId && firstCompany) setInteractionCompanyId(firstCompany.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const operationalProjects=useMemo(()=>projects.filter(x=>x.status!=='cancelled'&&(['approved','active','rebriefing','closed'].includes(x.planningStatus||'')||(!x.planningStatus&&x.status==='active'))),[projects]);
  const operationalProjectIds=useMemo(()=>new Set(operationalProjects.map(x=>x.id)),[operationalProjects]);
  const companyMap=useMemo(()=>new Map(companies.map(x=>[x.id,x])),[companies]); const projectMap=useMemo(()=>new Map(projects.map(x=>[x.id,x])),[projects]); const deliverableMap=useMemo(()=>new Map(deliverables.map(x=>[x.id,x])),[deliverables]); const taskMap=useMemo(()=>new Map(tasks.map(x=>[x.id,x])),[tasks]);
  const openCompanyIds=useMemo(()=>new Set(activeTimers.map(t=>t.companyId)),[activeTimers]);
  const timerProjects=operationalProjects.filter(x=>x.companyId===timerCompanyId); const timerDeliverables=deliverables.filter(x=>x.companyId===timerCompanyId&&operationalProjectIds.has(x.projectId||'')&&(!timerProjectId||x.projectId===timerProjectId)); const timerTasks=tasks.filter(x=>x.companyId===timerCompanyId&&x.deliverableId===timerDeliverableId);
  const manualProjects=operationalProjects.filter(x=>x.companyId===manualCompanyId); const manualDeliverables=deliverables.filter(x=>x.companyId===manualCompanyId&&operationalProjectIds.has(x.projectId||'')&&(!manualProjectId||x.projectId===manualProjectId)); const manualTasks=tasks.filter(x=>x.companyId===manualCompanyId&&x.deliverableId===manualDeliverableId);
  const interactionDeliverables=deliverables.filter(x=>x.companyId===interactionCompanyId&&operationalProjectIds.has(x.projectId||''));
  const selectedTimerDeliverable=timerDeliverableId?deliverableMap.get(timerDeliverableId)||null:null; const selectedTimerTask=timerTaskId?taskMap.get(timerTaskId)||null:null;
  const timerTargetClosed = !staff && Boolean(selectedTimerDeliverable?.workClosedAt || selectedTimerDeliverable?.status === 'approved'
    || selectedTimerTask?.workClosedAt || selectedTimerTask?.status === 'done');
  const filteredEntries=useMemo(()=>entries.filter(e=>(!e.projectId||operationalProjectIds.has(e.projectId))&&(filterCompany==='all'||e.companyId===filterCompany)&&(filterSource==='all'||e.sourceType===filterSource)),[entries,filterCompany,filterSource,operationalProjectIds]);
  const totalMinutes=filteredEntries.reduce((a,e)=>a+e.minutes,0); const timerMinutes=filteredEntries.filter(e=>e.sourceType==='timer').reduce((a,e)=>a+e.minutes,0); const manualMinutesTotal=filteredEntries.filter(e=>e.sourceType==='manual').reduce((a,e)=>a+e.minutes,0); const interactionMinutesTotal=filteredEntries.filter(e=>e.sourceType==='interaction'||e.sourceType==='calendar').reduce((a,e)=>a+e.minutes,0); const manualDuration=calculateRangeMinutes(manualStart,manualEnd);
  const usageRows=useMemo(()=>companies.map(company=>{
    const registered=staff?(staffUsage[company.id]||0):entries.filter(e=>e.companyId===company.id&&(!e.projectId||operationalProjectIds.has(e.projectId))).reduce((a,e)=>a+e.minutes,0); const live=activeTimers.filter(t=>t.companyId===company.id&&(!t.projectId||operationalProjectIds.has(t.projectId))).reduce((a,t)=>a+Math.floor(timerSeconds(t,nowMs)/60),0); const cycle=cycles.find(c=>c.companyId===company.id); const contracted=Math.round(Number(cycle?.contractedHours??company.monthlyHours??0)*60); const consumed=registered+live; return {company,registered,live,consumed,contracted,percent:contracted>0?consumed/contracted*100:null,remaining:Math.max(0,contracted-consumed)};
  }).sort((a,b)=>(b.percent??-1)-(a.percent??-1)),[companies,entries,activeTimers,cycles,nowMs,operationalProjectIds,staffUsage]);

  function resetTimerContext(companyId=timerCompanyId){setTimerCompanyId(companyId);setTimerProjectId('');setTimerDeliverableId('');setTimerTaskId('');setTimerDescription('');}
  async function startTimer(){
    if(staff){ if(!hoursAvailable||!timerCompanyId)return; if(openCompanyIds.has(timerCompanyId)){setError('Você já tem um cronômetro ligado nesta empresa. Pare o atual antes de iniciar outro.');return;} setSaving(true);setError(''); try{const description=timerDescription.trim()||selectedTimerTask?.title||selectedTimerDeliverable?.title||'Atuação CALI'; const result=await startPartnerTimer({p_company_id:timerCompanyId,p_project_id:timerProjectId||null,p_deliverable_id:timerDeliverableId||null,p_task_id:timerTaskId||null,p_category:timerCategory,p_description:description}); if(result.error)throw result.error; setNotice(`Cronômetro iniciado para ${companyMap.get(timerCompanyId)?.name||'a empresa'}.`); resetTimerContext(''); await load();}catch(e){setError(errorMessage(e, 'Não foi possível iniciar o cronômetro.'));}finally{setSaving(false);} return; }
    if(!hoursAvailable||!timerCompanyId||!timerProjectId||!timerDeliverableId||timerTargetClosed)return; if(openCompanyIds.has(timerCompanyId)){setError('Esta empresa já possui um timer aberto. Encerre ou pause o trabalho atual antes de iniciar outra tarefa nela.');return;} setSaving(true);setError('');
    try{const description=timerDescription.trim()||selectedTimerTask?.title||selectedTimerDeliverable?.title||'Atuação CALI'; const result=await startAdminTimer({p_company_id:timerCompanyId,p_project_id:timerProjectId,p_deliverable_id:timerDeliverableId,p_task_id:timerTaskId||null,p_category:timerCategory,p_description:description,p_client_visible:timerClientVisible}); if(result.error)throw result.error; setNotice(`Timer iniciado para ${companyMap.get(timerCompanyId)?.name||'a empresa'}.`); resetTimerContext(''); await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar o timer.');}finally{setSaving(false);}
  }
  async function pauseTimer(timer:TimerRow){if(!hoursAvailable)return;setSaving(true);try{const r=await pauseWorkTimer(timer.id);if(r.error)throw r.error;setNotice('Timer pausado.');await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível pausar o timer.');}finally{setSaving(false);}}
  async function resumeTimer(timer:TimerRow){if(!hoursAvailable)return;setSaving(true);try{const r=await resumeWorkTimer(timer.id);if(r.error)throw r.error;setNotice('Timer retomado.');await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível retomar o timer.');}finally{setSaving(false);}}
  async function stopTimer(timer: TimerRow) {
    if (!hoursAvailable) return;
    if (!staff && timer.status === 'active') {
      const deliverable = timer.deliverableId ? deliverableMap.get(timer.deliverableId) : null;
      const task = timer.taskId ? taskMap.get(timer.taskId) : null;
      setFinalization({ timer, step: 1, target: {
        id: timer.taskId || timer.deliverableId || timer.id,
        label: task?.title || deliverable?.title || timer.description || 'esta atuação',
        kind: timer.taskId ? 'task' : 'deliverable',
        clientApproved: deliverable?.status === 'approved',
      } });
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (staff) {
        const result = await stopPartnerTimer(timer.id, timer.description || null);
        if (result.error) throw result.error;
        setNotice(result.data?.discarded ? 'Sessão com menos de 30 segundos: não foi registrada.' : `Sessão de ${formatMinutes(Number(result.data?.minutes || 0))} enviada para aprovação da Patrícia.`);
      } else {
        const result = await stopWorkTimer(timer.id, timer.description || null);
        if (result.error) throw result.error;
        setNotice(`${formatMinutes(Number(result.data || 0))} registrados para ${companyMap.get(timer.companyId)?.name || 'a empresa'}.`);
      }
      await load();
    } catch (error) {
      setError(errorMessage(error, 'Não foi possível encerrar o cronômetro.'));
    } finally {
      setSaving(false);
    }
  }

  function openAuditAction(kind: 'edit' | 'delete', entry: Entry) {
    setAuditAction({ kind, entry: { ...entry, category: entry.category || 'Outros' } });
  }

  async function confirmFinalization() {
    if (!finalization || finishTimer.isPending) return;
    try {
      const { timer, target } = finalization;
      await finishTimer.mutateAsync({ ...timer, description: timer.description || target.label });
      setFinalization(null);
    } catch {
      // O diálogo mantém a seleção e exibe o erro para nova tentativa.
    }
  }

  async function staffSubmitHours(payload:{company:string;project?:string|null;deliverable?:string|null;date:string;minutes:number;description:string;justification:string;category:string}){ if(!hoursAvailable)return false; const r=await submitPartnerHours({company_id:payload.company,project_id:payload.project||null,deliverable_id:payload.deliverable||null,work_date:payload.date,minutes:payload.minutes,description:payload.description,justification:payload.justification,category:payload.category}); if(r.error){setError('Não foi possível enviar o lançamento. Confira os campos e tente de novo.');return false;} return true; }
  async function staffSaveEdit(event:FormEvent){ event.preventDefault(); if(!hoursAvailable||!staffEdit)return; setError('');
    const withTimes=Boolean(staffEdit.start&&staffEdit.end); const startIso=`${staffEdit.date}T${staffEdit.start||'00:00'}:00-03:00`; const endIso=`${staffEdit.date}T${staffEdit.end||'00:00'}:00-03:00`;
    const minutes=withTimes?Math.ceil((new Date(endIso).getTime()-new Date(startIso).getTime())/60000):Math.round(Number(staffEdit.minutes));
    if(!(minutes>0&&minutes<=1440)){ setError(withTimes?'O fim precisa ser depois do início, no mesmo dia.':'Informe uma duração entre 1 minuto e 24 horas.'); return; }
    setSaving(true); let failure: { message: string } | null = null;
    if(staffEdit.kind==='submission') failure=(await editPartnerSubmission({p_id:staffEdit.id,p_work_date:staffEdit.date,p_minutes:minutes,p_description:staffEdit.description,p_reason:staffEdit.reason})).error;
    else if(staff) failure=(await editPartnerHourEntry({p_id:staffEdit.id,p_started_at:startIso,p_ended_at:endIso,p_description:staffEdit.description,p_reason:staffEdit.reason})).error;
    else {
      const before = entries.find((entry) => entry.id === staffEdit.id);
      const result = await editAdminHourEntry(staffEdit.id, {
        work_date: staffEdit.date, minutes, description: staffEdit.description.trim(),
        ...(withTimes ? { started_at: startIso, ended_at: endIso } : {}),
      }, before, staffEdit.reason);
      failure = result.error;
    }
    setSaving(false); if(failure){setError(failure.message||'Não foi possível salvar a edição.');return;} setStaffEdit(null); setNotice(staff?'Lançamento editado. O motivo ficou registrado.':'Lançamento editado e registrado na Auditoria.'); await load(); }
  async function saveManual(event:FormEvent){event.preventDefault();if(staff){ if(!manualCompanyId||!manualDuration||!manualDescription.trim()||manualJustification.trim().length<10){setError('Preencha cliente, horário, descrição e a justificativa (pelo menos 10 caracteres).');return;} setSaving(true);setError(''); const ok=await staffSubmitHours({company:manualCompanyId,project:manualProjectId||null,deliverable:manualDeliverableId||null,date:manualDate,minutes:manualDuration,description:manualDescription.trim(),justification:`${manualJustification.trim()} (das ${manualStart} às ${manualEnd})`,category:manualCategory}); setSaving(false); if(ok){setNotice(`Lançamento de ${formatMinutes(manualDuration)} enviado para a Patricia aprovar.`);setManualStart('');setManualEnd('');setManualTaskId('');setManualDescription('');setManualJustification('');setManualOpen(false);await load();} return; }if(!hoursAvailable||!manualCompanyId||!manualProjectId||!manualDeliverableId||!manualDuration||!manualDescription.trim()||!manualJustification.trim()){setError('Preencha cliente, projeto, entregável, horário, descrição e justificativa.');return;}setSaving(true);setError('');try{const startedAt=`${manualDate}T${manualStart}:00`;const endedAt=`${manualDate}T${manualEnd}:00`;const r=await addManualHourEntry({p_company_id:manualCompanyId,p_project_id:manualProjectId,p_deliverable_id:manualDeliverableId,p_task_id:manualTaskId||null,p_work_date:manualDate,p_minutes:manualDuration,p_description:manualDescription.trim(),p_category:manualCategory,p_internal_note:manualJustification.trim(),p_client_visible:manualClientVisible,p_started_at:startedAt,p_ended_at:endedAt});if(r.error)throw r.error;setNotice(`Lançamento manual salvo: ${formatMinutes(manualDuration)}.`);setManualStart('');setManualEnd('');setManualTaskId('');setManualDescription('');setManualJustification('');setManualOpen(false);await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o lançamento manual.');}finally{setSaving(false);}}
  async function saveInteraction(event:FormEvent){event.preventDefault();if(staff){ if(!interactionCompanyId||!interactionDescription.trim()||Number(interactionMinutes)<=0){setError('Preencha empresa, duração e descrição da interação.');return;} setSaving(true);setError(''); const dl=interactionDeliverableId?deliverableMap.get(interactionDeliverableId):null; const ok=await staffSubmitHours({company:interactionCompanyId,project:dl?.projectId||null,deliverable:interactionDeliverableId||null,date:interactionDate,minutes:Math.max(1,Math.round(Number(interactionMinutes))),description:`${interactionChannel}: ${interactionDescription.trim()}`,justification:`Interação externa via ${interactionChannel}, sem cronômetro.`,category:interactionChannel==='Reunião'||interactionChannel==='Visita presencial'?'Reuniões e alinhamentos':'Comunicação e follow-up'}); setSaving(false); if(ok){setNotice(`Interação via ${interactionChannel} enviada para a Patricia aprovar.`);setInteractionDescription('');setInteractionMinutes('15');setInteractionDeliverableId('');setInteractionOpen(false);await load();} return; }if(!hoursAvailable||!interactionCompanyId||!interactionDescription.trim()||Number(interactionMinutes)<=0){setError('Preencha empresa, duração e descrição da interação.');return;}setSaving(true);setError('');try{const deliverable=interactionDeliverableId?deliverableMap.get(interactionDeliverableId):null;const minutes=Math.max(1,Math.round(Number(interactionMinutes)));const category=interactionChannel==='Reunião'||interactionChannel==='Visita presencial'?'Reuniões e alinhamentos':'Comunicação e follow-up';const r=await addExternalInteraction({company_id:interactionCompanyId,project_id:deliverable?.projectId||null,deliverable_id:interactionDeliverableId||null,work_date:interactionDate,minutes,description:`${interactionChannel}: ${interactionDescription.trim()}`,category,client_visible:interactionClientVisible});if(r.error)throw r.error;setNotice(`Interação via ${interactionChannel} registrada.`);setInteractionDescription('');setInteractionMinutes('15');setInteractionDeliverableId('');setInteractionOpen(false);await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a interação.');}finally{setSaving(false);}}

  if(loading)return <HoursFrame staff={Boolean(staff)}><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando extrato…</section></HoursFrame>;
  async function toggleClientHours(company: Company) {
    if (!hoursAvailable || saving) return;
    setPendingVisibility({company, enabled:!company.showHoursToClient});
  }
  async function confirmClientHoursVisibility(){
    if (!hoursAvailable || !pendingVisibility || saving) return;
    const {company,enabled:next}=pendingVisibility; const selectedMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(period + '-01T12:00:00'));
    setPendingVisibility(null); setSaving(true); setError(''); setNotice('');
    try {
      await setHoursVisibility(company.id, period + '-01', next);
      setCompanies((current) => current.map((item) => item.id === company.id ? { ...item, showHoursToClient: next } : item));
      setNotice(company.name + ': visualização de horas atualizada a partir de ' + selectedMonth + '.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar a visibilidade das horas.');
    } finally { setSaving(false); }
  }


  const contractedTotal=usageRows.reduce((sum,row)=>sum+(row.contracted||0),0),consumedTotal=usageRows.reduce((sum,row)=>sum+row.consumed,0);
  /* Consumo por cliente pensado para dezenas de contas: cartões compactos, ordenados pelo maior uso, com busca,
     filtro de atenção e os oito primeiros visíveis até pedir todos. */
  const usageWanted=usageQuery.trim().toLocaleLowerCase('pt-BR');
  const usageSorted=[...usageRows].sort((a,b)=>(b.percent??-1)-(a.percent??-1)).filter(row=>(!usageWanted||row.company.name.toLocaleLowerCase('pt-BR').includes(usageWanted))&&(!usageAttention||(row.percent??0)>=80));
  const usageShown=usageAll||usageWanted?usageSorted:usageSorted.slice(0,8);
  const openTimerDialog=()=>{const free=companies.find(c=>!openCompanyIds.has(c.id));resetTimerContext(free?.id||'');setTimerOpen(true);};

  return <HoursFrame staff={Boolean(staff)}><WorkspaceAdminPage className={`tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45 ${staff?'tw:[&_[hidden]]:hidden!':''}`}><WorkspaceAdminContent className="hours-connect hours-multi-v3">
    <WorkspacePageHeader eyebrow={staff ? 'EQUIPE CALI / HORAS' : 'BACKOFFICE / CALI RH'} title={staff ? 'Horas' : 'Horas e contratos'} description={staff ? 'Consumo das empresas e os seus lançamentos.' : 'Consumo contratual e registros de atuação por conta e período.'} actionClassName="hours-v13-header-actions">
      <label className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2.5 tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#e5d9d1] tw:bg-white tw:px-3.5 tw:py-2 tw:font-bold tw:text-cali-brand"><CalendarDays size={14}/><input className="tw:border-0 tw:bg-transparent tw:font-semibold tw:text-[#603144] tw:outline-none" type="month" aria-label="Mês de referência" value={period} onChange={e=>setPeriod(e.target.value)}/></label><Button variant="adminOutline" type="button" onClick={()=>setManualOpen(true)}><PenSquare size={14}/> Lançamento manual</Button><Button variant="adminOutline" type="button" onClick={()=>setInteractionOpen(true)}><MessageSquareText size={14}/> Interação externa</Button><Button variant="adminPrimary" type="button" onClick={openTimerDialog} disabled={!companies.some(c=>!openCompanyIds.has(c.id))}><Play size={14}/> Iniciar timer</Button>
    </WorkspacePageHeader>

    <WorkspaceMetricGrid columns={3} metrics={[
      { label: 'Capacidade contratada', value: contractedTotal ? formatMinutes(contractedTotal) : '—', helper: 'Somatório das contas', tone: 'green' },
      { label: 'Utilizadas', value: formatMinutes(consumedTotal), helper: 'Registros do período', tone: 'blue' },
      { label: 'Disponíveis', value: contractedTotal ? formatMinutes(Math.max(0, contractedTotal - consumedTotal)) : '—', helper: 'Saldo contratual', tone: 'amber' },
    ]} />

    {activeTimers.length>0&&<WorkspaceAdminPanel><WorkspaceAdminPanelHeader><h2>Em andamento</h2><span>{activeTimers.length} {activeTimers.length===1?'timer ativo':'timers ativos'} · 1 por empresa</span></WorkspaceAdminPanelHeader><div className="tw:flex tw:flex-col">{activeTimers.map(timer=>{const company=companyMap.get(timer.companyId);const project=timer.projectId?projectMap.get(timer.projectId):null;const deliverable=timer.deliverableId?deliverableMap.get(timer.deliverableId):null;const task=timer.taskId?taskMap.get(timer.taskId):null;return <article key={timer.id} className="tw:grid tw:grid-cols-[auto_minmax(0,1fr)_auto_auto] tw:items-center tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-[#f0e8e1] tw:px-0.5 tw:py-4 tw:[@media(max-width:56.25rem)]:grid-cols-[auto_minmax(0,1fr)_auto]" data-work-timer-id={timer.id}><HoursCompanyLogo name={company?.name || 'Cliente'} logoUrl={company?.logoUrl} logoFallbackUrl={company?.logoFallbackUrl} /><div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1"><span className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">{company?.name||'Cliente'}</span><strong className="tw:text-[.923rem] tw:leading-[inherit]">{task?.title||deliverable?.title||timer.description||'Atuação CALI'}</strong><small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">{project?.name||'Projeto'}{deliverable&&task?` · ${deliverable.title}`:''} · {timer.category||'Atuação'}</small></div><div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1"><strong className="tw:text-[1.077rem] tw:leading-[inherit] tw:text-cali-brand">{timerLabel(timerSeconds(timer,nowMs))}</strong><small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">{timer.status==='paused'?'pausado':'registrando'}</small></div><div className="tw:flex tw:gap-2.5 tw:[@media(max-width:35rem)]:col-span-full">{staff?null:timer.status==='paused'?<HoursActionButton type="button" onClick={()=>void resumeTimer(timer)} disabled={saving}><Play size={15}/>Retomar</HoursActionButton>:<HoursActionButton type="button" onClick={()=>void pauseTimer(timer)} disabled={saving}><Pause size={15}/>Pausar</HoursActionButton>}<HoursActionButton primary type="button" onClick={()=>void stopTimer(timer)} disabled={saving}>{staff?<><Pause size={15}/>Pausar</>:<><Square size={15}/>Encerrar</>}</HoursActionButton></div></article>;})}</div></WorkspaceAdminPanel>}

    {!staff&&<CapacityPanel month={period} companies={companies.map((c)=>({id:c.id,name:c.name}))} onNotice={setNotice}/>}
    <HoursUsageSection
      rows={usageShown}
      count={usageRows.length}
      query={usageQuery}
      onQuery={setUsageQuery}
      attention={usageAttention}
      onAttention={() => setUsageAttention((value) => !value)}
      pagination={usageSorted.length > 8 && (usageAll || !usageWanted) ? {
        text: usageAll ? 'Mostrar só as 8 com maior uso' : `Ver todas as ${usageSorted.length} contas`,
        toggle: () => setUsageAll((value) => !value),
      } : undefined}
      onVisibility={staff ? undefined : (company) => void toggleClientHours(company)}
      saving={saving}
    />

    <WorkspaceAdminPanel><WorkspaceAdminPanelHeader className="tw:flex-wrap"><div className="tw:flex tw:min-w-[min(100%,18.46rem)] tw:flex-1 tw:flex-col tw:gap-1"><h2>Registros de atuação</h2><span>{formatMinutes(totalMinutes)} no período · {formatMinutes(timerMinutes)} timer · {formatMinutes(manualMinutesTotal)} manual · {formatMinutes(interactionMinutesTotal)} interações</span></div><HoursActionButton type="button" onClick={()=>downloadCsv(filteredEntries,companyMap,projectMap,deliverableMap,taskMap,period)}><Download size={14}/>Exportar</HoursActionButton>{!staff && <HoursActionButton type="button" className="tw:order-3 tw:ml-auto" onClick={() => setAuditOpen(true)}>Auditoria</HoursActionButton>}</WorkspaceAdminPanelHeader><div className="tw:my-4 tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:text-[#978980] tw:[&>select]:rounded-lg tw:[&>select]:border tw:[&>select]:border-solid tw:[&>select]:border-[#e7ddd5] tw:[&>select]:bg-white tw:[&>select]:px-3 tw:[&>select]:py-2.5 tw:[&>select]:text-[.846rem] tw:[&>select]:text-[#67574c]"><Filter size={18}/><select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}><option value="all">Todos os clientes</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={filterSource} onChange={e=>setFilterSource(e.target.value)}><option value="all">Todos os tipos</option><option value="timer">Timer</option><option value="manual">Manual</option><option value="interaction">Interação</option><option value="calendar">Calendário</option></select>{(filterCompany!=='all'||filterSource!=='all')&&<button className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-[.846rem] tw:leading-[inherit] tw:text-[#6b293e]" type="button" onClick={()=>{setFilterCompany('all');setFilterSource('all');}}>Limpar</button>}</div>
      {loading?<LoadingState><Loader2 className="spin" size={20}/>Carregando extrato…</LoadingState>:filteredEntries.length===0?<div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:px-4 tw:py-10 tw:text-[.923rem] tw:leading-[inherit] tw:text-[#978980]"><Clock3 size={24}/><strong>Nenhum lançamento no período</strong><p className="tw:m-0 tw:text-[.846rem] tw:leading-[inherit]">Registre uma atuação ou ajuste o mês.</p></div>:<div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-[#e9dfd8] tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden"><table data-hours-entries="" className="tw:w-full tw:min-w-[80rem] tw:table-auto tw:border-collapse tw:text-[.846rem] tw:leading-[inherit] tw:[&_th]:bg-[#faf7f4] tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_th]:text-left tw:[&_th]:text-[.69rem] tw:[&_th]:font-extrabold tw:[&_th]:tracking-[.045em] tw:[&_th]:whitespace-nowrap tw:[&_th]:text-[#988980] tw:[&_th]:uppercase tw:[&_td]:border-0 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-[#f0e8e1] tw:[&_td]:px-4 tw:[&_td]:py-4 tw:[&_td]:align-middle tw:[&_td]:whitespace-nowrap tw:[&_td]:text-[#554744]"><thead><tr><th className="tw:w-8 tw:text-[#8a4b60]!"/><th>Cliente</th><th>Contrato</th><th>Data</th><th>Contexto</th><th>Início</th><th>Fim</th><th className="tw:text-right!">Total</th><th>Tipo</th><th>Atividade</th><th className="tw:text-right!"/>{!staff && <th scope="col" className="tw:w-[5.5rem] tw:text-center!">Ações</th>}</tr></thead><tbody>{filteredEntries.slice(0,entryLimit).map(entry=>{const open=expandedId===entry.id;const hasDetail=Boolean(entry.description||entry.internalNote||entry.staffNote);const company=companyMap.get(entry.companyId);const project=entry.projectId?projectMap.get(entry.projectId):null;const deliverable=entry.deliverableId?deliverableMap.get(entry.deliverableId):null;const task=entry.taskId?taskMap.get(entry.taskId):null;const canEdit=staff?(entry.staffStatus?entry.staffStatus==='pending':true):true;const plan=company?.servicePlan?`CALI ${company.servicePlan.charAt(0).toUpperCase()}${company.servicePlan.slice(1)}`:'—';const localTime=(value?:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value)):'';
return <Fragment key={entry.id}><tr data-hour-entry-id={entry.id} className={`${hasDetail ? 'tw:cursor-pointer' : ''} ${entry.staffStatus === 'pending' ? 'tw:[&>td]:bg-[#fffaf0]' : ''}`} onClick={()=>hasDetail&&setExpandedId(open?null:entry.id)}><td className="tw:w-8 tw:text-[#8a4b60]!">{hasDetail?(open?<ChevronDown size={16}/>:<ChevronRight size={16}/>):null}</td><td><strong>{company?.name||'Cliente'}</strong></td><td>{plan}</td><td>{dateLabel(entry.workDate)}</td><td className="tw:min-w-[14.615rem] tw:whitespace-normal!"><span className="tw:flex tw:flex-col tw:gap-1"><strong>{deliverable?.title||project?.name||'Atuação geral'}</strong><small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">{task?`Subtarefa: ${task.title}`:deliverable?(project?.name||''):(project?'Projeto':'Sem projeto específico')}</small></span></td><td>{timeLabel(entry.startedAt)}</td><td>{timeLabel(entry.endedAt)}</td><td className="tw:text-right!"><strong>{formatMinutes(entry.minutes)}</strong></td><td><HourSourceBadge source={entry.sourceType} /></td><td>{entry.category||'Outros'}</td><td className="tw:text-right tw:[&>*]:ml-3 tw:[&>*]:align-middle">{entry.staffStatus&&entry.staffStatus!=='approved'&&<span className={`tw:inline-flex tw:items-center tw:gap-2 tw:text-[.77rem] tw:leading-[inherit] tw:font-bold ${entry.staffStatus === 'pending' ? 'tw:text-[#8a5a12]' : 'tw:text-[#a03535]'}`}><span className={`tw:size-2.5 tw:flex-none tw:rounded-full ${entry.staffStatus === 'pending' ? 'tw:bg-[#d98a2b]' : 'tw:bg-[#c94a4a]'}`} />{entry.staffStatus==='pending'?'Aguardando aprovação':'Recusado'}</span>}{canEdit&&<button type="button" className="tw:inline-flex tw:h-[2.31rem] tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-bold tw:text-cali-brand" onClick={(e)=>{e.stopPropagation();setStaffEdit({id:entry.id,kind:entry.staffStatus?'submission':'entry',date:entry.workDate,start:localTime(entry.startedAt),end:localTime(entry.endedAt),minutes:String(entry.minutes),description:entry.description,reason:''});}}><PenSquare size={13}/> Editar</button>}</td>{!staff && <td className="tw:whitespace-nowrap tw:text-center!">
          <button type="button" aria-label="Editar lançamento" title="Editar lançamento" onClick={(event) => { event.stopPropagation(); openAuditAction('edit', entry); }} className="tw:mx-0.5 tw:inline-grid tw:size-[2.125rem] tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-accent tw:hover:bg-cali-canvas"><Pencil size={15} aria-hidden="true" /></button>
          <button type="button" aria-label="Excluir lançamento" title="Excluir lançamento" onClick={(event) => { event.stopPropagation(); openAuditAction('delete', entry); }} className="tw:mx-0.5 tw:inline-grid tw:size-[2.125rem] tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-danger tw:hover:bg-cali-canvas"><Trash2 size={15} aria-hidden="true" /></button>
        </td>}</tr>{open&&<tr><td className="tw:bg-[#fbf7f4] tw:whitespace-normal!" colSpan={staff ? 11 : 12}><div className="tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,15.385rem),1fr))] tw:gap-4 tw:[&>span:not([hidden])]:flex tw:[&>span]:flex-col tw:[&>span]:gap-1 tw:[&_strong]:text-[.69rem] tw:[&_strong]:tracking-[.05em] tw:[&_strong]:text-[#a39790] tw:[&_strong]:uppercase"><span><strong>Descrição</strong>{entry.description}</span>{entry.internalNote&&<span className="internal"><strong>{entry.staffStatus?'Justificativa':'Nota interna'}</strong>{entry.internalNote}</span>}{entry.staffNote&&<span className="internal"><strong>Resposta da Patricia</strong>{entry.staffNote}</span>}<span hidden={Boolean(staff)}><strong>Extrato do cliente</strong>{entry.clientVisible?'Aparece para o cliente':'Não aparece para o cliente'}</span></div></td></tr>}</Fragment>;})}</tbody></table></div>}{!loading&&filteredEntries.length>entryLimit&&<HoursMoreButton onClick={() => setEntryLimit((value) => value + 30)}>Mostrar mais registros ({filteredEntries.length - entryLimit} restantes)</HoursMoreButton>}
    </WorkspaceAdminPanel>

    {timerOpen && <WorkspaceDialogOverlay>
      <WorkspaceFormDialogFrame aria-label="Iniciar timer" id="novo-timer">
        <WorkspaceFormDialogHeader
          kicker="HORAS / TIMER"
          title="Iniciar nova atuação"
          description="Empresas que já têm timer aberto ficam bloqueadas aqui."
          onClose={() => setTimerOpen(false)}
        />
        <WorkspaceFormDialogBody>
          <div className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.385rem] tw:gap-y-4">
      <HoursField><span>Cliente</span><select value={timerCompanyId} onChange={e=>resetTimerContext(e.target.value)}><option value="">Selecione</option>{companies.map(c=><option key={c.id} value={c.id} disabled={openCompanyIds.has(c.id)}>{c.name}{openCompanyIds.has(c.id)?' · timer ativo':''}</option>)}</select></HoursField>
      <HoursField><span>Projeto</span><select value={timerProjectId} disabled={!timerCompanyId} onChange={e=>{setTimerProjectId(e.target.value);setTimerDeliverableId('');setTimerTaskId('');}}><option value="">Selecione</option>{timerProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></HoursField>
      <HoursField><span>Entregável</span><select value={timerDeliverableId} disabled={!timerProjectId} onChange={e=>{setTimerDeliverableId(e.target.value);setTimerTaskId('');}}><option value="">Selecione</option>{timerDeliverables.map(d=><option key={d.id} value={d.id} disabled={!staff && Boolean(d.workClosedAt || d.status === 'approved')} hidden={!staff && Boolean(d.workClosedAt || d.status === 'approved')}>{d.title}</option>)}</select></HoursField>
      <HoursField><span>Subtarefa <em>(se houver)</em></span><select value={timerTaskId} disabled={!timerDeliverableId||timerTasks.length===0} onChange={e=>setTimerTaskId(e.target.value)}><option value="">{timerTasks.length?'Entregável geral':'Sem subtarefas cadastradas'}</option>{timerTasks.map(t=><option key={t.id} value={t.id} disabled={!staff && Boolean(t.workClosedAt || t.status === 'done')} hidden={!staff && Boolean(t.workClosedAt || t.status === 'done')}>{t.title}</option>)}</select></HoursField>
      <HoursField><span>Natureza</span><select value={timerCategory} onChange={e=>setTimerCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></HoursField>
      <HoursField wide><span>Descrição <em>(opcional)</em></span><input value={timerDescription} onChange={e=>setTimerDescription(e.target.value)} placeholder="Se vazio, usamos o nome da subtarefa ou entregável."/></HoursField>
    </div><div className="tw:mt-5 tw:flex tw:items-center tw:justify-between tw:gap-3">{!staff && <HoursClientVisibility value={timerClientVisible} onChange={setTimerClientVisible} />}<HoursActionButton primary type="button" onClick={()=>{void startTimer();setTimerOpen(false);}} disabled={saving||timerTargetClosed||!timerCompanyId||(!staff&&(!timerProjectId||!timerDeliverableId))||openCompanyIds.has(timerCompanyId)}><Play size={16}/>Iniciar</HoursActionButton></div>
        </WorkspaceFormDialogBody>
      </WorkspaceFormDialogFrame>
    </WorkspaceDialogOverlay>}

    {manualOpen && <WorkspaceDialogOverlay>
      <WorkspaceFormDialogFrame aria-label="Lançamento manual">
        <WorkspaceFormDialogHeader
          kicker="HORAS / LANÇAMENTO MANUAL"
          title="Registrar horas manualmente"
          description="Exige justificativa interna."
          onClose={() => setManualOpen(false)}
        />
        <WorkspaceFormDialogBody>
          <form className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.385rem] tw:gap-y-4" onSubmit={saveManual}>
      <HoursField><span>Data *</span><input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)}/></HoursField><HoursField><span>Cliente *</span><select value={manualCompanyId} onChange={e=>{setManualCompanyId(e.target.value);setManualProjectId('');setManualDeliverableId('');setManualTaskId('');}}><option value="">Selecione</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></HoursField><HoursField><span>Projeto *</span><select value={manualProjectId} disabled={!manualCompanyId} onChange={e=>{setManualProjectId(e.target.value);setManualDeliverableId('');setManualTaskId('');}}><option value="">Selecione</option>{manualProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></HoursField><HoursField><span>Entregável *</span><select value={manualDeliverableId} disabled={!manualProjectId} onChange={e=>{setManualDeliverableId(e.target.value);setManualTaskId('');}}><option value="">Selecione</option>{manualDeliverables.map(d=><option key={d.id} value={d.id} disabled={!staff && Boolean(d.workClosedAt || d.status === 'approved')} hidden={!staff && Boolean(d.workClosedAt || d.status === 'approved')}>{d.title}</option>)}</select></HoursField><HoursField><span>Subtarefa</span><select value={manualTaskId} disabled={!manualDeliverableId||manualTasks.length===0} onChange={e=>setManualTaskId(e.target.value)}><option value="">{manualTasks.length?'Entregável geral':'Sem subtarefas'}</option>{manualTasks.map(t=><option key={t.id} value={t.id} disabled={!staff && Boolean(t.workClosedAt || t.status === 'done')} hidden={!staff && Boolean(t.workClosedAt || t.status === 'done')}>{t.title}</option>)}</select></HoursField><HoursField><span>Natureza</span><select value={manualCategory} onChange={e=>setManualCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></HoursField><HoursField><span>Hora início *</span><input type="time" value={manualStart} onChange={e=>setManualStart(e.target.value)}/></HoursField><HoursField><span>Hora fim *</span><input type="time" value={manualEnd} onChange={e=>setManualEnd(e.target.value)}/>{manualStart&&manualEnd&&<small role={manualDuration ? undefined : 'alert'} className={manualDuration ? undefined : 'tw:text-[#b7495d]'}>{manualDuration?`Duração: ${formatMinutes(manualDuration)}`:'Fim deve ser maior que início.'}</small>}</HoursField><HoursField wide><span>Descrição do trabalho *</span><textarea rows={3} value={manualDescription} onChange={e=>setManualDescription(e.target.value)} placeholder="O que foi realizado?"/></HoursField><HoursField wide><span>Justificativa do lançamento manual * <em>(interna)</em></span><textarea rows={3} value={manualJustification} onChange={e=>setManualJustification(e.target.value)} placeholder="Por que este registro não veio do timer?"/></HoursField>{!staff && <HoursClientVisibility value={manualClientVisible} onChange={setManualClientVisible} />}<div className="tw:col-span-full tw:mt-1 tw:flex tw:items-center tw:justify-end tw:gap-3"><HoursActionButton type="button" onClick={()=>setManualOpen(false)}>Cancelar</HoursActionButton><HoursActionButton primary type="submit" disabled={saving}>Salvar lançamento</HoursActionButton></div>
    </form>
        </WorkspaceFormDialogBody>
      </WorkspaceFormDialogFrame>
    </WorkspaceDialogOverlay>}

    {interactionOpen && <WorkspaceDialogOverlay>
      <WorkspaceFormDialogFrame aria-label="Interação externa">
        <WorkspaceFormDialogHeader
          kicker="HORAS / INTERAÇÃO EXTERNA"
          title="Registrar interação"
          description="WhatsApp, e-mail, ligação, reunião ou visita."
          onClose={() => setInteractionOpen(false)}
        />
        <WorkspaceFormDialogBody>
          <form className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.385rem] tw:gap-y-4" onSubmit={saveInteraction}><div className="tw:col-span-full tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:text-[.846rem] tw:font-bold tw:text-[#322f2c]"><span>Canal *</span><div className="tw:flex tw:flex-wrap tw:gap-2">{channels.map(c=><button key={c} type="button" aria-pressed={interactionChannel === c} className={`tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-2.5 tw:text-[.77rem] tw:leading-[inherit] ${interactionChannel === c ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#e8dbd1] tw:bg-white tw:text-[#86766b]'}`} onClick={()=>setInteractionChannel(c)}>{c}</button>)}</div></div><HoursField><span>Data *</span><input type="date" value={interactionDate} onChange={e=>setInteractionDate(e.target.value)}/></HoursField><HoursField><span>Cliente *</span><select value={interactionCompanyId} onChange={e=>{setInteractionCompanyId(e.target.value);setInteractionDeliverableId('');}}><option value="">Selecione</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></HoursField><HoursField><span>Duração estimada (min) *</span><input type="number" min="1" step="1" value={interactionMinutes} onChange={e=>setInteractionMinutes(e.target.value)}/></HoursField><HoursField><span>Entregável relacionado</span><select value={interactionDeliverableId} disabled={!interactionCompanyId} onChange={e=>setInteractionDeliverableId(e.target.value)}><option value="">Sem entregável específico</option>{interactionDeliverables.map(d=><option key={d.id} value={d.id} disabled={!staff && Boolean(d.workClosedAt || d.status === 'approved')} hidden={!staff && Boolean(d.workClosedAt || d.status === 'approved')}>{projectMap.get(d.projectId||'')?.name||'Projeto'} — {d.title}</option>)}</select></HoursField><HoursField wide><span>Descrição breve *</span><textarea rows={3} value={interactionDescription} onChange={e=>setInteractionDescription(e.target.value)} placeholder="Resumo da interação."/></HoursField>{!staff && <HoursClientVisibility value={interactionClientVisible} onChange={setInteractionClientVisible} />}<div className="tw:col-span-full tw:mt-1 tw:flex tw:items-center tw:justify-end tw:gap-3"><HoursActionButton type="button" onClick={()=>setInteractionOpen(false)}>Cancelar</HoursActionButton><HoursActionButton primary type="submit" disabled={saving}>Registrar interação</HoursActionButton></div></form>
        </WorkspaceFormDialogBody>
      </WorkspaceFormDialogFrame>
    </WorkspaceDialogOverlay>}

    {pendingVisibility&&<WorkspaceDialogOverlay><WorkspaceConfirmDialog aria-labelledby="hours-v14-title"><div><small>VISIBILIDADE PARA CLIENTES</small><h2 id="hours-v14-title">{pendingVisibility.enabled?'Liberar horas para o cliente?':'Desativar visualização deste mês?'}</h2><p>{pendingVisibility.enabled?`Ao liberar, ${pendingVisibility.company.name} poderá acompanhar os registros compartilháveis a partir de ${period}.`:`Ao desativar, ${pendingVisibility.company.name} deixará de ver este mês e os próximos.`}</p><p>O histórico anterior permanece disponível. Somente a visibilidade futura será alterada.</p></div><footer><button type="button" onClick={()=>setPendingVisibility(null)}>Cancelar</button><button type="button" onClick={()=>void confirmClientHoursVisibility()} disabled={saving}>{pendingVisibility.enabled?'Sim, liberar visualização':'Sim, desativar neste mês'}</button></footer></WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
    {staffEdit&&<WorkflowDialogOverlay  onMouseDown={()=>setStaffEdit(null)}><StaffDialogForm compact aria-label="Editar lançamento" onSubmit={staffSaveEdit} onMouseDown={(e)=>e.stopPropagation()}>
      <StaffDialogHeader onClose={() => setStaffEdit(null)}><div><small>{staffEdit.kind==='submission'?'HORAS · AGUARDANDO APROVAÇÃO':'HORAS · LANÇAMENTO'}</small><h2>Editar lançamento</h2></div></StaffDialogHeader>
      <StaffDialogBody><StaffDialogFields columns={staffEdit.kind === 'submission' ? 2 : 3}>{staffEdit.kind==='submission'?<><label>Data<input type="date" value={staffEdit.date} onChange={e=>setStaffEdit({...staffEdit,date:e.target.value})}/></label><label>Duração (minutos)<input type="number" min="1" max="1440" value={staffEdit.minutes} onChange={e=>setStaffEdit({...staffEdit,minutes:e.target.value})}/></label></>:<><label>Data<input type="date" value={staffEdit.date} onChange={e=>setStaffEdit({...staffEdit,date:e.target.value})}/></label><label>Início<input type="time" value={staffEdit.start} onChange={e=>setStaffEdit({...staffEdit,start:e.target.value})}/></label><label>Fim<input type="time" value={staffEdit.end} onChange={e=>setStaffEdit({...staffEdit,end:e.target.value})}/></label>{!(staffEdit.start&&staffEdit.end)&&!staff&&<label>Duração (minutos)<input type="number" min="1" max="1440" value={staffEdit.minutes} onChange={e=>setStaffEdit({...staffEdit,minutes:e.target.value})}/></label>}</>}</StaffDialogFields>
        <StaffDialogFields columns={1}><label>O que foi feito<input value={staffEdit.description} onChange={e=>setStaffEdit({...staffEdit,description:e.target.value})}/></label><label>{staff?'Motivo da edição (fica registrado para a Patricia)':'Motivo da edição (opcional, fica na Auditoria)'}<input value={staffEdit.reason} onChange={e=>setStaffEdit({...staffEdit,reason:e.target.value})} placeholder="Ex.: esqueci o cronômetro ligado no almoço"/></label></StaffDialogFields></StaffDialogBody>
      <StaffDialogFooter><Button type="button" variant="workflowSecondary" onClick={()=>setStaffEdit(null)}>Cancelar</Button><Button type="submit" variant="workflowPrimary" disabled={saving||(Boolean(staff)&&staffEdit.reason.trim().length<5)||(Boolean(staff)&&staffEdit.kind==='entry'&&!(staffEdit.start&&staffEdit.end))}>{saving?'Salvando…':'Salvar edição'}</Button></StaffDialogFooter>
    </StaffDialogForm></WorkflowDialogOverlay>}
    {auditOpen && <HoursAuditDialog formatMinutes={formatMinutes} onClose={() => setAuditOpen(false)} />}
    {auditAction && <AuditedHourEntryDialog {...auditAction} categories={categories} onClose={() => setAuditAction(null)} onSaved={() => {
      setAuditAction(null);
      window.dispatchEvent(new CustomEvent(TIMER_EVENT));
    }} />}
    <TimerFinalizationDialog target={finalization?.target ?? null} step={finalization?.step ?? 1}
      busy={finishTimer.isPending} error={finishTimer.error ? errorMessage(finishTimer.error, 'Não foi possível finalizar o cronômetro.') : undefined}
      onCancel={() => { setFinalization(null); finishTimer.reset(); }}
      onAdvance={() => setFinalization((current) => current && { ...current, step: 2 })}
      onConfirm={() => void confirmFinalization()} />
    {(notice||error)&&<AdminNotice success={!error} role={error?'alert':'status'}>{error?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>} {error||notice}</AdminNotice>}
  </WorkspaceAdminContent></WorkspaceAdminPage></HoursFrame>;
}
