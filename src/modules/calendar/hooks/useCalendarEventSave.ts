import { useMutation } from '@tanstack/react-query';
import { saveCalendarEvent } from '../../../api/calendar/admin';
import { runSchedulingCommand } from '../../../api/calendar/requests';
import type { MeetingClassification } from '../components/CalendarMeetingClassification';

export function useCalendarEventSave() {
  return useMutation({
    mutationFn: async ({ event, attendees, eventId, classification }: {
      event: Parameters<typeof saveCalendarEvent>[0];
      attendees: string[];
      eventId?: string;
      classification?: MeetingClassification;
    }) => {
      const savedId = await saveCalendarEvent(event, attendees, eventId);
      if (!classification) return { savedId, classificationPending: false };
      try {
        await runSchedulingCommand('admin_classify_calendar_event_v66', {
          p_event_id: savedId,
          p_contractual: classification === 'contractual',
          p_billable: classification === 'extra',
        });
        return { savedId, classificationPending: false };
      } catch (error) {
        console.error('Classificação da agenda contratual', error);
        return { savedId, classificationPending: true };
      }
    },
  });
}
