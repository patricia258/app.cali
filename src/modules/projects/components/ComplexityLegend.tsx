import { complexityMeta, complexityRange, type MaterialComplexity } from '../../../domain/projects';

const complexities = Object.keys(complexityMeta) as MaterialComplexity[];

export function ComplexityLegend({ current }: { current: string }) {
  return <ul className="v2-mc-legend" aria-label="O que significa cada complexidade">
    {complexities.map((code) => <li key={code} className={code === current ? 'on' : ''}>
      <b className={`mc-chip ${code.toLowerCase()}`}>{code}</b>
      <span><strong>{complexityMeta[code].label.split(' · ')[1]} · {complexityRange(code)}</strong>{complexityMeta[code].description}</span>
    </li>)}
    <li className="v2-mc-foot">MC é a complexidade do entregável. M1, M2, M3… são os meses do roadmap. A faixa é referência de planejamento, não prazo contratual.</li>
  </ul>;
}
