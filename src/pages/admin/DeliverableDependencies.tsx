/* Dependências do cliente no entregável + histórico do prazo (regra oficial de complexidade, itens 4 a 6).
   A administradora registra, marca recebimento e reprograma o prazo com justificativa; a Equipe CALI registra e marca
   recebimento (por função); o cliente só lê. Nada é reprogramado sozinho: o sistema sugere e a administradora decide. */
import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Dep = { id: string; title: string; due_date: string; status: 'pending' | 'received' | 'cancelled'; received_at: string | null };
type Rev = { id: string; previous_due: string | null; new_due: string; cause: string; reason: string; created_at: string };
type Sibling = { id: string; title: string; dueAt: string | null };
type Mode = 'admin' | 'staff' | 'client';

const CAUSES: Record<string, string> = { client_dependency: 'Pendência do cliente', scope: 'Mudança de escopo', internal: 'Ajuste da CALI', other: 'Outro motivo' };
const REMOBILIZATION: Record<string, number> = { MC1: 0, MC2: 1, MC3: 2 };
const localDay = (date = new Date()) => { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString().slice(0, 10); };
const asDay = (value: string) => value.length === 10 ? value : localDay(new Date(value));
const show = (value?: string | null) => value ? asDay(value).split('-').reverse().join('/') : '—';
const gap = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000);
const plus = (value: string, days: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1); return localDay(date); };
const stamp = (value: string) => `${value}T18:00:00-03:00`;

