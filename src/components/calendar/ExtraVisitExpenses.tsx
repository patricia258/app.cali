import { DialogFrame } from '../ds/DialogFrame';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ReceiptText, Trash2, X } from 'lucide-react';
import {
  extraVisitsAvailable, readCompletedExtraVisits, readExtraVisitExpenses, recordExtraVisitExpenses, signExtraVisitReceipt,
  type CompletedVisit, type ExtraVisitExpense,
} from '../../api/calendar/extra-visits';

type ExpenseLine = { key: string; kind: string; amount: string; hours: string; approvedQuote: string; note: string; file: File | null };
const newLine = (): ExpenseLine => ({ key: crypto.randomUUID(), kind: 'transport', amount: '', hours: '', approvedQuote: '', note: '', file: null });
const labels: Record<string,string> = { transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação', extra_hours: 'Horas adicionais' };

const fieldGrid = 'tw:grid tw:grid-cols-2 tw:gap-x-4 tw:gap-y-3 tw:max-[37.5rem]:grid-cols-1';
const fieldLabel = 'tw:m-0! tw:flex tw:flex-col tw:gap-1.5 tw:text-cali-label tw:font-bold tw:text-cali-text tw:workspace-night:text-cali-text';
const fieldControl = 'tw:box-border tw:h-auto tw:min-h-10 tw:w-full tw:rounded-md tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3 tw:py-2 tw:text-xs/[1.3] tw:font-normal tw:text-cali-text tw:focus:border-cali-gold tw:focus:shadow-[0_0_0_3px_rgb(var(--cali-rgb-gold-accent)/0.102)] tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-text tw:workspace-night:text-cali-text';
const wideField = `${fieldLabel} tw:col-span-full tw:max-[37.5rem]:col-auto`;
const action = 'tw:h-auto tw:min-h-0 tw:cursor-pointer tw:rounded-md tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2.5 tw:text-cali-label! tw:font-bold! tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:workspace-night:border-cali-line-strong tw:workspace-night:bg-cali-surface-muted tw:workspace-night:text-cali-text';
const triggerBase = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:border tw:border-solid tw:text-xs! tw:whitespace-nowrap tw:shadow-none tw:hover:border-cali-gold';
const triggerStyles = {
  calendar: 'tw:h-auto tw:rounded-md tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:py-2.5 tw:font-semibold! tw:text-cali-brand',
  header: 'tw:min-h-9.5 tw:rounded-cali-panel tw:border-cali-neutral-line tw:bg-cali-surface tw:px-2.5 tw:font-bold! tw:text-cali-text tw:hover:bg-[color-mix(in_srgb,var(--cali-color-gold-accent)_9%,var(--theme-surface))] tw:max-[59.375rem]:w-9.5 tw:max-[59.375rem]:justify-center tw:max-[59.375rem]:p-0 tw:max-[59.375rem]:[&>span]:hidden tw:workspace-night:border-cali-line-strong tw:workspace-night:bg-cali-surface-muted tw:workspace-night:text-cali-text',
};

export function ExtraVisitExpenses({ placement = 'header' }: { placement?: 'header' | 'calendar' } = {}) {
  const [open, setOpen] = useState(false);
  const [visits, setVisits] = useState<CompletedVisit[]>([]);
  const [expenses, setExpenses] = useState<ExtraVisitExpense[]>([]);
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
  useEffect(() => {
    if (!open || !extraVisitsAvailable) return;
    let live = true;
    void readCompletedExtraVisits().then(([completed, existing]) => {
      if (!live) return;
      if (completed.error || existing.error) {
        setError(completed.error?.message || existing.error?.message || 'Não foi possível carregar as visitas.');
        return;
      }
      setVisits(completed.data ?? []);
      setExpenses(existing.data ?? []);
      setVisitId(String(completed.data?.[0]?.id || ''));
    });
    return () => { live = false; };
  }, [open]);
  function updateLine(key: string, patch: Partial<ExpenseLine>) { setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!extraVisitsAvailable) return;
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return setError('Escolha uma visita realizada.');
    for (const line of lines) {
      const cents = Math.round(Number(line.amount.replace(',', '.')) * 100);
      if (!Number.isSafeInteger(cents) || cents <= 0) return setError('Informe um valor válido para cada linha.');
      if (line.kind === 'extra_hours' && (!Number(line.hours) || line.approvedQuote.trim().length < 5)) return setError('Para horas adicionais, informe a quantidade e onde o orçamento foi aprovado.');
      if (line.file && (line.file.size > 10 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(line.file.type))) return setError('Use PDF ou imagem de até 10 MB.');
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const items = lines.map((line) => ({
        kind: line.kind, amountCents: Math.round(Number(line.amount.replace(',', '.')) * 100), note: line.note.trim(),
        hoursQuantity: line.kind === 'extra_hours' ? Number(line.hours) : null,
        approvedQuoteNote: line.kind === 'extra_hours' ? line.approvedQuote.trim() : null, file: line.file,
      }));
      const protocols = await recordExtraVisitExpenses(visit, items);
      setNotice(`${items.length} ${items.length === 1 ? 'linha registrada' : 'linhas registradas'}. ${protocols.join(' · ')}`);
      setLines([newLine()]);
      const refreshed = await readExtraVisitExpenses();
      if (!refreshed.error) setExpenses(refreshed.data ?? []);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível registrar as despesas.');
    }
    finally { setBusy(false); }
  }
  async function viewReceipt(path: string) { if (!extraVisitsAvailable) return; const { data, error: signError } = await signExtraVisitReceipt(path); if (signError || !data?.signedUrl) return setError(signError?.message || 'Comprovante indisponível.'); window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); }
  return <>
    <button type="button" className={`${triggerBase} ${triggerStyles[placement]}`} aria-label="Despesas das visitas extras" title="Despesas das visitas extras" onClick={() => setOpen(true)}><ReceiptText size={17}/><span>Despesas</span></button>
    {open && createPortal(<div className="tw:fixed tw:inset-0 tw:z-10050 tw:grid tw:place-items-center tw:bg-cali-neutral-inverse/62 tw:p-5.5 tw:backdrop-blur-[0.3125rem] tw:max-[37.5rem]:p-2" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><DialogFrame className="tw:flex tw:max-h-[min(47.5rem,calc(100dvh-2.5rem))] tw:w-[min(45rem,100%)] tw:flex-col tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:shadow-[0_30px_80px_rgb(var(--cali-rgb-shadow)/0.2784)] tw:max-[37.5rem]:max-h-[96vh] tw:max-[37.5rem]:rounded-2xl tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-surface tw:workspace-night:text-cali-red-surface" aria-labelledby="extra-expense-heading"><header className="tw:m-0 tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:bg-linear-to-r tw:from-cali-sand-surface tw:to-cali-orange-surface tw:px-7 tw:pt-5.5 tw:pb-4 tw:workspace-night:from-cali-burgundy-strong tw:workspace-night:to-cali-burgundy-strong tw:max-[37.5rem]:px-4"><div><small className="tw:block tw:text-cali-micro tw:font-bold tw:tracking-[0.12em] tw:uppercase tw:text-cali-warning">PRESTAÇÃO DE CONTAS</small><h2 className="tw:mt-2! tw:mb-0! tw:text-xl tw:font-bold tw:text-cali-text" id="extra-expense-heading">Despesas de visitas extras</h2></div><button type="button" className="tw:grid tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-2 tw:text-cali-text tw:workspace-night:border-cali-line-strong tw:workspace-night:bg-cali-surface-muted tw:workspace-night:text-cali-text" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button></header><form className="tw:flex tw:min-h-0 tw:flex-col tw:gap-3.5 tw:overflow-y-auto tw:px-7 tw:pt-4.5 tw:[scrollbar-width:none] tw:max-[37.5rem]:px-4" onSubmit={submit}><p className="tw:m-0! tw:text-xs/[1.6] tw:text-cali-muted">Selecione a visita e registre cada gasto em uma linha. Comprovantes são opcionais. Horas adicionais exigem orçamento aprovado.</p><div className={fieldGrid}><label className={wideField}>Visita realizada<select className={fieldControl} value={visitId} onChange={e => setVisitId(e.target.value)} required>{visits.map(v => <option key={v.id} value={v.id}>{v.title} · {v.selected_slot?.startsAt ? new Date(v.selected_slot.startsAt).toLocaleDateString('pt-BR') : 'sem data'}</option>)}</select></label></div>
      <button type="button" className="tw:m-0! tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:self-start tw:rounded-md tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3 tw:py-2 tw:text-cali-label! tw:font-bold! tw:text-cali-brand" onClick={() => setLines(current => current.length < 12 ? [newLine(),...current] : current)} disabled={lines.length >= 12}><Plus size={16}/> Adicionar linha</button>
      <div className="tw:flex tw:flex-col tw:gap-3">{lines.map((line,index) => <div className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-4 tw:py-3.5 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-text" key={line.key}><div className="tw:mb-2.5 tw:flex tw:items-center tw:justify-between tw:text-xs tw:text-cali-text"><strong>Linha {lines.length - index}</strong>{lines.length > 1 && <button type="button" className="tw:grid tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:p-1 tw:text-cali-danger" aria-label={`Remover linha ${lines.length - index}`} onClick={() => setLines(current => current.filter(item => item.key !== line.key))}><Trash2 size={16}/></button>}</div><div className={fieldGrid}><label className={fieldLabel}>Tipo<select className={fieldControl} value={line.kind} onChange={e => updateLine(line.key, { kind: e.target.value })}>{Object.entries(labels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className={fieldLabel}>Valor (R$)<input className={fieldControl} inputMode="decimal" value={line.amount} onChange={e => updateLine(line.key, { amount: e.target.value })} required placeholder="0,00"/></label>{line.kind === 'extra_hours' && <><label className={fieldLabel}>Quantidade de horas<input className={fieldControl} type="number" min="0.5" step="0.5" value={line.hours} onChange={e => updateLine(line.key, { hours: e.target.value })} required/></label><label className={fieldLabel}>Orçamento aprovado em<input className={fieldControl} value={line.approvedQuote} onChange={e => updateLine(line.key, { approvedQuote: e.target.value })} required placeholder="Ex.: proposta aceita em 10/10"/></label></>}<label className={wideField}>Comprovante (opcional)<input className={fieldControl} type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => updateLine(line.key, { file: e.target.files?.[0] || null })}/></label><label className={wideField}>Observação<textarea className={`${fieldControl} tw:min-h-16 tw:resize-y`} value={line.note} onChange={e => updateLine(line.key, { note: e.target.value })} placeholder="Contexto deste valor"/></label></div></div>)}</div>
      <p className="tw:mt-2.5! tw:mb-0! tw:text-cali-label/[1.6]! tw:text-cali-muted!">Carro próprio ainda depende de definição de R$/km. O registro é auditado e cada linha recebe protocolo; faturas não são alteradas automaticamente.</p>{error && <p className="tw:m-0! tw:rounded-lg tw:bg-cali-red-surface tw:px-2.5 tw:py-2 tw:text-cali-label/[1.4] tw:text-cali-danger" role="alert">{error}</p>}{notice && <p className="tw:m-0! tw:rounded-lg tw:border tw:border-solid tw:border-cali-green-line tw:bg-cali-green-surface tw:p-2.5 tw:text-cali-label tw:text-cali-success" role="status">{notice}</p>}<footer className="tw:sticky tw:bottom-0 tw:-mx-7 tw:mt-1.5 tw:flex tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-7 tw:py-3.5 tw:max-[37.5rem]:-mx-4 tw:max-[37.5rem]:px-4 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-surface"><button type="button" className={action} onClick={() => setOpen(false)}>Fechar</button><button type="submit" className={`${action} tw:border-cali-brand! tw:bg-cali-brand! tw:text-cali-neutral-surface! tw:workspace-night:border-cali-red-strong! tw:workspace-night:bg-cali-red-strong!`} disabled={busy || !visits.length}>{busy ? 'Salvando…' : 'Registrar despesas'}</button></footer>{visitId && expenses.filter(e => e.request_id === visitId).length > 0 && <div className="tw:mt-4 tw:flex tw:flex-col tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:pt-3.5 tw:pb-4.5"><strong className="tw:mb-2 tw:block tw:text-cali-micro tw:font-black tw:tracking-wide tw:uppercase tw:text-cali-muted">Registros desta visita</strong>{expenses.filter(e => e.request_id === visitId).map(e => <div key={e.id} className="tw:flex tw:w-full tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-0.5 tw:py-2.5 tw:text-left tw:text-xs tw:text-cali-text"><span className="tw:flex tw:flex-1 tw:flex-col tw:gap-0.5 tw:font-bold">{labels[e.expense_kind] || 'Despesa'}{e.hours_quantity ? ` · ${e.hours_quantity}h` : ''}<small className="tw:block tw:text-cali-micro tw:text-cali-muted">{e.protocol}</small></span><strong className="tw:text-xs tw:text-cali-brand">{(e.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>{e.receipt_path && <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-label! tw:text-cali-red-strong tw:underline tw:workspace-night:text-cali-orange-line" onClick={() => void viewReceipt(e.receipt_path!)}>Ver anexo ↗</button>}</div>)}</div>}</form></DialogFrame></div>, document.body)}
  </>;
}
