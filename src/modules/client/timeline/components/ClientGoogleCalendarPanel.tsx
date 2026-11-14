import { useState } from 'react';
import { CalendarCheck2, Link2, RefreshCw, Unplug } from 'lucide-react';
import { confirmAction } from '../../../../components/feedback/workspaceDialogs';
import { useChangeClientGoogleCalendarConnection } from '../hooks/useChangeClientGoogleCalendarConnection';
import { useClientGoogleCalendarConnection } from '../hooks/useClientGoogleCalendarConnection';

const badge = 'tw:inline-flex tw:min-h-[2.615rem] tw:items-center tw:gap-[0.462rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:px-[0.846rem] tw:text-[0.692rem] tw:font-extrabold tw:whitespace-nowrap';
const action = `${badge} tw:cursor-pointer tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:disabled:cursor-default tw:disabled:opacity-50 tw:workspace-night:border-[#4c3940] tw:workspace-night:bg-[#271d21] tw:workspace-night:text-[#e9dee1]`;

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
    <section aria-label="Conexão com Google Calendar" className={`tw:mb-[1.385rem] tw:grid tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-[1.077rem] tw:rounded-[1.385rem] tw:border tw:border-solid tw:bg-[linear-gradient(135deg,color-mix(in_srgb,#b58c52_6%,var(--theme-surface)),color-mix(in_srgb,#5a1e2d_3%,var(--theme-surface)))] tw:px-[1.385rem] tw:py-[1.231rem] tw:shadow-[0_10px_28px_#311f190b] tw:group-open/google:mt-[0.769rem] tw:max-[56.25rem]:grid-cols-[auto_minmax(0,1fr)] tw:max-[38.75rem]:grid-cols-1 tw:workspace-night:border-[#b58c5240] tw:workspace-night:bg-[linear-gradient(135deg,#b58c5214,#5a1e2d29)] ${connection ? 'tw:border-[color-mix(in_srgb,#5a1e2d_20%,#b58c52_30%)]' : 'tw:border-[color-mix(in_srgb,#b58c52_28%,var(--theme-line))]'}`}>
      <div className="tw:grid tw:size-[3.385rem] tw:place-items-center tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-[color-mix(in_srgb,#5a1e2d_14%,var(--theme-line))] tw:bg-[color-mix(in_srgb,#5a1e2d_8%,var(--theme-surface))] tw:text-cali-brand tw:max-[38.75rem]:size-[3.077rem] tw:workspace-night:border-[#4a373e] tw:workspace-night:bg-[#2b2024] tw:workspace-night:text-[#d8ad67]"><CalendarCheck2 size={20} /></div>
      <div className="tw:min-w-0">
        <span className="tw:block tw:text-[0.692rem] tw:font-black tw:tracking-[0.13em] tw:text-cali-gold">GOOGLE CALENDAR · OPCIONAL</span>
        <strong className="tw:mt-[0.308rem] tw:mb-[0.231rem] tw:block tw:text-[1.077rem] tw:text-cali-text">{loading ? 'Verificando sua agenda…' : connection ? 'Sua agenda está conectada' : 'Sua agenda do Workspace já funciona'}</strong>
        <p className="tw:m-0! tw:max-w-[58.462rem] tw:text-[0.769rem]/[1.45] tw:text-cali-muted">{connection
          ? `Conectado a ${connection.account_email || 'sua conta Google'}. Os compromissos publicados pela CALI continuam aparecendo aqui no Workspace e podem também ser acompanhados na sua agenda pessoal.`
          : 'Você não precisa conectar o Google para ver reuniões, prazos ou links de Meet no Workspace. Conecte apenas se quiser integrar esses compromissos à sua agenda pessoal.'}</p>
        {(error || readError) && <small role="status" className="tw:mt-[0.308rem] tw:block tw:text-[0.692rem] tw:text-[#9a3f4e]">{error || readError?.message || 'Não foi possível verificar sua conexão Google.'}</small>}
      </div>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.538rem] tw:max-[56.25rem]:col-start-2 tw:max-[56.25rem]:justify-start tw:max-[38.75rem]:col-start-1">
        {connection ? (
          <>
            <span className={`${badge} tw:border-[#437b5533] tw:bg-[#437b5514] tw:text-[#437b55]`}><Link2 size={14} /> Conectado</span>
            <button type="button" className={action} onClick={() => { setError(''); void refetch(); }} disabled={working}><RefreshCw size={15} /> Atualizar</button>
            <button type="button" className={`${action} tw:text-[#8d3d4d]`} onClick={() => void change('disconnect')} disabled={working}><Unplug size={15} /> Desconectar</button>
          </>
        ) : (
          <button type="button" className={`${action} tw:text-base! tw:font-semibold! tw:border-cali-brand! tw:bg-cali-brand! tw:text-white! tw:workspace-night:border-[#7a2942]! tw:workspace-night:bg-[#7a2942]!`} onClick={() => void change('connect')} disabled={working || loading}>
            {working ? 'Abrindo Google…' : 'Conectar Google Calendar'}
          </button>
        )}
      </div>
    </section>
  );
}
