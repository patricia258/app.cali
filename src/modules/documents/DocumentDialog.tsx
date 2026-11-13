import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ds/Button';
import { DialogFrame } from '../../components/ds/DialogFrame';

export function DocumentDialog({ label, detail, children }: { label: string; detail?: boolean; children: ReactNode }) {
  return <div className="modal-backdrop workspace-modal-backdrop tw:workspace-compact:motion-safe:animate-[v2-fade_.22s_ease-out_backwards] tw:workspace-compact:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] tw:fixed tw:inset-0 tw:z-980 tw:grid! tw:place-items-center tw:bg-[#171017a8]! tw:p-[1.385rem] tw:backdrop-blur-[0.308rem]" role="presentation">
    <DialogFrame
      className={`modal-card ${detail ? 'document-detail-modal-v3 tw:w-[min(55.385rem,100%)]!' : 'document-create-modal document-create-modal-v3 tw:w-[min(58.462rem,100%)]!'} tw:relative tw:flex! tw:max-h-[92dvh]! tw:max-w-none! tw:flex-col tw:gap-0! tw:overflow-hidden! tw:rounded-[1.077rem]! tw:border tw:border-solid tw:border-[#e8ded6] tw:bg-white! tw:p-0! tw:font-cali-body tw:text-[0.923rem]/[inherit] tw:text-[#332b29] tw:shadow-[0_25px_85px_#2418234a]`}
      aria-label={label}
    >{children}</DialogFrame>
  </div>;
}

export function DocumentDialogHeader({ detail, title, kicker, subtitle, onClose, children }: {
  detail?: boolean; title: string; kicker: string; subtitle?: string | null; onClose: () => void; children?: ReactNode;
}) {
  return <header className={`${detail ? 'document-detail-header-v3' : 'document-modal-header'} tw:m-0! tw:flex tw:max-w-none! tw:shrink-0 tw:items-center tw:gap-[1.077rem] tw:rounded-none! tw:border-0 tw:border-b tw:border-solid tw:border-[#eadfd6] tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:pt-[1.538rem] tw:pr-[4.923rem] tw:pb-[1.385rem] tw:pl-[1.846rem]`}>
    {children}
    <div className="tw:min-w-0">
      <span className="tw:block tw:text-[0.692rem]/[inherit] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold tw:uppercase">{kicker}</span>
      <h2 className="tw:mt-[0.462rem]! tw:mb-0! tw:text-[1.462rem]/[1.25]! tw:font-bold tw:text-cali-brand">{title}</h2>
      <p className="tw:mt-[0.385rem]! tw:mb-0! tw:text-[0.846rem]/[inherit]! tw:text-[#857870]">{subtitle}</p>
    </div>
    <Button type="button" variant="close" className="tw:absolute tw:top-[1.231rem] tw:right-[1.385rem] tw:z-3 tw:grid tw:size-[2.462rem] tw:cursor-pointer tw:place-items-center tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:p-0 tw:text-cali-brand" onClick={onClose}><X size={16} /></Button>
  </header>;
}

export function DocumentDialogBody({ detail, children }: { detail?: boolean; children: ReactNode }) {
  return <div className={`${detail ? 'document-detail-scroll-v3' : 'document-modal-scroll'} tw:m-0! tw:flex tw:min-h-0 tw:max-w-none! tw:flex-1 tw:flex-col tw:gap-[1.077rem] tw:overflow-y-auto tw:px-[1.846rem] tw:py-[1.538rem] tw:[scrollbar-width:none] tw:[&>*]:m-0! tw:[&>*]:shrink-0`}>{children}</div>;
}
