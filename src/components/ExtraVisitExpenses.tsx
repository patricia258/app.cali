import { useEffect, useState, type FormEvent } from 'react';
import { ReceiptText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './extra-visit-expenses.css';

type Visit = { id: string; title: string; company_id: string; selected_slot: { startsAt: string } | null };
type Expense = { id: string; request_id: string; expense_kind: string; amount_cents: number; receipt_path: string };
const bucket = 'cali-workspace-private';

export function ExtraVisitExpenses() {
  const [open, setOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visitId, setVisitId] = useState('');
  const [kind, setKind] = useState('transport');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open || !supabase) return; let live = true; Promise.all([
    supabase.from('scheduling_requests').select('id,title,company_id,selected_slot').eq('extra_visit', true).eq('status', 'completed').order('created_at', { ascending: false }).limit(50),
    supabase.from('extra_visit_expenses').select('id,request_id,expense_kind,amount_cents,receipt_path').order('created_at', { ascending: false }).limit(100),
  ]).then(([v, e]) => { if (!live) return; if (v.error || e.error) setError(v.error?.message || e.error?.message || 'Não foi possível carregar as visitas.'); else { setVisits((v.data || []) as Visit[]); setExpenses((e.data || []) as Expense[]); setVisitId(String(v.data?.[0]?.id || '')); } }); return () => { live = false; }; }, [open]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !file) return setError('Selecione o comprovante.');
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return setError('Escolha uma visita realizada.');
    const cents = Math.round(Number(amount.replace(',', '.')) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) return setError('Informe o valor da despesa.');
    if (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Envie PDF ou imagem de até 10 MB.');
    setBusy(true); setError('');
    const path = `extra-visits/${visit.company_id}/${visit.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploaded = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (uploaded.error) { setError(uploaded.error.message); setBusy(false); return; }
    const saved = await supabase.rpc('admin_record_extra_visit_expense_v1', { p_request_id: visit.id, p_kind: kind, p_amount_cents: cents, p_receipt_path: path, p_note: note.trim() });
    if (saved.error) { await supabase.storage.from(bucket).remove([path]); setError(saved.error.message); setBusy(false); return; }
    setExpenses(current => [{ id: String(saved.data?.id || path), request_id: visit.id, expense_kind: kind, amount_cents: cents, receipt_path: path }, ...current]);
    setAmount(''); setNote(''); setFile(null); setBusy(false);
  }
  async function viewReceipt(path: string) { if (!supabase) return; const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 120); if (signError || !data?.signedUrl) return setError(signError?.message || 'Comprovante indisponível.'); window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  return <>
    <button type="button" className="extra-visit-expenses-trigger" aria-label="Despesas das visitas extras" title="Despesas das visitas extras" onClick={() => setOpen(true)}><ReceiptText size={17}/><span>Despesas das visitas</span></button>
    {open && <div className="extra-visit-expenses-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><section className="extra-visit-expenses-modal" role="dialog" aria-modal="true" aria-labelledby="extra-expense-heading"><header><div><small>PRESTAÇÃO DE CONTAS</small><h2 id="extra-expense-heading">Despesas de visitas extras</h2></div><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button></header><form onSubmit={submit}><p>Registre somente despesas comprovadas depois da realização. O valor fixo de R$ 800,00 permanece separado para a conciliação do período.</p><div className="extra-visit-expenses-fields"><label className="full">Visita realizada<select value={visitId} onChange={e => setVisitId(e.target.value)} required>{visits.map(v => <option key={v.id} value={v.id}>{v.title} · {v.selected_slot?.startsAt ? new Date(v.selected_slot.startsAt).toLocaleDateString('pt-BR') : 'sem data'}</option>)}</select></label><label>Despesa<select value={kind} onChange={e => setKind(e.target.value)}><option value="transport">Deslocamento com comprovante</option><option value="parking">Estacionamento · nota fiscal</option><option value="food">Alimentação · nota fiscal</option></select></label><label>Valor (R$)<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0,00"/></label><label className="full">Comprovante<input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} required/></label><label className="full">Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: trajeto de Uber e motivo da despesa"/></label></div><p className="extra-visit-expenses-note">O cálculo de carro próprio aguarda a definição de R$/km e não é lançado por este formulário.</p>{error && <p className="extra-visit-expenses-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setOpen(false)}>Fechar</button><button type="submit" disabled={busy || !visits.length}>{busy ? 'Salvando…' : 'Registrar despesa'}</button></footer>{visitId && expenses.filter(e => e.request_id === visitId).length > 0 && <div className="extra-visit-expenses-list"><strong>Comprovantes desta visita</strong>{expenses.filter(e => e.request_id === visitId).map(e => <button key={e.id} type="button" onClick={() => void viewReceipt(e.receipt_path)}>{({ transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação' } as Record<string, string>)[e.expense_kind]} · {(e.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ↗</button>)}</div>}</form></section></div>}
  </>;
}
