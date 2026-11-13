import { History } from 'lucide-react';

type DeliveryHistoryEntry = {
  id: string | number;
  title: string;
  date: string;
  description: string;
  tone?: 'neutral' | 'approved' | 'review';
};

type DeliveryHistoryProps = {
  title: string;
  description: string;
  emptyMessage: string;
  entries: readonly DeliveryHistoryEntry[];
};

const dotColor = {
  neutral: 'tw:bg-[#a8917d]',
  approved: 'tw:bg-[#55b68a]',
  review: 'tw:bg-cali-gold',
};

export function DeliveryHistory({ title, description, emptyMessage, entries }: DeliveryHistoryProps) {
  return (
    <>
      <div className="tw:mt-[.308rem] tw:mb-[1.769rem] tw:flex tw:items-center tw:gap-[1.077rem] tw:rounded-[.615rem] tw:bg-[#f9f5f0] tw:px-[1.308rem] tw:py-[1.154rem] tw:text-[#6e3647]">
        <History size={19} aria-hidden="true" className="tw:shrink-0" />
        <div>
          <strong className="tw:text-[1rem]">{title}</strong>
          <p className="tw:mt-[.385rem] tw:mb-0 tw:text-[.846rem]/[1.5] tw:text-[#8e7d72]">{description}</p>
        </div>
      </div>
      {entries.length ? (
        <ol className="tw:m-0 tw:ml-[1.308rem] tw:list-none tw:border-0 tw:border-l tw:border-solid tw:border-[#dfd1c3] tw:p-0">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="tw:relative tw:flex tw:flex-col tw:gap-[.462rem] tw:pb-[1.846rem] tw:pl-[1.769rem]"
            >
              <span
                aria-hidden="true"
                className={`tw:absolute tw:top-[.308rem] tw:-left-[.385rem] tw:size-[.692rem] tw:rounded-full tw:ring-4 tw:ring-white ${dotColor[entry.tone ?? 'neutral']}`}
              />
              <time className="tw:text-[.769rem] tw:text-[#a28e7f]">{entry.date}</time>
              <strong className="tw:text-[.923rem] tw:text-[#3f3432]">{entry.title}</strong>
              <p className="tw:m-0 tw:text-[.846rem]/[1.5] tw:text-[#80736c]">{entry.description}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tw:text-[.769rem] tw:text-[#a28d7d]">{emptyMessage}</p>
      )}
    </>
  );
}
