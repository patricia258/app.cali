type WorkflowGroupHeadingProps = {
  label: string;
  title: string;
  count: number;
};

export function WorkflowGroupHeading({ label, title, count }: WorkflowGroupHeadingProps) {
  return (
    <div className="wf-group-head tw:mt-8 tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3">
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.385rem]">
        <span className="tw:text-[0.692rem]/[inherit] tw:tracking-[0.133em] tw:text-[#ad8259]">{label}</span>
        <h2 className="tw:m-0 tw:text-[1.077rem]/[inherit] tw:font-semibold">{title}</h2>
      </div>
      <b className="tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e7d7c8] tw:bg-[#f2e9e2] tw:px-[0.769rem] tw:py-[0.462rem] tw:text-[0.846rem]/[inherit] tw:text-[#6d404c]">{count}</b>
    </div>
  );
}
