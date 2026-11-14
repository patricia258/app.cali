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
          className={`tw:w-full tw:rounded-[0.538rem] tw:object-cover ${calendar ? 'tw:h-[8.615rem]' : 'tw:h-[9.538rem]'}`}
          src={notice.coverUrl}
          alt=""
        />
      )}
      <NoticeBadge
        category={notice.category}
        className={
          notice.coverUrl
            ? 'tw:absolute tw:top-8 tw:right-8 tw:shadow-[0_0.154rem_0.615rem_#19070a33]'
            : 'tw:self-start'
        }
      />
      <h2
        className={`tw:mt-[0.154rem]! tw:mb-[-0.308rem]! tw:leading-[1.3] ${calendar ? 'tw:text-[1.154rem]' : 'tw:text-[1.231rem]'}`}
      >
        {notice.title}
      </h2>
      <p className={`tw:text-[0.923rem]/[1.55] tw:text-[#655a55] ${calendar ? 'tw:line-clamp-5' : ''}`}>
        {notice.body}
      </p>
      <dl
        className={`tw:mt-[0.154rem]! tw:grid tw:grid-cols-2 tw:gap-x-[1.077rem] tw:rounded-[0.615rem] tw:bg-[#faf6f2] tw:px-[1.077rem] tw:py-[0.923rem] ${calendar ? 'tw:gap-y-[0.923rem]' : 'tw:gap-y-[0.769rem]'}`}
      >
        {metadata.map(
          ([label, value]) =>
            value && (
              <div key={label}>
                <dt className="tw:mb-[0.154rem] tw:text-[0.692rem] tw:text-[#a49082]">{label}</dt>
                <dd className="tw:m-0 tw:text-[0.846rem] tw:font-bold">{value}</dd>
              </div>
            ),
        )}
      </dl>
    </>
  );
}
