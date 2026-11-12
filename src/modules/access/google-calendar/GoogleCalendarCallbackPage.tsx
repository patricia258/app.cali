import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../api/supabase';

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
      if (!code || !state || !supabase) {
        setMessage(`Retorno do Google incompleto. Volte ao ${integration === 'drive' ? 'menu Documentos' : 'Calendário'} e tente novamente.`);
        return;
      }

      const functionName = integration === 'drive' ? 'google-drive-oauth' : 'google-calendar-oauth';
      const payload = { body: { action: 'exchange', code, state } };
      let result = await supabase.functions.invoke(functionName, payload);
      if (result.error?.name === 'FunctionsFetchError') result = await supabase.functions.invoke(functionName, payload);
      if (result.error || result.data?.error || result.data?.ok === false) {
        setMessage('Não foi possível concluir a conexão. Volte ao Workspace e inicie a conexão novamente.');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage('Sessão indisponível. Entre no Workspace e inicie a conexão novamente.');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userData.user.id).maybeSingle();
      if (!profile?.active || !['admin', 'client'].includes(profile.role)) {
        setMessage('Sessão indisponível. Entre no Workspace e inicie a conexão novamente.');
        return;
      }

      setMessage(`${label} conectado${result.data?.accountEmail ? ` · ${result.data.accountEmail}` : ''}. Redirecionando...`);
      const target = integration === 'drive' ? '/cliente/documentos?drive=connected'
        : profile.role === 'client' ? '/cliente/cronograma?google=connected' : '/admin/calendario?google=connected';
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
