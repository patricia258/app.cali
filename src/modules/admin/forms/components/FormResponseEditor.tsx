import { WorkspaceDialogOverlay } from '../../../../components/workspace/components/WorkspaceDialogOverlay';
import type { JsonValue } from '../../../../domain/json';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { saveFormResponseAnswers,
  uploadAdminFormAttachment, type FormResponse as ResponseRow,
} from '../../../../api/forms/admin';
import { type FormQuestion, type FormRecord, isAnswerable, stripRichText } from '../../../forms/formModel';
import { dateTime, errorText, scaleOptions } from '../formDetails';
import { FormResponseAttachment } from './FormResponseAttachment';
import './form-response-editor-motion.css';

function responseAttachmentPath(formId: string, filename: string) {
    const safe = filename.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'arquivo';
    return `${formId}/admin/${crypto.randomUUID()}/${Date.now()}-${safe}`;
}

/** Edição pela administradora: completa ou corrige uma resposta (ex.: pitch e foto enviados por fora). */
export function FormResponseEditor({ form, row, onClose, onSaved }: { form: FormRecord; row: ResponseRow; onClose: () => void; onSaved: (row: ResponseRow) => void }) {
  const [answers, setAnswers] = useState<Record<string, JsonValue>>({ ...row.answers });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const questions = form.questions.filter(isAnswerable);
  const set = (id: string, value: JsonValue | undefined) => setAnswers((current) => { const next = { ...current }; if (value === '' || value === undefined || (Array.isArray(value) && !value.length)) delete next[id]; else next[id] = value; return next; });

  async function attach(question: FormQuestion, file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError('O arquivo passa de 25 MB.'); return; }
    setUploading(question.id); setError('');
    const path = responseAttachmentPath(form.id, file.name);
    const { error: uploadError } = await uploadAdminFormAttachment(path, file);
    setUploading('');
    if (uploadError) { setError(`Não foi possível anexar: ${uploadError.message}`); return; }
    set(question.id, path);
  }

  async function save() {
    setBusy(true); setError('');
    const nameQuestion = questions.find((question) => question.kind === 'name');
    const emailQuestion = questions.find((question) => question.kind === 'email');
    const email = emailQuestion && typeof answers[emailQuestion.id] === 'string' ? String(answers[emailQuestion.id]).trim().toLowerCase() : row.respondent_email;
    const name = nameQuestion && typeof answers[nameQuestion.id] === 'string' ? String(answers[nameQuestion.id]).trim() : row.respondent_name;
    const respondent_name = row.respondent_name && name && row.respondent_name.startsWith(name) ? row.respondent_name : name || null;
    const { data, error: saveError } = await saveFormResponseAnswers(row.id, { answers, respondent_email: email || null, respondent_name });
    setBusy(false);
    if (saveError || !data) { setError(errorText(saveError, 'Não foi possível salvar.')); return; }
    onSaved(data as ResponseRow);
  }

  function field(question: FormQuestion) {
    const value = answers[question.id];
    const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    switch (question.kind) {
      case 'long_text': return <textarea rows={5} value={text} onChange={(event) => set(question.id, event.target.value)} />;
      case 'single_choice': case 'yes_no': { const options = question.kind === 'yes_no' ? ['Sim', 'Não'] : question.options || []; return <select value={text} onChange={(event) => set(question.id, event.target.value)}><option value="">—</option>{[...options, ...(text && !options.includes(text) ? [text] : [])].map((option) => <option key={option}>{option}</option>)}</select>; }
      case 'scale': return <select value={text} onChange={(event) => set(question.id, event.target.value === '' ? '' : Number(event.target.value))}><option value="">—</option>{scaleOptions(question).map((option) => <option key={option}>{option}</option>)}</select>;
      case 'multi_choice': { const chosen = Array.isArray(value) ? value.map(String) : []; return <div className="v2-forms-edit-checks tw:flex tw:flex-wrap tw:[gap:0.462rem_1.077rem] tw:[&_label]:inline-flex
        tw:[&_label]:items-center tw:[&_label]:gap-[0.462rem] tw:[&_label]:text-[0.923rem] tw:[&_label]:text-[#3e3533]
        tw:[&_input]:[accent-color:#5a1e2d]">{(question.options || []).map((option) => <label key={option}><input type="checkbox" checked={chosen.includes(option)} onChange={(event) => set(question.id, event.target.checked ? [...chosen, option] : chosen.filter((item) => item !== option))} />{option}</label>)}</div>; }
      case 'file': return <div className="v2-forms-edit-file tw:flex tw:items-center tw:gap-[0.769rem] tw:flex-wrap tw:[&_label]:cursor-pointer">{text ? <><FormResponseAttachment value={text} /><button type="button" className="v2-forms-delete tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:border-0 tw:bg-transparent
        tw:text-[#b42318] tw:[font:600_0.846rem_Inter,sans-serif] tw:cursor-pointer tw:[padding:0.462rem_0.308rem]" onClick={() => set(question.id, '')}><Trash2 size={13} /> Remover</button></> : <span className="v2-forms-empty tw:text-[#c9bbb1]">Nenhum arquivo</span>}<label className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
        tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
        tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
        tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default"><input type="file" hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,video/*,audio/*" onChange={(event) => void attach(question, event.target.files?.[0])} />{uploading === question.id ? 'Anexando…' : text ? 'Trocar arquivo' : 'Anexar arquivo'}</label></div>;
      case 'date': return <input type="date" value={text} onChange={(event) => set(question.id, event.target.value)} />;
      case 'number': return <input inputMode="decimal" value={text} onChange={(event) => { const raw = event.target.value.replace(',', '.'); set(question.id, raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : event.target.value); }} />;
      default: return <input value={text} onChange={(event) => set(question.id, event.target.value)} />;
    }
  }

  return <WorkspaceDialogOverlay alignment="drawer" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <DialogFrame className="v2-forms-drawer tw:w-[min(43.077rem,100vw)] tw:h-[100vh] tw:bg-[#fffdfb] tw:[border-left:1px_solid_#eadfd6]
      tw:[box-shadow:-1.538rem_0_4.615rem_rgba(29,17,19,.18)] tw:flex tw:flex-col tw:motion-safe:[animation:form-response-editor-enter_.22s_ease-out]
      tw:[&>header]:flex tw:[&>header]:gap-[0.923rem] tw:[&>header]:items-start tw:[&>header]:[padding:1.692rem_1.846rem_1.231rem]
      tw:[&>header]:[border-bottom:1px_solid_#f0e7e0] tw:[&>header>div]:flex-1 tw:[&>header_small]:text-[0.769rem]
      tw:[&>header_small]:font-bold tw:[&>header_small]:tracking-[.12em] tw:[&>header_small]:text-cali-gold
      tw:[&>header_h2]:text-[1.538rem] tw:[&>header_h2]:text-cali-brand tw:[&>header_h2]:[margin:0.462rem_0_0.308rem]
      tw:[&>header_p]:m-0 tw:[&>header_p]:text-[0.923rem] tw:[&>header_p]:text-[#8c7e74] tw:[&>header_p]:leading-[1.5]
      tw:[&>header_button]:grid tw:[&>header_button]:place-items-center tw:[&>header_button]:w-[2.615rem]
      tw:[&>header_button]:h-[2.615rem] tw:[&>header_button]:[border:1px_solid_#eadfd6] tw:[&>header_button]:rounded-[0.615rem]
      tw:[&>header_button]:bg-white tw:[&>header_button]:cursor-pointer tw:[&>header_button]:text-[#3e3533]
      tw:[&>.v2-forms-error]:[margin:0_1.846rem_0.769rem] tw:[&>footer]:flex tw:[&>footer]:justify-end
      tw:[&>footer]:gap-[0.769rem] tw:[&>footer]:[padding:1.077rem_1.846rem] tw:[&>footer]:[border-top:1px_solid_#f0e7e0]
      tw:[&>footer]:bg-white" as="aside" aria-label="Editar resposta">
      <header><div><small>EDITAR RESPOSTA · {dateTime(row.submitted_at)}</small><h2>{row.respondent_name || 'Resposta'}</h2><p>Complete ou corrija o que chegou por fora (texto, foto, arquivo). Fica registrado como resposta desta pessoa.</p></div><button type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></button></header>
      <div className="v2-forms-drawer-body tw:flex-1 tw:overflow-y-auto tw:[padding:1.231rem_1.846rem] tw:flex tw:flex-col tw:gap-[1.077rem]">{questions.map((question) => <div className="v2-forms-edit-field tw:[&>span]:block tw:[&>span]:text-[0.846rem] tw:[&>span]:font-semibold tw:[&>span]:text-[#3e3533]
        tw:[&>span]:mb-[0.462rem] tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:w-full
        tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:[border:1px_solid_#e3d6cc]
        tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:rounded-[0.615rem] tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:[padding:0.692rem_0.846rem]
        tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:[font:400_1rem/1.45_Inter,sans-serif]
        tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:text-[#3e3533] tw:[&_:is(input:not([type=checkbox]):not([type=file]),select,textarea)]:bg-white
        tw:[&_:is(input,select,textarea):focus]:outline-none tw:[&_:is(input,select,textarea):focus]:border-cali-brand
        tw:[&_:is(input,select,textarea):focus]:[box-shadow:0_0_0_0.231rem_rgba(90,30,45,.08)]" key={question.id}><span>{stripRichText(question.label)}</span>{field(question)}</div>)}</div>
      {error && <p className="v2-forms-error tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem]
        tw:font-semibold tw:bg-[#fff6f4] tw:text-[#b42318] tw:[border:1px_solid_#f1c4bd]" role="alert">{error}</p>}
      <footer><Button type="button" variant="formSecondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="button" variant="workflowPrimary" disabled={busy || Boolean(uploading)} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar resposta'}</Button></footer>
    </DialogFrame>
  </WorkspaceDialogOverlay>;
}
