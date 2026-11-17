import { SatisfactionEmpty, SatisfactionPanel } from './SatisfactionPanel';

type TrendMonth = { key: string; label: string; average: number };

export function SatisfactionTrend({ months }: { months: TrendMonth[] }) {
  const x = (index: number) => 45 + index * (545 / Math.max(1, months.length - 1));
  const y = (average: number) => 185 - ((average - 1) / 4) * 165;
  return (
    <SatisfactionPanel eyebrow="EVOLUÇÃO" title="Satisfação ao longo do tempo" aside={<span className="tw:text-xs tw:whitespace-nowrap tw:text-cali-muted tw:[@media(max-width:40rem)]:hidden">média mensal · 1–5</span>}>
      {months.length > 1 ? (
        <svg className="tw:block tw:h-auto tw:w-full tw:text-xs" viewBox="0 0 620 220" role="img" aria-label="Evolução mensal da satisfação">
          <line x1="38" y1="20" x2="38" y2="185" stroke="var(--cali-color-sand-line)" />
          <line x1="38" y1="185" x2="600" y2="185" stroke="var(--cali-color-sand-line)" />
          {[1, 2, 3, 4, 5].map((value) => <text key={value} x="8" y={190 - (value - 1) * 41} fill="var(--cali-color-sand-text)">{value}</text>)}
          <polyline points={months.map((item, index) => `${x(index)},${y(item.average)}`).join(' ')} fill="none" className="tw:stroke-cali-brand" strokeWidth="2" strokeLinejoin="round" />
          {months.map((item, index) => (
            <g key={item.key}>
              <circle cx={x(index)} cy={y(item.average)} r="4.5" className="tw:fill-cali-neutral-surface tw:stroke-cali-brand" strokeWidth="2" />
              <text x={x(index)} y={y(item.average) - 9} className="tw:fill-cali-brand tw:font-bold" textAnchor="middle">{item.average.toFixed(1).replace('.', ',')}</text>
              <text x={x(index)} y="207" fill="var(--cali-color-sand-text)" textAnchor="middle">{item.label}</text>
            </g>
          ))}
        </svg>
      ) : <SatisfactionEmpty>São necessárias pelo menos duas referências mensais para mostrar uma tendência.</SatisfactionEmpty>}
    </SatisfactionPanel>
  );
}
