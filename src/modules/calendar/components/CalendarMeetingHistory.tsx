import './calendar-dialog-motion.css';
import { FileText, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { calendarDateKey, formatCalendarDate, type WorkspaceCalendarEvent } from '../../../domain/calendar';
import type { MeetingOutcome } from '../adminCalendarData';
import { dialogBackdropClass, dialogCloseClass, dialogHeaderClass, dialogKickerClass, dialogSurfaceClass, dialogTitleClass } from './calendarDialogStyles';

type Props = {
  openedAt: number | null;
  companyId: string;
  events: WorkspaceCalendarEvent[];
  outcomes: Record<string, MeetingOutcome>;
  onClose: () => void;
  onOpenEvent: (event: WorkspaceCalendarEvent) => void;
};

const filterLabel = 'tw:flex tw:flex-col tw:gap-1.5 tw:text-[0.625rem] tw:font-bold tw:text-[#67574c]';
const filterInput = 'tw:h-[2.375rem] tw:min-h-[2.625rem] tw:w-full tw:rounded-md tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-2.5 tw:text-xs tw:font-normal tw:text-[#322f2c]';
const pending = { label: 'Sem registro', className: 'tw:bg-[#f8efcf] tw:text-[#79571a]' };
const completed = { label: 'Realizada', className: 'tw:bg-[#e6f6ec] tw:text-[#31805a]' };
const missed = { label: 'Não realizada', className: 'tw:bg-[#fbe9ec] tw:text-[#b7495d]' };

export function CalendarMeetingHistory({ openedAt, companyId, events, outcomes, onClose, onOpenEvent }: Props) {
  const [month, setMonth] = useState('');
  const [mode, setMode] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const history = useMemo(() => {
    if (openedAt == null) return [];
    return events.filter(event => event.sourceType !== 'request_preview' && event.type === 'meeting' && (event.cancelledAt || new Date(event.startsAt).getTime() < openedAt))
      .filter(event => companyId === 'all' || event.companyId === companyId)
      .filter(event => !month || calendarDateKey(event.startsAt).slice(0, 7) === month)
      .filter(event => mode === 'all' || event.mode === mode)
      .filter(event => {
        const outcome = outcomes[event.id]?.outcome;
        if (outcomeFilter === 'all') return true;
        if (outcomeFilter === 'cancelled') return Boolean(event.cancelledAt);
        if (outcomeFilter === 'pending') return !event.cancelledAt && !outcome;
        return outcome === outcomeFilter;
      })
      .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
      .slice(0, 30);
  }, [companyId, events, mode, month, outcomeFilter, outcomes, openedAt]);
  if (openedAt == null) return null;

  return (
    <div className={dialogBackdropClass} onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <DialogFrame aria-label="Histórico de reuniões" className={`${dialogSurfaceClass} tw:w-[min(47.5rem,100%)]! tw:motion-safe:animate-[calendarDialogRise_0.3s_ease_both]`}>
        <Button type="button" variant="close" className={dialogCloseClass} aria-label="Fechar histórico" onClick={onClose}><X size={20} /></Button>
        <div className={`${dialogHeaderClass} tw:flex-col tw:gap-1.5`}>
          <span className={dialogKickerClass}>AGENDA REALIZADA</span>
          <strong className={dialogTitleClass}>Histórico de reuniões</strong>
          <span className="tw:text-[0.6875rem] tw:font-semibold tw:text-[#857870]">Ver encontros e transcrições</span>
        </div>
        <div className="tw:grid tw:grid-cols-3 tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[#f1e9e2] tw:px-6 tw:py-4 tw:max-sm:grid-cols-1">
          <label className={filterLabel}>Período<input className={filterInput} type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
          <label className={filterLabel}>Formato<select className={filterInput} value={mode} onChange={event => setMode(event.target.value)}><option value="all">Todos</option><option value="remote">Online</option><option value="in_person">Presencial</option></select></label>
          <label className={filterLabel}>Situação<select className={filterInput} value={outcomeFilter} onChange={event => setOutcomeFilter(event.target.value)}><option value="all">Todas</option><option value="occurred">Realizada</option><option value="not_occurred">Não realizada</option><option value="cancelled">Cancelada</option><option value="pending">Sem registro</option></select></label>
        </div>
        <div className="tw:flex tw:max-h-[19.375rem] tw:flex-col tw:gap-2 tw:overflow-auto tw:px-6 tw:pt-4 tw:pb-5 tw:[scrollbar-width:none]">
          {history.length ? history.map(event => {
            const outcome = outcomes[event.id];
            const status = event.cancelledAt ? { ...missed, label: 'Cancelada' }
              : outcome?.outcome === 'occurred' ? completed : outcome?.outcome === 'not_occurred' ? missed : pending;
            return (
              <button type="button" key={event.id} onClick={() => onOpenEvent(event)}
                className="tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:justify-between tw:gap-3.5 tw:rounded-lg tw:border tw:border-solid tw:border-[#efe7df] tw:bg-white tw:px-3.5 tw:py-3 tw:text-left tw:hover:border-[#dec9c3] tw:hover:bg-[#fffdfb] tw:max-[43.75rem]:flex-wrap">
                <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
                  <strong className="tw:text-xs tw:text-[#322f2c]">{event.title}</strong>
                  <small className="tw:text-[0.625rem] tw:text-[#857870]">{event.company || 'CALI'} · {formatCalendarDate(event.startsAt)} · {event.mode === 'in_person' ? 'Presencial' : 'Online'}</small>
                </span>
                <b className={`tw:shrink-0 tw:rounded-sm tw:px-2 tw:py-1 tw:text-[0.5625rem] tw:font-bold tw:tracking-wide tw:whitespace-nowrap ${status.className}`}>{status.label}</b>
                {outcome?.transcription_url && <FileText size={16} aria-label="Transcrição disponível" />}
              </button>
            );
          }) : <p className="tw:text-[0.6875rem] tw:text-[#857870]">Nenhuma reunião encontrada com esses filtros.</p>}
        </div>
      </DialogFrame>
    </div>
  );
}
