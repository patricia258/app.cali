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
      tw:[@media(max-width:64rem)]:px-5 tw:max-[53.8125rem]:pl-14.5 tw:[@media(max-width:40rem)]:justify-end
      tw:[@media(max-width:37.5rem)]:items-start tw:[@media(max-width:37.5rem)]:gap-2 tw:[@media(max-width:37.5rem)]:pr-3
      tw:print:hidden! tw:[body.workspace-modal-open_&]:invisible! tw:[body.workspace-modal-open_&]:pointer-events-none!
      `}>
      <div className="tw:flex tw:items-center tw:gap-3 tw:[@media(max-width:40rem)]:hidden">
        <span className="tw:h-9 tw:w-2 tw:rounded-full tw:bg-[linear-gradient(180deg,var(--cali-color-burgundy-accent),var(--cali-color-gold-accent))] tw:shadow-[0_0.4375rem_1rem_rgb(var(--cali-rgb-burgundy-accent)/0.2)]" aria-hidden="true" />
        <div className="tw:grid tw:gap-0.5">
          <small className="tw:text-cali-micro/[inherit] tw:font-extrabold tw:tracking-[0.12em] tw:text-[var(--v2-muted)] tw:uppercase tw:max-[53.8125rem]:hidden">CALI Workspace</small>
          <strong className="tw:text-sm/[inherit] tw:font-[750] tw:text-[var(--v2-text)]">{pageLabel}</strong>
        </div>
      </div>
      <div className="top-actions tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2 tw:[@media(max-width:37.5rem)]:justify-end tw:[@media(max-width:37.5rem)]:gap-1">
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
                  tw:text-cali-red-strong tw:no-underline tw:shadow-[0_0.25rem_0.875rem_rgb(var(--cali-rgb-red-inverse)/0.0549)]
                  tw:[transition:background_.16s_ease,border-color_.16s_ease,color_.16s_ease] tw:after:pointer-events-none tw:after:invisible
                  tw:after:absolute tw:after:bottom-[calc(100%+0.625rem)] tw:after:left-1/2 tw:after:z-1200 tw:after:w-max tw:after:max-w-40
                  tw:after:-translate-x-1/2 tw:after:translate-y-1 tw:after:rounded-lg tw:after:bg-cali-burgundy-strong tw:after:px-2
                  tw:after:py-2 tw:after:text-cali-label/none tw:after:font-[750] tw:after:whitespace-nowrap tw:after:text-cali-paper
                  tw:after:opacity-0 tw:after:shadow-[0_0.5rem_1.375rem_rgb(var(--cali-rgb-neutral-inverse)/0.2)] tw:after:content-[attr(data-tooltip)]
                  tw:after:[transition:opacity_.15s_ease,transform_.15s_ease,visibility_.15s_ease] tw:hover:-translate-y-px
                  tw:hover:border-cali-gold/55 tw:hover:bg-cali-gold-surface tw:hover:text-cali-brand tw:hover:shadow-[0_0.5625rem_1.25rem_rgb(var(--cali-rgb-red-inverse)/0.102)]
                  tw:hover:after:visible tw:hover:after:translate-y-0 tw:hover:after:opacity-100 tw:focus-visible:after:visible
                  tw:focus-visible:after:translate-y-0 tw:focus-visible:after:opacity-100 tw:motion-reduce:transition-none
                  tw:motion-reduce:after:transition-none tw:workspace-night:text-cali-paper tw:workspace-night:hover:border-cali-gold/50
                  tw:workspace-night:hover:bg-cali-gold/12 tw:workspace-night:hover:text-cali-orange-soft
                  ${active ? 'tw:-translate-y-px tw:border-cali-gold/55 tw:bg-cali-gold-surface tw:text-cali-brand tw:shadow-[0_0.5625rem_1.25rem_rgb(var(--cali-rgb-red-inverse)/0.102)] tw:workspace-night:border-cali-gold/50 tw:workspace-night:bg-cali-gold/12 tw:workspace-night:text-cali-orange-soft' : 'tw:border-cali-brand/11 tw:bg-cali-neutral-surface/78 tw:workspace-night:border-cali-sand-soft/10 tw:workspace-night:bg-cali-neutral-surface/5'}`}
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
            tw:border-cali-brand/10 tw:bg-cali-neutral-surface/80 tw:p-0 tw:text-[var(--burgundy)] tw:shadow-[0_0.25rem_0.875rem_rgb(var(--cali-rgb-red-inverse)/0.0549)]
            tw:[transition:transform_.18s_ease,box-shadow_.18s_ease,background_.18s_ease] tw:hover:-translate-y-px tw:hover:bg-cali-brand/5
            tw:hover:shadow-[0_0.5625rem_1.5rem_rgb(var(--cali-rgb-gold-inverse)/0.07059)] tw:motion-reduce:transition-none tw:workspace-night:border-cali-line
            tw:workspace-night:bg-cali-surface tw:workspace-night:hover:bg-cali-surface-muted
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
        tw:border-cali-brand/10 tw:bg-cali-neutral-surface/80 tw:p-0 tw:text-cali-accent tw:shadow-[0_0.25rem_0.875rem_rgb(var(--cali-rgb-red-inverse)/0.0549)]
        tw:[transition:transform_.18s_ease,box-shadow_.18s_ease,background_.18s_ease] tw:after:absolute tw:after:right-2
        tw:after:bottom-2 tw:after:size-1 tw:after:rounded-full tw:after:bg-[var(--theme-gold)]
        tw:after:shadow-[0_0_0_0.125rem_var(--theme-surface)] tw:after:content-[''] tw:hover:-translate-y-px tw:hover:bg-cali-neutral-surface
        tw:hover:shadow-[0_0.5625rem_1.5rem_rgb(var(--cali-rgb-gold-inverse)/0.07059)] tw:motion-reduce:transition-none tw:workspace-night:border-cali-line
        tw:workspace-night:bg-[linear-gradient(145deg,var(--cali-color-burgundy-strong),var(--cali-color-burgundy-inverse))] tw:workspace-night:text-cali-burgundy-surface
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
