import { Instagram, Linkedin, Mail } from 'lucide-react';
import { Link } from '../../../../components/navigation/Link';

export function LandingFooter() {
  return <footer className="tw:border-0 tw:border-t tw:border-solid tw:border-[color:var(--lp-line)] tw:bg-cali-red-inverse tw:pt-8.5 tw:pb-9 tw:text-cali-day-canvas">
        <div className="tw:mx-auto tw:flex tw:w-[min(77.5rem,calc(100%-2.75rem))] tw:flex-wrap tw:items-center tw:justify-between tw:gap-6 tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-surface/[.208] tw:pt-8.5 tw:[@media(max-width:800px)]:flex-col tw:[@media(max-width:800px)]:items-start">
          <a href="https://calirh.com" aria-label="CALI RH, ir para o site"><img className="tw:h-15 tw:w-25 tw:object-contain tw:object-left" src="/brand/cali-logo-light.svg" alt="CALI RH" /></a>
          <nav className="tw:flex tw:flex-wrap tw:gap-5.5 tw:[&_a]:font-[DM_Sans,sans-serif] tw:[&_a]:text-cali-detail tw:[&_a]:leading-[normal] tw:[&_a]:font-normal tw:[&_a]:text-cali-sand-soft/79 tw:[&_a:hover]:text-cali-orange-line tw:[@media(max-width:800px)]:grid tw:[@media(max-width:800px)]:w-full tw:[@media(max-width:800px)]:grid-cols-2 tw:[@media(max-width:800px)]:gap-4" aria-label="Links CALI"><a href="https://calirh.com/assessoria">Assessoria mensal</a><a href="https://calirh.com/projetos">Projetos</a><a href="https://calirh.com/sobre">A CALI</a><a href="https://comuni.calirh.com/" target="_blank" rel="noopener noreferrer">ComuniCALI</a><a href="https://portal.calirh.com">Portal de propostas</a><Link to="/login">Acesso ao app</Link><a href="https://calirh.com/privacidade.html">Privacidade</a></nav>
          <div className="tw:flex tw:gap-2 tw:[&_a]:grid tw:[&_a]:size-10 tw:[&_a]:place-items-center tw:[&_a]:text-cali-day-canvas"><a href="https://www.instagram.com/calirh_/" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><Instagram size={24}/></a><a href="https://www.linkedin.com/in/patriciaazumi/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><Linkedin size={24}/></a><a href="mailto:patricia@calirh.com" aria-label="E-mail"><Mail size={24}/></a></div>
          <div className="tw:mt-2 tw:block tw:w-full tw:font-[DM_Sans,sans-serif] tw:text-xs tw:leading-[normal] tw:font-normal tw:tracking-[.035em] tw:text-cali-sand-soft/50">
            <span>© {new Date().getFullYear()} CALI RH · HRB — RH para o Negócio · Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>;
}
