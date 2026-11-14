import type { useGoogleCalendarEventDetails } from '../hooks/useGoogleCalendarEventDetails';

type Details = NonNullable<ReturnType<typeof useGoogleCalendarEventDetails>['data']>;

export function CalendarGoogleEventDetails({ event, account }: Details) {
  const sync = event.sync_status === 'synced' ? `sincronizado${account ? ` · ${account}` : ''}`
    : event.sync_status === 'error' ? 'erro de sincronização' : 'aguardando sincronização';
  const reminder = Number(event.reminder_minutes || 0) > 0 ? `${event.reminder_minutes} min antes` : 'sem lembrete';
  return (
    <div className="tw:mt-3.5 tw:flex tw:flex-wrap tw:gap-4.5 tw:rounded-2xl tw:border tw:border-solid tw:border-[#eadfd9] tw:bg-[#fbf8f5] tw:px-4 tw:py-3.5 tw:text-sm/[inherit] tw:text-[#6f6266] tw:workspace-night:border-[#5b444b] tw:workspace-night:bg-[#281d20] tw:workspace-night:text-[#c8b8bc]">
      <span><strong className={label}>Google</strong> · {sync}</span>
      <span><strong className={label}>Lembrete</strong> · {reminder}</span>
      {event.meeting_url && <span><strong className={label}>Meet</strong> · {event.auto_transcription ? 'transcrição automática' : 'transcrição manual'}</span>}
    </div>
  );
}

const label = 'tw:text-cali-brand tw:workspace-night:text-[#f3d2dc]';
