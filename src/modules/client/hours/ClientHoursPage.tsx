import { Input } from '../../../components/ds/Input';
import { CompactPageHeading } from '../../../components/workspace/components/CompactPageHeading';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { capacityOf, percentLabel } from '../../../lib/capacity';
import { CapacityCard } from '../../../components/hours/CapacityCard';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { useClientHours } from './hooks/useClientHours';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { ClientHoursLedger, type ContextFilter, type FrontTone } from './components/ClientHoursLedger';
import { ClientHoursDistribution } from './components/ClientHoursDistribution';

const frontTones: FrontTone[] = ['purple', 'blue', 'green', 'gold'];


export function ClientHoursPage() {
  const { user } = useWorkspaceAuth();
  const [period, setPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const { data, isLoading: loading, error: loadError } = useClientHours(user?.id, period);
  const summary = data?.summary ?? null;
  const rows = data?.rows ?? [];
  const status = data?.status ?? { occurrence: 0, paused: false };
  const error = loadError instanceof Error ? loadError.message : loadError ? 'Não foi possível carregar as horas.' : '';

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
      <CompactPageHeading eyebrow="CONTA / ACOMPANHAMENTO EXECUTIVO" title="Horas" description="Onde a assessoria investiu tempo, o que foi realizado e o saldo do ciclo." />
      {error && <InlineNotice role="alert"><AlertTriangle size={18} />{error}</InlineNotice>}
      {summary && !summary.visible ? <EmptyState as="section" variant="workflow"><Clock3 size={24} /><strong>A visualização de horas não está habilitada para este mês.</strong><p>Os meses já liberados continuam disponíveis para consulta. Selecione outro mês abaixo.</p><label><span>Consultar mês</span><Input variant="embedded" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label></EmptyState> : summary && <>
        <div className="tw:mb-6 tw:flex tw:min-h-[3.31rem] tw:items-center tw:gap-4 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-4 tw:text-sm tw:leading-[inherit]">
          <span className="tw:font-bold tw:text-cali-brand">Período</span>
          <Input variant="embedded" className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-2.5 tw:text-sm tw:leading-[inherit] tw:text-cali-red-strong" aria-label="Consultar mês" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
          <span className="tw:ml-auto tw:flex tw:items-center tw:gap-2 tw:text-xs tw:leading-[inherit] tw:whitespace-nowrap tw:text-cali-sand-text tw:[@media(max-width:53.125rem)]:hidden"><Clock3 size={14} /> Visibilidade contratual habilitada</span>
        </div>
        <div className="tw:grid tw:grid-cols-[minmax(0,1fr)_21.54rem] tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:[@media(max-width:53.125rem)]:grid-cols-1">
          <section className="tw:min-w-0 tw:px-7 tw:pb-8">
            <CapacityCard capacity={capacity} occurrence={status.occurrence} paused={status.paused} inLedger />
            <ClientHoursLedger rows={filteredRows} filter={contextFilter} onFilter={setContextFilter} toneOf={toneOf} />
          </section>
          <ClientHoursDistribution fronts={fronts} consumption={percentLabel(capacity.usagePercent)} />
        </div>
      </>}
    </section>
  </Shell>;
}
