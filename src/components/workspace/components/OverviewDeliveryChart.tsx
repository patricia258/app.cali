export function OverviewDeliveryChart({ values, total, caption }: {
  values: { label: string; count: number; color: string }[];
  total: number;
  caption: string;
}) {
  const chartTotal = values.reduce((sum, value) => sum + value.count, 0);
  let start = 0;
  const stops = [];
  for (const { count, color } of values) {
    const end = start + count / chartTotal * 100;
    stops.push(`${color} ${start}% ${end}%`);
    start = end;
  }
  return <>
    <div className="tw:mx-auto tw:mt-4.5 tw:mb-3 tw:grid tw:size-48 tw:place-items-center tw:rounded-full" role="img"
      aria-label={values.map(({ label, count }) => `${label}: ${count}`).join(', ')}
      style={{ background: `conic-gradient(${stops.join(',')})` }}>
      <div className="tw:flex tw:size-[8.62rem] tw:flex-col tw:items-center tw:justify-center tw:rounded-full tw:bg-cali-neutral-surface">
        <strong className="tw:text-4xl/[inherit]">{total}</strong>
        <small className="tw:text-xs/[inherit] tw:text-cali-muted">{caption}</small>
      </div>
    </div>
    <div className="tw:flex tw:flex-col tw:gap-2.5 tw:px-2.5 tw:pt-1.5 tw:pb-3">
      {values.map(({ label, count, color }) => <span key={label} className="tw:flex tw:items-center tw:gap-2.5 tw:text-cali-neutral-accent">
        <i className="tw:size-2.5 tw:rounded-full" style={{ backgroundColor: color }} />
        {label} <strong className="tw:ml-auto">{count}</strong>
      </span>)}
    </div>
  </>;
}
