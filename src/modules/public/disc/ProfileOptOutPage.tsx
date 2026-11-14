/* Perfil Comportamental CALI — saída em um clique (/perfil/sair/:token), presente em todo convite e lembrete.
   Quem sai é marcado como recusa: não recebe mais mensagens e não conta como pendente na taxa de resposta. */
import { useEffect } from 'react';
import { useDeclineRespondentInvitation } from './hooks/useDeclineRespondentInvitation';
import { questionnaire as ui } from '../forms/questionnaireStyles';
import '../forms/questionnaire-motion.css';

export function ProfileOptOutPage() {
  const { state, decline } = useDeclineRespondentInvitation();
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  return <div className={ui.page}>
    <header className={ui.header}><img className={ui.logo} src="/brand/cali-rh-bordo.png" alt="CALI RH" /></header>
    <main className={ui.stage}><div className={`${ui.screen} ${ui.center} ${ui.enter} tw:max-w-[45rem]`}>
      <small className={ui.eyebrow}>PERFIL COMPORTAMENTAL</small>
      {state === 'done' ? <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Pronto.</h1><p className={ui.description}>Você não vai receber mais mensagens sobre este convite. Se mudar de ideia, fale com quem enviou.</p></>
        : state === 'failed' ? <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Não foi possível</h1><p className={ui.description}>Este convite já foi respondido ou não existe mais.</p></>
        : <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Não quer participar?</h1><p className={ui.description}>Ao confirmar, este convite é encerrado e você não recebe mais lembretes. Nada do que você respondeu até aqui é usado.</p>
          <div className={ui.actions}><button type="button" className={ui.primary} disabled={state === 'busy'} onClick={decline}>{state === 'busy' ? 'Encerrando…' : 'Não quero participar'}</button></div></>}
    </div></main>
    <footer className={ui.footer}><a className={ui.footerLink} href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a className={ui.footerLink} href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>;
}
