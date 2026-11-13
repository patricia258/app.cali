import type { PointsRange } from '../hooks/usePoints';

type Props = {
  pageRange: { start: string; end: string } | null;
  range: PointsRange;
  onChange: (range: PointsRange) => void;
};

export function PointsRangeSelect({ pageRange, range, onChange }: Props) {
  return (
    <select
      className="tw:rounded-md tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-2.25 tw:py-1.5 tw:text-[0.6875rem] tw:font-semibold tw:text-cali-brand"
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