export function DeliverableDependencies({ deliverableId, companyId, title, dueAt, originalDueAt, complexity, mode, siblings = [], onNotice, onChanged }: { deliverableId: string; companyId: string; title: string; dueAt: string | null; originalDueAt?: string | null; complexity?: string | null; mode: Mode; siblings?: Sibling[]; onNotice?: (message: string) => void; onChanged?: () => void }) {
  const [deps, setDeps] = useState<Dep[]>([]); const [revs, setRevs] = useState<Rev[]>([]); const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ title: '', due: '' });
  const [plan, setPlan] = useState<{ date: string; cause: string; reason: string; shift: string[] } | null>(null);
  const today = localDay(); const editable = mode !== 'client'; const fail = (message: string) => onNotice?.(message);

  async function load() { if (!supabase) return;
    const [depResult, revResult] = await Promise.all([
      supabase.from('deliverable_client_dependencies').select('id,title,due_date,status,received_at').eq('deliverable_id', deliverableId).neq('status', 'cancelled').order('due_date'),
      supabase.from('deliverable_due_revisions').select('id,previous_due,new_due,cause,reason,created_at').eq('deliverable_id', deliverableId).order('created_at', { ascending: false }),
    ]);
    if (!depResult.error) setDeps((depResult.data || []) as Dep[]); if (!revResult.error) setRevs((revResult.data || []) as Rev[]); }
  useEffect(() => { setDeps([]); setRevs([]); setPlan(null); setDraft({ title: '', due: '' }); void load(); }, [deliverableId]);

  const late = (dep: Dep) => dep.status === 'pending' && dep.due_date < today ? gap(dep.due_date, today) : 0;
  const overdue = deps.filter((dep) => late(dep) > 0); const worst = Math.max(0, ...overdue.map(late));
  const extra = REMOBILIZATION[complexity || ''] || 0; const due = dueAt ? asDay(dueAt) : '';

  async function add() { if (!supabase || busy || !draft.title.trim() || !draft.due) return; setBusy(true);
    const failure = mode === 'staff'
      ? (await supabase.rpc('partner_add_dependency', { p_deliverable_id: deliverableId, p_title: draft.title.trim(), p_due_date: draft.due })).error
      : (await supabase.from('deliverable_client_dependencies').insert({ deliverable_id: deliverableId, company_id: companyId, title: draft.title.trim(), due_date: draft.due, created_by: (await supabase.auth.getUser()).data.user?.id || null })).error;
    setBusy(false); if (failure) { fail(failure.message || 'Não foi possível registrar a dependência.'); return; } setDraft({ title: '', due: '' }); await load(); }
  async function receive(dep: Dep) { if (!supabase || busy) return; setBusy(true);
    const failure = mode === 'staff' ? (await supabase.rpc('partner_receive_dependency', { p_dependency_id: dep.id })).error
      : (await supabase.from('deliverable_client_dependencies').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', dep.id)).error;
    setBusy(false); if (failure) { fail(failure.message || 'Não foi possível marcar como recebido.'); return; } await load(); }
  async function cancel(dep: Dep) { if (!supabase || busy) return; setBusy(true); const failure = (await supabase.from('deliverable_client_dependencies').update({ status: 'cancelled' }).eq('id', dep.id)).error; setBusy(false); if (failure) { fail(failure.message); return; } await load(); }

  function openPlan() { const suggested = due ? plus(due, worst + extra) : today; setPlan({ date: worst ? suggested : due || today, cause: worst ? 'client_dependency' : 'other', reason: worst ? `Pendência do cliente com ${worst} ${worst === 1 ? 'dia' : 'dias'} de atraso${extra ? ` + ${extra} ${extra === 1 ? 'dia útil' : 'dias úteis'} de remobilização (${complexity})` : ''}.` : '', shift: [] }); }
  async function applyPlan() { if (!supabase || !plan || busy || !plan.date || !plan.reason.trim() || plan.date === due) return; setBusy(true);
    const userId = (await supabase.auth.getUser()).data.user?.id || null; const moved = due ? gap(due, plan.date) : 0;
    const steps = [{ id: deliverableId, from: dueAt, to: plan.date, reason: plan.reason.trim(), keepOriginal: !originalDueAt && Boolean(dueAt) }, ...siblings.filter((item) => plan.shift.includes(item.id) && item.dueAt).map((item) => ({ id: item.id, from: item.dueAt, to: plus(asDay(item.dueAt!), moved), reason: `Reprogramado junto com “${title}”. ${plan.reason.trim()}`, keepOriginal: false }))];
    for (const step of steps) {
      const update = await supabase.from('deliverables').update({ due_at: stamp(step.to), ...(step.keepOriginal ? { original_due_at: step.from } : {}) }).eq('id', step.id);
      if (update.error) { setBusy(false); fail(update.error.message || 'Não foi possível alterar o prazo.'); return; }
      const log = await supabase.from('deliverable_due_revisions').insert({ deliverable_id: step.id, company_id: companyId, previous_due: step.from, new_due: stamp(step.to), cause: plan.cause, reason: step.reason, created_by: userId });
      if (log.error) { setBusy(false); fail(log.error.message || 'O prazo mudou, mas o histórico não foi gravado.'); return; }
    }
    setBusy(false); setPlan(null); fail(`Prazo reprogramado para ${show(plan.date)}${steps.length > 1 ? ` e ${steps.length - 1} ${steps.length === 2 ? 'entrega seguinte ajustada' : 'entregas seguintes ajustadas'}` : ''}.`); await load(); onChanged?.(); }

  if (mode === 'client' && !deps.length && !revs.length) return null;
  const chip = (dep: Dep) => dep.status === 'received' ? <span className="wf-tag green">Recebido {show(dep.received_at)}</span> : late(dep) > 0 ? <span className="wf-tag red">Em atraso há {late(dep)} {late(dep) === 1 ? 'dia' : 'dias'}</span> : <span className="wf-tag amber">Pendente</span>;

  return <section className="v2-notelog v2-deps">
    <div className="v2-notelog-head"><div><h4>{mode === 'client' ? 'O que precisamos de você' : 'Dependências do cliente'}</h4><p>{mode === 'client' ? 'Informações e aprovações que esta entrega aguarda da sua empresa.' : 'O que o cliente precisa enviar ou aprovar para esta entrega andar. O cliente vê esta lista.'}</p></div>{deps.length > 0 && <span>{deps.filter((dep) => dep.status === 'pending').length} em aberto</span>}</div>
    {overdue.length > 0 && <div className="v2-deps-alert" role="alert"><AlertTriangle size={16} /><div><strong>{mode === 'client' ? `${overdue.length === 1 ? 'Há 1 pendência' : `Há ${overdue.length} pendências`} em atraso` : `Pendência do cliente em atraso há ${worst} ${worst === 1 ? 'dia' : 'dias'}`}</strong><p>{mode === 'client' ? 'Envie pela conversa desta entrega. O atraso pode adiar o prazo final.' : mode === 'admin' ? 'O prazo desta entrega pode ser impactado. Reprograme se for o caso; nada muda sozinho.' : 'O prazo desta entrega pode ser impactado. Avise a Patrícia para reprogramar, se for o caso.'}</p></div>{mode === 'admin' && !plan && <button type="button" onClick={openPlan}>Reprogramar prazo</button>}</div>}
    {deps.length > 0 && <ul className="v2-deps-list">{deps.map((dep) => <li key={dep.id}><strong>{dep.title}</strong><span>até {show(dep.due_date)}</span>{chip(dep)}{editable && dep.status === 'pending' && <span className="v2-deps-tools"><button type="button" disabled={busy} onClick={() => void receive(dep)}><Check size={13} /> Recebido</button>{mode === 'admin' && <button type="button" disabled={busy} onClick={() => void cancel(dep)}>Remover</button>}</span>}</li>)}</ul>}
    {editable && <div className="v2-deps-new"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="O que o cliente precisa enviar ou aprovar" aria-label="Dependência do cliente" maxLength={200} /><input type="date" value={draft.due} max={due || undefined} onChange={(event) => setDraft({ ...draft, due: event.target.value })} aria-label="Enviar até" /><button type="button" className="primary" disabled={busy || !draft.title.trim() || !draft.due} onClick={() => void add()}><Plus size={14} /> Adicionar</button></div>}
    {(revs.length > 0 || mode === 'admin') && <div className="v2-deps-history"><div className="v2-deps-history-head"><h5><CalendarClock size={14} /> Histórico do prazo</h5>{mode === 'admin' && !plan && <button type="button" onClick={openPlan}>Revisar prazo</button>}</div>
      {plan && <div className="v2-deps-plan"><label>Novo prazo<input type="date" value={plan.date} onChange={(event) => setPlan({ ...plan, date: event.target.value })} /></label><label>Motivo<select value={plan.cause} onChange={(event) => setPlan({ ...plan, cause: event.target.value })}>{Object.entries(CAUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="wide">Justificativa (o cliente vê)<input value={plan.reason} onChange={(event) => setPlan({ ...plan, reason: event.target.value })} maxLength={1000} placeholder="Explique o motivo da mudança de prazo" /></label>
        {siblings.filter((item) => item.dueAt).length > 0 && <fieldset className="wide"><legend>Mover também, pelos mesmos dias, as entregas seguintes desta frente</legend>{siblings.filter((item) => item.dueAt).map((item) => <label key={item.id}><input type="checkbox" checked={plan.shift.includes(item.id)} onChange={(event) => setPlan({ ...plan, shift: event.target.checked ? [...plan.shift, item.id] : plan.shift.filter((id) => id !== item.id) })} /> {item.title} <small>prazo atual {show(item.dueAt)}</small></label>)}</fieldset>}
        <span className="wide v2-deps-plan-actions"><button type="button" onClick={() => setPlan(null)}>Cancelar</button><button type="button" className="primary" disabled={busy || !plan.date || !plan.reason.trim() || plan.date === due} onClick={() => void applyPlan()}>{busy ? 'Gravando…' : 'Confirmar novo prazo'}</button></span></div>}
      {revs.length > 0 ? <ul className="v2-deps-revs">{revs.map((rev) => <li key={rev.id}><time>{show(rev.created_at)}</time><strong>{show(rev.previous_due)} → {show(rev.new_due)}</strong><span>{CAUSES[rev.cause] || 'Outro motivo'}</span><p>{rev.reason}</p></li>)}</ul> : !plan && <p className="v2-notelog-empty">O prazo desta entrega ainda não foi revisado.</p>}</div>}
  </section>;
}
