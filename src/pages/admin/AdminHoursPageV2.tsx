import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  Loader2,
  MessageSquareText,
  Pause,
  PenSquare,
  Play,
  Square,
  TimerReset,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type Company = {
  id: string;
  name: string;
  monthlyHours: number;
  servicePlan?: string | null;
};

type Project = {
  id: string;
  companyId: string;
  name: string;
};

type Deliverable = {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  status: string;
};

type Cycle = {
  id: string;
  companyId: string;
  projectId?: string | null;
  contractedHours?: number | null;
};

type SourceType = 'timer' | 'manual' | 'calendar' | 'interaction';

type Entry = {
  id: string;
  companyId: string;
  projectId?: string | null;
  deliverableId?: string | null;
  workDate: string;
  minutes: number;
  description: string;
  category?: string | null;
  sourceType: SourceType;
  clientVisible: boolean;
  internalNote?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
};

type TimerRow = {
  id: string;
  companyId: string;
  projectId?: string | null;
  deliverableId?: string | null;
  cycleId?: string | null;
  userId: string;
  startedAt: string;
  status: 'active' | 'paused';
  pausedAt?: string | null;
  pausedSeconds: number;
  category?: string | null;
  description?: string | null;
};

type Channel = 'WhatsApp' | 'E-mail' | 'Ligação' | 'Reunião' | 'Visita presencial' | 'Outro';

const categories = [
  'Entregáveis',
  'Reuniões e alinhamentos',
  'Análise e consultoria',
  'Documentação',
  'Comunicação e follow-up',
  'Treinamentos / encontros',
  'Outros',
];

