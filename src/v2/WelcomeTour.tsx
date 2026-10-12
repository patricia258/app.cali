/* Boas-vindas no primeiro acesso do cliente: tela com o vídeo da Patricia (por ora só a moldura) e, na sequência,
   o que cada item do menu faz. Sem banco por enquanto: "já viu" fica guardado no navegador, por usuário
   (cali:welcome-seen:<id>). Quando houver autorização de banco, trocar por um campo no perfil para valer em qualquer aparelho.
   Reabre por evento: window.dispatchEvent(new Event('cali:welcome-open')). */
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, X } from 'lucide-react';
import { useWorkspaceAuth } from '../auth/WorkspaceAuthProvider';

export const WELCOME_OPEN_EVENT = 'cali:welcome-open';
/* Enquanto o vídeo não chega, a apresentação fica só na homologação; no oficial ela não abre sozinha nem aparece no menu.
   Para liberar no oficial: trocar para `true`. */
export const WELCOME_LIVE = typeof window !== 'undefined' && window.location.hostname !== 'app.calirh.com';
type Step = { href?: string; label: string; title: string; text: string };
const steps: Step[] = [
  { label: 'BOAS-VINDAS', title: 'Que bom ter você aqui', text: 'Este é o espaço da sua empresa com a CALI. Tudo o que fazemos juntos fica aqui, em um só lugar. Assista ao vídeo e depois veja, em um minuto, o que cada parte do menu faz.' },
  { href: '/cliente', label: 'VISÃO GERAL', title: 'O resumo do que importa agora', text: 'Mostra o que precisa da sua atenção, os próximos compromissos e os últimos avisos. É a primeira tela ao entrar.' },
  { href: '/cliente/equipe', label: 'EQUIPE', title: 'As pessoas da sua empresa', text: 'O quadro de colaboradores. Uma vez por mês você confirma quem entrou, quem saiu e o que mudou. É isso que alimenta os indicadores.' },
  { href: '/cliente/horas', label: 'HORAS', title: 'O uso das horas contratadas', text: 'Quanto do pacote de horas já foi usado e em quê, mês a mês.' },
  { href: '/cliente/cronograma', label: 'CALENDÁRIO', title: 'Reuniões, visitas e datas', text: 'Os compromissos com a CALI e as datas importantes. Por aqui você também pede um horário.' },
  { href: '/cliente/registros', label: 'OCORRÊNCIAS', title: 'O canal para falar com a CALI', text: 'Dúvidas, pedidos e situações do dia a dia. Cada conversa fica registrada, com começo, meio e fim.' },
  { href: '/cliente/documentos', label: 'DOCUMENTOS', title: 'Os materiais da sua empresa', text: 'Políticas, modelos e documentos entregues pela CALI, sempre na versão mais recente.' },
  { href: '/cliente/relatorios', label: 'RELATÓRIOS', title: 'O fechamento de cada período', text: 'O que foi feito, as horas usadas e os próximos passos, em um documento para ler e dar ciência.' },
  { href: '/cliente/entregaveis', label: 'PROJETOS', title: 'Os projetos em andamento', text: 'Cronograma e entregas de cada projeto. Quando algo depender da sua aprovação, aparece aqui em destaque.' },
  { href: '/cliente/avisos', label: 'AVISOS', title: 'Os comunicados da CALI', text: 'Feriados, mudanças de atendimento e novidades. Você pode marcar "Estou ciente" e comentar.' },
  { label: 'TUDO PRONTO', title: 'Pode começar', text: 'O sino no topo avisa quando houver novidade. Para rever esta apresentação, abra o menu do seu perfil e clique em "Rever apresentação".' },
];

export function WelcomeTour() {
  const { user } = useWorkspaceAuth();
  const key = user?.id ? `cali:welcome-seen:${user.id}` : '';
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => { if (!key || !WELCOME_LIVE) return; try { if (!localStorage.getItem(key)) setIndex(0); } catch { /* sem armazenamento: não insiste */ } }, [key]);
  useEffect(() => { const open = () => setIndex(0); window.addEventListener(WELCOME_OPEN_EVENT, open); return () => window.removeEventListener(WELCOME_OPEN_EVENT, open); }, []);
  const step = index == null ? null : steps[index];
  useEffect(() => {
    document.querySelectorAll('.v2-tour-focus').forEach((node) => node.classList.remove('v2-tour-focus'));
    if (step?.href) document.querySelector(`.sidebar nav a[href="${step.href}"]`)?.classList.add('v2-tour-focus');
    return () => document.querySelectorAll('.v2-tour-focus').forEach((node) => node.classList.remove('v2-tour-focus'));
  }, [step]);
  if (index == null || !step) return null;
  const close = () => { try { if (key) localStorage.setItem(key, new Date().toISOString()); } catch { /* segue */ } setIndex(null); };
  const last = index === steps.length - 1;
  return <div className="v2-welcome-overlay"><section className="v2-welcome" role="dialog" aria-modal="true" aria-label="Apresentação do CALI Workspace" key={index}>
    <header><span>{step.label}</span><button type="button" onClick={close} aria-label="Fechar apresentação"><X size={16} /></button></header>
    <div className="v2-welcome-body">
      {index === 0 && <div className="v2-welcome-video" role="img" aria-label="Vídeo de boas-vindas (em breve)"><span><Play size={22} /></span><small>Vídeo de boas-vindas · em breve</small></div>}
      <h2>{step.title}</h2><p>{step.text}</p>
    </div>
    <footer>
      <div className="v2-welcome-dots" aria-label={`Passo ${index + 1} de ${steps.length}`}>{steps.map((item, position) => <i key={item.label} className={position === index ? 'on' : ''} />)}</div>
      {!last && <button type="button" className="v2-welcome-skip" onClick={close}>Pular</button>}
      {index > 0 && <button type="button" className="outline-button" onClick={() => setIndex(index - 1)}><ArrowLeft size={14} /> Voltar</button>}
      <button type="button" className="primary-button" onClick={() => last ? close() : setIndex(index + 1)}>{index === 0 ? 'Conhecer o Workspace' : last ? 'Começar' : 'Avançar'} <ArrowRight size={14} /></button>
    </footer>
  </section></div>;
}
