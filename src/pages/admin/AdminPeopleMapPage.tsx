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
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type MapaStatus = 'novo' | 'em_andamento' | 'em_revisao' | 'pre_enviado' | 'enviado' | 'cancelado' | 'excluido';

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

type ScoreSet = { d1: number | null; d2: number | null; d3: number | null; d4: number | null; total: number | null };

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

function scale10(value: number | null) {
  return value === null ? null : value * 2;
}

function scoresFor(record: MapaRecord): ScoreSet {
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

function fmtScore(value: number | null) {
  return value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function normalizeStatus(status: string): MapaStatus {
  return status === 'em_revisao' ? 'em_andamento' : (status as MapaStatus);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scoreLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value}/5 · ${SCALE_LABELS[value] || ''}`;
}

function observationDraft(record: MapaRecord): ObservationDraft {
  const saved = record.observacoes || {};
  return {
    d1_obs: saved.d1_obs || '',
    d2_obs: saved.d2_obs || '',
    d3_obs: saved.d3_obs || '',
    d4_obs: saved.d4_obs || '',
    parecer: saved.parecer || '',
    servico_recomendado: saved.servico_recomendado || 'Diagnóstico Executivo de People',
  };
}

function dimensionRows(record: MapaRecord, dimension: 1 | 2 | 3 | 4) {
  const v2 = record.diagnostico_v2;
  if (v2?.version === 2) {
    if (dimension === 1) return [
      ['Cargos e atribuições', v2.d1?.processos?.[0]], ['Fluxos de admissão, promoção e saída', v2.d1?.processos?.[1]], ['Políticas aplicadas', v2.d1?.processos?.[2]],
      ['Hierarquia clara', v2.d1?.estrutura?.[0]], ['Proporção do time de gente', v2.d1?.estrutura?.[1]], ['Regras de decisão', v2.d1?.governanca?.[0]], ['Registro e controle', v2.d1?.governanca?.[1]],
    ] as Array<[string, number | null | undefined]>;
    if (dimension === 2) return [
      ['Iniciativa', v2.d2?.comportamento?.[0]], ['Responsabilidade por resultado', v2.d2?.comportamento?.[1]], ['Postura com o negócio', v2.d2?.comportamento?.[2]],
      ['Cultura orienta decisão', v2.d2?.valores?.cultura_decisao], ['Pipeline de sucessão', v2.d2?.desenvolvimento?.[0]], ['Programa de liderança', v2.d2?.desenvolvimento?.[1]], ['Preparo para responsabilidades maiores', v2.d2?.desenvolvimento?.[2]],
    ] as Array<[string, number | null | undefined]>;
    if (dimension === 3) return [
      ['Indicadores existem', v2.d3?.indicadores?.[0]], ['Revisão periódica', v2.d3?.indicadores?.[1]], ['Decisões de gente por dados', v2.d3?.decisao?.[0]], ['Referência compartilhada', v2.d3?.decisao?.[1]], ['Ferramentas de RH', v2.d3?.tecnologia?.[0]], ['Uso de IA no RH', v2.d3?.tecnologia?.[1]],
    ] as Array<[string, number | null | undefined]>;
    return [
      ['Tamanho do quadro', v2.d4?.tamanho?.[0]], ['Distribuição geográfica', v2.d4?.tamanho?.[1]], ['Gestão dos regimes', v2.d4?.vinculos?.gestao], ['Nível de turnover', v2.d4?.rotatividade?.[0]], ['Custo de gente no resultado', v2.d4?.rotatividade?.[1]],
    ] as Array<[string, number | null | undefined]>;
  }

  if (dimension === 1) return [['Como descreve o RH hoje', record.d1_rh_hoje], ['Processos formalizados', record.d1_processos], ['Cargos e salários', record.d1_cargos_salarios]] as Array<[string, number | null | undefined]>;
  if (dimension === 2) return [['Valores praticados', record.d2_valores], ['Preparo das lideranças', record.d2_lideres_preparo], ['Senso de responsabilidade', record.d2_comportamento_dono], ['Plano de sucessão', record.d2_sucessao]] as Array<[string, number | null | undefined]>;
  if (dimension === 3) return [['Acompanha indicadores', record.d3_indicadores], ['Decisão por dado', record.d3_decisao], ['Conhece custo de gente', record.d3_custo]] as Array<[string, number | null | undefined]>;
  return [['Colaboradores', record.d4_colaboradores], ['Unidades', record.d4_unidades], ['Turnover', record.d4_turnover]] as Array<[string, number | null | undefined]>;
}

export function AdminPeopleMapPage() {
  const [records, setRecords] = useState<MapaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selected, setSelected] = useState<MapaRecord | null>(null);
  const [draft, setDraft] = useState<ObservationDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function loadRecords() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.schema('public').from('mapa_respostas').select('*').order('created_at', { ascending: false });
    if (loadError) {
      setError('Não foi possível carregar as respostas do Mapa de People.');
      setLoading(false);
      return;
    }
    setRecords((data || []) as MapaRecord[]);
    setLoading(false);
  }

  useEffect(() => { loadRecords(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    return records.filter((record) => {
      const haystack = [record.c_empresa, record.c_nome, record.c_email, record.c_cargo, record.protocolo].join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle)) && (statusFilter === 'todos' || normalizeStatus(record.status) === statusFilter);
    });
  }, [records, query, statusFilter]);

  const kpis = useMemo(() => ({
    total: records.length,
    novos: records.filter((record) => normalizeStatus(record.status) === 'novo').length,
    andamento: records.filter((record) => normalizeStatus(record.status) === 'em_andamento').length,
    enviados: records.filter((record) => normalizeStatus(record.status) === 'enviado').length,
  }), [records]);

  function openRecord(record: MapaRecord) {
    setSelected(record);
    setDraft(observationDraft(record));
    setFeedback('');
    document.body.classList.add('workspace-modal-open');
  }

  function closeRecord() {
    document.body.classList.remove('workspace-modal-open');
    setSelected(null);
    setDraft(null);
    setFeedback('');
  }

  async function updateStatus(record: MapaRecord, nextStatus: string) {
    if (!supabase) return;
    const normalized = normalizeStatus(nextStatus);
    const { error: updateError } = await supabase.schema('public').from('mapa_respostas').update({ status: normalized }).eq('id', record.id);
    if (updateError) {
      setError('Não foi possível atualizar o status.');
      return;
    }
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: normalized } : item));
    if (selected?.id === record.id) setSelected((current) => current ? { ...current, status: normalized } : current);
  }

  async function saveReview() {
    if (!supabase || !selected || !draft) return;
    setSaving(true);
    setFeedback('Salvando revisão…');
    const normalizedStatus = normalizeStatus(selected.status);
    const { data, error: saveError } = await supabase.schema('public').from('mapa_respostas')
      .update({ observacoes: draft, status: normalizedStatus })
      .eq('id', selected.id)
      .select('*')
      .single();
    if (saveError || !data) {
      setFeedback('Não foi possível salvar agora.');
      setSaving(false);
      return;
    }
    const saved = data as MapaRecord;
    setSelected(saved);
    setRecords((current) => current.map((item) => item.id === saved.id ? saved : item));
    setFeedback('Revisão salva ✓');
    setSaving(false);
  }

  const selectedScores = selected ? scoresFor(selected) : null;

  return (
    <Shell role="admin">
      <section className="page people-map-page">
        <div className="eyebrow">ENTRADA COMERCIAL · DIAGNÓSTICO</div>
        <div className="page-heading people-map-heading">
          <div>
            <h1>Mapa de People</h1>
            <p>As respostas continuam chegando por mapa.calirh.com. Aqui você acompanha, revisa e transforma o diagnóstico em devolutiva.</p>
          </div>
          <div className="people-map-heading-actions">
            <button className="secondary" type="button" onClick={loadRecords}><RefreshCw size={17} />Atualizar</button>
            <a className="primary people-map-public-link" href="https://mapa.calirh.com" target="_blank" rel="noreferrer">Abrir Mapa público<ArrowUpRight size={17} /></a>
          </div>
        </div>

        <div className="people-map-kpis">
          <article><span>Total de respostas</span><strong>{kpis.total}</strong><small>base atual do Mapa</small></article>
          <article><span>Novos</span><strong>{kpis.novos}</strong><small>aguardando sua leitura</small></article>
          <article><span>Em andamento</span><strong>{kpis.andamento}</strong><small>revisões em curso</small></article>
          <article><span>Enviados</span><strong>{kpis.enviados}</strong><small>devolutivas concluídas</small></article>
        </div>

        <div className="people-map-toolbar panel">
          <label className="people-map-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, decisor, e-mail ou protocolo" /></label>
          <label className="people-map-filter"><Filter size={17} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>

        {error && <div className="inline-notice danger">{error}</div>}

        <section className="panel people-map-table-panel">
          {loading ? <div className="people-map-loading"><RefreshCw className="spin" size={22} />Carregando respostas reais do Mapa…</div> : filtered.length === 0 ? (
            <div className="empty-state"><Target size={32} /><h2>Nenhuma resposta encontrada</h2><p>Ajuste os filtros ou aguarde uma nova resposta em mapa.calirh.com.</p></div>
          ) : (
            <div className="people-map-table-wrap">
              <table className="people-map-table">
                <thead><tr><th>Empresa / decisor</th><th>Protocolo</th><th>Score</th><th>Data</th><th>Status</th><th /></tr></thead>
                <tbody>{filtered.map((record) => {
                  const score = scoresFor(record).total;
                  const status = normalizeStatus(record.status);
                  return <tr key={record.id}>
                    <td><div className="people-map-company"><span className="people-map-avatar">{(record.c_empresa || record.c_nome || 'C').slice(0, 1).toUpperCase()}</span><div><strong>{record.c_empresa || 'Empresa não informada'}</strong><span>{record.c_nome}{record.c_cargo ? ` · ${record.c_cargo}` : ''}</span></div></div></td>
                    <td><code>{record.protocolo}</code></td>
                    <td><strong className="people-map-score">{fmtScore(score)}</strong><span className="people-map-score-denom">/10</span></td>
                    <td>{formatDate(record.created_at)}</td>
                    <td><select className={`people-map-status status-${status}`} value={status} onChange={(event) => updateStatus(record, event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
                    <td><button className="people-map-open" type="button" onClick={() => openRecord(record)}>Revisar<ArrowUpRight size={16} /></button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {selected && draft && selectedScores && (
        <div className="workspace-modal-layer people-map-modal-layer" role="presentation">
          <section className="workspace-standard-modal people-map-modal" role="dialog" aria-modal="true" aria-labelledby="people-map-modal-title">
            <header className="people-map-modal-header">
              <button className="people-map-back" type="button" onClick={closeRecord}><ChevronLeft size={18} />Voltar ao Mapa</button>
              <div className="people-map-modal-identity">
                <div><span className="eyebrow">{selected.protocolo}</span><h2 id="people-map-modal-title">{selected.c_empresa}</h2><p>{selected.c_nome}{selected.c_cargo ? ` · ${selected.c_cargo}` : ''} · respondido em {formatDate(selected.created_at)}</p></div>
                <div className="people-map-score-hero"><strong>{fmtScore(selectedScores.total)}</strong><span>/10</span><small>score geral</small></div>
              </div>
            </header>

            <div className="people-map-modal-scroll">
              <div className="people-map-detail-grid">
                <main className="people-map-dimensions">
                  {([
                    [1, 'D1 · Maturidade Estrutural', selectedScores.d1, 'd1_obs'],
                    [2, 'D2 · Liderança & Cultura', selectedScores.d2, 'd2_obs'],
                    [3, 'D3 · Dados & Decisão', selectedScores.d3, 'd3_obs'],
                    [4, 'D4 · Dimensões Operacionais', selectedScores.d4, 'd4_obs'],
                  ] as const).map(([dimension, title, score, obsKey]) => (
                    <section className="people-map-dimension-card" key={dimension}>
                      <div className="people-map-dimension-head"><div><span className="section-kicker">DIMENSÃO {dimension}</span><h3>{title}</h3></div><strong>{fmtScore(score)}<small>/10</small></strong></div>
                      <div className="people-map-answer-grid">{dimensionRows(selected, dimension).map(([label, value]) => <div key={label}><span>{label}</span><strong>{scoreLabel(value)}</strong></div>)}</div>
                      <label className="stacked-label">Observação da Patrícia<textarea rows={3} value={draft[obsKey]} onChange={(event) => setDraft((current) => current ? { ...current, [obsKey]: event.target.value } : current)} placeholder="Registre sua leitura específica desta dimensão…" /></label>
                    </section>
                  ))}

                  <section className="people-map-dimension-card people-map-final-reading">
                    <div className="people-map-dimension-head"><div><span className="section-kicker">DEVOLUTIVA</span><h3>Parecer final</h3></div><FileText size={22} /></div>
                    <label className="stacked-label">O que você indicaria primeiro<textarea rows={5} value={draft.parecer} onChange={(event) => setDraft((current) => current ? { ...current, parecer: event.target.value } : current)} /></label>
                    <label className="stacked-label">Serviço recomendado<select value={draft.servico_recomendado} onChange={(event) => setDraft((current) => current ? { ...current, servico_recomendado: event.target.value } : current)}>{SERVICES.map((service) => <option key={service}>{service}</option>)}</select></label>
                  </section>
                </main>

                <aside className="people-map-contact-column">
                  <section className="people-map-side-card">
                    <div className="people-map-side-title"><UserRound size={19} /><h3>Contato</h3></div>
                    <dl><div><dt>Nome</dt><dd>{selected.c_nome}</dd></div><div><dt>Empresa</dt><dd>{selected.c_empresa}</dd></div><div><dt>Cargo</dt><dd>{selected.c_cargo || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{selected.c_email}</dd></div><div><dt>WhatsApp</dt><dd>{selected.c_whatsapp}</dd></div><div><dt>Preferência</dt><dd>{selected.c_preferencia_contato || 'Não informada'}</dd></div><div><dt>LinkedIn / site</dt><dd>{selected.c_linkedin_site || 'Não informado'}</dd></div></dl>
                  </section>

                  <section className="people-map-side-card">
                    <div className="people-map-side-title"><Building2 size={19} /><h3>Qualificação</h3></div>
                    <dl><div><dt>Prazo</dt><dd>{selected.q_prazo || '—'}</dd></div><div><dt>Decisores</dt><dd>{[...(selected.q_decisor || []), selected.q_decisor_outro].filter(Boolean).join(', ') || '—'}</dd></div><div><dt>Formato</dt><dd>{selected.q_formato || '—'}</dd></div><div><dt>Investimento</dt><dd>{selected.q_investimento || '—'}</dd></div><div><dt>Origem</dt><dd>{selected.q_origem || '—'}</dd></div></dl>
                  </section>

                  <section className="people-map-side-card">
                    <div className="people-map-side-title"><Target size={19} /><h3>Lentes transversais</h3></div>
                    <dl><div><dt>Tecnologia / IA no RH</dt><dd>{scoreLabel(selected.l1_tecnologia)}</dd></div><div><dt>Capacidade de execução</dt><dd>{scoreLabel(selected.l2_execucao)}</dd></div><div><dt>RH interno sem apoio</dt><dd>{scoreLabel(selected.l3_rh_interno)}</dd></div></dl>
                  </section>

                  <section className="people-map-side-card people-map-delivery-card">
                    <div className="people-map-side-title"><Send size={19} /><h3>Entrega ao decisor</h3></div>
                    <p>Nesta primeira etapa da migração, revisão e status já operam pelo Workspace. Relatório/PDF e envio serão portados na próxima validação, sem desligar o painel antigo.</p>
                    <a href="https://mapa.calirh.com/painel.html" target="_blank" rel="noreferrer" className="secondary people-map-legacy-link">Abrir painel legado<ArrowUpRight size={16} /></a>
                  </section>
                </aside>
              </div>
            </div>

            <footer className="people-map-modal-footer">
              <div><select className={`people-map-status status-${normalizeStatus(selected.status)}`} value={normalizeStatus(selected.status)} onChange={(event) => updateStatus(selected, event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="people-map-save-feedback">{feedback}</span></div>
              <div className="people-map-footer-actions"><a href={`mailto:${selected.c_email}`} className="secondary"><Mail size={17} />E-mail</a><button className="primary" type="button" onClick={saveReview} disabled={saving}>{saving ? 'Salvando…' : 'Salvar revisão'}</button></div>
            </footer>
          </section>
        </div>
      )}
    </Shell>
  );
}
