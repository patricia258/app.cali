/* Perfil Comportamental CALI — gráficos em SVG (servem na tela, na impressão e na captura do PDF). */
import { BANDS, bandOf, STYLES, type Band, type Style } from './profileMethod';
import { STYLE_CONTENT } from './profileContent';

type Pcts = Record<Style, number>;
const AXES: Record<Style, number> = { D: -90, I: 0, S: 90, C: 180 };

function point(cx: number, cy: number, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}
const poly = (values: Pcts, cx: number, cy: number, r: number) => STYLES.map((style) => point(cx, cy, AXES[style], (Math.max(4, values[style]) / 100) * r).map((n) => n.toFixed(1)).join(',')).join(' ');

/** Radar D-I-S-C (losango). Com `pressure`, sobrepõe a chave sob pressão em tracejado. */
export function ProfileRadar({ natural, pressure, size = 260 }: { natural: Pcts; pressure?: Pcts; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 34;
  return <svg className="cpr-radar" width={size + 70} height={size} viewBox={`-35 0 ${size + 70} ${size}`} role="img" aria-label="Gráfico radar do perfil">
    {[0.25, 0.5, 0.75, 1].map((step) => <polygon key={step} points={STYLES.map((style) => point(cx, cy, AXES[style], r * step).map((n) => n.toFixed(1)).join(',')).join(' ')} fill={step === 0.5 ? '#F6F0EB' : 'none'} stroke={step === 0.5 ? '#D9C9BE' : '#EADFD6'} strokeWidth={step === 0.5 ? 1.2 : 1} />)}
    {STYLES.map((style) => { const [x, y] = point(cx, cy, AXES[style], r); return <line key={style} x1={cx} y1={cy} x2={x} y2={y} stroke="#EADFD6" />; })}
    <polygon points={poly(natural, cx, cy, r)} fill="rgba(90,30,45,.18)" stroke="#5A1E2D" strokeWidth={2.2} strokeLinejoin="round" />
    {pressure && <polygon points={poly(pressure, cx, cy, r)} fill="none" stroke="#B58C52" strokeWidth={2.2} strokeDasharray="6 5" strokeLinejoin="round" />}
    {STYLES.map((style) => { const [x, y] = point(cx, cy, AXES[style], r + 18); return <g key={style}><text x={x} y={y - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill={STYLE_CONTENT[style].color} fontFamily="Inter, Arial, sans-serif">{style}</text><text x={x} y={y + 10} textAnchor="middle" fontSize="9.5" fill="#6B5D63" fontFamily="Inter, Arial, sans-serif">{STYLE_CONTENT[style].name}</text></g>; })}
  </svg>;
}

const BAND_SHADE: Record<Band, string> = { Baixo: '#F7F3EE', Moderado: '#F1EAE3', Alto: '#EADFD6', 'Muito alto': '#E2D3C7' };

/** Barras por estilo com faixas de fundo (baixo, moderado, alto, muito alto) e o rótulo da faixa. */
export function ProfileBandBars({ values, compare }: { values: Pcts; compare?: Pcts }) {
  return <div className="cpr-bars">
    {STYLES.map((style) => <div className="cpr-bar-row" key={style}>
      <span className="cpr-bar-name" style={{ color: STYLE_CONTENT[style].color }}><b>{style}</b> {STYLE_CONTENT[style].name}</span>
      <div className="cpr-bar-track">
        {BANDS.map((band) => <i key={band.band} style={{ left: `${band.from}%`, width: `${band.to - band.from + (band.to === 100 ? 0 : 1)}%`, background: BAND_SHADE[band.band] }} />)}
        <em style={{ width: `${Math.max(2, values[style])}%`, background: STYLE_CONTENT[style].color }} />
        {compare && <u style={{ left: `${compare[style]}%` }} title="Sob pressão" />}
        <s style={{ left: '50%' }} />
      </div>
      <span className="cpr-bar-value"><strong>{values[style]}</strong><small>{bandOf(values[style])}</small></span>
    </div>)}
    <div className="cpr-bar-legend"><span>0</span><span>Baixo</span><span>Moderado</span><span>Alto</span><span>Muito alto</span><span>100</span></div>
  </div>;
}

/** Mapa de adaptação: barras divergentes (pressão − natural nos mesmos blocos). Direita amplifica; esquerda recolhe. */
export function AdaptationMap({ adaptation }: { adaptation: Pcts }) {
  return <div className="cpr-adapt">
    <div className="cpr-adapt-head"><span>Recolhe sob pressão</span><span>Amplifica sob pressão</span></div>
    {STYLES.map((style) => { const delta = Math.max(-100, Math.min(100, adaptation[style])); return <div className="cpr-adapt-row" key={style}>
      <span className="cpr-bar-name" style={{ color: STYLE_CONTENT[style].color }}><b>{style}</b> {STYLE_CONTENT[style].name}</span>
      <div className="cpr-adapt-track"><s />
        <em style={delta >= 0 ? { left: '50%', width: `${delta / 2}%`, background: STYLE_CONTENT[style].color } : { right: '50%', width: `${-delta / 2}%`, background: STYLE_CONTENT[style].color, opacity: 0.55 }} />
      </div>
      <span className="cpr-bar-value"><strong>{delta > 0 ? `+${delta}` : delta}</strong></span>
    </div>; })}
  </div>;
}

export type RoleProfile = Partial<Record<Style, Band | ''>>;
const ORDER: Band[] = ['Baixo', 'Moderado', 'Alto', 'Muito alto'];

/** Matriz de papel: o que a função pede em cada estilo x o que a pessoa entrega. Divergência de 2 faixas é destacada. */
export function RoleMatrix({ values, role, editable, onChange }: { values: Pcts; role: RoleProfile; editable?: boolean; onChange?: (next: RoleProfile) => void }) {
  return <table className="cpr-matrix"><thead><tr><th>Estilo</th><th>O papel pede</th><th>A pessoa entrega</th><th>Leitura</th></tr></thead><tbody>
    {STYLES.map((style) => {
      const asked = role[style] || '';
      const gives = bandOf(values[style]);
      const gap = asked ? ORDER.indexOf(gives) - ORDER.indexOf(asked as Band) : 0;
      const reading = !asked ? '—' : gap === 0 ? 'Alinhado' : Math.abs(gap) === 1 ? (gap > 0 ? 'Um pouco acima' : 'Um pouco abaixo') : gap > 0 ? 'Bem acima: atenção a excesso' : 'Bem abaixo: exige apoio';
      return <tr key={style} className={Math.abs(gap) >= 2 ? 'gap' : ''}>
        <td style={{ color: STYLE_CONTENT[style].color }}><b>{style}</b> {STYLE_CONTENT[style].name}</td>
        <td>{editable ? <select value={asked} onChange={(event) => onChange?.({ ...role, [style]: event.target.value as Band | '' })}><option value="">Não definido</option>{ORDER.map((band) => <option key={band}>{band}</option>)}</select> : asked || 'Não definido'}</td>
        <td>{gives} <small>({values[style]})</small></td>
        <td>{reading}</td>
      </tr>;
    })}
  </tbody></table>;
}
