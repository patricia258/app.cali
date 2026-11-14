import { LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { nextThemeBoundary, resolveWorkspaceTheme, setManualWorkspaceTheme, workspaceThemeEventName, type WorkspaceTheme } from '../../../lib/workspaceTheme';
import { Link } from '../../navigation/Link';
import { isDocumentNavigationActive, type DocumentNavigationItem } from './DocumentWorkspaceSidebar';

type Props = {
  pageLabel: string;
  pathname: string;
  products: DocumentNavigationItem[];
  timer: ReactNode;
  notifications: ReactNode;
  onLogout: () => void;
};

export function DocumentWorkspaceHeader({ pageLabel, pathname, products, timer, notifications, onLogout }: Props) {
  return (
    <header className={`
      topbar tw:sticky tw:top-0 tw:z-24 tw:m-0 tw:flex tw:min-h-[3.8125rem] tw:items-center tw:justify-between tw:gap-4 tw:border-0
      tw:border-b tw:border-solid tw:border-[var(--v2-line)] tw:bg-[var(--v2-surface)] tw:px-7 tw:py-2.5 tw:outline-none
      tw:[@media(max-width:64rem)]:px-5 tw:max-[53.8125rem]:pl-[3.625rem] tw:[@media(max-width:40rem)]:justify-end
      tw:[@media(max-width:37.5rem)]:items-start tw:[@media(max-width:37.5rem)]:gap-2 tw:[@media(max-width:37.5rem)]:pr-3
      tw:print:hidden! tw:[body.workspace-modal-open_&]:invisible! tw:[body.workspace-modal-open_&]:pointer-events-none!
      `}>
      <div className="tw:flex tw:items-center tw:gap-3 tw:[@media(max-width:40rem)]:hidden">
        <span className="tw:h-[2.1875rem] tw:w-[0.5625rem] tw:rounded-full tw:bg-[linear-gradient(180deg,#5a1e2d,#b58c52)] tw:shadow-[0_0.4375rem_1rem_#5a1e2d33]" aria-hidden="true" />
        <div className="tw:grid tw:gap-0.5">
          <small className="tw:text-[0.5625rem]/[inherit] tw:font-extrabold tw:tracking-[0.12em] tw:text-[var(--v2-muted)] tw:uppercase tw:max-[53.8125rem]:hidden">CALI Workspace</small>
          <strong className="tw:text-[0.875rem]/[inherit] tw:font-[750] tw:text-[var(--v2-text)]">{pageLabel}</strong>
        </div>
      </div>
      <div className="top-actions tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-[0.5625rem] tw:[@media(max-width:37.5rem)]:justify-end tw:[@media(max-width:37.5rem)]:gap-[0.3125rem]">
        {timer}
        <div className="tw:inline-flex tw:shrink-0 tw:items-center tw:gap-1.5 tw:max-[53.8125rem]:hidden" aria-label="Sistemas externos integrados">
          {products.map(({ href, label, icon: Icon }) => {
            const active = isDocumentNavigationActive(pathname, href);
            return (
              <Link
                key={href}
                to={href}
                className={`
                  tw:relative tw:inline-flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:border tw:border-solid
                  tw:text-[#6a2438] tw:no-underline tw:shadow-[0_0.25rem_0.875rem_#331e230e]
                  tw:[transition:background_.16s_ease,border-color_.16s_ease,color_.16s_ease] tw:after:pointer-events-none tw:after:invisible
                  tw:after:absolute tw:after:bottom-[calc(100%+0.625rem)] tw:after:left-1/2 tw:after:z-1200 tw:after:w-max tw:after:max-w-40
                  tw:after:-translate-x-1/2 tw:after:translate-y-1 tw:after:rounded-lg tw:after:bg-[#33262b] tw:after:px-[0.5625rem]
                  tw:after:py-[0.4375rem] tw:after:text-[0.6875rem]/none tw:after:font-[750] tw:after:whitespace-nowrap tw:after:text-[#fffaf7]
                  tw:after:opacity-0 tw:after:shadow-[0_0.5rem_1.375rem_#190c1133] tw:after:content-[attr(data-tooltip)]
                  tw:after:[transition:opacity_.15s_ease,transform_.15s_ease,visibility_.15s_ease] tw:hover:-translate-y-px
                  tw:hover:border-[#b58c528c] tw:hover:bg-[#fffaf4] tw:hover:text-cali-brand tw:hover:shadow-[0_0.5625rem_1.25rem_#331e231a]
                  tw:hover:after:visible tw:hover:after:translate-y-0 tw:hover:after:opacity-100 tw:focus-visible:after:visible
                  tw:focus-visible:after:translate-y-0 tw:focus-visible:after:opacity-100 tw:motion-reduce:transition-none
                  tw:motion-reduce:after:transition-none tw:workspace-night:text-[#fffaf7] tw:workspace-night:hover:border-[#b58c5280]
                  tw:workspace-night:hover:bg-[#b58c521f] tw:workspace-night:hover:text-[#f1d590]
                  ${active ? 'tw:-translate-y-px tw:border-[#b58c528c] tw:bg-[#fffaf4] tw:text-cali-brand tw:shadow-[0_0.5625rem_1.25rem_#331e231a] tw:workspace-night:border-[#b58c5280] tw:workspace-night:bg-[#b58c521f] tw:workspace-night:text-[#f1d590]' : 'tw:border-[#5a1e2d1c] tw:bg-white/78 tw:workspace-night:border-[#f7f3ee1a] tw:workspace-night:bg-white/5'}`}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                data-tooltip={label}
              >
                <Icon size={19} />
              </Link>
            );
          })}
        </div>
        <DocumentThemeToggle />
        {notifications}
        <button
          className={`
            tw:relative tw:grid tw:size-10 tw:cursor-pointer tw:place-items-center tw:rounded-xl tw:border tw:border-solid
            tw:border-[#5a1e2d1a] tw:bg-white/80 tw:p-0 tw:text-[var(--burgundy)] tw:shadow-[0_0.25rem_0.875rem_#331e230e]
            tw:[transition:transform_.18s_ease,box-shadow_.18s_ease,background_.18s_ease] tw:hover:-translate-y-px tw:hover:bg-[#5a1e2d0e]
            tw:hover:shadow-[0_0.5625rem_1.5rem_#311f1912] tw:motion-reduce:transition-none tw:workspace-night:border-cali-line
            tw:workspace-night:bg-[#241b1f] tw:workspace-night:hover:bg-[#2c2126]
            `}
          type="button"
          aria-label="Sair do Workspace"
          title="Sair"
          onClick={onLogout}
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}

function DocumentThemeToggle() {
  const [theme, setTheme] = useState<WorkspaceTheme>(() => resolveWorkspaceTheme());

  useEffect(() => {
    const eventName = workspaceThemeEventName();
    function sync(event?: Event) {
      const selected = (event as CustomEvent<{ theme?: WorkspaceTheme }> | undefined)?.detail?.theme;
      setTheme(selected === 'day' || selected === 'night' ? selected : resolveWorkspaceTheme());
    }
    window.addEventListener(eventName, sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const isNight = theme === 'night';
  const nextLabel = nextThemeBoundary().getHours() === 6 ? '06:00' : '18:00';

  function toggleTheme() {
    const next = isNight ? 'day' : 'night';
    setManualWorkspaceTheme(next);
    setTheme(next);
  }

  return (
    <button
      className={`
        tw:relative tw:grid tw:size-10 tw:cursor-pointer tw:place-items-center tw:rounded-xl tw:border tw:border-solid
        tw:border-[#5a1e2d1a] tw:bg-white/80 tw:p-0 tw:text-cali-accent tw:shadow-[0_0.25rem_0.875rem_#331e230e]
        tw:[transition:transform_.18s_ease,box-shadow_.18s_ease,background_.18s_ease] tw:after:absolute tw:after:right-[0.4375rem]
        tw:after:bottom-[0.4375rem] tw:after:size-[0.3125rem] tw:after:rounded-full tw:after:bg-[var(--theme-gold)]
        tw:after:shadow-[0_0_0_0.125rem_var(--theme-surface)] tw:after:content-[''] tw:hover:-translate-y-px tw:hover:bg-white
        tw:hover:shadow-[0_0.5625rem_1.5rem_#311f1912] tw:motion-reduce:transition-none tw:workspace-night:border-cali-line
        tw:workspace-night:bg-[linear-gradient(145deg,#2c2025,#21191d)] tw:workspace-night:text-[#f1d8df]
        `}
      type="button"
      aria-label={`Tema ${isNight ? 'noturno' : 'diurno'}. Alternar tema`}
      title={`${isNight ? 'Modo noite' : 'Modo dia'} · automático às 06:00 e 18:00 · ajuste manual vale até ${nextLabel}`}
      onClick={toggleTheme}
    >
      {isNight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
