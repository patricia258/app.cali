import { Plus, Trash2 } from 'lucide-react';
import { formatHoursV14 } from '../../lib/reportV14';
import {
  REPORT_MANUAL_CATEGORIES,
  reportManualMinutes,
  type ManualReportDelivery,
  type ManualReportTimeEntry,
  type ReportManualComplements,
  type ReportManualStatus,
} from '../../lib/reportManualComplements';

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

  return <section className="reports-v21-manual-section">
    <div className="reports-v16-section-heading"><span>+</span><div><h2>Complementar dados do relatório</h2><p>Use apenas quando algo do período não foi registrado no Workspace a tempo. O complemento fica neste relatório e entra nos cálculos de horas.</p></div></div>
    <div className="reports-v21-manual-summary"><span className="reports-v21-manual-tag">Manual</span><strong>{total ? `${formatHoursV14(total)} complementados` : 'Nenhum complemento manual'}</strong><span>Os dados automáticos continuam sendo a fonte principal.</span></div>

    <div className="reports-v21-manual-columns">
      <div className="reports-v21-manual-group">
        <div className="reports-v21-manual-group-head"><div><h3>Entregas / atividades</h3><p>Status e tempo que precisam entrar no fechamento.</p></div><button type="button" className="secondary" disabled={locked} onClick={addDelivery}><Plus size={15}/>Adicionar</button></div>
        {value.deliveries.length ? <div className="reports-v21-manual-items">{value.deliveries.map((item) => <article key={item.id} className="reports-v21-manual-item">
          <div className="reports-v21-manual-item-top"><span className="reports-v21-manual-tag">Manual</span><button type="button" disabled={locked} onClick={() => onChange({ ...value, deliveries: value.deliveries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid">
            <label className="wide"><span>Entregável / atividade</span><input value={item.title} readOnly={locked} onChange={(event) => updateDelivery(item.id, { title: event.target.value })} placeholder="Ex.: Alinhamento de estrutura com liderança"/></label>
            <label><span>Frente</span><input value={item.workstream || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { workstream: event.target.value })} placeholder="Opcional"/></label>
            <label><span>Complexidade</span><select value={item.complexity || ''} disabled={locked} onChange={(event) => updateDelivery(item.id, { complexity: event.target.value })}><option value="">—</option><option>MC1</option><option>MC2</option><option>MC3</option></select></label>
            <label><span>Status</span><select value={item.status} disabled={locked} onChange={(event) => updateDelivery(item.id, { status: event.target.value as ReportManualStatus })}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Prazo</span><input type="date" value={item.dueDate || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { dueDate: event.target.value })}/></label>
            {item.status === 'completed' ? <label><span>Concluído em</span><input type="date" value={item.completedAt || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { completedAt: event.target.value })}/></label> : null}
            <label><span>Tempo aplicado (min)</span><input type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateDelivery(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty">Nenhuma entrega manual adicionada.</p>}
      </div>

      <div className="reports-v21-manual-group">
        <div className="reports-v21-manual-group-head"><div><h3>Tempo complementar</h3><p>Para trabalho que não precisa virar uma entrega na tabela.</p></div><button type="button" className="secondary" disabled={locked} onClick={addTime}><Plus size={15}/>Adicionar</button></div>
        {value.timeEntries.length ? <div className="reports-v21-manual-items">{value.timeEntries.map((item) => <article key={item.id} className="reports-v21-manual-item compact">
          <div className="reports-v21-manual-item-top"><span className="reports-v21-manual-tag">Manual</span><button type="button" disabled={locked} onClick={() => onChange({ ...value, timeEntries: value.timeEntries.filter((row) => row.id !== item.id) })} aria-label="Remover complemento"><Trash2 size={14}/></button></div>
          <div className="reports-v21-manual-grid">
            <label className="wide"><span>Descrição</span><input value={item.description} readOnly={locked} onChange={(event) => updateTime(item.id, { description: event.target.value })} placeholder="Ex.: análise extraordinária solicitada em reunião"/></label>
            <label><span>Categoria</span><select value={item.category} disabled={locked} onChange={(event) => updateTime(item.id, { category: event.target.value as ManualReportTimeEntry['category'] })}>{REPORT_MANUAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>Tempo (min)</span><input type="number" min="0" step="1" value={item.minutes || ''} readOnly={locked} onChange={(event) => updateTime(item.id, { minutes: n(event.target.value) })} placeholder="0"/></label>
          </div>
        </article>)}</div> : <p className="reports-v16-empty">Nenhum tempo complementar adicionado.</p>}
      </div>
    </div>
  </section>;
}
