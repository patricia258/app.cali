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

  return <section className="reports-v21-manual-section tw:mt-[1.38462rem] tw:rounded-[1.23077rem] tw:border tw:border-solid
    tw:border-[color:var(--theme-line,var(--border-subtle,rgba(90,30,45,.10)))] tw:bg-[var(--theme-surface-soft,var(--surface-elevated,#fffdf9))]
    tw:px-[1.84615rem] tw:py-[1.69231rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))]
    tw:max-[640px]:p-[1.23077rem] tw:workspace-night:border-[#efd8de1a] tw:workspace-night:bg-[#21191d]">
    <ReportSectionHeading
      number="+"
      title="Complementar dados do relatório"
      description="Use apenas quando algo do período não foi registrado no Workspace a tempo. O complemento fica neste relatório e entra nos cálculos de horas."
    />
    <div className="reports-v21-manual-summary tw:mt-[0.15385rem] tw:mb-[1.38462rem] tw:flex tw:flex-wrap tw:items-center
      tw:gap-[0.76923rem] tw:text-[1rem] tw:text-[color:var(--theme-muted,var(--text-secondary,#756a66))]
      tw:workspace-night:text-[#b7aaa5]"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
      tw:border-[#b58c5261] tw:bg-[#b58c5217] tw:px-[0.53846rem] tw:py-[0.23077rem] tw:text-[0.76923rem]
      tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-[#9a7441] tw:uppercase">Manual</span><strong className="tw:text-[1rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))] tw:workspace-night:text-[#f3eeeb]">{total ? `${formatHoursV14(total)} complementados` : 'Nenhum complemento manual'}</strong><span>Os dados automáticos continuam sendo a fonte principal.</span></div>

    <div className="reports-v21-manual-columns tw:grid tw:grid-cols-[1.2fr_0.8fr] tw:items-start tw:gap-[1.38462rem] tw:max-[980px]:grid-cols-1">
      <div className="reports-v21-manual-group tw:min-w-0 tw:rounded-[1rem] tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgba(90,30,45,.10)))]
        tw:bg-[var(--theme-surface,var(--surface,#fffdf9))] tw:p-[1.23077rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))]
        tw:workspace-night:border-[#efd8de1a] tw:workspace-night:bg-[#241b1f]">
        <div className="reports-v21-manual-group-head tw:mb-[0.92308rem] tw:flex tw:items-start tw:justify-between tw:gap-[1.07692rem] tw:max-[640px]:flex-col"><div><h3 className="tw:m-0 tw:text-[1.07692rem] tw:leading-[calc(1.25/0.875)] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))] tw:workspace-night:text-[#f3eeeb]">Entregas / atividades</h3><p className="tw:mt-[0.30769rem] tw:mb-0 tw:text-[0.92308rem] tw:leading-[calc(1/0.75)] tw:leading-[1.45] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))]
          tw:workspace-night:text-[#b7aaa5]">Status e tempo que precisam entrar no fechamento.</p></div><Button className="tw:inline-flex! tw:h-auto! tw:min-h-0! tw:items-center! tw:gap-[0.46154rem]! tw:rounded-[0.53846rem]!
          tw:border! tw:border-solid! tw:border-[#dec9c3]! tw:bg-white! tw:px-[0.92308rem]! tw:py-[0.61538rem]!
          tw:text-[0.84615rem]! tw:font-bold! tw:whitespace-nowrap! tw:text-cali-brand!" type="button" variant="secondary" disabled={locked} onClick={addDelivery}><Plus size={15}/>Adicionar</Button></div>
        {value.deliveries.length ? <div className="reports-v21-manual-items tw:grid tw:gap-[0.76923rem]">{value.deliveries.map((item) => <article key={item.id} className="reports-v21-manual-item tw:rounded-[0.69231rem] tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgba(90,30,45,.10)))]
          tw:bg-[var(--theme-surface-muted,var(--surface-elevated,#f5eee8))] tw:p-[0.92308rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))]
          tw:workspace-night:border-[#efd8de1a] tw:workspace-night:bg-[#2a2024]">
          <div className="reports-v21-manual-item-top tw:mb-[0.76923rem] tw:flex tw:items-center tw:justify-between"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
            tw:border-[#b58c5261] tw:bg-[#b58c5217] tw:px-[0.53846rem] tw:py-[0.23077rem] tw:text-[0.76923rem]
            tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-[#9a7441] tw:uppercase">Manual</span><button className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-[0.30769rem] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))]
            tw:hover:text-[#8b4855] tw:disabled:cursor-not-allowed" type="button" disabled={locked} onClick={() => onChange({ ...value, deliveries: value.deliveries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid tw:grid tw:grid-cols-3 tw:gap-x-[0.92308rem] tw:gap-y-[0.76923rem] tw:max-[980px]:grid-cols-2 tw:max-[640px]:grid-cols-1">
            <label className="wide tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870] tw:col-span-2 tw:max-[640px]:col-auto"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Entregável / atividade</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.title} readOnly={locked} onChange={(event) => updateDelivery(item.id, { title: event.target.value })} placeholder="Ex.: Alinhamento de estrutura com liderança"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Frente</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.workstream || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { workstream: event.target.value })} placeholder="Opcional"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Complexidade</span><select className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.complexity || ''} disabled={locked} onChange={(event) => updateDelivery(item.id, { complexity: event.target.value })}><option value="">—</option><option>MC1</option><option>MC2</option><option>MC3</option></select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Status</span><select className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.status} disabled={locked} onChange={(event) => updateDelivery(item.id, { status: event.target.value as ReportManualStatus })}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Prazo</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" type="date" value={item.dueDate || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { dueDate: event.target.value })}/></label>
            {item.status === 'completed' ? <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Concluído em</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" type="date" value={item.completedAt || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { completedAt: event.target.value })}/></label> : null}
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Tempo aplicado (min)</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhuma entrega manual adicionada.</p>}
      </div>

      <div className="reports-v21-manual-group tw:min-w-0 tw:rounded-[1rem] tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgba(90,30,45,.10)))]
        tw:bg-[var(--theme-surface,var(--surface,#fffdf9))] tw:p-[1.23077rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))]
        tw:workspace-night:border-[#efd8de1a] tw:workspace-night:bg-[#241b1f]">
        <div className="reports-v21-manual-group-head tw:mb-[0.92308rem] tw:flex tw:items-start tw:justify-between tw:gap-[1.07692rem] tw:max-[640px]:flex-col"><div><h3 className="tw:m-0 tw:text-[1.07692rem] tw:leading-[calc(1.25/0.875)] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))] tw:workspace-night:text-[#f3eeeb]">Tempo complementar</h3><p className="tw:mt-[0.30769rem] tw:mb-0 tw:text-[0.92308rem] tw:leading-[calc(1/0.75)] tw:leading-[1.45] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))]
          tw:workspace-night:text-[#b7aaa5]">Para trabalho que não precisa virar uma entrega na tabela.</p></div><Button className="tw:inline-flex! tw:h-auto! tw:min-h-0! tw:items-center! tw:gap-[0.46154rem]! tw:rounded-[0.53846rem]!
          tw:border! tw:border-solid! tw:border-[#dec9c3]! tw:bg-white! tw:px-[0.92308rem]! tw:py-[0.61538rem]!
          tw:text-[0.84615rem]! tw:font-bold! tw:whitespace-nowrap! tw:text-cali-brand!" type="button" variant="secondary" disabled={locked} onClick={addTime}><Plus size={15}/>Adicionar</Button></div>
        {value.timeEntries.length ? <div className="reports-v21-manual-items tw:grid tw:gap-[0.76923rem]">{value.timeEntries.map((item) => <article key={item.id} className="reports-v21-manual-item compact tw:rounded-[0.69231rem] tw:border tw:border-solid tw:border-[color:var(--theme-line,var(--border-subtle,rgba(90,30,45,.10)))]
          tw:bg-[var(--theme-surface-muted,var(--surface-elevated,#f5eee8))] tw:p-[0.92308rem] tw:text-[color:var(--theme-text,var(--text-primary,#2b2b2b))]
          tw:workspace-night:border-[#efd8de1a] tw:workspace-night:bg-[#2a2024]">
          <div className="reports-v21-manual-item-top tw:mb-[0.76923rem] tw:flex tw:items-center tw:justify-between"><span className="reports-v21-manual-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-full tw:border tw:border-solid
            tw:border-[#b58c5261] tw:bg-[#b58c5217] tw:px-[0.53846rem] tw:py-[0.23077rem] tw:text-[0.76923rem]
            tw:leading-[1.1] tw:font-bold tw:tracking-[0.055em] tw:text-[#9a7441] tw:uppercase">Manual</span><button className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-[0.30769rem] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))]
            tw:hover:text-[#8b4855] tw:disabled:cursor-not-allowed" type="button" disabled={locked} onClick={() => onChange({ ...value, timeEntries: value.timeEntries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid tw:grid tw:grid-cols-3 tw:gap-x-[0.92308rem] tw:gap-y-[0.76923rem] tw:max-[980px]:grid-cols-2 tw:max-[640px]:grid-cols-1">
            <label className="wide tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870] tw:col-span-2 tw:max-[640px]:col-auto"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Descrição</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.description} readOnly={locked} onChange={(event) => updateTime(item.id, { description: event.target.value })} placeholder="Ex.: análise extraordinária solicitada em reunião"/></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Categoria</span><select className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" value={item.category} disabled={locked} onChange={(event) => updateTime(item.id, { category: event.target.value as ManualReportTimeEntry['category'] })}>{REPORT_MANUAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="tw:grid tw:min-w-0 tw:gap-[0.38462rem] tw:text-[0.73077rem] tw:font-bold tw:tracking-[0.06em] tw:text-[#857870]"><span className="tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.055em] tw:text-[color:var(--theme-muted,var(--text-muted,#8b8180))] tw:uppercase tw:workspace-night:text-[#b7aaa5]">Tempo (min)</span><input className="tw:box-border! tw:h-[2.76923rem]! tw:min-h-0! tw:w-full! tw:min-w-0! tw:rounded-[0.53846rem]!
              tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:px-[0.76923rem]! tw:py-0! tw:text-[0.92308rem]!
              tw:leading-[calc(1/0.75)]! tw:leading-[1.3] tw:font-normal! tw:text-[#322f2c]! tw:shadow-none!" type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateTime(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhum tempo complementar adicionado.</p>}
      </div>
    </div>
  </section>;
}
