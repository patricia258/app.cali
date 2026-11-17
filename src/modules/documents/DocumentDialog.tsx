import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ds/Button';
import { DialogFrame } from '../../components/ds/DialogFrame';

export function DocumentDialog({ label, detail, children }: { label: string; detail?: boolean; children: ReactNode }) {
  return <div className="modal-backdrop workspace-modal-backdrop tw:workspace-compact:motion-safe:animate-[v2-fade_.22s_ease-out_backwards] tw:workspace-compact:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] tw:fixed tw:inset-0 tw:z-980 tw:grid! tw:place-items-center tw:bg-cali-neutral-inverse/66! tw:p-5.5 tw:backdrop-blur-[0.308rem]" role="presentation">
    <DialogFrame
      className={`modal-card ${detail ? 'document-detail-modal-v3 tw:w-[min(55.385rem,100%)]!' : 'document-create-modal document-create-modal-v3 tw:w-[min(58.462rem,100%)]!'} tw:relative tw:flex! tw:max-h-[92dvh]! tw:max-w-none! tw:flex-col tw:gap-0! tw:overflow-hidden! tw:rounded-[1.077rem]! tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface! tw:p-0! tw:font-cali-body tw:text-cali-body/[inherit] tw:text-cali-text tw:shadow-[0_25px_85px_rgb(var(--cali-rgb-burgundy-inverse)/0.2902)]`}
      aria-label={label}
    >{children}</DialogFrame>
  </div>;
}

export function DocumentDialogHeader({ detail, title, kicker, subtitle, onClose, children }: {
  detail?: boolean; title: string; kicker: string; subtitle?: string | null; onClose: () => void; children?: ReactNode;
}) {
  return <header className={`${detail ? 'document-detail-header-v3' : 'document-modal-header'} tw:m-0! tw:flex tw:max-w-none! tw:shrink-0 tw:items-center tw:gap-4.5 tw:rounded-none! tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-[linear-gradient(90deg,var(--cali-color-sand-surface),var(--cali-color-orange-surface))] tw:pt-6 tw:pr-19.5 tw:pb-5.5 tw:pl-7.5`}>
    {children}
    <div className="tw:min-w-0">
      <span className="tw:block tw:text-cali-label/[inherit] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold tw:uppercase">{kicker}</span>
      <h2 className="tw:mt-2! tw:mb-0! tw:text-2xl/[1.25]! tw:font-bold tw:text-cali-brand">{title}</h2>
      <p className="tw:mt-1.5! tw:mb-0! tw:text-sm/[inherit]! tw:text-cali-muted">{subtitle}</p>
    </div>
    <Button type="button" variant="close" className="tw:absolute tw:top-5 tw:right-5.5 tw:z-3 tw:grid tw:size-10 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-0 tw:text-cali-brand" onClick={onClose}><X size={16} /></Button>
  </header>;
}

export function DocumentDialogBody({ detail, children }: { detail?: boolean; children: ReactNode }) {
  return <div className={`${detail ? 'document-detail-scroll-v3' : 'document-modal-scroll'} tw:m-0! tw:flex tw:min-h-0 tw:max-w-none! tw:flex-1 tw:flex-col tw:gap-4.5 tw:overflow-y-auto tw:px-7.5 tw:py-6 tw:[scrollbar-width:none] tw:[&>*]:m-0! tw:[&>*]:shrink-0`}>{children}</div>;
}
