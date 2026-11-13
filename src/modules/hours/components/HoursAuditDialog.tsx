import { History, X } from 'lucide-react';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useHourEntryAudit } from '../hooks/useHourEntryAudit';

export function HoursAuditDialog({ onClose, formatMinutes }: { onClose: () => void; formatMinutes: (minutes: number) => string }) {
  const audit = useHourEntryAudit();

  return <div className="tw:fixed tw:inset-0 tw:z-[30000] tw:grid tw:place-items-center tw:bg-[#2019197a] tw:p-4 tw:backdrop-blur-[0.3125rem]">
    <DialogFrame aria-label="Auditoria de horas" className="tw:max-h-[calc(100dvh-3rem)] tw:w-full tw:max-w-[35rem] tw:overflow-auto tw:rounded-[1.375rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:shadow-2xl">
      <header className="tw:flex tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-6 tw:pt-6 tw:pb-4">
        <span className="tw:grid tw:size-[2.625rem] tw:shrink-0 tw:place-items-center tw:rounded-xl tw:bg-[#f7eeeb] tw:text-cali-brand"><History size={21} aria-hidden="true" /></span>
        <div>
          <h2 className="tw:m-0 tw:mb-1.5 tw:text-[1.375rem]">Auditoria de horas</h2>
          <p className="tw:m-0 tw:text-cali-muted">Edições e exclusões ficam preservadas com justificativa, usuário e data/hora.</p>
        </div>
        <Button type="button" variant="close" className="tw:ml-auto tw:shrink-0" onClick={onClose} aria-label="Fechar auditoria"><X size={19} /></Button>
      </header>
      <div className="tw:grid tw:gap-2.5 tw:px-6 tw:py-5">
        {audit.isPending && <LoadingState>Carregando auditoria…</LoadingState>}
        {audit.error && <InlineNotice tone="danger">{audit.error.message} <Button type="button" variant="secondary" onClick={() => void audit.refetch()}>Tentar novamente</Button></InlineNotice>}
        {audit.data?.length === 0 && <p>Nenhuma edição ou exclusão registrada.</p>}
        {audit.data?.map((row) => {
          const deleted = row.event_type === 'hours_entry_deleted';
          const entry = deleted ? row.metadata?.deleted_entry : row.metadata?.after;
          return <article key={row.id} className="tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:px-3.5 tw:py-3">
            <header className="tw:mb-1 tw:flex tw:justify-between tw:gap-3"><strong className="tw:text-cali-accent">{deleted ? 'Lançamento excluído' : 'Lançamento editado'}</strong><small className="tw:text-cali-muted">{new Date(row.created_at).toLocaleString('pt-BR')}</small></header>
            <p className="tw:my-1">{entry?.description || 'Lançamento de horas'} · {formatMinutes(entry?.minutes ?? 0)}</p>
            <small className="tw:text-cali-muted">Justificativa: {row.metadata?.reason || '—'}</small>
          </article>;
        })}
      </div>
      <footer className="tw:flex tw:justify-end tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-6 tw:pt-4 tw:pb-5">
        <Button type="button" variant="primary" onClick={onClose}>Fechar</Button>
      </footer>
    </DialogFrame>
  </div>;
}
