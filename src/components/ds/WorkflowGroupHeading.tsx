type WorkflowGroupHeadingProps = {
  label: string;
  title: string;
  count: number;
};

export function WorkflowGroupHeading({ label, title, count }: WorkflowGroupHeadingProps) {
  return (
    <div className="wf-group-head tw:mt-8 tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3">
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
        <span className="tw:text-cali-label tw:leading-normal tw:tracking-widest tw:text-cali-warning">{label}</span>
        <h2 className="tw:m-0 tw:text-lg tw:leading-tight tw:font-semibold">{title}</h2>
      </div>
      <b className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-muted tw:px-3 tw:py-2 tw:text-sm tw:leading-normal tw:text-cali-brand">{count}</b>
    </div>
  );
}
