import { StatusBadge } from '../../../../components/ds/StatusBadge';
import { CheckCircle2, Clock3, Cloud, Eye, FileText } from 'lucide-react';
import type { ClientDoc } from '../ClientDocumentsPage';
import { DocumentAutoCover } from '../../../../components/documents/DocumentAutoCover';
import { DocumentFolderHeader, DocumentFolderProgress, DocumentLayoutSwitch, type DocumentLibraryLayout } from '../../../../components/documents/DocumentFolderHeader';

type FolderEntry = { key: string; title: string; hint: string; docs: ClientDoc[] };

type Props = {
  title: string;
  protocol: string | null;
  entries: FolderEntry[];
  layout: DocumentLibraryLayout;
  companyBrand: { name: string; logoUrl: string };
  acknowledged: string[];
  driveConnected: boolean;
  saving: boolean;
  onBack: () => void;
  onLayout: (layout: DocumentLibraryLayout) => void;
  onSave: () => void;
  onOpen: (doc: ClientDoc) => void;
  onAcknowledge: (doc: ClientDoc) => void;
};

function FolderEntryActions({ docs, acknowledged, list, onOpen, onAcknowledge }: Pick<Props, 'acknowledged' | 'onOpen' | 'onAcknowledge'> & { docs: ClientDoc[]; list?: boolean }) {
  if (!docs.length) return null;
  const action = 'tw:inline-flex tw:h-[2.462rem] tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[0.923rem] tw:text-[0.885rem]/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand';

  return (
    <div className={`tw:flex tw:flex-col tw:gap-[0.615rem] ${list ? 'tw:items-end' : 'tw:mt-[0.615rem]'}`}>
      {docs.map((doc) => (
        <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.615rem]" key={doc.id}>
          <button type="button" className={action} onClick={() => onOpen(doc)}><Eye size={14} /> Abrir</button>
          {acknowledged.includes(doc.id)
            ? <em className="tw:inline-flex tw:items-center tw:gap-[0.385rem] tw:text-[0.846rem]/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-[#356448] tw:not-italic"><CheckCircle2 size={13} /> Confirmado</em>
            : <button type="button" className={action} title="Confirmar o recebimento deste documento" onClick={() => onAcknowledge(doc)}>Confirmar</button>}
        </span>
      ))}
    </div>
  );
}

function FolderEntryStatus({ delivered }: { delivered: boolean }) {
  return <StatusBadge variant="workflow" tone={delivered ? 'green' : 'amber'}>{delivered ? 'Entregue' : 'Em produção'}</StatusBadge>;
}

export function ClientDocumentFolder({
  title, protocol, entries, layout, companyBrand, acknowledged, driveConnected, saving,
  onBack, onLayout, onSave, onOpen, onAcknowledge,
}: Props) {
  const done = entries.filter((entry) => entry.docs.length > 0).length;
  const percentage = entries.length ? Math.round((done / entries.length) * 100) : 0;
  const row = 'tw:grid tw:grid-cols-[minmax(0,1.6fr)_10.769rem_10rem_minmax(0,1.4fr)] tw:items-center tw:gap-[1.077rem] tw:px-[1.385rem] tw:max-[51.3125rem]:grid-cols-1';

  return (
    <section className="tw:flex tw:flex-col tw:gap-[1.231rem]" aria-label={`Pasta ${title}`}>
      <DocumentFolderHeader title={title} description={`${protocol || 'ENTREGÁVEL'} · ${done} de ${entries.length} ${entries.length === 1 ? 'entregue' : 'entregues'}`} onBack={onBack}>
        {driveConnected && done > 0 && (
          <button type="button" className="tw:inline-flex tw:h-[2.769rem] tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[1.077rem] tw:text-[0.923rem]/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand tw:disabled:cursor-default tw:disabled:opacity-50" disabled={saving} onClick={onSave}>
            <Cloud size={14} /> {saving ? 'Salvando no Drive…' : 'Salvar pasta no Drive'}
          </button>
        )}
        <DocumentFolderProgress percentage={percentage} className="tw:w-[12.308rem]" />
        <DocumentLayoutSwitch label="Exibição da pasta" layout={layout} onChange={onLayout} />
      </DocumentFolderHeader>
      {layout === 'covers' ? (
        <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,19.231rem),1fr))] tw:gap-[1.231rem]">
          {entries.map((entry) => {
            const delivered = entry.docs.length > 0;
            return (
              <article key={entry.key} className="tw:flex tw:flex-col tw:overflow-hidden tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white">
                <div className={`tw:relative tw:grid tw:h-[10.154rem] tw:place-items-center ${delivered ? 'tw:bg-[#f3eeea] tw:text-cali-brand' : 'tw:bg-[repeating-linear-gradient(135deg,#f6f1ed_0_0.769rem,#f1ebe6_0.769rem_1.538rem)] tw:text-[#b5a79d]'}`}>
                  {delivered ? (companyBrand.logoUrl ? <DocumentAutoCover logo={companyBrand.logoUrl} name={companyBrand.name} /> : <FileText size={28} />) : <Clock3 size={26} />}
                  <div className="tw:absolute tw:top-[0.769rem] tw:right-[0.769rem]"><FolderEntryStatus delivered={delivered} /></div>
                </div>
                <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.462rem] tw:p-[1.231rem]">
                  <h3 className="tw:m-0 tw:line-clamp-2 tw:text-[1.115rem]/[inherit] tw:text-cali-ink tw:[overflow-wrap:anywhere]" title={entry.title}>{entry.title}</h3>
                  <small className="tw:text-[0.885rem]/[inherit] tw:text-[#8a7c74]">{entry.hint} · {entry.docs[0]?.date ?? 'ainda sem documento'}</small>
                  <FolderEntryActions docs={entry.docs} acknowledged={acknowledged} onOpen={onOpen} onAcknowledge={onAcknowledge} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="tw:overflow-hidden tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white">
          <div className={`${row} tw:bg-[#faf7f4] tw:py-[0.769rem] tw:text-[0.731rem]/[inherit] tw:font-extrabold tw:tracking-[0.06em] tw:text-[#988980] tw:uppercase`}>
            <span>Nome</span><span>Situação</span><span>Entregue em</span><span />
          </div>
          {entries.map((entry) => (
            <div key={entry.key} className={`${row} tw:border-0 tw:border-t tw:border-solid tw:border-[#f0e8e1] tw:py-4 tw:text-[0.962rem]/[inherit] tw:text-[#5f5650]`}>
              <span className={`tw:flex tw:min-w-0 tw:items-center tw:gap-[0.769rem] ${entry.docs.length ? 'tw:text-cali-brand' : 'tw:text-[#b5a79d]'}`}>
                {entry.docs.length ? <FileText size={16} className="tw:shrink-0" /> : <Clock3 size={16} className="tw:shrink-0" />}
                <strong className="tw:truncate tw:text-base/[inherit] tw:text-cali-ink">{entry.title}</strong>
              </span>
              <span><FolderEntryStatus delivered={entry.docs.length > 0} /></span>
              <span>{entry.docs[0]?.date ?? '—'}</span>
              <FolderEntryActions list docs={entry.docs} acknowledged={acknowledged} onOpen={onOpen} onAcknowledge={onAcknowledge} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
