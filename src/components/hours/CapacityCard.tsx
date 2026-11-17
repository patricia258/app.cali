import { AlertTriangle } from 'lucide-react';
import { type Capacity, minutesLabel, percentLabel } from '../../lib/capacity';
import { CapacityBar } from './CapacityBar';

type CapacityAlert = { tone: 'danger' | 'warning'; title: string; text: string; foot?: string };

const billingNote = 'Não há cobrança adicional ou alteração automática de contrato.';

function consumptionAlert(level: Capacity['level'], occurrence: number): CapacityAlert | undefined {
  switch (level) {
    case 'excess': {
      const recurrence = occurrence === 2
        ? 'Esta é a segunda ocorrência no período acompanhado; a recorrência pode indicar a necessidade de rever o volume de horas. '
        : occurrence >= 3
          ? 'É a terceira ocorrência no período acompanhado; vamos avaliar juntos a adequação do pacote e as alternativas disponíveis. '
          : '';
      return { tone: 'danger', title: 'A capacidade mensal foi ultrapassada.', text: `O consumo está acima do contratado. ${recurrence}Vamos acompanhar juntos a demanda do período e avaliar se é necessário reorganizar as prioridades. Manteremos a comunicação.`, foot: billingNote };
    }
    case 'full':
      return { tone: 'danger', title: 'A capacidade mensal foi integralmente utilizada.', text: 'A CALI acompanhará as demandas previstas e alinhará com você as prioridades, necessidades adicionais e próximos encaminhamentos.' };
    case 'attention':
      return { tone: 'warning', title: 'Atenção ao consumo do mês.', text: 'A sua empresa já utilizou 75% da capacidade contratada para este mês. Ainda temos atividades previstas e, se necessário, podemos revisar juntos a ordem de prioridades.' };
  }
}

function CapacityNotice({ tone, title, text, foot }: CapacityAlert) {
  return (
    <div className={`tw:flex tw:items-start tw:gap-4 tw:rounded-xl tw:border tw:border-l-4 tw:border-solid tw:px-5 tw:py-4 ${tone === 'danger'
      ? 'tw:border-cali-danger-line tw:border-l-cali-danger tw:bg-cali-sand-soft tw:text-cali-danger'
      : 'tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-gold-surface tw:text-cali-gold-text'}`} role="status">
      <AlertTriangle size={18} className="tw:shrink-0" />
      <div>
        <strong className="tw:block tw:text-lg tw:leading-[inherit] tw:text-cali-ink">{title}</strong>
        <p className="tw:m-0 tw:mt-1 tw:text-base tw:leading-normal tw:text-cali-text">{text}</p>
        {foot && <small className="tw:mt-2 tw:block tw:text-sm tw:leading-[inherit] tw:text-cali-muted tw:italic">{foot}</small>}
      </div>
    </div>
  );
}

function CapacityStat({ label, value, note, excess }: { label: string; value: string; note?: string; excess?: boolean }) {
  return (
    <div className={`tw:flex tw:flex-col tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:px-5 tw:py-4 ${excess ? 'tw:border-cali-danger-line tw:bg-cali-danger-surface' : 'tw:border-cali-line tw:bg-cali-paper'}`}>
      <span className="tw:text-sm tw:leading-[inherit] tw:text-cali-muted">{label}</span>
      <strong className={`tw:text-2xl tw:leading-[inherit] ${excess ? 'tw:text-cali-danger' : 'tw:text-cali-ink'}`}>{value}</strong>
      {note && <small className="tw:text-sm tw:leading-[inherit] tw:text-cali-muted">{note}</small>}
    </div>
  );
}

export function CapacityCard({ capacity, occurrence = 0, paused, inLedger }: {
  capacity: Capacity;
  occurrence?: number;
  paused?: boolean;
  inLedger?: boolean;
}) {
  const excess = capacity.excessMinutes > 0;
  const alert = consumptionAlert(capacity.level, occurrence);

  return (
    <section className={`tw:flex tw:flex-col tw:gap-4 ${inLedger
      ? 'tw:mb-5.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-1 tw:pt-7 tw:pb-6'
      : 'tw:mb-6 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-7 tw:py-7'}`} aria-label="Horas do mês">
      <header><h2 className="tw:m-0 tw:text-xl tw:leading-[inherit]">Horas do mês</h2></header>
      {capacity.level === 'none' ? <p className="tw:m-0 tw:text-base tw:leading-[inherit] tw:text-cali-muted">Capacidade mensal ainda não definida no contrato.</p> : (
        <>
          <p className="tw:m-0 tw:flex tw:items-baseline tw:gap-3">
            <strong className="tw:text-4xl tw:leading-[inherit] tw:font-extrabold tw:tracking-[-.01em] tw:text-cali-ink">{percentLabel(capacity.usagePercent)}</strong>
            <span className="tw:text-base tw:leading-[inherit] tw:text-cali-muted">da capacidade mensal</span>
          </p>
          <CapacityBar capacity={capacity} bare large />
          <div className="tw:grid tw:grid-cols-3 tw:gap-4 tw:[@media(max-width:40rem)]:grid-cols-1">
            <CapacityStat label="Contratadas" value={minutesLabel(capacity.contractedMinutes)} />
            <CapacityStat label="Utilizadas" value={minutesLabel(capacity.usedMinutes)} />
            <CapacityStat label="Excedentes" value={excess ? `+${minutesLabel(capacity.excessMinutes)}` : '0h'} note={excess ? `${percentLabel(capacity.excessPercent)} acima do contratado` : `Saldo do mês: ${minutesLabel(capacity.balanceMinutes)}`} excess={excess} />
          </div>
          {paused && <CapacityNotice tone="danger" title="Atividades pausadas até a renovação do mês." text="A capacidade deste mês passou do limite de tolerância. A CALI retoma as atividades no início do próximo mês e fala com você sobre as prioridades." foot={billingNote} />}
          {alert && <CapacityNotice {...alert} />}
        </>
      )}
    </section>
  );
}
