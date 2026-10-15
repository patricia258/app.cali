/* Destaque do nome mencionado (@Nome Sobrenome) dentro das mensagens, em todas as conversas.
   Reconhece "@" seguido de até quatro palavras com inicial maiúscula (com "da/de/do/das/dos/e" no meio),
   que é como a lista de menção escreve o nome. Só muda a aparência; quem é avisado continua sendo decidido no banco. */
import type { ReactNode } from 'react';

const MENTION = /@[A-ZÀ-Ý][\p{L}'’-]+(?:\s+(?:(?:da|de|do|das|dos|e)\s+)?[A-ZÀ-Ý][\p{L}'’-]+){0,3}/gu;

function split(text: string) {
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), mention: false });
    parts.push({ text: match[0], mention: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts;
}

/** Para telas em React. */
export function withMentions(text: string): ReactNode[] {
  return split(text).map((part, index) => part.mention ? <span key={index} className="v2-mention">{part.text}</span> : part.text);
}

/** Para conversas montadas fora do React (texto sempre como texto, nunca como HTML). */
export function appendWithMentions(parent: HTMLElement, text: string) {
  for (const part of split(text)) {
    if (!part.mention) { parent.append(document.createTextNode(part.text)); continue; }
    const span = document.createElement('span'); span.className = 'v2-mention'; span.textContent = part.text; parent.append(span);
  }
}
