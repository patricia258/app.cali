import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { isSupabaseConfigured } from '../../../../api/access/session';
import { exchangeGoogleCode } from '../../../../api/google/oauth';
import { useNavigate } from '../../../../hooks/useNavigate';
import { useSearchParams } from '../../../../hooks/useSearchParams';

const stateSchema = z.object({ purpose: z.string().optional() });
function integrationFromState(state: string | null) {
  if (!state) return 'calendar';
  try {
    const encoded = state.split('.')[0].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const parsed = stateSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success && parsed.data.purpose === 'drive' ? 'drive' : 'calendar';
  } catch {
    return 'calendar';
  }
}

export function useGoogleOAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const state = params.get('state');
  const code = params.get('code');
  const integration = integrationFromState(state);
  const label = integration === 'drive' ? 'Google Drive' : 'Google Calendar';
  const rejected = params.has('error');
  const started = useRef(false);
  const { mutate, data, isError } = useMutation({
    gcTime: 0,
    mutationFn: ({ integration, code, state }: { integration: 'calendar' | 'drive'; code: string; state: string }) => exchangeGoogleCode(integration, code, state),
  });
  useEffect(() => {
    if (started.current || rejected || !code || !state || !isSupabaseConfigured) return;
    started.current = true;
    mutate({ integration, code, state });
  }, [code, integration, mutate, rejected, state]);

  useEffect(() => {
    if (!data || data.kind === 'error' || data.kind === 'unavailable') return;
    const target = integration === 'drive' ? '/cliente/documentos?drive=connected'
      : data.role === 'client' ? '/cliente/cronograma?google=connected' : '/admin/calendario?google=connected';
    const timer = window.setTimeout(() => navigate(target, { replace: true }), 700);
    return () => window.clearTimeout(timer);
  }, [data, integration, navigate]);

  let message = `Conectando seu ${label}...`;
  if (rejected) message = 'O Google não autorizou a conexão. Volte ao Workspace e tente novamente.';
  else if (!code || !state || !isSupabaseConfigured) message = `Retorno do Google incompleto. Volte ao ${integration === 'drive' ? 'menu Documentos' : 'Calendário'} e tente novamente.`;
  else if (isError || data?.kind === 'error') message = 'Não foi possível concluir a conexão. Volte ao Workspace e inicie a conexão novamente.';
  else if (data?.kind === 'unavailable') message = 'Sessão indisponível. Entre no Workspace e inicie a conexão novamente.';
  else if (data) message = `${label} conectado${data.accountEmail ? ` · ${data.accountEmail}` : ''}. Redirecionando...`;
  return { label, message };
}
