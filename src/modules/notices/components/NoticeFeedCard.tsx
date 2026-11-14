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
  feriado: 'tw:border-t-[#e3ab48]',
  atendimento: 'tw:border-t-[#63aace]',
  comunicado: 'tw:border-t-[#9a71c7]',
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
      className={`tw:min-w-0 tw:cursor-pointer tw:overflow-hidden tw:rounded-[0.692rem] tw:border tw:border-t-2 tw:border-solid tw:border-[#e9ded5] tw:bg-white tw:hover:shadow-[0_0.769rem_2.308rem_#5a1e2d10] tw:motion-safe:transition-[transform,box-shadow] tw:motion-safe:hover:-translate-y-[0.154rem] ${categoryBorder[notice.category]}`}
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
        <div className="tw:relative tw:h-[9.615rem] tw:overflow-hidden tw:bg-[#eadfd5] tw:after:pointer-events-none tw:after:absolute tw:after:inset-x-0 tw:after:top-[40%] tw:after:bottom-0 tw:after:bg-[linear-gradient(transparent,#1a121a65)] tw:max-[43.75rem]:h-[12.308rem]">
          <img className="tw:block tw:size-full tw:object-cover" src={notice.coverUrl} alt="" />
          <NoticeBadge category={notice.category} placement="cover" />
        </div>
      )}
      <div className="tw:px-[1.154rem] tw:pt-[1rem] tw:pb-[1.077rem]">
        <div className="tw:flex tw:items-center tw:gap-[0.769rem]">
          <span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-[0.538rem] tw:bg-cali-brand tw:text-[0.769rem] tw:font-bold tw:text-white">
            C
          </span>
          <span className="tw:flex tw:flex-1 tw:flex-col tw:gap-[0.231rem]">
            <strong className="tw:text-[0.769rem]">CALI · Assessoria</strong>
            <small className="tw:text-[0.692rem] tw:text-[#a2948b]">
              {formatNoticeDay(notice.publishedAt)} · {notice.protocol}
            </small>
          </span>
          {!notice.coverUrl && <NoticeBadge category={notice.category} placement="feed" />}
        </div>
        <h2 className="tw:mt-[0.923rem] tw:mb-[0.462rem] tw:text-[1.077rem]/[1.35] tw:text-[#382f30]">
          {notice.title}
        </h2>
        <p className="tw:m-0 tw:line-clamp-2 tw:text-[0.846rem]/[1.5] tw:text-[#786b65]">{notice.body}</p>
        {notice.date && (
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.538rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee8e2] tw:pt-[0.769rem] tw:pb-[0.615rem] tw:text-[0.692rem] tw:text-[#9b713d]">
            <CalendarDays size={14} />
            <strong>{formatNoticeDay(notice.date)}</strong>
            {notice.time && notice.coverage && <span className="tw:whitespace-nowrap">· {notice.time}</span>}
          </div>
        )}
        <div className="tw:flex tw:gap-4 tw:pt-[0.769rem] tw:[&_button]:flex tw:[&_button]:cursor-pointer tw:[&_button]:items-center tw:[&_button]:gap-[0.538rem] tw:[&_button]:border-0 tw:[&_button]:bg-transparent tw:[&_button]:text-[0.769rem] tw:[&_button]:font-semibold tw:[&_button]:text-[#6a2e3e] tw:[&_button[aria-pressed=true]]:text-[#288666]">
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
