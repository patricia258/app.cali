import { Input } from '../../../components/ds/Input';
import { Select } from '../../../components/ds/Select';
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

const filterLabel = 'tw:flex tw:flex-col tw:gap-1.5 tw:text-cali-micro tw:font-bold tw:text-cali-muted';
const filterControl = 'tw:h-10.5 tw:w-full tw:text-xs!';
const pending = { label: 'Sem registro', className: 'tw:bg-cali-gold-soft tw:text-cali-gold-text' };
const completed = { label: 'Realizada', className: 'tw:bg-cali-success-surface tw:text-cali-success' };
const missed = { label: 'Não realizada', className: 'tw:bg-cali-red-surface tw:text-cali-danger' };

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
          <span className="tw:text-cali-label tw:font-semibold tw:text-cali-muted">Ver encontros e transcrições</span>
        </div>
        <div className="tw:grid tw:grid-cols-3 tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-6 tw:py-4 tw:max-sm:grid-cols-1">
          <label className={filterLabel}>Período<Input variant="compact" className={`${filterControl} tw:min-h-10.5! tw:py-0!`} type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
          <label className={filterLabel}>Formato<Select variant="filter" className={`${filterControl} tw:min-h-10.5`} value={mode} onChange={event => setMode(event.target.value)}><option value="all">Todos</option><option value="remote">Online</option><option value="in_person">Presencial</option></Select></label>
          <label className={filterLabel}>Situação<Select variant="filter" className={`${filterControl} tw:min-h-10.5`} value={outcomeFilter} onChange={event => setOutcomeFilter(event.target.value)}><option value="all">Todas</option><option value="occurred">Realizada</option><option value="not_occurred">Não realizada</option><option value="cancelled">Cancelada</option><option value="pending">Sem registro</option></Select></label>
        </div>
        <div className="tw:flex tw:max-h-77.5 tw:flex-col tw:gap-2 tw:overflow-auto tw:px-6 tw:pt-4 tw:pb-5 tw:[scrollbar-width:none]">
          {history.length ? history.map(event => {
            const outcome = outcomes[event.id];
            const status = event.cancelledAt ? { ...missed, label: 'Cancelada' }
              : outcome?.outcome === 'occurred' ? completed : outcome?.outcome === 'not_occurred' ? missed : pending;
            return (
              <button type="button" key={event.id} onClick={() => onOpenEvent(event)}
                className="tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:justify-between tw:gap-3.5 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-left tw:hover:border-cali-line-strong tw:hover:bg-cali-paper tw:max-[43.75rem]:flex-wrap">
                <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
                  <strong className="tw:text-xs tw:text-cali-text">{event.title}</strong>
                  <small className="tw:text-cali-micro tw:text-cali-muted">{event.company || 'CALI'} · {formatCalendarDate(event.startsAt)} · {event.mode === 'in_person' ? 'Presencial' : 'Online'}</small>
                </span>
                <b className={`tw:shrink-0 tw:rounded-sm tw:px-2 tw:py-1 tw:text-cali-micro tw:font-bold tw:tracking-wide tw:whitespace-nowrap ${status.className}`}>{status.label}</b>
                {outcome?.transcription_url && <FileText size={16} aria-label="Transcrição disponível" />}
              </button>
            );
          }) : <p className="tw:text-cali-label tw:text-cali-muted">Nenhuma reunião encontrada com esses filtros.</p>}
        </div>
      </DialogFrame>
    </div>
  );
}
