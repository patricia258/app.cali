import type { periodChangeSignalsV17 } from '../../../../lib/reportEditorial';

export function ReportPeriodChanges({ changes }: { changes: ReturnType<typeof periodChangeSignalsV17> }) {
  return (
    <div
      className="reports-v16-change-grid tw:grid tw:grid-cols-4 tw:gap-[0.76923rem] tw:max-[1050px]:grid-cols-2 tw:[&_article]:rounded-[1.07692rem]
        tw:[&_article]:border tw:[&_article]:border-solid tw:[&_article]:border-[#e7dfd9] tw:[&_article]:bg-white
        tw:[&_article]:p-[1.15385rem] tw:[&_span]:block tw:[&_span]:text-[0.69231rem] tw:[&_span]:font-extrabold
        tw:[&_span]:tracking-[0.07em] tw:[&_span]:text-[#81746e] tw:[&_span]:uppercase tw:[&_strong]:mt-[0.38462rem]
        tw:[&_strong]:mb-[0.46154rem] tw:[&_strong]:block tw:[&_strong]:text-[1.69231rem] tw:[&_strong]:font-medium
        tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.76923rem] tw:[&_p]:leading-[1.45] tw:[&_p]:text-[#756a64]
        tw:[&_.tone-positive]:border-[#d8e5d8] tw:[&_.tone-positive]:bg-[#fbfdfb] tw:[&_.tone-attention]:border-[#ead9b8]
        tw:[&_.tone-attention]:bg-[#fffaf0] tw:workspace-night:[&_article]:border-[#4b393f] tw:workspace-night:[&_article]:bg-[#281f22]
        tw:workspace-night:[&_span]:text-[#b7a9a4] tw:workspace-night:[&_p]:text-[#b7a9a4] tw:workspace-night:[&_strong]:text-[#e7bd72]
        tw:workspace-night:[&_.tone-positive]:border-[#405544] tw:workspace-night:[&_.tone-positive]:bg-[#202821]
        tw:workspace-night:[&_.tone-attention]:border-[#5e4930] tw:workspace-night:[&_.tone-attention]:bg-[#2d261d]"
    >
      {changes.map((item) => (
        <article className={'tone-' + item.tone} key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}
