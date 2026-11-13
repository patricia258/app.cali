import { Eye, EyeOff } from 'lucide-react';

export function HoursClientVisibility({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="tw:col-span-full tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2.5 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#665751]">
      <input className="tw:accent-cali-brand" type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      {value ? <Eye size={15} /> : <EyeOff size={15} />}
      Compartilhável no extrato do cliente
    </label>
  );
}
