import { SchedulingAction } from './SchedulingAction';
import { formatSlot, type SchedulingRequest } from './schedulingRequests';

export function VisitChanges({ rows, companyName, onDecision }: {
  rows: SchedulingRequest[];
  companyName: (request: SchedulingRequest) => string;
  onDecision: (request: SchedulingRequest) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="
      tw:mb-5.5 tw:overflow-hidden tw:rounded-3xl tw:border tw:border-solid
      tw:border-[color:color-mix(in_srgb,var(--cali-color-gold)_24%,var(--theme-line,#e5ddd7))]
      tw:bg-[color:var(--theme-surface,#fff)] tw:text-sm/[inherit] tw:text-cali-text tw:shadow-[0_0.75rem_2rem_#311f190b]
      tw:workspace-night:border-[#4b373e] tw:workspace-night:bg-[#241a1e] tw:workspace-night:text-[#f2e8ea]
    ">
      <header className="
        tw:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--cali-color-gold)_5%,var(--theme-surface,#fff)),color-mix(in_srgb,var(--cali-color-burgundy)_3%,var(--theme-surface,#fff)))]
        tw:px-5.5 tw:py-4.5 tw:workspace-night:bg-[linear-gradient(135deg,#b58c5214,#5a1e2d29)]
      ">
        <small className="tw:block tw:text-sm/[inherit] tw:font-black tw:tracking-[.13em] tw:text-cali-gold">ALTERAÇÕES DO CLIENTE</small>
        <h2 className="tw:mb-1 tw:text-[1.375rem]/[1.15]">Condições para avaliar</h2>
      </header>
      <div className="tw:px-5.5 tw:pb-2">
        {rows.map((request) => {
          const pending = request.extra_visit_cancellation_fee_cents == null;
          return (
            <article key={request.id} className="
              tw:grid tw:grid-cols-[minmax(0,1fr)_25.5rem] tw:gap-x-7 tw:gap-y-4.5 tw:border-0 tw:border-t
              tw:border-solid tw:border-cali-line tw:py-4 tw:first:border-t-0
              tw:[@media(max-width:56.25rem)]:grid-cols-1
            ">
              <div className="tw:[&_p]:m-0 tw:[&_p]:text-sm/[1.4] tw:[&_p]:text-[color:var(--theme-muted,#857870)] tw:[&_p+p]:mt-1">
                <strong>{companyName(request)} · {request.title}</strong>
                <p>{request.extra_visit_change_kind === 'cancel' ? 'Cancelamento' : 'Reagendamento'} · {request.extra_visit_previous_slot ? formatSlot(request.extra_visit_previous_slot) : 'data anterior não registrada'}</p>
                <p>Cliente: {request.extra_visit_change_reason}</p>
                <p>{pending ? 'Taxa aguardando sua decisão.' : request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 registrada.' : 'Sem taxa.'}</p>
              </div>
              <div className="tw:flex tw:items-start tw:justify-end tw:[@media(max-width:56.25rem)]:justify-start">
                <SchedulingAction size="body" onClick={() => onDecision(request)} className="tw:[@media(max-width:35rem)]:w-full">
                  {pending ? 'Avaliar taxa' : 'Rever decisão'}
                </SchedulingAction>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
