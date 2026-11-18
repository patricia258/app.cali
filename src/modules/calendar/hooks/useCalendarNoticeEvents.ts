import { calendarKeys } from '../../../api/calendar/query-keys';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readCalendarNotices } from '../../../api/calendar/agenda';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { WorkspaceCalendarEvent } from '../../../domain/calendar';

const noticeColors: Record<string, string> = {
  feriado: 'var(--cali-color-gold-accent)',
  atendimento: 'var(--cali-color-blue-accent)',
  comunicado: 'var(--cali-color-violet-accent)',
};

export function useCalendarNoticeEvents() {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: calendarKeys.publishedNotices(user?.id, role),
    enabled: Boolean(isSupabaseConfigured && user?.id && (role === 'admin' || role === 'partner')),
    queryFn: async ({ signal }) => {
      const result = await readCalendarNotices(true, signal);
      if (result.error) throw result.error;
      return (result.data ?? []).map((row): WorkspaceCalendarEvent => ({
        id: `notice:${row.id}`,
        title: `Aviso · ${row.title}`,
        company: 'Quadro de Avisos',
        type: 'other',
        color: noticeColors[row.category] || noticeColors.comunicado,
        textColor: 'var(--cali-color-neutral-surface)',
        startsAt: `${row.notice_date}T12:00:00-03:00`,
        endsAt: `${row.notice_date}T12:00:00-03:00`,
        allDay: true,
        description: [row.time_label, row.coverage, row.body].filter(Boolean).join(' · '),
        visibility: 'client',
        attendees: [],
        sourceType: 'manual',
        sourceProtocol: row.protocol,
        synthetic: true,
      }));
    },
  });
}
