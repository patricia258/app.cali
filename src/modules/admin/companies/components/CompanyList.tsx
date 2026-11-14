import { Archive, AlertCircle, BriefcaseBusiness, Clock3, Loader2, RotateCcw, X } from 'lucide-react';
import type { ClientRow, LifecycleAction } from '../../../../domain/company';

const statusColors: Record<ClientRow['status'], string> = {
  active: 'tw:border-[#d6e8dd] tw:bg-[#eaf3ed] tw:text-[#42785a]',
  paused: 'tw:border-[#f0dfc0] tw:bg-[#fff2dc] tw:text-[#97672f]',
  archived: 'tw:border-[#f0dfc0] tw:bg-[#fff2dc] tw:text-[#97672f]',
  blocked: 'tw:border-[#f0d5d8] tw:bg-[#fae9e9] tw:text-[#b7495d]',
  closed: 'tw:border-[#f0d5d8] tw:bg-[#fae9e9] tw:text-[#b7495d]',
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
      className="tw:overflow-x-auto tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9dfd8]"
    >
      <div className="tw:min-w-[70.769rem] tw:min-[751px]:min-w-[72.308rem] tw:[--company-columns:1.45fr_1.3fr_.8fr_.45fr_.9fr_1.05fr]">
        <div className="tw:grid tw:grid-cols-(--company-columns) tw:items-center tw:gap-[1.154rem] tw:bg-[#faf7f4] tw:px-[1.308rem] tw:py-[1.154rem] tw:text-[.769rem] tw:font-extrabold tw:tracking-[.045em] tw:text-[#988980] tw:uppercase">
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
            className="tw:grid tw:min-h-[6.538rem] tw:cursor-pointer tw:grid-cols-(--company-columns) tw:items-center tw:gap-[1.154rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#f0e8e1] tw:px-[1.308rem] tw:py-[1.154rem]"
            onClick={() => onOpen(client)}
          >
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onOpen(client); }}
              className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-[.846rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left"
            >
              <span className="tw:grid tw:size-[3.308rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e1d3ca] tw:bg-[linear-gradient(145deg,#f4e9e0,#e5d4cc)] tw:font-extrabold tw:text-cali-brand">
                {client.logoUrl ? <img src={client.logoUrl} alt="" className="tw:size-full tw:object-contain" /> :
                  (client.name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || 'C')}
              </span>
              <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.385rem]">
                <strong className="tw:text-[.923rem] tw:text-[#342c29]">{client.name}</strong>
                <small className="tw:text-[.769rem] tw:text-[#978a81]">{client.service || 'Serviço a definir'}</small>
              </span>
            </button>
            <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.385rem] tw:text-[.769rem] tw:text-[#978a81]">
              <strong className="tw:text-[.923rem] tw:text-[#342c29]">{client.contact || 'Contato principal não definido'}</strong>
              <span>{[client.decisionTitle, 'decisor principal'].filter(Boolean).join(' · ')}</span>
              <span>{Number(client.primaryAccessActive) + (client.extraAccesses || []).filter((person) => person.active).length} acesso(s) habilitado(s) · principal: {client.access.toLowerCase()}</span>
            </div>
            <div className="tw:flex tw:flex-col tw:gap-[.692rem]">
              <strong>{client.hours}</strong>
              <span className="tw:h-[.462rem] tw:overflow-hidden tw:rounded-full tw:bg-[#f0e8e1]" aria-hidden="true">
                <span className="tw:block tw:h-full tw:rounded-full tw:bg-[#93606a]" style={{ width: `${client.usage}%` }} />
              </span>
            </div>
            <strong className="tw:font-extrabold tw:text-[#724b42]">{client.nps}</strong>
            <div className="tw:flex tw:flex-col tw:items-start tw:gap-[.538rem] tw:text-[.769rem]">
              <span className={`tw:rounded-full tw:border tw:border-solid tw:px-[.769rem] tw:py-[.385rem] tw:font-bold ${statusColors[client.status]}`}>{statusLabel(client.status)}</span>
              <span className="tw:text-[#978a81]">Drive {client.drive.toLowerCase()}</span>
            </div>
            <div role="group" aria-label={`Ações de ${client.name}`} className="tw:flex tw:items-center tw:gap-[.385rem]" onClick={(event) => event.stopPropagation()}>
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
      {loading && <div className="tw:flex tw:items-center tw:gap-[.615rem] tw:p-[1.846rem] tw:text-[#92857c]"><Loader2 aria-hidden="true" className="tw:size-[1.231rem] tw:animate-spin tw:motion-reduce:animate-none" /> Carregando carteira…</div>}
      {!loading && !clients.length && <p className="tw:m-0 tw:p-[1.846rem] tw:text-center tw:text-[#92857c]">{hasClients ? 'Nenhuma conta corresponde ao filtro selecionado.' : 'Nenhuma conta cadastrada.'}</p>}
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
      className="tw:grid tw:h-[2.385rem] tw:w-[2.231rem] tw:place-items-center tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#ece1d9] tw:bg-white tw:p-0 tw:text-[#7c5061] tw:hover:border-cali-gold tw:hover:bg-[#fbf5ee]"
    >
      <Icon aria-hidden="true" className="tw:size-[1.231rem]" />
    </button>
  );
}
