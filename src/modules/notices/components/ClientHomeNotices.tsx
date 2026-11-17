import { ArrowRight, Check, Megaphone, MessageCircle } from 'lucide-react';
import { Link } from '../../../components/navigation/Link';
import { useEffect, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { readClientHomeNotices } from '../../../api/notices/board';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { noticeCategoryLabel, type NoticeCategory } from './NoticeBadge';
import { formatNoticeDay } from './NoticeContent';

type HomeNotice = {
  id: string;
  category: NoticeCategory;
  title: string;
  publishedAt: string;
  coverUrl: string;
  acked: boolean;
};

function NoticePreview({
  href,
  label,
  title,
  description,
  coverUrl,
  footer,
  placeholder,
}: {
  href?: string;
  label: string;
  title: string;
  description: string;
  coverUrl?: string;
  footer: ReactNode;
  placeholder?: ReactNode;
}) {
  const className =
    'tw:flex tw:w-full tw:min-w-0 tw:flex-col tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-0 tw:text-left tw:[&:nth-child(2)_small]:bg-cali-violet-surface tw:[&:nth-child(2)_small]:text-cali-violet-text';
  const contents = (
    <>
      <div className="tw:flex tw:min-h-[8.615rem] tw:flex-col tw:items-start tw:gap-2 tw:px-3 tw:pt-3 tw:pb-2.5">
        <small className="tw:rounded-md tw:bg-cali-orange-surface tw:px-2 tw:py-1 tw:text-cali-label tw:font-extrabold tw:tracking-[0.035rem] tw:text-cali-gold-text">
          {label}
        </small>
        <strong className="tw:text-sm/[1.3] tw:text-cali-neutral-strong">{title}</strong>
        <span className="tw:text-cali-label tw:text-cali-sand-text">{description}</span>
      </div>
      {coverUrl ? (
        <img
          className="tw:block tw:h-[9.077rem] tw:w-full tw:flex-none tw:object-cover tw:max-[37.5rem]:h-31"
          src={coverUrl}
          alt=""
        />
      ) : (
        <div className="tw:grid tw:h-[9.077rem] tw:w-full tw:flex-none tw:place-items-center tw:bg-cali-surface-soft tw:text-cali-gold-accent tw:max-[37.5rem]:h-31">
          {placeholder}
        </div>
      )}
      <div className="tw:flex tw:flex-wrap tw:justify-between tw:gap-2 tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-soft tw:px-2 tw:py-3 tw:text-cali-label tw:text-cali-neutral-text tw:max-[36.25rem]:flex-col tw:[&_span]:flex tw:[&_span]:items-center tw:[&_span]:gap-1.5">
        {footer}
      </div>
    </>
  );
  return href ? (
    <Link className={`${className} tw:cursor-pointer tw:no-underline tw:hover:border-cali-gold`} to={href}>
      {contents}
    </Link>
  ) : (
    <article className={className}>{contents}</article>
  );
}

export function ClientHomeNotices({
  linkClassName,
}: {
  linkClassName: ComponentPropsWithoutRef<'a'>['className'];
}) {
  const [items, setItems] = useState<HomeNotice[] | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      const notices = await readClientHomeNotices();
      if (!active) return;
      const rows = await Promise.all(
        notices.map(async (row) => ({
          id: row.id,
          category: row.category as NoticeCategory,
          title: row.title,
          publishedAt: row.published_at,
          coverUrl: row.cover_path ? (await resolveWorkspaceMedia(row.cover_path, 86400)) || '' : '',
          acked: row.acked,
        })),
      );
      if (active) setItems(rows);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="tw:min-w-0 tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-5.5"
      aria-labelledby="home-notices-title"
    >
      <div className="tw:mb-5 tw:flex tw:min-h-[4.231rem] tw:items-start tw:justify-between tw:gap-5.5">
        <div>
          <small className="tw:text-xs tw:font-bold tw:tracking-[0.104rem] tw:text-cali-gold-accent">
            QUADRO DE AVISOS · CALI
          </small>
          <h3 id="home-notices-title" className="tw:my-2 tw:text-xl">
            Avisos da sua parceria
          </h3>
          <p className="tw:m-0 tw:text-sm tw:text-cali-sand-text">
            Informações importantes para acompanhar e dar ciência.
          </p>
        </div>
        <Link className={linkClassName} to="/cliente/avisos">
          Ver mural completo <ArrowRight size={15} />
        </Link>
      </div>
      <div className="tw:grid tw:grid-cols-3 tw:gap-3 tw:max-[37.5rem]:grid-cols-2">
        {items?.length ? (
          items.map((item) => (
            <NoticePreview
              key={item.id}
              href={`/cliente/avisos?aviso=${item.id}`}
              label={noticeCategoryLabel(item.category).toUpperCase()}
              title={item.title}
              description={`CALI · Assessoria · ${formatNoticeDay(item.publishedAt)}`}
              coverUrl={item.coverUrl}
              placeholder={<Megaphone size={25} />}
              footer={
                <>
                  <span>
                    <MessageCircle size={13} /> Ver comunicado
                  </span>
                  <span>
                    <Check size={13} /> {item.acked ? 'Ciente registrado' : 'Dar ciência'}
                  </span>
                </>
              }
            />
          ))
        ) : (
          <NoticePreview
            label="COMUNICADOS"
            title="Nenhum comunicado disponível"
            description={
              items
                ? 'Quando a CALI publicar um aviso para a sua empresa, ele aparece aqui.'
                : 'Carregando avisos…'
            }
            placeholder={<MessageCircle size={25} />}
            footer={<span>Mural da parceria</span>}
          />
        )}
      </div>
    </section>
  );
}
