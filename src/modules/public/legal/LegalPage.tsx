/* Páginas públicas /privacidade, /termos e /politica-do-site: abertas sem login (links na entrada e no perfil). */
import { Link } from '../../../components/navigation/Link';
import { LegalDocument } from '../../../components/legal/LegalDocument';
import { LEGAL_UPDATED_AT, legalEnabled, privacyPolicy, sitePolicy, termsOfUse } from '../../../domain/legalTexts';

const navigation = [
  { kind: 'privacy', to: '/privacidade', label: 'Política de Privacidade' },
  { kind: 'terms', to: '/termos', label: 'Termos de Uso' },
  { kind: 'site', to: '/politica-do-site', label: 'Site, Mapa e Portal' },
] as const;

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' | 'site' }) {
  const privacy = kind === 'privacy';
  const source = kind === 'site' ? sitePolicy() : legalEnabled()
    ? (privacy ? privacyPolicy() : termsOfUse())
    : `# ${privacy ? 'Política de Privacidade' : 'Termos de Uso'}\n\nDocumento em publicação. Em caso de dúvida, fale com a CALI RH.`;
  return <main className="v2-legal-page tw:min-h-screen tw:bg-cali-day-canvas tw:px-4 tw:pb-12 tw:font-[Inter,system-ui,sans-serif] tw:text-[#2b2024]">
    <header className="tw:mx-auto tw:flex tw:max-w-[860px] tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:pt-[22px] tw:pb-[18px]">
      <Link to="/login" className="tw:text-xs tw:leading-[inherit] tw:tracking-[.18em] tw:text-cali-brand tw:no-underline" aria-label="Ir para a entrada do CALI Workspace"><b className="tw:font-extrabold">CALI</b> WORKSPACE</Link>
      <nav className="tw:flex tw:flex-wrap tw:gap-1.5" aria-label="Documentos">
        {navigation.map((item) => (
          <Link
            key={item.kind}
            to={item.to}
            className={`tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-[7px] tw:text-xs tw:leading-[inherit] tw:font-semibold tw:no-underline ${kind === item.kind ? 'tw:border-[#e8ddd4] tw:bg-white tw:text-cali-brand' : 'tw:border-transparent tw:text-[#6b5d63]'}`}
          >{item.label}</Link>
        ))}
      </nav>
    </header>
    <LegalDocument source={source} idPrefix={kind} />
    <footer className="tw:mx-auto tw:mt-4 tw:max-w-[860px] tw:text-center tw:text-[11px] tw:text-[#8d8184]">CALI RH · AKAYKO AZUMI RH LTDA · {kind === 'site' ? 'Última atualização: 21 de agosto de 2026' : `Última atualização: ${LEGAL_UPDATED_AT}`}</footer>
  </main>;
}
