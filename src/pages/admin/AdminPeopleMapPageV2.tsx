import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  ChevronLeft,
  FileText,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Send,
  Target,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

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
    if (dimension === 1) return [['Cargos e atribuições', v2.d1?.processos?.[0]], ['Fluxos de admissão, promoção e saída', v2.d1?.processos?.[1]], ['Políticas aplicadas', v2.d1?.processos?.[2]], ['Hierarquia clara', v2.d1?.estrutura?.[0]], ['Proporção do time de gente', v2.d1?.estrutura?.[1]], ['Regras de decisão', v2.d1?.governanca?.[0]], ['Registro e controle', v2.d1?.governanca?.[1]]] as Array<[string, number | null | undefined]>;
    if (dimension === 2) return [['Iniciativa', v2.d2?.comportamento?.[0]], ['Responsabilidade por resultado', v2.d2?.comportamento?.[1]], ['Postura com o negócio', v2.d2?.comportamento?.[2]], ['Cultura orienta decisão', v2.d2?.valores?.cultura_decisao], ['Pipeline de sucessão', v2.d2?.desenvolvimento?.[0]], ['Programa de liderança', v2.d2?.desenvolvimento?.[1]], ['Preparo para responsabilidades maiores', v2.d2?.desenvolvimento?.[2]]] as Array<[string, number | null | undefined]>;
    if (dimension === 3) return [['Indicadores existem', v2.d3?.indicadores?.[0]], ['Revisão periódica', v2.d3?.indicadores?.[1]], ['Decisões de gente por dados', v2.d3?.decisao?.[0]], ['Referência compartilhada', v2.d3?.decisao?.[1]], ['Ferramentas de RH', v2.d3?.tecnologia?.[0]], ['Uso de IA no RH', v2.d3?.tecnologia?.[1]]] as Array<[string, number | null | undefined]>;
    return [['Tamanho do quadro', v2.d4?.tamanho?.[0]], ['Distribuição geográfica', v2.d4?.tamanho?.[1]], ['Gestão dos regimes', v2.d4?.vinculos?.gestao], ['Nível de turnover', v2.d4?.rotatividade?.[0]], ['Custo de gente no resultado', v2.d4?.rotatividade?.[1]]] as Array<[string, number | null | undefined]>;
  }
  if (dimension === 1) return [['Como descreve o RH hoje', record.d1_rh_hoje], ['Processos formalizados', record.d1_processos], ['Cargos e salários', record.d1_cargos_salarios]] as Array<[string, number | null | undefined]>;
  if (dimension === 2) return [['Valores praticados', record.d2_valores], ['Preparo das lideranças', record.d2_lideres_preparo], ['Senso de responsabilidade', record.d2_comportamento_dono], ['Plano de sucessão', record.d2_sucessao]] as Array<[string, number | null | undefined]>;
  if (dimension === 3) return [['Acompanha indicadores', record.d3_indicadores], ['Decisão por dado', record.d3_decisao], ['Conhece custo de gente', record.d3_custo]] as Array<[string, number | null | undefined]>;
  return [['Colaboradores', record.d4_colaboradores], ['Unidades', record.d4_unidades], ['Turnover', record.d4_turnover]] as Array<[string, number | null | undefined]>;
}
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdminPeopleMapPageV2() {
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

  async function loadAll() {
    if (!supabase) return;
    setLoading(true); setError('');
    const publicDb = supabase.schema('public');
    const [recordsResult, journeysResult] = await Promise.all([
      publicDb.rpc('workspace_mapa_people_records'),
      publicDb.rpc('workspace_mapa_people_journeys'),
    ]);
    if (recordsResult.error) setError(`Não foi possível carregar as respostas reais: ${recordsResult.error.message}`);
    else setRecords(((recordsResult.data || []) as MapaRecord[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    if (journeysResult.error) setError((current) => current || `Não foi possível carregar a jornada: ${journeysResult.error.message}`);
    else setJourneys(((journeysResult.data || []) as JourneyRecord[]).sort((a, b) => new Date(b.accessed_at).getTime() - new Date(a.accessed_at).getTime()).slice(0, 1000));
    setLoading(false);
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
    if (!supabase) return false;
    const { data, error: rpcError } = await supabase.schema('public').rpc('workspace_update_mapa_people_record', { p_id: record.id, p_status: normalizeStatus(nextStatus), p_observacoes: nextObservations });
    if (rpcError) { setError(`Não foi possível salvar no Mapa: ${rpcError.message}`); return false; }
    return Boolean(data);
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
    const url = `https://mapa.calirh.com/relatorio.html?id=${encodeURIComponent(selected.id)}&workspace=1&atualizado=${Date.now()}`;
    if (popup) popup.location.href = url; else window.open(url, '_blank');
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
    if (!supabase || !selected || !pdfFile) return;
    if (pdfFile.type !== 'application/pdf') { setEmailFeedback('Selecione um arquivo PDF.'); return; }
    if (pdfFile.size > 8 * 1024 * 1024) { setEmailFeedback('O PDF precisa ter até 8 MB.'); return; }
    setSendingEmail(true); setEmailFeedback('Enviando…');
    try {
      const pdfBase64 = await fileToBase64(pdfFile);
      const { data, error: fnError } = await supabase.functions.invoke('workspace-enviar-relatorio-mapa', { body: { response_id: selected.id, pdf_base64: pdfBase64, request_id: crypto.randomUUID() } });
      if (fnError || !data?.ok) throw new Error(data?.error || fnError?.message || 'Falha ao enviar.');
      setEmailFeedback(`Enviado para ${data.to || selected.c_email} ✓`);
      setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, status: 'enviado', relatorio_enviado_em: new Date().toISOString() } : item));
      setSelected((current) => current ? { ...current, status: 'enviado', relatorio_enviado_em: new Date().toISOString() } : current);
      setTimeout(() => { setEmailOpen(false); setPdfFile(null); setEmailFeedback(''); }, 1400);
    } catch (err) { setEmailFeedback(err instanceof Error ? err.message : 'Não foi possível enviar.'); }
    finally { setSendingEmail(false); }
  }

  const selectedScores = selected ? scoresFor(selected) : null;
  const qv2 = selected?.diagnostico_v2?.qualificacao || {};

  return <Shell role="admin">
    <section className="page people-map-page">
      <div className="eyebrow">ENTRADA COMERCIAL · DIAGNÓSTICO</div>
      <div className="page-heading people-map-heading"><div><h1>Mapa de People</h1><p>O Mapa público continua no endereço atual. Aqui ficam a leitura real das respostas, a jornada e a revisão administrativa.</p></div><div className="people-map-heading-actions"><button className="secondary" type="button" onClick={loadAll}><RefreshCw size={17}/>Atualizar</button><a className="primary people-map-public-link" href="https://mapa.calirh.com" target="_blank" rel="noreferrer">Abrir Mapa público<ArrowUpRight size={17}/></a></div></div>
      <div className="people-map-tabs"><button className={tab === 'respostas' ? 'active' : ''} onClick={() => setTab('respostas')}>Respostas</button><button className={tab === 'jornada' ? 'active' : ''} onClick={() => setTab('jornada')}>Jornada e acessos</button></div>

      {tab === 'respostas' ? <>
        <div className="people-map-kpis"><article><span>Total de respostas</span><strong>{kpis.total}</strong><small>base real do Mapa</small></article><article><span>Novos</span><strong>{kpis.novos}</strong><small>aguardando sua leitura</small></article><article><span>Em andamento</span><strong>{kpis.andamento}</strong><small>revisões em curso</small></article><article><span>Enviados</span><strong>{kpis.enviados}</strong><small>devolutivas concluídas</small></article></div>
        <div className="people-map-toolbar panel"><label className="people-map-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, decisor, e-mail ou protocolo"/></label><label className="people-map-filter"><Filter size={17}/><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
        {error && <div className="inline-notice danger">{error}</div>}
        <section className="panel people-map-table-panel">{loading ? <div className="people-map-loading"><RefreshCw className="spin" size={22}/>Carregando respostas reais…</div> : filtered.length === 0 ? <div className="empty-state"><Target size={32}/><h2>Nenhuma resposta encontrada</h2><p>A base foi consultada; ajuste os filtros para revisar os registros.</p></div> : <div className="people-map-table-wrap"><table className="people-map-table"><thead><tr><th>Empresa / decisor</th><th>Protocolo</th><th>Score</th><th>Data</th><th>Status</th><th/></tr></thead><tbody>{filtered.map((record) => { const score=scoresFor(record).total; const status=normalizeStatus(record.status); return <tr key={record.id}><td><div className="people-map-company"><span className="people-map-avatar">{(record.c_empresa||record.c_nome||'C').slice(0,1).toUpperCase()}</span><div><strong>{record.c_empresa||'Empresa não informada'}</strong><span>{record.c_nome}{record.c_cargo?` · ${record.c_cargo}`:''}</span></div></div></td><td><code>{record.protocolo}</code></td><td><strong className="people-map-score">{fmtScore(score)}</strong><span className="people-map-score-denom">/10</span></td><td>{formatDate(record.created_at)}</td><td><select className={`people-map-status status-${status}`} value={status} onChange={(e)=>updateStatus(record,e.target.value)}>{STATUS_OPTIONS.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td><td><button className="people-map-open" type="button" onClick={()=>openRecord(record)}>Revisar<ArrowUpRight size={16}/></button></td></tr>; })}</tbody></table></div>}</section>
      </> : <>
        <div className="people-map-kpis"><article><span>Visitas</span><strong>{journeyKpis.visitas}</strong><small>sessões registradas</small></article><article><span>Iniciados</span><strong>{journeyKpis.iniciados}</strong><small>começaram o diagnóstico</small></article><article><span>Abandonos</span><strong>{journeyKpis.abandonos}</strong><small>sem envio concluído</small></article><article><span>Cópias</span><strong>{journeyKpis.copias}</strong><small>eventos de cópia</small></article></div>
        <div className="people-map-journey-tools panel"><label className="people-map-search"><Search size={18}/><input value={journeyQuery} onChange={(e)=>setJourneyQuery(e.target.value)} placeholder="Buscar origem ou dispositivo"/></label><label className="people-map-filter"><Workflow size={17}/><select value={journeyFilter} onChange={(e)=>setJourneyFilter(e.target.value)}><option value="todos">Todas as jornadas</option><option value="concluido">Enviou</option><option value="andamento">Em andamento</option><option value="abandono">Abandonou</option><option value="copiou">Copiou conteúdo</option></select></label><label className="people-map-filter"><Filter size={17}/><select value={journeyPeriod} onChange={(e)=>setJourneyPeriod(e.target.value)}><option value="todos">Todo período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label></div>
        <section className="panel people-map-table-panel"><div className="people-map-table-wrap"><table className="people-map-table"><thead><tr><th>Acesso</th><th>Último sinal</th><th>Etapa</th><th>Dispositivo</th><th>Origem</th><th>Cópias</th><th>Situação</th></tr></thead><tbody>{filteredJourneys.map((item)=>{const status=journeyStatus(item);return <tr key={item.session_id}><td>{formatDate(item.accessed_at,true)}</td><td>{formatDate(item.last_seen_at,true)}</td><td>{item.submitted?'Enviado':item.started?`Etapa ${Number(item.max_step)||1} de 7`:'Só abriu'}</td><td>{({mobile:'Celular',tablet:'Tablet',desktop:'Computador',unknown:'Não identificado'} as Record<string,string>)[item.device_type||'unknown']||item.device_type}</td><td>{item.referrer_host||'Acesso direto'}</td><td>{Number(item.copy_events||0)}</td><td><span className={`people-map-journey-status ${status}`}>{status==='concluido'?'Enviou':status==='andamento'?'Em andamento':'Abandonou'}</span></td></tr>})}</tbody></table></div></section>
      </>}
    </section>

    {selected && draft && selectedScores && <div className="workspace-modal-layer people-map-modal-layer" role="presentation"><section className="workspace-standard-modal people-map-modal" role="dialog" aria-modal="true"><header className="people-map-modal-header"><button className="people-map-back" type="button" onClick={closeRecord}><ChevronLeft size={18}/>Voltar ao Mapa</button><div className="people-map-modal-identity"><div><span className="eyebrow">{selected.protocolo}</span><h2>{selected.c_empresa}</h2><p>{selected.c_nome}{selected.c_cargo?` · ${selected.c_cargo}`:''} · respondido em {formatDate(selected.created_at)}</p></div><div className="people-map-score-hero"><strong>{fmtScore(selectedScores.total)}</strong><span>/10</span><small>score geral</small></div></div></header><div className="people-map-modal-scroll"><div className="people-map-detail-grid"><main className="people-map-dimensions">{([[1,'D1 · Maturidade Estrutural',selectedScores.d1,'d1_obs'],[2,'D2 · Liderança & Cultura',selectedScores.d2,'d2_obs'],[3,'D3 · Dados & Decisão',selectedScores.d3,'d3_obs'],[4,'D4 · Dimensões Operacionais',selectedScores.d4,'d4_obs']] as const).map(([dimension,title,score,key])=><section className="people-map-dimension-card" key={dimension}><div className="people-map-dimension-head"><div><span className="section-kicker">DIMENSÃO {dimension}</span><h3>{title}</h3></div><strong>{fmtScore(score)}<small>/10</small></strong></div><div className="people-map-answer-grid">{dimensionRows(selected,dimension).map(([label,value])=><div key={label}><span>{label}</span><strong>{scoreLabel(value)}</strong></div>)}</div><label className="stacked-label">Observação da Patrícia<textarea rows={3} value={draft[key]} onChange={(e)=>setDraft((current)=>current?{...current,[key]:e.target.value}:current)}/></label></section>)}<section className="people-map-dimension-card people-map-final-reading"><div className="people-map-dimension-head"><div><span className="section-kicker">DEVOLUTIVA</span><h3>Parecer final</h3></div><FileText size={22}/></div><label className="stacked-label">O que você indicaria primeiro<textarea rows={5} value={draft.parecer} onChange={(e)=>setDraft((current)=>current?{...current,parecer:e.target.value}:current)}/></label><label className="stacked-label">Serviço recomendado<select value={draft.servico_recomendado} onChange={(e)=>setDraft((current)=>current?{...current,servico_recomendado:e.target.value}:current)}>{SERVICES.map((service)=><option key={service}>{service}</option>)}</select></label></section></main><aside className="people-map-contact-column"><section className="people-map-side-card"><div className="people-map-side-title"><UserRound size={19}/><h3>Contato</h3></div><dl><div><dt>Nome</dt><dd>{selected.c_nome}</dd></div><div><dt>Empresa</dt><dd>{selected.c_empresa}</dd></div><div><dt>Cargo</dt><dd>{selected.c_cargo||'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{selected.c_email}</dd></div><div><dt>WhatsApp</dt><dd>{selected.c_whatsapp}</dd></div><div><dt>Preferência</dt><dd>{selected.c_preferencia_contato||'Não informada'}</dd></div><div><dt>LinkedIn / site</dt><dd>{selected.c_linkedin_site||'Não informado'}</dd></div></dl></section><section className="people-map-side-card"><div className="people-map-side-title"><Building2 size={19}/><h3>Qualificação</h3></div><dl><div><dt>Prazo</dt><dd>{selected.q_prazo||'—'}</dd></div><div><dt>Decisores</dt><dd>{[...(selected.q_decisor||[]),selected.q_decisor_outro].filter(Boolean).join(', ')||'—'}</dd></div><div><dt>Formato</dt><dd>{selected.q_formato||'—'}</dd></div><div><dt>Apoio posterior</dt><dd>{qv2.apoio_pos||'—'}</dd></div><div><dt>Jurídico</dt><dd>{qv2.juridico||'—'}</dd></div><div><dt>Investimento</dt><dd>{selected.q_investimento||'—'}</dd></div><div><dt>Origem</dt><dd>{selected.q_origem||'—'}</dd></div><div><dt>Possíveis sócios(as)</dt><dd>{qv2.candidatos_socio||'—'}</dd></div></dl></section><section className="people-map-side-card people-map-side-actions"><h3>Próximas ações</h3><button className="secondary" type="button" onClick={openReport}><FileText size={16}/>Gerar relatório</button><button className="secondary" type="button" onClick={()=>{setPdfFile(null);setEmailFeedback('');setEmailOpen(true)}} disabled={!selected.c_email}><Mail size={16}/>Enviar por e-mail</button><button className="secondary" type="button" onClick={openWhatsapp}><Send size={16}/>Preparar WhatsApp</button>{selected.relatorio_enviado_em&&<small>Último relatório enviado em {formatDate(selected.relatorio_enviado_em,true)}</small>}</section></aside></div></div><footer className="people-map-modal-footer"><span>{feedback}</span><div><button className="secondary" type="button" onClick={closeRecord}>Cancelar</button><button className="primary" type="button" onClick={saveReview} disabled={saving}>{saving?'Salvando…':'Salvar revisão'}</button></div></footer></section></div>}

    {emailOpen && selected && <div className="workspace-modal-layer people-map-send-layer" role="presentation"><section className="workspace-standard-modal people-map-send-modal" role="dialog" aria-modal="true"><button className="people-map-send-close" type="button" onClick={()=>setEmailOpen(false)}><X size={20}/></button><span className="eyebrow">ENVIO DO RELATÓRIO</span><h2>Confirmar devolutiva</h2><p>O PDF aprovado será enviado pelo padrão CALI e o registro será marcado como enviado.</p><div className="people-map-send-recipient"><span>Destinatário</span><strong>{selected.c_nome} &lt;{selected.c_email}&gt;</strong></div><label className="people-map-pdf-upload"><input type="file" accept="application/pdf,.pdf" onChange={(e)=>setPdfFile(e.target.files?.[0]||null)}/><FileText size={22}/><strong>{pdfFile?pdfFile.name:'Selecionar relatório aprovado'}</strong><span>{pdfFile?`${(pdfFile.size/1024/1024).toFixed(2)} MB`:'PDF de até 8 MB'}</span></label>{emailFeedback&&<div className="people-map-email-feedback">{emailFeedback}</div>}<footer><button className="secondary" type="button" onClick={()=>setEmailOpen(false)}>Cancelar</button><button className="primary" type="button" onClick={sendEmail} disabled={!pdfFile||sendingEmail}>{sendingEmail?'Enviando…':'Enviar relatório'}</button></footer></section></div>}
  </Shell>;
}
