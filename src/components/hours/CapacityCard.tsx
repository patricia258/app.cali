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
      ? 'tw:border-[#eebcbc] tw:border-l-[#c0392b] tw:bg-[#fdf3f2] tw:text-[#b23b3b]'
      : 'tw:border-[#efd58b] tw:border-l-[#d9a514] tw:bg-[#fff9e8] tw:text-[#7a5606]'}`} role="status">
      <AlertTriangle size={18} className="tw:shrink-0" />
      <div>
        <strong className="tw:block tw:text-[1.08rem] tw:leading-[inherit] tw:text-cali-ink">{title}</strong>
        <p className="tw:m-0 tw:mt-[.3rem] tw:text-[1rem] tw:leading-normal tw:text-[#3d3531]">{text}</p>
        {foot && <small className="tw:mt-2 tw:block tw:text-[.846rem] tw:leading-[inherit] tw:text-[#8a7c74] tw:italic">{foot}</small>}
      </div>
    </div>
  );
}

function CapacityStat({ label, value, note, excess }: { label: string; value: string; note?: string; excess?: boolean }) {
  return (
    <div className={`tw:flex tw:flex-col tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:px-5 tw:py-4 ${excess ? 'tw:border-[#eebcbc] tw:bg-[#fdf1f1]' : 'tw:border-[#eadfd5] tw:bg-[#fdfaf7]'}`}>
      <span className="tw:text-[.885rem] tw:leading-[inherit] tw:text-[#7d726b]">{label}</span>
      <strong className={`tw:text-[1.54rem] tw:leading-[inherit] ${excess ? 'tw:text-[#b23b3b]' : 'tw:text-cali-ink'}`}>{value}</strong>
      {note && <small className="tw:text-[.846rem] tw:leading-[inherit] tw:text-[#8a7c74]">{note}</small>}
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
      ? 'tw:mb-[1.385rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4dc] tw:px-[.3rem] tw:pt-[1.69rem] tw:pb-[1.54rem]'
      : 'tw:mb-6 tw:rounded-2xl tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-7 tw:py-7'}`} aria-label="Horas do mês">
      <header><h2 className="tw:m-0 tw:text-[1.23rem] tw:leading-[inherit]">Horas do mês</h2></header>
      {capacity.level === 'none' ? <p className="tw:m-0 tw:text-[1rem] tw:leading-[inherit] tw:text-[#8a7c74]">Capacidade mensal ainda não definida no contrato.</p> : (
        <>
          <p className="tw:m-0 tw:flex tw:items-baseline tw:gap-3">
            <strong className="tw:text-[2.31rem] tw:leading-[inherit] tw:font-extrabold tw:tracking-[-.01em] tw:text-cali-ink">{percentLabel(capacity.usagePercent)}</strong>
            <span className="tw:text-[1rem] tw:leading-[inherit] tw:text-[#7d726b]">da capacidade mensal</span>
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
