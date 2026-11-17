import { useState } from 'react';
import { useHighlightedSchedulingRequest } from './useHighlightedSchedulingRequest';
import { errorMessage } from '../../../lib/errorMessage';
import { ClientSchedulingRequestCard } from './ClientSchedulingRequestCard';
import { ClientSchedulingDialog, type ClientSchedulingSelection } from './ClientSchedulingDialog';
import { SchedulingNotice } from './SchedulingNotice';
import { useAcceptSchedulingProposal } from './useAcceptSchedulingProposal';
import { useSchedulingNotice } from './useSchedulingNotice';
import { useClientSchedulingRequests } from './useClientSchedulingRequests';
import { requiresAcknowledgement } from './schedulingRequests';

export function ClientSchedulingRequests() {
  const highlighted = useHighlightedSchedulingRequest();
  const [dialog, setDialog] = useState<ClientSchedulingSelection | null>(null);
  const [notice, setNotice] = useSchedulingNotice();
  const { data, error, enabled } = useClientSchedulingRequests();

  const accept = useAcceptSchedulingProposal(setNotice);

  const actionable = data?.requests.filter((request) =>
    request.status === 'client_review'
    || (['submitted', 'reschedule_review'].includes(request.status)
      && request.online_extra_requested && request.online_extra_quote_cents && !request.online_extra_quote_accepted_at),
  ) ?? [];

  if (!enabled) return null;
  return (
    <>
      {error && <p role="alert" className="tw:my-3.5 tw:text-base/[inherit] tw:text-cali-danger">{errorMessage(error, 'Não foi possível carregar as solicitações de agenda.')}</p>}
      {actionable.length > 0 && (
        <section id="scheduling-v65-client-host" className="
          tw:my-3.5 tw:overflow-hidden tw:rounded-2xl tw:border tw:border-l-[0.25rem] tw:border-solid
          tw:border-cali-gold-line tw:border-l-cali-gold tw:bg-[color:var(--theme-surface,var(--cali-color-neutral-surface))]
          tw:workspace-night:border-cali-gold-text tw:workspace-night:text-cali-red-surface tw:workspace-night:border-l-cali-orange-line
          tw:workspace-night:bg-[linear-gradient(135deg,var(--cali-color-gold-inverse),var(--cali-color-gold-inverse))]
        ">
          <header className="tw:border-0 tw:border-b tw:border-solid tw:border-cali-brand/10 tw:px-5 tw:py-4">
            <small className="tw:block tw:text-sm/[inherit] tw:font-black tw:tracking-[.13em] tw:text-cali-gold">AGENDA</small>
            <h2 className="tw:mb-1 tw:text-cali-title-sm/[1.15] tw:text-cali-text">
              {actionable.some((request) => request.status === 'client_review') ? 'A Paty enviou novas datas' : 'Orçamento para sua reunião online'}
            </h2>
          </header>
          <div className="tw:grid tw:border-0 tw:border-t tw:border-solid tw:border-cali-brand/10 tw:workspace-night:border-cali-orange-line/18 tw:px-5 tw:pt-3 tw:pb-5">
            {data && actionable.map((request) => {
              const needsAck = request.status === 'client_review' && requiresAcknowledgement(request, data);
              return (
                <ClientSchedulingRequestCard
                  key={request.id}
                  request={request}
                  highlighted={highlighted === request.id}
                  needsAck={needsAck}
                  busy={accept.isPending}
                  onAccept={(index, acknowledged) => accept.mutate({ request, index, needsAck, acknowledged })}
                  onQuote={() => setDialog({ kind: 'quote', request })}
                  onMore={() => setDialog({ kind: request.extra_visit ? 'extra-options' : 'options', request })}
                />
              );
            })}
          </div>
        </section>
      )}
      {dialog && (
        <ClientSchedulingDialog
          selection={dialog}
          onClose={() => setDialog(null)}
          onSaved={(message) => setNotice({ message })}
        />
      )}
      <SchedulingNotice notice={notice} />
    </>
  );
}
