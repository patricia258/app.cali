export function SatisfactionDateFilter({ label, value, onChange, start }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  start?: boolean;
}) {
  return (
    <label className={`tw:inline-flex tw:flex-none tw:items-center tw:gap-2 tw:text-[.77rem] tw:leading-[inherit] tw:font-bold tw:text-[#67574c] tw:[@media(max-width:40rem)]:flex-[1_1_45%] ${start ? 'tw:[@media(width>73.75rem)]:ml-auto' : ''}`}>
      {label}
      <input className="tw:h-[2.77rem] tw:w-[10.154rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-normal tw:text-[#322f2c] tw:[@media(max-width:40rem)]:min-w-0 tw:[@media(max-width:40rem)]:flex-1" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
