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
  neutral: 'tw:bg-cali-sand-text',
  approved: 'tw:bg-cali-teal-accent',
  review: 'tw:bg-cali-gold',
};

export function DeliveryHistory({ title, description, emptyMessage, entries }: DeliveryHistoryProps) {
  return (
    <>
      <div className="tw:mt-1 tw:mb-7 tw:flex tw:items-center tw:gap-4.5 tw:rounded-cali-compact-control tw:bg-cali-sand-soft tw:px-5 tw:py-4.5 tw:text-cali-red-strong">
        <History size={19} aria-hidden="true" className="tw:shrink-0" />
        <div>
          <strong className="tw:text-base">{title}</strong>
          <p className="tw:mt-1.5 tw:mb-0 tw:text-sm/[1.5] tw:text-cali-sand-text">{description}</p>
        </div>
      </div>
      {entries.length ? (
        <ol className="tw:m-0 tw:ml-5 tw:list-none tw:border-0 tw:border-l tw:border-solid tw:border-cali-sand-line tw:p-0">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="tw:relative tw:flex tw:flex-col tw:gap-2 tw:pb-7.5 tw:pl-7"
            >
              <span
                aria-hidden="true"
                className={`tw:absolute tw:top-1 tw:-left-1.5 tw:size-3 tw:rounded-full tw:ring-4 tw:ring-cali-neutral-surface ${dotColor[entry.tone ?? 'neutral']}`}
              />
              <time className="tw:text-xs tw:text-cali-sand-text">{entry.date}</time>
              <strong className="tw:text-cali-body tw:text-cali-neutral-strong">{entry.title}</strong>
              <p className="tw:m-0 tw:text-sm/[1.5] tw:text-cali-neutral-accent">{entry.description}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tw:text-xs tw:text-cali-sand-text">{emptyMessage}</p>
      )}
    </>
  );
}
