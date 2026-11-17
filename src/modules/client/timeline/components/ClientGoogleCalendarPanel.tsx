import { useState } from 'react';
import { CalendarCheck2, Link2, RefreshCw, Unplug } from 'lucide-react';
import { confirmAction } from '../../../../components/feedback/workspaceDialogs';
import { useChangeClientGoogleCalendarConnection } from '../hooks/useChangeClientGoogleCalendarConnection';
import { useClientGoogleCalendarConnection } from '../hooks/useClientGoogleCalendarConnection';

const badge = 'tw:inline-flex tw:min-h-[2.615rem] tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:px-3.5 tw:text-cali-label tw:font-extrabold tw:whitespace-nowrap';
const action = `${badge} tw:cursor-pointer tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:disabled:cursor-default tw:disabled:opacity-50 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-burgundy-surface`;

export function ClientGoogleCalendarPanel() {
  const { data, isPending: loading, refetch, error: readError } = useClientGoogleCalendarConnection();
  const { mutateAsync, isPending: working } = useChangeClientGoogleCalendarConnection();
  const [error, setError] = useState('');
  const connection = data?.connection;
  const companyId = data?.companyId;

  async function change(action: 'connect' | 'disconnect') {
    if (!companyId) return;
    if (action === 'disconnect' && !(await confirmAction('Desconectar sua agenda Google do CALI Workspace? Os compromissos que já existem no Google não serão apagados.'))) return;
    setError('');
    try {
      const url = await mutateAsync({ action, companyId });
      if (url) window.location.assign(url);
      else await refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : action === 'disconnect'
        ? 'Não foi possível desconectar sua agenda.'
        : 'Não foi possível iniciar a conexão.');
    }
  }

  return (
    <section aria-label="Conexão com Google Calendar" className={`tw:mb-5.5 tw:grid tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-4.5 tw:rounded-[1.385rem] tw:border tw:border-solid tw:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--cali-color-gold-accent)_6%,var(--theme-surface)),color-mix(in_srgb,var(--cali-color-burgundy-accent)_3%,var(--theme-surface)))] tw:px-5.5 tw:py-5 tw:shadow-[0_10px_28px_rgb(var(--cali-rgb-gold-inverse)/0.04314)] tw:group-open/google:mt-3 tw:max-[56.25rem]:grid-cols-[auto_minmax(0,1fr)] tw:max-[38.75rem]:grid-cols-1 tw:workspace-night:border-cali-gold/25 tw:workspace-night:bg-[linear-gradient(135deg,rgb(var(--cali-rgb-gold-accent)/0.07843),rgb(var(--cali-rgb-burgundy-accent)/0.1608))] ${connection ? 'tw:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_20%,var(--cali-color-gold-accent)_30%)]' : 'tw:border-[color-mix(in_srgb,var(--cali-color-gold-accent)_28%,var(--theme-line))]'}`}>
      <div className="tw:grid tw:size-13.5 tw:place-items-center tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_14%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_8%,var(--theme-surface))] tw:text-cali-brand tw:max-[38.75rem]:size-12.5 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-text tw:workspace-night:text-cali-orange-line"><CalendarCheck2 size={20} /></div>
      <div className="tw:min-w-0">
        <span className="tw:block tw:text-cali-label tw:font-black tw:tracking-[0.13em] tw:text-cali-gold">GOOGLE CALENDAR · OPCIONAL</span>
        <strong className="tw:mt-1 tw:mb-1 tw:block tw:text-lg tw:text-cali-text">{loading ? 'Verificando sua agenda…' : connection ? 'Sua agenda está conectada' : 'Sua agenda do Workspace já funciona'}</strong>
        <p className="tw:m-0! tw:max-w-[58.462rem] tw:text-xs/[1.45] tw:text-cali-muted">{connection
          ? `Conectado a ${connection.account_email || 'sua conta Google'}. Os compromissos publicados pela CALI continuam aparecendo aqui no Workspace e podem também ser acompanhados na sua agenda pessoal.`
          : 'Você não precisa conectar o Google para ver reuniões, prazos ou links de Meet no Workspace. Conecte apenas se quiser integrar esses compromissos à sua agenda pessoal.'}</p>
        {(error || readError) && <small role="status" className="tw:mt-1 tw:block tw:text-cali-label tw:text-cali-red-accent">{error || readError?.message || 'Não foi possível verificar sua conexão Google.'}</small>}
      </div>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2 tw:max-[56.25rem]:col-start-2 tw:max-[56.25rem]:justify-start tw:max-[38.75rem]:col-start-1">
        {connection ? (
          <>
            <span className={`${badge} tw:border-cali-green-accent/20 tw:bg-cali-green-accent/8 tw:text-cali-green-accent`}><Link2 size={14} /> Conectado</span>
            <button type="button" className={action} onClick={() => { setError(''); void refetch(); }} disabled={working}><RefreshCw size={15} /> Atualizar</button>
            <button type="button" className={`${action} tw:text-cali-red-text`} onClick={() => void change('disconnect')} disabled={working}><Unplug size={15} /> Desconectar</button>
          </>
        ) : (
          <button type="button" className={`${action} tw:text-base! tw:font-semibold! tw:border-cali-brand! tw:bg-cali-brand! tw:text-cali-neutral-surface! tw:workspace-night:border-cali-red-strong! tw:workspace-night:bg-cali-red-strong!`} onClick={() => void change('connect')} disabled={working || loading}>
            {working ? 'Abrindo Google…' : 'Conectar Google Calendar'}
          </button>
        )}
      </div>
    </section>
  );
}
