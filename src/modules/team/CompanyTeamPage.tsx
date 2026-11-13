import { TeamDirectory } from './components/TeamDirectory';
import { TeamOrganization } from './components/TeamOrganization';
import { columnLabels, clientDirectoryColumns, defaultColumns, type ColumnKey } from './teamDirectoryColumns';
import { statusLabels } from './teamStatusLabels';
import { dateLabel, monthLabel } from './teamDateLabels';
import { TeamAvatar } from './components/TeamAvatar';
import {
  TeamDialogEyebrow,
  TeamDialogFooter,
  TeamDialogHeader,
  TeamEditorFields,
} from './components/TeamDialogParts';
import { DialogForm } from '../../components/ds/DialogForm';
import { DataTable } from '../../components/ds/DataTable';
import { DialogFrame } from '../../components/ds/DialogFrame';
import { PeopleAnalyticsMonth, PeopleAnalyticsPeriod } from './components/PeopleAnalyticsBoard';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from '../../hooks/useSearchParams';
import { TeamMonthWizard, type TeamMonthDraft } from './components/TeamMonthWizard';
import {
  ArrowRight,
  Check,
  Info,
  Download,
  FileUp,
  Loader2,
  Plus,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { Shell, type Role } from '../../components/workspace/WorkspaceShell';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  archiveTeamMember,
  readAnalyticsFront,
  readCompanyTeam,
  readTeamCompanies,
  readTeamMetrics,
  saveTeamMembers,
  teamDirectoryKey,
} from '../../api/team/directory';
import type { Change, Company, Draft, Member, MonthMetric, Private, Snapshot, Vacancy } from '../../domain/team';
import { writeTeamMetrics, type TeamMetricsWrite } from '../../api/team/metrics';
import './team-print.css';
import { TeamAction } from './components/TeamAction';
import { TeamStatus } from './components/TeamStatus';
import { LoadingState } from '../../components/ds/LoadingState';
import { TeamMemberProfiles } from '../disc/components/TeamMemberProfiles';
import { GestaoBanner } from '../disc/components/GestaoBanner';

type MetricDraft = Record<
  | 'planned'
  | 'medical'
  | 'leave'
  | 'unjustified'
  | 'accident'
  | 'overtime'
  | 'bank'
  | 'enps'
  | 'climate'
  | 'participation'
  | 'notes',
  string
> & { approved: Record<string, string>; reason: string; expectedAt: string | null };
function errorText<Value>(error: Value) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

