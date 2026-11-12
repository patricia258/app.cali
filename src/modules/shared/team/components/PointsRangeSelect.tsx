import type { PointsRange } from '../hooks/usePoints';

type Props = {
  pageRange: { start: string; end: string } | null;
  range: PointsRange;
  onChange: (range: PointsRange) => void;
};

export function PointsRangeSelect({ pageRange, range, onChange }: Props) {
  return (
    <select
      className="pa-range"
      aria-label="Período deste gráfico"
      value={range}
      onChange={(event) => onChange(event.target.value as PointsRange)}
    >
      {pageRange && <option value="page">Período da página</option>}
      <option value="3">Últimos 3 meses</option>
      <option value="6">Últimos 6 meses</option>
      <option value="12">Últimos 12 meses</option>
      <option value="24">Últimos 24 meses</option>
      <option value="all">Todo o histórico</option>
    </select>
  );
}
