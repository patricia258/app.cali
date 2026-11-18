import { Archive, AlertCircle, BriefcaseBusiness, Clock3, Loader2, RotateCcw, X } from 'lucide-react';
import type { ClientRow, LifecycleAction } from '../../../../domain/company';

const statusColors: Record<ClientRow['status'], string> = {
  active: 'tw:border-cali-success-line tw:bg-cali-success-surface tw:text-cali-success',
  paused: 'tw:border-cali-warning-line tw:bg-cali-warning-surface tw:text-cali-warning',
  archived: 'tw:border-cali-warning-line tw:bg-cali-warning-surface tw:text-cali-warning',
  blocked: 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger',
  closed: 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger',
};

type CompanyListProps = {
  clients: ClientRow[];
  loading: boolean;
  hasClients: boolean;
  statusLabel: (status: ClientRow['status']) => string;
  onOpen: (client: ClientRow) => void;
  onEdit: (client: ClientRow) => void;
  onLifecycle: (client: ClientRow, action: LifecycleAction) => void;
};

export function CompanyList({ clients, loading, hasClients, statusLabel, onOpen, onEdit, onLifecycle }: CompanyListProps) {
  return (
    <div
      aria-busy={loading}
      className="tw:overflow-x-auto tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line"
    >
      <div className="tw:min-w-[70.769rem] tw:min-[751px]:min-w-[72.308rem] tw:[--company-columns:1.45fr_1.3fr_.8fr_.45fr_.9fr_1.05fr]">
        <div className="tw:grid tw:grid-cols-(--company-columns) tw:items-center tw:gap-4.5 tw:bg-cali-surface-soft tw:px-5 tw:py-4.5 tw:text-xs tw:font-extrabold tw:tracking-[.045em] tw:text-cali-muted tw:uppercase">
          <span>Cliente / contrato</span>
          <span>Decisor e acesso</span>
          <span>Horas do ciclo</span>
          <span>NPS</span>
          <span>Situação / Drive</span>
          <span>Ações</span>
        </div>
        {clients.map((client) => (
          <div
            key={client.id}
            className="tw:grid tw:min-h-[6.538rem] tw:cursor-pointer tw:grid-cols-(--company-columns) tw:items-center tw:gap-4.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-5 tw:py-4.5"
            onClick={() => onOpen(client)}
          >
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onOpen(client); }}
              className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-3.5 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left"
            >
              <span className="tw:grid tw:size-13 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(145deg,var(--cali-color-orange-surface),var(--cali-color-sand-line))] tw:font-extrabold tw:text-cali-brand">
                {client.logoUrl ? <img src={client.logoUrl} alt="" className="tw:size-full tw:object-contain" /> :
                  (client.name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || 'C')}
              </span>
              <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
                <strong className="tw:text-cali-body tw:text-cali-neutral-strong">{client.name}</strong>
                <small className="tw:text-xs tw:text-cali-sand-text">{client.service || 'Serviço a definir'}</small>
              </span>
            </button>
            <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5 tw:text-xs tw:text-cali-sand-text">
              <strong className="tw:text-cali-body tw:text-cali-neutral-strong">{client.contact || 'Contato principal não definido'}</strong>
              <span>{[client.decisionTitle, 'decisor principal'].filter(Boolean).join(' · ')}</span>
              <span>{Number(client.primaryAccessActive) + (client.extraAccesses || []).filter((person) => person.active).length} acesso(s) habilitado(s) · principal: {client.access.toLowerCase()}</span>
            </div>
            <div className="tw:flex tw:flex-col tw:gap-3">
              <strong>{client.hours}</strong>
              <span className="tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-cali-line" aria-hidden="true">
                <span className="tw:block tw:h-full tw:rounded-full tw:bg-cali-burgundy-line" style={{ width: `${client.usage}%` }} />
              </span>
            </div>
            <strong className="tw:font-extrabold tw:text-cali-sand-strong">{client.nps}</strong>
            <div className="tw:flex tw:flex-col tw:items-start tw:gap-2 tw:text-xs">
              <span className={`tw:rounded-full tw:border tw:border-solid tw:px-3 tw:py-1.5 tw:font-bold ${statusColors[client.status]}`}>{statusLabel(client.status)}</span>
              <span className="tw:text-cali-sand-text">Drive {client.drive.toLowerCase()}</span>
            </div>
            <div role="group" aria-label={`Ações de ${client.name}`} className="tw:flex tw:items-center tw:gap-1.5" onClick={(event) => event.stopPropagation()}>
              <CompanyAction label={`Editar ${client.name}`} icon={BriefcaseBusiness} onClick={() => onEdit(client)} />
              {client.status === 'paused' ?
                <CompanyAction label="Reativar" icon={RotateCcw} onClick={() => onLifecycle(client, 'reactivate')} /> :
                <CompanyAction label="Pausar temporariamente" icon={Clock3} onClick={() => onLifecycle(client, 'pause')} />}
              {client.status === 'blocked' ?
                <CompanyAction label="Desbloquear" icon={RotateCcw} onClick={() => onLifecycle(client, 'reactivate')} /> :
                <CompanyAction label="Bloquear acesso" icon={AlertCircle} onClick={() => onLifecycle(client, 'block')} />}
              <CompanyAction label="Arquivar" icon={Archive} onClick={() => onLifecycle(client, 'archive')} />
              <CompanyAction label="Encerrar contrato" icon={X} onClick={() => onLifecycle(client, 'close')} />
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="tw:flex tw:items-center tw:gap-2.5 tw:p-7.5 tw:text-cali-sand-text"><Loader2 aria-hidden="true" className="tw:size-5 tw:animate-spin tw:motion-reduce:animate-none" /> Carregando carteira…</div>}
      {!loading && !clients.length && <p className="tw:m-0 tw:p-7.5 tw:text-center tw:text-cali-sand-text">{hasClients ? 'Nenhuma conta corresponde ao filtro selecionado.' : 'Nenhuma conta cadastrada.'}</p>}
    </div>
  );
}

function CompanyAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Archive; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="tw:grid tw:h-9.5 tw:w-9 tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-0 tw:text-cali-red-strong tw:hover:border-cali-gold tw:hover:bg-cali-sand-soft"
    >
      <Icon aria-hidden="true" className="tw:size-5" />
    </button>
  );
}
