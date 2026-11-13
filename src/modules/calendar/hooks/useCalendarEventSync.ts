import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { listMyPendingCalendarEvents, observeCalendarEventSync, runGoogleCalendarOperation } from '../../../api/calendar/sync';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { Notice } from '../scheduling/SchedulingNotice';

type SyncRequest = { eventId: string; action?: 'sync_event' | 'cancel_event'; recovered?: boolean; silent?: boolean };
type SyncResult = { status?: string };

export function useCalendarEventSync(onNotice: (notice: Notice) => void, onChanged: (eventId: string) => void) {
  const { user, role } = useWorkspaceAuth();
  const enabled = role === 'admin' && Boolean(user?.id) && isSupabaseConfigured;
  const active = useRef(new Map<string, Promise<SyncResult>>());
  const { mutateAsync } = useMutation({
    mutationFn: async ({ eventId, action = 'sync_event', silent = false, recovered = false }: SyncRequest) => {
      const key = `${action}:${eventId}`;
      const ongoing = active.current.get(key);
      if (ongoing) return await ongoing;
      const request = runGoogleCalendarOperation({ action, eventId }) as Promise<SyncResult>;
      active.current.set(key, request);
      try {
        const result = await request;
        if (result?.status === 'synced') {
          if (!silent) onNotice({ message: recovered
            ? 'Um evento pendente foi recuperado e sincronizado com o Google Calendar.'
            : 'Evento salvo e sincronizado com o Google Calendar. Convites enviados aos participantes.' });
          onChanged(eventId);
        } else if (result?.status === 'no_google_connection' && !silent) {
          onNotice({ message: 'Evento salvo no Workspace, mas nenhuma conta Google organizadora está conectada.' });
        }
        if (action === 'cancel_event') onChanged(eventId);
        return result;
      } catch (error) {
        if (!silent) onNotice({ tone: 'error', message: 'Evento salvo no Workspace, mas o Google não sincronizou. Abra o evento para tentar novamente.' });
        throw error;
      } finally {
        active.current.delete(key);
      }
    },
  });

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let repairing = false;
    const report = (error: Error) => console.error('Falha ao sincronizar evento com Google Calendar', error);
    async function repair() {
      if (repairing) return;
      repairing = true;
      try {
        const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        for (const event of await listMyPendingCalendarEvents(since)) {
          if (stopped) return;
          await mutateAsync({ eventId: event.id, recovered: true }).catch(report);
        }
      } catch (error) {
        console.error('Falha ao recuperar evento pendente', error);
      } finally {
        repairing = false;
      }
    }
    // Failed operations update the same row; the focus repair retries them without a realtime loop.
    const stop = observeCalendarEventSync((row) => {
      if (!row.id) return;
      if (row.cancelled_at && !['cancelled_google', 'error'].includes(row.sync_status ?? '')) {
        void mutateAsync({ eventId: row.id, action: 'cancel_event', silent: true }).catch(report);
      } else if (!row.cancelled_at && row.sync_status === 'pending') {
        void mutateAsync({ eventId: row.id, silent: true }).catch(report);
      }
    });
    const timer = window.setTimeout(() => void repair(), 900);
    const onFocus = () => { if (!document.hidden) void repair(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      stop();
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [enabled, mutateAsync]);

  return (request: SyncRequest) => mutateAsync(request).catch((error) => console.error('Falha ao sincronizar evento com Google Calendar', error));
}
