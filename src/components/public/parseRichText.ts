type RichTextContent = { kind: 'text'; text: string }
  | { kind: 'strong' | 'italic' | 'underline'; children: RichTextPart[] }
  | { kind: 'link'; href: string; children: RichTextPart[] };
export type RichTextPart = RichTextContent & { offset: number };

const formatting = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s<>)]+)\)|(https?:\/\/[^\s<>]+)/g;

export function parseRichText(value: string, allowLinks = true): RichTextPart[] {
  const parts: RichTextPart[] = [];
  let end = 0;
  for (const match of value.matchAll(formatting)) {
    const [literal, strong, underline, italic, label, href, bare] = match;
    if (match.index > end) parts.push({ kind: 'text', text: value.slice(end, match.index), offset: end });
    end = match.index + literal.length;

    if (href && allowLinks) {
      parts.push({ kind: 'link', href, children: parseRichText(label, false), offset: match.index });
    } else if (bare && allowLinks) {
      const url = bare.replace(/[.,;:!?)]+$/, '');
      parts.push({ kind: 'link', href: url, children: [{ kind: 'text', text: url, offset: 0 }], offset: match.index });
      if (url.length < bare.length) parts.push({ kind: 'text', text: bare.slice(url.length), offset: match.index + url.length });
    } else if (strong || underline || italic) {
      parts.push({ kind: strong ? 'strong' : underline ? 'underline' : 'italic', children: parseRichText(strong || underline || italic, allowLinks), offset: match.index });
    } else {
      parts.push({ kind: 'text', text: literal, offset: match.index });
    }
  }
  if (end < value.length) parts.push({ kind: 'text', text: value.slice(end), offset: end });
  return parts;
}
