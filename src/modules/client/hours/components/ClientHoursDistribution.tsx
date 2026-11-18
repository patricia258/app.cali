import type { FrontTone } from './ClientHoursLedger';

export type HourDistribution = { name: string; share: number; tone: FrontTone };

const dotTone: Record<FrontTone, string> = {
  purple: 'tw:bg-cali-violet-line',
  blue: 'tw:bg-cali-blue-line',
  green: 'tw:bg-cali-green-line',
  gold: 'tw:bg-cali-orange-line',
};

function DistributionRow({ label, value, tone }: { label: string; value: string; tone?: FrontTone }) {
  return (
    <div className="tw:flex tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-surface/20 tw:py-4.5 tw:text-sm tw:leading-[inherit]">
      <span className="tw:inline-flex tw:items-center tw:gap-2.5">{tone && <span className={`tw:size-2.5 tw:flex-none tw:rounded-full ${dotTone[tone]}`} />}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ClientHoursDistribution({ fronts, consumption }: { fronts: HourDistribution[]; consumption: string }) {
  return (
    <aside className="tw:flex tw:flex-col tw:border-0 tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(153deg,var(--cali-color-burgundy-accent),var(--cali-color-red-strong))] tw:px-8 tw:py-11 tw:text-cali-gold-surface tw:[@media(max-width:53.125rem)]:border-t">
      <div className="tw:text-cali-label tw:leading-[inherit] tw:font-bold tw:tracking-[.115rem]">COMO LER ESTE EXTRATO</div>
      <h2 className="tw:mt-5 tw:text-3xl tw:leading-[1.3] tw:font-normal tw:tracking-[-.046rem]">Tempo dedicado a decisões que importam.</h2>
      <p className="tw:text-cali-body tw:leading-[1.75]">As horas registram atividades executadas pela CALI. Você acompanha o que foi feito, sem editar os lançamentos.</p>
      <div className="tw:mt-6 tw:mb-7 tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-surface/25" />
      <span className="tw:text-cali-label tw:leading-[inherit] tw:font-bold tw:tracking-[.115rem]">DISTRIBUIÇÃO POR FRENTE</span>
      {fronts.length ? fronts.map(({ name, share, tone }) => <DistributionRow key={name} label={name} value={`${share}%`} tone={tone} />) : <DistributionRow label="Sem lançamentos neste mês" value="—" />}
      <DistributionRow label="Consumo mensal" value={consumption} />
      <div className="tw:mt-auto tw:pt-9 tw:text-xs tw:leading-[inherit]">Todo o tempo dedicado à sua empresa entra no consumo. O extrato mostra em quê foi investido, somado por item.</div>
    </aside>
  );
}
