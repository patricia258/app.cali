import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, Download, FileDown, FileText, HardDrive, Printer } from 'lucide-react';

type BarDatum = { label: string; value: number; max: number; helper?: string; tone?: 'normal' | 'warn' | 'critical' };
type DonutDatum = { label: string; value: number; color: string };
type ExportRow = Record<string, string | number>;
type CalendarMarker = { day: number; color: string; label?: string };

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
  return <div className="horizontal-bars">{data.map((item) => { const pct = item.max > 0 ? Math.min(100, Math.round((item.value / item.max) * 100)) : 0; return <div className="bar-row" key={item.label}><div className="bar-copy"><strong>{item.label}</strong><span>{item.value.toFixed(1)}h de {item.max.toFixed(0)}h</span></div><div className="bar-track"><span className={item.tone || 'normal'} style={{ width: `${pct}%` }} /></div><strong className={`bar-percent ${item.tone || ''}`}>{pct}%</strong>{item.helper && <small>{item.helper}</small>}</div>; })}</div>;
}

export function DonutChart({ data, centerValue, centerLabel }: { data: DonutDatum[]; centerValue: string; centerLabel: string }) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  const gradient = useMemo(() => { let cursor = 0; return `conic-gradient(${data.map((item) => { const start = cursor; cursor += (item.value / total) * 360; return `${item.color} ${start}deg ${cursor}deg`; }).join(',')})`; }, [data, total]);
  return <div className="donut-layout"><div className="donut" style={{ background: gradient }}><div><strong>{centerValue}</strong><span>{centerLabel}</span></div></div><div className="donut-legend">{data.map((item) => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div>;
}

export function TrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 520, height = 190, min = Math.min(...values, 0), max = Math.max(...values, 1), range = Math.max(1, max - min);
  const points = values.map((value, index) => { const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width; const y = height - ((value - min) / range) * (height - 32) - 16; return `${x},${y}`; }).join(' ');
  return <div className="trend-chart-wrap"><svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do NPS">{[0.25, 0.5, 0.75].map((factor) => <line key={factor} x1="0" x2={width} y1={height * factor} y2={height * factor} className="chart-grid-line" />)}<polyline points={points} className="trend-line-shadow" /><polyline points={points} className="trend-line" />{values.map((value, index) => { const [x, y] = points.split(' ')[index].split(',').map(Number); return <g key={`${labels[index]}-${value}`}><circle cx={x} cy={y} r="4.5" className="trend-dot" /><text x={x} y={Math.max(14, y - 12)} textAnchor="middle" className="trend-value">{value.toFixed(1)}</text></g>; })}</svg><div className="trend-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div></div>;
}

export function MiniCalendar({ monthLabel, activeDay = 31, markers = [] }: { monthLabel: string; activeDay?: number; markers?: CalendarMarker[] }) {
  const days = Array.from({ length: 35 }, (_, index) => index - 4).map((value) => value <= 0 || value > 31 ? null : value);
  return <div className="mini-calendar"><div className="mini-calendar-head"><strong>{monthLabel}</strong><span>2026</span></div><div className="mini-weekdays">{['S','T','Q','Q','S','S','D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mini-days">{days.map((day, index) => { const marker = day ? markers.find((item) => item.day === day) : undefined; const style = marker ? ({ '--event-color': marker.color } as CSSProperties) : undefined; return <span key={index} title={marker?.label} style={style} className={`${day === activeDay ? 'active' : ''} ${marker ? 'has-event strong-event' : ''}`}>{day || ''}</span>; })}</div></div>;
}
