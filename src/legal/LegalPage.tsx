/* Páginas públicas /privacidade e /termos: abertas sem login (link na tela de entrada e no menu do perfil). */
import { Link } from 'react-router-dom';
import { LegalDocument } from './LegalDocument';
import { LEGAL_UPDATED_AT, legalEnabled, privacyPolicy, termsOfUse } from './legalTexts';
import './legal.css';

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  return <main className="v2-legal-page">
    <header className="v2-legal-top">
      <Link to="/login" className="v2-legal-brand" aria-label="Ir para a entrada do CALI Workspace"><b>CALI</b> WORKSPACE</Link>
      <nav aria-label="Documentos"><Link to="/privacidade" className={privacy ? 'on' : ''}>Política de Privacidade</Link><Link to="/termos" className={privacy ? '' : 'on'}>Termos de Uso</Link></nav>
    </header>
    {legalEnabled()
      ? <LegalDocument source={privacy ? privacyPolicy() : termsOfUse()} idPrefix={kind} />
      : <article className="v2-legal-doc"><h2>{privacy ? 'Política de Privacidade' : 'Termos de Uso'}</h2><p>Documento em publicação. Em caso de dúvida, fale com a CALI RH.</p></article>}
    <footer className="v2-legal-foot">CALI RH · AKAYKO AZUMI RH LTDA · Última atualização: {LEGAL_UPDATED_AT}</footer>
  </main>;
}
