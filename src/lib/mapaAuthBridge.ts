import { supabase } from './supabase';

const MAPA_ORIGINS = new Set([
  'https://mapa.calirh.com',
  'http://localhost:3000',
]);

export function installMapaAuthBridge() {
  const handler = async (event: MessageEvent) => {
    if (!MAPA_ORIGINS.has(event.origin)) return;
    if (event.data?.type !== 'CALI_MAPA_AUTH_REQUEST') return;
    if (!supabase || !event.source) return;

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

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
