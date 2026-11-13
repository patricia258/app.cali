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
      className={`tw:flex tw:shrink-0 tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:py-[.769rem] ${registering
        ? 'tw:min-h-[5.538rem] tw:items-center tw:gap-[.615rem] tw:border-[#ede4df] tw:px-[2.154rem] tw:max-[43.75rem]:px-[.923rem]'
        : 'tw:gap-[.462rem] tw:border-[#e9e1db] tw:px-[1.846rem] tw:max-[45rem]:p-[.615rem]'}`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`tw:shrink-0 tw:cursor-pointer tw:border-0 tw:whitespace-nowrap tw:aria-selected:bg-cali-brand tw:aria-selected:text-white ${registering
            ? 'tw:inline-flex tw:min-h-[3.385rem] tw:items-center tw:justify-center tw:rounded-[.692rem] tw:bg-transparent tw:px-[1.308rem] tw:py-[.769rem] tw:leading-[1.35] tw:font-[650] tw:text-[#716762]'
            : 'tw:rounded-[.538rem] tw:bg-transparent tw:px-[1rem] tw:py-[.923rem] tw:text-[.846rem] tw:font-bold tw:text-[#80736c]'}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
