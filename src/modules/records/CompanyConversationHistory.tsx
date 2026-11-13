import { Button } from '../../components/ds/Button';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { readCompanyConversationHistory, type HistoryEvent } from '../../api/records/history';

const filters = [
  ['', 'Todos os eventos'], ['record', 'Ocorrências'], ['delivery', 'Entregáveis'],
  ['closure', 'Encerramentos'], ['reopen', 'Reaberturas'], ['approval', 'Aprovações'], ['hours', 'Horas'],
];
const pageSize = 25;
const historyDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
});
const filterStyle = 'tw:flex tw:flex-wrap tw:items-center tw:gap-[8px]';
const subjectStyle = 'tw:cursor-pointer tw:border-0 tw:[background:none] tw:p-0 tw:text-left tw:[font-family:inherit] tw:[font-size:inherit] tw:[line-height:inherit] tw:font-bold tw:text-cali-accent tw:underline';

function Timeline({ companyId, role, staff, openRecord }: {
  companyId: string;
  role: 'admin' | 'client';
  staff: boolean;
  openRecord: (recordId: string) => void;
}) {
  const { user } = useWorkspaceAuth();
  const [filter, setFilter] = useState('');
  const history = useInfiniteQuery({
    queryKey: ['record-history', user?.id, role, staff, companyId, filter],
    initialPageParam: null as HistoryEvent | null,
    queryFn: ({ pageParam, signal }) => readCompanyConversationHistory(companyId, filter, pageParam, signal),
    getNextPageParam: (page) => page.length > pageSize ? page[pageSize - 1] : undefined,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const rows = [...new Map(history.data?.pages.flatMap((page) => page.slice(0, pageSize))
    .map((row) => [row.id, row])).values()];
  const loading = history.isPending || history.isFetchingNextPage;

  return <>
    <label className={filterStyle}>Evento <select value={filter} onChange={(event) => setFilter(event.target.value)}>
      {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <ol className="tw:mt-[12px] tw:grid tw:list-none tw:gap-[12px] tw:p-0">
      {rows.map((event) => <li className="tw:grid tw:grid-cols-[minmax(9rem,auto)_minmax(8rem,1fr)_minmax(9rem,2fr)] tw:items-baseline tw:gap-[8px] tw:[@media(max-width:600px)]:grid-cols-[1fr] tw:[@media(max-width:600px)]:gap-[4px] tw:[@media(max-width:600px)]:[border-bottom:1px_solid_var(--theme-line)] tw:[@media(max-width:600px)]:py-[8px]" key={event.id}>
        <time dateTime={event.happened_at}>{historyDate.format(new Date(event.happened_at))}</time>
        <span>{event.title}{event.minutes !== null && ` · ${event.minutes} min`}</span>
        {event.subject_type === 'record'
          ? <button className={subjectStyle} type="button" onClick={() => openRecord(event.subject_id)}>{event.subject_title}</button>
          : staff ? <strong>{event.subject_title}</strong>
            : <a className={subjectStyle} href={`${role === 'admin' ? '/admin/projetos' : '/cliente/entregaveis'}?deliverable=${encodeURIComponent(event.subject_id)}`}>{event.subject_title}</a>}
      </li>)}
    </ol>
    {history.isError && <p role="alert">Não foi possível carregar o histórico. <button type="button"
      onClick={() => void (history.isFetchNextPageError ? history.fetchNextPage() : history.refetch())}>Tentar novamente</button></p>}
    {loading && <p role="status">Carregando histórico…</p>}
    {!loading && !rows.length && !history.isError && <p>Nenhum evento neste recorte.</p>}
    {history.hasNextPage && !history.isError && <Button type="button" variant="workflowSecondary" disabled={loading}
      onClick={() => void history.fetchNextPage()}>Carregar mais</Button>}
  </>;
}

export function CompanyConversationHistory({ companyId, companies, role, staff, openRecord }: {
  companyId: string;
  companies: { id: string; name: string }[];
  role: 'admin' | 'client';
  staff: boolean;
  openRecord: (recordId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const target = companyId === 'all' ? company || companies[0]?.id : companyId;

  if (!target) return null;
  return <details className="tw:my-[14px] tw:rounded-[12px] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-[16px] tw:py-[12px]" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="tw:cursor-pointer tw:font-bold"><History className="tw:align-middle" size={16} aria-hidden="true" /> Histórico por empresa</summary>
    {open && <div className="tw:mt-[12px] tw:grid tw:gap-[12px]">
      {companyId === 'all' && <label className={filterStyle}>Empresa do histórico <select value={target} onChange={(event) => setCompany(event.target.value)}>
        {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      <Timeline key={target} companyId={target} role={role} staff={staff} openRecord={openRecord} />
    </div>}
  </details>;
}
