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
      className={`sidebar tw:fixed tw:inset-y-0 tw:z-20 tw:flex tw:min-h-dvh tw:shrink-0 tw:flex-col tw:bg-[linear-gradient(175deg,#5a1e2d_0%,#642a3b_42%,#785044_74%,#b58c52_100%)] tw:text-white tw:transition-[left] tw:duration-200 tw:motion-reduce:transition-none tw:[@media(min-width:53.1875rem)]:left-0 tw:[@media(min-width:53.1875rem)]:w-[4.308rem] tw:[@media(min-width:53.1875rem)]:min-w-[4.308rem] tw:[@media(min-width:53.1875rem)]:transition-none ${mobileOpen ? 'mobile-open tw:left-0 tw:w-[4.462rem]' : 'tw:left-[-5.385rem] tw:w-20'}`}
      aria-label="Menu lateral CALI"
    >
      <div className="brand tw:relative tw:flex tw:h-[5.769rem] tw:min-h-[5.692rem] tw:items-center tw:justify-center tw:[@media(min-width:53.1875rem)]:h-[5.231rem] tw:[@media(min-width:53.1875rem)]:min-h-[5.231rem]">
        <span className="tw:block tw:size-[2.308rem] tw:bg-white tw:[mask:url('/brand/cali-oak-mark.svg')_center/contain_no-repeat]" role="img" aria-label="CALI" />
      </div>
      <nav className="tw:flex tw:flex-col tw:gap-[0.385rem] tw:px-[0.923rem] tw:pt-[1.538rem] tw:pb-[0.615rem] tw:[@media(min-width:53.1875rem)]:px-[0.538rem] tw:[@media(min-width:53.1875rem)]:pt-[0.923rem] tw:[@media(min-width:53.1875rem)]:pb-[0.692rem]" aria-label="Navegação principal">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return <Link
            key={href}
            to={href}
            onMouseEnter={() => onPreview(href)}
            onFocus={() => onPreview(href)}
            className={`nav-link tw:flex tw:min-h-[2.923rem] tw:items-center tw:justify-center tw:rounded-[0.538rem] tw:border-0 tw:p-0 tw:text-left tw:whitespace-nowrap tw:no-underline tw:[@media(min-width:53.1875rem)]:min-h-[2.846rem] tw:[@media(min-width:53.1875rem)]:w-[3.231rem] tw:[@media(min-width:53.1875rem)]:rounded-[0.615rem] ${active ? 'active tw:bg-white/15 tw:text-white tw:shadow-[inset_2px_0_0_#dcb87b] tw:hover:bg-white/15' : 'tw:bg-transparent tw:text-[#f2dde2] tw:hover:bg-white/9'} ${tourHref === href ? 'tw:relative tw:z-996 tw:rounded-[0.5625rem] tw:bg-white! tw:text-cali-brand! tw:shadow-[0_0_0_0.1875rem_#d6e36a,0_0.5rem_1.5rem_#19070a55]!' : ''}`}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={17} strokeWidth={1.6} className="tw:[@media(min-width:53.1875rem)]:size-[1.231rem] tw:[@media(min-width:53.1875rem)]:stroke-[1.55]" />
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom tw:mt-auto tw:min-w-0 tw:overflow-hidden tw:px-[0.615rem] tw:pt-[0.692rem] tw:pb-[1.308rem] tw:[@media(min-width:53.1875rem)]:overflow-visible tw:[@media(min-width:53.1875rem)]:px-[0.462rem] tw:[@media(min-width:53.1875rem)]:pt-[0.615rem] tw:[@media(min-width:53.1875rem)]:pb-[1rem]">
        <span className="gold-rule tw:mx-[0.462rem] tw:mb-[0.923rem] tw:block tw:border-0 tw:border-t tw:border-solid tw:border-[#e4c17b80] tw:[@media(min-width:53.1875rem)]:mx-[0.538rem] tw:[@media(min-width:53.1875rem)]:mb-[0.769rem]" />
        <a className="nav-link tw:flex tw:min-h-[2.923rem] tw:w-full tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-[0.538rem] tw:text-[#f2dde2] tw:no-underline tw:hover:bg-white/9 tw:[@media(min-width:53.1875rem)]:min-h-[2.846rem] tw:[@media(min-width:53.1875rem)]:w-[3.231rem] tw:[@media(min-width:53.1875rem)]:rounded-[0.615rem]" href="https://calirh.com/privacidade.html" target="_blank" rel="noopener noreferrer" title="Política de privacidade" aria-label="Política de privacidade">
          <ShieldCheck size={17} />
        </a>
      </div>
      {teamFlyout && <TeamFlyout selected={teamTab} onMouseEnter={() => onPreview('/cliente/equipe')} />}
    </aside>
  );
}

function TeamFlyout({ selected, onMouseEnter }: { selected: string | null; onMouseEnter: () => void }) {
  return (
    <div className="sidebar-flyout tw:absolute tw:top-40 tw:left-[calc(100%-1px)] tw:z-80 tw:max-h-[min(30.769rem,calc(100vh-11.538rem))] tw:w-[17.385rem] tw:overflow-y-auto tw:rounded-r-[0.846rem] tw:border tw:border-solid tw:border-[#e9e2db] tw:bg-white tw:px-[0.846rem] tw:pt-[0.923rem] tw:pb-4 tw:text-[#352e2d] tw:shadow-[7px_12px_28px_#40212d22] tw:[@media(max-width:53.125rem)]:left-full" onMouseEnter={onMouseEnter}>
      <div className="flyout-heading tw:mb-[0.538rem] tw:flex tw:flex-col tw:items-start tw:gap-[0.385rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee9e4] tw:px-[0.769rem] tw:pt-[0.769rem] tw:pb-[1.077rem]">
        <strong className="tw:text-[1.154rem]/[inherit] tw:text-cali-brand">Equipe</strong>
        <span className="flyout-context tw:text-[0.769rem]/[inherit] tw:font-medium tw:text-[#a29389]">Áreas do módulo</span>
      </div>
      {teamAreas.map(([id, label]) => <Link
        key={id}
        className={`flyout-link tw:flex tw:w-full tw:items-center tw:gap-[0.846rem] tw:rounded-[0.615rem] tw:px-[0.769rem] tw:py-[0.846rem] tw:text-left tw:no-underline tw:hover:bg-[#faf6f3] ${selected === id ? 'selected tw:bg-[#f7f1ef] tw:font-bold tw:text-cali-brand' : 'tw:bg-transparent tw:text-[#655b57]'}`}
        to={`/cliente/equipe?aba=${id}`}
      >
        <span className="tw:flex-1 tw:text-[0.846rem]/[inherit]">{label}</span>
        {selected === id ? <CheckCircle2 className="tw:text-[#b5a49b]" size={14} /> : <ChevronRight className="tw:text-[#b5a49b]" size={13} />}
      </Link>)}
    </div>
  );
}