type Tab = 'people' | 'changes' | 'indicators';
const sparkFields: Record<string, 'active' | 'admissions' | 'exits'> = {
  'Quadro ativo': 'active',
  Admissões: 'admissions',
  Desligamentos: 'exits',
};
type DetailTab = 'data' | 'reports' | 'history' | 'profile';
const blank: Draft = {
  employee_code: '',
  full_name: '',
  work_email: null,
  work_phone: null,
  admission_date: '',
  job_title: '',
  seniority: null,
  department: '',
  team_area: null,
  manager_code: null,
  is_leader: false,
  employment_type: 'clt',
  weekly_hours: null,
  work_model: null,
  location: null,
  status: 'active',
  leave_reason: null,
  leave_start_date: null,
  expected_return_date: null,
  termination_date: null,
  termination_initiative: null,
  termination_reason: null,
  termination_code: '',
  notice_type: null,
  salary: '',
  salary_review_date: '',
  gender: '',
  gender_detail: '',
  has_children: '',
  optional_data_declared: false,
};
const contractLabels: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  intern: 'Estágio',
  temporary: 'Temporário',
  outsourced: 'Terceirizado',
  other: 'Outro',
};
const leaveLabels: Record<string, string> = {
  vacation: 'Férias',
  medical_leave: 'Afastamento / licença',
  parental_leave: 'Licença maternidade / paternidade',
  unpaid_leave: 'Licença não remunerada',
  other: 'Outro',
};
const terminationInitiativeLabels: Record<string, string> = {
  employee: 'Por iniciativa do empregado',
  company: 'Por iniciativa do empregador',
  contract_end: 'Término do contrato a termo',
  other: 'Outra forma de desligamento',
};
export const terminationCodes = [
  { code: '01', label: 'Rescisão com justa causa, por iniciativa do empregador', initiative: 'company' },
  { code: '02', label: 'Rescisão sem justa causa, por iniciativa do empregador', initiative: 'company' },
  {
    code: '03',
    label: 'Rescisão antecipada do contrato a termo por iniciativa do empregador',
    initiative: 'company',
  },
  {
    code: '04',
    label: 'Rescisão antecipada do contrato a termo por iniciativa do empregado',
    initiative: 'employee',
  },
  { code: '06', label: 'Rescisão por término do contrato a termo', initiative: 'contract_end' },
  { code: '07', label: 'Rescisão do contrato de trabalho por iniciativa do empregado', initiative: 'employee' },
  { code: '17', label: 'Rescisão indireta do contrato de trabalho', initiative: 'other' },
  { code: '33', label: 'Rescisão por acordo entre as partes (art. 484-A da CLT)', initiative: 'other' },
] as const;
export function parseTerminationReason(value?: string | null) {
  const match = (value || '').match(/^\[eSocial:(\d{2})\]\s*(.*)$/s);
  return { code: match?.[1] || '', reason: match ? match[2] : value || '' };
}
export function terminationReasonValue(code: string, reason?: string | null) {
  return [code ? `[eSocial:${code}]` : '', reason?.trim() || ''].filter(Boolean).join(' ') || null;
}
export function terminationCodeLabel(code: string) {
  const item = terminationCodes.find((option) => option.code === code);
  return item ? `${item.code} · ${item.label}` : '';
}
function terminationSummary(value?: string | null) {
  const { code, reason } = parseTerminationReason(value);
  return [terminationCodeLabel(code), reason].filter(Boolean).join(' · ') || '—';
}
const noticeLabels: Record<string, string> = {
  worked: 'Trabalhado',
  indemnified: 'Indenizado',
  waived: 'Dispensado',
  not_applicable: 'Não se aplica',
};
const changeLabels: Record<string, string> = {
  admission: 'Admissão',
  promotion: 'Promoção',
  transfer: 'Mudança de área',
  manager_change: 'Mudança de gestor',
  contract_change: 'Mudança de vínculo',
  leave: 'Afastamento',
  return: 'Retorno',
  termination: 'Desligamento',
  correction: 'Correção',
};
function changeDetails(change: Change) {
  const before = change.before_state,
    after = change.after_state;
  if (!before || !after) return change.change_type === 'admission' ? 'Entrada na equipe registrada.' : '';
  const fields: [string, string][] = [
    ['job_title', 'Cargo'],
    ['seniority', 'Senioridade'],
    ['department', 'Departamento'],
    ['team_area', 'Setor'],
    ['manager_code', 'Gestor'],
    ['employment_type', 'Vínculo'],
    ['weekly_hours', 'Jornada semanal'],
    ['status', 'Situação'],
  ];
  return (
    fields
      .filter(([key]) => String(before[key] ?? '') !== String(after[key] ?? ''))
      .map(([key, label]) => `${label}: ${String(before[key] ?? '—')} → ${String(after[key] ?? '—')}`)
      .join(' · ') || 'Atualização dos dados da ficha, sem mudança de cargo ou área.'
  );
}
function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
}
function tenureLabel(admission: string, end?: string | null) {
  const start = new Date(`${admission}T12:00:00`);
  const until = end ? new Date(`${end.slice(0, 10)}T12:00:00`) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(until.getTime()) || until < start) return '—';
  let months = (until.getFullYear() - start.getFullYear()) * 12 + until.getMonth() - start.getMonth();
  if (until.getDate() < start.getDate()) months--;
  return months < 12
    ? `${Math.max(0, months)} ${months === 1 ? 'mês' : 'meses'}`
    : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? 'ano' : 'anos'}${months % 12 ? ` e ${months % 12} ${months % 12 === 1 ? 'mês' : 'meses'}` : ''}`;
}
function normalized(row: Partial<Draft>, existing?: Member): Draft {
  const termination = parseTerminationReason(row.termination_reason ?? existing?.termination_reason);
  return {
    ...blank,
    ...existing,
    ...row,
    termination_code: row.termination_code ?? termination.code,
    termination_reason: termination.reason || null,
    salary: row.salary ?? '',
    salary_review_date: row.salary_review_date ?? '',
    gender: row.gender ?? '',
    gender_detail: row.gender_detail ?? '',
    has_children: row.has_children ?? '',
    optional_data_declared: row.optional_data_declared ?? false,
  };
}
function csvCells(raw: string) {
  const lines: string[][] = [];
  let cells: string[] = [],
    cell = '',
    quoted = false;
  const firstLine = raw.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && raw[i + 1] === '\n') i++;
      cells.push(cell.trim());
      if (cells.some(Boolean)) lines.push(cells);
      cells = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Há aspas sem fechamento na planilha.');
  cells.push(cell.trim());
  if (cells.some(Boolean)) lines.push(cells);
  return lines;
}
const csvColumns = [
  ['codigo_colaborador', 'employee_code'],
  ['nome_completo', 'full_name'],
  ['data_admissao', 'admission_date'],
  ['cargo', 'job_title'],
  ['senioridade', 'seniority'],
  ['departamento', 'department'],
  ['setor', 'team_area'],
  ['codigo_gestor', 'manager_code'],
  ['lideranca', 'is_leader'],
  ['tipo_contratacao', 'employment_type'],
  ['jornada_semanal_horas', 'weekly_hours'],
  ['modelo_trabalho', 'work_model'],
  ['unidade_localidade', 'location'],
  ['email_corporativo', 'work_email'],
  ['telefone_profissional', 'work_phone'],
  ['situacao', 'status'],
  ['motivo_afastamento', 'leave_reason'],
  ['data_inicio_afastamento', 'leave_start_date'],
  ['previsao_retorno', 'expected_return_date'],
  ['data_desligamento', 'termination_date'],
  ['iniciativa_desligamento', 'termination_initiative'],
  ['codigo_esocial_desligamento', 'termination_code'],
  ['motivo_desligamento', 'termination_reason'],
  ['aviso_previo', 'notice_type'],
  ['remuneracao_atual', 'salary'],
  ['data_ultima_revisao_salarial', 'salary_review_date'],
  ['genero', 'gender'],
  ['identificacao_genero', 'gender_detail'],
  ['tem_filhos', 'has_children'],
  ['origem_dados_opcionais_confirmada', 'optional_data_declared'],
] as const;
const csvAliases: Record<string, string> = Object.fromEntries(
  csvColumns.flatMap(([pt, key]) => [
    [pt, key],
    [key, key],
  ]),
);
const csvWorkModel: Record<string, string> = {
  hibrido: 'hibrido',
  híbrido: 'hibrido',
  presencial: 'presencial',
  remoto: 'remoto',
  home_office: 'remoto',
  'home office': 'remoto',
};
const csvEmploymentType: Record<string, string> = {
  clt: 'clt',
  pj: 'pj',
  estagio: 'intern',
  estágio: 'intern',
  aprendiz: 'other',
  temporario: 'temporary',
  temporário: 'temporary',
  terceirizado: 'outsourced',
  outro: 'other',
};
const csvLeaveReason: Record<string, string> = {
  ferias: 'vacation',
  férias: 'vacation',
  afastamento: 'medical_leave',
  licenca: 'medical_leave',
  licença: 'medical_leave',
  'licenca maternidade': 'parental_leave',
  'licença maternidade': 'parental_leave',
  'licenca paternidade': 'parental_leave',
  'licença paternidade': 'parental_leave',
  'licenca nao remunerada': 'unpaid_leave',
  'licença não remunerada': 'unpaid_leave',
  outro: 'other',
};
const csvTerminationInitiative: Record<string, string> = {
  'pedido da pessoa': 'employee',
  'pedido do colaborador': 'employee',
  'por iniciativa do empregado': 'employee',
  empresa: 'company',
  'por iniciativa do empregador': 'company',
  'fim do contrato': 'contract_end',
  'término do contrato a termo': 'contract_end',
  outro: 'other',
};
const csvNoticeType: Record<string, string> = {
  trabalhado: 'worked',
  indenizado: 'indemnified',
  dispensado: 'waived',
  'nao se aplica': 'not_applicable',
  'não se aplica': 'not_applicable',
};
const csvGender: Record<string, string> = {
  feminino: 'female',
  masculino: 'male',
  'outra identificacao': 'other',
  'outra identificação': 'other',
  'prefiro nao informar': 'prefer_not',
  'prefiro não informar': 'prefer_not',
  'nao informado': '',
  'não informado': '',
};
const csvHasChildren: Record<string, string> = {
  sim: 'yes',
  nao: 'no',
  não: 'no',
  'prefiro nao informar': 'prefer_not',
  'prefiro não informar': 'prefer_not',
  'nao informado': '',
  'não informado': '',
};
const csvStatus: Record<string, string> = {
  ativo: 'active',
  ativa: 'active',
  afastado: 'leave',
  afastada: 'leave',
  ferias: 'leave',
  férias: 'leave',
  desligado: 'terminated',
  desligada: 'terminated',
};
function csvHeaderKey(raw: string) {
  const key = raw
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return csvAliases[key] || '';
}
function normalizeCsvDate(raw: string, label: string, line: number) {
  const value = raw.trim();
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`Confira ${label} na linha ${line}: use DD/MM/AAAA.`);
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T12:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[3]) ||
    date.getMonth() + 1 !== Number(match[2]) ||
    date.getDate() !== Number(match[1])
  )
    throw new Error(`Confira ${label} na linha ${line}: data inválida.`);
  return iso;
}
function csvYes(raw: string) {
  return ['sim', 's', 'yes', 'true', '1'].includes(raw.trim().toLocaleLowerCase('pt-BR'));
}
function csvMoney(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  const normalized = value.replace(/\s/g, '').replace(/^R\$/i, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Confira a remuneração informada.');
  return String(parsed);
}
function downloadModel() {
  const header = csvColumns.map(([label]) => label).join(';') + '\r\n';
  const blob = new Blob(['\ufeff' + header], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cali-modelo-colaboradores.csv';
  a.click();
  URL.revokeObjectURL(url);
}
function columnContent(member: Member, key: ColumnKey, memberMap: Map<string, string>) {
  if (key === 'status') return <TeamStatus status={member.status}>{statusLabels[member.status]}</TeamStatus>;
  if (
    key === 'admission_date' ||
    key === 'leave_start_date' ||
    key === 'expected_return_date' ||
    key === 'termination_date'
  )
    return dateLabel(member[key] as string | null);
  if (key === 'manager_code') return memberMap.get(member.manager_code || '') || member.manager_code || '—';
  if (key === 'employment_type') return contractLabels[member.employment_type] || member.employment_type;
  if (key === 'weekly_hours') return member.weekly_hours == null ? '—' : `${member.weekly_hours} h/semana`;
  if (key === 'is_leader') return member.is_leader ? 'Sim' : 'Não';
  if (key === 'leave_reason')
    return member.leave_reason ? leaveLabels[member.leave_reason] || member.leave_reason : '—';
  if (key === 'termination_initiative')
    return member.termination_initiative
      ? terminationInitiativeLabels[member.termination_initiative] || member.termination_initiative
      : '—';
  if (key === 'termination_reason') return terminationSummary(member.termination_reason);
  if (key === 'notice_type')
    return member.notice_type ? noticeLabels[member.notice_type] || member.notice_type : '—';
  return String(member[key] ?? '—') || '—';
}
/* staff = Equipe CALI (Partner): mesma tela do cliente, só para consulta, nas empresas atribuídas a ele; nunca carrega dados restritos (salário). */
export function CompanyTeamPage({ role, staff = false }: { role: Role; staff?: boolean }) {
  const { user } = useWorkspaceAuth();
  const admin = role === 'admin';
  /* Módulo People Analytics: núcleo do CALI Full, contratável à parte nos demais planos; a administradora vê sempre. */ const [
    analyticsFront,
    setAnalyticsFront,
  ] = useState(false);
  const [cmpMode, setCmpMode] = useState('prev');
  const [metrics, setMetrics] = useState<MonthMetric[]>([]);
  const [metricDraft, setMetricDraft] = useState<MetricDraft | null>(null);
  const metricRequest = useRef<{ key: string; id: string }>();
  const [essChart, setEssChart] = useState('Quadro ativo');
  const [printingIndicators, setPrintingIndicators] = useState(false);
  const loadSequence = useRef(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [privateRows, setPrivateRows] = useState<Private[]>([]);
  const [months, setMonths] = useState<
    { reference_month: string; confirmed_at: string | null; revision?: number | null }[]
  >([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [tab, setTab] = useState<Tab>('people');
  const [detailTab, setDetailTab] = useState<DetailTab>('data');
  const [viewKind, setViewKind] = useState<'list' | 'leaders'>('list');
  const [periodMode, setPeriodMode] = useState(false);
  const [periodStart, setPeriodStart] = useState(currentMonth());
  const [periodEnd, setPeriodEnd] = useState(currentMonth());
  const [pendingTermination, setPendingTermination] = useState<Member | null>(null);
  const [month, setMonth] = useState(() => new URLSearchParams(location.search).get('mes') || currentMonth());
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [columns, setColumns] = useState<ColumnKey[]>(admin ? defaultColumns : clientDirectoryColumns);
  const [columnOpen, setColumnOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Draft[]>([]);
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [detail, setDetail] = useState<Member | null>(null);
  const [orgArea, setOrgArea] = useState<string | null>(null);
  const [showFormer, setShowFormer] = useState(false);
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const aba = searchParams.get('aba');
    if (aba === 'diretorio') {
      setTab('people');
      setViewKind('list');
    } else if (aba === 'estrutura') {
      setTab('people');
      setViewKind('leaders');
    } else if (aba === 'movimentacoes') setTab('changes');
    else if (aba === 'indicadores') setTab('indicators');
  }, [searchParams]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [reviews, setReviews] = useState<{ reference_month: string }[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const activeMonth = currentMonth();
  const [year, number] = activeMonth.split('-').map(Number);
  const priorMonth = new Date(year, number - 2, 1).toISOString().slice(0, 7);
  const isCurrent = month === activeMonth;
  const selectedCompany = companies.find((company) => company.id === companyId);
  const confirmed = months.find((item) => item.reference_month === `${month}-01`);
  const reviewed = reviews.some((r) => r.reference_month === month + '-01');
  const columnStorageKey = user?.id && companyId ? `cali:team-columns-v4:${user.id}:${companyId}` : '';
  useEffect(() => {
    if (!columnStorageKey) {
      setColumns(admin ? defaultColumns : clientDirectoryColumns);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(columnStorageKey) || 'null');
      setColumns(
        Array.isArray(saved)
          ? saved.filter((key): key is ColumnKey => key in columnLabels)
          : admin
            ? defaultColumns
            : clientDirectoryColumns,
      );
    } catch {
      setColumns(admin ? defaultColumns : clientDirectoryColumns);
    }
  }, [columnStorageKey]);
  function toggleColumn(key: ColumnKey) {
    setColumns((previous) => {
      const next = previous.includes(key) ? previous.filter((x) => x !== key) : [...previous, key];
      if (columnStorageKey) localStorage.setItem(columnStorageKey, JSON.stringify(next));
      return next;
    });
  }
  async function loadMetrics(id = companyId) {
    if (!id) return;
    const result = await readTeamMetrics(id);
    if (result) setMetrics(result);
  }
  useEffect(() => {
    setMetrics([]);
    setCmpMode('prev');
    void loadMetrics(companyId);
  }, [companyId]);
  useEffect(() => {
    let active = true;
    setAnalyticsFront(false);
    if (companyId && !admin) {
      void readAnalyticsFront(companyId).then((visible) => {
        if (active) setAnalyticsFront(visible);
      });
    }
    return () => {
      active = false;
    };
  }, [companyId, admin]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');
    const scope = staff ? 'partner' : admin ? 'admin' : 'client';
    void readTeamCompanies(user.id, scope).then(
      (result) => {
        if (!active) return;
        setCompanies(result);
        setCompanyId((previous) => (scope === 'client' ? result[0]?.id || '' : previous || result[0]?.id || ''));
        if (staff) setLoading(false);
      },
      (reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as suas empresas.');
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [admin, staff, user?.id]);

  const queryClient = useQueryClient();
  async function loadTeam(id = companyId) {
    if (!id || !user) return;
    const request = ++loadSequence.current;
    setLoading(true);
    setError('');
    try {
      const result = await queryClient.fetchQuery({
        queryKey: teamDirectoryKey(user.id, id, staff),
        queryFn: ({ signal }) => readCompanyTeam(id, staff, signal),
        staleTime: 0,
      });
      if (request !== loadSequence.current) return;
      setMembers(result.people);
      setMonths(result.months);
      setSnapshots(result.snapshots);
      setChanges(result.changes);
      setPrivateRows(result.privateRows);
      setVacancies(result.vacancies);
      setReviews(result.reviews);
    } catch (reason) {
      if (request === loadSequence.current) setError(errorText(reason));
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (companyId) {
      setDetail(null);
      setPrivateRows([]);
      setImportOpen(false);
      setImportRows([]);
      void loadTeam(companyId);
    }
  }, [companyId]);
  const monthSnapshots = snapshots.filter((item) => item.reference_month === `${month}-01`);
  const visibleMembers: Member[] = isCurrent
    ? members.filter((m) => !m.archived_at)
    : monthSnapshots.flatMap((item) => {
        const source = members.find((m) => m.id === item.member_id);
        return source
          ? [
              {
                ...source,
                status: item.status as Member['status'],
                department: item.department,
                manager_code: item.manager_code,
                job_title: item.job_title,
                admission_date: item.admission_date,
                termination_date: item.termination_date,
              },
            ]
          : [];
      });
  const departments = useMemo(
    () => [...new Set(visibleMembers.map((item) => item.department))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [visibleMembers],
  );
  const memberMap = new Map(members.map((item) => [item.employee_code, item.full_name]));
  const filtered = visibleMembers.filter(
    (item) =>
      (!department || item.department === department) &&
      (!status || item.status === status) &&
      (!search ||
        `${item.full_name} ${item.job_title} ${item.employee_code}`
          .toLocaleLowerCase('pt-BR')
          .includes(search.toLocaleLowerCase('pt-BR'))),
  );
  const monthChanges = changes.filter((item) => {
    const effective =
      item.change_type === 'admission'
        ? item.after_state?.admission_date
        : item.change_type === 'termination'
          ? item.after_state?.termination_date
          : null;
    return (
      (!isCurrent || !members.some((m) => m.id === item.member_id && m.archived_at)) &&
      (periodMode
        ? (effective ? String(effective).slice(0, 7) : item.reference_month.slice(0, 7)) >= periodStart &&
          (effective ? String(effective).slice(0, 7) : item.reference_month.slice(0, 7)) <= periodEnd
        : effective
          ? String(effective).startsWith(month)
          : item.reference_month === `${month}-01`)
    );
  });
  const archivedIds = new Set(members.filter((item) => item.archived_at).map((item) => item.id));
  const activeCount = monthSnapshots.filter(
    (item) => item.status === 'active' && (!isCurrent || !archivedIds.has(item.member_id)),
  ).length;
  const admitted = changes.filter(
    (item) =>
      item.change_type === 'admission' &&
      (!isCurrent || !archivedIds.has(item.member_id)) &&
      String(item.after_state?.admission_date || '').startsWith(month),
  ).length;
  const exits = changes.filter(
    (item) =>
      item.change_type === 'termination' &&
      (!isCurrent || !archivedIds.has(item.member_id)) &&
      String(item.after_state?.termination_date || '').startsWith(month),
  ).length;
  const series = months
    .slice()
    .reverse()
    .map((item) => {
      const rows = snapshots.filter((snapshot) => snapshot.reference_month === item.reference_month);
      return {
        month: item.reference_month.slice(0, 7),
        active: rows.filter(
          (snapshot) =>
            snapshot.status === 'active' &&
            (item.reference_month.slice(0, 7) !== activeMonth || !archivedIds.has(snapshot.member_id)),
        ).length,
        admissions: changes.filter(
          (change) =>
            change.change_type === 'admission' &&
            String(change.after_state?.admission_date || '').startsWith(item.reference_month.slice(0, 7)),
        ).length,
        exits: changes.filter(
          (change) =>
            change.change_type === 'termination' &&
            String(change.after_state?.termination_date || '').startsWith(item.reference_month.slice(0, 7)),
        ).length,
      };
    });
  const detailPrivate = detail && !staff ? privateRows.find((row) => row.member_id === detail.id) : undefined;
  const leaderReports = detail
    ? members.filter(
        (member) =>
          member.id !== detail.id &&
          !member.archived_at &&
          (member.manager_code === detail.employee_code ||
            snapshots.some(
              (snapshot) => snapshot.member_id === member.id && snapshot.manager_code === detail.employee_code,
            )),
      )
    : [];
  const activeReports = leaderReports
    .filter((member) => member.status !== 'terminated' && member.manager_code === detail?.employee_code)
    .sort((a, b) => a.admission_date.localeCompare(b.admission_date));
  const formerReports = leaderReports
    .filter((member) => member.status === 'terminated' || member.manager_code !== detail?.employee_code)
    .sort((a, b) =>
      (b.termination_date || b.admission_date).localeCompare(a.termination_date || a.admission_date),
    );
  function showDetail(member: Member) {
    setDetail(member);
    setDetailTab('data');
  }
  function openEdit(member?: Member) {
    const restricted = member && !staff ? privateRows.find((item) => item.member_id === member.id) : null;
    setEditor(
      normalized(
        {
          salary: restricted?.salary?.toString() || '',
          salary_review_date: restricted?.salary_review_date || '',
          gender: restricted?.gender || '',
          gender_detail: restricted?.gender_detail || '',
          has_children: restricted?.has_children || '',
          optional_data_declared: Boolean(
            restricted &&
            (restricted.gender ||
              restricted.has_children ||
              restricted.salary != null ||
              restricted.salary_review_date),
          ),
        },
        member,
      ),
    );
    setEditingId(member?.id || null);
    setError('');
  }
  function openStatusEdit(member: Member, nextStatus: 'leave' | 'terminated') {
    const restricted = !staff ? privateRows.find((item) => item.member_id === member.id) : null;
    setEditor(
      normalized(
        {
          salary: restricted?.salary?.toString() || '',
          salary_review_date: restricted?.salary_review_date || '',
          gender: restricted?.gender || '',
          gender_detail: restricted?.gender_detail || '',
          has_children: restricted?.has_children || '',
          optional_data_declared: Boolean(
            restricted &&
            (restricted.gender ||
              restricted.has_children ||
              restricted.salary != null ||
              restricted.salary_review_date),
          ),
          status: nextStatus,
          ...(nextStatus === 'leave' && !member.leave_start_date
            ? { leave_start_date: new Date().toISOString().slice(0, 10) }
            : {}),
        },
        member,
      ),
    );
    setEditingId(member.id);
    setError('');
  }
  function payload(draft: TeamMonthDraft) {
    return {
      employee_code: draft.employee_code.trim(),
      full_name: draft.full_name.trim(),
      work_email: draft.work_email || null,
      work_phone: draft.work_phone || null,
      admission_date: draft.admission_date,
      job_title: draft.job_title.trim(),
      seniority: draft.seniority || null,
      department: draft.department.trim(),
      team_area: draft.team_area || null,
      manager_code: draft.manager_code || null,
      is_leader: Boolean(draft.is_leader),
      employment_type: draft.employment_type,
      weekly_hours: draft.weekly_hours ?? null,
      work_model: draft.work_model || null,
      location: draft.location || null,
      status: draft.status,
      leave_reason: draft.status === 'leave' ? draft.leave_reason : null,
      leave_start_date: draft.status === 'leave' ? draft.leave_start_date : null,
      expected_return_date: draft.status === 'leave' ? draft.expected_return_date : null,
      termination_date: draft.status === 'terminated' ? draft.termination_date : null,
      termination_initiative: draft.status === 'terminated' ? draft.termination_initiative : null,
      termination_reason:
        draft.status === 'terminated'
          ? terminationReasonValue(
              draft.employment_type === 'clt' ? (draft.termination_code ?? '') : '',
              draft.termination_reason,
            )
          : null,
      notice_type: draft.status === 'terminated' ? draft.notice_type : null,
      ...(draft.optional_data_declared
        ? {
            optional_data_declared: true,
            ...(draft.salary != null && draft.salary !== '' ? { salary: Number(draft.salary) } : {}),
            ...(draft.salary_review_date ? { salary_review_date: draft.salary_review_date } : {}),
            ...(draft.gender
              ? {
                  gender: draft.gender,
                  gender_detail: draft.gender === 'other' ? draft.gender_detail || null : null,
                }
              : {}),
            ...(draft.has_children ? { has_children: draft.has_children } : {}),
          }
        : {}),
    };
  }
  async function saveRows(rows: Draft[], success: string) {
    if (!companyId) return;
    setSaving(true);
    setError('');
    try {
      await saveTeamMembers(companyId, `${activeMonth}-01`, rows.map(payload));
      await loadTeam(companyId);
      setEditor(null);
      setImportRows([]);
      setImportOpen(false);
      setMonth(activeMonth);
      setNotice(success);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }
  function saveEditor(event: FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    if (editor.status === 'leave' && (!editor.leave_reason || !editor.leave_start_date)) {
      setError('Informe o motivo e a data de início das férias ou do afastamento.');
      return;
    }
    if (editor.status === 'terminated' && !editor.termination_date) {
      setError('Informe a data do desligamento.');
      return;
    }
    if (
      (editor.gender || editor.has_children || editor.salary || editor.salary_review_date) &&
      !editor.optional_data_declared
    ) {
      setError('Confirme a origem autorizada dos dados opcionais antes de salvar.');
      return;
    }
    if (editor.gender === 'other' && editor.gender_detail.length > 120) {
      setError('A identificação de gênero deve ter até 120 caracteres.');
      return;
    }
    const employeeCode = editor.employee_code.trim() || `CALI-${crypto.randomUUID().toUpperCase()}`;
    const row = { ...editor, employee_code: employeeCode };
    // Preserve o código se a gravação for concluída sem que a resposta chegue ao navegador.
    setEditor(row);
    void saveRows([row], editingId ? 'Ficha atualizada.' : 'Colaborador cadastrado.');
  }
  async function archiveMember() {
    if (!removeMember || !companyId) return;
    setSaving(true);
    setError('');
    try {
      await archiveTeamMember(companyId, removeMember.id);
      setRemoveMember(null);
      setDetail(null);
      await loadTeam(companyId);
      setNotice('Ficha removida da equipe atual. O histórico foi preservado.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }
  async function readCsv(file: File) {
    setImportOpen(true);
    setImportError('');
    setImportRows([]);
    setImportFileName(file.name);
    setImportBusy(true);
    if (file.size > 1_000_000) {
      setImportError('A planilha deve ter até 1 MB.');
      setImportBusy(false);
      return;
    }
    try {
      const lines = csvCells((await file.text()).replace(/^\ufeff/, ''));
      if (lines.length < 2) throw new Error('A planilha está vazia.');
      const originalHeader = lines[0];
      const header = originalHeader.map(csvHeaderKey);
      const unknown = originalHeader.filter((_, index) => !header[index]);
      if (unknown.length)
        throw new Error(`Coluna não reconhecida: ${unknown.join(', ')}. Baixe o modelo atualizado em português.`);
      if (new Set(header).size !== header.length)
        throw new Error('Há colunas repetidas ou equivalentes na planilha.');
      for (const required of ['employee_code', 'full_name', 'admission_date', 'job_title', 'department'])
        if (!header.includes(required))
          throw new Error(
            `Falta a coluna obrigatória ${csvColumns.find(([, key]) => key === required)?.[0] || required}.`,
          );
      if (lines.length > 2001) throw new Error('Envie no máximo 2000 colaboradores.');
      const seen = new Set<string>();
      const rows = lines.slice(1).map((cells, i) => {
        const line = i + 2;
        const data = Object.fromEntries(header.map((key, j) => [key, cells[j] || '']));
        const code = String(data.employee_code || '').trim();
        if (!code || seen.has(code)) throw new Error(`Código ausente ou repetido na linha ${line}.`);
        seen.add(code);
        const existing = members.find((member) => member.employee_code === code);
        const optional: Partial<Draft> = {};
        if (header.includes('seniority')) optional.seniority = data.seniority || null;
        if (header.includes('team_area')) optional.team_area = data.team_area || null;
        if (header.includes('is_leader')) optional.is_leader = csvYes(data.is_leader || '');
        if (header.includes('work_model'))
          optional.work_model =
            csvWorkModel[(data.work_model || '').toLocaleLowerCase('pt-BR')] || data.work_model || null;
        if (header.includes('location')) optional.location = data.location || null;
        if (header.includes('manager_code')) optional.manager_code = data.manager_code || null;
        if (header.includes('weekly_hours'))
          optional.weekly_hours = data.weekly_hours ? Number(String(data.weekly_hours).replace(',', '.')) : null;
        if (header.includes('work_email')) optional.work_email = data.work_email || null;
        if (header.includes('work_phone')) optional.work_phone = data.work_phone || null;
        if (header.includes('employment_type'))
          optional.employment_type =
            csvEmploymentType[(data.employment_type || '').toLocaleLowerCase('pt-BR')] ||
            data.employment_type.toLowerCase() ||
            existing?.employment_type ||
            'clt';
        if (header.includes('leave_reason'))
          optional.leave_reason =
            csvLeaveReason[(data.leave_reason || '').toLocaleLowerCase('pt-BR')] || data.leave_reason || null;
        if (header.includes('leave_start_date'))
          optional.leave_start_date =
            normalizeCsvDate(data.leave_start_date || '', 'data de início do afastamento', line) || null;
        if (header.includes('expected_return_date'))
          optional.expected_return_date =
            normalizeCsvDate(data.expected_return_date || '', 'previsão de retorno', line) || null;
        if (header.includes('termination_date'))
          optional.termination_date =
            normalizeCsvDate(data.termination_date || '', 'data de desligamento', line) || null;
        if (header.includes('termination_initiative'))
          optional.termination_initiative =
            csvTerminationInitiative[(data.termination_initiative || '').toLocaleLowerCase('pt-BR')] ||
            data.termination_initiative ||
            null;
        if (header.includes('termination_code')) {
          const value = (data.termination_code || '').trim();
          const code = value ? value.padStart(2, '0') : '';
          const reason = terminationCodes.find((item) => item.code === code);
          if (code && !reason) throw new Error(`Código eSocial inválido na linha ${line}.`);
          optional.termination_code = code;
          if (reason) optional.termination_initiative = reason.initiative;
        }
        if (header.includes('termination_reason')) optional.termination_reason = data.termination_reason || null;
        if (header.includes('notice_type'))
          optional.notice_type =
            csvNoticeType[(data.notice_type || '').toLocaleLowerCase('pt-BR')] || data.notice_type || null;
        if (header.includes('salary')) optional.salary = csvMoney(data.salary || '');
        if (header.includes('salary_review_date'))
          optional.salary_review_date = normalizeCsvDate(
            data.salary_review_date || '',
            'data da última revisão salarial',
            line,
          );
        if (header.includes('gender'))
          optional.gender = csvGender[(data.gender || '').toLocaleLowerCase('pt-BR')] ?? data.gender;
        if (header.includes('gender_detail')) optional.gender_detail = data.gender_detail || '';
        if (header.includes('has_children'))
          optional.has_children =
            csvHasChildren[(data.has_children || '').toLocaleLowerCase('pt-BR')] ?? data.has_children;
        if (header.includes('optional_data_declared'))
          optional.optional_data_declared = csvYes(data.optional_data_declared || '');
        const mappedStatus = csvStatus[(data.status || '').toLocaleLowerCase('pt-BR')] || data.status;
        const admission = normalizeCsvDate(data.admission_date || '', 'data de admissão', line);
        const merged = normalized(
          {
            employee_code: code,
            full_name: data.full_name,
            admission_date: admission,
            job_title: data.job_title,
            department: data.department,
            status: (mappedStatus || existing?.status || 'active') as Draft['status'],
            ...optional,
          },
          existing,
        );
        if (
          !merged.full_name ||
          !merged.job_title ||
          !merged.department ||
          !merged.admission_date ||
          !Number.isFinite(Number(merged.weekly_hours ?? 0))
        )
          throw new Error(`Confira a linha ${line}: nome, data, cargo, departamento ou jornada.`);
        if (merged.status === 'leave' && (!merged.leave_reason || !merged.leave_start_date))
          throw new Error(`A linha ${line} está afastada/férias: informe motivo e data de início.`);
        if (merged.status === 'terminated' && !merged.termination_date)
          throw new Error(`A linha ${line} precisa da data de desligamento.`);
        const hasOptional = Boolean(
          merged.gender || merged.has_children || merged.salary || merged.salary_review_date,
        );
        if (hasOptional && !merged.optional_data_declared)
          throw new Error(
            `A linha ${line} contém gênero, filhos ou remuneração. Marque origem_dados_opcionais_confirmada como Sim.`,
          );
        return merged;
      });
      setImportRows(rows);
    } catch (err) {
      setImportError(errorText(err));
    } finally {
      setImportBusy(false);
    }
  }
  const importAdded =
    importRows.filter((row) => !members.some((m) => m.employee_code === row.employee_code)).length || 0;
  const importChanged =
    importRows.filter((row) => {
      const old = members.find((m) => m.employee_code === row.employee_code);
      if (!old) return false;
      const next = payload(row);
      return Object.keys(next).some(
        (key) =>
          key !== 'optional_data_declared' &&
          key !== 'gender' &&
          key !== 'has_children' &&
          key !== 'salary' &&
          key !== 'gender_detail' &&
          String(next[key as keyof typeof next] ?? '') !== String(old[key as keyof Member] ?? ''),
      );
    }).length || 0;
  const importMissing = importRows.length
    ? members.filter((m) => !m.archived_at && !importRows.some((row) => row.employee_code === m.employee_code))
        .length
    : 0;
  // PDF dos indicadores (15/10): por seção, com as Leituras; os seis indicadores essenciais saem um abaixo do outro.
  function printIndicators() {
    setPrintingIndicators(true);
    window.setTimeout(() => {
      const done = () => {
        document.body.classList.remove('pa-printing');
        setPrintingIndicators(false);
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      document.body.classList.add('pa-printing');
      window.print();
    }, 350);
  }
  function printReport() {
    document.body.classList.add('team-printing');
    window.print();
    window.setTimeout(() => document.body.classList.remove('team-printing'), 500);
  }
  const analytics = admin || selectedCompany?.service_plan === 'full' || analyticsFront;
  // Comparativo dos indicadores essenciais: mês anterior, mesmo mês do ano anterior ou um mês confirmado à escolha.
  const shiftMonth = (value: string, delta: number) => {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1 + delta, 15).toISOString().slice(0, 7);
  };
  const cmpMonth =
    cmpMode === 'prev' ? shiftMonth(month, -1) : cmpMode === 'year' ? shiftMonth(month, -12) : cmpMode;
  const cmpPoint = series.find((point) => point.month === cmpMonth) || null;
  const internalMoves = (value: string) =>
    changes.filter(
      (item) =>
        ['promotion', 'transfer', 'manager_change'].includes(item.change_type) &&
        item.reference_month.slice(0, 7) === value,
    ).length;
  const currentValues: Record<string, number> = {
    'Quadro ativo': activeCount,
    Admissões: admitted,
    Desligamentos: exits,
    'Variação líquida': admitted - exits,
    'Rotatividade no período': activeCount ? (exits / activeCount) * 100 : 0,
    'Movimentações internas': internalMoves(month),
  };
  const compareValues: Record<string, number> | null = cmpPoint
    ? {
        'Quadro ativo': cmpPoint.active,
        Admissões: cmpPoint.admissions,
        Desligamentos: cmpPoint.exits,
        'Variação líquida': cmpPoint.admissions - cmpPoint.exits,
        'Rotatividade no período': cmpPoint.active ? (cmpPoint.exits / cmpPoint.active) * 100 : 0,
        'Movimentações internas': internalMoves(cmpMonth),
      }
    : null;
  const cmpLabel = (() => {
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
      .format(new Date(`${cmpMonth}-15T12:00:00`))
      .replace('.', '')
      .replace(' de ', '/');
    return name;
  })();
  // Dados lançados por mês (ausências, horas extras, quadro aprovado, clima).
  const metricOf = (value: string) => metrics.find((item) => item.reference_month.slice(0, 7) === value) || null;
  const absenceOf = (item: MonthMetric | null) =>
    item
      ? (item.absence_medical_hours || 0) +
        (item.absence_leave_hours || 0) +
        (item.absence_unjustified_hours || 0) +
        (item.absence_accident_hours || 0)
      : 0;
  const absenteeism = (item: MonthMetric | null) =>
    item && item.planned_hours ? (absenceOf(item) / item.planned_hours) * 100 : null;
  const monthMetric = metricOf(month),
    cmpMetric = metricOf(cmpMonth);
  const canWriteMetrics = !staff && (admin ? Boolean(monthMetric) : !monthMetric);
  const num = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')));
  function openMetrics() {
    if (!canWriteMetrics) return;
    metricRequest.current = undefined;
    const item = monthMetric;
    const text = (value: number | null | undefined) => (value == null ? '' : String(value).replace('.', ','));
    setMetricDraft({
      planned: text(item?.planned_hours),
      medical: text(item?.absence_medical_hours),
      leave: text(item?.absence_leave_hours),
      unjustified: text(item?.absence_unjustified_hours),
      accident: text(item?.absence_accident_hours),
      overtime: text(item?.overtime_hours),
      bank: text(item?.hour_bank_balance),
      enps: text(item?.enps_score),
      climate: text(item?.climate_score),
      participation: text(item?.climate_participation),
      notes: item?.notes || '',
      reason: '',
      expectedAt: item?.updated_at ?? null,
      approved: Object.fromEntries(departments.map((name) => [name, text(item?.approved_headcount?.[name])])),
    });
    setError('');
  }
  async function saveMetrics(event: FormEvent) {
    event.preventDefault();
    if (!companyId || !metricDraft || !canWriteMetrics || saving) return;
    const {
      planned,
      medical,
      leave,
      unjustified,
      accident,
      overtime,
      bank,
      enps,
      climate,
      participation,
      notes,
      approved,
      reason,
    } = metricDraft;
    const approvalEntries = Object.entries(approved).flatMap(([department, value]) => {
      const count = num(value);
      return count === null ? [] : [[department, count] as const];
    });
    const input: TeamMetricsWrite = {
      companyId,
      month: `${month}-01`,
      expectedAt: metricDraft.expectedAt,
      reason: admin ? reason.trim() : null,
      fields: {
        planned_hours: num(planned),
        absence_medical_hours: num(medical),
        absence_leave_hours: num(leave),
        absence_unjustified_hours: num(unjustified),
        absence_accident_hours: num(accident),
        overtime_hours: num(overtime),
        hour_bank_balance: num(bank),
        enps_score: num(enps),
        climate_score: num(climate),
        climate_participation: num(participation),
        approved_headcount: Object.fromEntries(approvalEntries),
        notes: notes.trim() || null,
      },
    };
    const values = [
      planned,
      medical,
      leave,
      unjustified,
      accident,
      overtime,
      bank,
      enps,
      climate,
      participation,
      ...Object.values(approved),
    ].map(num);
    if (values.some((value) => value !== null && !Number.isFinite(value))) {
      setError('Use apenas números nos campos de horas, quadro e pesquisa.');
      return;
    }

    const key = JSON.stringify(input);
    if (metricRequest.current?.key !== key) metricRequest.current = { key, id: crypto.randomUUID() };
    setSaving(true);
    setError('');
    try {
      await writeTeamMetrics(input, metricRequest.current.id);
      setMetricDraft(null);
      setNotice(`Dados de ${monthLabel(month)} ${admin ? 'corrigidos' : 'gravados'}.`);
      await loadMetrics();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setSaving(false);
    }
  }
  const metricDelta = (current: number | null, previous: number | null, unit: string) => {
    if (periodMode) return null;
    if (current == null) return null;
    if (previous == null) return null;
    const diff = current - previous;
    return (
      <em
        className={`tw:my-0.5 tw:inline-flex tw:w-fit tw:items-center tw:gap-1.25 tw:self-start tw:rounded-[0.3125rem] tw:px-2 tw:py-1 tw:text-[0.625rem] tw:font-bold tw:not-italic ${diff > 0 ? 'tw:bg-[#e8f2fa] tw:text-[#3e83aa]' : diff < 0 ? 'tw:bg-[#f1eaff] tw:text-[#8055a5]' : 'tw:bg-[#f4eee8] tw:text-[#857870]'}`}
      >
        {diff > 0 ? '▲' : diff < 0 ? '▼' : '='}{' '}
        {diff === 0 ? 'igual a' : `${Math.abs(diff).toFixed(1).replace('.', ',')}${unit} vs.`} {cmpLabel}
      </em>
    );
  };
  const delta = (label: string) => {
    if (periodMode || !confirmed) return null;
    if (!compareValues) return null;
    const diff = currentValues[label] - compareValues[label];
    const percent = label === 'Rotatividade no período';
    const text = percent
      ? `${Math.abs(diff).toFixed(1).replace('.', ',')} p.p.`
      : String(Math.abs(Math.round(diff)));
    return (
      <em
        className={`tw:my-0.5 tw:inline-flex tw:w-fit tw:items-center tw:gap-1.25 tw:self-start tw:rounded-[0.3125rem] tw:px-2 tw:py-1 tw:text-[0.625rem] tw:font-bold tw:not-italic ${diff > 0 ? 'tw:bg-[#e8f2fa] tw:text-[#3e83aa]' : diff < 0 ? 'tw:bg-[#f1eaff] tw:text-[#8055a5]' : 'tw:bg-[#f4eee8] tw:text-[#857870]'}`}
      >
        {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {diff === 0 ? 'igual a' : text + ' vs.'} {cmpLabel}
      </em>
    );
  };
  const spark = (label: string) => {
    const key = sparkFields[label];
    const points = series.filter((point) => point.month <= month).slice(-12);
    if (!key || points.length < 2) return null;
    const peak = Math.max(1, ...points.map((point) => point[key]));
    return (
      <span
        className="tw:mt-1.5 tw:mb-0.5 tw:flex tw:h-6.5 tw:items-end tw:gap-0.75 tw:[&_i]:max-w-3 tw:[&_i]:flex-1 tw:[&_i]:rounded-t-[0.125rem] tw:[&_i]:bg-[#e3d6cc] tw:[&_i.cmp]:bg-cali-gold tw:[&_i.now]:bg-cali-brand"
        role="img"
        aria-label={`${label} nos últimos ${points.length} meses confirmados: ${points.map((point) => `${point.month} ${point[key]}`).join(', ')}`}
      >
        {points.map((point) => (
          <i
            key={point.month}
            title={`${monthLabel(point.month)}: ${point[key]}`}
            className={point.month === month ? 'now' : point.month === cmpMonth ? 'cmp' : ''}
            style={{ height: `${Math.max(8, (point[key] / peak) * 100)}%` }}
          />
        ))}
      </span>
    );
  };
  const page = (
    <div className="v2-client-module">
      {
        <div className="page-head">
          <div>
            <div className="eyebrow">EMPRESA / CAPITAL HUMANO</div>
            <h1>
              Equipe<span className="title-dot">.</span>
            </h1>
            <p>Quadro, estrutura, movimentações e indicadores em um mesmo contexto.</p>
          </div>
          {isCurrent && !staff && (
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.5">
              <button
                className="outline-button"
                onClick={() => {
                  setImportRows([]);
                  setImportFileName('');
                  setImportError('');
                  setImportOpen(true);
                }}
              >
                <FileUp size={15} /> Cadastrar todos via planilha
              </button>
              <button className="primary-button" onClick={() => openEdit()}>
                <Plus size={15} />
                Adicionar pessoa
              </button>
            </div>
          )}
        </div>
      }
      {
        <div className="section-tabs">
          <button
            className={tab === 'people' && viewKind === 'list' ? 'current' : ''}
            onClick={() => {
              setTab('people');
              setViewKind('list');
            }}
          >
            Diretório
          </button>
          <button
            className={tab === 'people' && viewKind === 'leaders' ? 'current' : ''}
            onClick={() => {
              setTab('people');
              setViewKind('leaders');
            }}
          >
            Estrutura
          </button>
          <button className={tab === 'changes' ? 'current' : ''} onClick={() => setTab('changes')}>
            Movimentações
          </button>
          <button className={tab === 'indicators' ? 'current' : ''} onClick={() => setTab('indicators')}>
            Indicadores
          </button>
        </div>
      }
      {
        <div className="context-strip">
          {(admin || staff) && (
            <>
              <label className="tw:m-0 tw:inline-flex tw:items-center tw:gap-2.25 tw:text-[0.6875rem] tw:text-[#8c7e74] tw:[&_select]:max-w-60 tw:[&_select]:rounded-[0.4375rem] tw:[&_select]:border tw:[&_select]:border-solid tw:[&_select]:border-[#e5d9d0] tw:[&_select]:bg-white tw:[&_select]:px-2.5 tw:[&_select]:py-1.75 tw:[&_select]:font-bold tw:[&_select]:text-cali-brand">
                <span>Empresa</span>
                <select aria-label="Empresa" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  {companies.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="context-sep" />
            </>
          )}
          <span>
            <Users size={15} />
            <strong>{visibleMembers.filter((item) => item.status === 'active').length}</strong> pessoas ativas
          </span>
          <span className="context-sep" />
          <span>
            <strong>{departments.length}</strong> {departments.length === 1 ? 'departamento' : 'departamentos'}
          </span>
          <span className="context-sep" />
          <span className="tw:inline-flex tw:flex-none tw:items-center tw:gap-1.75 tw:whitespace-nowrap tw:[&_input]:rounded-md tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-[#e7ddd5] tw:[&_input]:bg-white tw:[&_input]:px-1.75 tw:[&_input]:py-1 tw:[&_input]:font-bold tw:[&_input]:text-[#322f2c]">
            Referência{' '}
            {periodMode ? (
              <>
                <input
                  type="month"
                  aria-label="De"
                  value={periodStart}
                  max={periodEnd}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />{' '}
                a{' '}
                <input
                  type="month"
                  aria-label="Até"
                  value={periodEnd}
                  min={periodStart}
                  max={activeMonth}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                    setMonth(e.target.value);
                  }}
                />
              </>
            ) : (
              <input
                type="month"
                aria-label="Mês de referência"
                value={month}
                max={activeMonth}
                onChange={(e) => setMonth(e.target.value)}
              />
            )}
          </span>
          <span
            className="tw:ml-1 tw:inline-flex tw:flex-none tw:overflow-hidden tw:rounded-md tw:border tw:border-solid tw:border-[#e7ddd5] tw:[&_button]:whitespace-nowrap tw:[&_button]:rounded-[0.3125rem] tw:[&_button]:border-0 tw:[&_button]:bg-white tw:[&_button]:px-2.25 tw:[&_button]:py-1.25 tw:[&_button]:text-[0.625rem] tw:[&_button]:text-[#8b7f77] tw:[&_button[aria-pressed=true]]:bg-cali-brand tw:[&_button[aria-pressed=true]]:text-white"
            role="group"
            aria-label="Filtrar por mês ou período"
          >
            <button aria-pressed={!periodMode} onClick={() => setPeriodMode(false)}>
              Mês
            </button>
            <button aria-pressed={periodMode} onClick={() => setPeriodMode(true)}>
              Período
            </button>
          </span>
          <span className="context-end">
            {selectedCompany?.display_name} · {confirmed ? 'mês confirmado' : 'confirmação mensal pendente'}
          </span>
          {tab === 'indicators' && (
            <button
              type="button"
              className="outline-button tw:ml-3 tw:inline-flex tw:items-center tw:gap-1.5 tw:whitespace-nowrap"
              onClick={printIndicators}
            >
              <Download size={14} /> Baixar PDF
            </button>
          )}
        </div>
      }
      {!admin && !staff && <GestaoBanner />}
      {error && (
        <div
          className="team-alert tw:mb-3.75 tw:flex tw:justify-between tw:gap-3 tw:rounded-[0.5625rem] tw:bg-[#fce9e8] tw:px-3.75 tw:py-3 tw:text-[0.83rem] tw:text-[#812f34] tw:workspace-night:bg-[#4a2631] tw:workspace-night:text-[#ffd9df]"
          role="alert"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          className="team-alert tw:mb-3.75 tw:flex tw:justify-between tw:gap-3 tw:rounded-[0.5625rem] tw:bg-[#e8f4e9] tw:px-3.75 tw:py-3 tw:text-[0.83rem] tw:text-[#246149] tw:workspace-night:bg-[#244333] tw:workspace-night:text-[#d8f6e4]"
          role="status"
        >
          {notice}
          <button
            type="button"
            className="tw:border-0 tw:bg-transparent tw:text-inherit"
            onClick={() => setNotice('')}
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {loading ? (
        <LoadingState>Carregando equipe</LoadingState>
      ) : (
        <>
          {tab === 'people' &&
            viewKind === 'list' &&
            (isCurrent || (!periodMode && (month === activeMonth || month === priorMonth) && !reviewed)) && (
              <div className="tw:mt-4 tw:mb-5.5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
                {!admin &&
                  !staff &&
                  !periodMode &&
                  (month === activeMonth || month === priorMonth) &&
                  !reviewed && (
                    <div className="tw:flex tw:flex-1 tw:items-center tw:justify-between tw:gap-3.75 tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[var(--v2-line-ecd7b7,#ecd7b7)] tw:bg-[var(--v2-surface-fff9ec,#fff9ec)] tw:px-4.5 tw:py-3.75 tw:text-xs tw:max-[34.375rem]:flex-wrap tw:[&_strong]:mt-1.25 tw:[&_strong]:block tw:[&_p]:text-[0.625rem] tw:[&_p]:text-[var(--v2-text-a4896a,#a4896a)]">
                      <div>
                        <span className="tw:block tw:font-cali-body tw:text-[0.5625rem]/[1.3] tw:font-extrabold tw:tracking-[0.12em] tw:text-cali-gold">
                          ACOMPANHAMENTO MENSAL
                        </span>
                        <strong>Hora de atualizar o quadro!</strong>
                        <p>{monthLabel(month)} · Confira as movimentações ou confirme que nada mudou.</p>
                      </div>
                      <TeamAction location="page" onClick={() => setReviewOpen(true)}>
                        Atualizar <ArrowRight size={17} />
                      </TeamAction>
                    </div>
                  )}
              </div>
            )}

          {tab === 'people' && viewKind === 'leaders' && (
            <TeamOrganization
              companyName={selectedCompany?.display_name || 'Empresa'}
              departments={departments}
              visibleMembers={visibleMembers}
              members={members}
              changes={changes}
              month={month}
              orgArea={orgArea}
              showFormer={showFormer}
              onSelectArea={setOrgArea}
              onShowFormer={setShowFormer}
              onOpenMember={showDetail}
            />
          )}
          {tab === 'people' && viewKind === 'list' && (
            <TeamDirectory
              search={search}
              department={department}
              status={status}
              departments={departments}
              columns={columns}
              columnOpen={columnOpen}
              filtered={filtered}
              hasMembers={visibleMembers.length > 0}
              onSearch={setSearch}
              onDepartment={setDepartment}
              onStatus={setStatus}
              onColumnMenuToggle={() => setColumnOpen(!columnOpen)}
              onColumnToggle={toggleColumn}
              onPrint={printReport}
              onOpenMember={showDetail}
              renderCell={(member, key) => columnContent(member, key, memberMap)}
            />
          )}
          {tab === 'changes' && (
            <div className="panel list-page">
              <div className="section-head">
                <h2>Movimentações registradas</h2>
                <span className="small-counter">{monthLabel(month)}</span>
              </div>
              {monthChanges.length ? (
                monthChanges.map((change) => {
                  const member = members.find((m) => m.id === change.member_id);
                  const effective =
                    change.change_type === 'admission'
                      ? String(change.after_state?.admission_date || '')
                      : change.change_type === 'termination'
                        ? String(change.after_state?.termination_date || '')
                        : '';
                  return (
                    <div
                      key={change.id}
                      className="tw:grid tw:grid-cols-[4.375rem_6.875rem_1fr_2fr] tw:items-center tw:gap-3.75 tw:border-t tw:border-solid tw:border-[#eee9e4] tw:px-3 tw:py-4 tw:text-[0.6875rem] tw:[&_time]:text-[#aa9c8f] tw:max-[50rem]:grid-cols-[3.75rem_5rem_1fr] tw:max-[50rem]:[&>span:last-child]:hidden"
                    >
                      <time title={`Registrada em ${dateLabel(change.created_at)}`}>
                        {dateLabel(effective || change.created_at)}
                      </time>
                      <span className="chip neutral">{changeLabels[change.change_type] || 'Atualização'}</span>
                      <strong>{member?.full_name || 'Pessoa da equipe'}</strong>
                      <span>{changeDetails(change)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="empty">
                  Nenhuma movimentação registrada. As mudanças aparecerão aqui depois da atualização do mês.
                </div>
              )}
              <p className="soft-note">
                Alterações registradas na equipe: o que mudou, quando aconteceu e quando foi registrado.
              </p>
            </div>
          )}
          {tab === 'indicators' && (
            <div className="tw:[&_.section-head]:flex tw:[&_.section-head]:flex-wrap tw:[&_.section-head]:items-center tw:[&_.section-head]:justify-between tw:[&_.section-head]:gap-4 tw:[&_.soft-note]:mt-4.5">
              <div className="pa-print-head tw:hidden" aria-hidden="true">
                <small>CALI WORKSPACE · INDICADORES DE PESSOAS</small>
                <h1>{selectedCompany?.display_name || 'Empresa'}</h1>
                <p>
                  {periodMode
                    ? `Período: ${monthLabel(periodStart)} a ${monthLabel(periodEnd)}`
                    : `Mês de referência: ${monthLabel(month)}`}{' '}
                  · {confirmed ? 'mês confirmado' : 'confirmação mensal pendente'} · gerado em{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="section-head">
                <div>
                  <h2>Panorama da força de trabalho</h2>
                  <p>
                    {admin
                      ? 'Headcount, movimentação e composição do quadro'
                      : 'Indicadores essenciais · incluídos no contrato da sua empresa'}
                  </p>
                </div>
                {!periodMode && (
                  <label className="v2-compare tw:m-0 tw:inline-flex tw:items-center tw:gap-2.25 tw:text-[0.6875rem] tw:text-[#8c7e74] tw:[&_select]:rounded-[0.4375rem] tw:[&_select]:border tw:[&_select]:border-solid tw:[&_select]:border-[#e5d9d0] tw:[&_select]:bg-white tw:[&_select]:px-2.5 tw:[&_select]:py-1.75 tw:[&_select]:font-bold tw:[&_select]:text-cali-brand tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#978579]">
                    Comparar com
                    <select value={cmpMode} onChange={(e) => setCmpMode(e.target.value)}>
                      <option value="prev">Mês anterior</option>
                      <option value="year">Mesmo mês do ano anterior</option>
                      {series
                        .filter((point) => point.month !== month)
                        .slice()
                        .reverse()
                        .map((point) => (
                          <option key={point.month} value={point.month}>
                            {monthLabel(point.month)}
                          </option>
                        ))}
                    </select>
                    {confirmed && !compareValues && <small>{cmpLabel} não foi confirmado: sem comparativo.</small>}
                  </label>
                )}
              </div>
              <div className="metric-strip tw:mb-4.5 tw:grid tw:grid-cols-4 tw:border-y tw:border-solid tw:border-[#ddd3cb] tw:bg-[#faf8f5] tw:max-[50rem]:grid-cols-2 tw:[&>div]:relative tw:[&>div]:flex tw:[&>div]:flex-col tw:[&>div]:gap-2 tw:[&>div]:border-r tw:[&>div]:border-solid tw:[&>div]:border-[#e8dfd8] tw:[&>div]:p-5.5 tw:[&>div:last-child]:border-0 tw:[&>div]:before:absolute tw:[&>div]:before:inset-x-0 tw:[&>div]:before:top-0 tw:[&>div]:before:h-0.5 tw:[&>div]:before:bg-[#bd9174] tw:[&_div.m-green]:before:bg-[#55b68a] tw:[&_div.m-blue]:before:bg-[#76aecf] tw:[&_div.m-red]:before:bg-[#d66c81] tw:[&_div.m-purple]:before:bg-[#9a80c4] tw:[&_span]:text-[0.6875rem] tw:[&_span]:text-[#a4978d] tw:[&_strong]:font-cali-body tw:[&_strong]:text-2xl tw:[&_strong]:text-[#592535] tw:[&_p]:mt-2.5 tw:[&_p]:mb-1.5 tw:[&_p]:text-[0.625rem]/[1.45] tw:[&_p]:text-[#8b7c73] tw:[&>div>small]:text-[0.625rem] tw:[&>div>small]:text-[#78535b]">
                {[
                  [
                    'Quadro ativo',
                    confirmed ? String(activeCount) : '—',
                    'Pessoas com vínculo ativo no fechamento',
                    confirmed ? 'Referência confirmada' : 'Aguardando confirmação do mês',
                    'm-green',
                  ],
                  [
                    'Admissões',
                    confirmed ? String(admitted).padStart(2, '0') : '—',
                    'Entradas registradas neste período',
                    'Pela data efetiva de admissão',
                    'm-blue',
                  ],
                  [
                    'Desligamentos',
                    confirmed ? String(exits).padStart(2, '0') : '—',
                    'Saídas registradas no período',
                    'Pela data efetiva de desligamento',
                    'm-red',
                  ],
                  [
                    'Variação líquida',
                    confirmed
                      ? `${admitted - exits > 0 ? '+' : admitted - exits < 0 ? '−' : ''}${String(Math.abs(admitted - exits)).padStart(2, '0')}`
                      : '—',
                    'Admissões menos desligamentos',
                    'Não é o turnover: a rotatividade está no cartão abaixo',
                    'm-purple',
                  ],
                ].map(([label, value, meaning, note, tone]) => (
                  <div className={tone} key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    {delta(label)}
                    {spark(label)}
                    <p>{meaning}</p>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              {(() => {
                const tenureMonths = (item: Member) => {
                  const start = new Date(`${item.admission_date}T12:00:00`);
                  const now = new Date();
                  return Math.max(
                    0,
                    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth(),
                  );
                };
                const working = visibleMembers.filter((item) => item.status === 'active');
                const average = working.length
                  ? Math.round(working.reduce((sum, item) => sum + tenureMonths(item), 0) / working.length)
                  : null;
                const promotions = monthChanges.filter((item) => item.change_type === 'promotion').length;
                const transfers = monthChanges.filter(
                  (item) => item.change_type === 'transfer' || item.change_type === 'manager_change',
                ).length;
                return (
                  <div className="tw:mt-4.5 tw:mb-4">
                    <div className="tw:mt-4 tw:mb-3.75 tw:grid tw:grid-cols-5 tw:gap-3 tw:max-[73.75rem]:grid-cols-3 tw:max-[43.75rem]:grid-cols-1">
                      <div
                        className="ie-insight tw:flex tw:flex-col tw:gap-2 tw:rounded-[0.4375rem] tw:border tw:border-t-[0.1875rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-4.5 tw:[&>span]:text-[0.6875rem] tw:[&>span]:text-[#8d817b] tw:[&_strong]:text-[1.4375rem] tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.6875rem] tw:[&_p]:font-bold tw:[&_p]:text-[#665c58] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a1948a]"
                        style={{ borderTopColor: '#e76f7b' }}
                      >
                        <span>Rotatividade no período</span>
                        <strong>
                          {confirmed && activeCount
                            ? `${((exits / activeCount) * 100).toFixed(1).replace('.', ',')}%`
                            : '—'}
                        </strong>
                        <p>Saídas do mês ÷ quadro ativo</p>
                        <small>Indicador sujeito à regra de cálculo aprovada</small>
                        {delta('Rotatividade no período')}
                      </div>
                      <div
                        className="ie-insight tw:flex tw:flex-col tw:gap-2 tw:rounded-[0.4375rem] tw:border tw:border-t-[0.1875rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-4.5 tw:[&>span]:text-[0.6875rem] tw:[&>span]:text-[#8d817b] tw:[&_strong]:text-[1.4375rem] tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.6875rem] tw:[&_p]:font-bold tw:[&_p]:text-[#665c58] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a1948a]"
                        style={{ borderTopColor: '#53b595' }}
                      >
                        <span>Permanência média</span>
                        <strong>{average == null ? '—' : `${Math.floor(average / 12)}a ${average % 12}m`}</strong>
                        <p>Tempo médio de vínculo ativo</p>
                        <small>Pessoas ativas nesta referência</small>
                      </div>
                      <div
                        className="ie-insight tw:flex tw:flex-col tw:gap-2 tw:rounded-[0.4375rem] tw:border tw:border-t-[0.1875rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-4.5 tw:[&>span]:text-[0.6875rem] tw:[&>span]:text-[#8d817b] tw:[&_strong]:text-[1.4375rem] tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.6875rem] tw:[&_p]:font-bold tw:[&_p]:text-[#665c58] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a1948a]"
                        style={{ borderTopColor: '#a38bd9' }}
                      >
                        <span>Movimentações internas</span>
                        <strong>{String(promotions + transfers).padStart(2, '0')}</strong>
                        <p>
                          {promotions} {promotions === 1 ? 'promoção' : 'promoções'} · {transfers}{' '}
                          {transfers === 1 ? 'mudança de área ou gestor' : 'mudanças de área ou gestor'}
                        </p>
                        <small>Não altera o headcount</small>
                        {delta('Movimentações internas')}
                      </div>
                      <div
                        className="ie-insight tw:flex tw:flex-col tw:gap-2 tw:rounded-[0.4375rem] tw:border tw:border-t-[0.1875rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-4.5 tw:[&>span]:text-[0.6875rem] tw:[&>span]:text-[#8d817b] tw:[&_strong]:text-[1.4375rem] tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.6875rem] tw:[&_p]:font-bold tw:[&_p]:text-[#665c58] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a1948a]"
                        style={{ borderTopColor: '#e9a23b' }}
                      >
                        <span>Absenteísmo</span>
                        <strong>
                          {absenteeism(monthMetric) == null
                            ? '—'
                            : `${absenteeism(monthMetric)!.toFixed(1).replace('.', ',')}%`}
                        </strong>
                        <p>
                          {monthMetric?.planned_hours
                            ? `${String(absenceOf(monthMetric)).replace('.', ',')}h de ausência em ${String(monthMetric.planned_hours).replace('.', ',')}h previstas`
                            : 'Horas de ausência ÷ horas previstas'}
                        </p>
                        <small>
                          {monthMetric?.planned_hours
                            ? 'Atestado, licença, falta e acidente'
                            : 'Aguardando o lançamento do mês'}
                        </small>
                        {metricDelta(absenteeism(monthMetric), absenteeism(cmpMetric), ' p.p.')}
                      </div>
                      <div
                        className="ie-insight tw:flex tw:flex-col tw:gap-2 tw:rounded-[0.4375rem] tw:border tw:border-t-[0.1875rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-4.5 tw:[&>span]:text-[0.6875rem] tw:[&>span]:text-[#8d817b] tw:[&_strong]:text-[1.4375rem] tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.6875rem] tw:[&_p]:font-bold tw:[&_p]:text-[#665c58] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a1948a]"
                        style={{ borderTopColor: '#7aafcd' }}
                      >
                        <span>Sinais de clima</span>
                        <strong>
                          {monthMetric?.enps_score == null
                            ? monthMetric?.climate_score == null
                              ? '—'
                              : String(monthMetric.climate_score).replace('.', ',')
                            : `eNPS ${monthMetric.enps_score}`}
                        </strong>
                        <p>
                          {monthMetric?.climate_score == null
                            ? 'Resultado da pesquisa do ciclo'
                            : `Nota de clima ${String(monthMetric.climate_score).replace('.', ',')} de 10${monthMetric.climate_participation == null ? '' : ` · ${String(monthMetric.climate_participation).replace('.', ',')}% de participação`}`}
                        </p>
                        <small>
                          {monthMetric?.enps_score == null && monthMetric?.climate_score == null
                            ? 'Aguardando o lançamento do ciclo'
                            : 'Pesquisa lançada neste mês'}
                        </small>
                        {metricDelta(monthMetric?.enps_score ?? null, cmpMetric?.enps_score ?? null, ' pts')}
                      </div>
                    </div>
                    {!staff && (
                      <div className="v2-month-strip tw:my-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3.5 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:px-4 tw:py-3 tw:text-[0.6875rem] tw:text-[#8c7e74] tw:[&_strong]:text-cali-brand">
                        <span>
                          <strong>Dados de {monthLabel(month)}</strong> ·{' '}
                          {monthMetric ? 'lançados' : 'ainda não lançados'} · ausências, horas extras, quadro
                          aprovado e pesquisa de clima
                        </span>
                        {!periodMode && canWriteMetrics && (
                          <button type="button" className="outline-button" onClick={openMetrics}>
                            {admin ? 'Corrigir dados do mês' : 'Lançar dados do mês'} <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    {(() => {
                      const options: Record<
                        string,
                        { get: (value: string) => number | null; unit: string; hint: string }
                      > = {
                        'Quadro ativo': {
                          get: (value) => series.find((point) => point.month === value)?.active ?? null,
                          unit: '',
                          hint: 'Pessoas ativas no fechamento de cada mês confirmado',
                        },
                        Admissões: {
                          get: (value) => series.find((point) => point.month === value)?.admissions ?? null,
                          unit: '',
                          hint: 'Entradas pela data efetiva de admissão',
                        },
                        Desligamentos: {
                          get: (value) => series.find((point) => point.month === value)?.exits ?? null,
                          unit: '',
                          hint: 'Saídas pela data efetiva de desligamento',
                        },
                        Rotatividade: {
                          get: (value) => {
                            const point = series.find((item) => item.month === value);
                            return point && point.active ? (point.exits / point.active) * 100 : null;
                          },
                          unit: '%',
                          hint: 'Saídas do mês ÷ quadro ativo',
                        },
                        Absenteísmo: {
                          get: (value) => absenteeism(metricOf(value)),
                          unit: '%',
                          hint: 'Horas de ausência ÷ horas previstas',
                        },
                        eNPS: {
                          get: (value) => metricOf(value)?.enps_score ?? null,
                          unit: '',
                          hint: 'Resultado da pesquisa nos meses em que houve ciclo',
                        },
                      };
                      const chart = (name: string) => {
                        const chosen = options[name] || options['Quadro ativo'];
                        const points = series
                          .filter((point) => point.month <= month)
                          .slice(-12)
                          .map((point) => ({ month: point.month, value: chosen.get(point.month) }));
                        const peak = Math.max(1, ...points.map((point) => Math.abs(point.value || 0)));
                        const show = (value: number | null) =>
                          value == null
                            ? '—'
                            : chosen.unit === '%'
                              ? value.toFixed(1).replace('.', ',')
                              : String(Math.round(value));
                        return (
                          <section
                            className="panel v2-ess-chart tw:mb-4 tw:min-w-0 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:px-5.5 tw:py-5 tw:[&>header]:mb-2 tw:[&>header]:flex tw:[&>header]:flex-wrap tw:[&>header]:items-start tw:[&>header]:justify-between tw:[&>header]:gap-4 tw:[&_h3]:mt-0 tw:[&_h3]:mb-1 tw:[&_h3]:text-[0.9375rem] tw:[&_header_p]:m-0 tw:[&_header_p]:text-[0.6875rem] tw:[&_header_p]:text-[#8c7e74] tw:[&_.ie-switch]:flex-wrap"
                            key={name}
                          >
                            <header>
                              <div>
                                <h3>{printingIndicators ? name : 'Evolução dos indicadores essenciais'}</h3>
                                <p>
                                  {chosen.hint} · últimos {points.length}{' '}
                                  {points.length === 1 ? 'mês confirmado' : 'meses confirmados'}
                                </p>
                              </div>
                              <div
                                className="ie-switch tw:flex tw:flex-wrap tw:overflow-hidden tw:rounded-md tw:border tw:border-solid tw:border-[#e9dfd8] tw:[&_button]:border-0 tw:[&_button]:bg-white tw:[&_button]:px-2.5 tw:[&_button]:py-2.25 tw:[&_button]:text-[0.625rem] tw:[&_button]:text-[#897a71] tw:[&_button.on]:bg-cali-brand tw:[&_button.on]:text-white"
                                role="tablist"
                                aria-label="Indicador"
                              >
                                {Object.keys(options).map((name) => (
                                  <button
                                    key={name}
                                    role="tab"
                                    aria-selected={essChart === name}
                                    className={essChart === name ? 'on' : ''}
                                    onClick={() => setEssChart(name)}
                                  >
                                    {name}
                                  </button>
                                ))}
                              </div>
                            </header>
                            {points.some((point) => point.value != null) ? (
                              <div className="mini-chart tw:grid tw:h-[14.875rem] tw:grid-cols-8 tw:items-end tw:gap-5 tw:border-b tw:border-solid tw:border-[#e9e0d8] tw:px-2.5 tw:pt-5 tw:pb-2 tw:[&>div]:flex tw:[&>div]:h-full tw:[&>div]:flex-col tw:[&>div]:items-center tw:[&>div]:justify-end tw:[&>div]:gap-2 tw:[&>div>span:nth-child(2)]:min-h-2.5 tw:[&>div>span:nth-child(2)]:w-[57%] tw:[&>div>span:nth-child(2)]:max-w-12 tw:[&>div>span:nth-child(2)]:rounded-t tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#a5958a]">
                                {points.map((point) => (
                                  <div
                                    key={point.month}
                                    className={
                                      point.month === month
                                        ? 'now'
                                        : point.month === cmpMonth && !periodMode
                                          ? 'cmp'
                                          : ''
                                    }
                                    title={`${monthLabel(point.month)}: ${show(point.value)}${point.value == null ? '' : chosen.unit}`}
                                  >
                                    <span className="tw:text-[0.625rem] tw:font-bold tw:text-cali-brand">
                                      {show(point.value)}
                                    </span>
                                    <span
                                      className={
                                        point.month === month
                                          ? 'tw:bg-cali-brand!'
                                          : point.month === cmpMonth && !periodMode
                                            ? 'tw:bg-cali-gold!'
                                            : 'tw:bg-[#dccdc3]!'
                                      }
                                      style={{ height: `${(Math.abs(point.value || 0) / peak) * 100}%` }}
                                    />
                                    <small>
                                      {point.month.slice(5)}/{point.month.slice(2, 4)}
                                    </small>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="tw:grid tw:h-[10.3125rem] tw:place-items-center tw:text-center tw:text-[0.79rem]">
                                Ainda não há dados deste indicador nos meses confirmados.
                              </div>
                            )}
                            <p className="v2-ess-legend tw:mt-2.5 tw:mb-0 tw:flex tw:items-center tw:gap-2 tw:text-[0.625rem] tw:text-[#978579] tw:[&_i]:ml-2 tw:[&_i]:inline-block tw:[&_i]:size-2.25 tw:[&_i]:rounded-[0.125rem] tw:[&_i:first-child]:ml-0">
                              <i className="tw:bg-cali-brand" /> mês de referência
                              {!periodMode && (
                                <>
                                  <i className="tw:bg-cali-gold" /> mês comparado
                                </>
                              )}
                            </p>
                          </section>
                        );
                      };
                      return printingIndicators ? (
                        <div className="pa-print-ess">
                          <h2>Evolução dos indicadores essenciais</h2>
                          {Object.keys(options).map(chart)}
                        </div>
                      ) : (
                        chart(essChart)
                      );
                    })()}
                    <div className={'v2-module-gate tw:relative' + (analytics ? '' : ' locked')}>
                      {!analytics && (
                        <div
                          className="v2-module-lock tw:absolute tw:top-12 tw:left-1/2 tw:z-2 tw:flex tw:w-[min(32.5rem,calc(100%_-_2rem))] tw:-translate-x-1/2 tw:flex-col tw:items-start tw:gap-2 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:px-6 tw:py-5.5 tw:shadow-[0_1.125rem_3.75rem_#28172426] tw:[&_small]:text-[0.625rem] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.075rem] tw:[&_small]:text-[#af8f72] tw:[&_strong]:text-[0.9375rem] tw:[&_strong]:text-[#322f2c] tw:[&_p]:mt-0 tw:[&_p]:mb-1.5 tw:[&_p]:text-xs/[1.6] tw:[&_p]:text-[#8c7e74] tw:[&_a]:inline-flex tw:[&_a]:items-center tw:[&_a]:gap-2 tw:[&_a]:no-underline tw:[&_ul]:m-0 tw:[&_ul]:pl-4 tw:[&_ul]:text-xs/[1.7] tw:[&_ul]:text-[#665751]"
                          role="note"
                        >
                          <small>FRENTE ADICIONAL · PEOPLE ANALYTICS</small>
                          <strong>Quando os números precisam explicar o que acontece com a equipe</strong>
                          <ul>
                            <li>Cruzar movimentações, permanência e composição do quadro.</li>
                            <li>Investigar tendências para orientar prioridades.</li>
                            <li>Ler a evolução mês a mês, por área e por tempo de casa.</li>
                          </ul>
                          <p>
                            Os indicadores essenciais acima já fazem parte do seu contrato. O People Analytics é
                            uma frente contratada à parte, mediante alinhamento de escopo.
                          </p>
                          <div className="tw:flex tw:flex-wrap tw:gap-2.5">
                            <a className="primary-button" href="/cliente/frentes">
                              Conhecer esta frente <ArrowRight size={14} />
                            </a>
                            <a className="outline-button" href="/cliente/registros">
                              Conversar com a CALI
                            </a>
                          </div>
                        </div>
                      )}
                      <div
                        className="tw:in-[.locked]:pointer-events-none tw:in-[.locked]:opacity-55 tw:in-[.locked]:blur-[0.4375rem] tw:in-[.locked]:select-none"
                        aria-hidden={!analytics}
                        ref={(node) => {
                          if (node) node.inert = !analytics;
                        }}
                      >
                        <PeopleAnalyticsPeriod
                          key={periodMode ? 'p' : 'm'}
                          series={series}
                          metrics={metrics}
                          members={members}
                          working={visibleMembers.filter((item) => item.status === 'active')}
                          privateRows={privateRows}
                          month={month}
                          pageRange={periodMode ? { start: periodStart, end: periodEnd } : null}
                          departments={departments}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div
                className={'indicators-body' + (analytics ? '' : ' v2-module-blur')}
                aria-hidden={!analytics}
                ref={(node) => {
                  if (node) node.inert = !analytics;
                }}
              >
                <PeopleAnalyticsMonth
                  series={series}
                  metrics={metrics}
                  members={members}
                  working={visibleMembers.filter((item) => item.status === 'active')}
                  privateRows={privateRows}
                  month={month}
                  pageRange={periodMode ? { start: periodStart, end: periodEnd } : null}
                  departments={departments}
                />
              </div>
              <p className="soft-note">
                <Info size={15} />{' '}
                {periodMode
                  ? `${monthLabel(periodStart)} — ${monthLabel(periodEnd)}. Quadro: posição do último mês; gráficos: intervalo selecionado.`
                  : `${monthLabel(month)}. Dados dos meses confirmados.`}{' '}
                Entradas e saídas seguem a data efetiva.
              </p>
            </div>
          )}
        </>
      )}
      {detail &&
        createPortal(
          <div
            className="v2-client-module enh-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDetail(null);
            }}
          >
            <DialogFrame
              className="tw:max-h-[calc(100dvh-2.25rem)] tw:w-full tw:max-w-[45.9375rem] tw:overflow-y-auto tw:overscroll-contain tw:rounded-[0.8125rem] tw:bg-white tw:shadow-[0_1.5625rem_4.375rem_#0003]"
              as="aside"
              aria-label={`Ficha de ${detail.full_name}`}
            >
              <TeamDialogHeader onClose={() => setDetail(null)}>
                <TeamDialogEyebrow>CADASTRO / PESSOAS</TeamDialogEyebrow>
              </TeamDialogHeader>
              {
                <div className="tw:flex tw:items-center tw:gap-4.5 tw:p-6 tw:[&_small]:text-[0.625rem] tw:[&_small]:text-cali-gold tw:[&_h2]:my-1.5 tw:[&_h2]:text-[1.375rem] tw:[&_p]:text-[0.6875rem] tw:[&_p]:text-[#8f837d]">
                  <TeamAvatar
                    name={detail.full_name}
                    style={detail.avatar_style}
                    leader={detail.is_leader}
                    large
                  />
                  <div>
                    <small>COLABORADOR · FICHA{detail.is_leader ? ' · LIDERANÇA' : ''}</small>
                    <h2>{detail.full_name}</h2>
                    <p>
                      {detail.job_title} · {detail.department}
                    </p>
                    <span
                      className={`tw:inline-flex tw:w-max tw:rounded-[0.3125rem] tw:px-2 tw:py-1.25 tw:text-[0.625rem] ${detail.status === 'active' ? 'tw:bg-[#e5f4e9] tw:text-[#277d58]' : 'tw:bg-[#f9e5e7] tw:text-[#ab4e63]'}`}
                    >
                      {statusLabels[detail.status]}
                    </span>
                  </div>
                </div>
              }
              <nav
                className="tw:mx-6 tw:mt-0 tw:mb-0 tw:flex tw:border-b tw:border-solid tw:border-[#e9e0da] tw:pb-3 tw:text-[0.6875rem] tw:text-[#90837c] tw:shrink-0 tw:gap-5 tw:[&_button]:-mb-3.25 tw:[&_button]:inline-flex tw:[&_button]:cursor-pointer tw:[&_button]:items-center tw:[&_button]:gap-1.5 tw:[&_button]:border-0 tw:[&_button]:border-b-2 tw:[&_button]:border-solid tw:[&_button]:border-transparent tw:[&_button]:bg-transparent tw:[&_button]:px-0 tw:[&_button]:pt-0 tw:[&_button]:pb-3 tw:[&_button]:text-inherit tw:[&_button.active]:border-cali-brand tw:[&_button.active]:font-bold tw:[&_button.active]:text-cali-brand tw:[&_button_span]:rounded-[0.3125rem] tw:[&_button_span]:bg-[#f6edf0] tw:[&_button_span]:px-1.5 tw:[&_button_span]:py-0.5 tw:[&_button_span]:text-[0.625rem] tw:[&_button_span]:text-[#6e3645]"
                aria-label="Seções da ficha"
              >
                <button className={detailTab === 'data' ? 'active' : ''} onClick={() => setDetailTab('data')}>
                  Dados
                </button>
                {detail.is_leader && (
                  <button
                    className={detailTab === 'reports' ? 'active' : ''}
                    onClick={() => setDetailTab('reports')}
                  >
                    Liderados <span>{leaderReports.length}</span>
                  </button>
                )}
                {!staff && (
                  <button
                    className={detailTab === 'profile' ? 'active' : ''}
                    onClick={() => setDetailTab('profile')}
                  >
                    Perfil comportamental
                  </button>
                )}
                <button
                  className={detailTab === 'history' ? 'active' : ''}
                  onClick={() => setDetailTab('history')}
                >
                  Histórico
                </button>
              </nav>
              {detailTab === 'data' && (
                <>
                  <div className="tw:mx-[1.5625rem] tw:mt-4 tw:mb-1.5 tw:flex tw:flex-wrap tw:gap-2 tw:text-[0.6875rem] tw:[&>div]:flex tw:[&>div]:items-baseline tw:[&>div]:gap-2 tw:[&>div]:rounded-[0.4375rem] tw:[&>div]:border tw:[&>div]:border-solid tw:[&>div]:border-[#e8ddd5] tw:[&>div]:bg-[#faf5f1] tw:[&>div]:px-2.75 tw:[&>div]:py-1.75 tw:[&_span]:text-[0.625rem] tw:[&_span]:text-[#99887b] tw:[&_strong]:text-xs tw:[&_strong]:text-cali-brand">
                    <div>
                      <span>Tempo de casa</span>
                      <strong>{tenureLabel(detail.admission_date, detail.termination_date)}</strong>
                    </div>
                    {!staff && (
                      <div>
                        <span>Identificação de gênero</span>
                        <strong>
                          {(() => {
                            const privateRow = detailPrivate;
                            return privateRow?.gender === 'female'
                              ? 'Feminino'
                              : privateRow?.gender === 'male'
                                ? 'Masculino'
                                : privateRow?.gender === 'other'
                                  ? privateRow.gender_detail || 'Outra identificação'
                                  : privateRow?.gender === 'prefer_not'
                                    ? 'Prefere não informar'
                                    : 'Não informado';
                          })()}
                        </strong>
                      </div>
                    )}
                  </div>
                  <div className="tw:grid tw:grid-cols-2 tw:gap-4.5 tw:px-[1.5625rem] tw:pt-3.75 tw:pb-5 tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:flex-col tw:[&>div]:gap-1.5 tw:[&>div]:border-b tw:[&>div]:border-solid tw:[&>div]:border-[var(--v2-line-eee2d5,#eee2d5)] tw:[&>div]:pb-3.5 tw:[&>div>span]:text-[0.625rem] tw:[&>div>span]:text-[#978981] tw:[&>div>strong]:wrap-anywhere tw:[&>div>strong]:text-[0.6875rem]/[1.5] tw:[&>div>strong]:text-[var(--v2-text-705644,#705644)]">
                    <div>
                      <span>Código</span>
                      <strong>{detail.employee_code}</strong>
                    </div>
                    <div>
                      <span>Admissão</span>
                      <strong>{dateLabel(detail.admission_date)}</strong>
                    </div>
                    <div>
                      <span>Cargo</span>
                      <strong>{detail.job_title}</strong>
                    </div>
                    <div>
                      <span>Senioridade</span>
                      <strong>{detail.seniority || '—'}</strong>
                    </div>
                    <div>
                      <span>Departamento</span>
                      <strong>{detail.department}</strong>
                    </div>
                    <div>
                      <span>Setor</span>
                      <strong>{detail.team_area || '—'}</strong>
                    </div>
                    <div>
                      <span>Gestor direto</span>
                      <strong>{memberMap.get(detail.manager_code || '') || detail.manager_code || '—'}</strong>
                    </div>
                    <div>
                      <span>Tipo de contratação</span>
                      <strong>{contractLabels[detail.employment_type] || detail.employment_type}</strong>
                    </div>
                    <div>
                      <span>Jornada semanal</span>
                      <strong>{detail.weekly_hours == null ? '—' : `${detail.weekly_hours} h/semana`}</strong>
                    </div>
                    <div>
                      <span>Modelo de trabalho</span>
                      <strong>{detail.work_model || '—'}</strong>
                    </div>
                    <div>
                      <span>Unidade / localidade</span>
                      <strong>{detail.location || '—'}</strong>
                    </div>
                    <div>
                      <span>E-mail corporativo</span>
                      <strong>{detail.work_email || '—'}</strong>
                    </div>
                    <div>
                      <span>Telefone profissional</span>
                      <strong>{detail.work_phone || '—'}</strong>
                    </div>
                    {detail.status !== 'terminated' && (
                      <div>
                        <span>Situação</span>
                        <strong>{statusLabels[detail.status]}</strong>
                      </div>
                    )}
                    {detail.status === 'leave' && (
                      <>
                        <div>
                          <span>Motivo do afastamento</span>
                          <strong>
                            {detail.leave_reason ? leaveLabels[detail.leave_reason] || detail.leave_reason : '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Início</span>
                          <strong>{dateLabel(detail.leave_start_date)}</strong>
                        </div>
                        <div>
                          <span>Previsão de retorno</span>
                          <strong>{dateLabel(detail.expected_return_date)}</strong>
                        </div>
                      </>
                    )}
                    {detail.status === 'terminated' && (
                      <section className="tw:col-span-full tw:mx-[1.5625rem] tw:mt-1.5 tw:mb-4 tw:rounded-lg tw:bg-[#fbecee] tw:p-3.25 tw:text-[0.6875rem] tw:text-[#7a4450]">
                        <div className="tw:mb-3.5 tw:flex tw:items-center tw:gap-2.5 tw:text-[0.85rem]">
                          <TeamStatus status="terminated">Desligada</TeamStatus>
                          <strong>Fora do quadro atual</strong>
                        </div>
                        <div className="tw:mt-2.5 tw:grid tw:grid-cols-2 tw:gap-2.5 tw:max-[37.5rem]:grid-cols-1! tw:[&_span]:block tw:[&_span]:text-[0.72rem] tw:[&_strong]:mt-1.25 tw:[&_strong]:block tw:[&_strong]:text-[0.94rem] tw:[&_strong]:wrap-anywhere">
                          <div>
                            <span>Data do desligamento</span>
                            <strong>{dateLabel(detail.termination_date)}</strong>
                          </div>
                          <div>
                            <span>Forma</span>
                            <strong>
                              {detail.termination_initiative
                                ? terminationInitiativeLabels[detail.termination_initiative] ||
                                  detail.termination_initiative
                                : '—'}
                            </strong>
                          </div>
                          <div>
                            <span>Classificação · DP</span>
                            <strong>
                              {terminationCodeLabel(parseTerminationReason(detail.termination_reason).code) ||
                                'A confirmar'}
                            </strong>
                          </div>
                          <div>
                            <span>Aviso prévio</span>
                            <strong>
                              {detail.notice_type ? noticeLabels[detail.notice_type] || detail.notice_type : '—'}
                            </strong>
                          </div>
                          {parseTerminationReason(detail.termination_reason).reason && (
                            <div className="tw:col-span-full">
                              <span>Observações</span>
                              <strong>{parseTerminationReason(detail.termination_reason).reason}</strong>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                </>
              )}
              {detailTab === 'reports' && detail.is_leader && (
                <div className="tw:mx-[1.5625rem] tw:mt-1.5 tw:mb-4 tw:text-[0.6875rem] tw:text-[#655b57] tw:px-7 tw:py-4 tw:max-[43.75rem]:px-4 tw:[&_h3]:mt-5.5 tw:[&_h3]:mb-2.5">
                  <div className="tw:flex tw:items-center tw:gap-7 tw:pt-0.5 tw:pb-3.5 tw:max-[40.625rem]:flex-wrap tw:max-[40.625rem]:gap-4.5 tw:[&_small]:block tw:[&_small]:text-[0.65rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.12em] tw:[&_strong]:mt-0.75 tw:[&_strong]:block tw:[&_strong]:text-[0.93rem] tw:[&_p]:mt-1.25 tw:[&_p]:mb-3 tw:[&_p]:text-[0.77rem]/[1.45]">
                    <div>
                      <small>EQUIPE ATUAL</small>
                      <strong>
                        {activeReports.length}{' '}
                        {activeReports.length === 1 ? 'pessoa vinculada' : 'pessoas vinculadas'}
                      </strong>
                    </div>
                    {activeReports.length > 0 && (
                      <div>
                        <small>ÚLTIMA ADMISSÃO</small>
                        <strong>{dateLabel(activeReports[activeReports.length - 1].admission_date)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="tw:w-full tw:overflow-x-auto tw:rounded-xl">
                    <DataTable
                      variant="teamReport"
                      className="tw:w-full tw:min-w-[44.375rem] tw:border-collapse tw:text-left tw:[&_th]:border-0 tw:[&_th]:bg-[#f7f1eb] tw:[&_th]:px-2 tw:[&_th]:py-2.5 tw:[&_th]:text-[0.6875rem] tw:[&_th]:font-medium tw:[&_th]:text-[#9e9086] tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-[#eee6dd] tw:[&_td]:px-2 tw:[&_td]:py-2.5 tw:[&_td]:text-[0.6875rem] tw:[&_td]:align-middle tw:[&_th]:whitespace-nowrap tw:[&_th]:uppercase tw:[&_th]:tracking-[0.07em] tw:[&_td:nth-child(3)]:whitespace-nowrap tw:[&_td:nth-child(4)]:whitespace-nowrap tw:[&_td>strong]:block tw:[&_td>small]:mt-0.75 tw:[&_td>small]:block tw:[&_td>small]:text-cali-muted"
                    >
                      <thead>
                        <tr>
                          <th>Pessoa</th>
                          <th>Cargo e área</th>
                          <th>Admissão</th>
                          <th>Tempo de casa</th>
                          <th>Situação</th>
                          <th>
                            <span className="sr-only">Abrir ficha</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReports.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <button
                                className="tw:inline-flex tw:min-w-45 tw:cursor-pointer tw:items-center tw:gap-2 tw:border-0 tw:bg-transparent tw:p-0 tw:font-semibold tw:text-cali-brand tw:text-left tw:hover:[&_strong]:underline tw:hover:[&_strong]:decoration-cali-gold"
                                onClick={() => showDetail(member)}
                              >
                                <TeamAvatar
                                  name={member.full_name}
                                  style={member.avatar_style}
                                  leader={member.is_leader}
                                />
                                <strong>{member.full_name}</strong>
                              </button>
                            </td>
                            <td>
                              <strong>{member.job_title}</strong>
                              <small>{member.department}</small>
                            </td>
                            <td>{dateLabel(member.admission_date)}</td>
                            <td>{tenureLabel(member.admission_date)}</td>
                            <td>
                              <TeamStatus status={member.status}>{statusLabels[member.status]}</TeamStatus>
                            </td>
                            <td>
                              <button
                                className="tw:inline-flex tw:size-8 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-[0.5625rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-cali-brand"
                                onClick={() => showDetail(member)}
                                aria-label={`Abrir ficha de ${member.full_name}`}
                              >
                                <ArrowRight size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                    {!activeReports.length && (
                      <p className="tw:m-0 tw:p-4 tw:text-[0.78rem]">
                        Nenhuma pessoa vinculada atualmente a esta liderança.
                      </p>
                    )}
                  </div>
                  {formerReports.length > 0 && (
                    <>
                      <h3>Vínculos anteriores · {formerReports.length}</h3>
                      <div className="tw:w-full tw:overflow-x-auto tw:rounded-xl">
                        <DataTable
                          variant="teamReport"
                          className="tw:w-full tw:min-w-[44.375rem] tw:border-collapse tw:text-left tw:[&_th]:border-0 tw:[&_th]:bg-[#f7f1eb] tw:[&_th]:px-2 tw:[&_th]:py-2.5 tw:[&_th]:text-[0.6875rem] tw:[&_th]:font-medium tw:[&_th]:text-[#9e9086] tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-[#eee6dd] tw:[&_td]:px-2 tw:[&_td]:py-2.5 tw:[&_td]:text-[0.6875rem] tw:[&_td]:align-middle tw:[&_th]:whitespace-nowrap tw:[&_th]:uppercase tw:[&_th]:tracking-[0.07em] tw:[&_td:nth-child(3)]:whitespace-nowrap tw:[&_td:nth-child(4)]:whitespace-nowrap tw:[&_td>strong]:block tw:[&_td>small]:mt-0.75 tw:[&_td>small]:block tw:[&_td>small]:text-cali-muted"
                        >
                          <thead>
                            <tr>
                              <th>Pessoa</th>
                              <th>Cargo e área</th>
                              <th>Admissão</th>
                              <th>Tempo na equipe</th>
                              <th>Situação</th>
                              <th>
                                <span className="sr-only">Abrir ficha</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {formerReports.map((member) => (
                              <tr key={member.id}>
                                <td>
                                  <button
                                    className="tw:inline-flex tw:min-w-45 tw:cursor-pointer tw:items-center tw:gap-2 tw:border-0 tw:bg-transparent tw:p-0 tw:font-semibold tw:text-cali-brand tw:text-left tw:hover:[&_strong]:underline tw:hover:[&_strong]:decoration-cali-gold"
                                    onClick={() => showDetail(member)}
                                  >
                                    <TeamAvatar name={member.full_name} style={member.avatar_style} />
                                    <strong>{member.full_name}</strong>
                                  </button>
                                </td>
                                <td>
                                  <strong>{member.job_title}</strong>
                                  <small>{member.department}</small>
                                </td>
                                <td>{dateLabel(member.admission_date)}</td>
                                <td>{tenureLabel(member.admission_date, member.termination_date)}</td>
                                <td>
                                  <TeamStatus status={member.status}>
                                    {member.status === 'terminated' ? 'Desligada' : 'Mudou de gestor'}
                                  </TeamStatus>
                                </td>
                                <td>
                                  <button
                                    className="tw:inline-flex tw:size-8 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-[0.5625rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-cali-brand"
                                    onClick={() => showDetail(member)}
                                    aria-label={`Abrir ficha de ${member.full_name}`}
                                  >
                                    <ArrowRight size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </DataTable>
                      </div>
                    </>
                  )}
                </div>
              )}
              {detailTab === 'profile' && !staff && <TeamMemberProfiles memberId={detail.id} admin={admin} />}
              {detailTab === 'history' && (
                <div className="tw:mx-[1.5625rem] tw:mt-1.5 tw:mb-4.5 tw:p-0 tw:text-[0.6875rem] tw:text-[#655b57] tw:[&_h3]:mt-0 tw:[&_h3]:mb-3 tw:[&_h3]:text-[0.8125rem] tw:[&_h3]:text-[#322f2c] tw:[&_small]:text-[0.6875rem] tw:[&_small]:font-normal tw:[&_small]:text-[#8f837d]">
                  <h3>Histórico da ficha</h3>
                  {changes
                    .filter((c) => c.member_id === detail.id)
                    .slice(0, 20)
                    .map((c) => (
                      <p
                        className="tw:m-0 tw:flex tw:flex-col tw:items-start tw:gap-0.75 tw:border-l tw:border-solid tw:border-[#d8c7b8] tw:pb-3.5 tw:pl-4 tw:text-left tw:text-[0.78rem]/[1.4] tw:[&_b]:flex tw:[&_b]:flex-col tw:[&_b]:gap-0.75 tw:[&_b]:text-xs tw:[&_b]:font-semibold tw:[&_b]:text-[#3e3533] tw:[&_span]:text-[0.625rem] tw:[&_span]:text-[#a88b76]"
                        key={c.id}
                      >
                        <b>
                          {changeLabels[c.change_type] || 'Atualização'}
                          <small className="tw:mt-1.25 tw:block tw:wrap-anywhere tw:text-[0.76rem]/[1.5] tw:font-medium">
                            {changeDetails(c)}
                          </small>
                        </b>
                        <span>
                          {c.change_type === 'admission' && c.after_state?.admission_date
                            ? dateLabel(String(c.after_state.admission_date))
                            : c.change_type === 'termination' && c.after_state?.termination_date
                              ? dateLabel(String(c.after_state.termination_date))
                              : `Registro: ${dateLabel(c.created_at)}`}
                        </span>
                      </p>
                    ))}
                  {!changes.some((c) => c.member_id === detail.id) && (
                    <p className="tw:m-0 tw:text-[0.625rem] tw:text-[#9a8c82]">Ainda sem movimentações.</p>
                  )}
                </div>
              )}
              {detailTab === 'data' && detailPrivate && (
                <div className="tw:mx-[1.5625rem] tw:mt-3.5 tw:mb-4 tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-3.5 tw:py-3 tw:text-[0.6875rem] tw:text-[#7a5a2c] tw:[&_p]:mt-1 tw:[&_p]:mb-0">
                  <strong>Dados privados da empresa</strong>
                  <p>
                    Remuneração ·{' '}
                    {detailPrivate.salary == null
                      ? '—'
                      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          detailPrivate.salary,
                        )}
                  </p>
                  <p>Revisão salarial · {dateLabel(detailPrivate.salary_review_date)}</p>
                  <p>
                    Tem filhos ·{' '}
                    {detailPrivate.has_children === 'yes'
                      ? 'Sim'
                      : detailPrivate.has_children === 'no'
                        ? 'Não'
                        : 'Não informado'}
                  </p>
                </div>
              )}
              {isCurrent && !staff && (
                <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2.5 tw:border-t tw:border-solid tw:border-[#eee5df] tw:px-[1.5625rem] tw:py-4.5 tw:[&_small]:text-[0.625rem]/[1.6] tw:[&_small]:text-[#a68b70]">
                  <TeamAction
                    appearance="secondary"
                    disabled={detail.status === 'leave' || detail.status === 'terminated'}
                    onClick={() => {
                      openStatusEdit(detail, 'leave');
                      setDetail(null);
                    }}
                  >
                    Registrar férias
                  </TeamAction>
                  <TeamAction
                    appearance="danger"
                    disabled={detail.status === 'terminated'}
                    onClick={() => setPendingTermination(detail)}
                  >
                    Desligar colaborador
                  </TeamAction>
                  <TeamAction
                    onClick={() => {
                      openEdit(detail);
                      setDetail(null);
                    }}
                  >
                    Editar cadastro
                  </TeamAction>
                  <TeamAction
                    appearance="secondary"
                    onClick={() => {
                      setRemoveMember(detail);
                      setDetail(null);
                    }}
                  >
                    Arquivar ficha
                  </TeamAction>
                  <small>Arquivar retira a ficha do quadro atual sem apagar o histórico.</small>
                </div>
              )}
            </DialogFrame>
          </div>,
          document.body,
        )}
      {pendingTermination &&
        createPortal(
          <div
            className="v2-client-module v2-team-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPendingTermination(null);
            }}
          >
            <DialogFrame
              className="wf-modal wf-create tw:w-full! tw:max-w-[42.5rem] tw:p-0!"
              role="alertdialog"
              aria-labelledby="team-termination-title"
            >
              <TeamDialogHeader onClose={() => setPendingTermination(null)}>
                <TeamDialogEyebrow>ATENÇÃO</TeamDialogEyebrow>
                <h2 id="team-termination-title">Desligar {pendingTermination.full_name}?</h2>
              </TeamDialogHeader>
              <div className="tw:px-7 tw:py-6 tw:text-[0.87rem]/[1.55] tw:[&_p]:mt-0 tw:[&_p]:mb-3">
                <p>
                  Tem certeza de que deseja prosseguir com o desligamento? Você ainda vai informar a data, o motivo
                  e o aviso prévio antes de salvar. A movimentação ficará no histórico.
                </p>
              </div>
              <TeamDialogFooter>
                <TeamAction appearance="secondary" onClick={() => setPendingTermination(null)}>
                  Voltar à ficha
                </TeamAction>
                <TeamAction
                  appearance="danger"
                  onClick={() => {
                    openStatusEdit(pendingTermination, 'terminated');
                    setPendingTermination(null);
                    setDetail(null);
                  }}
                >
                  Continuar
                </TeamAction>
              </TeamDialogFooter>
            </DialogFrame>
          </div>,
          document.body,
        )}
      {metricDraft &&
        createPortal(
          <div
            className="v2-client-module v2-team-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMetricDraft(null);
            }}
          >
            <DialogForm
              className="wf-modal wf-create v2-month-form tw:flex tw:max-h-[calc(100dvh-2.25rem)] tw:w-full! tw:max-w-[42.5rem] tw:flex-col tw:overflow-hidden tw:p-0!"
              onSubmit={saveMetrics}
              aria-labelledby="team-metrics-title"
            >
              <TeamDialogHeader onClose={() => setMetricDraft(null)}>
                <TeamDialogEyebrow>DADOS DO MÊS · {monthLabel(month).toUpperCase()}</TeamDialogEyebrow>
                <h2 id="team-metrics-title">
                  {admin ? 'Corrigir' : 'Lançar'} dados de {selectedCompany?.display_name || 'empresa'}
                </h2>
              </TeamDialogHeader>
              <div className="wf-form tw:min-h-0 tw:overflow-y-auto tw:px-[1.5625rem] tw:pt-4.5 tw:pb-5">
                <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                  Jornada e ausências (horas)
                </h3>
                <div className="wf-form-grid">
                  {(
                    [
                      ['planned', 'Horas previstas no mês'],
                      ['medical', 'Atestado médico'],
                      ['leave', 'Licença'],
                      ['unjustified', 'Falta injustificada'],
                      ['accident', 'Acidente'],
                      ['overtime', 'Horas extras'],
                      ['bank', 'Saldo do banco de horas'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        inputMode="decimal"
                        value={metricDraft[key]}
                        onChange={(e) => setMetricDraft({ ...metricDraft, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                  Quadro aprovado por área (posições)
                </h3>
                {departments.length ? (
                  <div className="wf-form-grid">
                    {departments.map((name) => (
                      <label key={name}>
                        {name}
                        <input
                          inputMode="numeric"
                          value={metricDraft.approved[name] || ''}
                          onChange={(e) =>
                            setMetricDraft({
                              ...metricDraft,
                              approved: { ...metricDraft.approved, [name]: e.target.value },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="tw:m-0 tw:text-[0.625rem] tw:text-[#9a8c82]">
                    Cadastre pessoas com departamento para lançar o quadro aprovado.
                  </p>
                )}
                <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                  Pesquisa de clima (quando houver ciclo)
                </h3>
                <div className="wf-form-grid">
                  <label>
                    eNPS (−100 a 100)
                    <input
                      inputMode="numeric"
                      value={metricDraft.enps}
                      onChange={(e) => setMetricDraft({ ...metricDraft, enps: e.target.value })}
                    />
                  </label>
                  <label>
                    Nota de clima (0 a 10)
                    <input
                      inputMode="decimal"
                      value={metricDraft.climate}
                      onChange={(e) => setMetricDraft({ ...metricDraft, climate: e.target.value })}
                    />
                  </label>
                  <label>
                    Participação (%)
                    <input
                      inputMode="decimal"
                      value={metricDraft.participation}
                      onChange={(e) => setMetricDraft({ ...metricDraft, participation: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Observações
                  <textarea
                    value={metricDraft.notes}
                    onChange={(e) => setMetricDraft({ ...metricDraft, notes: e.target.value })}
                    placeholder="Contexto do mês, se houver"
                  />
                </label>
                {error && (
                  <p className="wf-access-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              {admin && (
                <label className="wide">
                  Motivo da correção
                  <textarea
                    value={metricDraft.reason}
                    onChange={(event) => setMetricDraft({ ...metricDraft, reason: event.target.value })}
                    minLength={3}
                    maxLength={500}
                    required
                  />
                </label>
              )}
              <TeamDialogFooter className="tw:py-3.5">
                <TeamAction type="button" appearance="secondary" onClick={() => setMetricDraft(null)}>
                  Cancelar
                </TeamAction>
                <TeamAction type="submit" disabled={saving}>
                  {saving ? 'Gravando…' : 'Gravar dados do mês'}
                </TeamAction>
              </TeamDialogFooter>
            </DialogForm>
          </div>,
          document.body,
        )}
      {removeMember &&
        createPortal(
          <div
            className="v2-client-module v2-team-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setRemoveMember(null);
            }}
          >
            <DialogFrame
              className="wf-modal wf-create tw:w-full! tw:max-w-[42.5rem] tw:p-0!"
              role="alertdialog"
              aria-labelledby="team-remove-title"
            >
              <TeamDialogHeader onClose={() => setRemoveMember(null)}>
                <TeamDialogEyebrow>CONFIRMAÇÃO</TeamDialogEyebrow>
                <h2 id="team-remove-title">Remover {removeMember.full_name}?</h2>
              </TeamDialogHeader>
              <div className="tw:px-7 tw:py-6 tw:text-[0.87rem]/[1.55] tw:[&_p]:mt-0 tw:[&_p]:mb-3">
                <p>A ficha sai da equipe atual. O histórico dos meses confirmados permanece registrado.</p>
                <p>
                  Para registrar um desligamento real, use o botão <strong>Desligar colaborador</strong> na ficha.
                  O arquivamento serve apenas para retirar um cadastro indevido da lista sem apagar o histórico.
                </p>
              </div>
              <TeamDialogFooter>
                <TeamAction appearance="secondary" onClick={() => setRemoveMember(null)}>
                  Voltar
                </TeamAction>
                <TeamAction onClick={() => void archiveMember()} disabled={saving}>
                  {saving ? 'Removendo…' : 'Remover ficha'}
                </TeamAction>
              </TeamDialogFooter>
            </DialogFrame>
          </div>,
          document.body,
        )}
      {editor &&
        createPortal(
          <div
            className="v2-client-module v2-team-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditor(null);
            }}
          >
            <DialogForm
              className="wf-modal wf-create tw:flex tw:max-h-[calc(100dvh-2.25rem)] tw:w-full! tw:max-w-[47.5rem] tw:flex-col tw:overflow-hidden tw:p-0!"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const problem =
                  !editor.full_name.trim() || !editor.admission_date || !editor.job_title.trim()
                    ? 'Preencha nome, admissão e cargo.'
                    : !editor.department.trim()
                      ? 'Informe o departamento.'
                      : editor.status === 'leave' && (!editor.leave_reason || !editor.leave_start_date)
                        ? 'Informe o motivo e a data de início do afastamento.'
                        : editor.status === 'terminated' && !editor.termination_date
                          ? 'Informe a data do desligamento.'
                          : '';
                if (problem) {
                  setError(problem);
                  return;
                }
                setError('');
                saveEditor(e);
              }}
              aria-label={editingId ? 'Editar colaborador' : 'Cadastrar colaborador'}
            >
              <TeamDialogHeader onClose={() => setEditor(null)}>
                <TeamDialogEyebrow>{editingId ? 'FICHA PROFISSIONAL' : 'NOVO COLABORADOR'}</TeamDialogEyebrow>
                <h2>{editingId ? 'Atualizar colaborador' : 'Cadastrar colaborador'}</h2>
                <span className="tw:mt-1 tw:block tw:text-[0.6875rem] tw:text-[#95877f]">
                  {'Preencha os dados abaixo. Campos condicionais aparecem conforme as respostas.'}
                </span>
              </TeamDialogHeader>
              <TeamEditorFields>
                {
                  <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                    Identificação
                  </h3>
                }
                <label>
                  Código interno <small>Opcional — a CALI gera um código se ficar vazio</small>
                  <input
                    value={editor.employee_code}
                    onChange={(e) => setEditor({ ...editor, employee_code: e.target.value })}
                    maxLength={60}
                    disabled={Boolean(editingId)}
                    placeholder={editingId ? '' : 'Gerado automaticamente se vazio'}
                  />
                </label>
                <label>
                  Nome completo
                  <input
                    value={editor.full_name}
                    onChange={(e) => setEditor({ ...editor, full_name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Data de admissão
                  <input
                    type="date"
                    value={editor.admission_date}
                    onChange={(e) => setEditor({ ...editor, admission_date: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Cargo
                  <input
                    value={editor.job_title}
                    onChange={(e) => setEditor({ ...editor, job_title: e.target.value })}
                    required
                  />
                </label>
                {
                  <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                    Área e liderança
                  </h3>
                }
                <label>
                  Senioridade
                  <select
                    value={editor.seniority || ''}
                    onChange={(e) => setEditor({ ...editor, seniority: e.target.value || null })}
                  >
                    <option value="">Selecione, se aplicável</option>
                    {[
                      'Aprendiz',
                      'Estágio',
                      'Trainee',
                      'Júnior',
                      'Pleno',
                      'Sênior',
                      'Especialista',
                      'Coordenação',
                      'Gerência',
                      'Direção',
                    ].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                    {editor.seniority &&
                      ![
                        'Aprendiz',
                        'Estágio',
                        'Trainee',
                        'Júnior',
                        'Pleno',
                        'Sênior',
                        'Especialista',
                        'Coordenação',
                        'Gerência',
                        'Direção',
                      ].includes(editor.seniority) && <option value={editor.seniority}>{editor.seniority}</option>}
                  </select>
                </label>
                <label>
                  Departamento
                  <input
                    list="team-departments"
                    value={editor.department}
                    onChange={(e) => setEditor({ ...editor, department: e.target.value })}
                    required
                  />
                  <datalist id="team-departments">
                    {[...new Set(members.map((m) => m.department))]
                      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                      .map((d) => (
                        <option key={d} value={d} />
                      ))}
                  </datalist>
                </label>
                <label>
                  Setor <small>Opcional, se diferente do departamento</small>
                  <input
                    value={editor.team_area || ''}
                    onChange={(e) => setEditor({ ...editor, team_area: e.target.value || null })}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editor.is_leader}
                    onChange={(e) => setEditor({ ...editor, is_leader: e.target.checked })}
                  />{' '}
                  Esta pessoa lidera uma equipe
                </label>
                <label>
                  Gestor direto
                  <select
                    value={editor.manager_code || ''}
                    onChange={(e) => setEditor({ ...editor, manager_code: e.target.value || null })}
                  >
                    <option value="">A definir</option>
                    {members
                      .filter(
                        (m) =>
                          !m.archived_at && m.employee_code !== editor.employee_code && m.status !== 'terminated',
                      )
                      .sort((a, b) => Number(b.is_leader) - Number(a.is_leader))
                      .map((m) => (
                        <option value={m.employee_code} key={m.id}>
                          {m.full_name}
                          {m.is_leader ? ' · liderança' : ''}
                        </option>
                      ))}
                  </select>
                </label>
                {
                  <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                    Vínculo e jornada
                  </h3>
                }
                <label>
                  Vínculo
                  <select
                    value={editor.employment_type}
                    onChange={(e) => setEditor({ ...editor, employment_type: e.target.value })}
                  >
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="intern">Estágio</option>
                    <option value="temporary">Temporário</option>
                    <option value="outsourced">Terceirizado</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label>
                  Jornada semanal (horas)
                  <input
                    type="number"
                    min="0"
                    max="80"
                    step="0.5"
                    value={editor.weekly_hours ?? ''}
                    onChange={(e) =>
                      setEditor({ ...editor, weekly_hours: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </label>
                <label>
                  Modelo de trabalho
                  <select
                    value={editor.work_model || ''}
                    onChange={(e) => setEditor({ ...editor, work_model: e.target.value || null })}
                  >
                    <option value="">A definir</option>
                    <option value="presencial">Presencial</option>
                    <option value="hibrido">Híbrido</option>
                    <option value="remoto">Remoto</option>
                  </select>
                </label>
                <label>
                  Unidade / localidade <small>Cidade ou unidade onde trabalha</small>
                  <input
                    value={editor.location || ''}
                    onChange={(e) => setEditor({ ...editor, location: e.target.value || null })}
                  />
                </label>
                {
                  <h3 className="tw:col-span-full tw:mt-2.5 tw:mb-0 tw:border-t tw:border-solid tw:border-[#efe7e1] tw:pt-3.5 tw:text-[0.8125rem] tw:font-semibold tw:text-cali-brand tw:first:mt-0 tw:first:border-0 tw:first:pt-0">
                    Situação
                  </h3>
                }
                <label>
                  E-mail corporativo
                  <input
                    type="email"
                    value={editor.work_email || ''}
                    onChange={(e) => setEditor({ ...editor, work_email: e.target.value || null })}
                  />
                </label>
                <label>
                  Telefone profissional
                  <input
                    value={editor.work_phone || ''}
                    onChange={(e) => setEditor({ ...editor, work_phone: e.target.value || null })}
                    placeholder="Ex.: (41) 99999-9999"
                  />
                </label>
                <label>
                  Situação
                  <select
                    value={editor.status}
                    onChange={(e) => setEditor({ ...editor, status: e.target.value as Draft['status'] })}
                  >
                    <option value="active">Ativa</option>
                    <option value="leave">Afastada / férias</option>
                    <option value="terminated">Desligada</option>
                  </select>
                </label>
                {editor.status === 'leave' && (
                  <>
                    <label>
                      Motivo do afastamento / férias
                      <select
                        value={editor.leave_reason || ''}
                        onChange={(e) => setEditor({ ...editor, leave_reason: e.target.value || null })}
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="vacation">Férias</option>
                        <option value="medical_leave">Afastamento / licença</option>
                        <option value="parental_leave">Licença maternidade / paternidade</option>
                        <option value="unpaid_leave">Licença não remunerada</option>
                        <option value="other">Outro</option>
                      </select>
                    </label>
                    <label>
                      Data de início
                      <input
                        type="date"
                        value={editor.leave_start_date || ''}
                        onChange={(e) => setEditor({ ...editor, leave_start_date: e.target.value || null })}
                        required
                      />
                    </label>
                    <label>
                      Previsão de retorno <small>Opcional</small>
                      <input
                        type="date"
                        value={editor.expected_return_date || ''}
                        onChange={(e) => setEditor({ ...editor, expected_return_date: e.target.value || null })}
                      />
                    </label>
                  </>
                )}
                {editor.status === 'terminated' && (
                  <>
                    <label>
                      Data do desligamento
                      <input
                        type="date"
                        value={editor.termination_date || ''}
                        onChange={(e) => setEditor({ ...editor, termination_date: e.target.value || null })}
                        required
                      />
                    </label>
                    {editor.employment_type === 'clt' ? (
                      <label>
                        Motivo do desligamento · código eSocial{' '}
                        <small>Tabela 19; confirme a classificação com o Departamento Pessoal</small>
                        <select
                          value={editor.termination_code}
                          onChange={(e) => {
                            const selected = terminationCodes.find((item) => item.code === e.target.value);
                            setEditor({
                              ...editor,
                              termination_code: e.target.value,
                              termination_initiative: selected?.initiative || editor.termination_initiative,
                            });
                          }}
                        >
                          <option value="">Código a confirmar com o DP</option>
                          {terminationCodes.map((item) => (
                            <option value={item.code} key={item.code}>
                              {item.code} · {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label>
                        Forma de encerramento <small>Sem código eSocial de vínculo CLT</small>
                        <select
                          value={editor.termination_initiative || ''}
                          onChange={(e) =>
                            setEditor({
                              ...editor,
                              termination_code: '',
                              termination_initiative: e.target.value || null,
                            })
                          }
                        >
                          <option value="">A definir</option>
                          {Object.entries(terminationInitiativeLabels).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Observações do desligamento <small>Opcional; não substitui a classificação do DP</small>
                      <input
                        value={editor.termination_reason || ''}
                        onChange={(e) => setEditor({ ...editor, termination_reason: e.target.value || null })}
                      />
                    </label>
                    <label>
                      Aviso prévio
                      <select
                        value={editor.notice_type || ''}
                        onChange={(e) => setEditor({ ...editor, notice_type: e.target.value || null })}
                      >
                        <option value="">A definir</option>
                        <option value="worked">Trabalhado</option>
                        <option value="indemnified">Indenizado</option>
                        <option value="waived">Dispensado</option>
                        <option value="not_applicable">Não se aplica</option>
                      </select>
                    </label>
                  </>
                )}
              </TeamEditorFields>
              <div className="tw:col-span-full tw:max-h-[38vh] tw:flex-none tw:overflow-y-auto tw:rounded-[0.4375rem] tw:border tw:border-solid tw:border-[#e8dacb] tw:bg-[#fffaf3] tw:px-[1.5625rem] tw:pt-3.5 tw:pb-1 tw:text-xs tw:leading-relaxed tw:text-[#8c725b] tw:[&>strong]:text-[0.8125rem] tw:[&>strong]:text-cali-brand tw:[&>p]:mt-1 tw:[&>p]:mb-0 tw:[&>p]:text-[0.6875rem] tw:[&>p]:text-[#95877f]">
                <strong>Gênero, filhos e remuneração</strong>
                <p>
                  Esses dados podem ficar em branco. Se preencher algum deles, confirme a origem autorizada antes
                  de salvar.
                </p>
                <TeamEditorFields optional>
                  <label>
                    Identificação de gênero
                    <select
                      value={editor.gender}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          gender: e.target.value,
                          gender_detail: e.target.value === 'other' ? editor.gender_detail : '',
                        })
                      }
                    >
                      <option value="">Não informado</option>
                      <option value="female">Feminino</option>
                      <option value="male">Masculino</option>
                      <option value="other">Outra identificação</option>
                      <option value="prefer_not">Prefiro não informar</option>
                    </select>
                  </label>
                  {editor.gender === 'other' && (
                    <label>
                      Como se identifica? <small>Opcional</small>
                      <input
                        maxLength={120}
                        value={editor.gender_detail}
                        onChange={(e) => setEditor({ ...editor, gender_detail: e.target.value })}
                      />
                    </label>
                  )}
                  <label>
                    Tem filhos?
                    <select
                      value={editor.has_children}
                      onChange={(e) => setEditor({ ...editor, has_children: e.target.value })}
                    >
                      <option value="">Não informado</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                      <option value="prefer_not">Prefiro não informar</option>
                    </select>
                  </label>
                  <label>
                    Remuneração atual <small>Acesso restrito</small>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editor.salary}
                      onChange={(e) => setEditor({ ...editor, salary: e.target.value })}
                    />
                  </label>
                  <label>
                    Data da última revisão salarial <small>Acesso restrito</small>
                    <input
                      type="date"
                      value={editor.salary_review_date}
                      onChange={(e) => setEditor({ ...editor, salary_review_date: e.target.value })}
                    />
                  </label>
                </TeamEditorFields>
                <label className="tw:mt-3.25 tw:flex tw:items-start tw:gap-2 tw:font-medium tw:[&_input]:m-0 tw:[&_input]:size-4 tw:[&_input]:accent-cali-brand">
                  <input
                    type="checkbox"
                    checked={editor.optional_data_declared}
                    onChange={(e) => setEditor({ ...editor, optional_data_declared: e.target.checked })}
                  />{' '}
                  Confirmo que tenho origem autorizada para os dados opcionais preenchidos.
                </label>
              </div>
              <TeamDialogFooter>
                {error && (
                  <span
                    role="alert"
                    className="tw:mx-[1.5625rem] tw:basis-full tw:rounded-lg tw:bg-[#fbecee] tw:px-3.25 tw:py-2.75 tw:text-[0.6875rem] tw:text-[#b05165] tw:workspace-night:text-[#ffb7b7]"
                  >
                    {error}
                  </span>
                )}
                <TeamAction appearance="secondary" type="button" onClick={() => setEditor(null)}>
                  {'Cancelar'}
                </TeamAction>
                {
                  <TeamAction type="submit" key="team-final-save" disabled={saving}>
                    {saving ? <Loader2 className="tw:animate-spin" size={16} /> : <Check size={16} />} Salvar ficha
                  </TeamAction>
                }
              </TeamDialogFooter>
            </DialogForm>
          </div>,
          document.body,
        )}
      {importOpen &&
        createPortal(
          <div
            className="v2-client-module v2-team-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setImportOpen(false);
            }}
          >
            <DialogFrame
              className="wf-modal wf-create tw:flex tw:max-h-[calc(100dvh-2.25rem)] tw:w-full! tw:max-w-[42.5rem] tw:flex-col tw:overflow-hidden tw:p-0!"
              as="div"
              aria-label="Cadastrar colaboradores por planilha"
            >
              <TeamDialogHeader onClose={() => setImportOpen(false)}>
                <TeamDialogEyebrow>CADASTRO EM LOTE</TeamDialogEyebrow>
                <h2>Cadastre todos de uma vez</h2>
              </TeamDialogHeader>
              <div className="tw:flex tw:flex-col tw:gap-4 tw:px-[1.5625rem] tw:pt-4.5 tw:pb-5 tw:min-h-0 tw:overflow-y-auto tw:overscroll-contain">
                <div className="tw:flex tw:items-start tw:gap-3 tw:rounded-lg tw:bg-[#faf3ed] tw:p-3.25 tw:text-[#896e60] tw:[&_svg]:mt-0.25 tw:[&_svg]:size-[1.125rem] tw:[&_svg]:flex-none tw:[&_svg]:text-[#753a4b] tw:[&_p]:m-0 tw:[&_p]:max-w-[48ch] tw:[&_p]:text-[0.6875rem]/[1.6]">
                  <UsersRound size={28} />
                  <p>
                    Envie a planilha para cadastrar ou atualizar vários colaboradores de uma vez. O modelo usa
                    colunas em português e quem não estiver no arquivo continua na equipe.
                  </p>
                </div>
                <div className="tw:my-4.75 tw:grid tw:grid-cols-3 tw:gap-2 tw:max-[40.625rem]:grid-cols-1 tw:max-[34.375rem]:my-3.25 tw:[&>div]:flex tw:[&>div]:flex-col tw:[&>div]:gap-1.5 tw:[&>div]:rounded-[0.4375rem] tw:[&>div]:border tw:[&>div]:border-solid tw:[&>div]:border-[#e8ddd5] tw:[&>div]:bg-white tw:[&>div]:p-3 tw:[&>div]:text-[0.6875rem]/[1.4] tw:[&>div]:text-[#655b57] tw:[&_b]:text-[0.8125rem] tw:[&_b]:font-bold tw:[&_b]:text-cali-brand">
                  <div>
                    <b>01</b>
                    <span>Baixe o modelo</span>
                  </div>
                  <div>
                    <b>02</b>
                    <span>Preencha todos os campos aplicáveis</span>
                  </div>
                  <div>
                    <b>03</b>
                    <span>Envie o arquivo</span>
                  </div>
                </div>
                <TeamAction appearance="download" onClick={downloadModel}>
                  <Download size={17} /> Baixar modelo CSV
                </TeamAction>
                <label className="tw:flex tw:min-h-[5.875rem] tw:cursor-pointer tw:flex-col tw:items-center tw:justify-center tw:gap-2 tw:rounded-[0.5625rem] tw:border tw:border-dashed tw:border-[#d6b9ae] tw:bg-[#fffdfb] tw:p-5.5 tw:text-center tw:text-[0.6875rem] tw:font-semibold tw:text-cali-brand tw:[&_input]:hidden tw:[&_svg]:size-[1.375rem]">
                  <FileUp size={23} />
                  <span>
                    {importBusy ? 'Lendo planilha…' : importFileName || 'Enviar planilha preenchida (.csv)'}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readCsv(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {importError && (
                  <p
                    className="tw:mx-[1.5625rem] tw:basis-full tw:rounded-lg tw:bg-[#fbecee] tw:px-3.25 tw:py-2.75 tw:text-[0.6875rem] tw:text-[#b05165] tw:workspace-night:text-[#ffb7b7]"
                    role="alert"
                  >
                    {importError}
                  </p>
                )}
                {importRows.length > 0 && (
                  <div className="tw:mt-4.25 tw:text-[0.81rem] tw:[&_p]:text-[0.76rem] tw:[&>div]:max-h-[8.125rem] tw:[&>div]:overflow-auto tw:[&_span]:block tw:[&_span]:py-1.25 tw:[&_strong]:block tw:[&_strong]:leading-[1.45]">
                    <strong>
                      {importRows.length} pessoas · {importAdded} novas · {importChanged} alteradas ·{' '}
                      {importRows.length - importAdded - importChanged} sem mudança · {importMissing} ausentes
                    </strong>
                    <p>
                      As {importMissing} ausentes não serão desligadas. Registre saídas pela ficha de cada pessoa.
                    </p>
                    <div>
                      {importRows.slice(0, 8).map((row) => (
                        <span key={row.employee_code}>
                          {row.full_name} · {row.department}
                        </span>
                      ))}
                      {importRows.length > 8 && <small>+ {importRows.length - 8} pessoas</small>}
                    </div>
                  </div>
                )}
              </div>
              <TeamDialogFooter>
                {error && (
                  <span
                    className="tw:mx-[1.5625rem] tw:basis-full tw:rounded-lg tw:bg-[#fbecee] tw:px-3.25 tw:py-2.75 tw:text-[0.6875rem] tw:text-[#b05165] tw:workspace-night:text-[#ffb7b7]"
                    role="alert"
                  >
                    {error}
                  </span>
                )}
                <TeamAction appearance="secondary" onClick={() => setImportOpen(false)}>
                  Cancelar
                </TeamAction>
                <TeamAction
                  disabled={!importRows.length || saving || importBusy}
                  onClick={() => void saveRows(importRows, `Equipe de ${monthLabel(activeMonth)} confirmada.`)}
                >
                  {saving ? <Loader2 className="tw:animate-spin" size={16} /> : <Check size={16} />} Cadastrar /
                  atualizar {importRows.length} {importRows.length === 1 ? 'colaborador' : 'colaboradores'}
                </TeamAction>
              </TeamDialogFooter>
            </DialogFrame>
          </div>,
          document.body,
        )}
      {reviewOpen && companyId && (
        <TeamMonthWizard
          companyId={companyId}
          month={month}
          members={members.filter((m) => !m.archived_at)}
          vacancies={vacancies}
          serialize={payload}
          onClose={() => setReviewOpen(false)}
          onSaved={() => loadTeam(companyId)}
        />
      )}
      <div className="team-print-heading tw:hidden tw:print:in-[body.team-printing]:mb-5 tw:print:in-[body.team-printing]:block">
        <h1>Equipe · {selectedCompany?.display_name}</h1>
        <p>
          {monthLabel(month)} · {filtered.length} pessoas no filtro
        </p>
      </div>
    </div>
  );
  return staff ? page : <Shell role={role}>{page}</Shell>;
}
