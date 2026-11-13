import { WorkspaceConfirmDialog } from '../../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../../components/workspace/components/WorkspaceDialogOverlay';
import { FormFeedbackToast } from '../../../../components/forms/FormFeedbackToast';
import { FormResultsTable } from '../../../../components/forms/FormResultsTable';
import { Button } from '../../../../components/ds/Button';
import { EmptyState } from '../../../../components/ds/EmptyState';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { LoadingState } from '../../../../components/ds/LoadingState';
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Pencil, FileSpreadsheet, RefreshCw, Search, Trash2 } from 'lucide-react';
import { deleteFormResponses, readFormResponses, signFormExportAttachments, updateFormResponseTracking, type FormResponse as ResponseRow,
} from '../../../../api/forms/admin';
import { downloadXlsx } from '../formExports';
import { type FormQuestion, type FormRecord, formatAnswer, isAnswerable, stripRichText } from '../../../forms/formModel';
import { dateTime, errorText, scaleOptions } from '../formDetails';
import { FormResponseAttachment } from './FormResponseAttachment';
import { FormResponseEditor } from './FormResponseEditor';

export function FormResponsesPanel({ form }: { form: FormRecord }) {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [stageFilter, setStageFilter] = useState('');
  const stages = useMemo(() => (form.stages || []).filter(Boolean), [form.stages]);
  const [answerFilter, setAnswerFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteFor, setNoteFor] = useState<{ row: ResponseRow; text: string; busy: boolean } | null>(null);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState<ResponseRow | null>(null);
  const columns = useMemo(() => form.questions.filter(isAnswerable), [form.questions]);
  const choiceColumns = useMemo(() => columns.filter((question) => ['single_choice', 'multi_choice', 'yes_no', 'scale'].includes(question.kind)), [columns]);

  async function load() {
    setLoading(true); setError('');
    const { data, error: loadError } = await readFormResponses(form.id);
    if (loadError) setError(errorText(loadError, 'Não foi possível carregar as respostas.')); else setRows((data || []) as ResponseRow[]);
    setLoading(false); setSelected(new Set());
  }
  useEffect(() => { void load(); }, [form.id]);

  const textOf = (question: FormQuestion, row: ResponseRow) => formatAnswer(question, row.answers[question.id]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const [filterId, filterValue] = answerFilter ? answerFilter.split('::') : ['', ''];
    const list = rows.filter((row) => {
      if (contactFilter === 'pending' && row.contacted_at) return false;
      if (contactFilter === 'done' && !row.contacted_at) return false;
      if (stageFilter && (row.stage || stages[0] || '') !== stageFilter) return false;
      if (filterId) { const value = row.answers[filterId]; if (Array.isArray(value) ? !value.map(String).includes(filterValue) : String(value ?? '') !== filterValue) return false; }
      if (!term) return true;
      return [row.respondent_name, row.respondent_email, row.admin_note, ...columns.map((question) => textOf(question, row))].join(' ').toLowerCase().includes(term);
    });
    const key = sort.key;
    const valueOf = (row: ResponseRow): string | number => key === 'date' ? row.submitted_at : key === 'stage' ? stages.indexOf(row.stage || stages[0] || '') : key === 'owner' ? (row.owner || '') : key === 'contact' ? (row.contacted_at || '') : key === 'note' ? (row.admin_note || '') : (() => { const question = columns.find((item) => item.id === key); const raw = row.answers[key]; return typeof raw === 'number' ? raw : question ? textOf(question, row) : ''; })();
    return [...list].sort((a, b) => { const x = valueOf(a), y = valueOf(b); if (x === y) return 0; if (x === '' ) return 1; if (y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { sensitivity: 'base' })) * sort.dir; });
  }, [rows, query, columns, contactFilter, answerFilter, sort, stageFilter, stages]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast((current) => current === message ? '' : current), 1800); }
  function copy(text: string) { if (!text) return; void navigator.clipboard.writeText(text).then(() => flash(`Copiado: ${text.length > 40 ? `${text.slice(0, 40)}…` : text}`)); }
  function sortBy(key: string) { setSort((current) => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === 'date' ? -1 : 1 }); }
  const sortMark = (key: string) => sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : '';
  const allChecked = filtered.length > 0 && filtered.every((row) => selected.has(row.id));
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  async function exportExcel() {
    const header = ['Data', ...(stages.length ? ['Situação', 'Responsável'] : []), ...columns.map((question) => stripRichText(question.label)), 'Contato', 'Nota interna'];
    // Arquivos saem como link: os do app valem 30 dias; os importados (Drive) seguem o link original.
    const paths = filtered.flatMap((row) => columns.filter((question) => question.kind === 'file').map((question) => row.answers[question.id])).filter((value): value is string => typeof value === 'string' && !!value && !/^https?:/.test(value));
    const links = await signFormExportAttachments(paths);
    const body = filtered.map((row) => [dateTime(row.submitted_at), ...(stages.length ? [row.stage || stages[0], row.owner || ''] : []), ...columns.map((question) => { const value = row.answers[question.id]; if (question.kind === 'file' && typeof value === 'string' && value) return /^https?:/.test(value) ? value : links[value] || value; return typeof value === 'number' ? value : formatAnswer(question, value); }), row.contacted_at ? `Sim · ${dateTime(row.contacted_at)}` : 'Não', row.admin_note || '']);
    downloadXlsx(`cali-forms-${form.slug}-respostas.xlsx`, form.title, header, body);
  }

  async function updateRow(row: ResponseRow, patch: Partial<Pick<ResponseRow, 'stage' | 'owner'>>) {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...patch } : item));
    const { error: updateError } = await updateFormResponseTracking(row.id, patch);
    if (updateError) { setError(errorText(updateError, 'Não foi possível salvar.')); setRows((current) => current.map((item) => item.id === row.id ? row : item)); }
  }

  async function setContacted(row: ResponseRow, done: boolean) {
    const contacted_at = done ? new Date().toISOString() : null;
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, contacted_at } : item));
    const { error: updateError } = await updateFormResponseTracking(row.id, { contacted_at });
    if (updateError) { setError(errorText(updateError, 'Não foi possível marcar o contato.')); setRows((current) => current.map((item) => item.id === row.id ? { ...item, contacted_at: row.contacted_at } : item)); }
  }

  async function saveNote() {
    if (!noteFor) return;
    setNoteFor({ ...noteFor, busy: true });
    const admin_note = noteFor.text.trim() || null;
    const { error: updateError } = await updateFormResponseTracking(noteFor.row.id, { admin_note });
    if (updateError) { setError(errorText(updateError, 'Não foi possível salvar a nota.')); setNoteFor({ ...noteFor, busy: false }); return; }
    setRows((current) => current.map((item) => item.id === noteFor.row.id ? { ...item, admin_note } : item)); setNoteFor(null);
  }

  async function removeSelected() {
    if (!selected.size) return;
    setDeleting(true);
    const ids = [...selected];
    const { error: deleteError } = await deleteFormResponses(ids);
    setDeleting(false); setConfirmDelete(false);
    if (deleteError) { setError(errorText(deleteError, 'Não foi possível excluir.')); return; }
    setRows((current) => current.filter((item) => !selected.has(item.id))); setSelected(new Set()); flash(`${ids.length} ${ids.length === 1 ? 'resposta excluída' : 'respostas excluídas'}`);
  }

  return <div className="v2-forms-responses">
    <div className="wf-controls v2-forms-controls tw:flex tw:items-center tw:gap-[0.769rem] tw:flex-wrap tw:mb-[0.923rem]">
      <label className="v2-forms-search tw:flex tw:items-center tw:gap-[0.538rem] tw:flex-1 tw:min-w-[16.923rem] tw:max-w-[29.231rem]
        tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0_0.769rem] tw:bg-white tw:text-[color:var(--fm-muted)]
        tw:[&_input]:flex-1 tw:[&_input]:border-0 tw:[&_input]:outline-none tw:[&_input]:[padding:0.692rem_0]
        tw:[&_input]:[font:400_0.923rem_Inter,sans-serif] tw:[&_input]:bg-transparent"><Search size={15} /><input value={query} placeholder="Buscar nas respostas" onChange={(event) => setQuery(event.target.value)} /></label>
      {stages.length > 0 && <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
        tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" aria-label="Situação" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="">Situação: todas</option>{stages.map((item) => <option key={item}>{item}</option>)}</select>}
      <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
        tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" aria-label="Contato" value={contactFilter} onChange={(event) => setContactFilter(event.target.value as typeof contactFilter)}><option value="all">Contato: todos</option><option value="pending">Ainda sem contato</option><option value="done">Já contatados</option></select>
      {choiceColumns.length > 0 && <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
        tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" aria-label="Filtrar por resposta" value={answerFilter} onChange={(event) => setAnswerFilter(event.target.value)}><option value="">Filtrar por resposta</option>{choiceColumns.map((question) => <optgroup key={question.id} label={stripRichText(question.label).slice(0, 60)}>{(question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'scale' ? scaleOptions(question) : question.options || []).map((option) => <option key={option} value={`${question.id}::${option}`}>{option}</option>)}</optgroup>)}</select>}
      <span className="v2-forms-total tw:text-[0.846rem] tw:text-[color:var(--fm-muted)] tw:mr-auto">{filtered.length} de {rows.length}</span>
      <Button type="button" variant="formSecondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</Button>
      <Button type="button" variant="workflowPrimary" disabled={!filtered.length} onClick={() => void exportExcel()}><FileSpreadsheet size={15} /> Exportar Excel</Button>
    </div>
    {selected.size > 0 && <div className="v2-forms-selbar tw:flex tw:items-center tw:gap-[0.923rem] tw:[margin:0_0_0.769rem] tw:[padding:0.769rem_1.077rem]
      tw:[border:1px_solid_#f1c4bd] tw:rounded-[0.769rem] tw:bg-[#fff6f4] tw:[&_strong]:text-[0.923rem]
      tw:[&_strong]:text-[#8f1d14] tw:[&_strong]:mr-auto" role="status"><strong>{selected.size} {selected.size === 1 ? 'resposta selecionada' : 'respostas selecionadas'}</strong><button type="button" className="v2-forms-delete tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:border-0 tw:bg-transparent
      tw:text-[#b42318] tw:[font:600_0.846rem_Inter,sans-serif] tw:cursor-pointer tw:[padding:0.462rem_0.308rem]" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Excluir</button><Button type="button" variant="formSecondary" onClick={() => setSelected(new Set())}>Limpar seleção</Button></div>}
    {error && <InlineNotice role="alert">{error}</InlineNotice>}
    {loading ? <LoadingState>Carregando respostas…</LoadingState> : !rows.length ? <EmptyState variant="workflow"><strong>Nenhuma resposta ainda.</strong><p>{form.status === 'open' ? 'Assim que alguém responder, aparece aqui.' : 'Abra o formulário para respostas e compartilhe o link.'}</p></EmptyState>
      : <FormResultsTable pinResponseColumns>
        <thead><tr>
          <th className="v2-forms-check-col tw:w-[2.769rem] tw:min-w-[2.769rem] tw:max-w-[2.769rem] tw:pl-[0.923rem]! tw:pr-[0.308rem]!
            tw:[&_input]:[accent-color:#5a1e2d] tw:[&_input]:w-[1.154rem] tw:[&_input]:h-[1.154rem] tw:[&_input]:cursor-pointer"><input type="checkbox" aria-label="Selecionar todas" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map((row) => row.id)))} /></th>
          <th className="v2-forms-edit-col" aria-label="Editar" />
          <th className="v2-forms-date-col"><button type="button" onClick={() => sortBy('date')}>Data{sortMark('date')}</button></th>
          {stages.length > 0 && <th><button type="button" onClick={() => sortBy('stage')}>Situação{sortMark('stage')}</button></th>}
          {stages.length > 0 && <th><button type="button" onClick={() => sortBy('owner')}>Responsável{sortMark('owner')}</button></th>}
          <th><button type="button" onClick={() => sortBy('contact')}>Contato{sortMark('contact')}</button></th>
          <th><button type="button" onClick={() => sortBy('note')}>Nota{sortMark('note')}</button></th>
          {columns.map((question) => <th key={question.id} title={stripRichText(question.label)}><button type="button" onClick={() => sortBy(question.id)}>{stripRichText(question.label)}{sortMark(question.id)}</button></th>)}
        </tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.id} className={selected.has(row.id) ? 'is-selected' : ''}>
          <td className="v2-forms-check-col tw:w-[2.769rem] tw:min-w-[2.769rem] tw:max-w-[2.769rem] tw:pl-[0.923rem]! tw:pr-[0.308rem]!
            tw:[&_input]:[accent-color:#5a1e2d] tw:[&_input]:w-[1.154rem] tw:[&_input]:h-[1.154rem] tw:[&_input]:cursor-pointer"><input type="checkbox" aria-label="Selecionar resposta" checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
          <td className="v2-forms-edit-col"><button type="button" className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
            tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
            tw:[&:hover]:bg-[#fbf7f3]" title="Editar resposta" aria-label="Editar resposta" onClick={() => setEditing(row)}><Pencil size={13} /></button></td>
          <td className="v2-forms-date v2-forms-date-col tw:text-[color:var(--fm-muted)]! tw:tabular-nums">{dateTime(row.submitted_at)}</td>
          {stages.length > 0 && <td><select className={`tw:border-0 tw:rounded-full tw:[padding:0.308rem_1.846rem_0.308rem_0.769rem] tw:[font:600_0.846rem_Inter,sans-serif] tw:cursor-pointer tw:bg-[#f1ece8] tw:text-[#5f544e] tw:[&.s0]:bg-[#e9f0f7] tw:[&.s0]:text-[#2c5a85] tw:[&.s1]:bg-[#fff4de] tw:[&.s1]:text-[#9b6c21] tw:[&.s2]:bg-[#f3e9ec] tw:[&.s2]:text-cali-brand tw:[&.s3]:bg-[#efe9f7] tw:[&.s3]:text-[#5b3e8a] tw:[&.s4]:bg-[#e6f6ec] tw:[&.s4]:text-[#31805a] tw:[&.s6]:bg-[#e6f6ec] tw:[&.s6]:text-[#31805a] tw:[&.s5]:bg-[#fbeae8] tw:[&.s5]:text-[#9f1f14] v2-forms-stage s${Math.max(0, stages.indexOf(row.stage || stages[0]))}`} aria-label="Situação" value={row.stage || stages[0]} onChange={(event) => void updateRow(row, { stage: event.target.value })}>{stages.map((item) => <option key={item}>{item}</option>)}</select></td>}
          {stages.length > 0 && <td><input className="v2-forms-owner tw:w-[10rem] tw:[border:1px_dashed_transparent] tw:rounded-[0.538rem] tw:bg-transparent
            tw:[padding:0.308rem_0.538rem] tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)]
            tw:[&:hover]:[border-color:#e3d6cc] tw:[&:hover]:bg-white tw:[&:hover]:outline-none tw:[&:focus]:[border-color:#e3d6cc]
            tw:[&:focus]:bg-white tw:[&:focus]:outline-none" defaultValue={row.owner || ''} placeholder="Definir" maxLength={120} onBlur={(event) => { const owner = event.target.value.trim() || null; if (owner !== (row.owner || null)) void updateRow(row, { owner }); }} onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }} /></td>}
          <td><label className={`tw:[&_input]:[accent-color:#5a1e2d] tw:[&_input]:w-[1.154rem] tw:[&_input]:h-[1.154rem] tw:[&_input]:cursor-pointer tw:inline-flex! tw:items-center tw:gap-[0.462rem] tw:[padding:0.231rem_0.769rem_0.231rem_0.462rem] tw:rounded-full tw:bg-[#fff4de] tw:text-[#9b6c21] tw:[font:600_0.846rem_Inter,sans-serif] tw:cursor-pointer tw:m-0! tw:[&.done]:bg-[#e6f6ec] tw:[&.done]:text-[#31805a] v2-forms-contact${row.contacted_at ? ' done' : ''}`} title={row.contacted_at ? `Contato marcado em ${dateTime(row.contacted_at)}` : 'Marcar que entrei em contato'}><input type="checkbox" checked={Boolean(row.contacted_at)} onChange={(event) => void setContacted(row, event.target.checked)} />{row.contacted_at ? 'Contatado' : 'Pendente'}</label></td>
          <td><button type="button" className={`tw:inline-flex tw:items-center tw:gap-[0.385rem] tw:max-w-[16.923rem] tw:[border:1px_dashed_#e3d6cc] tw:rounded-[0.538rem] tw:bg-white tw:text-[color:var(--fm-muted)] tw:[font:500_0.846rem_Inter,sans-serif] tw:[padding:0.308rem_0.692rem] tw:cursor-pointer tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap tw:[&.has]:[border-style:solid] tw:[&.has]:text-[color:var(--fm-ink)] tw:[&.has]:bg-[#fbf7f3] tw:[&:hover]:border-cali-brand tw:[&:hover]:text-cali-brand v2-forms-note${row.admin_note ? ' has' : ''}`} title={row.admin_note || 'Adicionar nota'} onClick={() => setNoteFor({ row, text: row.admin_note || '', busy: false })}><Pencil size={12} /> {row.admin_note ? (row.admin_note.length > 28 ? `${row.admin_note.slice(0, 28)}…` : row.admin_note) : 'Nota'}</button></td>
          {columns.map((question) => { const raw = row.answers[question.id]; const text = textOf(question, row); if (question.kind === 'file' && raw) return <td key={question.id}><FormResponseAttachment value={String(raw)} /></td>; return <td key={question.id} className={text ? "v2-forms-copy tw:cursor-copy tw:relative tw:pr-[2rem]! tw:[&:hover]:bg-[#f6eee8]! tw:[&:hover]:text-cali-brand tw:[&:hover_.v2-forms-copy-ico]:opacity-[.8]" : ''} title={text ? `${text}\n\nClique para copiar` : undefined} onClick={() => copy(text)}>{text || <span className="v2-forms-empty tw:text-[#c9bbb1]">—</span>}{text && <Copy size={12} className="v2-forms-copy-ico tw:absolute tw:right-[0.615rem] tw:top-[1rem] tw:opacity-[0] tw:text-cali-brand" aria-hidden="true" />}</td>; })}
        </tr>)}</tbody>
      </FormResultsTable>}
    {editing && <FormResponseEditor form={form} row={editing} onClose={() => setEditing(null)} onSaved={(saved) => { setRows((current) => current.map((item) => item.id === saved.id ? saved : item)); setEditing(null); flash('Resposta atualizada'); }} />}
    {toast && <FormFeedbackToast><Check size={14} /> {toast}</FormFeedbackToast>}
    {noteFor && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget && !noteFor.busy) setNoteFor(null); }}><WorkspaceConfirmDialog aria-label="Nota interna">
      <div><small>NOTA INTERNA · SÓ VOCÊ VÊ</small><h2>{noteFor.row.respondent_name || 'Resposta'}</h2><p>{dateTime(noteFor.row.submitted_at)}{noteFor.row.respondent_email ? ` · ${noteFor.row.respondent_email}` : ''}</p></div>
      <label>Nota<textarea rows={4} maxLength={2000} autoFocus value={noteFor.text} placeholder="Ex.: liguei em 22/10, confirmou presença." onChange={(event) => setNoteFor({ ...noteFor, text: event.target.value })} /></label>
      <footer><button type="button" disabled={noteFor.busy} onClick={() => setNoteFor(null)}>Cancelar</button><button type="button" disabled={noteFor.busy} onClick={() => void saveNote()}>{noteFor.busy ? 'Salvando…' : 'Salvar nota'}</button></footer>
    </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
    {confirmDelete && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setConfirmDelete(false); }}><WorkspaceConfirmDialog aria-label="Excluir respostas">
      <div><small>CALI FORMS</small><h2>Excluir {selected.size === 1 ? 'resposta' : `${selected.size} respostas`}?</h2><p>{rows.filter((row) => selected.has(row.id)).slice(0, 4).map((row) => row.respondent_name || dateTime(row.submitted_at)).join(', ')}{selected.size > 4 ? ` e mais ${selected.size - 4}` : ''}. Ficam na Lixeira por 30 dias e podem ser restauradas.</p></div>
      <footer><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="danger tw:border-[#b42318]! tw:bg-[#b42318]!" disabled={deleting} onClick={() => void removeSelected()}>{deleting ? 'Excluindo…' : 'Excluir'}</button></footer>
    </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </div>;
}
