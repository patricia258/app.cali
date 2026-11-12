import { useMemo, useState } from 'react';
import { shortMonth } from '../analyticsDates';
import type { PaPoint } from '../analyticsTypes';

export type PointsRange = 'page' | '3' | '6' | '12' | '24' | 'all';

export function usePoints(series: PaPoint[], end: string, pageRange: { start: string; end: string } | null) {
  const [range, setRange] = useState<PointsRange>(pageRange ? 'page' : '12');
  const points = useMemo(() => {
    const upTo = series.filter((point) => point.month <= (range === 'page' && pageRange ? pageRange.end : end));
    if (range === 'page' && pageRange) return upTo.filter((point) => point.month >= pageRange.start);
    return range === 'all' ? upTo : upTo.slice(-Number(range === 'page' ? 12 : range));
  }, [series, end, pageRange, range]);
  const label = points.length ? `${shortMonth(points[0].month)} a ${shortMonth(points[points.length - 1].month)}` : 'sem meses confirmados';
  return { points, range, setRange, label };
}
