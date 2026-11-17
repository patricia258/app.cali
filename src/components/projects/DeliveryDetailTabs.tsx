import type { ReactNode } from 'react';

type DeliveryDetailTabsProps<T extends string> = {
  tabs: readonly T[];
  compact?: boolean;
  selected: T;
  label: (tab: T) => ReactNode;
  onChange: (tab: T) => void;
};

export function DeliveryDetailTabs<T extends string>({
  tabs,
  compact,
  selected,
  label,
  onChange,
}: DeliveryDetailTabsProps<T>) {
  return (
    <nav
      aria-label="Detalhes da entrega"
      className={`tw:flex tw:shrink-0 tw:gap-6 tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-8.5 ${compact ? 'tw:max-[40rem]:gap-1.5 tw:max-[40rem]:px-3.5' : ''}`}
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab}
          className={`tw:cursor-pointer tw:border-0 tw:border-b-2 tw:border-solid tw:border-transparent tw:bg-transparent tw:py-4.5 tw:text-sm tw:whitespace-nowrap tw:text-cali-sand-text tw:aria-pressed:border-cali-brand tw:aria-pressed:font-bold tw:aria-pressed:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-cali-gold ${compact ? 'tw:max-[40rem]:min-w-0 tw:max-[40rem]:flex-1 tw:max-[40rem]:px-0 tw:max-[40rem]:text-xs tw:max-[40rem]:whitespace-normal' : ''}`}
          aria-pressed={selected === tab}
          onClick={() => onChange(tab)}
        >
          {label(tab)}
        </button>
      ))}
    </nav>
  );
}
