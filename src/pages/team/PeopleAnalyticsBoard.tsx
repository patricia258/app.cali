import { useMemo, useState, type ReactNode } from 'react';

/* People Analytics — leitura didática dos gráficos (pedido da Patricia em 2026-10-11):
   todo gráfico diz o que mostra, traz o RESULTADO em destaque (total, média, taxa), responde ao mouse
   e os de evolução têm o próprio seletor de período. "Período" e "retrato do mês" ficam visivelmente separados. */

export type PaPoint = { month: string; active: number; admissions: number; exits: number };
export type PaMetric = { reference_month: string; planned_hours: number | null; absence_medical_hours: number | null; absence_leave_hours: number | null; absence_unjustified_hours: number | null; absence_accident_hours: number | null; overtime_hours: number | null; approved_headcount: Record<string, number> };
export type PaMember = { id: string; department: string; admission_date: string; status: string; termination_date: string | null; termination_initiative: string | null; termination_reason: string | null; archived_at?: string | null; employment_type: string; work_model: string | null; is_leader: boolean };
export type PaPrivate = { member_id: string; gender: string | null; has_children: string | null };

const COLORS = ['#5a1e2d', '#b58c52', '#7aafcd', '#a484d7', '#4c9a76', '#e0a45a', '#c9bcb3', '#d98a94'];
const num = (value: number, digits = 0) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (value: number | null) => value == null ? '—' : `${num(value, 1)}%`;
const longMonth = (month: string) => { const [y, m] = month.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1)); };
const shortMonth = (month: string) => { const [y, m] = month.split('-').map(Number); return `${new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '')}/${String(y).slice(2)}`; };
const absence = (item?: PaMetric | null) => item ? (item.absence_medical_hours || 0) + (item.absence_leave_hours || 0) + (item.absence_unjustified_hours || 0) + (item.absence_accident_hours || 0) : 0;
const plural = (value: number, one: string, many: string) => `${num(value)} ${value === 1 ? one : many}`;

function Card({ title, what, control, results, reading, children, wide }: { title: string; what: string; control?: ReactNode; results?: [string, string, string?][]; reading?: string; children: ReactNode; wide?: boolean }) {
  return <section className={`pa-card ${wide ? 'wide' : ''}`}>
    <header><div><h3>{title}</h3><p>{what}</p></div>{control}</header>
    {results && results.length > 0 && <div className="pa-results">{results.map(([label, value, tone]) => <div key={label} className={tone || ''}><small>{label}</small><strong>{value}</strong></div>)}</div>}
    {children}
    {reading && <p className="pa-reading"><b>Leitura:</b> {reading}</p>}
  </section>;
}

function Bars({ items, unit = '', empty }: { items: { key: string; label: string; value: number | null; second?: number | null; detail: string }[]; unit?: string; empty: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...items.flatMap((item) => [item.value || 0, item.second || 0]));
  if (!items.some((item) => item.value != null)) return <div className="pa-empty">{empty}</div>;
  const shown = hover != null ? items[hover] : null;
  return <div className="pa-bars-wrap">
    <div className="pa-bars" onMouseLeave={() => setHover(null)}>{items.map((item, index) => <button type="button" key={item.key} className={hover === index ? 'on' : ''} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onBlur={() => setHover(null)} aria-label={item.detail}>
      <em>{item.value == null ? '—' : `${num(item.value, unit === '%' ? 1 : 0)}${item.second != null ? ` / ${num(item.second)}` : ''}`}</em>
      <span>{item.second != null ? <><i className="in" style={{ height: `${(item.value || 0) / peak * 100}%` }} /><i className="out" style={{ height: `${(item.second || 0) / peak * 100}%` }} /></> : <i style={{ height: `${(item.value || 0) / peak * 100}%` }} />}</span>
      <small>{item.label}</small>
    </button>)}</div>
    <p className="pa-hover" aria-live="polite">{shown ? shown.detail : 'Passe o mouse sobre uma barra para ver o detalhe do mês.'}</p>
  </div>;
}

