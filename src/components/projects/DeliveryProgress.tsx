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
      <div className="tw:mt-[.385rem] tw:mb-[1.308rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.154rem]">
        <div>
          <small className="tw:text-[.769rem] tw:font-bold tw:tracking-[.092rem] tw:text-[#ac895c]">
            ANDAMENTO DA ENTREGA
          </small>
          <h3 className="tw:mt-[.615rem] tw:mb-[.308rem] tw:text-[1.308rem]">{title}</h3>
          <p className="tw:m-0 tw:text-[.846rem] tw:text-[#8e7c70]">{description}</p>
        </div>
        <b className="tw:text-[1.846rem] tw:text-cali-brand" aria-hidden="true">
          {total ? `${percent}%` : '—'}
        </b>
      </div>
      <div
        className="tw:mb-[1.385rem] tw:h-[.462rem] tw:overflow-hidden tw:rounded-[.769rem] tw:bg-[#eee8e2]"
        role={total ? 'progressbar' : undefined}
        aria-label={total ? 'Andamento da entrega' : undefined}
        aria-valuenow={total ? percent : undefined}
        aria-hidden={total ? undefined : true}
      >
        <span
          className="tw:block tw:h-full tw:rounded-[.769rem] tw:bg-cali-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );
}
