import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './contract-agenda-settings.css';

type Settings = { plan: string; sessions: number; cadence: number; onsite: number };
const initial: Settings = { plan: 'custom', sessions: 0, cadence: 0, onsite: 0 };

export function ContractAgendaSettings({ companyId }: { companyId: string }) {
  const [data, setData] = useState<Settings>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    setLoading(true);
    supabase.from('companies').select('service_plan,meeting_sessions_included_per_month,meeting_cadence_days,onsite_visits_included_per_month').eq('id',companyId).maybeSingle().then(({data:row,error}) => {
      if (!live) return;
      if (error) setMessage(error.message);
      else if (row) setData({plan: ['partner','full'].includes(String(row.service_plan)) ? String(row.service_plan) : 'custom',sessions:Number(row.meeting_sessions_included_per_month||0),cadence:Number(row.meeting_cadence_days||0),onsite:Number(row.onsite_visits_included_per_month||0)});
      setLoading(false);
    });
    return () => { live = false; };
  },[companyId]);
  function choosePlan(plan: string) {
    setData(current => plan === 'partner' ? {plan,sessions:1,cadence:30,onsite:0} : plan === 'full' ? {plan,sessions:2,cadence:14,onsite:1} : {...current,plan});
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    setSaving(true); setMessage('');
    const {error} = await supabase.from('companies').update({service_plan:data.plan === 'custom' ? null : data.plan,meeting_sessions_included_per_month:data.sessions,meeting_cadence_days:data.cadence,onsite_visits_included_per_month:data.onsite,fixed_meeting_required:data.sessions > 0,meeting_mode_policy:data.plan === 'partner' ? 'online_only' : data.plan === 'full' ? 'mixed_one_onsite' : 'custom'}).eq('id',companyId);
    setMessage(error ? error.message : 'Agenda do contrato atualizada.');
    setSaving(false);
  }
  return <section className="account-tab-pane contract-agenda-settings"><div className="account-pane-heading"><CalendarDays size={18}/><div><strong>Agenda do contrato</strong><span>Encontros incluídos neste pacote. Visitas extras são solicitadas separadamente.</span></div></div>
    {loading ? <p>Carregando regra…</p> : <form onSubmit={save} className="form-grid account-tab-form">
      <label className="stacked-label">Pacote<select value={data.plan} onChange={event => choosePlan(event.target.value)}><option value="partner">CALI Partner</option><option value="full">CALI Full</option><option value="custom">Personalizado</option></select></label>
      <label className="stacked-label">Encontros por mês<input type="number" min="0" max="12" required value={data.sessions} onChange={event => setData(current => ({...current,sessions:Number(event.target.value)}))}/></label>
      <label className="stacked-label">Dias entre encontros<input type="number" min="0" max="60" required value={data.cadence} onChange={event => setData(current => ({...current,cadence:Number(event.target.value)}))}/></label>
      <label className="stacked-label">Visitas presenciais incluídas por mês<input type="number" min="0" max="12" required value={data.onsite} onChange={event => setData(current => ({...current,onsite:Number(event.target.value)}))}/></label>
      <p className="contract-agenda-rule wide">Partner: um encontro online mensal. Full: dois encontros mensais, sendo um presencial e um online ou dois online. Os encontros não se acumulam. A agenda fixa mensal do Full ainda será definida em fluxo próprio.</p>
      {message && <p className="wide" role="status">{message}</p>}
      <button className="primary contract-agenda-save" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar agenda do contrato'}</button>
    </form>}
  </section>;
}
