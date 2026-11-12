import { useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { exchangeGoogleCode } from '../../../api/google/oauth';

function integrationFromState(state: string | null) {
  if (!state) return 'calendar';
  try {
    const encoded = state.split('.')[0].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed?.purpose === 'drive' ? 'drive' : 'calendar';
  } catch {
    return 'calendar';
  }
}

export function GoogleCalendarCallbackPage() {
  const integration = integrationFromState(new URLSearchParams(window.location.search).get('state'));
  const label = integration === 'drive' ? 'Google Drive' : 'Google Calendar';
  const [message, setMessage] = useState(`Conectando seu ${label}...`);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void finish();

    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (params.has('error')) {
        setMessage('O Google não autorizou a conexão. Volte ao Workspace e tente novamente.');
        return;
      }
      if (!code || !state || !isSupabaseConfigured) {
        setMessage(`Retorno do Google incompleto. Volte ao ${integration === 'drive' ? 'menu Documentos' : 'Calendário'} e tente novamente.`);
        return;
      }

      const result = await exchangeGoogleCode(integration, code, state);
      if (result.kind === 'error') {
        setMessage('Não foi possível concluir a conexão. Volte ao Workspace e inicie a conexão novamente.');
        return;
      }
      if (result.kind === 'unavailable') {
        setMessage('Sessão indisponível. Entre no Workspace e inicie a conexão novamente.');
        return;
      }

      setMessage(`${label} conectado${result.accountEmail ? ` · ${result.accountEmail}` : ''}. Redirecionando...`);
      const target = integration === 'drive' ? '/cliente/documentos?drive=connected'
        : result.role === 'client' ? '/cliente/cronograma?google=connected' : '/admin/calendario?google=connected';
      window.setTimeout(() => window.location.replace(target), 700);
    }
  }, [integration, label]);

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F7F3EE', padding: 24, fontFamily: 'Inter,Arial,sans-serif', color: '#2B2B2B' }}>
    <section style={{ width: 'min(560px,100%)', background: '#fff', border: '1px solid #e5d9d2', borderRadius: 22, padding: 32, boxShadow: '0 22px 70px rgba(55,30,36,.12)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', color: '#5A1E2D', marginBottom: 10 }}>CALI WORKSPACE</div>
      <h1 style={{ fontSize: 28, margin: '0 0 10px' }}>{label}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, color: '#6c625e' }} role="status">{message}</p>
    </section>
  </main>;
}
