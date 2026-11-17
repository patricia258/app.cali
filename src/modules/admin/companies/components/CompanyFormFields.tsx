import { Checkbox } from '../../../../components/ds/Checkbox';
import { Input } from '../../../../components/ds/Input';
import { Select } from '../../../../components/ds/Select';
import { Textarea } from '../../../../components/ds/Textarea';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export function CompanyFormFields({ children, profile }: { children: ReactNode; profile?: boolean }) {
  return <div className={`tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-5.5 tw:gap-y-4.5 tw:max-[43.75rem]:grid-cols-1 ${profile ? 'tw:pt-4.5 tw:pb-6' : ''}`}>{children}</div>;
}

export function CompanyField({ children, fullWidth, className = '' }: { children: ReactNode; fullWidth?: boolean; className?: string }) {
  return <label className={`tw:flex tw:min-w-[var(--account-field-min-width,0)] tw:flex-col tw:gap-2 tw:text-sm tw:font-bold tw:text-cali-text tw:[&_small]:text-xs tw:[&_small]:font-normal tw:[&_small]:text-cali-muted ${fullWidth ? 'tw:col-span-full' : ''} ${className}`}>{children}</label>;
}

export function CompanyInput({ className = '', ...props }: ComponentPropsWithoutRef<'input'>) {
  return <Input {...props} className={`tw:w-full tw:read-only:bg-cali-surface-soft tw:read-only:text-cali-muted ${className}`} />;
}

export function CompanySelect({ className = '', ...props }: ComponentPropsWithoutRef<'select'>) {
  return <Select {...props} className={`tw:w-full tw:disabled:bg-cali-surface-soft tw:disabled:text-cali-muted ${className}`} />;
}

export function CompanyTextarea({ className = '', ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return <Textarea {...props} className={`tw:w-full ${className}`} />;
}

export function CompanyFileInput({ preview, ...props }: ComponentPropsWithoutRef<'input'> & { preview?: string }) {
  return (
    <span className="tw:flex tw:min-h-[3.308rem] tw:min-w-0 tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:font-normal">
      {preview && <img src={preview} alt="Prévia da logo" className="tw:size-8.5 tw:rounded-lg tw:object-contain" />}
      <input {...props} type="file" className="tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-sm" />
    </span>
  );
}

export function CompanyAccessCheckbox(props: ComponentPropsWithoutRef<'input'>) {
  return (
    <label className="tw:flex tw:items-center tw:gap-3 tw:text-sm tw:font-bold">
      <Checkbox {...props} className="tw:size-5 tw:shrink-0" /> Solicitar acesso à plataforma
    </label>
  );
}

export function CompanyFormHint({ children }: { children: ReactNode }) {
  return <p className="tw:mt-0 tw:mb-4.5 tw:text-sm tw:font-bold tw:tracking-[.09em] tw:text-cali-gold-accent tw:uppercase">{children}</p>;
}

export function CompanyCheckCard({ title, description, fullWidth, ...props }: ComponentPropsWithoutRef<'input'> & {
  title: string;
  description?: string;
  fullWidth?: boolean;
}) {
  return (
    <label className={`tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3.5 tw:text-sm ${fullWidth ? 'tw:col-span-full' : ''}`}>
      <Checkbox {...props} className="tw:mt-0.5 tw:shrink-0 tw:accent-cali-brand" />
      <span className="tw:flex tw:flex-col tw:gap-1">
        {description ? <><strong>{title}</strong><small className="tw:font-normal tw:text-cali-muted">{description}</small></> : title}
      </span>
    </label>
  );
}
