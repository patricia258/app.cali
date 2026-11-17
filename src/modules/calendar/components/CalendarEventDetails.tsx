import { CalendarDays, Clock3, Download, ExternalLink, MapPin, Pencil, Users, Video, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { WorkspaceCompanyLogo } from '../../../components/workspace/WorkspaceCompanyLogo';
import { calendarTypeMeta, downloadCalendarIcs, formatCalendarDate, formatCalendarTime, googleCalendarTemplate, type WorkspaceCalendarEvent } from '../../../domain/calendar';
import { useGoogleCalendarEventDetails } from '../hooks/useGoogleCalendarEventDetails';
import { CalendarGoogleEventDetails } from './CalendarGoogleEventDetails';
import { CalendarMeetingRecord } from './CalendarMeetingRecord';
import { CalendarPersonalEvent, CalendarPersonalEventActions } from './CalendarPersonalEvent';
import { dialogBackdropClass, dialogBodyClass, dialogButtonClass, dialogCloseClass, dialogFooterClass, dialogHeaderClass, dialogKickerClass, dialogSurfaceClass, dialogTitleClass } from './calendarDialogStyles';

type Props = {
  event: WorkspaceCalendarEvent;
  outcome?: string;
  staff?: boolean;
  cancelling: boolean;
  cancelReason: string;
  onCancelReasonChange: (reason: string) => void;
  onStartCancel: () => void;
  onStopCancel: () => void;
  onConfirmCancel: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  saving: boolean;
  error: string;
};

const detailCard = 'tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-3.5 tw:py-3 tw:text-cali-label/[1.5] tw:text-cali-muted';
const cardTitle = 'tw:text-cali-label tw:font-bold tw:text-cali-text';
const cardCopy = 'tw:mt-1! tw:mb-0! tw:text-cali-label! tw:text-cali-muted';
const footerButton = `${dialogButtonClass} tw:[&>svg]:size-3.5 tw:[&>svg]:shrink-0 tw:min-[43.8125rem]:shrink-0 tw:min-[43.8125rem]:whitespace-nowrap`;
const attendeeState = {
  pending: { label: 'Pendente', dot: 'tw:bg-cali-sand-accent', badge: 'tw:bg-cali-surface-muted tw:text-cali-muted' },
  accepted: { label: 'Aceito', dot: 'tw:bg-cali-success', badge: 'tw:bg-cali-success-surface tw:text-cali-success' },
  declined: { label: 'Recusado', dot: 'tw:bg-cali-danger', badge: 'tw:bg-cali-red-surface tw:text-cali-danger' },
  tentative: { label: 'Talvez', dot: 'tw:bg-cali-gold-accent', badge: 'tw:bg-cali-warning-surface tw:text-cali-warning' },
};

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="tw:grid tw:min-w-0 tw:grid-cols-[auto_minmax(0,1fr)] tw:items-center tw:gap-2 tw:border-0 tw:border-r tw:border-solid tw:border-cali-line tw:px-3.5 tw:py-3 tw:last:border-r-0 tw:max-sm:border-r-0 tw:max-sm:border-b tw:max-sm:last:border-b-0">
      <span className="tw:text-cali-gold tw:[&>svg]:size-3.5">{icon}</span>
      <span className="tw:text-cali-micro tw:font-bold tw:tracking-widest tw:uppercase tw:text-cali-muted">{label}</span>
      <strong className="tw:col-span-full tw:text-xs/[1.35] tw:font-bold tw:wrap-anywhere tw:text-cali-text">{value}</strong>
    </article>
  );
}

function eventStatus(event: WorkspaceCalendarEvent, outcome: string | undefined, attendees: WorkspaceCalendarEvent['attendees']) {
  if (event.sourceType === 'request_preview') return 'Prévia em análise';
  if (event.sourceType === 'google') return 'Compromisso pessoal';
  if (event.cancelledAt) return 'Cancelado';
  if (outcome === 'occurred') return 'Realizado';
  if (outcome === 'not_occurred') return 'Não realizado';
  if (attendees.some(attendee => attendee.status === 'declined')) return 'Recusado';
  if (attendees.some(attendee => attendee.status === 'accepted')) return 'Confirmado';
  return 'Aguardando confirmação';
}

