import { Button } from '../../../../components/ds/Button';
import { FieldLabel } from '../../../../components/ds/FieldLabel';
import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { readCompanyAgendaSettings, saveCompanyAgendaSettings, type CompanyAgendaSettings } from '../../../../api/admin/companies/agenda';
import './contract-agenda-settings.css';

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
  return <section className="account-tab-pane contract-agenda-settings"><div className="account-pane-heading"><CalendarDays size={18}/><div><strong>Agenda do contrato</strong><span>Encontros incluídos neste pacote. Visitas extras são solicitadas separadamente.</span></div></div>
    {loading ? <p>Carregando regra…</p> : <form onSubmit={save} className="form-grid account-tab-form">
      <FieldLabel>Pacote<select value={data.plan} onChange={event => choosePlan(event.target.value)}><option value="partner">CALI Partner</option><option value="full">CALI Full</option><option value="custom">Personalizado</option></select></FieldLabel>
      <FieldLabel>Encontros por mês<input type="number" min="0" max="12" required value={data.sessions} onChange={event => setData(current => ({...current,sessions:Number(event.target.value)}))}/></FieldLabel>
      <FieldLabel>Dias entre encontros<input type="number" min="0" max="60" required value={data.cadence} onChange={event => setData(current => ({...current,cadence:Number(event.target.value)}))}/></FieldLabel>
      <FieldLabel>Visitas presenciais incluídas por mês<input type="number" min="0" max="12" required value={data.onsite} onChange={event => setData(current => ({...current,onsite:Number(event.target.value)}))}/></FieldLabel>
      <p className="contract-agenda-rule wide">Partner: um encontro online mensal. Full: dois encontros mensais, sendo um presencial e um online ou dois online. Os encontros não se acumulam. A agenda fixa mensal do Full ainda será definida em fluxo próprio.</p>
      {message && <p className="wide" role="status">{message}</p>}
      <Button variant="primary" className="contract-agenda-save" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar agenda do contrato'}</Button>
    </form>}
  </section>;
}
