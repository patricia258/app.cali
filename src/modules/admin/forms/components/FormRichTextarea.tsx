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
  return <div className="v2-forms-rich tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:bg-white tw:relative tw:[&:focus-within]:border-cali-brand
    tw:[&:focus-within]:[box-shadow:0_0_0_0.231rem_rgba(90,30,45,.08)] tw:[&_textarea]:block tw:[&_textarea]:w-full
    tw:[&_textarea]:border-0! tw:[&_textarea]:shadow-none! tw:[&_textarea]:[border-radius:0_0_0.615rem_0.615rem]
    tw:[&_textarea]:[padding:0.769rem_0.846rem] tw:[&_textarea]:[font:400_1rem/1.5_Inter,sans-serif]
    tw:[&_textarea]:text-[color:var(--fm-ink)] tw:[&_textarea]:resize-y tw:[&_textarea]:outline-none
    tw:[&_textarea]:bg-white">
    <div className="v2-forms-rich-bar tw:flex tw:items-center tw:gap-[0.308rem] tw:[padding:0.462rem_0.615rem] tw:[border-bottom:1px_solid_#f0e7e0]
      tw:bg-[#fbf7f3] tw:[border-radius:0.615rem_0.615rem_0_0] tw:[&>button]:grid tw:[&>button]:place-items-center
      tw:[&>button]:w-[2.154rem] tw:[&>button]:h-[2.154rem] tw:[&>button]:[border:1px_solid_transparent]
      tw:[&>button]:rounded-[0.462rem] tw:[&>button]:bg-transparent tw:[&>button]:text-[color:var(--fm-ink)]
      tw:[&>button]:cursor-pointer tw:[&>button:hover]:bg-white tw:[&>button:hover]:[border-color:#e3d6cc]
      tw:[&>button:hover]:text-cali-brand tw:[&>button[aria-expanded=true]]:bg-white tw:[&>button[aria-expanded=true]]:[border-color:#e3d6cc]
      tw:[&>button[aria-expanded=true]]:text-cali-brand tw:[&_small]:ml-auto tw:[&_small]:text-[0.769rem]
      tw:[&_small]:text-[color:var(--fm-muted)]" role="toolbar" aria-label="Formatação">
      <button type="button" title="Negrito" aria-label="Negrito" onClick={() => apply('**')}><Bold size={14} /></button>
      <button type="button" title="Itálico" aria-label="Itálico" onClick={() => apply('*')}><Italic size={14} /></button>
      <button type="button" title="Sublinhado" aria-label="Sublinhado" onClick={() => apply('__')}><Underline size={14} /></button>
      <span className="v2-forms-rich-sep tw:w-[1px] tw:h-[1.385rem] tw:bg-[#e3d6cc] tw:[margin:0_0.308rem]" />
      <button type="button" title="Emoji" aria-label="Emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}><Smile size={14} /></button>
      <small>Selecione o trecho e clique em B, I ou U</small>
      {emojiOpen && <div className="v2-forms-emoji tw:absolute tw:top-[3.231rem] tw:left-[0.615rem] tw:z-6 tw:grid tw:grid-cols-[repeat(10,2.308rem)]
        tw:gap-[0.154rem] tw:p-[0.615rem] tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.769rem] tw:bg-white
        tw:[box-shadow:0_0.923rem_2.308rem_rgba(29,17,19,.14)] tw:[&_button]:w-[2.308rem] tw:[&_button]:h-[2.308rem]
        tw:[&_button]:border-0 tw:[&_button]:rounded-[0.462rem] tw:[&_button]:bg-transparent tw:[&_button]:text-[1.308rem]
        tw:[&_button]:cursor-pointer tw:[&_button:hover]:bg-[#fbf7f3]">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => insert(emoji)}>{emoji}</button>)}</div>}
    </div>
    <textarea ref={ref} rows={rows} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>;
}