export function CalendarEventDetails(props: Props) {
  const { event, outcome, staff, cancelling, cancelReason, onCancelReasonChange, onStartCancel, onStopCancel, onConfirmCancel, onClose, onEdit, onDelete, saving, error } = props;
  const google = event.sourceType === 'google';
  const preview = event.sourceType === 'request_preview';
  const canEdit = !event.synthetic && !event.cancelledAt;
  const protocol = event.protocol || event.sourceProtocol;
  const { data: googleDetails } = useGoogleCalendarEventDetails(!staff && event.protocol && !event.synthetic ? event.id : undefined);
  const attendees = event.attendees.map<WorkspaceCalendarEvent['attendees'][number]>(attendee => {
    const status = googleDetails?.attendees.get(attendee.email.trim().toLowerCase());
    return status === 'accepted' || status === 'declined' || status === 'tentative' || status === 'pending' ? { ...attendee, status } : attendee;
  });
  const meetingUrl = googleDetails?.event.meeting_url || event.meetingUrl;
  const linkedCalendar = googleDetails?.event.google_html_link;
  const statusGradient = event.cancelledAt || outcome === 'not_occurred' || attendees.some(attendee => attendee.status === 'declined')
    ? 'tw:from-cali-red-surface tw:to-cali-sand-soft tw:workspace-night:from-cali-burgundy-accent tw:workspace-night:to-cali-red-inverse'
    : outcome === 'occurred' || attendees.some(attendee => attendee.status === 'accepted')
      ? 'tw:from-cali-green-surface tw:to-cali-sand-surface tw:workspace-night:from-cali-green-strong tw:workspace-night:to-cali-green-inverse'
      : 'tw:from-cali-orange-surface tw:to-cali-gold-surface tw:workspace-night:from-cali-gold-inverse tw:workspace-night:to-cali-gold-inverse';
  const title = preview ? 'SOLICITAÇÃO EXTRA' : google ? 'AGENDA GOOGLE' : calendarTypeMeta[event.type].label;

  return (
    <div className={dialogBackdropClass}>
      <DialogFrame aria-label={event.title} className={`${dialogSurfaceClass} tw:h-auto! tw:w-[min(42.5rem,100%)]! tw:max-w-190! tw:max-[43.75rem]:w-[calc(100vw-1.125rem)]! ${google ? 'tw:max-h-[min(82dvh,38.75rem)]! tw:max-[43.75rem]:max-h-[calc(100dvh-1.75rem)]!' : ''}`}>
        <Button type="button" variant="close" className={dialogCloseClass} onClick={onClose}><X size={20} /></Button>
                <div className={`${dialogHeaderClass} calendar-detail-heading tw:items-center tw:gap-3.5 ${statusGradient}`}>
          <div data-workspace-identity className="calendar-detail-company-mark tw:grid tw:size-11 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-md tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:text-xs tw:font-extrabold tw:text-cali-brand">
            {google ? <CalendarDays size={22} aria-hidden="true" /> : <WorkspaceCompanyLogo
              original={event.companyLogo}
              derived={event.companyLogoFallback}
              fallback={(event.company || 'C').slice(0, 1).toUpperCase()}
              className="tw:size-full tw:object-contain"
              alt=""
            />}
          </div>
          <div className="tw:min-w-0">
            <span className={`${dialogKickerClass} tw:workspace-night:text-cali-orange-soft!`}>{title} · {eventStatus(event, outcome, attendees)}</span>
            <h2 className={`${dialogTitleClass} tw:mt-1.5! tw:mb-0! tw:workspace-night:text-cali-gold-surface!`}>{event.title}</h2>
            <p className="tw:mt-1! tw:mb-0! tw:text-cali-label! tw:text-cali-muted tw:workspace-night:text-cali-gold-surface">{event.company || 'CALI'} · {event.visibility === 'client' ? 'visível para o cliente' : 'interno'}</p>
            {protocol && <span className="tw:mt-2 tw:inline-flex tw:rounded-sm tw:bg-cali-orange-surface tw:px-2 tw:py-1 tw:text-cali-micro tw:font-bold tw:tracking-wide tw:text-cali-warning">{event.synthetic ? 'Protocolo de origem' : 'Protocolo'} · {protocol}</span>}
          </div>
        </div>
        {google && <CalendarPersonalEventActions event={event} />}
        <div className={dialogBodyClass}>
          {preview ? (
            <div className={detailCard}>
              <strong className={cardTitle}>Opção {event.previewOption} · {formatCalendarDate(event.startsAt)} · {formatCalendarTime(event.startsAt)}–{formatCalendarTime(event.endsAt)}</strong>
              <p className={cardCopy}>Prévia de horário solicitado. Ainda não foi confirmada, não reserva a agenda e não entra na contagem dos compromissos.</p>
              {event.company && <p className={cardCopy}>Cliente: {event.company}</p>}
              {event.description && <p className={cardCopy}>Objetivo: {event.description}</p>}
            </div>
          ) : google ? <CalendarPersonalEvent event={event} /> : (
            <>
              <div className="tw:grid tw:grid-cols-3 tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:max-sm:grid-cols-1">
                <Fact icon={<Clock3 />} label="Quando" value={`${formatCalendarDate(event.startsAt)} · ${event.allDay ? 'Dia inteiro' : formatCalendarTime(event.startsAt)}`} />
                <Fact icon={event.mode === 'in_person' ? <MapPin /> : <Video />} label="Formato" value={event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' ? 'Remoto' : 'Prazo automático'} />
                <Fact icon={<Users />} label="Convidados" value={attendees.length ? `${attendees.length} convidado(s)` : event.visibility === 'client' ? 'Cliente relacionado' : 'Somente CALI'} />
              </div>
              {event.description && <section className={detailCard}><strong className={cardTitle}>Contexto</strong><p className={`${cardCopy} tw:max-h-24 tw:overflow-y-auto`}>{event.description}</p></section>}
              {event.synthetic && <div className={`${detailCard} tw:flex tw:items-center tw:gap-2.5`}>
                <CalendarDays size={16} className="tw:shrink-0 tw:text-cali-gold" />
                <div><strong className={cardTitle}>Prazo do entregável</strong><p className={cardCopy}>{event.company ? `${event.company} · ` : ''}{event.project ? `${event.project} · ` : ''}{event.title.replace(/ · prazo$/, '')}. A data vem do entregável de origem.</p></div>
              </div>}
              {attendees.length > 0 && <section className={`${detailCard} tw:max-h-39 tw:overflow-y-auto tw:pb-1.5`}>
                <strong className="tw:mb-1 tw:block tw:text-cali-micro tw:font-bold tw:tracking-widest tw:uppercase tw:text-cali-muted">Convidados</strong>
                {attendees.map((attendee, index) => {
                  const { label, dot, badge } = attendeeState[attendee.status];
                  return <div key={attendee.id ?? `${attendee.email}:${attendee.name}`}
                    className={`tw:grid tw:grid-cols-[0.5rem_minmax(0,1fr)_minmax(0,1.3fr)_auto] tw:items-center tw:gap-2.5 tw:border-0 tw:border-solid tw:border-cali-line tw:py-2.5 tw:max-[41.25rem]:grid-cols-[0.5rem_minmax(0,1fr)_auto] ${index > 0 ? 'tw:border-t' : ''}`}>
                    <span className={`tw:size-2 tw:rounded-full ${dot}`} />
                    <span className="tw:truncate tw:text-xs tw:font-bold tw:text-cali-text">{attendee.name}</span>
                    <small className="tw:truncate tw:text-cali-label tw:text-cali-muted tw:max-[41.25rem]:col-start-2 tw:max-[41.25rem]:col-end-4 tw:max-[41.25rem]:row-start-2">{attendee.email}</small>
                    <b className={`tw:rounded-sm tw:px-2 tw:py-1 tw:text-cali-micro tw:font-bold tw:tracking-wide tw:whitespace-nowrap ${badge}`}>{label}</b>
                  </div>;
                })}
              </section>}
              {cancelling && canEdit && <section className="tw:flex tw:flex-col tw:gap-2.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-danger-line tw:bg-cali-sand-surface tw:px-3.5 tw:py-3">
                <strong className={cardTitle}>Cancelar compromisso</strong>
                <p className={cardCopy}>O motivo fica registrado. Quando a régua de notificações estiver ativada, ele também poderá compor a comunicação aos participantes.</p>
                <textarea value={cancelReason} onChange={event => onCancelReasonChange(event.target.value)} rows={2} placeholder="Motivo do cancelamento" aria-label="Motivo do cancelamento"
                  className="tw:min-h-20 tw:w-full tw:resize-y tw:rounded-md tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3 tw:py-2.5 tw:text-xs tw:text-cali-text" />
                {error && <InlineNotice tone="danger">{error}</InlineNotice>}
                <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2">
                  <Button type="button" className={footerButton} variant="secondary" disabled={saving} onClick={onStopCancel}>Voltar</Button>
                  <Button type="button" className={`${footerButton} tw:[&.primary]:border-cali-danger! tw:[&.primary]:bg-cali-danger!`} variant="primary" disabled={saving || !cancelReason.trim()} onClick={onConfirmCancel}>Confirmar cancelamento</Button>
                </div>
              </section>}
            </>
          )}
          {!staff && isSupabaseConfigured && !event.synthetic && event.type === 'meeting' && event.protocol
            && <CalendarMeetingRecord key={event.id} protocol={event.protocol} />}
          {googleDetails && <CalendarGoogleEventDetails {...googleDetails} />}
        </div>
        {!preview && <div className={`${dialogFooterClass} tw:justify-between tw:min-[43.8125rem]:flex-nowrap tw:min-[43.8125rem]:justify-end tw:min-[43.8125rem]:overflow-x-auto`}>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:min-[43.8125rem]:contents">
            {canEdit && <Button type="button" className={footerButton} variant="secondary" onClick={onEdit}><Pencil />Editar ou remarcar</Button>}
            {meetingUrl && !event.cancelledAt && <Button type="button" className={footerButton} variant="primary" onClick={() => window.open(meetingUrl, '_blank', 'noopener,noreferrer')}><Video />Abrir Meet</Button>}
          </div>
          <div className="tw:ml-auto tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:min-[43.8125rem]:contents">
            {!google && <Button type="button" className={footerButton} variant="secondary" onClick={() => window.open(linkedCalendar || googleCalendarTemplate(event), '_blank', 'noopener,noreferrer')}><ExternalLink />{linkedCalendar ? 'Abrir no Google Agenda' : 'Google Agenda'}</Button>}
            <Button type="button" className={footerButton} variant="secondary" onClick={() => downloadCalendarIcs(event)}><Download />ICS</Button>
            {canEdit && !cancelling && <Button type="button" className={`${footerButton} tw:[&.secondary]:border-cali-danger-line! tw:[&.secondary]:text-cali-danger!`} variant="secondary" onClick={onStartCancel}>Cancelar</Button>}
            {googleDetails && <Button type="button" className={`${footerButton} tw:[&.secondary]:border-cali-danger-line! tw:[&.secondary]:text-cali-danger!`} variant="secondary" onClick={onDelete}>Excluir evento</Button>}
          </div>
        </div>}
      </DialogFrame>
    </div>
  );
}
