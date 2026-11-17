/* Mostra um texto jurídico (Política de Privacidade ou Termos de Uso) escrito em markdown simples:
   títulos (#, ##, ###), parágrafos, listas, tabelas e **negrito**. */
import { Fragment, type ReactNode } from 'react';
import { keysByContent } from '../../lib/keysByContent';

const bodyText = 'tw:text-cali-detail tw:leading-[1.65] tw:font-[Inter,system-ui,sans-serif] tw:text-cali-text tw:[-webkit-text-fill-color:var(--cali-color-neutral-strong)]';
const headingText = 'tw:text-cali-text tw:[-webkit-text-fill-color:var(--cali-color-burgundy-strong)]';
const listClass = 'tw:m-[0_0_10px] tw:pl-5';

function inline(text: string): ReactNode {
  return keysByContent(text.split(/(\*\*[^*]+\*\*)/g), (part) => part).map(({ item: part, key }) => part.startsWith('**') && part.endsWith('**') && part.length > 4
    ? <strong className={headingText} key={key}>{part.slice(2, -2)}</strong>
    : <Fragment key={key}>{part}</Fragment>);
}
const plain = (text: string) => text.replace(/\*\*/g, '').trim();

export function LegalDocument({ source, idPrefix, embedded = false }: {
  source: string;
  idPrefix: string;
  embedded?: boolean;
}) {
  const lines = source.split('\n');
  const out: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = `${idPrefix}-${index}`;
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('### ')) { out.push(<h4 className={`${headingText} tw:m-[14px_0_4px] tw:text-cali-detail`} key={key}>{plain(line.slice(4))}</h4>); index += 1; continue; }
    if (line.startsWith('## ')) { out.push(<h3 className={`${headingText} tw:m-[20px_0_6px] tw:text-sm`} key={key}>{plain(line.slice(3))}</h3>); index += 1; continue; }
    if (line.startsWith('# ')) {
      out.push(
        <h2
          className={`${headingText} ${embedded ? 'tw:text-base' : 'tw:text-xl'} tw:m-[0_0_10px] tw:leading-[1.3] tw:[&:not(:first-child)]:mt-7 tw:border-0 tw:[&:not(:first-child)]:border-t tw:[&:not(:first-child)]:border-solid tw:[&:not(:first-child)]:border-cali-sand-line tw:[&:not(:first-child)]:pt-[22px]`}
          key={key}
        >{plain(line.slice(2)).replace(/^\d+\.\s+/, '')}</h2>,
      );
      index += 1;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const cells = lines[index].trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-*:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      const body = rows.filter((row) => row.some(Boolean));
      const [head, ...rest] = body;
      if (!head) continue;
      out.push(
        <div className="tw:m-[6px_0_12px] tw:overflow-x-auto tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden" key={key}>
          <table className="tw:w-full tw:border-collapse tw:text-xs tw:leading-[1.65]">
            <thead><tr>{keysByContent(head, (cell) => cell).map(({ item: cell, key }) => (
              <th className="tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:p-2 tw:text-left tw:text-cali-micro tw:leading-[1.65] tw:tracking-[.05em] tw:text-cali-neutral-accent tw:uppercase" key={key}>{plain(cell)}</th>
            ))}</tr></thead>
            <tbody>{keysByContent(rest, (row) => JSON.stringify(row)).map(({ item: row, key }) => (
              <tr key={key}>{keysByContent(row, (cell) => cell).map(({ item: cell, key: cellKey }) => (
                <td className={`${bodyText} tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:p-2 tw:align-top`} key={cellKey}>{inline(cell)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*-\s+/, '')); index += 1; }
      out.push(<ul className={listClass} key={key}>{keysByContent(items, (item) => item).map(({ item, key }) => <li className={`${bodyText} tw:mb-1`} key={key}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+\.\s+/, '')); index += 1; }
      out.push(<ol className={listClass} key={key}>{keysByContent(items, (item) => item).map(({ item, key }) => <li className={`${bodyText} tw:mb-1`} key={key}>{inline(item)}</li>)}</ol>);
      continue;
    }
    out.push(<p className={`${bodyText} tw:m-[0_0_9px]`} key={key}>{inline(line)}</p>);
    index += 1;
  }
  const articleClass = embedded
    ? 'tw:border-0 tw:text-cali-caption tw:not-first:mt-[22px] tw:not-first:border-t tw:not-first:border-solid tw:not-first:border-cali-sand-line tw:not-first:pt-[18px]'
    : 'tw:mx-auto tw:max-w-[860px] tw:rounded-[14px] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-[34px] tw:py-[30px] tw:text-cali-detail tw:[@media(max-width:600px)]:px-[18px] tw:[@media(max-width:600px)]:py-[22px]';
  return <article className={`v2-legal-doc ${articleClass} tw:leading-[1.65] tw:text-cali-text`}>{out}</article>;
}
