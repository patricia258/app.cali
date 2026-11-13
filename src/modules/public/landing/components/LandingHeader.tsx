import { useState } from 'react';
import { ArrowUpRight, Instagram, Linkedin, Mail, Menu, X } from 'lucide-react';
import { Link } from '../../../../components/navigation/Link';
import { useLandingHeaderScroll } from '../hooks/useLandingHeaderScroll';

const navigation = [
  { label: 'Início', href: 'https://calirh.com' },
  { label: 'Assessoria mensal', href: 'https://calirh.com/assessoria' },
  { label: 'Projetos e soluções', href: 'https://calirh.com/projetos' },
  { label: 'A CALI', href: 'https://calirh.com/sobre' },
  { label: 'ComuniCALI', href: 'https://comuni.calirh.com/', external: true },
];

const social = [
  { label: 'Instagram', href: 'https://www.instagram.com/calirh_/', icon: Instagram, external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/patriciaazumi/', icon: Linkedin, external: true },
  { label: 'E-mail', href: 'mailto:patricia@calirh.com', icon: Mail },
];

function SocialLinks({ mobile }: { mobile?: boolean }) {
  return (
    <span className={mobile
      ? 'tw:flex tw:gap-4 tw:px-1 tw:py-3'
      : 'tw:flex tw:items-center tw:gap-1 tw:border-0 tw:border-l tw:border-solid tw:border-white/25 tw:pl-3'}>
      {social.map(({ label, href, icon: Icon, external }) => (
        <a key={href} href={href} aria-label={label} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
          className={`tw:grid tw:place-items-center tw:hover:text-[#e5bf85] ${mobile ? 'tw:p-1.5 tw:text-white' : 'tw:h-9 tw:w-8 tw:text-cali-day-canvas'}`}>
          <Icon size={mobile ? 24 : 21} aria-hidden="true" />
        </a>
      ))}
    </span>
  );
}

export function LandingHeader({ contactHref }: { contactHref: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useLandingHeaderScroll();

  return (
    <header className={`tw:fixed tw:inset-x-0 tw:top-0 tw:z-200 tw:pb-[1.4375rem] tw:font-[DM_Sans,sans-serif] tw:transition-[padding] tw:duration-350 tw:motion-reduce:transition-none ${scrolled ? 'tw:pt-2.5' : 'tw:pt-[1.4375rem] tw:[@media(max-width:50rem)]:pt-3'}`}>
      <div className={`tw:relative tw:mx-auto tw:flex tw:max-w-[min(90rem,calc(100%-2.25rem))] tw:items-center tw:justify-between tw:gap-[clamp(.75rem,1.25vw,1.375rem)] tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-white/[.14] tw:py-3 tw:pr-5.5 tw:pl-[1.6875rem] tw:shadow-[0_.625rem_1.875rem_#27181c29] tw:backdrop-blur-[1.125rem] tw:transition-colors tw:duration-350 tw:motion-reduce:transition-none tw:[@media(max-width:76.25rem)]:mx-3.5 tw:[@media(max-width:50rem)]:px-4 tw:[@media(max-width:50rem)]:py-2 ${scrolled ? 'tw:bg-[#431523f5]' : 'tw:bg-[#431523de]'}`}>
        <a href="https://calirh.com" aria-label="CALI RH, ir para a página inicial">
          <img className="tw:block tw:h-[2.875rem] tw:w-24 tw:object-contain tw:[@media(max-width:50rem)]:w-[5.3125rem]" src="/brand/cali-logo-light.svg" alt="CALI RH" />
        </a>
        <nav
          className={`tw:flex tw:items-center tw:gap-[clamp(.625rem,1.1vw,1.125rem)] tw:[@media(max-width:86.25rem)]:absolute tw:[@media(max-width:86.25rem)]:inset-x-0 tw:[@media(max-width:86.25rem)]:top-[calc(100%+.4375rem)] tw:[@media(max-width:86.25rem)]:max-h-[calc(100dvh-6.875rem)] tw:[@media(max-width:86.25rem)]:flex-col tw:[@media(max-width:86.25rem)]:items-stretch tw:[@media(max-width:86.25rem)]:gap-0 tw:[@media(max-width:86.25rem)]:overflow-auto tw:[@media(max-width:86.25rem)]:rounded-[1.25rem] tw:[@media(max-width:86.25rem)]:border tw:[@media(max-width:86.25rem)]:border-solid tw:[@media(max-width:86.25rem)]:border-white/[.145] tw:[@media(max-width:86.25rem)]:bg-[#431523] tw:[@media(max-width:86.25rem)]:px-6 tw:[@media(max-width:86.25rem)]:py-5 tw:[@media(max-width:86.25rem)]:shadow-[0_1.25rem_1.875rem_#210b145e] ${menuOpen ? '' : 'tw:[@media(max-width:86.25rem)]:hidden'}`}
          aria-label="Menu principal"
          id="landing-main-navigation"
        >
          {navigation.map(({ label, href, external }) => <a key={href} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
            className="tw:text-[.8125rem] tw:leading-[inherit] tw:font-semibold tw:tracking-normal tw:text-[#fffcefe0] tw:transition-colors tw:hover:text-[#e5bf85] tw:[@media(max-width:86.25rem)]:border-0 tw:[@media(max-width:86.25rem)]:border-b tw:[@media(max-width:86.25rem)]:border-solid tw:[@media(max-width:86.25rem)]:border-white/[.125] tw:[@media(max-width:86.25rem)]:px-2 tw:[@media(max-width:86.25rem)]:py-3 tw:[@media(max-width:86.25rem)]:text-[.9375rem]">{label}</a>)}
          <div className="tw:hidden tw:border-0 tw:border-b tw:border-solid tw:border-white/25 tw:pb-2 tw:[&>a]:flex tw:[&>a]:items-center tw:[&>a]:justify-between tw:[&>a]:border-0 tw:[&>a]:border-b tw:[&>a]:border-solid tw:[&>a]:border-white/[.125] tw:[&>a]:px-2 tw:[&>a]:py-3 tw:[&>a]:text-[.9375rem] tw:[&>a]:text-[#e6bf8a] tw:[@media(max-width:86.25rem)]:block">
            <a href="https://portal.calirh.com">Portal CALI <ArrowUpRight size={16} /></a>
            <Link to="/" onClick={() => setMenuOpen(false)}>CALI Workspace <ArrowUpRight size={16} /></Link>
            <SocialLinks mobile />
          </div>
          <a className="tw:hidden tw:border-0 tw:border-b tw:border-solid tw:border-white/[.125] tw:px-2 tw:py-3 tw:text-[.9375rem] tw:font-semibold tw:text-[#e6bf8a] tw:[@media(max-width:86.25rem)]:block" href={contactHref} target="_blank" rel="noopener noreferrer">Fale com a Pati</a>
        </nav>
        <div className="tw:ml-auto tw:flex tw:items-center tw:gap-3.5 tw:whitespace-nowrap tw:[&>a]:border-0 tw:[&>a]:border-b tw:[&>a]:border-solid tw:[&>a]:border-[#d4ad7380] tw:[&>a]:pb-1 tw:[&>a]:text-xs tw:[&>a]:font-bold tw:[&>a]:text-cali-day-canvas tw:[&>a:hover]:text-[#e5bf85] tw:[@media(max-width:86.25rem)]:hidden">
          <a href="https://portal.calirh.com">Portal CALI</a>
          <Link to="/" aria-current="page">Workspace</Link>
          <SocialLinks />
        </div>
        <a className="tw:flex tw:items-center tw:gap-2 tw:rounded-[var(--id-radius-control)] tw:bg-cali-day-canvas tw:px-4 tw:py-3 tw:font-cali-body tw:text-[.8125rem] tw:leading-[inherit] tw:font-semibold tw:whitespace-nowrap tw:text-cali-brand tw:hover:bg-[#e7d6bf] tw:[@media(max-width:86.25rem)]:ml-auto tw:[@media(max-width:35rem)]:hidden" href={contactHref} target="_blank" rel="noopener noreferrer">Vamos conversar <ArrowUpRight size={16} /></a>
        <button type="button" className="tw:hidden tw:size-[2.625rem] tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:text-white tw:[@media(max-width:86.25rem)]:grid"
          onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="landing-main-navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
