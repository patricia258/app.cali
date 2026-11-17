import { Select } from '../../../components/ds/Select';
/* Perfil Comportamental CALI — gráficos em SVG (servem na tela, na impressão e na captura do PDF). */
import { BANDS, bandOf, bandText, rangeOf, STYLES, type Band, type Style } from '../profileMethod';
import { STYLE_CONTENT } from '../profileContent';

type Pcts = Record<Style, number>;
const AXES: Record<Style, number> = { D: -90, I: 0, S: 90, C: 180 };

function point(cx: number, cy: number, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}
const poly = (values: Pcts, cx: number, cy: number, r: number) => STYLES.map((style) => point(cx, cy, AXES[style], (Math.max(4, values[style]) / 100) * r).map((n) => n.toFixed(1)).join(',')).join(' ');

/** Radar D-I-S-C (losango): o formato geral do perfil na chave natural. */
export function ProfileRadar({ natural, pressure, size = 260 }: { natural: Pcts; pressure?: Pcts; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 34;
  return <svg className="cpr-radar" width={size + 70} height={size} viewBox={`-35 0 ${size + 70} ${size}`} role="img" aria-label="Gráfico radar do perfil">
    {[0.25, 0.5, 0.75, 1].map((step) => <polygon key={step} points={STYLES.map((style) => point(cx, cy, AXES[style], r * step).map((n) => n.toFixed(1)).join(',')).join(' ')} fill={step === 0.5 ? 'var(--cali-color-sand-soft)' : 'none'} stroke={step === 0.5 ? 'var(--cali-color-neutral-line)' : 'var(--cali-color-sand-line)'} strokeWidth={step === 0.5 ? 1.2 : 1} />)}
    {STYLES.map((style) => { const [x, y] = point(cx, cy, AXES[style], r); return <line key={style} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--cali-color-sand-line)" />; })}
    <polygon points={poly(natural, cx, cy, r)} fill="rgb(var(--cali-rgb-burgundy-accent)/0.18)" stroke="var(--cali-color-burgundy-accent)" strokeWidth={2.2} strokeLinejoin="round" />
    {pressure && <polygon points={poly(pressure, cx, cy, r)} fill="none" stroke="var(--cali-color-gold-accent)" strokeWidth={2.2} strokeDasharray="6 5" strokeLinejoin="round" />}
    {STYLES.map((style) => { const [x, y] = point(cx, cy, AXES[style], r + 18); return <g key={style}><text x={x} y={y - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill={STYLE_CONTENT[style].ink} fontFamily="Inter, Arial, sans-serif">{style}</text><text x={x} y={y + 10} textAnchor="middle" fontSize="9.5" fill="var(--cali-color-neutral-accent)" fontFamily="Inter, Arial, sans-serif">{STYLE_CONTENT[style].name}</text></g>; })}
  </svg>;
}

const BAND_SHADE: Record<Band, string> = { Baixo: 'var(--cali-color-sand-soft)', Moderado: 'var(--cali-color-neutral-soft)', Alto: 'var(--cali-color-sand-line)', 'Muito alto': 'var(--cali-color-sand-line)' };

/** Barras por estilo com faixas de fundo, o intervalo provável (escore ± margem) e o rótulo honesto da faixa. */
export function ProfileBandBars({ values, margin, plain }: { values: Pcts; margin: number; plain?: boolean }) {
  return <div className="cpr-bars tw:flex tw:flex-col tw:gap-3 tw:[.cpr-chart-row>&]:flex-1">
    {STYLES.map((style) => { const { lo, hi } = rangeOf(values[style], margin); return <div className="cpr-bar-row tw:grid tw:grid-cols-[7.5rem_1fr_11rem] tw:items-center tw:gap-2.5" key={style}>
      <span className="cpr-bar-name tw:text-xs tw:font-semibold tw:[&_b]:inline-block tw:[&_b]:w-3.5" style={{ color: STYLE_CONTENT[style].ink }}><b>{style}</b> {STYLE_CONTENT[style].name}</span>
      <div className="cpr-bar-track tw:relative tw:h-5 tw:overflow-hidden tw:rounded-xl tw:bg-[var(--marfim)]">
        {BANDS.map((band) => <i className="tw:absolute tw:inset-y-0" key={band.band} style={{ left: `${band.from}%`, width: `${band.to - band.from + (band.to === 100 ? 0 : 1)}%`, background: BAND_SHADE[band.band] }} />)}
        <b className="cpr-bar-range tw:absolute tw:inset-y-1 tw:rounded-sm tw:opacity-[0.28]" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: STYLE_CONTENT[style].color }} />
        <em className="tw:absolute tw:top-1 tw:h-3.5 tw:w-3 tw:rounded-md tw:shadow-[0_0_0_0.125rem_var(--cali-color-neutral-surface)]" style={{ left: `calc(${values[style]}% - 5px)`, background: STYLE_CONTENT[style].color }} />
        <s className="tw:absolute tw:inset-y-0 tw:w-px tw:bg-[color:rgb(var(--cali-rgb-burgundy-strong)/0.35)]" style={{ left: '50%' }} />
      </div>
      <span className="cpr-bar-value tw:flex tw:min-w-0 tw:flex-wrap tw:items-baseline tw:gap-x-1.5 tw:gap-y-0 tw:leading-tight tw:whitespace-normal tw:[overflow-wrap:anywhere]">{!plain && <strong className="tw:text-cali-detail">{values[style]}</strong>}<small className="tw:text-cali-micro tw:text-[color:var(--muted)]">{plain ? '' : `${lo}–${hi} · `}{bandText(values[style], margin)}</small></span>
    </div>; })}
    <div className="cpr-bar-legend tw:grid tw:grid-cols-[7.5rem_39fr_20fr_20fr_21fr_11rem] tw:gap-x-2.5 tw:pl-0 tw:text-cali-micro tw:text-[color:var(--muted)]"><span className="tw:invisible tw:pr-0.5 tw:text-right">0</span><span>Baixo</span><span>Moderado</span><span>Alto</span><span>Muito alto</span><span>100</span></div>
  </div>;
}

/** Dia comum x semana difícil, lado a lado por estilo: cada leitura com a sua margem, sem subtrair uma da outra. */
export function TwinBands({ natural, pressure, naturalMargin, pressureMargin, plain }: { natural: Pcts; pressure: Pcts; naturalMargin: number; pressureMargin: number; plain?: boolean }) {
  const row = (value: number, margin: number, style: Style, dashed?: boolean) => { const { lo, hi } = rangeOf(value, margin); return <div className={`cpr-twin-bar tw:relative tw:h-4.5 tw:rounded-lg tw:bg-[var(--marfim)] ${dashed ? 'dashed' : ''}`}>
    <b className={`tw:absolute tw:inset-y-1 tw:rounded ${dashed ? 'tw:opacity-[0.16]' : 'tw:opacity-[0.28]'}`} style={{ left: `${lo}%`, width: `${hi - lo}%`, background: STYLE_CONTENT[style].color }} /><em className="tw:absolute tw:top-1 tw:h-3 tw:w-2.5 tw:rounded-md tw:shadow-[0_0_0_0.125rem_var(--cali-color-neutral-surface)]" style={{ left: `calc(${value}% - 4px)`, background: STYLE_CONTENT[style].color }} /><s className="tw:absolute tw:-inset-y-0.5 tw:left-1/2 tw:w-px tw:bg-[color:rgb(var(--cali-rgb-burgundy-strong)/0.30)]" />
  </div>; };
  return <div className="cpr-twin tw:flex tw:flex-col tw:gap-4.5">
    <div className="cpr-twin-head tw:grid tw:grid-cols-[7.5rem_1fr_1fr] tw:items-center tw:gap-3.5 tw:[&_span]:text-cali-micro
      tw:[&_span]:font-bold tw:[&_span]:text-[color:var(--ink)] tw:[&_small]:font-medium tw:[&_small]:text-[color:var(--muted)]"><span /><span>Dia comum {!plain && <small>(18 blocos, ±{naturalMargin})</small>}</span><span>Semana difícil {!plain && <small>(6 blocos, ±{pressureMargin})</small>}</span></div>
    {STYLES.map((style) => <div className="cpr-twin-row tw:grid tw:grid-cols-[7.5rem_1fr_1fr] tw:items-center tw:gap-3.5" key={style}>
      <span className="cpr-bar-name tw:text-xs tw:font-semibold tw:[&_b]:inline-block tw:[&_b]:w-3.5" style={{ color: STYLE_CONTENT[style].ink }}><b>{style}</b> {STYLE_CONTENT[style].name}</span>
      <div className="tw:flex tw:flex-col tw:gap-1">{row(natural[style], naturalMargin, style)}<small className="tw:text-cali-label tw:text-[color:var(--muted)]">{bandText(natural[style], naturalMargin)}</small></div>
      <div className="tw:flex tw:flex-col tw:gap-1">{row(pressure[style], pressureMargin, style, true)}<small className="tw:text-cali-label tw:text-[color:var(--muted)]">{bandText(pressure[style], pressureMargin)}</small></div>
    </div>)}
  </div>;
}

export type RoleProfile = Partial<Record<Style, Band | ''>>;
const ORDER: Band[] = ['Baixo', 'Moderado', 'Alto', 'Muito alto'];

/** Matriz de papel: o que a função pede em cada estilo x o que a pessoa entrega. Divergência de 2 faixas é destacada. */
export function RoleMatrix({ values, margin, role, editable, onChange }: { values: Pcts; margin: number; role: RoleProfile; editable?: boolean; onChange?: (next: RoleProfile) => void }) {
  return <table className="cpr-matrix"><thead><tr><th>Estilo</th><th>O papel pede</th><th>A pessoa entrega</th><th>Leitura</th></tr></thead><tbody>
    {STYLES.map((style) => {
      const asked = role[style] || '';
      const gives = bandOf(values[style]);
      const gap = asked ? ORDER.indexOf(gives) - ORDER.indexOf(asked as Band) : 0;
      const reading = !asked ? '—' : gap === 0 ? 'Alinhado' : Math.abs(gap) === 1 ? (gap > 0 ? 'Um pouco acima' : 'Um pouco abaixo') : gap > 0 ? 'Bem acima: atenção a excesso' : 'Bem abaixo: exige apoio';
      return <tr key={style} className={Math.abs(gap) >= 2 ? 'gap' : ''}>
        <td className="cpr-style-cell" style={{ color: STYLE_CONTENT[style].ink }}><b>{style}</b> {STYLE_CONTENT[style].name}</td>
        <td>{editable ? <Select variant="embedded" value={asked} onChange={(event) => onChange?.({ ...role, [style]: event.target.value as Band | '' })}><option value="">Não definido</option>{ORDER.map((band) => <option key={band}>{band}</option>)}</Select> : asked || 'Não definido'}</td>
        <td>{gives} <small>({rangeOf(values[style], margin).lo}–{rangeOf(values[style], margin).hi})</small></td>
        <td>{reading}</td>
      </tr>;
    })}
  </tbody></table>;
}
