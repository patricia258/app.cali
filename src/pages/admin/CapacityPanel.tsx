/* Painel de capacidade mensal da administradora (política de 2026-10-13): por empresa, consumo, saldo ou excedente, ritmo
   estimado, ocorrências de excedente na vigência do pacote, avisos já enviados ao cliente e a decisão de pausar.
   A pausa NUNCA é automática: o sistema avisa ao passar de 110% e ela decide. Nada aqui cobra ou altera contrato. */
import { useEffect, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { capacityOf, minutesLabel, percentLabel } from '../../lib/capacity';

type Row = { company_id: string; contracted_minutes: number; used_minutes: number; excess_months: number; window_months: number; paused: boolean; events: string[] };
type History = { month: string; contracted_minutes: number; used_minutes: number };
type Review = { id: string; company_id: string; analysis: string; decision: string; communicated: boolean; created_at: string };
const decisionLabel: Record<string, string> = { monitor: 'Manter e acompanhar', reprioritize: 'Reorganizar prioridades', reschedule: 'Reprogramar atividades', complement: 'Contratação complementar', capacity_change: 'Propor alteração de capacidade' };
const monthShort = (iso: string) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00`)).replace('.', '');
const eventLabel: Record<string, string> = { m75: 'aviso de 75%', m100: 'aviso de 100%', excess: 'aviso de excedente', tolerance: 'alerta de tolerância (110%)', review: 'pendência de adequação' };

export function CapacityPanel({ month, companies, onNotice }: { month: string; companies: { id: string; name: string }[]; onNotice: (message: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]); const [busy, setBusy] = useState(''); const [confirming, setConfirming] = useState('');
  const [openId, setOpenId] = useState(''); const [history, setHistory] = useState<History[]>([]); const [reviews, setReviews] = useState<Review[]>([]);
  const [draft, setDraft] = useState({ analysis: '', decision: 'monitor', communicated: false });
  async function openDetail(companyId: string) { if (openId === companyId) { setOpenId(''); return; } setOpenId(companyId); setHistory([]); setDraft({ analysis: '', decision: 'monitor', communicated: false }); if (!supabase) return;
    const [past, notes] = await Promise.all([supabase.rpc('admin_capacity_history', { p_company_id: companyId, p_month: `${month}-01` }), supabase.from('capacity_reviews').select('id,company_id,analysis,decision,communicated,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5)]);
    if (!past.error) setHistory((past.data || []) as History[]); if (!notes.error) setReviews((notes.data || []) as Review[]); }
  async function saveReview(companyId: string) { if (!supabase || busy || draft.analysis.trim().length < 3) return; setBusy(companyId); const { data: auth } = await supabase.auth.getUser();
    const result = await supabase.from('capacity_reviews').insert({ company_id: companyId, month: `${month}-01`, analysis: draft.analysis.trim(), decision: draft.decision, communicated: draft.communicated, created_by: auth.user?.id || null }).select('id,company_id,analysis,decision,communicated,created_at').single();
    setBusy(''); if (result.error) { onNotice('Não foi possível registrar a avaliação. Tente de novo.'); return; } setReviews((current) => [result.data as Review, ...current]); setDraft({ analysis: '', decision: 'monitor', communicated: false }); onNotice('Avaliação registrada. Nada foi alterado no contrato.'); }
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
          : capacity.level === 'excess' ? <button type="button" onClick={() => setConfirming(row.company_id)}><PauseCircle size={14} /> Pausar até o próximo mês</button> : null}<button type="button" aria-expanded={openId === row.company_id} onClick={() => void openDetail(row.company_id)}>{openId === row.company_id ? 'Fechar' : 'Histórico e avaliação'}</button></div>
        {openId === row.company_id && <div className="v2-capadmin-detail">
          <div><h4>Consumo nos últimos {row.window_months} meses</h4>{history.length ? <ul className="v2-capadmin-history">{history.map((item) => { const cap = capacityOf(item.contracted_minutes / 60, item.used_minutes); const value = cap.usagePercent || 0; return <li key={item.month} className={cap.excessMinutes > 0 ? 'over' : ''}><span>{monthShort(item.month)}</span><i><b style={{ width: `${Math.min(100, value)}%` }} /></i><strong>{cap.level === 'none' ? '—' : percentLabel(cap.usagePercent)}</strong><em>{cap.level === 'none' ? 'sem capacidade definida' : `${minutesLabel(cap.usedMinutes)} de ${minutesLabel(cap.contractedMinutes)}${cap.excessMinutes > 0 ? ` · +${minutesLabel(cap.excessMinutes)}` : ''}`}</em></li>; })}</ul> : <p className="v2-capadmin-empty">Carregando histórico…</p>}</div>
          <div><h4>Avaliação de adequação de capacidade</h4><p className="v2-capadmin-empty">Registre a sua análise e o encaminhamento. Isto não altera contrato, cobrança nem atendimento.</p>
            <label>Análise<textarea rows={3} value={draft.analysis} onChange={(event) => setDraft({ ...draft, analysis: event.target.value })} placeholder="O que explica o consumo e o que foi conversado." /></label>
            <div className="v2-capadmin-formrow"><label>Encaminhamento<select value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value })}>{Object.entries(decisionLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="check"><input type="checkbox" checked={draft.communicated} onChange={(event) => setDraft({ ...draft, communicated: event.target.checked })} /> Já comunicado ao cliente</label><button type="button" className="primary" disabled={busy === row.company_id || draft.analysis.trim().length < 3} onClick={() => void saveReview(row.company_id)}>Registrar avaliação</button></div>
            {reviews.length > 0 && <ul className="v2-capadmin-reviews">{reviews.map((review) => <li key={review.id}><strong>{decisionLabel[review.decision] || review.decision}</strong><time>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(review.created_at)).replace('.', '')}{review.communicated ? ' · comunicado ao cliente' : ' · ainda não comunicado'}</time><p>{review.analysis}</p></li>)}</ul>}
          </div>
        </div>}
      </article>; })}</div>
    <p className="v2-capadmin-foot">Excedente não gera cobrança, suspensão automática nem mudança de contrato. A pausa é uma decisão sua e vale só até o fim do mês.</p>
  </section>;
}
