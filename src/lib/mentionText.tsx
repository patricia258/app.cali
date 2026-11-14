/* Destaque do nome mencionado (@Nome Sobrenome) dentro das mensagens, em todas as conversas.
   Reconhece "@" seguido de até quatro palavras com inicial maiúscula (com "da/de/do/das/dos/e" no meio),
   que é como a lista de menção escreve o nome. Só muda a aparência; quem é avisado continua sendo decidido no banco. */
import type { ReactNode } from 'react';

const MENTION = /@[A-ZÀ-Ý][\p{L}'’-]+(?:\s+(?:(?:da|de|do|das|dos|e)\s+)?[A-ZÀ-Ý][\p{L}'’-]+){0,3}/gu;

function split(text: string) {
  const parts: { text: string; mention: boolean; offset: number }[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), mention: false, offset: last });
    parts.push({ text: match[0], mention: true, offset: start });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false, offset: last });
  return parts;
}

/** Para telas em React. */
export function withMentions(text: string): ReactNode[] {
  return split(text).map((part) => part.mention ? <span key={part.offset} className="tw:rounded-sm tw:bg-cali-gold/20 tw:px-0.5 tw:font-semibold tw:text-inherit">{part.text}</span> : part.text);
}
