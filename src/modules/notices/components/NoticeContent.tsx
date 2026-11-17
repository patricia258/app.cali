import { NoticeBadge, type NoticeCategory } from './NoticeBadge';

export type NoticeContentData = {
  category: NoticeCategory;
  coverUrl: string;
  title: string;
  body: string;
  date: string | null;
  time: string | null;
  coverage: string | null;
};

export function formatNoticeDay(value?: string | null) {
  return value
    ? new Date(`${value.slice(0, 10)}T12:00:00`)
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace('.', '')
    : '';
}

export function NoticeContent({
  notice,
  audience,
  calendar = false,
}: {
  notice: NoticeContentData;
  audience?: string;
  calendar?: boolean;
}) {
  const metadata = [
    ['Data', formatNoticeDay(notice.date)],
    ['Horário', notice.time],
    ['Abrangência', notice.coverage],
    ['Publicado por', 'CALI · Assessoria'],
    ['Quem recebe', audience],
  ];

  return (
    <>
      {notice.coverUrl && (
        <img
          className={`tw:w-full tw:rounded-lg tw:object-cover ${calendar ? 'tw:h-[8.615rem]' : 'tw:h-[9.538rem]'}`}
          src={notice.coverUrl}
          alt=""
        />
      )}
      <NoticeBadge
        category={notice.category}
        className={
          notice.coverUrl
            ? 'tw:absolute tw:top-8 tw:right-8 tw:shadow-[0_0.154rem_0.615rem_rgb(var(--cali-rgb-neutral-inverse)/0.2)]'
            : 'tw:self-start'
        }
      />
      <h2
        className={`tw:mt-0.5! tw:-mb-1! tw:leading-[1.3] ${calendar ? 'tw:text-lg' : 'tw:text-xl'}`}
      >
        {notice.title}
      </h2>
      <p className={`tw:text-cali-body/[1.55] tw:text-cali-muted ${calendar ? 'tw:line-clamp-5' : ''}`}>
        {notice.body}
      </p>
      <dl
        className={`tw:mt-0.5! tw:grid tw:grid-cols-2 tw:gap-x-4.5 tw:rounded-cali-compact-control tw:bg-cali-surface-soft tw:px-4.5 tw:py-3.5 ${calendar ? 'tw:gap-y-3.5' : 'tw:gap-y-3'}`}
      >
        {metadata.map(
          ([label, value]) =>
            value && (
              <div key={label}>
                <dt className="tw:mb-0.5 tw:text-cali-label tw:text-cali-sand-text">{label}</dt>
                <dd className="tw:m-0 tw:text-sm tw:font-bold">{value}</dd>
              </div>
            ),
        )}
      </dl>
    </>
  );
}
