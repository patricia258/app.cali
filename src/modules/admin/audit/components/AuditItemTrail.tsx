import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';

export function AuditItemTrail({ protocol, kind, facts, onBack }: {
  protocol: string;
  kind: string;
  facts: { label: string; value: string | number }[];
  onBack: () => void;
}) {
  return (
    <section className="tw:mt-[1.231rem] tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-x-[1.846rem] tw:gap-y-[1.077rem] tw:rounded-[0.769rem] tw:border tw:border-l-[0.308rem] tw:border-solid tw:border-[#e9dfd8] tw:border-l-cali-brand tw:bg-white tw:px-[1.538rem] tw:py-[1.385rem] tw:max-[53.8125rem]:grid-cols-1">
      <div>
        <small className="tw:text-[0.769rem]/[inherit] tw:font-extrabold tw:tracking-[0.092rem] tw:text-[#af8f72]">TRILHA DO ITEM · {kind.toUpperCase()}</small>
        <h2 className="tw:my-[0.385rem] tw:text-[1.385rem]/[inherit] tw:text-[#322f2c] tw:[overflow-wrap:anywhere]">{protocol}</h2>
        <p className="tw:m-0 tw:text-[0.923rem]/[1.55] tw:text-[#8c7e74]">Tudo o que foi registrado sobre este item, do mais recente ao mais antigo. Os filtros acima ficam suspensos enquanto a trilha está aberta.</p>
      </div>
      <dl className="tw:col-span-full tw:m-0 tw:grid tw:grid-cols-[repeat(3,minmax(0,10.769rem))_minmax(0,1fr)] tw:gap-[0.769rem] tw:max-[53.8125rem]:grid-cols-2">
        {facts.map(({ label, value }) => (
          <div className="tw:min-w-0 tw:rounded-[0.615rem] tw:bg-[#faf6f2] tw:px-[0.923rem] tw:py-[0.769rem]" key={label}>
            <dt className="tw:mb-[0.308rem] tw:text-[0.769rem]/[inherit] tw:text-[#8c7e74]">{label}</dt>
            <dd className="tw:m-0 tw:text-base/[inherit] tw:font-bold tw:text-[#322f2c] tw:[overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
      <Button type="button" variant="workflowSecondary" className="tw:col-start-2 tw:row-start-1 tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:whitespace-nowrap tw:max-[53.8125rem]:col-start-1 tw:max-[53.8125rem]:row-auto tw:max-[53.8125rem]:justify-self-start" onClick={onBack}>
        <ArrowLeft size={14} /> Voltar para a lista
      </Button>
    </section>
  );
}
