/* Barra de utilização da capacidade mensal — a mesma na Home e em Horas do cliente (e onde mais for preciso).
   Escala fixa 0–100% com marcas em 0, 50, 75 e 100; o que passa de 100% aparece numa faixa vermelha À PARTE, à direita,
   sem comprimir a escala. Não depende só de cor: traz o percentual escrito e um aviso quando há excedente. */
import { AlertTriangle } from 'lucide-react';
import { type Capacity, minutesLabel, percentLabel } from '../lib/capacity';

export function CapacityBar({ capacity, dark }: { capacity: Capacity; dark?: boolean }) {
  const pct = capacity.usagePercent ?? 0; const base = Math.min(100, Math.max(0, pct)); const over = Math.max(0, pct - 100); const overFill = Math.min(100, (over / 50) * 100);
  return <div className={`v2-cap ${dark ? 'dark' : ''} ${over > 0 ? 'has-excess' : ''}`}>
    <div className="v2-cap-row" role="progressbar" aria-label="Utilização da capacidade mensal contratada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(base)} aria-valuetext={`${percentLabel(capacity.usagePercent)} utilizados${over > 0 ? `, ${minutesLabel(capacity.excessMinutes)} acima do contratado` : ''}`}>
      <div className="v2-cap-track"><span className="v2-cap-fill" style={{ width: `${base}%` }}><i style={{ width: base > 0 ? `${10000 / base}%` : '100%' }} /></span>{[50, 75].map((mark) => <b key={mark} style={{ left: `${mark}%` }} />)}</div>
      <div className="v2-cap-over" title={over > 0 ? `${percentLabel(capacity.excessPercent)} acima do contratado` : 'Sem excedente'}><span style={{ width: `${overFill}%` }} /></div>
    </div>
    <div className="v2-cap-scale"><span style={{ left: '0%' }}>0%</span><span style={{ left: '50%' }}>50%</span><span style={{ left: '75%' }}>75%</span><span style={{ left: '100%' }}>100%</span></div>
    <div className="v2-cap-read"><strong>{percentLabel(capacity.usagePercent)} utilizados</strong><span>{minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}</span>{over > 0 && <em><AlertTriangle size={13} /> {minutesLabel(capacity.excessMinutes)} acima ({percentLabel(capacity.excessPercent)})</em>}</div>
  </div>;
}
