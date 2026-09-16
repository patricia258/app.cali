import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, Download, FileDown, FileText, HardDrive, Printer } from 'lucide-react';

type BarDatum = {
  label: string;
  value: number;
  max: number;
  helper?: string;
  tone?: 'normal' | 'warn' | 'critical';
  logoUrl?: string;
  logoText?: string;
  pacePct?: number;
  paceLabel?: string;
};
type DonutDatum = { label: string; value: number; color: string };
type ExportRow = Record<string, string | number>;
type CalendarMarker = { day: number; color: string; label?: string };
export type TrendSeries = { name: string; color: string; values: Array<number | null> };

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ title, rows, onDrive }: { title: string; rows: ExportRow[]; onDrive?: () => void }) {
  const [open, setOpen] = useState(false);
  const safeName = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  function exportCsv() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers, ...rows.map((row) => headers.map((header) => String(row[header] ?? '')))].map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(`${safeName}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8'); setOpen(false);
  }
  function exportWord() {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const table = `<table style="border-collapse:collapse;width:100%"><thead><tr>${headers.map((header) => `<th style="border:1px solid #ddd;padding:8px;text-align:left">${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td style="border:1px solid #ddd;padding:8px">${String(row[header] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    downloadBlob(`${safeName}.doc`, `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial,sans-serif"><h1>${title}</h1>${table}</body></html>`, 'application/msword'); setOpen(false);
  }
  return <div className="export-menu-wrap"><button className="secondary export-trigger" onClick={() => setOpen((current) => !current)}><Download size={17} />Exportar<ChevronDown size={15} /></button>{open && <div className="export-menu"><button onClick={exportCsv}><FileDown size={17} /><span><strong>CSV</strong><small>Dados estruturados</small></span></button><button onClick={exportWord}><FileText size={17} /><span><strong>Word</strong><small>Tabela editável</small></span></button><button onClick={() => { window.print(); setOpen(false); }}><Printer size={17} /><span><strong>PDF</strong><small>Imprimir / salvar PDF</small></span></button><button onClick={() => { setOpen(false); onDrive?.(); }}><HardDrive size={17} /><span><strong>Google Drive</strong><small>Salvar no Workspace</small></span></button></div>}</div>;
}

export function HorizontalBars({ data }: { data: BarDatum[] }) {
  return <div className="horizontal-bars hours-pace-bars">{data.map((item) => {
    const pct = item.max > 0 ? Math.min(100, Math.round((item.value / item.max) * 100)) : 0;
    const pace = Math.max(0, Math.min(100, item.pacePct ?? 0));
    return <div className="bar-row bar-row-with-client" key={item.label}>
      <div className="bar-client-identity">
        <span className="bar-client-logo">{item.logoUrl ? <img src={item.logoUrl} alt="" /> : (item.logoText || item.label.slice(0, 1))}</span>
        <div className="bar-copy"><strong>{item.label}</strong><span>{item.value.toFixed(1)}h de {item.max.toFixed(0)}h</span></div>
      </div>
      <div className="bar-track-wrap">
        <div className="bar-track">
          <span className={item.tone || 'normal'} style={{ width: `${pct}%` }} />
          {item.pacePct != null && <i className="pace-marker" style={{ left: `${pace}%` }} title={`Ritmo previsto: ${pace}%`} />}
        </div>
        <div className="bar-helper-line"><small>{item.helper}</small>{item.paceLabel && <small className="pace-copy">{item.paceLabel}</small>}</div>
      </div>
      <strong className={`bar-percent ${item.tone || ''}`}>{pct}%</strong>
    </div>;
  })}</div>;
}

export function DonutChart({ data, centerValue, centerLabel }: { data: DonutDatum[]; centerValue: string; centerLabel: string }) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  const gradient = useMemo(() => { let cursor = 0; return `conic-gradient(${data.map((item) => { const start = cursor; cursor += (item.value / total) * 360; return `${item.color} ${start}deg ${cursor}deg`; }).join(',')})`; }, [data, total]);
  return <div className="donut-layout"><div className="donut" style={{ background: gradient }}><div><strong>{centerValue}</strong><span>{centerLabel}</span></div></div><div className="donut-legend">{data.map((item) => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div>;
}

export function InteractiveTrendChart({ labels, series }: { labels: string[]; series: TrendSeries[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<{ name: string; label: string; value: number; x: number; y: number; color: string } | null>(null);
  const width = 640;
  const height = 230;
  const padX = 18;
  const padY = 22;
  const yMin = 4;
  const yMax = 5;
  const chartH = height - padY * 2;
  const chartW = width - padX * 2;

  const pointFor = (value: number, index: number) => {
    const x = labels.length <= 1 ? width / 2 : padX + (index / (labels.length - 1)) * chartW;
    const y = padY + (1 - ((value - yMin) / (yMax - yMin))) * chartH;
    return { x, y };
  };

  function toggleSeries(name: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return <div className="multi-trend-wrap" onMouseLeave={() => setHovered(null)}>
    <div className="multi-trend-chart-area">
      <svg className="multi-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução das avaliações por cliente">
        {[4, 4.25, 4.5, 4.75, 5].map((tick) => {
          const y = pointFor(tick, 0).y;
          return <g key={tick}><line x1={padX} x2={width - padX} y1={y} y2={y} className="chart-grid-line" /><text x={padX} y={Math.max(13, y - 5)} className="trend-axis-value">{tick.toFixed(2).replace(/0$/, '')}</text></g>;
        })}
        {series.map((item) => {
          if (hidden.has(item.name)) return null;
          const valid = item.values.map((value, index) => value == null ? null : ({ ...pointFor(value, index), value, index })).filter(Boolean) as Array<{ x: number; y: number; value: number; index: number }>;
          const points = valid.map((point) => `${point.x},${point.y}`).join(' ');
          return <g key={item.name}>
            {valid.length > 1 && <polyline points={points} fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />}
            {valid.map((point) => <circle key={`${item.name}-${point.index}`} cx={point.x} cy={point.y} r="5" fill="#fffdf9" stroke={item.color} strokeWidth="2.6" tabIndex={0} className="trend-hit-point" onMouseEnter={() => setHovered({ name: item.name, label: labels[point.index], value: point.value, x: point.x, y: point.y, color: item.color })} onFocus={() => setHovered({ name: item.name, label: labels[point.index], value: point.value, x: point.x, y: point.y, color: item.color })} />)}
          </g>;
        })}
      </svg>
      {hovered && <div className="trend-tooltip" style={{ left: `${(hovered.x / width) * 100}%`, top: `${(hovered.y / height) * 100}%` }}><span style={{ background: hovered.color }} /><strong>{hovered.name}</strong><small>{hovered.label} · {hovered.value.toFixed(1).replace('.', ',')}</small></div>}
    </div>
    <div className="trend-labels multi-trend-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    <div className="trend-series-legend" aria-label="Legenda das avaliações">{series.map((item) => <button type="button" key={item.name} className={hidden.has(item.name) ? 'muted' : ''} onClick={() => toggleSeries(item.name)}><span style={{ background: item.color }} />{item.name}</button>)}</div>
    <p className="trend-chart-hint">Passe o mouse sobre os pontos para ver cliente, período e nota. Clique na legenda para comparar ou ocultar uma série.</p>
  </div>;
}

export function MiniCalendar({ monthLabel, activeDay = 31, markers = [] }: { monthLabel: string; activeDay?: number; markers?: CalendarMarker[] }) {
  const days = Array.from({ length: 35 }, (_, index) => index - 4).map((value) => value <= 0 || value > 31 ? null : value);
  return <div className="mini-calendar"><div className="mini-calendar-head"><strong>{monthLabel}</strong><span>2026</span></div><div className="mini-weekdays">{['S','T','Q','Q','S','S','D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mini-days">{days.map((day, index) => { const marker = day ? markers.find((item) => item.day === day) : undefined; const style = marker ? ({ '--event-color': marker.color } as CSSProperties) : undefined; return <span key={index} title={marker?.label} style={style} className={`${day === activeDay ? 'active' : ''} ${marker ? 'has-event strong-event' : ''}`}>{day || ''}</span>; })}</div></div>;
}
