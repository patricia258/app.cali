import type { MutableRefObject } from 'react';
import { Check, Paperclip, X } from 'lucide-react';
import { GuidedInput, GuidedTextarea } from '../../../../components/ds/GuidedField';
import { useObjectUrl } from '../../../../hooks/useObjectUrl';
import { FILE_ACCEPT, FILE_HINT, fileLabel, scaleRange, type FormAnswer, type FormQuestion } from '../../../forms/formModel';
import { questionnaire as ui } from '../questionnaireStyles';

export type PublicQuestionUpload = { busy: boolean; name: string; image?: File; error?: string };

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function PublicQuestionAnswer({
  item, value, upload, inputRef, onAnswer, onToggle, onChooseFile, onRemove,
}: {
  item: FormQuestion;
  value: FormAnswer | undefined;
  upload: PublicQuestionUpload | undefined;
  inputRef: MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onAnswer: (value: FormAnswer, autoAdvance?: boolean) => void;
  onToggle: (option: string) => void;
  onChooseFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const text = typeof value === 'string' ? value : value === undefined ? '' : String(value);
  const preview = useObjectUrl(upload?.image);
  switch (item.kind) {
    case 'statement': return null;
    case 'long_text':
      return <GuidedTextarea ref={(node) => { inputRef.current = node; }} rows={3} value={text} maxLength={5000} placeholder="Digite sua resposta aqui…" onKeyDown={(event) => { if (event.key === 'Enter' && event.shiftKey) event.stopPropagation(); }} onChange={(event) => onAnswer(event.target.value)} />;
    case 'single_choice': case 'multi_choice': case 'yes_no': {
      const options = item.kind === 'yes_no' ? ['Sim', 'Não'] : item.options ?? [];
      const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
      const horizontal = item.kind === 'yes_no';
      return <div className={`tw:mt-6.5 tw:flex tw:max-w-130 tw:gap-2.5 ${ui.indent} ${horizontal ? 'tw:flex-row tw:flex-wrap' : 'tw:flex-col'}`} role={item.kind === 'multi_choice' ? 'group' : 'radiogroup'}>
        {item.kind === 'multi_choice' && <p className="tw:mx-0 tw:mt-0 tw:mb-0.5 tw:text-cali-detail tw:text-cali-muted!">Escolha quantas quiser</p>}
        {options.map((option, position) => <button type="button" key={option} role={item.kind === 'multi_choice' ? 'checkbox' : 'radio'} aria-checked={selected.includes(option)} className={`tw:flex tw:items-center tw:gap-3 tw:rounded-cali-panel tw:border tw:border-solid tw:px-3.5 tw:py-3 tw:text-left tw:font-cali-body tw:text-sm! tw:leading-[1.35] tw:font-medium tw:cursor-pointer tw:[transition:background_.15s,border-color_.15s,transform_.1s] tw:active:scale-[.99] ${horizontal ? 'tw:min-w-37.5 tw:w-auto' : 'tw:w-full'} ${selected.includes(option) ? 'tw:border-cali-brand tw:bg-cali-brand! tw:text-cali-neutral-surface!' : 'tw:border-cali-brand/28! tw:bg-cali-neutral-surface/70! tw:text-cali-brand!'}`} onClick={() => item.kind === 'multi_choice' ? onToggle(option) : onAnswer(option, true)}>
          <kbd className="tw:inline-grid tw:size-6.5 tw:flex-none tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-current tw:font-cali-body tw:text-xs tw:leading-[normal] tw:font-bold tw:opacity-85">{LETTERS[position]}</kbd><span className="tw:flex-1">{option}</span>{selected.includes(option) && <Check size={18} aria-hidden="true" />}
        </button>)}
      </div>;
    }
    case 'scale': {
      const range = scaleRange(item);
      return <div className={`tw:mt-7 ${ui.indent}`}><div className="tw:grid tw:gap-2 tw:max-[641px]:gap-[5px] tw:max-[641px]:has-[button:nth-child(7)]:grid-cols-6!" role="radiogroup" style={{ gridTemplateColumns: `repeat(${range.length}, minmax(0, 1fr))` }}>
        {range.map((number) => <button type="button" role="radio" aria-checked={value === number} key={number} className={`tw:h-13.5 tw:rounded-cali-panel tw:border tw:border-solid tw:font-cali-body tw:text-sm! tw:leading-[normal] tw:font-semibold tw:cursor-pointer tw:[transition:background_.15s,border-color_.15s] tw:max-[641px]:h-[46px] tw:max-[641px]:rounded-lg ${value === number ? 'tw:border-cali-brand tw:bg-cali-brand! tw:text-cali-neutral-surface!' : 'tw:border-cali-brand/28! tw:bg-cali-neutral-surface/70! tw:text-cali-brand!'}`} onClick={() => onAnswer(number, true)}>{number}</button>)}
      </div>{(item.minLabel || item.maxLabel) && <div className="tw:mt-2.5 tw:flex tw:justify-between tw:gap-4 tw:text-cali-detail tw:text-cali-muted!"><span>{item.minLabel}</span><span>{item.maxLabel}</span></div>}</div>;
    }
    case 'file': {
      const state = upload;
      const hasFile = typeof value === 'string' && value;
      return <div className={`tw:mt-7 tw:max-w-130 ${ui.indent}`}>
        {hasFile || state?.busy ? <div className={`tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-cali-brand/28 tw:bg-cali-neutral-surface tw:px-3 tw:py-2.5 ${state?.busy ? 'tw:opacity-70' : ''}`}>
          {preview ? <img src={preview} alt="" className="tw:size-13 tw:rounded-lg tw:object-cover" /> : <span className="tw:grid tw:size-13 tw:place-items-center tw:rounded-lg tw:bg-cali-red-surface tw:text-cali-brand"><Paperclip size={20} /></span>}
          <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5"><strong className="tw:truncate tw:text-sm tw:text-cali-text">{state?.name || fileLabel(String(value))}</strong><small className="tw:text-xs tw:font-medium tw:text-cali-muted">{state?.busy ? 'Enviando…' : 'Arquivo pronto'}</small></span>
          {!state?.busy && <button type="button" aria-label="Remover arquivo" className="tw:grid tw:size-8 tw:place-items-center tw:rounded-lg tw:border-0 tw:bg-cali-day-canvas tw:text-cali-text tw:cursor-pointer" onClick={onRemove}><X size={16} /></button>}
        </div> : <label className="tw:flex tw:flex-col tw:items-center tw:gap-1.5 tw:rounded-[0.875rem] tw:border-[0.09375rem] tw:border-dashed tw:border-cali-brand/35 tw:bg-cali-neutral-surface/60 tw:px-4.5 tw:py-6.5 tw:text-center tw:text-cali-brand tw:cursor-pointer tw:[transition:background_.15s,border-color_.15s] tw:hover:border-cali-brand tw:hover:bg-cali-neutral-surface">
          <input className="tw:pointer-events-none tw:absolute tw:size-px tw:opacity-0" type="file" accept={FILE_ACCEPT[item.accept || 'any']} onChange={(event) => onChooseFile(event.target.files?.[0])} />
          <Paperclip size={22} /><strong className="tw:text-base">Escolher arquivo</strong><small className="tw:text-xs tw:font-medium tw:text-cali-muted">{FILE_HINT[item.accept || 'any']}</small>
        </label>}
        {state?.error && <p className={ui.error} role="alert">{state.error}</p>}
      </div>;
    }
    case 'date':
      return <GuidedInput ref={(node) => { inputRef.current = node; }} type="date" value={text} onChange={(event) => onAnswer(event.target.value)} />;
    case 'number':
      return <GuidedInput ref={(node) => { inputRef.current = node; }} inputMode="decimal" value={text} placeholder="Digite um número" onChange={(event) => { const raw = event.target.value.replace(',', '.'); onAnswer(raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : event.target.value); }} />;
    default: {
      const type = item.kind === 'email' ? 'email' : item.kind === 'phone' ? 'tel' : 'text';
      const auto = item.kind === 'email' ? 'email' : item.kind === 'phone' ? 'tel' : item.kind === 'name' ? 'name' : 'off';
      return <GuidedInput ref={(node) => { inputRef.current = node; }} type={type} autoComplete={auto} value={text} maxLength={item.kind === 'short_text' || item.kind === 'name' ? 300 : 200} placeholder={item.kind === 'email' ? 'nome@empresa.com' : item.kind === 'phone' ? '(11) 90000-0000' : 'Digite sua resposta aqui…'} onChange={(event) => onAnswer(event.target.value)} />;
    }
  }
}
