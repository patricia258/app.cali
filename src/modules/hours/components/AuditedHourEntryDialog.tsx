import { useState, type FormEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ds/Button';
import { DialogForm } from '../../../components/ds/DialogForm';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import type { HourAuditEntry } from '../../../api/hours/audit';
import { errorMessage } from '../../../lib/errorMessage';
import { useDeleteAuditedHourEntry } from '../hooks/useDeleteAuditedHourEntry';
import { useEditAuditedHourEntry } from '../hooks/useEditAuditedHourEntry';

type Props = {
  kind: 'edit' | 'delete';
  entry: HourAuditEntry;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function AuditedHourEntryDialog({ kind, entry, categories, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState({ ...entry, minutes: String(entry.minutes) });
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState('');
  const edit = useEditAuditedHourEntry();
  const remove = useDeleteAuditedHourEntry();
  const busy = edit.isPending || remove.isPending;
  const deleting = kind === 'delete';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || reason.trim().length < 3) return;
    const minutes = Math.round(Number(draft.minutes));
    if (!deleting && !(minutes >= 1 && minutes <= 1440)) {
      setFailure('Informe uma duração entre 1 minuto e 24 horas.');
      return;
    }
    setFailure('');
    try {
      if (deleting) await remove.mutateAsync({ id: entry.id, reason: reason.trim() });
      else await edit.mutateAsync({ entry: { ...draft, minutes, description: draft.description.trim() }, reason: reason.trim() });
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error, 'Não foi possível concluir a alteração.'));
    }
  }

  return <div className="tw:fixed tw:inset-0 tw:z-[30000] tw:grid tw:place-items-center tw:bg-[#2019197a] tw:p-4 tw:backdrop-blur-[0.3125rem]">
    <DialogForm aria-label="Confirmar alteração de horas" onSubmit={(event) => void submit(event)}
      className="tw:max-h-[calc(100dvh-3rem)] tw:w-full tw:max-w-[35rem] tw:overflow-auto tw:rounded-[1.375rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:shadow-2xl">
      <header className="tw:flex tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-6 tw:pt-6 tw:pb-4">
        <span className="tw:grid tw:size-[2.625rem] tw:shrink-0 tw:place-items-center tw:rounded-xl tw:bg-[#f7eeeb] tw:text-cali-brand">{deleting ? <Trash2 size={21} aria-hidden="true" /> : <Pencil size={21} aria-hidden="true" />}</span>
        <div>
          <h2 className="tw:m-0 tw:mb-1.5 tw:text-[1.375rem]">{deleting ? 'Excluir lançamento de horas' : 'Editar lançamento de horas'}</h2>
          <p className="tw:m-0 tw:text-cali-muted">{deleting ? 'O lançamento sairá do extrato, mas ficará preservado integralmente na Auditoria.' : 'A versão anterior e a nova versão ficarão registradas na Auditoria.'}</p>
        </div>
        <Button type="button" variant="close" className="tw:ml-auto tw:shrink-0" disabled={busy} onClick={onClose} aria-label="Fechar"><X size={19} /></Button>
      </header>
      <div className="tw:grid tw:gap-3.5 tw:px-6 tw:py-5 tw:[&_label]:grid tw:[&_label]:gap-1.5 tw:[&_label]:text-sm tw:[&_label]:font-bold tw:[&_:is(input:not([type=checkbox]),select,textarea)]:w-full tw:[&_:is(input:not([type=checkbox]),select,textarea)]:rounded-xl tw:[&_:is(input:not([type=checkbox]),select,textarea)]:border tw:[&_:is(input:not([type=checkbox]),select,textarea)]:border-solid tw:[&_:is(input:not([type=checkbox]),select,textarea)]:border-cali-input-line tw:[&_:is(input:not([type=checkbox]),select,textarea)]:bg-cali-input tw:[&_:is(input:not([type=checkbox]),select,textarea)]:px-3 tw:[&_:is(input:not([type=checkbox]),select,textarea)]:py-2.5 tw:[&_textarea]:min-h-[5.5rem] tw:[&_textarea]:resize-y">
        {!deleting && <>
          <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
            <label>Data<input type="date" value={draft.workDate} onChange={(event) => setDraft({ ...draft, workDate: event.target.value })} /></label>
            <label>Duração (minutos)<input type="number" min="1" max="1440" value={draft.minutes} onChange={(event) => setDraft({ ...draft, minutes: event.target.value })} /></label>
          </div>
          <label>Descrição<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label>Natureza<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {!categories.includes(draft.category) && <option>{draft.category}</option>}
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select></label>
          <label className="tw:flex! tw:items-center tw:gap-2 tw:font-semibold"><input type="checkbox" checked={draft.clientVisible} onChange={(event) => setDraft({ ...draft, clientVisible: event.target.checked })} /> Compartilhável no extrato do cliente</label>
        </>}
        <label>{deleting ? 'Por que você está excluindo?' : 'Justificativa da edição'}<textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder={deleting ? 'Ex.: teste de timer' : 'Explique o motivo da correção'} /></label>
        {failure && <InlineNotice tone="danger">{failure}</InlineNotice>}
      </div>
      <footer className="tw:flex tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-6 tw:pt-4 tw:pb-5">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" className={deleting ? 'tw:border-cali-danger! tw:bg-cali-danger! tw:text-white!' : undefined} disabled={busy || reason.trim().length < 3}>{busy ? 'Salvando…' : deleting ? 'Excluir e registrar' : 'Salvar correção'}</Button>
      </footer>
    </DialogForm>
  </div>;
}
