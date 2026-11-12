import { Button } from '../../components/ds/Button';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { readCompanyConversationHistory, type HistoryEvent } from '../../api/records/history';
import './company-conversation-history.css';

const filters = [
  ['', 'Todos os eventos'], ['record', 'Ocorrências'], ['delivery', 'Entregáveis'],
  ['closure', 'Encerramentos'], ['reopen', 'Reaberturas'], ['approval', 'Aprovações'], ['hours', 'Horas'],
];
const pageSize = 25;
const historyDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
});

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
    <label>Evento <select value={filter} onChange={(event) => setFilter(event.target.value)}>
      {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <ol>
      {rows.map((event) => <li key={event.id}>
        <time dateTime={event.happened_at}>{historyDate.format(new Date(event.happened_at))}</time>
        <span>{event.title}{event.minutes !== null && ` · ${event.minutes} min`}</span>
        {event.subject_type === 'record'
          ? <button type="button" onClick={() => openRecord(event.subject_id)}>{event.subject_title}</button>
          : staff ? <strong>{event.subject_title}</strong>
            : <a href={`${role === 'admin' ? '/admin/projetos' : '/cliente/entregaveis'}?deliverable=${encodeURIComponent(event.subject_id)}`}>{event.subject_title}</a>}
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
  return <details className="company-conversation-history" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><History size={16} aria-hidden="true" /> Histórico por empresa</summary>
    {open && <div className="company-conversation-history-content">
      {companyId === 'all' && <label>Empresa do histórico <select value={target} onChange={(event) => setCompany(event.target.value)}>
        {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      <Timeline key={target} companyId={target} role={role} staff={staff} openRecord={openRecord} />
    </div>}
  </details>;
}
