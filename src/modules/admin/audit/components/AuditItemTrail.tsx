import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';

export function AuditItemTrail({ protocol, kind, facts, onBack }: {
  protocol: string;
  kind: string;
  facts: { label: string; value: string | number }[];
  onBack: () => void;
}) {
  return (
    <section className="tw:mt-5 tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-x-7.5 tw:gap-y-4.5 tw:rounded-xl tw:border tw:border-l-[0.308rem] tw:border-solid tw:border-cali-line tw:border-l-cali-brand tw:bg-cali-neutral-surface tw:px-6 tw:py-5.5 tw:max-[53.8125rem]:grid-cols-1">
      <div>
        <small className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[0.092rem] tw:text-cali-warning">TRILHA DO ITEM · {kind.toUpperCase()}</small>
        <h2 className="tw:my-1.5 tw:text-cali-title-sm/[inherit] tw:text-cali-text tw:[overflow-wrap:anywhere]">{protocol}</h2>
        <p className="tw:m-0 tw:text-cali-body/[1.55] tw:text-cali-muted">Tudo o que foi registrado sobre este item, do mais recente ao mais antigo. Os filtros acima ficam suspensos enquanto a trilha está aberta.</p>
      </div>
      <dl className="tw:col-span-full tw:m-0 tw:grid tw:grid-cols-[repeat(3,minmax(0,10.769rem))_minmax(0,1fr)] tw:gap-3 tw:max-[53.8125rem]:grid-cols-2">
        {facts.map(({ label, value }) => (
          <div className="tw:min-w-0 tw:rounded-cali-compact-control tw:bg-cali-surface-soft tw:px-3.5 tw:py-3" key={label}>
            <dt className="tw:mb-1 tw:text-xs/[inherit] tw:text-cali-muted">{label}</dt>
            <dd className="tw:m-0 tw:text-base/[inherit] tw:font-bold tw:text-cali-text tw:[overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
      <Button type="button" variant="workflowSecondary" className="tw:col-start-2 tw:row-start-1 tw:inline-flex tw:items-center tw:gap-2 tw:whitespace-nowrap tw:max-[53.8125rem]:col-start-1 tw:max-[53.8125rem]:row-auto tw:max-[53.8125rem]:justify-self-start" onClick={onBack}>
        <ArrowLeft size={14} /> Voltar para a lista
      </Button>
    </section>
  );
}
