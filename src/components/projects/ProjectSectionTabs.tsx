type ProjectSectionTabsProps<T extends string> = {
  label: string;
  tabs: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function ProjectSectionTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className = '',
}: ProjectSectionTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`tw:mb-7.5 tw:flex tw:items-center tw:gap-7.5 tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line ${className}`}
    >
      {tabs.map(([id, title]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className="tw:cursor-pointer tw:border-0 tw:border-b-2 tw:border-solid tw:border-transparent tw:bg-transparent tw:px-1 tw:py-3.5 tw:text-cali-body tw:whitespace-nowrap tw:text-cali-muted tw:aria-selected:border-cali-brand tw:aria-selected:font-bold tw:aria-selected:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-cali-gold"
          onClick={() => onChange(id)}
        >
          {title}
        </button>
      ))}
    </div>
  );
}
