import { Input } from '../../../../components/ds/Input';
export function SatisfactionDateFilter({ label, value, onChange, start }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  start?: boolean;
}) {
  return (
    <label className={`tw:inline-flex tw:flex-none tw:items-center tw:gap-2 tw:text-xs tw:leading-[inherit] tw:font-bold tw:text-cali-muted tw:[@media(max-width:40rem)]:flex-[1_1_45%] ${start ? 'tw:[@media(width>73.75rem)]:ml-auto' : ''}`}>
      {label}
      <Input variant="embedded" className="tw:h-11 tw:w-[10.154rem] tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:text-sm tw:leading-[inherit] tw:font-normal tw:text-cali-text tw:[@media(max-width:40rem)]:min-w-0 tw:[@media(max-width:40rem)]:flex-1" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
