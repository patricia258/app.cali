import type { useGoogleCalendarEventDetails } from '../hooks/useGoogleCalendarEventDetails';

type Details = NonNullable<ReturnType<typeof useGoogleCalendarEventDetails>['data']>;

export function CalendarGoogleEventDetails({ event, account }: Details) {
  const sync = event.sync_status === 'synced' ? `sincronizado${account ? ` · ${account}` : ''}`
    : event.sync_status === 'error' ? 'erro de sincronização' : 'aguardando sincronização';
  const reminder = Number(event.reminder_minutes || 0) > 0 ? `${event.reminder_minutes} min antes` : 'sem lembrete';
  return (
    <div className="tw:mt-3.5 tw:flex tw:flex-wrap tw:gap-4.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-surface-soft tw:px-4 tw:py-3.5 tw:text-sm/[inherit] tw:text-cali-neutral-accent tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-sand-accent">
      <span><strong className={label}>Google</strong> · {sync}</span>
      <span><strong className={label}>Lembrete</strong> · {reminder}</span>
      {event.meeting_url && <span><strong className={label}>Meet</strong> · {event.auto_transcription ? 'transcrição automática' : 'transcrição manual'}</span>}
    </div>
  );
}

const label = 'tw:text-cali-brand tw:workspace-night:text-cali-red-soft';
