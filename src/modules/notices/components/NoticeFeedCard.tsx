import { CalendarDays, Check, MessageCircle } from 'lucide-react';
import { NoticeBadge } from './NoticeBadge';
import { formatNoticeDay, type NoticeContentData } from './NoticeContent';

type NoticeFeedCardProps = {
  notice: NoticeContentData & { protocol: string; publishedAt: string };
  role: 'admin' | 'client' | 'partner';
  commentCount: number;
  acknowledgementCount: number;
  acknowledged: boolean;
  onOpen: () => void;
  onAcknowledge: () => void;
};

const categoryBorder = {
  feriado: 'tw:border-t-cali-orange-line',
  atendimento: 'tw:border-t-cali-blue-line',
  comunicado: 'tw:border-t-cali-violet-accent',
};

export function NoticeFeedCard({
  notice,
  role,
  commentCount,
  acknowledgementCount,
  acknowledged,
  onOpen,
  onAcknowledge,
}: NoticeFeedCardProps) {
  return (
    <article
      className={`tw:min-w-0 tw:cursor-pointer tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-t-2 tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:hover:shadow-[0_0.769rem_2.308rem_rgb(var(--cali-rgb-burgundy-accent)/0.06275)] tw:motion-safe:transition-[transform,box-shadow] tw:motion-safe:hover:-translate-y-[0.154rem] ${categoryBorder[notice.category]}`}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      {notice.coverUrl && (
        <div className="tw:relative tw:h-[9.615rem] tw:overflow-hidden tw:bg-cali-line tw:after:pointer-events-none tw:after:absolute tw:after:inset-x-0 tw:after:top-[40%] tw:after:bottom-0 tw:after:bg-[linear-gradient(transparent,rgb(var(--cali-rgb-neutral-inverse)/0.3961))] tw:max-[43.75rem]:h-[12.308rem]">
          <img className="tw:block tw:size-full tw:object-cover" src={notice.coverUrl} alt="" />
          <NoticeBadge category={notice.category} placement="cover" />
        </div>
      )}
      <div className="tw:px-4.5 tw:pt-4 tw:pb-4.5">
        <div className="tw:flex tw:items-center tw:gap-3">
          <span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-brand tw:text-xs tw:font-bold tw:text-cali-neutral-surface">
            C
          </span>
          <span className="tw:flex tw:flex-1 tw:flex-col tw:gap-1">
            <strong className="tw:text-xs">CALI · Assessoria</strong>
            <small className="tw:text-cali-label tw:text-cali-sand-text">
              {formatNoticeDay(notice.publishedAt)} · {notice.protocol}
            </small>
          </span>
          {!notice.coverUrl && <NoticeBadge category={notice.category} placement="feed" />}
        </div>
        <h2 className="tw:mt-3.5 tw:mb-2 tw:text-lg/[1.35] tw:text-cali-neutral-strong">
          {notice.title}
        </h2>
        <p className="tw:m-0 tw:line-clamp-2 tw:text-sm/[1.5] tw:text-cali-neutral-accent">{notice.body}</p>
        {notice.date && (
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:pt-3 tw:pb-2.5 tw:text-cali-label tw:text-cali-gold-text">
            <CalendarDays size={14} />
            <strong>{formatNoticeDay(notice.date)}</strong>
            {notice.time && notice.coverage && <span className="tw:whitespace-nowrap">· {notice.time}</span>}
          </div>
        )}
        <div className="tw:flex tw:gap-4 tw:pt-3 tw:[&_button]:flex tw:[&_button]:cursor-pointer tw:[&_button]:items-center tw:[&_button]:gap-2 tw:[&_button]:border-0 tw:[&_button]:bg-transparent tw:[&_button]:text-xs tw:[&_button]:font-semibold tw:[&_button]:text-cali-red-strong tw:[&_button[aria-pressed=true]]:text-cali-green-accent">
          {role === 'admin' && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              <Check size={15} /> {acknowledgementCount} {acknowledgementCount === 1 ? 'ciência' : 'ciências'}
            </button>
          )}
          {role === 'client' && (
            <button
              type="button"
              aria-pressed={acknowledged}
              onClick={(event) => {
                event.stopPropagation();
                onAcknowledge();
              }}
            >
              <Check size={15} /> {acknowledged ? 'Ciente registrado' : 'Estou ciente'}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            <MessageCircle size={15} /> Comentar {commentCount ? `(${commentCount})` : ''}
          </button>
        </div>
      </div>
    </article>
  );
}
