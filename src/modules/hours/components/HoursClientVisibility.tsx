import { Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '../../../components/ds/Checkbox';

export function HoursClientVisibility({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="tw:col-span-full tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2.5 tw:text-sm tw:leading-[inherit] tw:text-cali-muted">
      <Checkbox checked={value} onChange={(event) => onChange(event.target.checked)} />
      {value ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
      Compartilhável no extrato do cliente
    </label>
  );
}
