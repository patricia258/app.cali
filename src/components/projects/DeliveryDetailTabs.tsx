import type { ReactNode } from 'react';

type DeliveryDetailTabsProps<T extends string> = {
  tabs: readonly T[];
  selected: T;
  label: (tab: T) => ReactNode;
  onChange: (tab: T) => void;
};

export function DeliveryDetailTabs<T extends string>({
  tabs,
  selected,
  label,
  onChange,
}: DeliveryDetailTabsProps<T>) {
  return (
    <nav
      aria-label="Detalhes da entrega"
      className="tw:flex tw:shrink-0 tw:gap-[1.538rem] tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:border-[#efe5dd] tw:px-[2.077rem]"
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab}
          className="tw:cursor-pointer tw:border-0 tw:border-b-2 tw:border-solid tw:border-transparent tw:bg-transparent tw:py-[1.077rem] tw:text-[.846rem] tw:whitespace-nowrap tw:text-[#8e8177] tw:aria-pressed:border-cali-brand tw:aria-pressed:font-bold tw:aria-pressed:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-cali-gold"
          aria-pressed={selected === tab}
          onClick={() => onChange(tab)}
        >
          {label(tab)}
        </button>
      ))}
    </nav>
  );
}
