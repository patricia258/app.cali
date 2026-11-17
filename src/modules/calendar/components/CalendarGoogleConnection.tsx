import { useState } from 'react';
import { Cloud } from 'lucide-react';
import { errorMessage } from '../../../lib/errorMessage';
import { useAdminGoogleCalendarConnection } from '../hooks/useAdminGoogleCalendarConnection';
import { useChangeAdminGoogleCalendarConnection } from '../hooks/useChangeAdminGoogleCalendarConnection';
import { SchedulingDialog } from '../scheduling/SchedulingDialog';
import { SchedulingAction } from '../scheduling/SchedulingAction';

type Props = {
  readStatus: 'loading' | 'ready' | 'reconnect' | 'unavailable';
  connected: boolean;
};

export function CalendarGoogleConnection({ readStatus, connected }: Props) {
  const { query, enabled } = useAdminGoogleCalendarConnection();
  const change = useChangeAdminGoogleCalendarConnection();
  const [confirming, setConfirming] = useState(false);
  const configuration = query.data?.configuration;
  const email = query.data?.connection?.account_email || 'Google Calendar';
  const legacyCopy = readStatus === 'ready'
    ? 'Suas agendas Google aparecem aqui. Atualização automática a cada 5 minutos.'
    : readStatus === 'reconnect' ? 'Reconecte sua conta Google para autorizar a leitura das suas agendas.'
    : readStatus === 'unavailable' ? 'Não consegui ler suas agendas Google agora. Seus eventos CALI continuam visíveis.'
    : connected ? 'Conferindo os compromissos da sua agenda Google…'
    : 'A agenda CALI já funciona. A conexão OAuth com o Google Workspace será ativada sem criar uma agenda paralela à sua.';
  const copy = !query.data ? legacyCopy : !configuration?.configured
    ? 'A integração está preparada, mas as credenciais Google ainda não estão completas.'
    : query.data.connection ? `Conectado a ${email}. Os compromissos sincronizados pela CALI são gravados nesta agenda.`
    : 'Conecte sua agenda Google para sincronizar os compromissos da CALI.';

  return (
    <section className="tw:mt-2 tw:mb-3.5 tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-cali-gold-accent tw:bg-[linear-gradient(135deg,var(--cali-color-gold-soft),var(--cali-color-orange-line)_56%,var(--cali-color-gold-line))] tw:px-3.5 tw:py-2.5 tw:text-cali-gold-inverse tw:shadow-[0_1.1rem_2.5rem_rgb(var(--cali-rgb-gold-strong)/0.1412)] tw:workspace-night:border-cali-gold-accent tw:workspace-night:bg-[linear-gradient(135deg,var(--cali-color-gold-strong),var(--cali-color-gold-text)_54%,var(--cali-color-gold-strong))] tw:workspace-night:text-cali-warning-surface">
      <div className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-brand tw:text-cali-neutral-surface"><Cloud size={15} aria-hidden="true" /></div>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-wrap tw:items-baseline tw:gap-3"><strong className="tw:text-sm/[inherit]">Google Workspace</strong><p className="tw:m-0 tw:text-xs/[inherit] tw:text-cali-gold-strong tw:workspace-night:text-cali-gold-soft">{copy}</p></div>
      <div className="tw:ml-auto tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-3 tw:[@media(max-width:47.5rem)]:w-full tw:[@media(max-width:47.5rem)]:justify-start">
        {enabled && query.isPending && <span className={connectionDetail}>Verificando integração...</span>}
        {query.error && <span role="status" className={connectionDetail}>Não foi possível verificar a integração: {errorMessage(query.error, 'erro')}</span>}
        {query.data && (!configuration?.configured ? (
          <span className={connectionDetail}>Client ID: {configuration?.parts?.clientId ? 'OK' : 'faltando'} · Secret: {configuration?.parts?.clientSecret ? 'OK' : 'faltando'} · Redirect: {configuration?.parts?.redirectUri ? 'OK' : 'faltando'}</span>
        ) : query.data.connection ? (
          <>
            <span className={connectionDetail}>Conectado · {email}</span>
            <SchedulingAction disabled={change.isPending} onClick={() => change.mutate('connect')}>Atualizar conexão</SchedulingAction>
            <SchedulingAction disabled={change.isPending} onClick={() => setConfirming(true)}>Desconectar</SchedulingAction>
          </>
        ) : (
          <SchedulingAction tone="primary" disabled={change.isPending} onClick={() => change.mutate('connect')}>
            {change.isPending ? 'Abrindo Google...' : 'Conectar Google Calendar'}
          </SchedulingAction>
        ))}
        {readStatus === 'reconnect' && <SchedulingAction tone="primary" disabled={change.isPending} onClick={() => change.mutate('connect')}>Autorizar leitura da agenda</SchedulingAction>}
        {change.error && !confirming && <span role="alert" className={connectionDetail}>{errorMessage(change.error, 'Não foi possível iniciar a autorização do Google.')}</span>}
      </div>
      {confirming && <SchedulingDialog title="Desconectar Google Calendar" section="AGENDA" submitLabel="Desconectar"
        onClose={() => setConfirming(false)} onSubmit={async () => { await change.mutateAsync('disconnect'); }}>
        <p>Os eventos já criados no Google permanecem no calendário.</p>
      </SchedulingDialog>}
    </section>
  );
}

const connectionDetail = 'tw:max-w-96 tw:text-right tw:text-sm/[inherit] tw:text-cali-neutral-accent tw:workspace-night:text-cali-sand-accent tw:[@media(max-width:47.5rem)]:text-left';
