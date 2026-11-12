import { supabase } from './supabase';
import { isWorkspaceRoute } from '../runtime/routeActivity';

const MAPA_ORIGINS = new Set([
  'https://mapa.calirh.com',
  ...(import.meta.env.DEV ? ['http://localhost:3000'] : []),
]);

export function installMapaAuthBridge() {
  const handler = async (event: MessageEvent) => {
    if (!MAPA_ORIGINS.has(event.origin)) return;
    if (event.data?.type !== 'CALI_MAPA_AUTH_REQUEST') return;
    if (!supabase || !event.source) return;
    if (!isWorkspaceRoute('/admin/mapa-de-people')) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !isWorkspaceRoute('/admin/mapa-de-people')) return;
    const accessToken = session.access_token;

    try {
      (event.source as WindowProxy).postMessage(
        { type: 'CALI_MAPA_AUTH_RESPONSE', access_token: accessToken },
        { targetOrigin: event.origin },
      );
    } catch {
      try {
        (event.source as WindowProxy).postMessage(
          { type: 'CALI_MAPA_AUTH_RESPONSE', access_token: accessToken },
          event.origin,
        );
      } catch {
        // A janela pode ter sido fechada antes da resposta.
      }
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
