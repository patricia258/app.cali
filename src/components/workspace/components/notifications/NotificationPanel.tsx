import { Bell, Check } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  id: string;
  unread: number;
  onMarkAll: () => void;
  children: ReactNode;
};

export function NotificationPanel({ id, unread, onMarkAll, children }: Props) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Notificações"
      className="tw:absolute tw:top-[calc(100%+0.8125rem)] tw:right-0 tw:z-120 tw:max-h-[min(38.125rem,calc(100dvh-5.75rem))]
        tw:w-[min(26.875rem,calc(100vw-1.75rem))] tw:overflow-hidden tw:rounded-[1.375rem] tw:border tw:border-solid
        tw:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_12%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-surface)_96%,transparent)]
        tw:shadow-[0_1.75rem_4.75rem_rgb(var(--cali-rgb-red-inverse)/0.2)] tw:backdrop-blur-[1.25rem] tw:backdrop-saturate-[1.05]
        tw:motion-safe:animate-[notification-popover-in_.34s_cubic-bezier(.2,.78,.2,1)_both]
        tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:workspace-night:text-cali-text
        tw:workspace-night:shadow-[0_1.75rem_5rem_rgb(var(--cali-rgb-shadow)/0.4)]
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:fixed tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:top-18 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:right-3.5
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:inset-x-2 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:top-auto tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:bottom-2
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:max-h-[min(76dvh,38.125rem)] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:w-auto
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:origin-bottom
        tw:workspace-compact:absolute tw:workspace-compact:inset-auto tw:workspace-compact:top-[calc(100%+1.385rem)]
        tw:workspace-compact:right-[-10.385rem] tw:workspace-compact:z-80 tw:workspace-compact:max-h-none
        tw:workspace-compact:w-[min(26.923rem,calc(100vw-5.769rem))] tw:workspace-compact:rounded-[0.846rem]
        tw:workspace-compact:border-cali-sand-line tw:workspace-compact:bg-cali-neutral-surface tw:workspace-compact:text-cali-muted
        tw:workspace-compact:shadow-[0_1.231rem_3.308rem_rgb(var(--cali-rgb-red-inverse)/0.149)] tw:workspace-compact:backdrop-filter-none
        tw:workspace-compact:motion-safe:animate-none tw:workspace-compact:[@media(max-width:53.75rem)]:top-[calc(100%+0.462rem)]
        tw:workspace-compact:[@media(max-width:53.75rem)]:right-3.5
        tw:workspace-compact:[@media(max-width:53.75rem)]:max-w-[calc(100vw-1.846rem)]"
    >
      <header className="tw:flex tw:min-h-20.5 tw:items-center tw:justify-between tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line
        tw:bg-[linear-gradient(120deg,color-mix(in_srgb,var(--cali-color-burgundy-accent)_5%,var(--theme-surface)),color-mix(in_srgb,var(--cali-color-orange-line)_10%,var(--theme-surface)))]
        tw:px-4.5 tw:py-4 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:min-h-18.5 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-3.5
        tw:workspace-compact:min-h-0 tw:workspace-compact:gap-3 tw:workspace-compact:border-cali-neutral-soft
        tw:workspace-compact:bg-none tw:workspace-compact:px-5.5 tw:workspace-compact:py-5">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3 tw:workspace-compact:gap-2.5">
          <span className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-xl tw:border tw:border-solid
            tw:border-[color-mix(in_srgb,var(--cali-color-gold-accent)_32%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-orange-line)_14%,var(--theme-surface))]
            tw:text-cali-brand tw:workspace-night:text-cali-orange-line tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:size-9.5 tw:workspace-compact:hidden">
            <Bell size={18} />
          </span>
          <div className="tw:workspace-compact:flex tw:workspace-compact:items-baseline tw:workspace-compact:gap-3">
            <strong className="tw:block tw:text-base/[inherit] tw:tracking-[-0.015em] tw:workspace-compact:text-base tw:workspace-compact:tracking-normal">Notificações</strong>
            <span className="tw:mt-0.5 tw:block tw:text-cali-label/[inherit] tw:text-cali-muted tw:workspace-compact:mt-0
              tw:workspace-compact:text-xs/[inherit] tw:workspace-compact:text-cali-neutral-accent">
              {unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
            </span>
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="tw:inline-flex tw:min-h-8.5 tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-cali-panel tw:border tw:border-solid
              tw:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_13%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)]
              tw:px-2.5 tw:py-0 tw:text-xs/[inherit] tw:font-bold tw:text-cali-brand
              tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:w-9 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:justify-center tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-0
              tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:text-[0] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:[&>svg]:size-4
              tw:workspace-compact:min-h-0 tw:workspace-compact:w-auto tw:workspace-compact:justify-start tw:workspace-compact:gap-0
              tw:workspace-compact:border-0 tw:workspace-compact:bg-transparent tw:workspace-compact:p-0
              tw:workspace-compact:text-xs/[inherit] tw:workspace-compact:font-semibold tw:workspace-compact:text-cali-neutral-accent"
          >
            <Check size={15} />Marcar como lidas
          </button>
        )}
      </header>
      <div className="tw:grid tw:max-h-[min(31.25rem,calc(100dvh-11rem))] tw:gap-1 tw:overflow-y-auto tw:overscroll-contain tw:p-2
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:max-h-[calc(76dvh-5.125rem)] tw:workspace-compact:block
        tw:workspace-compact:max-h-[min(32.308rem,calc(100vh-13.077rem))] tw:workspace-compact:overscroll-auto tw:workspace-compact:p-0">
        {children}
      </div>
    </div>
  );
}

export function EmptyNotifications() {
  return (
    <div className="tw:grid tw:min-h-42.5 tw:place-content-center tw:place-items-center tw:gap-2 tw:p-7 tw:text-center
      tw:text-cali-brand tw:workspace-compact:flex tw:workspace-compact:min-h-0 tw:workspace-compact:flex-col
      tw:workspace-compact:gap-2 tw:workspace-compact:px-7 tw:workspace-compact:py-8 tw:workspace-compact:text-cali-muted">
      <Check size={20} />
      <strong className="tw:workspace-compact:text-cali-body/[inherit] tw:workspace-compact:text-cali-muted">Nenhum aviso por aqui.</strong>
      <span className="tw:max-w-65 tw:text-xs/[1.45] tw:text-cali-muted
        tw:workspace-compact:max-w-none tw:workspace-compact:text-xs/[1.5] tw:workspace-compact:text-cali-muted">
        Novidades de projetos, horas, agenda e validações aparecem neste canal.
      </span>
    </div>
  );
}
