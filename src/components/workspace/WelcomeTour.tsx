/* Boas-vindas no primeiro acesso do cliente: tela com o vídeo da Patricia (por ora só a moldura) e, na sequência,
   o que cada item do menu faz. "Já viu" fica na tabela cali_workspace.welcome_views (vale em qualquer aparelho) e, como atalho, no navegador
   (cali:welcome-seen:<id>).
   Reabre por evento: window.dispatchEvent(new Event('cali:welcome-open')). */
import { DialogFrame } from '../ds/DialogFrame';
import './components/workspace-dialog-motion.css';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Play, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { hasSeenWorkspaceWelcome, markWorkspaceWelcomeSeen } from '../../api/workspace/welcome';

export const WELCOME_OPEN_EVENT = 'cali:welcome-open';
type Step = { href?: string; label: string; title: string; text: string };
const clientSteps: Step[] = [
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

export type WelcomeStep = Step;
export function WelcomeTour({ steps: custom, onHighlight }: {
  steps?: Step[];
  onHighlight?: (href: string | null) => void;
} = {}) {
  const steps = custom || clientSteps;
  const { user } = useWorkspaceAuth();
  const key = user?.id ? `cali:welcome-seen:${user.id}` : '';
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    if (!key || !user?.id) return; let alive = true;
    try { if (localStorage.getItem(key)) return; } catch { return; /* sem armazenamento: não insiste */ }
    void (async () => {
      const seen = await hasSeenWorkspaceWelcome(user.id);
      if (!alive) return;
      if (seen) { try { localStorage.setItem(key, 'db'); } catch { /* segue */ } return; }
      setIndex(0);
    })();
    return () => { alive = false; };
  }, [key, user?.id]);
  useEffect(() => { const open = () => setIndex(0); window.addEventListener(WELCOME_OPEN_EVENT, open); return () => window.removeEventListener(WELCOME_OPEN_EVENT, open); }, []);
  const step = index == null ? null : steps[index];
  useEffect(() => {
    onHighlight?.(step?.href ?? null);
    return () => onHighlight?.(null);
  }, [onHighlight, step?.href]);
  if (index == null || !step) return null;
  const close = () => { try { if (key) localStorage.setItem(key, new Date().toISOString()); } catch { /* segue */ } if (user?.id) void markWorkspaceWelcomeSeen(user.id); setIndex(null); };
  const last = index === steps.length - 1;
  return (
    <div
      data-workspace-welcome
      className="tw:fixed tw:inset-0 tw:z-995 tw:grid tw:place-items-center tw:bg-cali-burgundy-inverse/45 tw:p-5.5 tw:backdrop-blur-[.154rem] tw:motion-safe:animate-[workspace-dialog-fade_.22s_ease-out_backwards]"
    >
      <DialogFrame
        aria-label="Apresentação do CALI Workspace"
        key={step.title}
        className="tw:flex tw:max-h-full tw:w-full tw:max-w-[35.385rem] tw:flex-col tw:overflow-auto tw:rounded-[.923rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:shadow-[0_1.846rem_6.154rem_rgb(var(--cali-rgb-red-inverse)/0.251)] tw:motion-safe:animate-[workspace-dialog-enter_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
      >
        <header className="tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-5.5 tw:py-4.5">
          <span className="tw:text-xs tw:font-extrabold tw:tracking-[.108rem] tw:text-cali-warning">{step.label}</span>
          <button type="button" onClick={close} aria-label="Fechar apresentação" className="tw:grid tw:size-8.5 tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-0 tw:text-cali-text">
            <X aria-hidden="true" className="tw:size-5" />
          </button>
        </header>
        <div className="tw:flex tw:min-h-[9.846rem] tw:flex-col tw:gap-3 tw:p-5.5">
          {index === 0 && (
            <div role="img" aria-label="Vídeo de boas-vindas (em breve)" className="tw:mb-1 tw:flex tw:aspect-video tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:rounded-cali-panel tw:bg-[linear-gradient(135deg,var(--cali-color-burgundy-accent),var(--cali-color-red-strong))]">
              <span className="tw:grid tw:size-16.5 tw:place-items-center tw:rounded-full tw:border tw:border-solid tw:border-cali-neutral-surface/35 tw:bg-cali-neutral-surface/15 tw:text-cali-neutral-surface">
                <Play aria-hidden="true" className="tw:size-7" />
              </span>
              <small className="tw:text-sm tw:text-cali-line">Vídeo de boas-vindas · em breve</small>
            </div>
          )}
          <h2 className="tw:m-0 tw:text-cali-title-sm tw:leading-[1.3] tw:font-bold tw:text-cali-text">{step.title}</h2>
          <p className="tw:m-0 tw:text-base tw:leading-[1.6] tw:text-cali-muted">{step.text}</p>
        </div>
        <footer className="tw:flex tw:items-center tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-5.5 tw:py-3.5 tw:max-[35rem]:flex-wrap">
          <div role="img" aria-label={`Passo ${index + 1} de ${steps.length}`} className="tw:mr-auto tw:flex tw:items-center tw:gap-1 tw:max-[35rem]:mb-1 tw:max-[35rem]:w-full">
            {steps.map((item, position) => (
              <span key={item.label} className={`tw:h-2 ${position === index ? 'tw:w-5 tw:rounded-sm tw:bg-cali-brand' : 'tw:w-2 tw:rounded-full tw:bg-cali-line'}`} />
            ))}
          </div>
          {!last && <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:px-2 tw:py-2.5 tw:text-sm tw:text-cali-muted" onClick={close}>Pular</button>}
          {index > 0 && <WelcomeAction onClick={() => setIndex(index - 1)}><ArrowLeft aria-hidden="true" className="tw:size-4.5" /> Voltar</WelcomeAction>}
          <WelcomeAction primary onClick={() => last ? close() : setIndex(index + 1)}>
            {index === 0 ? 'Conhecer o Workspace' : last ? 'Começar' : 'Avançar'} <ArrowRight aria-hidden="true" className="tw:size-4.5" />
          </WelcomeAction>
        </footer>
      </DialogFrame>
    </div>
  );
}

function WelcomeAction({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return <button
    type="button"
    onClick={onClick}
    className={`tw:inline-flex tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:px-4.5 tw:py-3 tw:text-sm tw:font-semibold tw:whitespace-nowrap ${primary
      ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface'
      : 'tw:border-cali-line tw:bg-cali-neutral-surface tw:text-cali-muted tw:hover:border-cali-gold'}`}
  >{children}</button>;
}
