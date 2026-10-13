/* Painel de capacidade mensal da administradora (política de 2026-10-13): por empresa, consumo, saldo ou excedente, ritmo
   estimado, ocorrências de excedente na vigência do pacote, avisos já enviados ao cliente e a decisão de pausar.
   A pausa NUNCA é automática: o sistema avisa ao passar de 110% e ela decide. Nada aqui cobra ou altera contrato. */
import { useEffect, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { capacityOf, minutesLabel, percentLabel } from '../../lib/capacity';

type Row = { company_id: string; contracted_minutes: number; used_minutes: number; excess_months: number; window_months: number; paused: boolean; events: string[] };
const eventLabel: Record<string, string> = { m75: 'aviso de 75%', m100: 'aviso de 100%', excess: 'aviso de excedente', tolerance: 'alerta de tolerância (110%)', review: 'pendência de adequação' };

export function CapacityPanel({ month, companies, onNotice }: { month: string; companies: { id: string; name: string }[]; onNotice: (message: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]); const [busy, setBusy] = useState(''); const [confirming, setConfirming] = useState('');
  const monthStart = `${month}-01`;
  async function load() { if (!supabase) return; const result = await supabase.rpc('admin_capacity_overview', { p_month: monthStart }); if (!result.error) setRows((result.data || []) as Row[]); }
  useEffect(() => { void load(); }, [month]);
  async function pause(row: Row) { if (!supabase || busy) return; setBusy(row.company_id); const { data: auth } = await supabase.auth.getUser();
    const result = await supabase.from('capacity_pauses').upsert({ company_id: row.company_id, month: monthStart, paused_by: auth.user?.id || null, paused_at: new Date().toISOString(), resumed_at: null, resumed_by: null }, { onConflict: 'company_id,month' });
    setBusy(''); setConfirming(''); if (result.error) { onNotice('Não foi possível registrar a pausa. Tente de novo.'); return; } onNotice('Atividades pausadas até o próximo mês. O cliente vê o aviso em Horas.'); await load(); }
  async function resume(row: Row) { if (!supabase || busy) return; setBusy(row.company_id); const { data: auth } = await supabase.auth.getUser();
    const result = await supabase.from('capacity_pauses').update({ resumed_at: new Date().toISOString(), resumed_by: auth.user?.id || null }).eq('company_id', row.company_id).eq('month', monthStart);
    setBusy(''); if (result.error) { onNotice('Não foi possível retomar. Tente de novo.'); return; } onNotice('Atividades retomadas.'); await load(); }

  const today = new Date(); const [year, monthIndex] = month.split('-').map(Number); const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === monthIndex;
  const daysInMonth = new Date(year, monthIndex, 0).getDate(); const day = isCurrent ? today.getDate() : daysInMonth; const daysLeft = isCurrent ? daysInMonth - day : 0;
  const list = rows.map((row) => ({ row, name: companies.find((company) => company.id === row.company_id)?.name || 'Cliente', capacity: capacityOf(row.contracted_minutes / 60, row.used_minutes) }))
    .filter((item) => item.capacity.level !== 'none' && ((item.capacity.usagePercent || 0) >= 75 || item.row.paused || item.row.excess_months > 0))
    .sort((a, b) => (b.capacity.usagePercent || 0) - (a.capacity.usagePercent || 0));
  if (!list.length) return null;

  return <section className="ap-pane v2-capadmin"><div className="ap-pane-head"><div><h2>Capacidade mensal em atenção</h2><span>{list.length} {list.length === 1 ? 'empresa' : 'empresas'} com 75% ou mais{isCurrent ? ` · dia ${day} de ${daysInMonth}, faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : ''}</span></div></div>
    <div className="v2-capadmin-list">{list.map(({ row, name, capacity }) => { const pct = capacity.usagePercent || 0; const projected = isCurrent && day > 0 ? Math.round((pct / day) * daysInMonth) : null; const tone = capacity.level === 'excess' ? 'red' : pct >= 100 ? 'red' : 'amber'; const overTolerance = pct >= 110;
      return <article key={row.company_id} className={`v2-capadmin-row ${tone}`}>
        <div className="v2-capadmin-main"><strong>{name}</strong><span>{percentLabel(capacity.usagePercent)} · {minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}{capacity.excessMinutes > 0 ? ` · +${minutesLabel(capacity.excessMinutes)} (${percentLabel(capacity.excessPercent)} acima)` : ` · saldo ${minutesLabel(capacity.balanceMinutes)}`}</span></div>
        <div className="v2-capadmin-facts">
          <span className={row.excess_months >= 3 ? 'bad' : row.excess_months > 0 ? 'warn' : ''}>{row.excess_months > 0 ? `${row.excess_months}ª ocorrência de excedente em ${row.window_months} meses` : `Sem excedente em ${row.window_months} meses`}{row.excess_months >= 3 ? ' — avaliar adequação do pacote' : ''}</span>
          {projected !== null && capacity.level !== 'excess' && projected > 100 && <span className="warn">Ritmo atual: estimativa de {projected}% no fim do mês (estimativa, não previsão)</span>}
          <span>{row.events.length ? `Cliente avisado: ${row.events.filter((kind) => ['m75', 'm100', 'excess'].includes(kind)).map((kind) => eventLabel[kind]).join(', ') || 'nenhum aviso ao cliente'}` : 'Nenhum aviso enviado ao cliente neste mês'}</span>
        </div>
        <div className="v2-capadmin-actions">{row.paused
          ? <><em><PauseCircle size={14} /> Pausada até o próximo mês</em><button type="button" disabled={busy === row.company_id} onClick={() => void resume(row)}><PlayCircle size={14} /> Retomar</button></>
          : confirming === row.company_id ? <><em>Pausar as atividades desta empresa até o próximo mês?</em><button type="button" onClick={() => setConfirming('')}>Voltar</button><button type="button" className="primary" disabled={busy === row.company_id} onClick={() => void pause(row)}>Sim, pausar</button></>
          : overTolerance ? <><em className="alert"><AlertTriangle size={14} /> Passou da tolerância de 10%</em><button type="button" className="primary" onClick={() => setConfirming(row.company_id)}><PauseCircle size={14} /> Pausar até o próximo mês</button></>
          : capacity.level === 'excess' ? <button type="button" onClick={() => setConfirming(row.company_id)}><PauseCircle size={14} /> Pausar até o próximo mês</button> : null}</div>
      </article>; })}</div>
    <p className="v2-capadmin-foot">Excedente não gera cobrança, suspensão automática nem mudança de contrato. A pausa é uma decisão sua e vale só até o fim do mês.</p>
  </section>;
}
