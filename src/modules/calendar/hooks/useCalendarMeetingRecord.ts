import { useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { readMeetingByProtocol, readMeetingOutcome } from '../../../api/calendar/meetings';

export function useCalendarMeetingRecord(protocol: string) {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['calendar', 'meeting-record', protocol, user?.id],
    enabled: Boolean(role === 'admin' && user?.id),
    queryFn: async () => {
      const { data: meeting, error: meetingError } = await readMeetingByProtocol(protocol);
      if (meetingError) throw meetingError;
      if (!meeting || meeting.event_type !== 'meeting') return null;
      const { data: outcome, error: outcomeError } = await readMeetingOutcome(meeting.id);
      if (outcomeError) throw outcomeError;
      return { meeting, outcome };
    },
  });
}
