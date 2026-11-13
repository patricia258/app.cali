import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { StatusBadge } from '../../../components/ds/StatusBadge';
import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowSegments } from '../../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { WorkflowList, WorkflowListRow } from '../../../components/ds/WorkflowList';
import { useMapaDeliveryState } from './hooks/useMapaDeliveryState';
import { sendMapaReport } from '../../../api/admin/people-map/delivery';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { EmptyState } from '../../../components/ds/EmptyState';
import { FieldLabel } from '../../../components/ds/FieldLabel';
import { AdminListControls, AdminListFilter, AdminListSearch } from '../../../components/workspace/components/AdminListControls';
import { AdminRowActions, AdminRowButton } from '../../../components/workspace/components/AdminRowActions';
import { AdminMetricsStrip } from '../../../components/workspace/components/AdminMetricsStrip';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { officialReportOrigin, useOfficialReportAuth } from './hooks/useOfficialReportAuth';
import {
  ArrowUpRight,
  Building2,
  ChevronLeft,
  FileText,
  Mail,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { readMapaReviewCatalog, saveMapaReview } from '../../../api/admin/people-map/reviews';
import { PeopleMapSendDialog } from './components/PeopleMapSendDialog';

type MapaStatus = 'novo' | 'em_andamento' | 'em_revisao' | 'pre_enviado' | 'enviado' | 'cancelado' | 'excluido';
type JourneyStatus = 'concluido' | 'andamento' | 'abandono';

type DiagnosticoV2 = {
  version?: number;
  d1?: { processos?: number[]; estrutura?: number[]; governanca?: number[] };
  d2?: { comportamento?: number[]; valores?: { cultura_decisao?: number | null; lista?: string[]; vividos?: string[]; desenvolver?: string }; desenvolvimento?: number[] };
  d3?: { indicadores?: number[]; decisao?: number[]; tecnologia?: number[] };
  d4?: { tamanho?: number[]; vinculos?: { gestao?: number | null; composicao?: Record<string, number | null> }; rotatividade?: number[] };
  qualificacao?: Record<string, string | null>;
};

type MapaRecord = {
  id: string;
  created_at: string;
  protocolo: string;
  status: MapaStatus | string;
  c_nome: string;
  c_empresa: string;
  c_cargo: string | null;
  c_email: string;
  c_whatsapp: string;
  c_preferencia_contato: string | null;
  c_linkedin_site: string | null;
  c_email_corporativo_confirmado: boolean | null;
  q_prazo: string | null;
  q_decisor: string[] | null;
  q_decisor_outro: string | null;
  q_formato: string | null;
  q_investimento: string | null;
  q_origem: string | null;
  observacoes: Record<string, string> | null;
  relatorio_enviado_em: string | null;
  diagnostico_v2: DiagnosticoV2 | null;
  d1_rh_hoje: number | null;
  d1_processos: number | null;
  d1_cargos_salarios: number | null;
  d2_valores: number | null;
  d2_lideres_preparo: number | null;
  d2_comportamento_dono: number | null;
  d2_sucessao: number | null;
  d3_indicadores: number | null;
  d3_decisao: number | null;
  d3_custo: number | null;
  d4_colaboradores: number | null;
  d4_unidades: number | null;
  d4_mix_clt: string | null;
  d4_mix_pj: string | null;
  d4_mix_estagio: string | null;
  d4_mix_freela: string | null;
  d4_turnover: number | null;
  l1_tecnologia: number | null;
  l2_execucao: number | null;
  l3_rh_interno: number | null;
};

type JourneyRecord = {
  session_id: string;
  accessed_at: string;
  last_seen_at: string;
  max_step: number | null;
  started: boolean | null;
  submitted: boolean | null;
  copy_events: number | null;
  referrer_host: string | null;
  device_type: string | null;
};

type ObservationDraft = {
  d1_obs: string;
  d2_obs: string;
  d3_obs: string;
  d4_obs: string;
  parecer: string;
  servico_recomendado: string;
};

const STATUS_OPTIONS: Array<{ value: MapaStatus; label: string }> = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'pre_enviado', label: 'Pré-enviado' },
  { value: 'enviado', label: 'Enviado ao cliente' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'excluido', label: 'Excluído' },
];

const SERVICES = [
  'Diagnóstico Executivo de People',
  'Assessoria Estratégica Mensal — CALI Partner',
  'Assessoria Estratégica Mensal — CALI Full',
  'Projeto de Cultura e Direção',
  'Shadowing de Liderança',
  'Mentoria para Profissionais de RH',
  'Marca Empregadora',
  'Treinamentos & Palestras',
];

