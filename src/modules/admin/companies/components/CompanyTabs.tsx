type CompanyTabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ id: T; label: string }>;
  mode: 'registration' | 'profile';
};

export function CompanyTabs<T extends string>({ value, onChange, items, mode }: CompanyTabsProps<T>) {
  const registering = mode === 'registration';
  return (
    <nav
      role="tablist"
      aria-label={registering ? 'Etapas do cadastro' : 'Seções da ficha'}
      className={`tw:flex tw:shrink-0 tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:py-3 ${registering
        ? 'tw:min-h-[5.538rem] tw:items-center tw:gap-2.5 tw:border-cali-sand-line tw:px-8.5 tw:max-[43.75rem]:px-3.5'
        : 'tw:gap-2 tw:border-cali-sand-line tw:px-7.5 tw:max-[45rem]:p-2.5'}`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`tw:shrink-0 tw:cursor-pointer tw:border-0 tw:whitespace-nowrap tw:aria-selected:bg-cali-brand tw:aria-selected:text-cali-neutral-surface ${registering
            ? 'tw:inline-flex tw:min-h-[3.385rem] tw:items-center tw:justify-center tw:rounded-cali-panel tw:bg-transparent tw:px-5 tw:py-3 tw:leading-[1.35] tw:font-[650] tw:text-cali-neutral-accent'
            : 'tw:rounded-lg tw:bg-transparent tw:px-4 tw:py-3.5 tw:text-sm tw:font-bold tw:text-cali-neutral-accent'}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
