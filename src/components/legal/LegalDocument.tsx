/* Mostra um texto jurídico (Política de Privacidade ou Termos de Uso) escrito em markdown simples:
   títulos (#, ##, ###), parágrafos, listas, tabelas e **negrito**. */
import { Fragment, ReactNode } from 'react';

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') && part.length > 4
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <Fragment key={index}>{part}</Fragment>);
}
const plain = (text: string) => text.replace(/\*\*/g, '').trim();

export function LegalDocument({ source, idPrefix }: { source: string; idPrefix: string }) {
  const lines = source.split('\n');
  const out: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = `${idPrefix}-${index}`;
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('### ')) { out.push(<h4 key={key}>{plain(line.slice(4))}</h4>); index += 1; continue; }
    if (line.startsWith('## ')) { out.push(<h3 key={key}>{plain(line.slice(3))}</h3>); index += 1; continue; }
    if (line.startsWith('# ')) { out.push(<h2 key={key}>{plain(line.slice(2)).replace(/^\d+\.\s+/, '')}</h2>); index += 1; continue; }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const cells = lines[index].trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-*:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      const body = rows.filter((row) => row.some(Boolean));
      const [head, ...rest] = body;
      out.push(<div className="v2-legal-table" key={key}><table><thead><tr>{head.map((cell, i) => <th key={i}>{plain(cell)}</th>)}</tr></thead><tbody>{rest.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*-\s+/, '')); index += 1; }
      out.push(<ul key={key}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+\.\s+/, '')); index += 1; }
      out.push(<ol key={key}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ol>);
      continue;
    }
    out.push(<p key={key}>{inline(line)}</p>);
    index += 1;
  }
  return <article className="v2-legal-doc">{out}</article>;
}
