import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './extra-visit-expenses.css';

type Visit = { id: string; title: string; company_id: string; selected_slot: { startsAt: string } | null };
type Expense = { id: string; request_id: string; expense_kind: string; amount_cents: number; receipt_path: string | null; protocol: string | null; hours_quantity: number | null };
type ExpenseLine = { key: string; kind: string; amount: string; hours: string; approvedQuote: string; note: string; file: File | null };
const bucket = 'cali-workspace-private';
const newLine = (): ExpenseLine => ({ key: crypto.randomUUID(), kind: 'transport', amount: '', hours: '', approvedQuote: '', note: '', file: null });
const labels: Record<string,string> = { transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação', extra_hours: 'Horas adicionais' };

export function ExtraVisitExpenses() {
  const [open, setOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visitId, setVisitId] = useState('');
  const [lines, setLines] = useState<ExpenseLine[]>([newLine()]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', close); };
  }, [open]);
  useEffect(() => { if (!open || !supabase) return; let live = true; Promise.all([
    supabase.from('scheduling_requests').select('id,title,company_id,selected_slot').eq('extra_visit', true).eq('status', 'completed').order('created_at', { ascending: false }).limit(50),
    supabase.from('extra_visit_expenses').select('id,request_id,expense_kind,amount_cents,receipt_path,protocol,hours_quantity').order('created_at', { ascending: false }).limit(100),
  ]).then(([v, e]) => { if (!live) return; if (v.error || e.error) setError(v.error?.message || e.error?.message || 'Não foi possível carregar as visitas.'); else { setVisits((v.data || []) as Visit[]); setExpenses((e.data || []) as Expense[]); setVisitId(String(v.data?.[0]?.id || '')); } }); return () => { live = false; }; }, [open]);
  function updateLine(key: string, patch: Partial<ExpenseLine>) { setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return setError('Escolha uma visita realizada.');
    for (const line of lines) {
      const cents = Math.round(Number(line.amount.replace(',', '.')) * 100);
      if (!Number.isSafeInteger(cents) || cents <= 0) return setError('Informe um valor válido para cada linha.');
      if (line.kind === 'extra_hours' && (!Number(line.hours) || line.approvedQuote.trim().length < 5)) return setError('Para horas adicionais, informe a quantidade e onde o orçamento foi aprovado.');
      if (line.file && (line.file.size > 10 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(line.file.type))) return setError('Use PDF ou imagem de até 10 MB.');
    }
    setBusy(true); setError(''); setNotice('');
    const uploadedPaths: string[] = [];
    try {
      const items = [];
      for (const line of lines) {
        let receiptPath: string | null = null;
        if (line.file) {
          receiptPath = `extra-visits/${visit.company_id}/${visit.id}/${crypto.randomUUID()}-${line.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const uploaded = await supabase.storage.from(bucket).upload(receiptPath, line.file, { upsert: false, contentType: line.file.type });
          if (uploaded.error) throw uploaded.error;
          uploadedPaths.push(receiptPath);
        }
        items.push({ kind: line.kind, amountCents: Math.round(Number(line.amount.replace(',', '.')) * 100), receiptPath, note: line.note.trim(), hoursQuantity: line.kind === 'extra_hours' ? Number(line.hours) : null, approvedQuoteNote: line.kind === 'extra_hours' ? line.approvedQuote.trim() : null });
      }
      const saved = await supabase.rpc('admin_record_extra_visit_expenses_v2', { p_request_id: visit.id, p_items: items });
      if (saved.error) throw saved.error;
      const protocols = (Array.isArray(saved.data) ? saved.data : []).map(item => item.protocol).filter(Boolean);
      setNotice(`${items.length} ${items.length === 1 ? 'linha registrada' : 'linhas registradas'}. ${protocols.join(' · ')}`);
      setLines([newLine()]);
      const refreshed = await supabase.from('extra_visit_expenses').select('id,request_id,expense_kind,amount_cents,receipt_path,protocol,hours_quantity').order('created_at', { ascending: false }).limit(100);
      if (!refreshed.error) setExpenses((refreshed.data || []) as Expense[]);
    } catch (failure) { await Promise.all(uploadedPaths.map(path => supabase!.storage.from(bucket).remove([path]))); setError(failure instanceof Error ? failure.message : 'Não foi possível registrar as despesas.'); }
    finally { setBusy(false); }
  }
  async function viewReceipt(path: string) { if (!supabase) return; const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 120); if (signError || !data?.signedUrl) return setError(signError?.message || 'Comprovante indisponível.'); window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  return <>
    <button type="button" className="extra-visit-expenses-trigger" aria-label="Despesas das visitas extras" title="Despesas das visitas extras" onClick={() => setOpen(true)}><ReceiptText size={17}/><span>Despesas das visitas</span></button>
    {open && createPortal(<div className="extra-visit-expenses-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><section className="extra-visit-expenses-modal" role="dialog" aria-modal="true" aria-labelledby="extra-expense-heading"><header><div><small>PRESTAÇÃO DE CONTAS</small><h2 id="extra-expense-heading">Despesas de visitas extras</h2></div><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button></header><form onSubmit={submit}><p>Selecione a visita e registre cada gasto em uma linha. Comprovantes são opcionais. Horas adicionais exigem orçamento aprovado.</p><div className="extra-visit-expenses-fields"><label className="full">Visita realizada<select value={visitId} onChange={e => setVisitId(e.target.value)} required>{visits.map(v => <option key={v.id} value={v.id}>{v.title} · {v.selected_slot?.startsAt ? new Date(v.selected_slot.startsAt).toLocaleDateString('pt-BR') : 'sem data'}</option>)}</select></label></div>
      <div className="extra-visit-expense-lines">{lines.map((line,index) => <div className="extra-visit-expense-line" key={line.key}><div className="extra-visit-expense-line-head"><strong>Linha {index + 1}</strong>{lines.length > 1 && <button type="button" aria-label={`Remover linha ${index + 1}`} onClick={() => setLines(current => current.filter(item => item.key !== line.key))}><Trash2 size={16}/></button>}</div><div className="extra-visit-expenses-fields"><label>Tipo<select value={line.kind} onChange={e => updateLine(line.key, { kind: e.target.value })}>{Object.entries(labels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Valor (R$)<input inputMode="decimal" value={line.amount} onChange={e => updateLine(line.key, { amount: e.target.value })} required placeholder="0,00"/></label>{line.kind === 'extra_hours' && <><label>Quantidade de horas<input type="number" min="0.5" step="0.5" value={line.hours} onChange={e => updateLine(line.key, { hours: e.target.value })} required/></label><label>Orçamento aprovado em<input value={line.approvedQuote} onChange={e => updateLine(line.key, { approvedQuote: e.target.value })} required placeholder="Ex.: proposta aceita em 10/10"/></label></>}<label className="full">Comprovante (opcional)<input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => updateLine(line.key, { file: e.target.files?.[0] || null })}/></label><label className="full">Observação<textarea value={line.note} onChange={e => updateLine(line.key, { note: e.target.value })} placeholder="Contexto deste valor"/></label></div></div>)}</div>
      <button type="button" className="extra-visit-add-line" onClick={() => setLines(current => current.length < 12 ? [...current,newLine()] : current)} disabled={lines.length >= 12}><Plus size={16}/> Adicionar linha</button><p className="extra-visit-expenses-note">Carro próprio ainda depende de definição de R$/km. O registro é auditado e cada linha recebe protocolo; faturas não são alteradas automaticamente.</p>{error && <p className="extra-visit-expenses-error" role="alert">{error}</p>}{notice && <p className="extra-visit-expenses-notice" role="status">{notice}</p>}<footer><button type="button" onClick={() => setOpen(false)}>Fechar</button><button type="submit" disabled={busy || !visits.length}>{busy ? 'Salvando…' : 'Registrar despesas'}</button></footer>{visitId && expenses.filter(e => e.request_id === visitId).length > 0 && <div className="extra-visit-expenses-list"><strong>Registros desta visita</strong>{expenses.filter(e => e.request_id === visitId).map(e => <div key={e.id} className="extra-visit-expenses-item"><span>{labels[e.expense_kind] || 'Despesa'}{e.hours_quantity ? ` · ${e.hours_quantity}h` : ''}<small>{e.protocol}</small></span><strong>{(e.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>{e.receipt_path && <button type="button" onClick={() => void viewReceipt(e.receipt_path!)}>Ver anexo ↗</button>}</div>)}</div>}</form></section></div>, document.body)}
  </>;
}
