import { Link } from '../../../../components/navigation/Link';

export function SignInFooter() {
  return <footer className="tw:col-span-full tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-[#e9e0d8] tw:bg-[#fffdfa] tw:px-7 tw:py-[0.625rem] tw:text-[0.75rem] tw:text-[#82786f] tw:max-[861px]:justify-center tw:max-[861px]:px-4 tw:max-[861px]:py-3 tw:max-[861px]:text-center">
        <span>© 2026 CALI RH</span>
        <nav className="tw:flex tw:flex-wrap tw:gap-4 tw:max-[861px]:justify-center tw:max-[861px]:gap-3 tw:[&_a]:font-medium tw:[&_a]:text-[#82786f] tw:[&_a]:no-underline tw:[&_a:hover]:text-cali-brand" aria-label="Políticas e contato">
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/politica-do-site">Site, Mapa e Portal</Link>
          <a href="https://calirh.com" target="_blank" rel="noreferrer">calirh.com</a>
        </nav>
      </footer>;
}
