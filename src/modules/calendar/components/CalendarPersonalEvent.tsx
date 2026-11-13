import { CalendarDays, Clock3, ExternalLink, FileText, Mail, MapPin, Pencil, Users, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCalendarDate, formatCalendarTime, googleCalendarTemplate, type WorkspaceCalendarEvent } from '../../../domain/calendar';
import { dialogButtonClass } from './calendarDialogStyles';

const guestStatus = { accepted: 'aceitou', declined: 'recusou', tentative: 'talvez', pending: 'aguardando' };
const detailDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const actionClass = `${dialogButtonClass} tw:whitespace-nowrap tw:[&>svg]:size-4`;
const externalLinkClass = 'tw:inline-flex tw:items-center tw:gap-1 tw:font-bold tw:text-cali-brand';

function DetailLine({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="tw:flex tw:items-start tw:gap-2.5 tw:border-0 tw:border-b tw:border-solid tw:border-[#f1e9e2] tw:py-2.5 tw:last:border-b-0">
      <span className="tw:mt-px tw:shrink-0 tw:text-cali-gold tw:[&>svg]:size-4">{icon}</span>
      <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5 tw:text-[0.6875rem] tw:wrap-anywhere tw:text-[#857870]">
        <strong className="tw:text-xs tw:text-[#322f2c]">{title}</strong>{children}
      </span>
    </div>
  );
}

export function CalendarPersonalEventActions({ event }: { event: WorkspaceCalendarEvent }) {
  const calendarUrl = event.googleHtmlLink || googleCalendarTemplate(event);
  const body = `${event.title}\n${formatCalendarDate(event.startsAt)} · ${formatCalendarTime(event.startsAt)}${event.endsAt ? `–${formatCalendarTime(event.endsAt)}` : ''}\n${event.googleHtmlLink || ''}`;
  return (
    <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-[#f1e9e2] tw:bg-white tw:px-6 tw:py-3.5">
      <button type="button" className={actionClass} title="Editar no Google Agenda" onClick={() => window.open(calendarUrl, '_blank', 'noopener,noreferrer')}><Pencil /> Editar no Google</button>
      <button type="button" className={actionClass} title="Compartilhar por e-mail" onClick={() => window.location.assign(`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(body)}`)}><Mail /> Enviar por e-mail</button>
      <button type="button" className={actionClass} title="Abrir mais opções no Google Agenda" onClick={() => window.open(calendarUrl, '_blank', 'noopener,noreferrer')}><ExternalLink /> Abrir no Google Agenda</button>
    </div>
  );
}

export function CalendarPersonalEvent({ event }: { event: WorkspaceCalendarEvent }) {
  return (
    <section className="tw:flex tw:flex-col tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-3.5">
      <DetailLine icon={<Clock3 />} title={detailDate.format(new Date(event.startsAt))}>
        <span>{event.allDay ? 'Dia inteiro' : `${formatCalendarTime(event.startsAt)} – ${formatCalendarTime(event.endsAt)}`}</span>
      </DetailLine>
      {event.meetingUrl && <DetailLine icon={<Video />} title="Google Meet">
        <a className={externalLinkClass} href={event.meetingUrl} target="_blank" rel="noopener noreferrer">Entrar na reunião <ExternalLink size={13} /></a>
      </DetailLine>}
      {event.description && <DetailLine icon={<FileText />} title="Anotações"><span>{event.description}</span></DetailLine>}
      {event.location && <DetailLine icon={<MapPin />} title="Local">
        <a className={externalLinkClass} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer">{event.location} <ExternalLink size={13} /></a>
      </DetailLine>}
      {event.attendees.length > 0 && <DetailLine icon={<Users />} title="Convidados">
        <span>{event.attendees.map(guest => `${guest.name} · ${guestStatus[guest.status]}`).join(' · ')}</span>
      </DetailLine>}
      <DetailLine icon={<CalendarDays />} title="Agenda Google"><span>{event.organizer || 'Patrícia Lima'}</span></DetailLine>
      {event.reminderMinutes != null && <DetailLine icon={<Clock3 />} title="Lembrete"><span>{event.reminderMinutes} minutos antes</span></DetailLine>}
    </section>
  );
}
