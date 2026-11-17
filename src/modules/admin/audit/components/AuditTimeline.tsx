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
  Acesso: 'tw:bg-cali-blue-surface! tw:text-cali-blue-accent!',
  Horas: 'tw:bg-cali-warning-surface! tw:text-cali-warning!',
  Relatórios: 'tw:bg-cali-violet-surface! tw:text-cali-violet-text!',
  Agenda: 'tw:bg-cali-success-surface! tw:text-cali-success!',
  Equipe: 'tw:bg-cali-danger-surface! tw:text-cali-brand!',
};

function AuditEntryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:overflow-hidden tw:text-sm/[inherit] tw:text-ellipsis tw:text-cali-text tw:max-[53.8125rem]:col-start-2">
      <small className="tw:text-xs/[inherit] tw:text-cali-muted">{label}</small>
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
    <section aria-label="Registros da auditoria" className="v2-audit-list tw:mt-5 tw:flex tw:flex-col tw:gap-5.5">
      {groups.map(({ title, protocol, entries }) => (
        <section key={title}>
          <h2 className="tw:mt-0 tw:mb-2.5 tw:flex tw:items-center tw:gap-3.5 tw:text-sm/[inherit] tw:font-bold tw:tracking-[0.031rem] tw:text-cali-muted tw:first-letter:uppercase">
            <span className="tw:first-letter:uppercase">{title}</span>
            {protocol && <button type="button" className="tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:py-1.5 tw:text-xs/[inherit] tw:font-bold tw:tracking-normal tw:text-cali-brand" onClick={() => onOpen(protocol)}>Ver trilha completa</button>}
          </h2>
          <div className="tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface">
            {entries.map((entry) => (
              <div
                className="tw:grid tw:grid-cols-[3.538rem_7.385rem_minmax(0,2.2fr)_repeat(3,minmax(0,1fr))]
                  tw:items-center tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface
                  tw:px-5 tw:py-5 tw:text-left tw:text-sm/[inherit] tw:text-cali-muted
                  tw:hover:bg-cali-surface-soft tw:max-[53.8125rem]:grid-cols-[3.538rem_minmax(0,1fr)]
                  tw:max-[53.8125rem]:gap-y-2.5 tw:max-[43.8125rem]:p-4"
                key={entry.id}
              >
                <time className="tw:text-sm/[1.5] tw:font-bold tw:text-cali-brand" dateTime={entry.at}>
                  {entry.day && <>{entry.day}<br /></>}{entry.time}
                </time>
                <StatusBadge variant="workflow" className={`tw:justify-self-start ${areaTone[entry.area] ?? 'tw:bg-cali-surface-muted! tw:text-cali-muted!'}`}>{entry.area}</StatusBadge>
                <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:max-[53.8125rem]:col-start-2">
                  <strong className="tw:text-cali-body/[inherit] tw:text-cali-text">{entry.action}</strong>
                  {entry.detail && <small className="tw:text-xs/[inherit] tw:text-cali-muted tw:[overflow-wrap:anywhere]">{entry.detail}</small>}
                </div>
                <AuditEntryField label="Protocolo">
                  {entry.protocol ? <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-sm/[inherit] tw:font-bold tw:text-cali-brand tw:underline tw:decoration-cali-line-strong tw:underline-offset-[0.231rem] tw:[overflow-wrap:anywhere] tw:hover:decoration-cali-brand" title="Ver tudo o que aconteceu com este item" onClick={() => onOpen(entry.protocol)}>{entry.protocol}</button> : '—'}
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
