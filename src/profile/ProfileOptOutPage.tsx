/* Perfil Comportamental CALI — saída em um clique (/perfil/sair/:token), presente em todo convite e lembrete.
   Quem sai é marcado como recusa: não recebe mais mensagens e não conta como pendente na taxa de resposta. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { anonPublicRpc } from '../lib/supabase';
import '../forms/public-form.css';

export function ProfileOptOutPage() {
  const { token = '' } = useParams();
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'failed'>('ask');
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  async function decline() {
    setState('busy');
    const { data } = await anonPublicRpc<{ ok: boolean }>('cali_profile_invite_decline', { p_token: token });
    setState(data?.ok ? 'done' : 'failed');
  }

  return <div className="cali-form-page">
    <header className="cf-top"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" /></header>
    <main className="cf-stage"><div className="cf-screen cf-center cf-enter">
      <small>PERFIL COMPORTAMENTAL</small>
      {state === 'done' ? <><h1>Pronto.</h1><p className="cf-desc">Você não vai receber mais mensagens sobre este convite. Se mudar de ideia, fale com quem enviou.</p></>
        : state === 'failed' ? <><h1>Não foi possível</h1><p className="cf-desc">Este convite já foi respondido ou não existe mais.</p></>
        : <><h1>Não quer participar?</h1><p className="cf-desc">Ao confirmar, este convite é encerrado e você não recebe mais lembretes. Nada do que você respondeu até aqui é usado.</p>
          <div className="cf-actions"><button type="button" className="cf-primary" disabled={state === 'busy'} onClick={() => void decline()}>{state === 'busy' ? 'Encerrando…' : 'Não quero participar'}</button></div></>}
    </div></main>
    <footer className="cf-foot"><a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>;
}
