import { Textarea } from '../../../../components/ds/Textarea';
import { useRef, useState } from 'react';
import { Bold, Italic, Smile, Underline } from 'lucide-react';

const EMOJIS = ['😊', '🙂', '🙏', '💬', '✨', '🌱', '🍂', '💡', '📌', '✅', '📝', '📊', '🤝', '❤️', '👏', '🎯', '⏱️', '🔒', '📅', '👉'];

/** Caixa de texto com negrito, itálico, sublinhado e emoji. Guarda marcação simples (**, *, __) que a página pública converte. */
export function FormRichTextarea({ value, onChange, rows, maxLength, placeholder }: { value: string; onChange: (value: string) => void; rows: number; maxLength: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  function apply(before: string, after = before) {
    const area = ref.current; if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || 'texto';
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }
  function insert(text: string) {
    const area = ref.current; const start = area?.selectionStart ?? value.length; const end = area?.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${text}${value.slice(end)}`.slice(0, maxLength)); setEmojiOpen(false);
    requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(start + text.length, start + text.length); });
  }
  return <div className="v2-forms-rich tw:[border:1px_solid_var(--cali-color-sand-line)] tw:rounded-cali-compact-control tw:bg-cali-neutral-surface tw:relative tw:[&:focus-within]:border-cali-brand
    tw:[&:focus-within]:[box-shadow:0_0_0_0.231rem_rgb(var(--cali-rgb-burgundy-accent)/0.08)]">
    <div className="v2-forms-rich-bar tw:flex tw:items-center tw:gap-1 tw:[padding:0.462rem_0.615rem] tw:[border-bottom:1px_solid_var(--cali-color-neutral-soft)]
      tw:bg-cali-surface-soft tw:[border-radius:0.615rem_0.615rem_0_0] tw:[&>button]:grid tw:[&>button]:place-items-center
      tw:[&>button]:w-8.5 tw:[&>button]:h-8.5 tw:[&>button]:[border:1px_solid_transparent]
      tw:[&>button]:rounded-lg tw:[&>button]:bg-transparent tw:[&>button]:text-[color:var(--fm-ink)]
      tw:[&>button]:cursor-pointer tw:[&>button:hover]:bg-cali-neutral-surface tw:[&>button:hover]:[border-color:var(--cali-color-sand-line)]
      tw:[&>button:hover]:text-cali-brand tw:[&>button[aria-expanded=true]]:bg-cali-neutral-surface tw:[&>button[aria-expanded=true]]:[border-color:var(--cali-color-sand-line)]
      tw:[&>button[aria-expanded=true]]:text-cali-brand tw:[&_small]:ml-auto tw:[&_small]:text-xs
      tw:[&_small]:text-[color:var(--fm-muted)]" role="toolbar" aria-label="Formatação">
      <button type="button" title="Negrito" aria-label="Negrito" onClick={() => apply('**')}><Bold size={14} /></button>
      <button type="button" title="Itálico" aria-label="Itálico" onClick={() => apply('*')}><Italic size={14} /></button>
      <button type="button" title="Sublinhado" aria-label="Sublinhado" onClick={() => apply('__')}><Underline size={14} /></button>
      <span className="v2-forms-rich-sep tw:w-[1px] tw:h-5.5 tw:bg-cali-input-line tw:[margin:0_0.308rem]" />
      <button type="button" title="Emoji" aria-label="Emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}><Smile size={14} /></button>
      <small>Selecione o trecho e clique em B, I ou U</small>
      {emojiOpen && <div className="v2-forms-emoji tw:absolute tw:top-13 tw:left-2.5 tw:z-6 tw:grid tw:grid-cols-[repeat(10,2.308rem)]
        tw:gap-0.5 tw:p-2.5 tw:[border:1px_solid_var(--cali-color-sand-line)] tw:rounded-xl tw:bg-cali-neutral-surface
        tw:[box-shadow:0_0.923rem_2.308rem_rgb(var(--cali-rgb-neutral-inverse)/0.14)] tw:[&_button]:w-9 tw:[&_button]:h-9
        tw:[&_button]:border-0 tw:[&_button]:rounded-lg tw:[&_button]:bg-transparent tw:[&_button]:text-xl
        tw:[&_button]:cursor-pointer tw:[&_button:hover]:bg-cali-surface-soft">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => insert(emoji)}>{emoji}</button>)}</div>}
    </div>
    <Textarea variant="bare" className="tw:block tw:w-full tw:resize-y tw:rounded-b-cali-compact-control tw:px-3.5! tw:py-3! tw:text-cali-body/[1.5]! tw:focus:outline-none" ref={ref} rows={rows} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>;
}
