import { AlertTriangle } from 'lucide-react';
import { type Capacity, minutesLabel, percentLabel } from '../../lib/capacity';

type CapacityBarProps = {
  capacity: Capacity;
  dark?: boolean;
  bare?: boolean;
  large?: boolean;
};

export function CapacityBar({ capacity, dark, bare, large }: CapacityBarProps) {
  const usage = capacity.usagePercent ?? 0;
  const base = Math.min(100, Math.max(0, usage));
  const hasExcess = usage > 100;
  const excessFill = Math.min(100, (usage - 100) * 2);
  const usageLabel = percentLabel(capacity.usagePercent);
  const excessLabel = percentLabel(capacity.excessPercent);
  const excessHours = minutesLabel(capacity.excessMinutes);

  return (
    <div className={`tw:flex tw:w-full tw:flex-col tw:gap-2 ${dark
      ? 'tw:[--capacity-ink:white] tw:[--capacity-muted:rgb(var(--cali-rgb-neutral-surface)/0.7804)] tw:[--capacity-track:rgb(var(--cali-rgb-neutral-surface)/0.2)] tw:[--capacity-warning:var(--cali-color-red-soft)]'
      : 'tw:[--capacity-ink:var(--cali-color-neutral-strong)] tw:[--capacity-muted:var(--cali-color-sand-text)] tw:[--capacity-track:var(--cali-color-neutral-soft)] tw:[--capacity-warning:var(--cali-color-red-accent)]'}`}>
      <div
        className="tw:grid tw:grid-cols-[minmax(0,1fr)_14%] tw:items-center tw:gap-1"
        role="progressbar"
        aria-label="Utilização da capacidade mensal contratada"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(base)}
        aria-valuetext={`${usageLabel} utilizados${hasExcess ? `, ${excessHours} acima do contratado` : ''}`}
      >
        <div className={`tw:relative tw:overflow-hidden tw:rounded-l-lg tw:bg-(--capacity-track) ${large ? 'tw:h-4.5' : 'tw:h-3'}`}>
          <span className="tw:absolute tw:inset-y-0 tw:left-0 tw:overflow-hidden" style={{ width: `${base}%` }}>
            <span className="tw:block tw:h-full tw:bg-[linear-gradient(90deg,var(--cali-color-green-accent)_0%,var(--cali-color-green-accent)_35%,var(--cali-color-orange-line)_62%,var(--cali-color-orange-accent)_82%,var(--cali-color-red-accent)_100%)]" style={{ width: base > 0 ? `${10000 / base}%` : '100%' }} />
          </span>
          <span className="tw:absolute tw:inset-y-0 tw:left-1/2 tw:w-0.5 tw:-translate-x-1/2 tw:bg-cali-neutral-surface/75" />
          <span className="tw:absolute tw:inset-y-0 tw:left-3/4 tw:w-0.5 tw:-translate-x-1/2 tw:bg-cali-neutral-surface/75" />
        </div>
        <div
          className={`tw:relative tw:overflow-hidden tw:rounded-r-lg tw:border-0 tw:border-l-2 tw:border-solid tw:border-l-(--capacity-ink) tw:bg-[repeating-linear-gradient(135deg,var(--capacity-track)_0_.385rem,transparent_.385rem_.692rem)] ${large ? 'tw:h-4.5' : 'tw:h-3'}`}
          title={hasExcess ? `${excessLabel} acima do contratado` : 'Sem excedente'}
        >
          {hasExcess && <span className="tw:absolute tw:inset-y-0 tw:left-0 tw:bg-cali-danger" style={{ width: `${excessFill}%` }} />}
        </div>
      </div>
      <div className="tw:grid tw:grid-cols-[minmax(0,1fr)_14%] tw:items-start tw:gap-1 tw:text-xs tw:leading-[inherit]">
        <div className="tw:relative tw:h-4.5 tw:text-(--capacity-muted)">
          <span className="tw:absolute tw:left-0">0%</span>
          <span className="tw:absolute tw:left-1/2 tw:-translate-x-1/2">50%</span>
          <span className="tw:absolute tw:left-3/4 tw:-translate-x-1/2">75%</span>
          <span className="tw:absolute tw:right-0">100%</span>
        </div>
        <span className={`tw:text-right ${hasExcess ? 'tw:font-bold tw:text-(--capacity-warning)' : 'tw:text-(--capacity-muted) tw:opacity-55'}`}>Excedente</span>
      </div>
      {!bare && (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-2 tw:text-cali-body tw:leading-[inherit] tw:text-(--capacity-muted)">
          <strong className="tw:text-base tw:leading-[inherit] tw:text-(--capacity-ink)">{usageLabel} utilizados</strong>
          <span>{minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}</span>
          {hasExcess && <em className="tw:inline-flex tw:items-center tw:gap-1.5 tw:font-bold tw:text-(--capacity-warning) tw:not-italic"><AlertTriangle size={13} /> {excessHours} acima ({excessLabel})</em>}
        </div>
      )}
    </div>
  );
}
