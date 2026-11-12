import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { supabase } from '../../../api/supabase';
import './company-conversation-history.css';

type HistoryEvent = {
  id: string;
  kind: string;
  happened_at: string;
  title: string;
  subject_type: 'record' | 'delivery';
  subject_id: string;
  subject_title: string;
  minutes: number | null;
};

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
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<HistoryEvent[]>([]);
  const [cursor, setCursor] = useState<HistoryEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    setLoading(true);
    setError('');
    void supabase.rpc('read_company_conversation_history', {
      p_company_id: companyId, p_kind: filter || null,
      p_before_at: cursor?.happened_at ?? null, p_before_id: cursor?.id ?? null,
    }).then(({ data, error: requestError }) => {
      if (!active) return;
      setLoading(false);
      if (requestError) {
        setError('Não foi possível carregar o histórico.');
        return;
      }
      const page = (data ?? []) as HistoryEvent[];
      setHasMore(page.length > pageSize);
      setRows((previous) => {
        const entries = page.slice(0, pageSize);
        return cursor ? [...previous, ...entries.filter((entry) => !previous.some((row) => row.id === entry.id))] : entries;
      });
    });
    return () => { active = false; };
  }, [companyId, cursor, filter, attempt]);

  return <>
    <label>Evento <select value={filter} onChange={(event) => {
      setRows([]);
      setHasMore(false);
      setCursor(null);
      setFilter(event.target.value);
    }}>
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
    {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></p>}
    {loading && <p role="status">Carregando histórico…</p>}
    {!loading && !rows.length && !error && <p>Nenhum evento neste recorte.</p>}
    {hasMore && !error && <button type="button" className="wf-secondary" disabled={loading}
      onClick={() => setCursor(rows.at(-1) ?? null)}>Carregar mais</button>}
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
