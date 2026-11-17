import { CheckCircle2, ChevronRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from '../../navigation/Link';

export type WorkspaceNavItem = { label: string; href: string; icon: LucideIcon };

const teamAreas = [
  ['diretorio', 'Diretório'],
  ['estrutura', 'Estrutura organizacional'],
  ['movimentacoes', 'Movimentações'],
  ['indicadores', 'Indicadores'],
] as const;

type Props = {
  navigation: WorkspaceNavItem[];
  mobileOpen: boolean;
  teamFlyout: boolean;
  teamTab: string | null;
  tourHref: string | null;
  isActive: (href: string) => boolean;
  onPreview: (href: string | null) => void;
};

export function CompactWorkspaceSidebar({ navigation, mobileOpen, teamFlyout, teamTab, tourHref, isActive, onPreview }: Props) {
  return (
    <aside
      onMouseLeave={() => onPreview(null)}
      className={`sidebar tw:fixed tw:inset-y-0 tw:z-20 tw:flex tw:min-h-dvh tw:w-18 tw:shrink-0 tw:flex-col tw:bg-[linear-gradient(175deg,var(--cali-color-burgundy-accent)_0%,var(--cali-color-red-strong)_42%,var(--cali-color-sand-strong)_74%,var(--cali-color-gold-accent)_100%)] tw:text-cali-neutral-surface tw:transition-[left] tw:duration-200 tw:motion-reduce:transition-none tw:[@media(min-width:53.1875rem)]:left-0 tw:[@media(min-width:53.1875rem)]:w-17 tw:[@media(min-width:53.1875rem)]:min-w-[4.308rem] tw:[@media(min-width:53.1875rem)]:transition-none ${mobileOpen ? 'mobile-open tw:left-0' : 'tw:-left-21.5'}`}
      aria-label="Menu lateral CALI"
    >
      <div className="brand tw:relative tw:flex tw:h-23 tw:min-h-[5.692rem] tw:items-center tw:justify-center tw:[@media(min-width:53.1875rem)]:h-21 tw:[@media(min-width:53.1875rem)]:min-h-[5.231rem]">
        <span className="tw:block tw:size-9 tw:bg-cali-neutral-surface tw:[mask:url('/brand/cali-oak-mark.svg')_center/contain_no-repeat]" role="img" aria-label="CALI" />
      </div>
      <nav className="tw:flex tw:flex-col tw:gap-1.5 tw:px-3.5 tw:pt-6 tw:pb-2.5 tw:[@media(min-width:53.1875rem)]:px-2 tw:[@media(min-width:53.1875rem)]:pt-3.5 tw:[@media(min-width:53.1875rem)]:pb-3" aria-label="Navegação principal">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return <Link
            key={href}
            to={href}
            onMouseEnter={() => onPreview(href)}
            onFocus={() => onPreview(href)}
            className={`nav-link tw:flex tw:min-h-[2.923rem] tw:items-center tw:justify-center tw:rounded-lg tw:border-0 tw:p-0 tw:text-left tw:whitespace-nowrap tw:no-underline tw:[@media(min-width:53.1875rem)]:min-h-[2.846rem] tw:[@media(min-width:53.1875rem)]:w-13 tw:[@media(min-width:53.1875rem)]:rounded-cali-compact-control ${active ? 'active tw:bg-cali-neutral-surface/15 tw:text-cali-neutral-surface tw:shadow-[inset_2px_0_0_var(--cali-color-orange-line)] tw:hover:bg-cali-neutral-surface/15' : 'tw:bg-transparent tw:text-cali-burgundy-surface tw:hover:bg-cali-neutral-surface/9'} ${tourHref === href ? 'tw:relative tw:z-996 tw:rounded-lg tw:bg-cali-neutral-surface! tw:text-cali-brand! tw:shadow-[0_0_0_0.1875rem_var(--cali-color-gold-line),0_0.5rem_1.5rem_rgb(var(--cali-rgb-neutral-inverse)/0.3333)]!' : ''}`}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={17} strokeWidth={1.6} className="tw:[@media(min-width:53.1875rem)]:size-5 tw:[@media(min-width:53.1875rem)]:stroke-[1.55]" />
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom tw:mt-auto tw:min-w-0 tw:overflow-hidden tw:px-2.5 tw:pt-3 tw:pb-5 tw:[@media(min-width:53.1875rem)]:overflow-visible tw:[@media(min-width:53.1875rem)]:px-2 tw:[@media(min-width:53.1875rem)]:pt-2.5 tw:[@media(min-width:53.1875rem)]:pb-4">
        <span className="gold-rule tw:mx-2 tw:mb-3.5 tw:block tw:border-0 tw:border-t tw:border-solid tw:border-cali-orange-line/50 tw:[@media(min-width:53.1875rem)]:mx-2 tw:[@media(min-width:53.1875rem)]:mb-3" />
        <a className="nav-link tw:flex tw:min-h-[2.923rem] tw:w-full tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-lg tw:text-cali-burgundy-surface tw:no-underline tw:hover:bg-cali-neutral-surface/9 tw:[@media(min-width:53.1875rem)]:min-h-[2.846rem] tw:[@media(min-width:53.1875rem)]:w-13 tw:[@media(min-width:53.1875rem)]:rounded-cali-compact-control" href="https://calirh.com/privacidade.html" target="_blank" rel="noopener noreferrer" title="Política de privacidade" aria-label="Política de privacidade">
          <ShieldCheck size={17} />
        </a>
      </div>
      {teamFlyout && <TeamFlyout selected={teamTab} onMouseEnter={() => onPreview('/cliente/equipe')} />}
    </aside>
  );
}

function TeamFlyout({ selected, onMouseEnter }: { selected: string | null; onMouseEnter: () => void }) {
  return (
    <div className="sidebar-flyout tw:absolute tw:top-40 tw:left-[calc(100%-1px)] tw:z-80 tw:max-h-[min(30.769rem,calc(100vh-11.538rem))] tw:w-[17.385rem] tw:overflow-y-auto tw:rounded-r-[0.846rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:px-3.5 tw:pt-3.5 tw:pb-4 tw:text-cali-text tw:shadow-[7px_12px_28px_rgb(var(--cali-rgb-red-inverse)/0.1333)] tw:[@media(max-width:53.125rem)]:left-full" onMouseEnter={onMouseEnter}>
      <div className="flyout-heading tw:mb-2 tw:flex tw:flex-col tw:items-start tw:gap-1.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:px-3 tw:pt-3 tw:pb-4.5">
        <strong className="tw:text-lg/[inherit] tw:text-cali-brand">Equipe</strong>
        <span className="flyout-context tw:text-xs/[inherit] tw:font-medium tw:text-cali-sand-text">Áreas do módulo</span>
      </div>
      {teamAreas.map(([id, label]) => <Link
        key={id}
        className={`flyout-link tw:flex tw:w-full tw:items-center tw:gap-3.5 tw:rounded-cali-compact-control tw:px-3 tw:py-3.5 tw:text-left tw:no-underline tw:hover:bg-cali-surface-soft ${selected === id ? 'selected tw:bg-cali-neutral-soft tw:font-bold tw:text-cali-brand' : 'tw:bg-transparent tw:text-cali-muted'}`}
        to={`/cliente/equipe?aba=${id}`}
      >
        <span className="tw:flex-1 tw:text-sm/[inherit]">{label}</span>
        {selected === id ? <CheckCircle2 className="tw:text-cali-sand-accent" size={14} /> : <ChevronRight className="tw:text-cali-sand-accent" size={13} />}
      </Link>)}
    </div>
  );
}
