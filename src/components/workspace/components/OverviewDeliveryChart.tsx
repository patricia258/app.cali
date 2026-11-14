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
    <div className="tw:mx-auto tw:mt-[1.08rem] tw:mb-[.77rem] tw:grid tw:size-48 tw:place-items-center tw:rounded-full" role="img"
      aria-label={values.map(({ label, count }) => `${label}: ${count}`).join(', ')}
      style={{ background: `conic-gradient(${stops.join(',')})` }}>
      <div className="tw:flex tw:size-[8.62rem] tw:flex-col tw:items-center tw:justify-center tw:rounded-full tw:bg-white">
        <strong className="tw:text-[2.31rem]/[inherit]">{total}</strong>
        <small className="tw:text-[.77rem]/[inherit] tw:text-[#857870]">{caption}</small>
      </div>
    </div>
    <div className="tw:flex tw:flex-col tw:gap-[.62rem] tw:px-[.62rem] tw:pt-[.38rem] tw:pb-[.77rem]">
      {values.map(({ label, count, color }) => <span key={label} className="tw:flex tw:items-center tw:gap-[.62rem] tw:text-[#756962]">
        <i className="tw:size-[.62rem] tw:rounded-full" style={{ backgroundColor: color }} />
        {label} <strong className="tw:ml-auto">{count}</strong>
      </span>)}
    </div>
  </>;
}
