type DeliveryProgressProps = {
  title: string;
  description: string;
  complete: number;
  total: number;
};

export function DeliveryProgress({ title, description, complete, total }: DeliveryProgressProps) {
  const percent = total ? Math.round((complete / total) * 100) : 0;

  return (
    <>
      <div className="tw:mt-1.5 tw:mb-5 tw:flex tw:items-center tw:justify-between tw:gap-4.5">
        <div>
          <small className="tw:text-xs tw:font-bold tw:tracking-[.092rem] tw:text-cali-gold-accent">
            ANDAMENTO DA ENTREGA
          </small>
          <h3 className="tw:mt-2.5 tw:mb-1 tw:text-xl">{title}</h3>
          <p className="tw:m-0 tw:text-sm tw:text-cali-sand-text">{description}</p>
        </div>
        <b className="tw:text-3xl tw:text-cali-brand" aria-hidden="true">
          {total ? `${percent}%` : '—'}
        </b>
      </div>
      <div
        className="tw:mb-5.5 tw:h-2 tw:overflow-hidden tw:rounded-xl tw:bg-cali-line"
        role={total ? 'progressbar' : undefined}
        aria-label={total ? 'Andamento da entrega' : undefined}
        aria-valuenow={total ? percent : undefined}
        aria-hidden={total ? undefined : true}
      >
        <span
          className="tw:block tw:h-full tw:rounded-xl tw:bg-cali-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );
}
