import { Fragment, type ReactNode } from 'react';
import { parseRichText, type RichTextPart } from './parseRichText';

function renderParts(parts: RichTextPart[]): ReactNode[] {
  return parts.map((part) => {
    if (part.kind === 'text') return <Fragment key={part.offset}>{part.text}</Fragment>;
    const content = renderParts(part.children);
    if (part.kind === 'link') return <a key={part.offset} href={part.href} target="_blank" rel="noopener noreferrer">{content}</a>;
    if (part.kind === 'strong') return <strong key={part.offset}>{content}</strong>;
    if (part.kind === 'underline') return <u key={part.offset}>{content}</u>;
    return <em key={part.offset}>{content}</em>;
  });
}

export function RichText({ value }: { value: string }) {
  return <>{renderParts(parseRichText(value))}</>;
}
