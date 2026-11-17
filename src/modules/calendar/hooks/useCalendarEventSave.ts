import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveCalendarEvent } from '../../../api/calendar/admin';
import { notifyCalendarRecordUpdated } from '../../../api/calendar/query-cache';
import { calendarKeys } from '../../../api/calendar/query-keys';
import { runSchedulingCommand } from '../../../api/calendar/requests';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { MeetingClassification } from '../components/CalendarMeetingClassification';

export function useCalendarEventSave() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async ({ event, attendees, eventId, classification }: {
      event: Parameters<typeof saveCalendarEvent>[0];
      attendees: string[];
      eventId?: string;
      protocol?: string;
      classification?: MeetingClassification;
    }) => {
      const isCurrent = captureQueryScope(client);
      const savedId = await saveCalendarEvent(event, attendees, eventId, isCurrent);
      if (!classification || !isCurrent()) return { savedId, classificationPending: false };
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
    onSuccess: async ({ savedId }, { protocol }, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: calendarKeys.workspace(scope.actorId) }),
        client.invalidateQueries({ queryKey: calendarKeys.googleEvent(scope.actorId, savedId), exact: true }),
        protocol ? client.invalidateQueries({ queryKey: calendarKeys.meetingRecord(scope.actorId, protocol), exact: true }) : undefined,
        protocol ? client.invalidateQueries({ queryKey: calendarKeys.meetingClassification(scope.actorId, protocol), exact: true }) : undefined,
      ]);
      if (scope.isCurrent()) notifyCalendarRecordUpdated();
    },
  });
}
