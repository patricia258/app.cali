import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SchedulingAction } from './SchedulingAction';
import { formatPrice, formatSlot, type SchedulingRequest } from './schedulingRequests';

function ClientNote({ children }: { children: ReactNode }) {
  return (
    <div className="
      tw:mt-2.5 tw:rounded-r-xl tw:border-0 tw:border-l-2 tw:border-solid tw:border-l-cali-gold
      tw:bg-[color-mix(in_srgb,var(--cali-color-gold)_6%,var(--theme-surface,#fff))] tw:px-3 tw:py-3
      tw:text-sm/[1.4] tw:text-[color:var(--theme-muted,#857870)] tw:workspace-night:bg-[#2b231f]
    ">
      {children}
    </div>
  );
}

export function ClientSchedulingRequestCard({ request, highlighted, needsAck, onAccept, onQuote, onMore, busy }: {
  request: SchedulingRequest;
  highlighted: boolean;
  needsAck: boolean;
  onAccept: (index: number, acknowledged: boolean) => void;
  onQuote: () => void;
  onMore: () => void;
  busy: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const proposal = request.status === 'client_review';

  useEffect(() => {
    if (!highlighted) return;
    const element = card.current;
    element?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center',
    });
    element?.focus({ preventScroll: true });
  }, [highlighted]);

  return (
    <article
      ref={card}
      tabIndex={highlighted ? -1 : undefined}
      className="
        tw:grid tw:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] tw:gap-x-5.5 tw:gap-y-3.5 tw:pt-2.5 tw:pb-0.5
        tw:max-md:grid-cols-1
      "
    >
      <div className="tw:min-w-0">
        <strong className="tw:mb-1.5 tw:block tw:text-lg/[inherit]">{request.title}</strong>
        {request.purpose && <p className="tw:m-0 tw:text-sm/[1.45] tw:text-[color:var(--theme-muted,#857870)]">{request.purpose}</p>}
        {request.location && request.request_mode === 'in_person' && (
          <p className="tw:m-0 tw:text-sm/[1.45] tw:text-[color:var(--theme-muted,#857870)] tw:[&:not(:first-child)]:mt-1 tw:workspace-night:mt-0"><strong>Endereço:</strong> {request.location}</p>
        )}
        {proposal && (
          <>
            <ClientNote><strong>Sua proposta inicial não encaixou.</strong> Escolha uma das novas datas abaixo ou peça outras opções. Vamos encontrar um horário.</ClientNote>
            {request.admin_note && <ClientNote><strong>Mensagem da Paty:</strong> {request.admin_note}</ClientNote>}
            {needsAck && (
              <label className="tw:mt-3 tw:flex tw:items-start tw:gap-2.5 tw:text-sm/[1.4]">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.currentTarget.checked)}
                  className="tw:mt-0.5 tw:accent-cali-brand"
                />
                <span>{request.extra_visit ? 'Li e estou ciente das condições da visita adicional.' : 'Li e estou ciente da condição adicional informada pela CALI para este encontro.'}</span>
              </label>
            )}
          </>
        )}
        {request.online_extra_requested && (
          <ClientNote>
            {request.online_extra_quote_cents ? (
              <>
                <strong>Orçamento da reunião extra: {formatPrice(request.online_extra_quote_cents)}</strong>
                {request.billing_notice && <p className="tw:m-0 tw:text-sm/[1.45] tw:text-[color:var(--theme-muted,#857870)]">{request.billing_notice}</p>}
                {request.online_extra_quote_accepted_at ? <span>Aceito por você.</span> : (
                  <SchedulingAction tone="primary" size="body" disabled={busy} onClick={onQuote} className="tw:px-4.5 tw:py-3 tw:font-semibold">
                    Aceitar orçamento
                  </SchedulingAction>
                )}
              </>
            ) : <strong>Orçamento em preparo pela CALI. Nenhuma cobrança foi feita.</strong>}
          </ClientNote>
        )}
      </div>
      {proposal && (
        <div className="tw:flex tw:max-w-80 tw:flex-col tw:items-stretch tw:gap-2 tw:max-md:max-w-none">
          {(request.admin_proposed_slots ?? []).map((slot, index) => (
            <SchedulingAction
              key={slot.startsAt}
              tone="primary"
              size="compact"
              disabled={busy}
              onClick={() => onAccept(index, acknowledged)}
              className="tw:min-h-11.5 tw:w-full tw:px-4.5 tw:py-3 tw:text-center tw:whitespace-normal"
            >
              Aceitar {formatSlot(slot)}
            </SchedulingAction>
          ))}
          <SchedulingAction size="compact" disabled={busy} onClick={onMore} className="tw:min-h-11.5 tw:w-full tw:text-center tw:whitespace-normal">
            Pedir outras opções
          </SchedulingAction>
        </div>
      )}
    </article>
  );
}
