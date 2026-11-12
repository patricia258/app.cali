import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useMemo, useState } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO } from 'date-fns';
import { capacityOf, percentLabel } from '../../../lib/capacity';
import { CapacityCard } from '../../../components/hours/CapacityBar';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { clientHoursKey, readClientHours } from '../../../api/client/hours/extract';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

type ContextFilter = 'all' | 'deliverable' | 'project' | 'interaction';

function monthBounds(value: string) {
  const start = `${value}-01`;
  return { start, end: format(endOfMonth(parseISO(start)), 'yyyy-MM-dd') };
}

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest}min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${String(rest).padStart(2, '0')}min`;
}

export function ClientHoursPage() {
  const { user } = useWorkspaceAuth();
  const [period, setPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const { data, isLoading: loading, error: loadError } = useQuery({
    queryKey: clientHoursKey(user?.id ?? '', period),
    queryFn: user && period ? ({ signal }) => {
      const { start, end } = monthBounds(period);
      return readClientHours(user.id, start, end, signal);
    } : skipToken,
  });
  const summary = data?.summary ?? null;
  const rows = data?.rows ?? [];
  const status = data?.status ?? { occurrence: 0, paused: false };
  const plan = data?.plan ?? '';
  const planName = plan ? `CALI ${plan.charAt(0).toUpperCase()}${plan.slice(1)}` : '';
  const error = loadError instanceof Error ? loadError.message : loadError ? 'Não foi possível carregar as horas.' : '';

  const frontTones = ['purple', 'blue', 'green', 'gold'];
  const fronts = useMemo(() => {
    const totals = new Map<string, number>();
    rows.forEach((row) => { const name = row.front || 'Assessoria geral'; totals.set(name, (totals.get(name) || 0) + row.minutes); });
    const all = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, minutes], index) => ({ name, minutes, share: all ? Math.round(minutes / all * 100) : 0, tone: frontTones[index % frontTones.length] }));
  }, [rows]);
  const kindOfFilter: Record<string, string[]> = { all: [], deliverable: ['Entregável', 'Subtarefa'], project: ['Projeto'], interaction: ['Ocorrência', 'Outras'] };
  const filteredRows = useMemo(() => rows.filter((row) => contextFilter === 'all' || kindOfFilter[contextFilter].includes(row.kind)), [rows, contextFilter]);
  const toneOf = (name: string) => fronts.find((item) => item.name === name)?.tone || 'gold';
  const capacity = capacityOf(summary?.contractedHours, summary?.consumedMinutes);
  if (loading) {
    return <Shell role="client"><section className="v2-client-module"><LoadingState aria-live="polite" aria-busy="true">Carregando horas…</LoadingState></section></Shell>;
  }

  return <Shell role="client">
    <section className="v2-client-module">
      <header className="page-head"><div><div className="eyebrow">CONTA / ACOMPANHAMENTO EXECUTIVO</div><h1>Horas<span className="title-dot">.</span></h1><p>Onde a assessoria investiu tempo, o que foi realizado e o saldo do ciclo.</p></div></header>
      {error && <InlineNotice role="alert"><AlertTriangle size={18} />{error}</InlineNotice>}
      {summary && !summary.visible ? <EmptyState as="section" variant="workflow"><Clock3 size={24} /><strong>A visualização de horas não está habilitada para este mês.</strong><p>Os meses já liberados continuam disponíveis para consulta. Selecione outro mês abaixo.</p><label><span>Consultar mês</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label></EmptyState> : summary && <>
        <div className="hours-context"><span className="plan-mark">Período</span><input className="v2-hours-month" aria-label="Consultar mês" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /><span className="hours-context-end"><Clock3 size={14}/> Visibilidade contratual habilitada</span></div>
        <div className="hours-ledger">
          <section className="ledger-main">
            <CapacityCard capacity={capacity} plan={planName} occurrence={status.occurrence} paused={status.paused} month={new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-15T12:00:00`)).replace(/^./, (c) => c.toUpperCase())} />
            <div className="ledger-header"><h2>Onde o tempo foi investido</h2><span>{filteredRows.length} {filteredRows.length === 1 ? 'item neste período' : 'itens neste período'}</span><label className="ledger-filter">Tipo<select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as ContextFilter)}><option value="all">Todos</option><option value="deliverable">Entregáveis e subtarefas</option><option value="project">Projeto</option><option value="interaction">Ocorrências e outras</option></select></label></div>
            {filteredRows.length === 0 ? <EmptyState variant="workflow">Nenhum registro de horas neste período.</EmptyState> : <div className="ledger-table v2-ledger-v2">
              <div className="ledger-row ledger-heading"><span>Projeto</span><span>Tarefa</span><span>Tipo</span><span>Frente</span><span>Protocolo</span><span>Duração</span></div>
              {filteredRows.map((row) => <div className="ledger-row" key={JSON.stringify([row.kind, row.project, row.title, row.protocol, row.front])}>
                <span className="ledger-project">{row.project || '—'}</span><span className="ledger-title"><strong>{row.title}</strong></span><span className={`v2-ledger-kind k-${row.kind.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`}>{row.kind === 'Outras' ? 'Assessoria' : row.kind}</span><span>{row.front ? <span className={`chip v2-front-tag v2-front-${toneOf(row.front)}`}>{row.front}</span> : '—'}</span><span className="ledger-protocol">{row.protocol || '—'}</span><strong>{formatMinutes(row.minutes)}</strong>
              </div>)}
            </div>}
          </section>
          <aside className="ledger-side"><div className="side-title">COMO LER ESTE EXTRATO</div><h2>Tempo dedicado a decisões que importam.</h2><p>As horas registram atividades executadas pela CALI. Você acompanha o que foi feito, sem editar os lançamentos.</p><div className="side-rule"/><span className="side-title">DISTRIBUIÇÃO POR FRENTE</span>{fronts.length ? fronts.map((item) => <div key={item.name} className="distribution"><span><i className={`v2-front-dot ${item.tone}`}/>{item.name}</span><strong>{item.share}%</strong></div>) : <div className="distribution"><span>Sem lançamentos neste mês</span><strong>—</strong></div>}<div className="distribution"><span>Consumo mensal</span><strong>{percentLabel(capacity.usagePercent)}</strong></div><div className="side-foot">Todo o tempo dedicado à sua empresa entra no consumo. O extrato mostra em quê foi investido, somado por item.</div></aside>
        </div>
      </>}
    </section>
  </Shell>;
}
