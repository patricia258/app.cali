import { MentionTextarea } from '../../../components/workspace/MentionTextarea';
/* Notas internas como registros: cada nota fica gravada com autor e hora, na lista. Usado no entregável e na subtarefa.
   A administradora grava direto; a Equipe CALI (Partner) grava por função. O cliente nunca lê esta tabela. */
import { Button } from '../../../components/ds/Button';
import { useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readProjectActor } from '../../../api/projects/conversation';
import { addProjectNote, deleteProjectNote, editProjectNote, readProjectNotes } from '../../../api/projects/notes';

type Entry = { id: string; author_user_id: string | null; author_name: string | null; body: string; created_at: string };
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');

export function NoteLog({ deliverableId, taskId, companyId, staff, title, hint, onNotice }: { deliverableId: string; taskId?: string | null; companyId: string; staff: boolean; title: string; hint: string; onNotice: (message: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(''); const [editing, setEditing] = useState<{ id: string; body: string } | null>(null); const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => { if (!isSupabaseConfigured) return; void readProjectActor().then(({ data }) => setMe(data.user?.id || '')); }, []);
  const canChange = (entry: Entry) => !staff || entry.author_user_id === me;
  async function saveEdit() { if (!isSupabaseConfigured || !editing || !editing.body.trim()) return; const failure = (await editProjectNote(editing.id, editing.body, staff)).error; if (failure) { onNotice(failure.message || 'Não foi possível editar a nota.'); return; } setEditing(null); await load(); }
  async function remove(id: string) { if (!isSupabaseConfigured) return; const failure = (await deleteProjectNote(id, staff)).error; setRemoving(null); if (failure) { onNotice(failure.message || 'Não foi possível excluir a nota.'); return; } await load(); }
  async function load() { if (!isSupabaseConfigured) return; const result = await readProjectNotes(deliverableId, taskId); if (!result.error) setEntries((result.data || []) as Entry[]); }
  useEffect(() => { setEntries([]); setText(''); void load(); }, [deliverableId, taskId]);
  async function add() { if (!isSupabaseConfigured || busy || !text.trim()) return; setBusy(true);
    const { error: failure } = await addProjectNote(companyId, deliverableId, taskId || null, text, staff);
    setBusy(false); if (failure) { onNotice(failure.message || 'Não foi possível gravar a nota. Tente de novo.'); return; } setText(''); await load(); }
  return (
    <section aria-label={title} className="tw:mt-7 tw:flex tw:flex-col tw:gap-3.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-5.5 tw:py-5">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3.5">
        <div>
          <h4 className="tw:m-0 tw:text-lg tw:font-bold tw:text-cali-ink">{title}</h4>
          <p className="tw:mt-1 tw:mb-0 tw:text-sm tw:text-cali-muted">{hint}</p>
        </div>
        <span className="tw:text-sm tw:font-bold tw:whitespace-nowrap tw:text-cali-warning">{entries.length} {entries.length === 1 ? 'nota' : 'notas'}</span>
      </div>
      <div className="tw:flex tw:items-end tw:gap-3 tw:max-[32rem]:flex-col tw:max-[32rem]:items-stretch">
        <MentionTextarea aria-label="Nova nota interna" rows={2} value={text} onValueChange={setText}
          placeholder="Escreva a nota e clique em Adicionar nota."
          className="tw:box-border tw:min-h-[3.38rem] tw:min-w-0 tw:flex-1 tw:resize-y tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body tw:leading-[1.45]"
        />
        <Button type="button" variant="unstyled" disabled={busy || !text.trim()} onClick={() => void add()}
          className="tw:inline-flex tw:min-h-[3.08rem] tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-cali-panel tw:border-0 tw:bg-cali-brand tw:px-4.5 tw:text-cali-body tw:font-bold tw:whitespace-nowrap tw:text-cali-neutral-surface tw:disabled:cursor-default tw:disabled:opacity-45"
        ><Plus size={14} />{busy ? 'Gravando…' : 'Adicionar nota'}</Button>
      </div>
      {entries.length > 0 ? (
        <ul className="tw:m-0 tw:flex tw:max-h-80 tw:list-none tw:flex-col tw:gap-2.5 tw:overflow-y-auto tw:p-0 tw:[scrollbar-width:none]">
          {entries.map((entry) => (
            <li key={entry.id} className="tw:rounded-cali-panel tw:border tw:border-l-[.23rem] tw:border-solid tw:border-cali-line tw:border-l-cali-gold tw:bg-cali-neutral-surface tw:px-4 tw:py-3">
              <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
                <strong className="tw:text-sm">{entry.author_name || 'CALI'}</strong>
                <time dateTime={entry.created_at} className="tw:text-xs tw:text-cali-muted">{when(entry.created_at)}</time>
                {canChange(entry) && editing?.id !== entry.id && removing !== entry.id && (
                  <span className="tw:ml-auto tw:inline-flex tw:gap-2">
                    <NoteTool label="Editar nota" onClick={() => setEditing({ id: entry.id, body: entry.body })}><Pencil size={13} /></NoteTool>
                    <NoteTool label="Excluir nota" onClick={() => setRemoving(entry.id)}><Trash2 size={13} /></NoteTool>
                  </span>
                )}
              </div>
              {editing?.id === entry.id ? (
                <div className="tw:mt-2.5 tw:flex tw:flex-col tw:gap-2.5">
                  <MentionTextarea aria-label="Editar nota interna" autoFocus rows={2} value={editing.body} onValueChange={(body) => setEditing({ id: entry.id, body })}
                    className="tw:box-border tw:w-full tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:px-3.5 tw:py-3 tw:text-cali-body"
                  />
                  <span className="tw:flex tw:justify-end tw:gap-2.5">
                    <NoteAction onClick={() => setEditing(null)}>Cancelar</NoteAction>
                    <NoteAction tone="primary" disabled={!editing.body.trim()} onClick={() => void saveEdit()}>Salvar</NoteAction>
                  </span>
                </div>
              ) : removing === entry.id ? (
                <div className="tw:mt-2.5 tw:flex tw:flex-col tw:gap-2.5">
                  <span className="tw:text-cali-body tw:font-semibold tw:text-cali-red-text">Excluir esta nota? Não dá para desfazer.</span>
                  <span className="tw:flex tw:justify-end tw:gap-2.5">
                    <NoteAction onClick={() => setRemoving(null)}>Manter</NoteAction>
                    <NoteAction tone="danger" onClick={() => void remove(entry.id)}>Excluir</NoteAction>
                  </span>
                </div>
              ) : <p className="tw:mt-1 tw:mb-0 tw:whitespace-pre-wrap tw:text-cali-body tw:leading-[1.5] tw:text-cali-text">{entry.body}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="tw:m-0 tw:text-cali-body tw:text-cali-muted">Nenhuma nota gravada ainda.</p>}
    </section>
  );
}

function NoteTool({ label, onClick, children }: Pick<ComponentPropsWithoutRef<'button'>, 'onClick' | 'children'> & { label: string }) {
  return <Button type="button" variant="unstyled" aria-label={label} title={label} onClick={onClick}
    className="tw:grid tw:size-8 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-0 tw:text-cali-red-strong"
  >{children}</Button>;
}

function NoteAction({ tone, ...props }: Pick<ComponentPropsWithoutRef<'button'>, 'children' | 'disabled' | 'onClick'> & { tone?: 'primary' | 'danger' }) {
  const color = tone === 'primary' ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface'
    : tone === 'danger' ? 'tw:border-cali-danger tw:bg-cali-danger tw:text-cali-neutral-surface' : 'tw:border-cali-input-line tw:bg-cali-neutral-surface tw:text-cali-brand';
  return <Button type="button" variant="unstyled" {...props} className={`tw:min-h-[2.31rem] tw:cursor-pointer tw:rounded-cali-compact-control tw:border tw:border-solid tw:px-3.5 tw:text-sm tw:font-bold tw:disabled:cursor-default tw:disabled:opacity-45 ${color}`} />;
}
