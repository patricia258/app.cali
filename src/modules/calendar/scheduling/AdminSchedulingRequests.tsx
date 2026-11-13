import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { signSchedulingAttachment } from '../../../api/calendar/requests';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { errorMessage } from '../../../lib/errorMessage';
import { AdminSchedulingDialog, type AdminSchedulingSelection } from './AdminSchedulingDialog';
import { AdminSchedulingRequestCard } from './AdminSchedulingRequestCard';
import { SchedulingAction } from './SchedulingAction';
import { SchedulingNotice } from './SchedulingNotice';
import { awaitsAdmin } from './schedulingRequests';
import { VisitChanges } from './VisitChanges';
import { useConfirmSchedulingRequest } from './useConfirmSchedulingRequest';
import { useSchedulingNotice } from './useSchedulingNotice';
import { useAdminSchedulingRequests } from './useAdminSchedulingRequests';

export function AdminSchedulingRequests() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AdminSchedulingSelection | null>(null);
  const [notice, setNotice] = useSchedulingNotice();
  const { data, error, enabled } = useAdminSchedulingRequests();

  function saved(message: string) {
    setNotice({ message });
    window.dispatchEvent(new Event('cali-calendar-record-updated'));
  }

  const accept = useConfirmSchedulingRequest(setNotice);

  async function openAttachment(path: string) {
    try {
      const result = await signSchedulingAttachment(path);
      if (result.error || !result.data?.signedUrl) throw result.error ?? new Error('Anexo indisponível.');
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (failure) {
      setNotice({ message: errorMessage(failure, 'Anexo indisponível.'), tone: 'error' });
    }
  }

  if (!enabled) return null;
  const active = data?.active ?? [];
  const pendingCount = active.filter(awaitsAdmin).length;
  const position = active.findIndex((request) => request.id === selectedId);
  const selected = active[position];
  const company = data?.companies.find((item) => item.id === selected?.company_id);
  const changes = data?.requests.filter((request) =>
    request.extra_visit && request.extra_visit_change_reason && ['cancelled', 'reschedule_review', 'confirmed', 'completed'].includes(request.status),
  ) ?? [];

  return (
    <>
      {error && <p role="alert" className="tw:my-3.5 tw:text-base/[inherit] tw:text-cali-danger">{errorMessage(error, 'Não foi possível carregar as solicitações de agenda.')}</p>}
      <VisitChanges rows={changes}
        companyName={(request) => data?.companies.find((item) => item.id === request.company_id)?.display_name ?? 'Cliente'}
        onDecision={(request) => setDialog({ kind: 'fee', request })}
      />
      {createPortal(
        <>
          {pendingCount > 0 && (
            <button type="button" aria-label="Solicitações de agenda" aria-haspopup="dialog" aria-expanded={Boolean(selected)}
              onClick={() => setSelectedId(active[0]?.id ?? null)}
              className="
                tw:fixed tw:right-7.5 tw:bottom-7.5 tw:z-10040 tw:flex tw:min-h-15 tw:cursor-pointer
                tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-solid tw:border-[#b98e55]
                tw:bg-cali-brand tw:px-4.5 tw:text-white tw:shadow-[0_1.25rem_3rem_#5a1e2d52] tw:transition-transform
                tw:hover:-translate-y-0.5 tw:motion-reduce:transition-none tw:[@media(max-width:35rem)]:right-3.5
                tw:[@media(max-width:35rem)]:bottom-3.5 tw:[@media(max-width:35rem)]:justify-center
                tw:[@media(max-width:35rem)]:px-2.5
              "
            >
              <span className="tw:grid tw:size-8.5 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-white/15"><Bell size={16} aria-hidden="true" /></span>
              <span className="tw:text-sm/[inherit] tw:[@media(max-width:35rem)]:hidden">Solicitações de agenda</span>
              <span className="tw:grid tw:h-6 tw:min-w-6 tw:place-items-center tw:rounded-full tw:bg-[#f0cf77] tw:px-1.5 tw:text-sm/[inherit] tw:font-black tw:text-cali-brand">{pendingCount}</span>
            </button>
          )}
          {selected && (
            <div onMouseDown={(event) => { if (event.target === event.currentTarget && !dialog) setSelectedId(null); }}
              className="tw:fixed tw:inset-0 tw:z-10045 tw:bg-[#18091085] tw:backdrop-blur-sm">
              <DialogFrame as="aside" aria-label="Pedidos de agenda" aria-hidden={Boolean(dialog)}
                className="
                  tw:fixed tw:right-7.5 tw:bottom-26.5 tw:z-10046 tw:flex tw:max-h-[min(62rem,calc(100dvh-8.5rem))]
                  tw:w-[min(40rem,calc(100vw-2.5rem))] tw:flex-col tw:overflow-hidden tw:rounded-3xl tw:border
                  tw:border-solid tw:border-cali-gold tw:bg-cali-surface tw:text-cali-text
                  tw:shadow-[0_2.125rem_7rem_#14080d52] tw:transition-[opacity,transform] tw:duration-[380ms]
                  tw:ease-[cubic-bezier(.18,.85,.24,1)] tw:starting:translate-y-11 tw:starting:scale-[.96]
                  tw:starting:opacity-0 tw:motion-reduce:transition-none tw:[@media(max-width:35rem)]:right-2.5
                  tw:[@media(max-width:35rem)]:bottom-22 tw:[@media(max-width:35rem)]:max-h-[calc(100dvh-6.769rem)]
                  tw:[@media(max-width:35rem)]:w-[calc(100vw-1.231rem)]
                "
              >
                <header className="tw:flex tw:items-start tw:justify-between tw:gap-3.5 tw:border-b tw:border-solid tw:border-cali-line tw:px-6 tw:pt-5 tw:pb-4">
                  <div>
                    <small className="tw:block tw:text-[0.6875rem] tw:font-black tw:tracking-[.13em] tw:text-cali-gold">AGENDA CALI</small>
                    <h2 className="tw:mt-1 tw:mb-0 tw:font-cali-body tw:text-2xl/[inherit]">Solicitações</h2>
                  </div>
                  <SchedulingAction aria-label="Fechar" onClick={() => setSelectedId(null)} className="tw:grid tw:size-10.5 tw:shrink-0 tw:place-items-center tw:p-0"><X size={16} aria-hidden="true" /></SchedulingAction>
                </header>
                <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto tw:px-5.5 tw:pb-3">
                  <AdminSchedulingRequestCard request={selected} companyName={company?.display_name ?? 'Cliente'} logo={company?.logo_url}
                    logoFallback={company?.logo_workspace_url}
                    requester={data?.names[selected.requested_by] ?? 'Cliente'}
                    attachments={data?.attachments.filter((item) => item.request_id === selected.id) ?? []}
                    busy={accept.isPending}
                    onSlot={(slotIndex) => accept.mutate({ request: selected, slotIndex })}
                    onCounter={() => setDialog({ kind: 'counter', request: selected })}
                    onDecline={() => setDialog({ kind: 'decline', request: selected })}
                    onQuote={() => setDialog({ kind: 'quote', request: selected })}
                    onAttachment={(path) => void openAttachment(path)}
                  />
                </div>
                {active.length > 1 && (
                  <footer className="
                    tw:flex tw:items-center tw:justify-center tw:gap-4.5 tw:border-t tw:border-solid
                    tw:border-cali-line tw:p-3 tw:text-sm/[inherit] tw:font-bold tw:text-cali-muted
                  ">
                    <SchedulingAction aria-label="Pedido anterior" onClick={() => setSelectedId(active[(position - 1 + active.length) % active.length].id)}>←</SchedulingAction>
                    <span>{position + 1} de {active.length}</span>
                    <SchedulingAction aria-label="Próximo pedido" onClick={() => setSelectedId(active[(position + 1) % active.length].id)}>→</SchedulingAction>
                  </footer>
                )}
              </DialogFrame>
            </div>
          )}
        </>,
        document.body,
      )}
      {dialog && <AdminSchedulingDialog selection={dialog} onClose={() => setDialog(null)} onSaved={saved} />}
      <SchedulingNotice notice={notice} />
    </>
  );
}
