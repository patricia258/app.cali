import { AccountPaneHeading } from './AccountPaneHeading';
import { CompanyField, CompanyInput, CompanySelect } from './CompanyFormFields';
import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { readCompanyAgendaSettings, saveCompanyAgendaSettings, type CompanyAgendaSettings } from '../../../../api/admin/companies/agenda';

const initial: CompanyAgendaSettings = { plan: 'custom', sessions: 0, cadence: 0, onsite: 0 };

export function ContractAgendaSettings({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyAgendaSettings>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage('');
    void readCompanyAgendaSettings(companyId, controller.signal).then((row) => {
      if (!controller.signal.aborted) setData(row ?? initial);
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setMessage(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [companyId]);
  function choosePlan(plan: string) {
    setData(current => plan === 'partner' ? {plan,sessions:1,cadence:30,onsite:0} : plan === 'full' ? {plan,sessions:2,cadence:14,onsite:1} : {...current,plan});
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      await saveCompanyAgendaSettings(companyId, data);
      setMessage('Agenda do contrato atualizada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a agenda do contrato.');
    } finally {
      setSaving(false);
    }
  }
  return <section className="account-tab-pane"><AccountPaneHeading icon={CalendarDays} title="Agenda do contrato" description="Encontros incluídos neste pacote. Visitas extras são solicitadas separadamente." />
    {loading ? <p className="tw:text-[11px] tw:text-[#b7495d]">Carregando regra…</p> : <form onSubmit={save} className="tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.385rem] tw:gap-y-[1.077rem] tw:pt-[1.154rem] tw:pb-[1.538rem] tw:max-[43.75rem]:grid-cols-1">
      <CompanyField>Pacote<CompanySelect value={data.plan} onChange={event => choosePlan(event.target.value)}><option value="partner">CALI Partner</option><option value="full">CALI Full</option><option value="custom">Personalizado</option></CompanySelect></CompanyField>
      <CompanyField>Encontros por mês<CompanyInput type="number" min="0" max="12" required value={data.sessions} onChange={event => setData(current => ({...current,sessions:Number(event.target.value)}))}/></CompanyField>
      <CompanyField>Dias entre encontros<CompanyInput type="number" min="0" max="60" required value={data.cadence} onChange={event => setData(current => ({...current,cadence:Number(event.target.value)}))}/></CompanyField>
      <CompanyField>Visitas presenciais incluídas por mês<CompanyInput type="number" min="0" max="12" required value={data.onsite} onChange={event => setData(current => ({...current,onsite:Number(event.target.value)}))}/></CompanyField>
      <p className="tw:col-span-full tw:m-0 tw:rounded-[10px] tw:border tw:border-solid tw:border-[var(--theme-line,#ddd4ce)] tw:border-l-[3px] tw:border-l-cali-gold tw:bg-[var(--theme-surface-soft,#faf7f5)] tw:p-[13px] tw:text-[13px] tw:leading-[1.5] tw:text-[var(--theme-text,#2b2b2b)]">Partner: um encontro online mensal. Full: dois encontros mensais, sendo um presencial e um online ou dois online. Os encontros não se acumulam. A agenda fixa mensal do Full ainda será definida em fluxo próprio.</p>
      {message && <p className="tw:col-span-full" role="status">{message}</p>}
      <button
        className="tw:mt-[14px] tw:inline-flex tw:w-max tw:min-h-[40px] tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[7px] tw:[justify-self:start] tw:rounded-[10px] tw:border-0 tw:bg-cali-brand tw:px-[16px] tw:py-0 tw:[font:700_13px_Inter,system-ui,sans-serif] tw:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent"
        type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar agenda do contrato'}</button>
    </form>}
  </section>;
}
