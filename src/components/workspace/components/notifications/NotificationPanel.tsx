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
        tw:border-[color-mix(in_srgb,#5a1e2d_12%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-surface)_96%,transparent)]
        tw:shadow-[0_1.75rem_4.75rem_#2c181f33] tw:backdrop-blur-[1.25rem] tw:backdrop-saturate-[1.05]
        tw:motion-safe:animate-[notification-popover-in_.34s_cubic-bezier(.2,.78,.2,1)_both]
        tw:workspace-night:border-cali-line tw:workspace-night:bg-[#21191d] tw:workspace-night:text-cali-text
        tw:workspace-night:shadow-[0_1.75rem_5rem_#0006]
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:fixed tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:top-[4.5rem] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:64rem)]:right-[0.875rem]
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:inset-x-2 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:top-auto tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:bottom-2
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:max-h-[min(76dvh,38.125rem)] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:w-auto
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:origin-bottom
        tw:workspace-compact:absolute tw:workspace-compact:inset-auto tw:workspace-compact:top-[calc(100%+1.385rem)]
        tw:workspace-compact:right-[-10.385rem] tw:workspace-compact:z-80 tw:workspace-compact:max-h-none
        tw:workspace-compact:w-[min(26.923rem,calc(100vw-5.769rem))] tw:workspace-compact:rounded-[0.846rem]
        tw:workspace-compact:border-[#ebe0d8] tw:workspace-compact:bg-white tw:workspace-compact:text-[#514542]
        tw:workspace-compact:shadow-[0_1.231rem_3.308rem_#35202626] tw:workspace-compact:backdrop-filter-none
        tw:workspace-compact:motion-safe:animate-none tw:workspace-compact:[@media(max-width:53.75rem)]:top-[calc(100%+0.462rem)]
        tw:workspace-compact:[@media(max-width:53.75rem)]:right-[0.923rem]
        tw:workspace-compact:[@media(max-width:53.75rem)]:max-w-[calc(100vw-1.846rem)]"
    >
      <header className="tw:flex tw:min-h-[5.125rem] tw:items-center tw:justify-between tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line
        tw:bg-[linear-gradient(120deg,color-mix(in_srgb,#5a1e2d_5%,var(--theme-surface)),color-mix(in_srgb,#e7c66f_10%,var(--theme-surface)))]
        tw:px-[1.125rem] tw:py-[1.0625rem] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:min-h-[4.625rem] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-[0.875rem]
        tw:workspace-compact:min-h-0 tw:workspace-compact:gap-[0.769rem] tw:workspace-compact:border-[#f0e7e1]
        tw:workspace-compact:bg-none tw:workspace-compact:px-[1.385rem] tw:workspace-compact:py-[1.231rem]">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-[0.6875rem] tw:workspace-compact:gap-[0.615rem]">
          <span className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-[0.8125rem] tw:border tw:border-solid
            tw:border-[color-mix(in_srgb,#b58c52_32%,var(--theme-line))] tw:bg-[color-mix(in_srgb,#e7c66f_14%,var(--theme-surface))]
            tw:text-cali-brand tw:workspace-night:text-[#e6bd73] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:size-[2.375rem] tw:workspace-compact:hidden">
            <Bell size={18} />
          </span>
          <div className="tw:workspace-compact:flex tw:workspace-compact:items-baseline tw:workspace-compact:gap-[0.769rem]">
            <strong className="tw:block tw:text-[0.98rem]/[inherit] tw:tracking-[-0.015em] tw:workspace-compact:text-base tw:workspace-compact:tracking-normal">Notificações</strong>
            <span className="tw:mt-0.5 tw:block tw:text-[0.7rem]/[inherit] tw:text-cali-muted tw:workspace-compact:mt-0
              tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:text-[#875c67]">
              {unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
            </span>
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="tw:inline-flex tw:min-h-[2.125rem] tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-[0.625rem] tw:border tw:border-solid
              tw:border-[color-mix(in_srgb,#5a1e2d_13%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)]
              tw:px-[0.625rem] tw:py-0 tw:text-[0.74rem]/[inherit] tw:font-bold tw:text-cali-brand
              tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:w-9 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:justify-center tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-0
              tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:text-[0] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:[&>svg]:size-4
              tw:workspace-compact:min-h-0 tw:workspace-compact:w-auto tw:workspace-compact:justify-start tw:workspace-compact:gap-0
              tw:workspace-compact:border-0 tw:workspace-compact:bg-transparent tw:workspace-compact:p-0
              tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-semibold tw:workspace-compact:text-[#875c67]"
          >
            <Check size={15} />Marcar como lidas
          </button>
        )}
      </header>
      <div className="tw:grid tw:max-h-[min(31.25rem,calc(100dvh-11rem))] tw:gap-[0.3125rem] tw:overflow-y-auto tw:overscroll-contain tw:p-2
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:max-h-[calc(76dvh-5.125rem)] tw:workspace-compact:block
        tw:workspace-compact:max-h-[min(32.308rem,calc(100vh-13.077rem))] tw:workspace-compact:overscroll-auto tw:workspace-compact:p-0">
        {children}
      </div>
    </div>
  );
}

export function EmptyNotifications() {
  return (
    <div className="tw:grid tw:min-h-[10.625rem] tw:place-content-center tw:place-items-center tw:gap-[0.4375rem] tw:p-7 tw:text-center
      tw:text-cali-brand tw:workspace-compact:flex tw:workspace-compact:min-h-0 tw:workspace-compact:flex-col
      tw:workspace-compact:gap-[0.538rem] tw:workspace-compact:px-[1.692rem] tw:workspace-compact:py-8 tw:workspace-compact:text-[#998a81]">
      <Check size={20} />
      <strong className="tw:workspace-compact:text-[0.923rem]/[inherit] tw:workspace-compact:text-[#514542]">Nenhum aviso por aqui.</strong>
      <span className="tw:max-w-[16.25rem] tw:text-[0.76rem]/[1.45] tw:text-cali-muted
        tw:workspace-compact:max-w-none tw:workspace-compact:text-[0.769rem]/[1.5] tw:workspace-compact:text-[#998a81]">
        Novidades de projetos, horas, agenda e validações aparecem neste canal.
      </span>
    </div>
  );
}
