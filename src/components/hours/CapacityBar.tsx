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
      ? 'tw:[--capacity-ink:white] tw:[--capacity-muted:#ffffffc7] tw:[--capacity-track:#ffffff33] tw:[--capacity-warning:#ffd0c7]'
      : 'tw:[--capacity-ink:#2b2b2b] tw:[--capacity-muted:#8a7c74] tw:[--capacity-track:#efe7e0] tw:[--capacity-warning:#b23b3b]'}`}>
      <div
        className="tw:grid tw:grid-cols-[minmax(0,1fr)_14%] tw:items-center tw:gap-[.3rem]"
        role="progressbar"
        aria-label="Utilização da capacidade mensal contratada"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(base)}
        aria-valuetext={`${usageLabel} utilizados${hasExcess ? `, ${excessHours} acima do contratado` : ''}`}
      >
        <div className={`tw:relative tw:overflow-hidden tw:rounded-l-lg tw:bg-(--capacity-track) ${large ? 'tw:h-[1.08rem]' : 'tw:h-3'}`}>
          <span className="tw:absolute tw:inset-y-0 tw:left-0 tw:overflow-hidden" style={{ width: `${base}%` }}>
            <span className="tw:block tw:h-full tw:bg-[linear-gradient(90deg,#3f8f5f_0%,#3f8f5f_35%,#e0b93a_62%,#e08a2b_82%,#c94a3a_100%)]" style={{ width: base > 0 ? `${10000 / base}%` : '100%' }} />
          </span>
          <span className="tw:absolute tw:inset-y-0 tw:left-1/2 tw:w-[.115rem] tw:-translate-x-1/2 tw:bg-white/75" />
          <span className="tw:absolute tw:inset-y-0 tw:left-3/4 tw:w-[.115rem] tw:-translate-x-1/2 tw:bg-white/75" />
        </div>
        <div
          className={`tw:relative tw:overflow-hidden tw:rounded-r-lg tw:border-0 tw:border-l-2 tw:border-solid tw:border-l-(--capacity-ink) tw:bg-[repeating-linear-gradient(135deg,var(--capacity-track)_0_.385rem,transparent_.385rem_.692rem)] ${large ? 'tw:h-[1.08rem]' : 'tw:h-3'}`}
          title={hasExcess ? `${excessLabel} acima do contratado` : 'Sem excedente'}
        >
          {hasExcess && <span className="tw:absolute tw:inset-y-0 tw:left-0 tw:bg-[#c0392b]" style={{ width: `${excessFill}%` }} />}
        </div>
      </div>
      <div className="tw:grid tw:grid-cols-[minmax(0,1fr)_14%] tw:items-start tw:gap-[.3rem] tw:text-[.77rem] tw:leading-[inherit]">
        <div className="tw:relative tw:h-[1.08rem] tw:text-(--capacity-muted)">
          <span className="tw:absolute tw:left-0">0%</span>
          <span className="tw:absolute tw:left-1/2 tw:-translate-x-1/2">50%</span>
          <span className="tw:absolute tw:left-3/4 tw:-translate-x-1/2">75%</span>
          <span className="tw:absolute tw:right-0">100%</span>
        </div>
        <span className={`tw:text-right ${hasExcess ? 'tw:font-bold tw:text-(--capacity-warning)' : 'tw:text-(--capacity-muted) tw:opacity-55'}`}>Excedente</span>
      </div>
      {!bare && (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-2 tw:text-[.92rem] tw:leading-[inherit] tw:text-(--capacity-muted)">
          <strong className="tw:text-[1rem] tw:leading-[inherit] tw:text-(--capacity-ink)">{usageLabel} utilizados</strong>
          <span>{minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}</span>
          {hasExcess && <em className="tw:inline-flex tw:items-center tw:gap-1.5 tw:font-bold tw:text-(--capacity-warning) tw:not-italic"><AlertTriangle size={13} /> {excessHours} acima ({excessLabel})</em>}
        </div>
      )}
    </div>
  );
}
