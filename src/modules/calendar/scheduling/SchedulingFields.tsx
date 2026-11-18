import { Input } from '../../../components/ds/Input';
import { Textarea } from '../../../components/ds/Textarea';
import type { ReactNode } from 'react';

export function SchedulingFields({ children }: { children: ReactNode }) {
  return (
    <div className="tw:grid tw:grid-cols-2 tw:gap-4 tw:[@media(max-width:56.25rem)]:grid-cols-1">
      {children}
    </div>
  );
}

export function SlotFields({ position, minDate, required, visit }: {
  position: 1 | 2;
  minDate: string;
  required: boolean;
  visit?: boolean;
}) {
  return (
    <fieldset className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
      <legend className="tw:mb-2 tw:text-cali-label tw:font-black tw:tracking-[.06em] tw:text-cali-muted tw:uppercase">
        Opção {position}{position === 2 && (required ? ' (obrigatória)' : ' (opcional)')}
      </legend>
      <div className="tw:grid tw:grid-cols-[1fr_.7fr] tw:gap-3">
        <Input className="tw:w-full" type="date" name={`date${position}`} min={minDate} required={required} aria-label={`Data da opção ${position}`} />
        <Input className="tw:w-full" type="time" name={`time${position}`} min={visit ? '09:00' : undefined} max={visit ? '12:00' : undefined} required={required} aria-label={`Hora da opção ${position}`} />
      </div>
    </fieldset>
  );
}

export function SchedulingNoteField({ label, placeholder, initialValue, minLength, required }: {
  label: string;
  placeholder?: string;
  initialValue?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="tw:col-span-full tw:flex tw:flex-col tw:gap-2">
      <span className="tw:text-cali-label tw:font-black tw:tracking-[.06em] tw:text-cali-muted tw:uppercase">{label}</span>
      <Textarea
        name="note"
        defaultValue={initialValue}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="tw:min-h-25! tw:w-full"
      />
    </label>
  );
}
