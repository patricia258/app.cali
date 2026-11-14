import { useState, type ReactNode } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { Link } from '../../navigation/Link';
import './document-workspace-sidebar.css';

export type DocumentNavigationItem = { label: string; href: string; icon: LucideIcon };

export function isDocumentNavigationActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
}

type Props = {
  pathname: string;
  navigation: DocumentNavigationItem[];
  profile: ReactNode;
};

export function DocumentWorkspaceSidebar({ pathname, navigation, profile }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLime, setShowLime] = useState(true);

  return <>
    <button
      className="mobile-menu tw:fixed tw:top-[0.8125rem] tw:left-4 tw:z-25 tw:hidden tw:size-11 tw:cursor-pointer tw:place-items-center tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[var(--line)] tw:bg-[var(--paper)] tw:p-0 tw:text-cali-brand tw:max-[53.8125rem]:grid tw:print:hidden!"
      type="button"
      aria-label="Abrir menu"
      aria-expanded={mobileOpen}
      aria-controls="document-workspace-navigation"
      onClick={() => setMobileOpen(true)}
    >
      <Menu />
    </button>
    {mobileOpen && <button
      className="sidebar-backdrop tw:fixed tw:inset-0 tw:z-29 tw:hidden tw:border-0 tw:bg-[#251c1e47] tw:backdrop-blur-[0.125rem] tw:max-[53.8125rem]:block"
      type="button"
      aria-label="Fechar menu"
      onClick={() => setMobileOpen(false)}
    />}
    <aside
      className={`
        sidebar tw:group/document-sidebar tw:fixed tw:inset-y-0 tw:left-0 tw:z-30 tw:isolate tw:flex tw:h-dvh tw:min-h-0 tw:max-h-dvh
        tw:flex-col tw:overflow-hidden tw:border-0 tw:text-[#fffaf7]
        tw:[transition:width_.18s_cubic-bezier(.2,.75,.25,1),box-shadow_.16s_ease,transform_.22s_ease]
        tw:motion-reduce:transition-none tw:print:hidden! tw:[body.workspace-modal-open_&]:pointer-events-none!
        tw:[body.workspace-modal-open_&]:[transform:none]! tw:max-[53.8125rem]:w-[min(18.125rem,86vw)] tw:max-[53.8125rem]:px-4
        tw:max-[53.8125rem]:pt-6 tw:max-[53.8125rem]:pb-[1.125rem] tw:min-[53.8125rem]:w-14
        tw:min-[53.8125rem]:bg-[linear-gradient(175deg,#5a1e2d_0%,#642a3b_42%,#785044_74%,#b58c52_100%)]
        tw:min-[53.8125rem]:px-[0.4375rem] tw:min-[53.8125rem]:pt-3 tw:min-[53.8125rem]:pb-2.5 tw:min-[53.8125rem]:hover:w-[12.125rem]
        tw:min-[53.8125rem]:hover:shadow-[0.75rem_0_1.75rem_#39162218] tw:min-[53.8125rem]:focus-within:w-[12.125rem]
        tw:min-[53.8125rem]:focus-within:shadow-[0.75rem_0_1.75rem_#39162218]
        ${mobileOpen ? 'mobile-open tw:max-[53.8125rem]:translate-x-0 tw:max-[53.8125rem]:bg-[linear-gradient(#581b24b8,#581b24b8),url(/brand/cali-sidebar-pattern.webp)] tw:max-[53.8125rem]:bg-cover tw:max-[53.8125rem]:bg-center' : 'tw:max-[53.8125rem]:-translate-x-full tw:max-[53.8125rem]:invisible tw:max-[53.8125rem]:pointer-events-none'}`}
      onMouseLeave={() => { if (!mobileOpen) setShowLime((current) => !current); }}
      onKeyDown={(event) => { if (mobileOpen && event.key === 'Escape') setMobileOpen(false); }}
    >
      <div className="sidebar-top tw:relative tw:flex tw:w-full tw:items-start tw:justify-between tw:max-[53.8125rem]:min-h-[7.875rem] tw:min-[53.8125rem]:min-h-12 tw:min-[53.8125rem]:justify-center">
        <div className="tw:flex tw:w-full tw:items-center tw:justify-center" aria-label="CALI Workspace">
          <img
            className="tw:h-[4.5rem] tw:w-[min(11.5rem,68vw)] tw:object-contain tw:min-[53.8125rem]:hidden tw:min-[53.8125rem]:max-w-[8.875rem] tw:min-[53.8125rem]:group-hover/document-sidebar:block tw:min-[53.8125rem]:group-focus-within/document-sidebar:block"
            src="/brand/cali-workspace-transparent.svg"
            alt="Logo CALI RH"
            decoding="async"
            fetchPriority="high"
          />
          <span
            key={String(showLime)}
            className={`
              tw:block tw:size-[2.375rem] tw:bg-[#fffaf7] tw:[mask-position:center] tw:[mask-repeat:no-repeat] tw:[mask-size:contain]
              tw:drop-shadow-[0_0.4375rem_0.625rem_#00000026] tw:motion-safe:animate-[cali-mark-in_.28s_cubic-bezier(.2,.7,.2,1)_both]
              tw:max-[53.8125rem]:hidden tw:group-hover/document-sidebar:hidden tw:group-focus-within/document-sidebar:hidden
              ${showLime ? 'tw:[mask-image:url(/brand/cali-lime-mark.svg)]' : 'tw:[mask-image:url(/brand/cali-oak-mark.svg)]'}`}
            aria-hidden="true"
          />
        </div>
        <button
          className="sidebar-close tw:grid tw:size-10 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:p-0 tw:text-white tw:min-[53.8125rem]:hidden"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        >
          <X />
        </button>
      </div>
      <nav
        id="document-workspace-navigation"
        className={`
          tw:mt-2.5 tw:flex tw:min-h-0 tw:flex-col tw:overflow-x-hidden tw:overflow-y-auto tw:overscroll-contain
          tw:[scrollbar-width:none] tw:max-[53.8125rem]:flex-1 tw:max-[53.8125rem]:gap-px tw:max-[53.8125rem]:py-px
          tw:min-[53.8125rem]:mt-2.5 tw:min-[53.8125rem]:max-h-[calc(100dvh-7.875rem)] tw:min-[53.8125rem]:gap-1
          tw:min-[53.8125rem]:group-hover/document-sidebar:mt-0 tw:min-[53.8125rem]:group-focus-within/document-sidebar:mt-3
          tw:min-[53.8125rem]:group-hover/document-sidebar:flex-1 tw:min-[53.8125rem]:group-hover/document-sidebar:gap-0.5
          tw:min-[53.8125rem]:group-focus-within/document-sidebar:gap-0.5
          tw:min-[53.8125rem]:group-hover/document-sidebar:px-[0.6875rem]
          tw:min-[53.8125rem]:group-focus-within/document-sidebar:px-[0.6875rem]
          `}
        aria-label="Navegação administrativa"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = isDocumentNavigationActive(pathname, href);
          return (
            <Link
              key={href}
              className={`
                tw:relative tw:flex tw:h-[2.375rem] tw:w-full tw:shrink-0 tw:items-center tw:justify-center tw:rounded-[0.4375rem] tw:text-xs
                tw:font-medium tw:no-underline tw:[transition:color_.18s_ease,background_.18s_ease,transform_.18s_ease]
                tw:hover:translate-x-px tw:hover:bg-white/10 tw:motion-reduce:transition-none tw:max-[53.8125rem]:h-10
                tw:max-[53.8125rem]:justify-start tw:max-[53.8125rem]:gap-3.5 tw:max-[53.8125rem]:rounded-[0.8125rem] tw:max-[53.8125rem]:px-4
                tw:max-[53.8125rem]:text-[0.94rem] tw:min-[53.8125rem]:group-hover/document-sidebar:justify-start
                tw:min-[53.8125rem]:group-focus-within/document-sidebar:justify-start tw:min-[53.8125rem]:group-hover/document-sidebar:gap-3
                tw:min-[53.8125rem]:group-focus-within/document-sidebar:gap-3 tw:min-[53.8125rem]:group-hover/document-sidebar:px-[0.8125rem]
                tw:min-[53.8125rem]:group-focus-within/document-sidebar:px-[0.8125rem]
                ${active ? 'active tw:bg-white/15 tw:text-white tw:shadow-[inset_0.125rem_0_#dcb87b] tw:max-[53.8125rem]:bg-white/14 tw:max-[53.8125rem]:shadow-[inset_0.1875rem_0_#e7c66f,0_0.5rem_1.125rem_#19060c1f]' : 'tw:text-[#fffaf7e6]'}`}
              to={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => { setMobileOpen(false); event.currentTarget.blur(); }}
            >
              <Icon size={16} strokeWidth={1.55} className="tw:shrink-0 tw:text-white tw:max-[53.8125rem]:size-5" />
              <span className="tw:hidden tw:whitespace-nowrap tw:max-[53.8125rem]:block tw:group-hover/document-sidebar:block tw:group-focus-within/document-sidebar:block">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer sidebar-footer-profile-only tw:mt-auto tw:min-w-0 tw:border-0 tw:border-t tw:border-solid tw:border-white/12
        tw:max-[53.8125rem]:w-full tw:max-[53.8125rem]:shrink-0 tw:max-[53.8125rem]:py-1.5
        tw:min-[53.8125rem]:absolute tw:min-[53.8125rem]:inset-x-2 tw:min-[53.8125rem]:bottom-[0.5625rem]
        tw:min-[53.8125rem]:grid tw:min-[53.8125rem]:grid-cols-[minmax(0,1fr)] tw:min-[53.8125rem]:h-[3.625rem] tw:min-[53.8125rem]:place-items-center tw:min-[53.8125rem]:overflow-hidden
        tw:min-[53.8125rem]:border-[#f7f3ee33] tw:min-[53.8125rem]:pt-[0.3125rem]
        tw:min-[53.8125rem]:group-hover/document-sidebar:static tw:min-[53.8125rem]:group-hover/document-sidebar:mx-2.5
        tw:min-[53.8125rem]:group-hover/document-sidebar:block tw:min-[53.8125rem]:group-hover/document-sidebar:h-auto
        tw:min-[53.8125rem]:group-hover/document-sidebar:w-full tw:min-[53.8125rem]:group-hover/document-sidebar:shrink-0
        tw:min-[53.8125rem]:group-hover/document-sidebar:overflow-visible tw:min-[53.8125rem]:group-hover/document-sidebar:border-white/12
        tw:min-[53.8125rem]:group-hover/document-sidebar:pt-2.5 tw:min-[53.8125rem]:group-hover/document-sidebar:pb-0.5
        tw:workspace-night:border-[#5a1e2d2e]">
        {profile}
      </div>
    </aside>
  </>;
}
