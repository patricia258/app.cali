import { Button } from '../../../../components/ds/Button';
import { Plus, Trash2 } from 'lucide-react';
import { ReportSectionHeading } from './ReportSectionHeading';
import { formatHoursV14 } from '../../../../lib/reportCloseMetrics';
import {
  REPORT_MANUAL_CATEGORIES,
  reportManualMinutes,
  type ManualReportDelivery,
  type ManualReportTimeEntry,
  type ReportManualComplements,
  type ReportManualStatus,
} from '../../../../lib/reportManualComplements';

type Props = {
  value: ReportManualComplements;
  onChange: (value: ReportManualComplements) => void;
  locked?: boolean;
};

const STATUS_OPTIONS: Array<{ value: ReportManualStatus; label: string }> = [
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'client_review', label: 'Aguardando validação' },
  { value: 'adjustment', label: 'Em ajuste' },
  { value: 'not_started', label: 'Não iniciado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function n(value: string) { const parsed = Math.round(Number(value || 0)); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }

export function ReportManualComplementsPanel({ value, onChange, locked = false }: Props) {
  const total = reportManualMinutes(value);

  function updateDelivery(id: string, patch: Partial<ManualReportDelivery>) {
    onChange({ ...value, deliveries: value.deliveries.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }
  function updateTime(id: string, patch: Partial<ManualReportTimeEntry>) {
    onChange({ ...value, timeEntries: value.timeEntries.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }
  function addDelivery() {
    onChange({ ...value, deliveries: [...value.deliveries, { id: uid('delivery'), title: '', workstream: '', complexity: '', status: 'in_progress', dueDate: '', completedAt: '', minutes: 0 }] });
  }
  function addTime() {
    onChange({ ...value, timeEntries: [...value.timeEntries, { id: uid('time'), description: '', category: 'Outros', minutes: 0 }] });
  }

  return <section className="reports-v21-manual-section tw:mt-5.5 tw:rounded-[1.23077rem] tw:border tw:border-solid
    tw:border-[color:var(--theme-line,var(--border-subtle,rgb(var(--cali-rgb-burgundy-accent)/0.1)))] tw:bg-[var(--theme-surface-soft,var(--surface-elevated,var(--cali-color-sand-surface)))]
    tw:px-7.5 tw:py-7 tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))]
    tw:max-[640px]:p-5 tw:workspace-night:border-cali-burgundy-surface/10 tw:workspace-night:bg-cali-surface">
    <ReportSectionHeading
      number="+"
      title="Complementar dados do relatório"
      description="Use apenas quando algo do período não foi registrado no Workspace a tempo. O complemento fica neste relatório e entra nos cálculos de horas."
    />
    <div className="reports-v21-manual-summary tw:mt-0.5 tw:mb-5.5 tw:flex tw:flex-wrap tw:items-center
      tw:gap-3 tw:text-base tw:text-[color:var(--theme-muted,var(--text-secondary,var(--cali-color-neutral-accent)))]
      tw:workspace-night:text-cali-muted"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
      tw:border-cali-gold/38 tw:bg-cali-gold/9 tw:px-2 tw:py-1 tw:text-xs
      tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-cali-gold-text tw:uppercase">Manual</span><strong className="tw:text-base tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))] tw:workspace-night:text-cali-text">{total ? `${formatHoursV14(total)} complementados` : 'Nenhum complemento manual'}</strong><span>Os dados automáticos continuam sendo a fonte principal.</span></div>

    <div className="reports-v21-manual-columns tw:grid tw:grid-cols-[1.2fr_0.8fr] tw:items-start tw:gap-5.5 tw:max-[980px]:grid-cols-1">
      <div className="reports-v21-manual-group tw:min-w-0 tw:rounded-2xl tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgb(var(--cali-rgb-burgundy-accent)/0.1)))]
        tw:bg-[var(--theme-surface,var(--surface,var(--cali-color-sand-surface)))] tw:p-5 tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))]
        tw:workspace-night:border-cali-burgundy-surface/10 tw:workspace-night:bg-cali-surface">
        <div className="reports-v21-manual-group-head tw:mb-3.5 tw:flex tw:items-start tw:justify-between tw:gap-4.5 tw:max-[640px]:flex-col"><div><h3 className="tw:m-0 tw:text-lg tw:leading-[calc(1.25/0.875)] tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))] tw:workspace-night:text-cali-text">Entregas / atividades</h3><p className="tw:mt-1 tw:mb-0 tw:text-cali-body tw:leading-[calc(1/0.75)] tw:leading-[1.45] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))]
          tw:workspace-night:text-cali-muted">Status e tempo que precisam entrar no fechamento.</p></div><Button className="tw:inline-flex! tw:h-auto! tw:min-h-0! tw:items-center! tw:gap-2! tw:rounded-lg!
          tw:border! tw:border-solid! tw:border-cali-line-strong! tw:bg-cali-neutral-surface! tw:px-3.5! tw:py-2.5!
          tw:text-sm! tw:font-bold! tw:whitespace-nowrap! tw:text-cali-brand!" type="button" variant="secondary" disabled={locked} onClick={addDelivery}><Plus size={15}/>Adicionar</Button></div>
        {value.deliveries.length ? <div className="reports-v21-manual-items tw:grid tw:gap-3">{value.deliveries.map((item) => <article key={item.id} className="reports-v21-manual-item tw:rounded-cali-panel tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgb(var(--cali-rgb-burgundy-accent)/0.1)))]
          tw:bg-[var(--theme-surface-muted,var(--surface-elevated,var(--cali-color-neutral-soft)))] tw:p-3.5 tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))]
          tw:workspace-night:border-cali-burgundy-surface/10 tw:workspace-night:bg-cali-surface-muted">
          <div className="reports-v21-manual-item-top tw:mb-3 tw:flex tw:items-center tw:justify-between"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
            tw:border-cali-gold/38 tw:bg-cali-gold/9 tw:px-2 tw:py-1 tw:text-xs
            tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-cali-gold-text tw:uppercase">Manual</span><button className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-1 tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))]
            tw:hover:text-cali-red-text tw:disabled:cursor-not-allowed" type="button" disabled={locked} onClick={() => onChange({ ...value, deliveries: value.deliveries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid tw:grid tw:grid-cols-3 tw:gap-x-3.5 tw:gap-y-3 tw:max-[980px]:grid-cols-2 tw:max-[640px]:grid-cols-1">
            <label className="wide tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted tw:col-span-2 tw:max-[640px]:col-auto"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Entregável / atividade</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.title} readOnly={locked} onChange={(event) => updateDelivery(item.id, { title: event.target.value })} placeholder="Ex.: Alinhamento de estrutura com liderança"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Frente</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.workstream || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { workstream: event.target.value })} placeholder="Opcional"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Complexidade</span><select className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.complexity || ''} disabled={locked} onChange={(event) => updateDelivery(item.id, { complexity: event.target.value })}><option value="">—</option><option>MC1</option><option>MC2</option><option>MC3</option></select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Status</span><select className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.status} disabled={locked} onChange={(event) => updateDelivery(item.id, { status: event.target.value as ReportManualStatus })}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Prazo</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" type="date" value={item.dueDate || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { dueDate: event.target.value })}/></label>
            {item.status === 'completed' ? <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Concluído em</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" type="date" value={item.completedAt || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { completedAt: event.target.value })}/></label> : null}
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Tempo aplicado (min)</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty tw:m-0 tw:text-cali-detail tw:text-cali-muted">Nenhuma entrega manual adicionada.</p>}
      </div>

      <div className="reports-v21-manual-group tw:min-w-0 tw:rounded-2xl tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgb(var(--cali-rgb-burgundy-accent)/0.1)))]
        tw:bg-[var(--theme-surface,var(--surface,var(--cali-color-sand-surface)))] tw:p-5 tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))]
        tw:workspace-night:border-cali-burgundy-surface/10 tw:workspace-night:bg-cali-surface">
        <div className="reports-v21-manual-group-head tw:mb-3.5 tw:flex tw:items-start tw:justify-between tw:gap-4.5 tw:max-[640px]:flex-col"><div><h3 className="tw:m-0 tw:text-lg tw:leading-[calc(1.25/0.875)] tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))] tw:workspace-night:text-cali-text">Tempo complementar</h3><p className="tw:mt-1 tw:mb-0 tw:text-cali-body tw:leading-[calc(1/0.75)] tw:leading-[1.45] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))]
          tw:workspace-night:text-cali-muted">Para trabalho que não precisa virar uma entrega na tabela.</p></div><Button className="tw:inline-flex! tw:h-auto! tw:min-h-0! tw:items-center! tw:gap-2! tw:rounded-lg!
          tw:border! tw:border-solid! tw:border-cali-line-strong! tw:bg-cali-neutral-surface! tw:px-3.5! tw:py-2.5!
          tw:text-sm! tw:font-bold! tw:whitespace-nowrap! tw:text-cali-brand!" type="button" variant="secondary" disabled={locked} onClick={addTime}><Plus size={15}/>Adicionar</Button></div>
        {value.timeEntries.length ? <div className="reports-v21-manual-items tw:grid tw:gap-3">{value.timeEntries.map((item) => <article key={item.id} className="reports-v21-manual-item compact tw:rounded-cali-panel tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgb(var(--cali-rgb-burgundy-accent)/0.1)))]
          tw:bg-[var(--theme-surface-muted,var(--surface-elevated,var(--cali-color-neutral-soft)))] tw:p-3.5 tw:text-[color:var(--theme-text,var(--text-primary,var(--cali-color-neutral-strong)))]
          tw:workspace-night:border-cali-burgundy-surface/10 tw:workspace-night:bg-cali-surface-muted">
          <div className="reports-v21-manual-item-top tw:mb-3 tw:flex tw:items-center tw:justify-between"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
            tw:border-cali-gold/38 tw:bg-cali-gold/9 tw:px-2 tw:py-1 tw:text-xs
            tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-cali-gold-text tw:uppercase">Manual</span><button className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-1 tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))]
            tw:hover:text-cali-red-text tw:disabled:cursor-not-allowed" type="button" disabled={locked} onClick={() => onChange({ ...value, timeEntries: value.timeEntries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid tw:grid tw:grid-cols-3 tw:gap-x-3.5 tw:gap-y-3 tw:max-[980px]:grid-cols-2 tw:max-[640px]:grid-cols-1">
            <label className="wide tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted tw:col-span-2 tw:max-[640px]:col-auto"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Descrição</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.description} readOnly={locked} onChange={(event) => updateTime(item.id, { description: event.target.value })} placeholder="Ex.: análise extraordinária solicitada em reunião"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Categoria</span><select className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" value={item.category} disabled={locked} onChange={(event) => updateTime(item.id, { category: event.target.value as ManualReportTimeEntry['category'] })}>{REPORT_MANUAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-bold tw:tracking-[0.06em] tw:text-cali-muted"><span className="tw:text-sm tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,var(--cali-color-sand-text)))] tw:uppercase tw:workspace-night:text-cali-muted">Tempo (min)</span><input className="tw:box-border! tw:h-11! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-lg!
              tw:border! tw:border-solid! tw:border-cali-input-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-0! tw:text-cali-body!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-cali-text! tw:shadow-none!" type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateTime(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty tw:m-0 tw:text-cali-detail tw:text-cali-muted">Nenhum tempo complementar adicionado.</p>}
      </div>
    </div>
  </section>;
}