const SCALE_LABELS = ['—', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'];

function mean(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
function scale10(value: number | null) { return value === null ? null : value * 2; }
function scoresFor(record: MapaRecord) {
  const v2 = record.diagnostico_v2;
  if (v2?.version === 2 && v2.d1 && v2.d2 && v2.d3 && v2.d4) {
    const d1 = scale10(mean([mean(v2.d1.processos || []), mean(v2.d1.estrutura || []), mean(v2.d1.governanca || [])]));
    const d2 = scale10(mean([mean(v2.d2.comportamento || []), v2.d2.valores?.cultura_decisao, mean(v2.d2.desenvolvimento || [])]));
    const d3 = scale10(mean([mean(v2.d3.indicadores || []), mean(v2.d3.decisao || []), mean(v2.d3.tecnologia || [])]));
    const d4 = scale10(mean([mean(v2.d4.tamanho || []), v2.d4.vinculos?.gestao, mean(v2.d4.rotatividade || [])]));
    const total = [d1, d2, d3, d4].every((value) => value !== null)
      ? Number(((d1 || 0) * .25 + (d2 || 0) * .30 + (d3 || 0) * .20 + (d4 || 0) * .25).toFixed(1))
      : null;
    return { d1, d2, d3, d4, total };
  }
  const d1 = scale10(mean([record.d1_rh_hoje, record.d1_processos, record.d1_cargos_salarios]));
  const d2 = scale10(mean([record.d2_valores, record.d2_lideres_preparo, record.d2_comportamento_dono, record.d2_sucessao]));
  const d3 = scale10(mean([record.d3_indicadores, record.d3_decisao, record.d3_custo]));
  const d4 = scale10(mean([record.d4_colaboradores, record.d4_unidades, record.d4_turnover]));
  const total = [d1, d2, d3, d4].every((value) => value !== null)
    ? Number(((d1 || 0) * .25 + (d2 || 0) * .30 + (d3 || 0) * .20 + (d4 || 0) * .25).toFixed(1))
    : null;
  return { d1, d2, d3, d4, total };
}
function normalizeStatus(status: string): MapaStatus { return status === 'em_revisao' ? 'em_andamento' : (status as MapaStatus); }
function fmtScore(value: number | null) { return value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function formatDate(value: string | null, time = false) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', time
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}
function scoreLabel(value: number | null | undefined) { return value == null ? '—' : `${value}/5 · ${SCALE_LABELS[value] || ''}`; }
function journeyStatus(record: JourneyRecord): JourneyStatus {
  if (record.submitted) return 'concluido';
  const minutes = (Date.now() - new Date(record.last_seen_at).getTime()) / 60000;
  return minutes <= 15 ? 'andamento' : 'abandono';
}
function observationDraft(record: MapaRecord): ObservationDraft {
  const saved = record.observacoes || {};
  return {
    d1_obs: saved.d1_obs || '', d2_obs: saved.d2_obs || '', d3_obs: saved.d3_obs || '', d4_obs: saved.d4_obs || '',
    parecer: saved.parecer || '', servico_recomendado: saved.servico_recomendado || 'Diagnóstico Executivo de People',
  };
}
function dimensionRows(record: MapaRecord, dimension: 1 | 2 | 3 | 4) {
  const v2 = record.diagnostico_v2;
  if (v2?.version === 2) {
    if (dimension === 1) return [['Cargos e atribuições', v2.d1?.processos?.[0]], ['Fluxos de admissão, promoção e saída', v2.d1?.processos?.[1]], ['Políticas aplicadas', v2.d1?.processos?.[2]], ['Hierarquia clara', v2.d1?.estrutura?.[0]], ['Proporção do time de gente', v2.d1?.estrutura?.[1]], ['Regras de decisão', v2.d1?.governanca?.[0]], ['Registro e controle', v2.d1?.governanca?.[1]]] satisfies Array<[string, number | null | undefined]>;
    if (dimension === 2) return [['Iniciativa', v2.d2?.comportamento?.[0]], ['Responsabilidade por resultado', v2.d2?.comportamento?.[1]], ['Postura com o negócio', v2.d2?.comportamento?.[2]], ['Cultura orienta decisão', v2.d2?.valores?.cultura_decisao], ['Pipeline de sucessão', v2.d2?.desenvolvimento?.[0]], ['Programa de liderança', v2.d2?.desenvolvimento?.[1]], ['Preparo para responsabilidades maiores', v2.d2?.desenvolvimento?.[2]]] satisfies Array<[string, number | null | undefined]>;
    if (dimension === 3) return [['Indicadores existem', v2.d3?.indicadores?.[0]], ['Revisão periódica', v2.d3?.indicadores?.[1]], ['Decisões de gente por dados', v2.d3?.decisao?.[0]], ['Referência compartilhada', v2.d3?.decisao?.[1]], ['Ferramentas de RH', v2.d3?.tecnologia?.[0]], ['Uso de IA no RH', v2.d3?.tecnologia?.[1]]] satisfies Array<[string, number | null | undefined]>;
    return [['Tamanho do quadro', v2.d4?.tamanho?.[0]], ['Distribuição geográfica', v2.d4?.tamanho?.[1]], ['Gestão dos regimes', v2.d4?.vinculos?.gestao], ['Nível de turnover', v2.d4?.rotatividade?.[0]], ['Custo de gente no resultado', v2.d4?.rotatividade?.[1]]] satisfies Array<[string, number | null | undefined]>;
  }
  if (dimension === 1) return [['Como descreve o RH hoje', record.d1_rh_hoje], ['Processos formalizados', record.d1_processos], ['Cargos e salários', record.d1_cargos_salarios]] satisfies Array<[string, number | null | undefined]>;
  if (dimension === 2) return [['Valores praticados', record.d2_valores], ['Preparo das lideranças', record.d2_lideres_preparo], ['Senso de responsabilidade', record.d2_comportamento_dono], ['Plano de sucessão', record.d2_sucessao]] satisfies Array<[string, number | null | undefined]>;
  if (dimension === 3) return [['Acompanha indicadores', record.d3_indicadores], ['Decisão por dado', record.d3_decisao], ['Conhece custo de gente', record.d3_custo]] satisfies Array<[string, number | null | undefined]>;
  return [['Colaboradores', record.d4_colaboradores], ['Unidades', record.d4_unidades], ['Turnover', record.d4_turnover]] satisfies Array<[string, number | null | undefined]>;
}
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdminPeopleMapPage() {
  const reportWindows = useRef(new WeakSet<Window>());
  useOfficialReportAuth({ popup: reportWindows });
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const [records, setRecords] = useState<MapaRecord[]>([]);
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [tab, setTab] = useState<'respostas' | 'jornada'>('respostas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [journeyFilter, setJourneyFilter] = useState('todos');
  const [journeyQuery, setJourneyQuery] = useState('');
  const [journeyPeriod, setJourneyPeriod] = useState('todos');
  const [selected, setSelected] = useState<MapaRecord | null>(null);
  const [draft, setDraft] = useState<ObservationDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');
  const delivery = useMapaDeliveryState(selected?.id, emailOpen);
  const deliveryReady = delivery.isSuccess && !delivery.isFetching;

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const catalog = await readMapaReviewCatalog();
      if (catalog.recordError) setError(`Não foi possível carregar as respostas reais: ${catalog.recordError}`);
      else setRecords(((catalog.records ?? []) as MapaRecord[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      if (catalog.journeyError) setError((current) => current || `Não foi possível carregar a jornada: ${catalog.journeyError}`);
      else setJourneys(((catalog.journeys ?? []) as JourneyRecord[]).sort((a, b) => new Date(b.accessed_at).getTime() - new Date(a.accessed_at).getTime()).slice(0, 1000));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o Mapa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    return records.filter((record) => {
      const haystack = [record.c_empresa, record.c_nome, record.c_email, record.c_cargo, record.protocolo].join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle)) && (statusFilter === 'todos' || normalizeStatus(record.status) === statusFilter);
    });
  }, [records, query, statusFilter]);

  const filteredJourneys = useMemo(() => {
    const needle = journeyQuery.trim().toLocaleLowerCase('pt-BR');
    const days = journeyPeriod === 'todos' ? 0 : Number(journeyPeriod);
    const cutoff = days ? Date.now() - days * 86400000 : 0;
    return journeys.filter((item) => {
      const haystack = `${item.referrer_host || 'acesso direto'} ${item.device_type || 'unknown'}`.toLocaleLowerCase('pt-BR');
      const statusOk = journeyFilter === 'todos' || journeyStatus(item) === journeyFilter || (journeyFilter === 'copiou' && Number(item.copy_events || 0) > 0);
      const periodOk = !cutoff || new Date(item.accessed_at).getTime() >= cutoff;
      return (!needle || haystack.includes(needle)) && statusOk && periodOk;
    });
  }, [journeys, journeyFilter, journeyQuery, journeyPeriod]);

  const kpis = useMemo(() => ({ total: records.length, novos: records.filter((r) => normalizeStatus(r.status) === 'novo').length, andamento: records.filter((r) => normalizeStatus(r.status) === 'em_andamento').length, enviados: records.filter((r) => normalizeStatus(r.status) === 'enviado').length }), [records]);
  const journeyKpis = useMemo(() => ({ visitas: journeys.length, iniciados: journeys.filter((j) => j.started).length, abandonos: journeys.filter((j) => journeyStatus(j) === 'abandono').length, copias: journeys.reduce((sum,j) => sum + Number(j.copy_events || 0), 0) }), [journeys]);

  function openRecord(record: MapaRecord) { setSelected(record); setDraft(observationDraft(record)); setFeedback(''); document.body.classList.add('workspace-modal-open'); }
  function closeRecord() { setEmailOpen(false); document.body.classList.remove('workspace-modal-open'); setSelected(null); setDraft(null); setFeedback(''); }

  async function persist(record: MapaRecord, nextStatus: string, nextObservations: Record<string, string>) {
    try {
      return await saveMapaReview(record.id, normalizeStatus(nextStatus), nextObservations);
    } catch (reason) {
      setError(`Não foi possível salvar no Mapa: ${reason instanceof Error ? reason.message : 'erro inesperado'}`);
      return false;
    }
  }
  async function updateStatus(record: MapaRecord, nextStatus: string) {
    const ok = await persist(record, nextStatus, record.observacoes || {}); if (!ok) return;
    const normalized = normalizeStatus(nextStatus);
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: normalized } : item));
    if (selected?.id === record.id) setSelected((current) => current ? { ...current, status: normalized } : current);
  }
  async function saveReview() {
    if (!selected || !draft) return false;
    setSaving(true); setFeedback('Salvando revisão…');
    const ok = await persist(selected, selected.status, draft);
    if (!ok) { setFeedback('Não foi possível salvar agora.'); setSaving(false); return false; }
    const saved = { ...selected, observacoes: draft };
    setSelected(saved); setRecords((current) => current.map((item) => item.id === saved.id ? saved : item));
    setFeedback('Revisão salva ✓'); setSaving(false); return true;
  }
  async function openReport() {
    if (!selected) return;
    const popup = window.open('', '_blank');
    const saved = await saveReview();
    if (!saved) { popup?.close(); return; }
    const url = `${officialReportOrigin}/relatorio.html?id=${encodeURIComponent(selected.id)}&workspace=1&atualizado=${Date.now()}`;
    if (popup) {
      reportWindows.current.add(popup);
      popup.location.href = url;
    } else {
      const report = window.open(url, '_blank');
      if (report) reportWindows.current.add(report);
    }
  }
  function openWhatsapp() {
    if (!selected) return;
    const raw = (selected.c_whatsapp || '').replace(/\D/g,'');
    const number = (raw.length === 10 || raw.length === 11) ? `55${raw}` : raw;
    if (!number) return;
    const name = (selected.c_nome || '').trim().split(/\s+/)[0] || '';
    const text = `Oi${name ? `, ${name}` : ''}! Aqui é a Patrícia, da CALI RH. Estou entrando em contato sobre o seu Mapa de People. Quando puder, me chama por aqui para conversarmos sobre a leitura e os próximos passos.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
  }
  async function sendEmail() {
    if (!selected || sendingEmail || !deliveryReady || !delivery.data) return;
    const { revision, hasPdf } = delivery.data;
    const recipient = selected.c_email.trim().toLowerCase();
    if (!recipient.includes('@')) { setEmailFeedback('Confira o e-mail da resposta do Mapa.'); return; }
    const attachment = hasPdf ? null : pdfFile;
    if (!hasPdf && !attachment) return;
    if (attachment && attachment.type !== 'application/pdf' && !attachment.name.toLowerCase().endsWith('.pdf')) { setEmailFeedback('Selecione um arquivo PDF.'); return; }
    if (attachment && attachment.size > 8 * 1024 * 1024) { setEmailFeedback('O PDF precisa ter até 8 MB.'); return; }
    const fileIdentity = attachment && [attachment.name, attachment.size, attachment.lastModified];
    const requestId = await confirmDelivery([recipient], [selected.id, revision, fileIdentity]);
    if (!requestId) return;
    setSendingEmail(true); setEmailFeedback('Enviando…');
    try {
      const pdfBase64 = attachment ? await fileToBase64(attachment) : undefined;
      const data = await sendMapaReport({ responseId: selected.id, revision, pdfBase64, requestId, recipient });
      completeDelivery();
      void delivery.refetch();
      setEmailFeedback(`Enviado para ${data.to || selected.c_email} ✓`);
      setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, status: 'enviado', relatorio_enviado_em: new Date().toISOString() } : item));
      setSelected((current) => current ? { ...current, status: 'enviado', relatorio_enviado_em: new Date().toISOString() } : current);
      setTimeout(() => { setEmailOpen(false); setPdfFile(null); setEmailFeedback(''); }, 1400);
    } catch (err) { setEmailFeedback(err instanceof Error ? err.message : 'Não foi possível enviar.'); }
    finally { setSendingEmail(false); }
  }

  const selectedScores = selected ? scoresFor(selected) : null;
  const qv2 = selected?.diagnostico_v2?.qualificacao || {};

  const statusTone=(value:string)=>/envi/.test(value)?'green':/andamento|revis/.test(value)?'purple':/novo/.test(value)?'yellow':'blue';
  const deviceLabel=(value?:string|null)=>(({mobile:'Celular',tablet:'Tablet',desktop:'Computador',unknown:'Não identificado'} satisfies Record<string,string>)[value||'unknown']||value||'Não identificado');

  const mapResponseRow = 'tw:grid-cols-[2.615rem_minmax(0,2.2fr)_minmax(0,.6fr)_minmax(0,.9fr)_minmax(0,1.1fr)_7.385rem]! tw:[@media(max-width:53.75rem)]:grid-cols-[2.615rem_minmax(0,1fr)_auto]! tw:[@media(max-width:53.75rem)]:[&>span:nth-child(n+3):nth-child(-n+5)]:hidden!';
  const mapJourneyRow = 'tw:grid-cols-[repeat(2,minmax(0,1.2fr))_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,.5fr)_minmax(0,1fr)]! tw:[@media(max-width:53.75rem)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]! tw:[@media(max-width:53.75rem)]:[&>span:nth-child(2)]:hidden! tw:[@media(max-width:53.75rem)]:[&>span:nth-child(n+4):not(:last-child)]:hidden!';
  const statusColor: Record<string, string> = {
    green: 'tw:border-[#cfe9da] tw:bg-[#e6f6ec] tw:text-[#31805a]',
    yellow: 'tw:border-[#f0dfc0] tw:bg-[#fff2dc] tw:text-[#97672f]',
    purple: 'tw:border-[#ddd3f3] tw:bg-[#f1ecfb] tw:text-[#6a52a3]',
  };
  const mapModalCard = 'tw:rounded-[1.308rem] tw:border tw:border-solid tw:border-[#5a1e2d1c] tw:bg-white/73 tw:px-[1.538rem] tw:py-[1.462rem] tw:workspace-night:border-[#f7f3ee1f] tw:workspace-night:bg-[#281d21d1]';
  const mapModalInput = 'tw:rounded-[0.538rem]! tw:border tw:border-solid tw:border-[#e5d8d0]! tw:bg-white! tw:text-[0.923rem]/[inherit]! tw:text-[#322f2c]! tw:focus:border-cali-brand! tw:workspace-night:border-[#f7f3ee24]! tw:workspace-night:bg-[#241b1e]! tw:workspace-night:text-cali-day-canvas!';
  const mapModalSideTitle = 'tw:m-0! tw:text-[1.154rem]/[inherit]! tw:text-[#302a2c] tw:workspace-night:text-cali-day-canvas';
  const mapModalFacts = 'tw:mt-[1.077rem] tw:mb-0 tw:grid tw:gap-[0.769rem] tw:[&>div]:grid tw:[&>div]:gap-[0.154rem] tw:[&>div]:border-0 tw:[&>div]:border-b tw:[&>div]:border-solid tw:[&>div]:border-[#5a1e2d12] tw:[&>div]:pb-[0.692rem] tw:[&>div:last-child]:border-b-0 tw:[&>div:last-child]:pb-0 tw:[&_dt]:text-[0.769rem] tw:[&_dt]:font-[750] tw:[&_dt]:tracking-[0.06em] tw:[&_dt]:text-[#9b8e91] tw:[&_dt]:uppercase tw:[&_dd]:m-0 tw:[&_dd]:text-[0.923rem] tw:[&_dd]:text-[#514649] tw:[&_dd]:[overflow-wrap:anywhere] tw:workspace-night:[&_dt]:text-[#9f9295] tw:workspace-night:[&_dd]:text-[#c4b8ba]';
  const mapModalAction = 'tw:inline-flex tw:items-center tw:justify-center tw:gap-[0.538rem] tw:rounded-[0.538rem]! tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-[1.077rem]! tw:py-[0.769rem]! tw:text-[0.846rem]/[1.2]! tw:font-bold tw:text-cali-brand tw:shadow-none! tw:disabled:cursor-not-allowed tw:disabled:opacity-45';

  return <Shell role="admin">
    <WorkspaceAdminPage className="v2-admin-peoplemap v2-client-module"><WorkspaceAdminContent><WorkflowPage>
      <WorkflowHeading className="tw:items-start"><div><small>BACKOFFICE / MAPA DE PEOPLE</small><h1>Mapa de People</h1><p>Respostas do diagnóstico público, revisão da CALI, devolutiva e a jornada de quem acessou.</p></div><div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="workflowSecondary" type="button" onClick={loadAll}><RefreshCw size={15}/> Atualizar</Button><a className="tw:inline-flex tw:items-center tw:justify-center tw:gap-[0.538rem] tw:rounded-[0.538rem]
        tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1.077rem] tw:py-[0.769rem]
        tw:text-[0.846rem]/[inherit] tw:font-semibold tw:text-white tw:no-underline tw:hover:bg-(--cali-color-burgundy-deep)
        tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold" href="https://mapa.calirh.com" target="_blank" rel="noreferrer">Abrir Mapa público <ArrowUpRight size={15}/></a></div></WorkflowHeading>
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      {tab === 'respostas' ? <>
        <AdminMetricsStrip metrics={[
          { label: 'Total de respostas', value: kpis.total, description: 'base real do Mapa' },
          { label: 'Novos', value: kpis.novos, description: 'aguardando sua leitura' },
          { label: 'Em andamento', value: kpis.andamento, description: 'revisões em curso' },
          { label: 'Enviados', value: kpis.enviados, description: 'devolutivas concluídas' },
        ]} />
        <AdminListControls>
          <WorkflowSegments className="tw:flex-none"><button type="button" className="on" onClick={() => setTab('respostas')}>Respostas</button><button type="button" onClick={() => setTab('jornada')}>Jornada e acessos</button></WorkflowSegments>
          <AdminListFilter aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</AdminListFilter>
          <AdminListSearch value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, decisor, e-mail ou protocolo" aria-label="Buscar respostas" />
        </AdminListControls>
        {loading ? <LoadingState>Carregando respostas reais…</LoadingState> : filtered.length === 0 ? <EmptyState variant="workflow"><strong>Nenhuma resposta encontrada</strong><p>A base foi consultada; ajuste os filtros para revisar os registros.</p></EmptyState> : <WorkflowList className="v2-map-list tw:mt-[1.231rem]">
          <WorkflowListRow header className={`${mapResponseRow} tw:[@media(max-width:53.75rem)]:hidden!`}><span/><span>Empresa / Decisor</span><span>Score</span><span>Data</span><span>Status</span><span/></WorkflowListRow>
          {filtered.map((record) => { const score=scoresFor(record).total; const status=normalizeStatus(record.status); return <WorkflowListRow className={mapResponseRow} key={record.id}>
            <span className="v2-record-logo tw:grid tw:size-[2.615rem] tw:place-items-center tw:overflow-hidden tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:text-[0.923rem]/none tw:font-extrabold tw:text-cali-brand"><span className="tw:grid tw:size-full tw:place-items-center" aria-hidden="true">{(record.c_empresa||record.c_nome||'C').slice(0,1).toUpperCase()}</span></span>
            <span><small>{record.protocolo}</small><strong>{record.c_empresa||'Empresa não informada'}</strong><small>{record.c_nome}{record.c_cargo?` · ${record.c_cargo}`:''}</small></span>
            <span className="v2-map-score tw:inline-flex tw:items-baseline tw:gap-[0.154rem]"><strong className="tw:text-[1.231rem]/[inherit] tw:text-cali-brand">{fmtScore(score)}</strong><small className="tw:text-[0.769rem]/[inherit] tw:text-[#a18e80]">/10</small></span>
            <span>{formatDate(record.created_at)}</span>
            <span><select className={`v2-map-status tw:h-[2.308rem] tw:max-w-full tw:cursor-pointer tw:rounded-[0.462rem] tw:border tw:border-solid tw:pr-8 tw:pl-[0.769rem] tw:text-[0.808rem]/[inherit] tw:font-bold ${statusColor[statusTone(status)] ?? "tw:border-[#e5d9d0] tw:bg-white tw:text-cali-brand"}`} aria-label="Status da resposta" value={status} onChange={(e)=>updateStatus(record,e.target.value)}>{STATUS_OPTIONS.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></span>
            <AdminRowActions><AdminRowButton withText onClick={()=>openRecord(record)}>Revisar <ArrowUpRight size={14}/></AdminRowButton></AdminRowActions>
          </WorkflowListRow>; })}
        </WorkflowList>}
      </> : <>
        <AdminMetricsStrip metrics={[
          { label: 'Visitas', value: journeyKpis.visitas, description: 'sessões registradas' },
          { label: 'Iniciados', value: journeyKpis.iniciados, description: 'começaram o diagnóstico' },
          { label: 'Abandonos', value: journeyKpis.abandonos, description: 'sem envio concluído' },
          { label: 'Cópias', value: journeyKpis.copias, description: 'eventos de cópia' },
        ]} />
        <AdminListControls>
          <WorkflowSegments className="tw:flex-none"><button type="button" onClick={() => setTab('respostas')}>Respostas</button><button type="button" className="on" onClick={() => setTab('jornada')}>Jornada e acessos</button></WorkflowSegments>
          <AdminListFilter aria-label="Jornada" value={journeyFilter} onChange={(e)=>setJourneyFilter(e.target.value)}><option value="todos">Todas as jornadas</option><option value="concluido">Enviou</option><option value="andamento">Em andamento</option><option value="abandono">Abandonou</option><option value="copiou">Copiou conteúdo</option></AdminListFilter>
          <AdminListFilter aria-label="Período" value={journeyPeriod} onChange={(e)=>setJourneyPeriod(e.target.value)}><option value="todos">Todo período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></AdminListFilter>
          <AdminListSearch value={journeyQuery} onChange={(e)=>setJourneyQuery(e.target.value)} placeholder="Buscar origem ou dispositivo" aria-label="Buscar jornadas" />
        </AdminListControls>
        {filteredJourneys.length ? <WorkflowList className="v2-journey-list tw:mt-[1.231rem]">
          <WorkflowListRow header className={`${mapJourneyRow} tw:[@media(max-width:53.75rem)]:hidden!`}><span>Acesso</span><span>Último sinal</span><span>Etapa</span><span>Dispositivo</span><span>Origem</span><span>Cópias</span><span>Situação</span></WorkflowListRow>
          {filteredJourneys.map((item)=>{const status=journeyStatus(item);return <WorkflowListRow className={mapJourneyRow} key={item.session_id}><span>{formatDate(item.accessed_at,true)}</span><span>{formatDate(item.last_seen_at,true)}</span><span>{item.submitted?'Enviado':item.started?`Etapa ${Number(item.max_step)||1} de 7`:'Só abriu'}</span><span>{deviceLabel(item.device_type)}</span><span>{item.referrer_host||'Acesso direto'}</span><span>{Number(item.copy_events||0)}</span><span><StatusBadge variant="workflow" tone={status==='concluido'?'green':status==='andamento'?'purple':'red'}>{status==='concluido'?'Enviou':status==='andamento'?'Em andamento':'Abandonou'}</StatusBadge></span></WorkflowListRow>})}
        </WorkflowList> : <EmptyState variant="workflow"><strong>Nenhuma jornada neste recorte.</strong><p>Ajuste o período ou os filtros.</p></EmptyState>}
      </>}
    </WorkflowPage></WorkspaceAdminContent></WorkspaceAdminPage>

    {selected && draft && selectedScores && <div className="workspace-modal-layer people-map-modal-layer tw:fixed tw:inset-0 tw:z-2147483000 tw:grid tw:h-dvh tw:w-screen tw:place-items-center tw:bg-[#1b15188a]! tw:px-[clamp(1.077rem,3vw,3.231rem)] tw:py-[clamp(1.077rem,3vh,2.308rem)] tw:backdrop-blur-[0.769rem] tw:backdrop-saturate-90 tw:[@media(max-width:45rem)]:p-[0.538rem]" role="presentation"><DialogFrame className="workspace-standard-modal people-map-modal tw:grid! tw:h-[min(69.231rem,calc(100dvh-2.923rem))] tw:w-[min(101.538rem,100%)]! tw:max-w-none! tw:grid-rows-[auto_minmax(0,1fr)_auto] tw:overflow-hidden! tw:rounded-[1.077rem]! tw:border tw:border-solid tw:border-[#e8ded6]! tw:bg-white! tw:p-0! tw:font-cali-body tw:shadow-[0_25px_85px_#2418234a]! tw:[@media(max-width:45rem)]:h-[calc(100dvh-1.077rem)]" aria-label="Editar diagnóstico"><header className="people-map-modal-header tw:border-0 tw:border-b tw:border-solid tw:border-[#eadfd6] tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:px-8 tw:pt-[1.692rem] tw:pb-[1.538rem] tw:[@media(max-width:45rem)]:px-[1.231rem] tw:[@media(max-width:45rem)]:pt-[1.308rem] tw:[@media(max-width:45rem)]:pb-[1.154rem]"><button className="people-map-back tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[0.923rem] tw:py-[0.615rem] tw:text-[0.846rem]/[inherit] tw:font-bold tw:text-cali-brand" type="button" onClick={closeRecord}><ChevronLeft size={18}/>Voltar ao Mapa</button><div className="people-map-modal-identity tw:mt-[1.231rem] tw:flex tw:items-end tw:justify-between tw:gap-8 tw:[@media(max-width:45rem)]:items-start"><div><span className="tw:text-[0.692rem]/[inherit] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold">{selected.protocolo}</span><h2 className="tw:mt-[0.385rem]! tw:mb-[0.308rem]! tw:text-[1.692rem]/[1.08]! tw:font-bold tw:text-cali-brand">{selected.c_empresa}</h2><p className="tw:m-0! tw:text-base/[inherit] tw:text-[#817477] tw:workspace-night:text-[#c4b8ba]">{selected.c_nome}{selected.c_cargo?` · ${selected.c_cargo}`:''} · respondido em {formatDate(selected.created_at)}</p></div><div className="people-map-score-hero tw:grid tw:min-w-[8.462rem] tw:grid-cols-[auto_auto] tw:items-baseline tw:justify-end tw:text-right"><strong className="tw:text-[2.769rem]/none tw:tracking-[-0.04em] tw:text-cali-brand tw:[@media(max-width:45rem)]:text-[2.231rem]">{fmtScore(selectedScores.total)}</strong><span className="tw:ml-[0.231rem] tw:text-[0.923rem]/[inherit] tw:text-[#9c8e91]">/10</span><small className="tw:col-span-full tw:mt-[0.231rem] tw:text-[0.846rem]/[inherit] tw:text-[#9c8e91]">score geral</small></div></div></header><div className="people-map-modal-scroll tw:min-h-0 tw:overflow-auto tw:[scrollbar-width:none]"><div className="people-map-detail-grid tw:grid tw:grid-cols-[minmax(0,1fr)_minmax(22.308rem,26.154rem)] tw:items-start tw:gap-[1.385rem] tw:px-8 tw:pt-[1.692rem] tw:pb-[2.308rem] tw:[@media(max-width:61.25rem)]:grid-cols-1 tw:[@media(max-width:45rem)]:px-[1.077rem] tw:[@media(max-width:45rem)]:pt-[1.154rem] tw:[@media(max-width:45rem)]:pb-[1.692rem]"><main className="people-map-dimensions tw:grid tw:gap-[1.077rem]">{([[1,'D1 · Maturidade Estrutural',selectedScores.d1,'d1_obs'],[2,'D2 · Liderança & Cultura',selectedScores.d2,'d2_obs'],[3,'D3 · Dados & Decisão',selectedScores.d3,'d3_obs'],[4,'D4 · Dimensões Operacionais',selectedScores.d4,'d4_obs']] as const).map(([dimension,title,score,key])=><section className={mapModalCard} key={dimension}><div className="people-map-dimension-head tw:flex tw:items-start tw:justify-between tw:gap-[1.538rem]"><div><span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-[#a88b76]">DIMENSÃO {dimension}</span><h3 className="tw:mt-[0.385rem] tw:mb-0 tw:text-[1.385rem]/[inherit] tw:text-[#302a2c] tw:workspace-night:text-cali-day-canvas">{title}</h3></div><strong className="tw:text-[1.615rem]/[inherit] tw:text-cali-brand">{fmtScore(score)}<small className="tw:ml-[0.154rem] tw:text-[0.769rem]/[inherit] tw:text-[#a19396]">/10</small></strong></div><div className="people-map-answer-grid tw:mt-[1.154rem] tw:mb-[1.231rem] tw:grid tw:grid-cols-2 tw:gap-x-[1.077rem] tw:gap-y-[0.615rem] tw:[@media(max-width:45rem)]:grid-cols-1">{dimensionRows(selected,dimension).map(([label,value])=><div key={label} className="tw:rounded-[0.769rem] tw:bg-[#5a1e2d09] tw:px-[0.923rem] tw:py-[0.769rem] tw:workspace-night:bg-white/4"><span className="tw:block tw:text-[0.846rem]/[inherit] tw:text-[#8a7d80] tw:workspace-night:text-[#9f9295]">{label}</span><strong className="tw:mt-[0.231rem] tw:block tw:text-[0.923rem]/[inherit] tw:font-bold tw:text-[#514649] tw:workspace-night:text-[#d7ccce]">{scoreLabel(value)}</strong></div>)}</div><FieldLabel className="tw:mt-[0.923rem]">Observação da Patrícia<textarea className={mapModalInput} rows={3} value={draft[key]} onChange={(e)=>setDraft((current)=>current?{...current,[key]:e.target.value}:current)}/></FieldLabel></section>)}<section className={`${mapModalCard} tw:border-[#b58c5247]`}><div className="people-map-dimension-head tw:flex tw:items-start tw:justify-between tw:gap-[1.538rem]"><div><span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-[#a88b76]">DEVOLUTIVA</span><h3 className="tw:mt-[0.385rem] tw:mb-0 tw:text-[1.385rem]/[inherit] tw:text-[#302a2c] tw:workspace-night:text-cali-day-canvas">Parecer final</h3></div><FileText size={22}/></div><FieldLabel className="tw:mt-[0.923rem]">O que você indicaria primeiro<textarea className={mapModalInput} rows={5} value={draft.parecer} onChange={(e)=>setDraft((current)=>current?{...current,parecer:e.target.value}:current)}/></FieldLabel><FieldLabel className="tw:mt-[0.923rem]">Serviço recomendado<select className={mapModalInput} value={draft.servico_recomendado} onChange={(e)=>setDraft((current)=>current?{...current,servico_recomendado:e.target.value}:current)}>{SERVICES.map((service)=><option key={service}>{service}</option>)}</select></FieldLabel></section></main><aside className="people-map-contact-column tw:sticky tw:top-0 tw:grid tw:gap-[0.923rem] tw:[@media(max-width:61.25rem)]:static tw:[@media(max-width:61.25rem)]:grid-cols-2 tw:[@media(max-width:45rem)]:grid-cols-1"><section className={mapModalCard}><div className="people-map-side-title tw:flex tw:items-center tw:gap-[0.692rem] tw:text-cali-brand"><UserRound size={19}/><h3 className={mapModalSideTitle}>Contato</h3></div><dl className={mapModalFacts}><div><dt>Nome</dt><dd>{selected.c_nome}</dd></div><div><dt>Empresa</dt><dd>{selected.c_empresa}</dd></div><div><dt>Cargo</dt><dd>{selected.c_cargo||'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{selected.c_email}</dd></div><div><dt>WhatsApp</dt><dd>{selected.c_whatsapp}</dd></div><div><dt>Preferência</dt><dd>{selected.c_preferencia_contato||'Não informada'}</dd></div><div><dt>LinkedIn / site</dt><dd>{selected.c_linkedin_site||'Não informado'}</dd></div></dl></section><section className={mapModalCard}><div className="people-map-side-title tw:flex tw:items-center tw:gap-[0.692rem] tw:text-cali-brand"><Building2 size={19}/><h3 className={mapModalSideTitle}>Qualificação</h3></div><dl className={mapModalFacts}><div><dt>Prazo</dt><dd>{selected.q_prazo||'—'}</dd></div><div><dt>Decisores</dt><dd>{[...(selected.q_decisor||[]),selected.q_decisor_outro].filter(Boolean).join(', ')||'—'}</dd></div><div><dt>Formato</dt><dd>{selected.q_formato||'—'}</dd></div><div><dt>Apoio posterior</dt><dd>{qv2.apoio_pos||'—'}</dd></div><div><dt>Jurídico</dt><dd>{qv2.juridico||'—'}</dd></div><div><dt>Investimento</dt><dd>{selected.q_investimento||'—'}</dd></div><div><dt>Origem</dt><dd>{selected.q_origem||'—'}</dd></div><div><dt>Possíveis sócios(as)</dt><dd>{qv2.candidatos_socio||'—'}</dd></div></dl></section><section className={`${mapModalCard} tw:grid tw:gap-[0.692rem] tw:[&>button]:w-full tw:[&>button]:justify-start tw:[&>small]:text-[0.769rem] tw:[&>small]:leading-[1.45] tw:[&>small]:text-[#94878a]`}><h3 className={mapModalSideTitle}>Próximas ações</h3><Button className={mapModalAction} variant="secondary" type="button" onClick={openReport}><FileText size={16}/>Gerar relatório</Button><Button className={mapModalAction} variant="secondary" type="button" onClick={()=>{setPdfFile(null);setEmailFeedback('');setEmailOpen(true)}} disabled={!selected.c_email}><Mail size={16}/>Enviar por e-mail</Button><Button className={mapModalAction} variant="secondary" type="button" onClick={openWhatsapp}><Send size={16}/>Preparar WhatsApp</Button>{selected.relatorio_enviado_em&&<small>Último relatório enviado em {formatDate(selected.relatorio_enviado_em,true)}</small>}</section></aside></div></div><footer className="people-map-modal-footer tw:flex tw:min-h-[5.538rem] tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.615rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:px-[1.846rem] tw:py-[1.077rem] tw:[@media(max-width:45rem)]:flex-col tw:[@media(max-width:45rem)]:items-stretch"><span>{feedback}</span><div className="tw:flex tw:min-w-0 tw:items-center tw:gap-[0.769rem] tw:[@media(max-width:45rem)]:justify-between"><Button className={mapModalAction} variant="secondary" type="button" onClick={closeRecord}>Cancelar</Button><Button className={`${mapModalAction} tw:border-cali-brand! tw:bg-cali-brand! tw:text-white!`} variant="primary" type="button" onClick={saveReview} disabled={saving}>{saving?'Salvando…':'Salvar revisão'}</Button></div></footer></DialogFrame></div>}

    {emailOpen && selected && <PeopleMapSendDialog
      label="Enviar diagnóstico"
      recipient={`${selected.c_nome} <${selected.c_email}>`}
      description="O PDF aprovado será enviado pelo padrão CALI e o registro será marcado como enviado."
      file={pdfFile} onFile={setPdfFile}
      onClose={() => setEmailOpen(false)} onSend={sendEmail}
      sending={sendingEmail} sent={selected.status === 'enviado'}
      deliveryReady={deliveryReady} deliveryError={delivery.isError} onRetry={() => void delivery.refetch()}
      officialPdf={delivery.data?.hasPdf} revision={delivery.data?.revision} feedback={emailFeedback}
    />}
  </Shell>;
}
