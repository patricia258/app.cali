import { StatusBadge } from '../../../../components/ds/StatusBadge';
import type { ReactNode } from 'react';
import { Button } from '../../../../components/ds/Button';

type Entry = {
  id: string;
  at: string;
  day?: string;
  time: string;
  actor: string;
  company: string;
  area: string;
  action: string;
  detail: string;
  protocol: string;
};

type Group = { title: string; protocol?: string; entries: Entry[] };

const areaTone: Record<string, string> = {
  Acesso: 'tw:bg-[#eaf5fa]! tw:text-[#34799a]!',
  Horas: 'tw:bg-[#fff4de]! tw:text-[#9b6c21]!',
  Relatórios: 'tw:bg-[#f5effb]! tw:text-[#7b56a0]!',
  Agenda: 'tw:bg-[#e6f6ec]! tw:text-[#31805a]!',
  Equipe: 'tw:bg-[#f6edf0]! tw:text-cali-brand!',
};

function AuditEntryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.231rem] tw:overflow-hidden tw:text-[0.846rem]/[inherit] tw:text-ellipsis tw:text-[#322f2c] tw:max-[53.8125rem]:col-start-2">
      <small className="tw:text-[0.769rem]/[inherit] tw:text-[#96867c]">{label}</small>
      {children}
    </span>
  );
}

export function AuditTimeline({ groups, remaining, onOpen, onMore }: {
  groups: Group[];
  remaining: number;
  onOpen: (protocol: string) => void;
  onMore: () => void;
}) {
  return (
    <section aria-label="Registros da auditoria" className="v2-audit-list tw:mt-[1.231rem] tw:flex tw:flex-col tw:gap-[1.385rem]">
      {groups.map(({ title, protocol, entries }) => (
        <section key={title}>
          <h2 className="tw:mt-0 tw:mb-[0.615rem] tw:flex tw:items-center tw:gap-[0.923rem] tw:text-[0.846rem]/[inherit] tw:font-bold tw:tracking-[0.031rem] tw:text-[#8c7e74] tw:first-letter:uppercase">
            <span className="tw:first-letter:uppercase">{title}</span>
            {protocol && <button type="button" className="tw:cursor-pointer tw:rounded-[0.462rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[0.692rem] tw:py-[0.385rem] tw:text-[0.769rem]/[inherit] tw:font-bold tw:tracking-normal tw:text-cali-brand" onClick={() => onOpen(protocol)}>Ver trilha completa</button>}
          </h2>
          <div className="tw:overflow-hidden tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e8dfd7] tw:bg-white">
            {entries.map((entry) => (
              <div
                className="tw:grid tw:grid-cols-[3.538rem_7.385rem_minmax(0,2.2fr)_repeat(3,minmax(0,1fr))]
                  tw:items-center tw:gap-[1.077rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0eae5] tw:bg-white
                  tw:px-[1.231rem] tw:py-[1.308rem] tw:text-left tw:text-[0.846rem]/[inherit] tw:text-[#756961]
                  tw:hover:bg-[#fbf8f5] tw:max-[53.8125rem]:grid-cols-[3.538rem_minmax(0,1fr)]
                  tw:max-[53.8125rem]:gap-y-[0.615rem] tw:max-[43.8125rem]:p-4"
                key={entry.id}
              >
                <time className="tw:text-[0.846rem]/[1.5] tw:font-bold tw:text-cali-brand" dateTime={entry.at}>
                  {entry.day && <>{entry.day}<br /></>}{entry.time}
                </time>
                <StatusBadge variant="workflow" className={`tw:justify-self-start ${areaTone[entry.area] ?? 'tw:bg-[#f3ece6]! tw:text-[#67574c]!'}`}>{entry.area}</StatusBadge>
                <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.231rem] tw:max-[53.8125rem]:col-start-2">
                  <strong className="tw:text-[0.923rem]/[inherit] tw:text-[#322f2c]">{entry.action}</strong>
                  {entry.detail && <small className="tw:text-[0.769rem]/[inherit] tw:text-[#96867c] tw:[overflow-wrap:anywhere]">{entry.detail}</small>}
                </div>
                <AuditEntryField label="Protocolo">
                  {entry.protocol ? <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[0.846rem]/[inherit] tw:font-bold tw:text-cali-brand tw:underline tw:decoration-[#d9c9c0] tw:underline-offset-[0.231rem] tw:[overflow-wrap:anywhere] tw:hover:decoration-cali-brand" title="Ver tudo o que aconteceu com este item" onClick={() => onOpen(entry.protocol)}>{entry.protocol}</button> : '—'}
                </AuditEntryField>
                <AuditEntryField label="Quem">{entry.actor}</AuditEntryField>
                <AuditEntryField label="Empresa">{entry.company}</AuditEntryField>
              </div>
            ))}
          </div>
        </section>
      ))}
      {remaining > 0 && <Button type="button" variant="workflowSecondary" className="tw:self-center" onClick={onMore}>Mostrar mais ({remaining} restantes)</Button>}
    </section>
  );
}
