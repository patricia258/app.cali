import { supabase } from '../lib/supabase';

export function previewDiagnosticsEnabled() {
  return typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname);
}

function safeText(value: unknown, max = 6000) {
  return String(value ?? '').slice(0, max);
}

export async function writePreviewTelemetry(eventType: string, metadata: Record<string, unknown>) {
  if (!previewDiagnosticsEnabled() || !supabase) return;

  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    await supabase.from('activity_log').insert({
      actor_user_id: user.id,
      event_type: eventType,
      entity_type: 'frontend',
      metadata: {
        ...metadata,
        route: safeText(metadata.route || window.location.pathname, 500),
        preview_host: window.location.hostname,
        captured_at: new Date().toISOString(),
      },
    });
  } catch {
    // Diagnóstico nunca pode interferir na navegação do Workspace.
  }
}
