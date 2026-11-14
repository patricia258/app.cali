import type { ReactNode } from 'react';
import { WorkspaceCompanyLogo } from '../../../components/workspace/WorkspaceCompanyLogo';
import { SchedulingAction } from './SchedulingAction';
import { awaitsAdmin, formatPrice, formatSlot, type RequestAttachment, type SchedulingRequest } from './schedulingRequests';

const statusLabels: Record<string, string> = {
  submitted: 'Em análise pela CALI',
  client_review: 'Sua confirmação',
  reschedule_review: 'Reagendamento em análise',
};

function RequestDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tw:mt-3.5 tw:grid tw:gap-1">
      <span className="tw:text-xs/[inherit] tw:font-[850] tw:tracking-[.09em] tw:text-[#946a38] tw:uppercase">{label}</span>
      {children}
    </div>
  );
}

function DetailText({ children }: { children: ReactNode }) {
  return <p className="tw:m-0 tw:text-base/[1.5] tw:text-cali-text">{children}</p>;
}

function RequestCondition({ children }: { children: ReactNode }) {
  return <div className="
    tw:my-3.5 tw:rounded-xl tw:bg-[#fff4da] tw:px-3.5 tw:py-3 tw:text-sm/[inherit] tw:font-[750]
    tw:text-cali-brand tw:workspace-night:bg-[#443025] tw:workspace-night:text-[#f0d89f]
  ">{children}</div>;
}

export function AdminSchedulingRequestCard({ request, companyName, logo, logoFallback, requester, attachments, busy, onSlot, onCounter, onDecline, onQuote, onAttachment }: {
  request: SchedulingRequest;
  companyName: string;
  logo?: string | null;
  logoFallback?: string | null;
  requester: string;
  attachments: RequestAttachment[];
  busy: boolean;
  onSlot: (index: number) => void;
  onCounter: () => void;
  onDecline: () => void;
  onQuote: () => void;
  onAttachment: (path: string) => void;
}) {
  return (
    <article className="
      tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface
      tw:text-cali-text tw:workspace-night:border-[#62494b] tw:workspace-night:bg-[#291e22]
    ">
      <div className="
        tw:flex tw:min-h-29 tw:items-end tw:justify-between tw:gap-3
        tw:bg-[linear-gradient(120deg,#5a1e2d,#9a6b51_68%,#d2a85f)] tw:px-4.5 tw:py-3.5
      ">
        <div className="
          tw:grid tw:size-19 tw:place-items-center tw:overflow-hidden tw:rounded-2xl tw:border-2 tw:border-solid
          tw:border-[#f5e9d1] tw:bg-white tw:font-bold tw:text-cali-brand
        ">
          <WorkspaceCompanyLogo original={logo} derived={logoFallback} alt={`Logo de ${companyName}`} fallback={<span>CALI</span>} className="tw:size-full tw:object-cover" />
        </div>
        <span className="
          tw:inline-flex tw:min-h-7 tw:items-center tw:rounded-full tw:border tw:border-solid tw:border-[#ead5aa]
          tw:bg-[#fff9ee] tw:px-2 tw:text-[0.625rem] tw:font-black tw:tracking-[.03em] tw:text-cali-brand
        ">
          {statusLabels[request.status] ?? request.status}
        </span>
      </div>
      <div className="tw:p-5">
        <small className="tw:text-xs/[inherit] tw:font-[850] tw:tracking-[.12em] tw:text-[#9b6d3a] tw:uppercase">{companyName}</small>
        <h3 className="tw:mt-1.5 tw:mb-3 tw:font-cali-body tw:text-2xl/[1.2] tw:text-cali-text">{request.title}</h3>
        <p className="tw:text-sm/[inherit] tw:text-cali-muted">Solicitado por <strong>{requester}</strong></p>
        {request.extra_visit && <RequestCondition>Visita extra · R$ 800,00 por até 4h · despesas à parte</RequestCondition>}
        {request.online_extra_requested && (
          <>
            <RequestCondition>
              Reunião online extra · {request.online_extra_quote_cents ? formatPrice(request.online_extra_quote_cents) : 'orçamento pendente'} · {request.online_extra_quote_accepted_at ? 'cliente aprovou' : 'aguardando aceite'}
            </RequestCondition>
            <SchedulingAction onClick={onQuote} disabled={busy}>Informar orçamento</SchedulingAction>
          </>
        )}
        {request.purpose && <RequestDetail label="Objetivo"><DetailText>{request.purpose}</DetailText></RequestDetail>}
        {request.location && (
          <RequestDetail label="Local">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}`} target="_blank" rel="noopener noreferrer" className="tw:w-fit tw:text-sm/[inherit] tw:font-bold tw:break-all tw:text-[#71314a] tw:underline tw:workspace-night:text-[#eed19a]">
              {request.location} ↗
            </a>
          </RequestDetail>
        )}
        {attachments.length > 0 && (
          <RequestDetail label="Anexo">
            {attachments.map((attachment) => (
              <button
                key={attachment.storage_path}
                type="button"
                onClick={() => onAttachment(attachment.storage_path)}
                className="
                  tw:w-fit tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-sm/[inherit]
                  tw:font-bold tw:break-all tw:text-[#71314a] tw:underline tw:workspace-night:text-[#eed19a]
                "
              >{attachment.file_name} ↗</button>
            ))}
          </RequestDetail>
        )}
        {request.client_note && <RequestDetail label="Mensagem do cliente"><DetailText>{request.client_note}</DetailText></RequestDetail>}
        {request.status === 'client_review' && (
          <RequestDetail label="Opções enviadas"><DetailText>{request.admin_proposed_slots?.map(formatSlot).join(' · ')}</DetailText></RequestDetail>
        )}
        {awaitsAdmin(request) ? (
          <>
            <div className="tw:mt-5.5 tw:grid tw:gap-2">
              <span className="tw:text-xs/[inherit] tw:font-[850] tw:tracking-[.09em] tw:text-[#946a38] tw:uppercase">Escolha uma das datas</span>
              {(request.requested_slots ?? []).map((slot, index) => (
                <SchedulingAction key={slot.startsAt} tone="primary" disabled={busy} onClick={() => onSlot(index)} className="tw:text-sm/[inherit] tw:font-[850]">
                  Confirmar · {formatSlot(slot)}
                </SchedulingAction>
              ))}
            </div>
            <div className="tw:mt-2.5 tw:flex tw:gap-2.5 tw:[@media(max-width:35rem)]:flex-col">
              <SchedulingAction disabled={busy} onClick={onCounter} className="tw:flex-1 tw:text-xs/[inherit] tw:font-[850]">Sugerir datas</SchedulingAction>
              <SchedulingAction tone="danger" disabled={busy} onClick={onDecline} className="tw:flex-1 tw:text-xs/[inherit] tw:font-[850]">Recusar</SchedulingAction>
            </div>
          </>
        ) : <RequestCondition>Aguardando resposta do cliente.</RequestCondition>}
      </div>
    </article>
  );
}