function Pie({ slices, unit = 'pessoas', empty }: { slices: [string, number][]; unit?: string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = slices.filter(([, value]) => value > 0); const total = data.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return <div className="pa-empty">{empty || 'Sem dados para este recorte.'}</div>;
  let offset = 0; const shown = hover != null ? data[hover] : null;
  return <div className="pa-pie" onMouseLeave={() => setHover(null)}>
    <svg viewBox="0 0 42 42" role="img" aria-label={data.map(([label, value]) => `${label}: ${num(value)}`).join(', ')}>
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f3ece6" strokeWidth="7" />
      {data.map(([label, value], index) => { const share = value / total * 100; const node = <circle key={label} cx="21" cy="21" r="15.915" fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth={hover === index ? 8.6 : 7} opacity={hover == null || hover === index ? 1 : .35} strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={25 - offset} onMouseEnter={() => setHover(index)} />; offset += share; return node; })}
      <text x="21" y="20.4" textAnchor="middle">{shown ? `${Math.round(shown[1] / total * 100)}%` : num(total)}</text>
      <text x="21" y="25.2" textAnchor="middle" className="sub">{shown ? shown[0].slice(0, 18) : unit}</text>
    </svg>
    <ul>{data.map(([label, value], index) => <li key={label} className={hover === index ? 'on' : ''} onMouseEnter={() => setHover(index)}><i style={{ background: COLORS[index % COLORS.length] }} /><span>{label}</span><b>{num(value, unit === 'horas' ? 1 : 0)}</b><em>{Math.round(value / total * 100)}%</em></li>)}</ul>
  </div>;
}

type Range = 'page' | '3' | '6' | '12' | '24' | 'all';
function usePoints(series: PaPoint[], end: string, pageRange: { start: string; end: string } | null) {
  const [range, setRange] = useState<Range>(pageRange ? 'page' : '12');
  const points = useMemo(() => {
    const upTo = series.filter((point) => point.month <= (range === 'page' && pageRange ? pageRange.end : end));
    if (range === 'page' && pageRange) return upTo.filter((point) => point.month >= pageRange.start);
    return range === 'all' ? upTo : upTo.slice(-Number(range === 'page' ? 12 : range));
  }, [series, end, pageRange, range]);
  const control = <select className="pa-range" aria-label="Período deste gráfico" value={range} onChange={(event) => setRange(event.target.value as Range)}>{pageRange && <option value="page">Período da página</option>}<option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option><option value="24">Últimos 24 meses</option><option value="all">Todo o histórico</option></select>;
  const label = points.length ? `${shortMonth(points[0].month)} a ${shortMonth(points[points.length - 1].month)}` : 'sem meses confirmados';
  return { points, control, label };
}

type BoardProps = { series: PaPoint[]; metrics: PaMetric[]; members: PaMember[]; working: PaMember[]; privateRows: PaPrivate[]; month: string; pageRange: { start: string; end: string } | null; departments: string[] };

/* ---------- Período: evolução, com resultado e seletor próprio em cada gráfico ---------- */
export function PeopleAnalyticsPeriod({ series, metrics, members, month, pageRange }: BoardProps) {
  const metricOf = (value: string) => metrics.find((item) => item.reference_month.slice(0, 7) === value) || null;
  const flow = usePoints(series, month, pageRange); const abs = usePoints(series, month, pageRange); const over = usePoints(series, month, pageRange); const exit = usePoints(series, month, pageRange);
  const [kind, setKind] = useState<'flow' | 'headcount'>('flow');

  const admissions = flow.points.reduce((sum, point) => sum + point.admissions, 0); const exits = flow.points.reduce((sum, point) => sum + point.exits, 0);
  const avgActive = flow.points.length ? flow.points.reduce((sum, point) => sum + point.active, 0) / flow.points.length : 0;
  const turnover = avgActive ? exits / avgActive * 100 : null; const net = admissions - exits;
  const first = flow.points[0]?.active ?? 0; const last = flow.points[flow.points.length - 1]?.active ?? 0;

  const absRows = abs.points.map((point) => { const item = metricOf(point.month); return { month: point.month, value: item && item.planned_hours ? absence(item) / item.planned_hours * 100 : null, hours: absence(item) }; });
  const absValues = absRows.filter((row) => row.value != null) as { month: string; value: number; hours: number }[];
  const absAvg = absValues.length ? absValues.reduce((sum, row) => sum + row.value, 0) / absValues.length : null; const absPeak = absValues.slice().sort((a, b) => b.value - a.value)[0];
  const reasonSum = (key: keyof PaMetric) => abs.points.reduce((sum, point) => sum + Number(metricOf(point.month)?.[key] || 0), 0);

  const overRows = over.points.map((point) => ({ month: point.month, value: metricOf(point.month)?.overtime_hours ?? null }));
  const overValues = overRows.filter((row) => row.value != null) as { month: string; value: number }[];
  const overTotal = overValues.reduce((sum, row) => sum + row.value, 0); const overPeak = overValues.slice().sort((a, b) => b.value - a.value)[0];

  const exitMonths = new Set(exit.points.map((point) => point.month));
  const left = members.filter((item) => !item.archived_at && item.status === 'terminated' && item.termination_date && exitMonths.has(item.termination_date.slice(0, 7)));
  const voluntary = left.filter((item) => item.termination_initiative === 'employee').length; const company = left.filter((item) => item.termination_initiative === 'company').length;
  const exitAvg = exit.points.length ? exit.points.reduce((sum, point) => sum + point.active, 0) / exit.points.length : 0;
  const reasons = Object.entries(left.reduce<Record<string, number>>((map, item) => { const key = item.termination_reason?.trim() || 'Motivo não informado'; map[key] = (map[key] || 0) + 1; return map; }, {})).sort((a, b) => b[1] - a[1]);

  return <div className="pa-board">
    <div className="pa-section-head"><small>EVOLUÇÃO NO PERÍODO</small><h2>Como a equipe mudou ao longo dos meses</h2><p>Cada gráfico tem o próprio seletor de período e mostra o resultado em destaque.</p></div>
    <div className="pa-grid">
      <Card wide title="Movimento do quadro" what={`Quantas pessoas entraram, quantas saíram e como o quadro ficou · ${flow.label}`}
        control={<div className="pa-controls"><div className="ie-switch"><button type="button" className={kind === 'flow' ? 'on' : ''} onClick={() => setKind('flow')}>Entradas / saídas</button><button type="button" className={kind === 'headcount' ? 'on' : ''} onClick={() => setKind('headcount')}>Quadro ativo</button></div>{flow.control}</div>}
        results={[['Admissões', num(admissions), 'pos'], ['Desligamentos', num(exits), 'neg'], ['Saldo (admissões − desligamentos)', `${net > 0 ? '+' : ''}${num(net)}`, net < 0 ? 'neg' : net > 0 ? 'pos' : ''], ['Rotatividade (turnover) do período', pct(turnover)], ['Quadro médio', num(avgActive, 1)]]}
        reading={flow.points.length ? `o quadro ${last > first ? `cresceu ${plural(last - first, 'pessoa', 'pessoas')}` : last < first ? `encolheu ${plural(first - last, 'pessoa', 'pessoas')}` : 'terminou do mesmo tamanho'} (de ${num(first)} para ${num(last)}). ${turnover == null ? '' : `A cada 100 pessoas do quadro médio, ${num(turnover, 1)} saíram no período.`}` : undefined}>
        <Bars empty="Os gráficos aparecem com os primeiros meses confirmados." items={flow.points.map((point) => kind === 'flow'
          ? { key: point.month, label: shortMonth(point.month), value: point.admissions, second: point.exits, detail: `${longMonth(point.month)}: ${plural(point.admissions, 'admissão', 'admissões')}, ${plural(point.exits, 'desligamento', 'desligamentos')}, saldo ${point.admissions - point.exits > 0 ? '+' : ''}${point.admissions - point.exits} · ${num(point.active)} pessoas no fim do mês` }
          : { key: point.month, label: shortMonth(point.month), value: point.active, detail: `${longMonth(point.month)}: ${num(point.active)} pessoas ativas (${point.admissions} entradas, ${point.exits} saídas)` })} />
        {kind === 'flow' && <p className="pa-legend"><i className="in" /> admissões <i className="out" /> desligamentos</p>}
      </Card>

      <Card title="Absenteísmo" what={`Parte das horas previstas perdida por ausência · ${abs.label}`} control={abs.control}
        results={[['Média do período', pct(absAvg)], ['Mês mais alto', absPeak ? `${pct(absPeak.value)} · ${shortMonth(absPeak.month)}` : '—'], ['Horas de ausência', `${num(absRows.reduce((sum, row) => sum + row.hours, 0), 1)}h`]]}
        reading={absAvg == null ? undefined : `em média, de cada 100 horas previstas, ${num(absAvg, 1)} não foram trabalhadas. Referência usual de mercado: abaixo de 3% a 4%.`}>
        <Bars unit="%" empty="Lance os dados do mês (horas previstas e ausências) para ver a evolução." items={absRows.map((row) => ({ key: row.month, label: shortMonth(row.month), value: row.value, detail: `${longMonth(row.month)}: ${row.value == null ? 'sem lançamento' : `${pct(row.value)} de absenteísmo · ${num(row.hours, 1)}h de ausência`}` }))} />
      </Card>

      <Card title="Ausências por motivo" what={`Do total de horas de ausência, quanto veio de cada motivo · ${abs.label}`}
        reading={absValues.length ? 'o motivo com a maior fatia é onde uma ação costuma ter mais efeito.' : undefined}>
        <Pie unit="horas" empty="Sem ausências lançadas no período." slices={[['Atestado médico', reasonSum('absence_medical_hours')], ['Licença', reasonSum('absence_leave_hours')], ['Falta injustificada', reasonSum('absence_unjustified_hours')], ['Acidente', reasonSum('absence_accident_hours')]]} />
      </Card>

      <Card title="Horas extras" what={`Horas adicionais trabalhadas por mês · ${over.label}`} control={over.control}
        results={[['Total no período', `${num(overTotal, 1)}h`], ['Média por mês', overValues.length ? `${num(overTotal / overValues.length, 1)}h` : '—'], ['Mês mais alto', overPeak ? `${num(overPeak.value, 1)}h · ${shortMonth(overPeak.month)}` : '—']]}
        reading={overValues.length ? 'hora extra recorrente no mesmo patamar costuma indicar quadro subdimensionado, não pico de demanda.' : undefined}>
        <Bars empty="Lance os dados do mês para ver a evolução." items={overRows.map((row) => ({ key: row.month, label: shortMonth(row.month), value: row.value, detail: `${longMonth(row.month)}: ${row.value == null ? 'sem lançamento' : `${num(row.value, 1)}h extras`}` }))} />
      </Card>

      <Card title="Desligamentos" what={`Quem saiu, por decisão de quem e por qual motivo · ${exit.label}`} control={exit.control}
        results={[['Saídas', num(left.length), left.length ? 'neg' : ''], ['Rotatividade (turnover)', pct(exitAvg ? left.length / exitAvg * 100 : null)], ['Por iniciativa da pessoa', left.length ? `${Math.round(voluntary / left.length * 100)}%` : '—']]}
        reading={left.length ? `${plural(voluntary, 'saída foi', 'saídas foram')} por iniciativa da pessoa e ${num(left.length - voluntary)} por decisão da empresa, fim de contrato ou outro motivo. Saída voluntária é a que a empresa mais consegue evitar.` : undefined}>
        <Pie empty="Nenhum desligamento registrado no período." slices={[['Iniciativa da pessoa', voluntary], ['Decisão da empresa', company], ['Fim de contrato ou outro', left.length - voluntary - company]]} unit="saídas" />
        {reasons.length > 0 && <div className="pa-rank">{reasons.map(([name, count]) => <div key={name}><span>{name}</span><div><i style={{ width: `${count / reasons[0][1] * 100}%` }} /></div><b>{count}</b></div>)}</div>}
      </Card>
    </div>
  </div>;
}

/* ---------- Retrato do mês selecionado: composição e quadro aprovado ---------- */
export function PeopleAnalyticsMonth({ series, metrics, working, privateRows, month, departments }: BoardProps) {
  const metric = metrics.find((item) => item.reference_month.slice(0, 7) === month) || null;
  const [area, setArea] = useState('');
  const point = series.find((item) => item.month === month); const index = series.findIndex((item) => item.month === month); const before = index > 0 ? series[index - 1] : null;
  const start = before ? before.active : point ? point.active - point.admissions + point.exits : 0;
  const ytd = series.filter((item) => item.month.slice(0, 4) === month.slice(0, 4) && item.month <= month).reduce((sum, item) => sum + item.admissions - item.exits, 0);
  const cascade = [['Início do mês', start, 'base'], ['Admissões', point?.admissions || 0, 'in'], ['Desligamentos', point?.exits || 0, 'out'], ['Fim do mês', point?.active || 0, 'base']] as [string, number, string][]; const cascadePeak = Math.max(1, ...cascade.map((item) => item[1]));
  const count = (pick: (item: PaMember) => string, list = working) => Object.entries(list.reduce<Record<string, number>>((map, item) => { const key = pick(item); map[key] = (map[key] || 0) + 1; return map; }, {})).sort((a, b) => b[1] - a[1]) as [string, number][];
  const privateOf = (item: PaMember) => privateRows.find((row) => row.member_id === item.id);
  const hasPrivate = working.some((item) => privateOf(item)?.gender || privateOf(item)?.has_children);
  const contract: Record<string, string> = { clt: 'CLT', pj: 'PJ', intern: 'Estágio', temporary: 'Temporário', outsourced: 'Terceirizado', other: 'Outro' }; const model: Record<string, string> = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' }; const gender: Record<string, string> = { female: 'Feminino', male: 'Masculino', other: 'Outra identificação', prefer_not: 'Prefere não informar' };
  const months = (item: PaMember) => Math.max(0, (new Date(`${month}-28T12:00:00`).getTime() - new Date(`${item.admission_date}T12:00:00`).getTime()) / 2629800000);
  const band = (item: PaMember) => { const value = months(item); return value < 6 ? 'Até 6 meses' : value < 12 ? '6 a 12 meses' : value < 24 ? '1 a 2 anos' : value < 48 ? '2 a 4 anos' : 'Mais de 4 anos'; };
  const segment = working.filter((item) => !area || item.department === area);
  const avgMonths = segment.length ? segment.reduce((sum, item) => sum + months(item), 0) / segment.length : null;
  const tenureText = avgMonths == null ? '—' : avgMonths >= 12 ? `${num(avgMonths / 12, 1)} anos` : `${num(avgMonths, 0)} meses`;
  const veteran = segment.filter((item) => months(item) >= 48).length; const newcomers = segment.filter((item) => months(item) < 12).length;
  const approved = Object.entries(metric?.approved_headcount || {}); const approvedTotal = approved.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const filledIn = (name: string) => working.filter((item) => item.department === name).length; const filledTotal = approved.reduce((sum, [name]) => sum + filledIn(name), 0);
  const biggest = count((item) => item.department || 'Sem área')[0];

  return <div className="pa-board">
    <div className="pa-section-head month"><small>RETRATO DO MÊS · {longMonth(month).toUpperCase()}</small><h2>Quem são as pessoas ativas neste mês</h2><p>Estes blocos mostram só o mês escolhido no topo da página; não somam o período.</p></div>
    <div className="pa-grid">
      <Card title="Movimento do mês" what={`De quantas pessoas ${longMonth(month)} começou a quantas terminou`}
        results={[['Saldo do mês', `${(point?.admissions || 0) - (point?.exits || 0) > 0 ? '+' : ''}${num((point?.admissions || 0) - (point?.exits || 0))}`, (point?.admissions || 0) - (point?.exits || 0) < 0 ? 'neg' : (point?.admissions || 0) - (point?.exits || 0) > 0 ? 'pos' : ''], [`Saldo acumulado em ${month.slice(0, 4)}`, `${ytd > 0 ? '+' : ''}${num(ytd)}`, ytd < 0 ? 'neg' : ytd > 0 ? 'pos' : '']]}>
        {point ? <div className="v2-cascade">{cascade.map(([label, value, kind]) => <div key={label} className={kind}><span>{label}</span><div><i style={{ width: `${value ? Math.max(3, value / cascadePeak * 100) : 0}%` }} /></div><b>{kind === 'in' && value ? '+' : kind === 'out' && value ? '−' : ''}{num(value)}</b></div>)}</div> : <div className="pa-empty">Confirme a equipe deste mês para ver o movimento.</div>}
      </Card>

      <Card title="Quadro aprovado × ocupado" what="Quantas posições cada área tem autorização para ter e quantas estão preenchidas"
        results={approved.length ? [['Posições aprovadas', num(approvedTotal)], ['Ocupadas', num(filledTotal)], ['Vagas em aberto', num(Math.max(0, approvedTotal - filledTotal)), approvedTotal > filledTotal ? 'warn' : '']] : undefined}
        reading={approved.length ? (approvedTotal > filledTotal ? `há ${plural(approvedTotal - filledTotal, 'posição autorizada ainda sem pessoa', 'posições autorizadas ainda sem pessoa')}.` : 'todas as posições aprovadas estão ocupadas.') : undefined}>
        {approved.length ? <table className="pa-table"><thead><tr><th>Área</th><th>Aprovado</th><th>Ocupado</th><th>Em aberto</th></tr></thead><tbody>{approved.map(([name, value]) => { const filled = filledIn(name); const open = Number(value) - filled; return <tr key={name}><td>{name}</td><td>{num(Number(value))}</td><td>{num(filled)}</td><td className={open > 0 ? 'warn' : open < 0 ? 'neg' : ''}>{open > 0 ? num(open) : open < 0 ? `${num(-open)} acima` : '—'}</td></tr>; })}</tbody></table> : <div className="pa-empty">Quadro aprovado ainda não lançado em “Dados do mês”.</div>}
      </Card>

      <Card title="Composição por área" what="Como as pessoas ativas se distribuem entre as áreas" reading={biggest ? `${biggest[0]} concentra ${Math.round(biggest[1] / Math.max(1, working.length) * 100)}% do quadro.` : undefined}>
        <Pie slices={count((item) => item.department || 'Sem área')} />
      </Card>

      <Card title="Tempo de permanência" what="Há quanto tempo as pessoas ativas estão na empresa" control={<select className="pa-range" aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)}><option value="">Todas as áreas</option>{departments.map((name) => <option key={name}>{name}</option>)}</select>}
        results={[['Tempo médio de casa', tenureText], ['Até 1 ano', segment.length ? `${Math.round(newcomers / segment.length * 100)}%` : '—'], ['Mais de 4 anos', segment.length ? `${Math.round(veteran / segment.length * 100)}%` : '—']]}
        reading={segment.length ? 'muita gente com menos de 1 ano pede atenção à integração; muita gente com mais de 4 anos pede plano para não perder conhecimento de uma vez.' : undefined}>
        <Pie slices={['Até 6 meses', '6 a 12 meses', '1 a 2 anos', '2 a 4 anos', 'Mais de 4 anos'].map((label) => [label, segment.filter((item) => band(item) === label).length] as [string, number])} />
      </Card>

      <Card title="Tipo de contrato" what="Vínculo das pessoas ativas"><Pie slices={count((item) => contract[item.employment_type] || item.employment_type || 'Não informado')} /></Card>
      <Card title="Modelo de trabalho" what="Presencial, híbrido ou remoto, conforme o cadastro"><Pie slices={count((item) => model[item.work_model || ''] || 'Não informado')} /></Card>
      <Card title="Liderança" what="Quem lidera pessoas e quem não lidera" reading={working.length ? `1 liderança para cada ${num((working.length - working.filter((item) => item.is_leader).length) / Math.max(1, working.filter((item) => item.is_leader).length), 1)} pessoas.` : undefined}><Pie slices={[['Lideranças', working.filter((item) => item.is_leader).length], ['Demais pessoas', working.filter((item) => !item.is_leader).length]]} /></Card>
      <Card title="Gênero" what="Informação declarada no cadastro"><Pie slices={hasPrivate ? count((item) => gender[privateOf(item)?.gender || ''] || 'Não informado') : []} empty="Sem dado de gênero no cadastro desta empresa." /></Card>
      <Card title="Mães e pais" what="Pessoas que declararam ter filhos"><Pie slices={hasPrivate ? count((item) => ({ yes: 'Tem filhos', no: 'Não tem filhos' } as Record<string, string>)[privateOf(item)?.has_children || ''] || 'Não informado') : []} empty="Sem dado de filhos no cadastro desta empresa." /></Card>

      <section className="pa-card wide pa-missing"><header><div><h3>O que a planilha pede e ainda não tem dado no cadastro</h3><p>Faixa etária e idade média (falta a data de nascimento) · filhos por faixa de idade · pessoas com deficiência e cota legal · cor / raça autodeclarada · nível hierárquico · custo de horas extras e de banco de horas · custo por perfil. Esses gráficos entram quando os campos existirem.</p></div></header></section>
    </div>
  </div>;
}