const channels: Channel[] = ['WhatsApp', 'E-mail', 'Ligação', 'Reunião', 'Visita presencial', 'Outro'];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextDate = new Date(year, month, 1);
  const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, next };
}

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest}min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${String(rest).padStart(2, '0')}min`;
}

function timerLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
}

function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function timeLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function sourceLabel(source: SourceType) {
  if (source === 'timer') return 'Timer';
  if (source === 'manual') return 'Manual';
  if (source === 'interaction') return 'Interação';
  return 'Calendário';
}

function isTimerWindow(now = new Date()) {
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0) return { allowed: false, reason: 'Timer indisponível aos domingos.' };
  if (hour < 8) return { allowed: false, reason: 'Timer disponível a partir das 08h.' };
  if (hour >= 18) return { allowed: false, reason: 'Horário encerrado. O timer funciona das 08h às 18h.' };
  return { allowed: true, reason: '' };
}

function calculateRangeMinutes(start: string, end: string) {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((value) => !Number.isFinite(value))) return null;
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) return null;
  return endTotal - startTotal;
}

function downloadCsv(rows: Entry[], companies: Map<string, Company>, projects: Map<string, Project>, deliverables: Map<string, Deliverable>, period: string) {
  const headers = ['Data', 'Cliente', 'Projeto', 'Entregável', 'Duração', 'Tipo', 'Natureza', 'Descrição'];
  const lines = rows.map((row) => [
    row.workDate,
    companies.get(row.companyId)?.name || '',
    row.projectId ? projects.get(row.projectId)?.name || '' : '',
    row.deliverableId ? deliverables.get(row.deliverableId)?.title || '' : '',
    formatMinutes(row.minutes),
    sourceLabel(row.sourceType),
    row.category || '',
    row.description,
  ]);
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers, ...lines].map((line) => line.map(quote).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CALI-Horas-${period}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AdminHoursPageV2() {
  const [period, setPeriod] = useState(currentMonth());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerRow | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [timerCompanyId, setTimerCompanyId] = useState('');
  const [timerDeliverableId, setTimerDeliverableId] = useState('');
  const [timerCategory, setTimerCategory] = useState(categories[0]);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualCompanyId, setManualCompanyId] = useState('');
  const [manualDeliverableId, setManualDeliverableId] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualCategory, setManualCategory] = useState(categories[0]);
  const [manualDescription, setManualDescription] = useState('');
  const [manualJustification, setManualJustification] = useState('');

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionChannel, setInteractionChannel] = useState<Channel>('WhatsApp');
  const [interactionDate, setInteractionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [interactionCompanyId, setInteractionCompanyId] = useState('');
  const [interactionDeliverableId, setInteractionDeliverableId] = useState('');
  const [interactionMinutes, setInteractionMinutes] = useState('15');
  const [interactionDescription, setInteractionDescription] = useState('');

  const [filterCompany, setFilterCompany] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [timerWindow, setTimerWindow] = useState(() => isTimerWindow());

  useEffect(() => { void load(); }, [period]);

  useEffect(() => {
    const id = window.setInterval(() => setTimerWindow(isTimerWindow()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      const startedAt = new Date(activeTimer.startedAt).getTime();
      const endAt = activeTimer.status === 'paused' && activeTimer.pausedAt
        ? new Date(activeTimer.pausedAt).getTime()
        : Date.now();
      const seconds = Math.max(0, Math.floor((endAt - startedAt) / 1000) - activeTimer.pausedSeconds);
      setElapsed(seconds);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) return;
    const id = window.setInterval(() => {
      const now = new Date();
      if (now.getHours() >= 18) void stopTimer(true);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { start, next } = monthBounds(period);
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id || '';
      const [companyResult, projectResult, deliverableResult, cycleResult, entryResult, timerResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,monthly_hours_contracted,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('projects').select('id,company_id,name').neq('status', 'cancelled').order('name'),
        supabase.from('deliverables').select('id,company_id,project_id,title,status').neq('status', 'cancelled').order('title'),
        supabase.from('service_cycles').select('id,company_id,project_id,contracted_hours').gte('reference_month', start).lt('reference_month', next),
        supabase.from('hour_entries').select('id,company_id,project_id,deliverable_id,work_date,minutes,description,category,source_type,client_visible,internal_note,started_at,ended_at,created_at').gte('work_date', start).lt('work_date', next).order('work_date', { ascending: false }).order('created_at', { ascending: false }),
        userId
          ? supabase.from('work_timers').select('id,company_id,project_id,deliverable_id,cycle_id,user_id,started_at,status,paused_at,paused_seconds,category,description').in('status', ['active', 'paused']).eq('user_id', userId).order('started_at', { ascending: false }).limit(1)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (projectResult.error) throw projectResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (cycleResult.error) throw cycleResult.error;
      if (entryResult.error) throw entryResult.error;
      if (timerResult.error) throw timerResult.error;

      const nextCompanies: Company[] = (companyResult.data || []).map((row: any) => ({
        id: row.id,
        name: row.display_name,
        monthlyHours: Number(row.monthly_hours_contracted || 0),
        servicePlan: row.service_plan,
      }));
      setCompanies(nextCompanies);
      setProjects((projectResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, name: row.name })));
      setDeliverables((deliverableResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, status: row.status })));
      setCycles((cycleResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, contractedHours: row.contracted_hours === null ? null : Number(row.contracted_hours) })));
      setEntries((entryResult.data || []).map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        workDate: row.work_date,
        minutes: Number(row.minutes || 0),
        description: row.description,
        category: row.category,
        sourceType: row.source_type || 'manual',
        clientVisible: Boolean(row.client_visible),
        internalNote: row.internal_note,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        createdAt: row.created_at,
      })));
      const timer = (timerResult.data || [])[0];
      setActiveTimer(timer ? {
        id: timer.id,
        companyId: timer.company_id,
        projectId: timer.project_id,
        deliverableId: timer.deliverable_id,
        cycleId: timer.cycle_id,
        userId: timer.user_id,
        startedAt: timer.started_at,
        status: timer.status,
        pausedAt: timer.paused_at,
        pausedSeconds: Number(timer.paused_seconds || 0),
        category: timer.category,
        description: timer.description,
      } : null);

      if (!timerCompanyId && nextCompanies[0]) setTimerCompanyId(nextCompanies[0].id);
      if (!manualCompanyId && nextCompanies[0]) setManualCompanyId(nextCompanies[0].id);
      if (!interactionCompanyId && nextCompanies[0]) setInteractionCompanyId(nextCompanies[0].id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const companyMap = useMemo(() => new Map(companies.map((item) => [item.id, item])), [companies]);
  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const deliverableMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item])), [deliverables]);

  const timerDeliverables = deliverables.filter((item) => item.companyId === timerCompanyId);
  const manualDeliverables = deliverables.filter((item) => item.companyId === manualCompanyId);
  const interactionDeliverables = deliverables.filter((item) => item.companyId === interactionCompanyId);

  const selectedTimerDeliverable = timerDeliverableId ? deliverableMap.get(timerDeliverableId) || null : null;
  const selectedTimerProject = selectedTimerDeliverable?.projectId ? projectMap.get(selectedTimerDeliverable.projectId) || null : null;

  const activeDeliverable = activeTimer?.deliverableId ? deliverableMap.get(activeTimer.deliverableId) || null : null;
  const activeProject = activeTimer?.projectId ? projectMap.get(activeTimer.projectId) || null : null;
  const activeCompany = activeTimer ? companyMap.get(activeTimer.companyId) || null : null;

  const cycleFor = (companyId: string, projectId?: string | null) => {
    const exact = cycles.find((cycle) => cycle.companyId === companyId && projectId && cycle.projectId === projectId);
    return exact || cycles.find((cycle) => cycle.companyId === companyId) || null;
  };

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (filterCompany !== 'all' && entry.companyId !== filterCompany) return false;
    if (filterSource !== 'all' && entry.sourceType !== filterSource) return false;
    return true;
  }), [entries, filterCompany, filterSource]);

  const totalMinutes = filteredEntries.reduce((sum, entry) => sum + entry.minutes, 0);
  const timerMinutes = filteredEntries.filter((entry) => entry.sourceType === 'timer').reduce((sum, entry) => sum + entry.minutes, 0);
  const manualMinutesTotal = filteredEntries.filter((entry) => entry.sourceType === 'manual').reduce((sum, entry) => sum + entry.minutes, 0);
  const interactionMinutesTotal = filteredEntries.filter((entry) => entry.sourceType === 'interaction' || entry.sourceType === 'calendar').reduce((sum, entry) => sum + entry.minutes, 0);
  const manualDuration = calculateRangeMinutes(manualStart, manualEnd);

  async function startTimer() {
    if (!supabase || !timerCompanyId || !selectedTimerDeliverable || !timerWindow.allowed) return;
    setSaving(true);
    setError('');
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const projectId = selectedTimerDeliverable.projectId || null;
      const description = `${selectedTimerProject?.name ? `${selectedTimerProject.name} — ` : ''}${selectedTimerDeliverable.title}`;
      const result = await supabase.from('work_timers').insert({
        company_id: timerCompanyId,
        project_id: projectId,
        deliverable_id: selectedTimerDeliverable.id,
        cycle_id: cycleFor(timerCompanyId, projectId)?.id || null,
        user_id: userResult.data.user?.id,
        started_at: new Date().toISOString(),
        status: 'active',
        paused_seconds: 0,
        category: timerCategory,
        description,
        client_visible: true,
      }).select('id,company_id,project_id,deliverable_id,cycle_id,user_id,started_at,status,paused_at,paused_seconds,category,description').single();
      if (result.error) throw result.error;
      setActiveTimer({
        id: result.data.id,
        companyId: result.data.company_id,
        projectId: result.data.project_id,
        deliverableId: result.data.deliverable_id,
        cycleId: result.data.cycle_id,
        userId: result.data.user_id,
        startedAt: result.data.started_at,
        status: result.data.status,
        pausedAt: result.data.paused_at,
        pausedSeconds: Number(result.data.paused_seconds || 0),
        category: result.data.category,
        description: result.data.description,
      });
      setNotice('Timer iniciado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function pauseTimer() {
    if (!supabase || !activeTimer || activeTimer.status === 'paused') return;
    setSaving(true);
    try {
      const pausedAt = new Date().toISOString();
      const result = await supabase.from('work_timers').update({ status: 'paused', paused_at: pausedAt }).eq('id', activeTimer.id);
      if (result.error) throw result.error;
      setActiveTimer({ ...activeTimer, status: 'paused', pausedAt });
      setNotice('Timer pausado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível pausar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function resumeTimer() {
    if (!supabase || !activeTimer || activeTimer.status !== 'paused' || !activeTimer.pausedAt) return;
    setSaving(true);
    try {
      const now = new Date();
      const pausedSeconds = activeTimer.pausedSeconds + Math.max(0, Math.floor((now.getTime() - new Date(activeTimer.pausedAt).getTime()) / 1000));
      const result = await supabase.from('work_timers').update({ status: 'active', paused_at: null, paused_seconds: pausedSeconds }).eq('id', activeTimer.id);
      if (result.error) throw result.error;
      setActiveTimer({ ...activeTimer, status: 'active', pausedAt: null, pausedSeconds });
      setNotice('Timer retomado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível retomar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function stopTimer(auto = false) {
    if (!supabase || !activeTimer) return;
    setSaving(true);
    setError('');
    try {
      const stoppedAt = new Date();
      const effectiveEnd = activeTimer.status === 'paused' && activeTimer.pausedAt ? new Date(activeTimer.pausedAt) : stoppedAt;
      const seconds = Math.max(0, Math.floor((effectiveEnd.getTime() - new Date(activeTimer.startedAt).getTime()) / 1000) - activeTimer.pausedSeconds);
      const minutes = Math.max(1, Math.round(seconds / 60));
      const entryResult = await supabase.from('hour_entries').insert({
        company_id: activeTimer.companyId,
        project_id: activeTimer.projectId || null,
        deliverable_id: activeTimer.deliverableId || null,
        cycle_id: activeTimer.cycleId || null,
        work_date: stoppedAt.toISOString().slice(0, 10),
        minutes,
        description: activeTimer.description || 'Atuação registrada por timer',
        category: activeTimer.category || 'Entregáveis',
        source_type: 'timer',
        started_at: activeTimer.startedAt,
        ended_at: stoppedAt.toISOString(),
        client_visible: true,
        created_by: activeTimer.userId,
      });
      if (entryResult.error) throw entryResult.error;
      const timerResult = await supabase.from('work_timers').update({
        status: 'stopped',
        stopped_at: stoppedAt.toISOString(),
        minutes,
        paused_at: null,
      }).eq('id', activeTimer.id);
      if (timerResult.error) throw timerResult.error;
      setActiveTimer(null);
      setNotice(auto ? `Timer encerrado automaticamente às 18h. ${formatMinutes(minutes)} registrados.` : `${formatMinutes(minutes)} registrados pelo timer.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível encerrar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function saveManual(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !manualCompanyId || !manualDeliverableId || !manualDuration || !manualDescription.trim() || !manualJustification.trim()) {
      setError('Preencha todos os campos obrigatórios do lançamento manual.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const deliverable = deliverableMap.get(manualDeliverableId);
      const projectId = deliverable?.projectId || null;
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const startedAt = `${manualDate}T${manualStart}:00`;
      const endedAt = `${manualDate}T${manualEnd}:00`;
      const result = await supabase.from('hour_entries').insert({
        company_id: manualCompanyId,
        project_id: projectId,
        deliverable_id: manualDeliverableId,
        cycle_id: cycleFor(manualCompanyId, projectId)?.id || null,
        work_date: manualDate,
        minutes: manualDuration,
        description: manualDescription.trim(),
        category: manualCategory,
        source_type: 'manual',
        started_at: startedAt,
        ended_at: endedAt,
        internal_note: manualJustification.trim(),
        client_visible: true,
        created_by: userResult.data.user?.id,
      });
      if (result.error) throw result.error;
      setNotice(`Lançamento manual salvo: ${formatMinutes(manualDuration)}.`);
      setManualStart('');
      setManualEnd('');
      setManualDescription('');
      setManualJustification('');
      setManualOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o lançamento manual.');
    } finally {
      setSaving(false);
    }
  }

  async function saveInteraction(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !interactionCompanyId || !interactionDescription.trim() || Number(interactionMinutes) <= 0) {
      setError('Preencha empresa, duração e descrição da interação.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const deliverable = interactionDeliverableId ? deliverableMap.get(interactionDeliverableId) : null;
      const projectId = deliverable?.projectId || null;
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const minutes = Math.max(1, Math.round(Number(interactionMinutes)));
      const category = interactionChannel === 'Reunião' || interactionChannel === 'Visita presencial'
        ? 'Reuniões e alinhamentos'
        : 'Comunicação e follow-up';
      const result = await supabase.from('hour_entries').insert({
        company_id: interactionCompanyId,
        project_id: projectId,
        deliverable_id: interactionDeliverableId || null,
        cycle_id: cycleFor(interactionCompanyId, projectId)?.id || null,
        work_date: interactionDate,
        minutes,
        description: `${interactionChannel}: ${interactionDescription.trim()}`,
        category,
        source_type: 'interaction',
        client_visible: true,
        created_by: userResult.data.user?.id,
      });
      if (result.error) throw result.error;
      setNotice(`Interação via ${interactionChannel} registrada.`);
      setInteractionDescription('');
      setInteractionMinutes('15');
      setInteractionDeliverableId('');
      setInteractionOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível registrar a interação.');
    } finally {
      setSaving(false);
    }
  }

  return <Shell role="admin">
    <section className="page hours-connect">
      <header className="hours-connect-header">
        <div>
          <h1>Horas</h1>
          <p>Timer global, lançamento manual e extrato consolidado.</p>
        </div>
        <span className="hours-connect-status"><i />Período em curso</span>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      <section className="hours-connect-card hours-connect-timer">
        <div className="hours-connect-card-title">
          <div className="hours-connect-icon primary"><TimerReset size={19} /></div>
          <div><h2>Timer global</h2><p>Apenas 1 timer ativo · disponível 08h–18h, segunda a sábado</p></div>
          {activeTimer && <span className="hours-connect-live"><i />{activeTimer.status === 'paused' ? 'Pausado' : 'Registrando agora'}</span>}
        </div>

        {!activeTimer && <>
          <div className="hours-connect-two-columns">
            <label className="hours-connect-field"><span>Cliente</span><select value={timerCompanyId} onChange={(event) => { setTimerCompanyId(event.target.value); setTimerDeliverableId(''); }}><option value="">Selecione o cliente</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className="hours-connect-field"><span>Projeto / Entregável</span><select value={timerDeliverableId} disabled={!timerCompanyId} onChange={(event) => setTimerDeliverableId(event.target.value)}><option value="">{timerCompanyId ? 'Selecione a tarefa' : 'Escolha o cliente primeiro'}</option>{timerDeliverables.map((deliverable) => <option key={deliverable.id} value={deliverable.id}>{projectMap.get(deliverable.projectId || '')?.name || 'Projeto'} — {deliverable.title}</option>)}</select></label>
          </div>
          <div className="hours-connect-timer-settings">
            <label className="hours-connect-field compact"><span>Natureza da atuação</span><select value={timerCategory} onChange={(event) => setTimerCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="hours-connect-empty-timer">
            <div><span className="hours-connect-empty-icon"><Clock3 size={22} /></span><div><strong>Nenhum timer ativo</strong><p>{selectedTimerDeliverable ? `Pronto para registrar: ${selectedTimerProject?.name ? `${selectedTimerProject.name} — ` : ''}${selectedTimerDeliverable.title}` : 'Selecione um cliente e um projeto / entregável para iniciar.'}</p></div></div>
            <div className="hours-connect-start-wrap"><button className="primary" type="button" onClick={() => void startTimer()} disabled={saving || !timerWindow.allowed || !selectedTimerDeliverable}><Play size={16} />Iniciar</button>{!timerWindow.allowed && <small>{timerWindow.reason}</small>}</div>
          </div>
        </>}

        {activeTimer && <div className="hours-connect-active-timer">
          <div className="hours-connect-clock-area"><strong>{timerLabel(elapsed)}</strong><span>{activeTimer.status === 'paused' ? 'tempo pausado' : 'tempo em andamento'}</span></div>
          <div className="hours-connect-active-task"><span>Tarefa ativa</span><strong>{activeCompany?.name || 'Cliente'} · {activeProject?.name || 'Projeto'} — {activeDeliverable?.title || activeTimer.description || 'Atuação'}</strong><small>{activeTimer.category || 'Atuação CALI'}</small></div>
          <div className="hours-connect-timer-actions">{activeTimer.status === 'paused' ? <button className="secondary" type="button" onClick={() => void resumeTimer()} disabled={saving}><Play size={15} />Retomar</button> : <button className="secondary" type="button" onClick={() => void pauseTimer()} disabled={saving}><Pause size={15} />Pausar</button>}<button className="primary danger-action" type="button" onClick={() => void stopTimer(false)} disabled={saving}><Square size={15} />Encerrar</button></div>
        </div>}
      </section>

      <section className="hours-connect-card hours-connect-accordion">
        <button className="hours-connect-accordion-trigger" type="button" onClick={() => setManualOpen((value) => !value)} aria-expanded={manualOpen}>
          <span className="hours-connect-icon warning"><PenSquare size={19} /></span><span><strong>Lançamento manual</strong><small>Para horas trabalhadas fora do timer</small></span>{manualOpen ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
        </button>
        {manualOpen && <form className="hours-connect-form" onSubmit={saveManual}>
          <label className="hours-connect-field"><span>Data *</span><input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label>
          <label className="hours-connect-field"><span>Cliente *</span><select value={manualCompanyId} onChange={(event) => { setManualCompanyId(event.target.value); setManualDeliverableId(''); }}><option value="">Selecione o cliente</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="hours-connect-field wide"><span>Projeto / Entregável *</span><select value={manualDeliverableId} disabled={!manualCompanyId} onChange={(event) => setManualDeliverableId(event.target.value)}><option value="">{manualCompanyId ? 'Selecione um entregável' : 'Escolha o cliente primeiro'}</option>{manualDeliverables.map((deliverable) => <option key={deliverable.id} value={deliverable.id}>{projectMap.get(deliverable.projectId || '')?.name || 'Projeto'} — {deliverable.title}</option>)}</select></label>
          <label className="hours-connect-field"><span>Hora início *</span><input type="time" value={manualStart} onChange={(event) => setManualStart(event.target.value)} /></label>
          <label className="hours-connect-field"><span>Hora fim *</span><input type="time" value={manualEnd} onChange={(event) => setManualEnd(event.target.value)} />{manualStart && manualEnd && <small className={manualDuration ? '' : 'error'}>{manualDuration ? `Duração calculada: ${formatMinutes(manualDuration)}` : 'A hora de fim deve ser maior que a de início.'}</small>}</label>
          <label className="hours-connect-field wide"><span>Natureza</span><select value={manualCategory} onChange={(event) => setManualCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="hours-connect-field wide"><span>Descrição da atuação *</span><textarea rows={3} value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder="Descreva objetivamente o trabalho realizado." /></label>
          <label className="hours-connect-field wide"><span>Justificativa interna * <em>(não visível ao cliente)</em></span><textarea rows={3} value={manualJustification} onChange={(event) => setManualJustification(event.target.value)} placeholder="Por que este lançamento foi feito manualmente?" /></label>
          <div className="hours-connect-form-actions wide"><button className="primary" type="submit" disabled={saving}>Salvar lançamento</button></div>
        </form>}
      </section>

      <section className="hours-connect-card hours-connect-accordion">
        <button className="hours-connect-accordion-trigger" type="button" onClick={() => setInteractionOpen((value) => !value)} aria-expanded={interactionOpen}>
          <span className="hours-connect-icon info"><MessageSquareText size={19} /></span><span><strong>Registrar interação externa</strong><small>WhatsApp, e-mail, ligação, reunião ou visita presencial</small></span>{interactionOpen ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
        </button>
        {interactionOpen && <form className="hours-connect-form" onSubmit={saveInteraction}>
          <div className="hours-connect-field wide"><span>Canal *</span><div className="hours-connect-channels">{channels.map((channel) => <button key={channel} type="button" className={interactionChannel === channel ? 'active' : ''} onClick={() => setInteractionChannel(channel)}>{channel}</button>)}</div></div>
          <label className="hours-connect-field"><span>Data *</span><input type="date" value={interactionDate} onChange={(event) => setInteractionDate(event.target.value)} /></label>
          <label className="hours-connect-field"><span>Cliente *</span><select value={interactionCompanyId} onChange={(event) => { setInteractionCompanyId(event.target.value); setInteractionDeliverableId(''); }}><option value="">Selecione o cliente</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="hours-connect-field"><span>Duração estimada (min) *</span><input type="number" min="1" step="1" value={interactionMinutes} onChange={(event) => setInteractionMinutes(event.target.value)} /></label>
          <label className="hours-connect-field"><span>Entregável relacionado <em>(opcional)</em></span><select value={interactionDeliverableId} disabled={!interactionCompanyId} onChange={(event) => setInteractionDeliverableId(event.target.value)}><option value="">Sem entregável específico</option>{interactionDeliverables.map((deliverable) => <option key={deliverable.id} value={deliverable.id}>{projectMap.get(deliverable.projectId || '')?.name || 'Projeto'} — {deliverable.title}</option>)}</select></label>
          <label className="hours-connect-field wide"><span>Descrição breve *</span><textarea rows={3} value={interactionDescription} onChange={(event) => setInteractionDescription(event.target.value)} placeholder="Resumo da interação." /></label>
          <div className="hours-connect-form-actions wide"><button className="primary" type="submit" disabled={saving}>Registrar interação</button></div>
        </form>}
      </section>

      <section className="hours-connect-stats">
        <article className="hours-connect-stat-main"><span className="hours-connect-icon primary"><Clock3 size={20} /></span><div><small>Total no período</small><strong>{formatMinutes(totalMinutes)}</strong></div></article>
        <article className="hours-connect-stat-composition"><div className="hours-connect-stat-heading"><span>Composição do período</span><small>timer, manual e interações</small></div><div className="hours-connect-segments"><div><span><i className="timer" />Via timer</span><strong>{formatMinutes(timerMinutes)}</strong><small>{filteredEntries.filter((entry) => entry.sourceType === 'timer').length} entradas</small></div><div><span><i className="manual" />Manuais</span><strong>{formatMinutes(manualMinutesTotal)}</strong><small>{filteredEntries.filter((entry) => entry.sourceType === 'manual').length} entradas</small></div><div><span><i className="interaction" />Interações</span><strong>{formatMinutes(interactionMinutesTotal)}</strong><small>{filteredEntries.filter((entry) => entry.sourceType === 'interaction' || entry.sourceType === 'calendar').length} entradas</small></div></div></article>
      </section>

      <section className="hours-connect-card hours-connect-extract">
        <div className="hours-connect-filters"><Filter size={18} /><select value={filterCompany} onChange={(event) => setFilterCompany(event.target.value)}><option value="all">Todos os clientes</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><select value={filterSource} onChange={(event) => setFilterSource(event.target.value)}><option value="all">Todos os tipos</option><option value="timer">Timer</option><option value="manual">Manual</option><option value="interaction">Interação</option><option value="calendar">Calendário</option></select><label className="hours-connect-period"><CalendarDays size={16} /><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>{(filterCompany !== 'all' || filterSource !== 'all') && <button className="hours-connect-clear" type="button" onClick={() => { setFilterCompany('all'); setFilterSource('all'); }}>Limpar</button>}<button className="secondary hours-connect-export" type="button" onClick={() => downloadCsv(filteredEntries, companyMap, projectMap, deliverableMap, period)}><Download size={16} />Exportar</button></div>

        {loading ? <div className="data-loading"><Loader2 className="spin" size={20} />Carregando extrato…</div> : filteredEntries.length === 0 ? <div className="hours-connect-no-data"><Clock3 size={24} /><strong>Nenhum lançamento no período</strong><p>Ajuste os filtros ou registre uma nova atuação.</p></div> : <div className="hours-connect-table-wrap"><table className="hours-connect-table"><thead><tr><th className="expand" /><th>Data</th><th>Cliente</th><th>Projeto</th><th>Entregável</th><th className="right">Horas</th><th>Tipo</th><th>Natureza</th></tr></thead><tbody>{filteredEntries.map((entry) => {
          const open = expandedId === entry.id;
          const hasDetail = Boolean(entry.description || entry.internalNote || entry.startedAt || entry.endedAt);
          return <>
            <tr key={entry.id} className={hasDetail ? 'clickable' : ''} onClick={() => hasDetail && setExpandedId(open ? null : entry.id)}><td className="expand">{hasDetail ? open ? <ChevronDown size={16} /> : <ChevronRight size={16} /> : null}</td><td>{dateLabel(entry.workDate)}</td><td><strong>{companyMap.get(entry.companyId)?.name || 'Cliente'}</strong></td><td>{entry.projectId ? projectMap.get(entry.projectId)?.name || '—' : '—'}</td><td>{entry.deliverableId ? deliverableMap.get(entry.deliverableId)?.title || '—' : '—'}</td><td className="right"><strong>{formatMinutes(entry.minutes)}</strong></td><td><span className={`hours-connect-type ${entry.sourceType}`}>{sourceLabel(entry.sourceType)}</span></td><td>{entry.category || 'Outros'}</td></tr>
            {open && <tr className="hours-connect-detail"><td colSpan={8}><div><span><strong>Descrição</strong>{entry.description}</span>{(entry.startedAt || entry.endedAt) && <span><strong>Horário</strong>{timeLabel(entry.startedAt)}–{timeLabel(entry.endedAt)}</span>}{entry.internalNote && <span className="internal"><strong>Justificativa interna</strong>{entry.internalNote}</span>}<span><strong>Cliente</strong>{entry.clientVisible ? 'Registro compartilhável no extrato' : 'Detalhe interno CALI'}</span></div></td></tr>}
          </>;
        })}</tbody></table></div>}
      </section>
    </section>
  </Shell>;
}
