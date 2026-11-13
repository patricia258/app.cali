import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { readMeetingByProtocol } from '../../../api/calendar/meetings';
import type { MeetingClassification } from '../components/CalendarMeetingClassification';

export function useMeetingClassification(protocol: string | undefined, enabled: boolean) {
  const { user, role } = useWorkspaceAuth();
  const [edited, setEdited] = useState<MeetingClassification | null>(null);
  const { data } = useQuery({
    queryKey: ['calendar', 'meeting-classification', protocol, user?.id],
    queryFn: async () => {
      if (!protocol) return null;
      const { data, error } = await readMeetingByProtocol(protocol);
      if (error) throw error;
      return data?.schedule_class;
    },
    enabled: Boolean(protocol && enabled && role === 'admin' && user?.id && isSupabaseConfigured),
  });
  useEffect(() => { setEdited(null); }, [protocol, enabled, user?.id]);
  const stored = data === 'extra' || data === 'other' ? data : 'contractual';
  return { classification: edited ?? stored, setClassification: setEdited };
}
