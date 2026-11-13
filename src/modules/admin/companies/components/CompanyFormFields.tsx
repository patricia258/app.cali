import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export function CompanyFormFields({ children, profile }: { children: ReactNode; profile?: boolean }) {
  return <div className={`tw:grid tw:grid-cols-2 tw:items-start tw:gap-x-[1.385rem] tw:gap-y-[1.077rem] tw:max-[43.75rem]:grid-cols-1 ${profile ? 'tw:pt-[1.154rem] tw:pb-[1.538rem]' : ''}`}>{children}</div>;
}

export function CompanyField({ children, fullWidth, className = '' }: { children: ReactNode; fullWidth?: boolean; className?: string }) {
  return <label className={`tw:flex tw:min-w-[var(--account-field-min-width,0)] tw:flex-col tw:gap-[.462rem] tw:text-[.846rem] tw:font-bold tw:text-[#322f2c] tw:[&_small]:text-[.769rem] tw:[&_small]:font-normal tw:[&_small]:text-[#9a8c83] ${fullWidth ? 'tw:col-span-full' : ''} ${className}`}>{children}</label>;
}

export function CompanyInput({ className = '', ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} className={`tw:min-h-[3.308rem] tw:w-full tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.923rem] tw:font-normal tw:text-[#302b29] tw:outline-offset-2 tw:read-only:bg-[#fbf7f4] tw:read-only:text-[#857870] ${className}`} />;
}

export function CompanySelect({ className = '', ...props }: ComponentPropsWithoutRef<'select'>) {
  return <select {...props} className={`tw:min-h-[3.308rem] tw:w-full tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.923rem] tw:font-normal tw:text-[#302b29] tw:outline-offset-2 tw:disabled:bg-[#fbf7f4] tw:disabled:text-[#857870] ${className}`} />;
}

export function CompanyTextarea({ className = '', ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea {...props} className={`tw:min-h-[5.846rem] tw:w-full tw:resize-y tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.923rem] tw:font-normal tw:text-[#302b29] ${className}`} />;
}

export function CompanyFileInput({ preview, ...props }: ComponentPropsWithoutRef<'input'> & { preview?: string }) {
  return (
    <span className="tw:flex tw:min-h-[3.308rem] tw:min-w-0 tw:items-center tw:gap-[.769rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.769rem] tw:font-normal">
      {preview && <img src={preview} alt="Prévia da logo" className="tw:size-[2.154rem] tw:rounded-[.538rem] tw:object-contain" />}
      <input {...props} type="file" className="tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-[.846rem]" />
    </span>
  );
}

export function CompanyAccessCheckbox(props: ComponentPropsWithoutRef<'input'>) {
  return (
    <label className="tw:flex tw:items-center tw:gap-[.692rem] tw:text-[.846rem] tw:font-bold">
      <input {...props} type="checkbox" className="tw:size-[1.231rem] tw:shrink-0" /> Solicitar acesso à plataforma
    </label>
  );
}

export function CompanyFormHint({ children }: { children: ReactNode }) {
  return <p className="tw:mt-0 tw:mb-[1.154rem] tw:text-[.846rem] tw:font-bold tw:tracking-[.09em] tw:text-[#a3805a] tw:uppercase">{children}</p>;
}

export function CompanyCheckCard({ title, description, fullWidth, ...props }: ComponentPropsWithoutRef<'input'> & {
  title: string;
  description?: string;
  fullWidth?: boolean;
}) {
  return (
    <label className={`tw:flex tw:cursor-pointer tw:items-start tw:gap-[.769rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.077rem] tw:py-[.923rem] tw:text-[.846rem] ${fullWidth ? 'tw:col-span-full' : ''}`}>
      <input {...props} type="checkbox" className="tw:mt-[.154rem] tw:shrink-0 tw:accent-cali-brand" />
      <span className="tw:flex tw:flex-col tw:gap-[.231rem]">
        {description ? <><strong>{title}</strong><small className="tw:font-normal tw:text-[#9a8c83]">{description}</small></> : title}
      </span>
    </label>
  );
}
