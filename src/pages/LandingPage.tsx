import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Leaf,
  LineChart,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from 'lucide-react';
import { patiWavePoster, patiWaveVideo } from '../assets/patiWaveMedia';

type ScreenSlot = {
  label: string;
  eyebrow: string;
  description: string;
  src?: string;
};

const WA_LINK =
  'https://wa.me/5541987791933?text=' +
  encodeURIComponent('Olá, Patrícia. Vim pela apresentação do CALI Workspace e quero entender melhor a assessoria da CALI.');

const SCREENSHOTS: ScreenSlot[] = [
  {
    label: 'Visão geral',
    eyebrow: 'PAINEL EXECUTIVO',
    description: 'Leitura rápida de operação, prioridades, carteira e sinais que precisam de decisão.',
    src: '/brand/cali-workspace-preview-v2.jpg',
  },
  {
    label: 'Planejamento',
    eyebrow: 'CRONOGRAMA COMPARTILHADO',
    description: 'Ciclos, reuniões, marcos e validações organizados entre a CALI e o cliente.',
  },
  {
    label: 'Projetos',
    eyebrow: 'EXECUÇÃO & ENTREGÁVEIS',
    description: 'Acompanhamento de frentes, entregas, ajustes, aprovações e conversas no contexto certo.',
  },
  {
    label: 'Horas',
    eyebrow: 'TRANSPARÊNCIA DO SERVIÇO',
    description: 'Consumo do ciclo, histórico e leitura do investimento de tempo por frente.',
  },
  {
    label: 'Documentos',
    eyebrow: 'GOVERNANÇA',
    description: 'Materiais aprovados, documentos, validade e histórico em um único fluxo.',
  },
  {
    label: 'Relatórios',
    eyebrow: 'LEITURA EXECUTIVA',
    description: 'Resultados, decisões, riscos, recomendações e próximos movimentos do ciclo.',
  },
];

type PhotoSlot = {
  title: string;
  mark: 'oak' | 'lime';
  src?: string;
  objectPosition?: string;
};

const PHOTO_SLOTS: PhotoSlot[] = [
  { title: 'CALI em campo', mark: 'oak' },
  { title: 'Leitura executiva', mark: 'lime' },
  { title: 'Trabalho com liderança', mark: 'oak' },
  { title: 'Decisão com contexto', mark: 'lime' },
];

const MODULES = [
  {
    icon: LayoutDashboard,
    title: 'Visão geral',
    text: 'O que está acontecendo agora, sem caçar informação em várias telas.',
  },
  {
    icon: Workflow,
    title: 'Projetos e entregáveis',
    text: 'Execução, status, aprovações, ajustes e conversas vinculadas à entrega.',
  },
  {
    icon: Clock3,
    title: 'Horas',
    text: 'Acompanhamento do ciclo com contexto — não controle de ponto.',
  },
  {
    icon: CalendarDays,
    title: 'Planejamento',
    text: 'Cronograma, reuniões e marcos compartilhados com a empresa.',
  },
  {
    icon: FolderOpen,
    title: 'Documentos',
    text: 'Arquivos finais, validade e histórico organizados para governança.',
  },
  {
    icon: FileText,
    title: 'Relatórios',
    text: 'Leitura executiva do período, com resultado, risco e próximos passos.',
  },
  {
    icon: MessageCircle,
    title: 'Conversas no contexto',
    text: 'Decisão e alinhamento ficam junto do projeto, documento ou entrega.',
  },
  {
    icon: Gauge,
    title: 'Indicadores',
    text: 'Dados que ajudam a liderança a decidir, sem relatório montado por montar.',
  },
  {
    icon: ClipboardCheck,
    title: 'Validações',
    text: 'O cliente acompanha, comenta, aprova e solicita ajustes com histórico.',
  },
];

const STEPS = [
  {
    n: '01',
    icon: Target,
    title: 'Direção',
    text: 'A CALI entende o momento do negócio, define prioridade e organiza o ciclo.',
  },
  {
    n: '02',
    icon: Workflow,
    title: 'Planejamento',
    text: 'Projetos, marcos, reuniões e entregáveis entram no Workspace com clareza.',
  },
  {
    n: '03',
    icon: Users,
    title: 'Execução conjunta',
    text: 'A CALI conduz. A liderança acompanha, participa e valida sem operar um SaaS de RH.',
  },
  {
    n: '04',
    icon: LineChart,
    title: 'Leitura executiva',
    text: 'O ciclo fecha com resultado, riscos, decisões tomadas e próximos movimentos.',
  },
];

const PACKAGE_FEATURES = {
  partner: [
    '10 a 15h de dedicação por mês',
    '100% online',
    'Reunião mensal com founders, diretoria ou RH',
    'Indicadores, DHO e apoio a decisões críticas',
    '1 ajuste ou desenho de política/processo por mês',
  ],
  full: [
    '20 a 25h de dedicação por mês',
    '1 visita presencial fixa por mês',
    'Ritmo quinzenal com maior proximidade',
    'Cargos & Salários, People Analytics nível 3 e desenvolvimento',
    'Até 2 ajustes/processos por mês ou 1 projeto estrutural por trimestre',
  ],
};

function BrandSlot({
  title,
  mark = 'oak',
  src,
  objectPosition = '50% 50%',
}: {
  title: string;
  mark?: 'oak' | 'lime';
  src?: string;
  objectPosition?: string;
}) {
  return (
    <div className={`lp-photo-slot ${src ? 'has-photo' : ''}`}>
      {src ? (
        <img
          className="lp-photo-user"
          src={src}
          alt={title}
          style={{ objectPosition }}
        />
      ) : (
        <img
          className="lp-photo-brand-mark"
          src={mark === 'oak' ? '/brand/cali-oak-mark-light.svg' : '/brand/cali-lime-mark.svg'}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className="lp-photo-caption">
        <span>{title}</span>
        <small>{src ? 'CALI RH' : 'espaço preparado para imagem'}</small>
      </div>
    </div>
  );
}

function ScreenVisual({ slot }: { slot: ScreenSlot }) {
  if (slot.src) {
    return <img className="lp-screen-image" src={slot.src} alt={slot.label} />;
  }

  return (
    <div className="lp-screen-placeholder" aria-label={`Espaço reservado para print: ${slot.label}`}>
      <img src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true" />
      <span>{slot.eyebrow}</span>
      <strong>{slot.label}</strong>
      <small>print reservado para inserir depois</small>
    </div>
  );
}

export function LandingPage() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentScreen = useMemo(() => SCREENSHOTS[activeScreen], [activeScreen]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-lp-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = window.setInterval(() => {
      setActiveScreen((value) => (value + 1) % SCREENSHOTS.length);
    }, 4600);
    return () => window.clearInterval(interval);
  }, [paused]);

  return (
    <main className="cali-landing">
      <header className="lp-header">
        <a className="lp-brand" href="#inicio" aria-label="CALI Workspace">
          <img src="/brand/cali-workspace-transparent.svg" alt="CALI Workspace" />
        </a>
        <nav className="lp-nav" aria-label="Navegação da apresentação">
          <a href="#cali">A CALI</a>
          <a href="#workspace">Workspace</a>
          <a href="#pacotes">Pacotes</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#fale-com-a-pati">Fale com a Pati</a>
        </nav>
        <Link className="lp-access-link" to="/login">
          Acessar Workspace <ArrowRight size={16} />
        </Link>
      </header>

      <section className="lp-hero" id="inicio">
        <img className="lp-art lp-art-oak" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true" />
        <img className="lp-art lp-art-lime" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
        <div className="lp-shell lp-hero-grid">
          <div className="lp-hero-copy" data-lp-reveal="left">
            <span className="lp-eyebrow">CALI WORKSPACE · HR FOR BUSINESS</span>
            <h1>
              Estratégia de pessoas.
              <span>Execução visível.</span>
            </h1>
            <p>
              O ambiente compartilhado onde a CALI conduz projetos, decisões, horas,
              documentos e relatórios com cada cliente — com clareza do que está sendo
              feito, do que depende de você e do que vem depois.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-button lp-button-light" to="/login">
                Acessar Workspace <ArrowRight size={17} />
              </Link>
              <a className="lp-text-link lp-text-link-light" href="https://calirh.com" target="_blank" rel="noreferrer">
                Conhecer a CALI RH <ArrowRight size={15} />
              </a>
            </div>
            <div className="lp-hero-note">
              <LockKeyhole size={16} />
              <span>Um único acesso. O Workspace identifica o perfil e abre o ambiente correto.</span>
            </div>
          </div>

          <div className="lp-hero-product" data-lp-reveal="right">
            <div className="lp-window">
              <div className="lp-window-top">
                <span />
                <span />
                <span />
                <small>app.calirh.com</small>
              </div>
              <div className="lp-window-screen">
                <img src="/brand/cali-workspace-preview-v2.jpg" alt="Prévia do CALI Workspace" />
                <div className="lp-window-overlay">
                  <span>CALI WORKSPACE</span>
                  <strong>Trabalho compartilhado.<br />Decisão com contexto.</strong>
                </div>
              </div>
            </div>
            <div className="lp-floating-card lp-floating-card-a">
              <ShieldCheck size={18} />
              <div>
                <strong>Acesso seguro</strong>
                <span>Admin + cliente</span>
              </div>
            </div>
            <div className="lp-floating-card lp-floating-card-b">
              <Sparkles size={18} />
              <div>
                <strong>Sem planilha paralela</strong>
                <span>uma fonte de verdade</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lp-hero-foot">
          <span>SCROLL</span>
          <i />
        </div>
      </section>

      <section className="lp-section lp-section-light" id="cali">
        <div className="lp-shell lp-about-grid">
          <div className="lp-section-copy" data-lp-reveal="left">
            <span className="lp-kicker">A CALI RH</span>
            <h2>A plataforma acompanha o trabalho. Não substitui o trabalho.</h2>
            <p>
              A CALI atua como <strong>People Advisory Executive</strong> ao lado da liderança.
              O Workspace não é um SaaS de RH entregue para a empresa operar sozinha:
              é a infraestrutura que deixa a execução do advisory organizada, rastreável e
              disponível para quem precisa decidir.
            </p>
            <p>
              A lógica é simples: <strong>a CALI administra</strong>; o cliente acompanha,
              participa, valida e avalia.
            </p>
            <a className="lp-text-link" href="https://calirh.com" target="_blank" rel="noreferrer">
              Ver a atuação da CALI <ArrowRight size={15} />
            </a>
          </div>

          <div className="lp-principles" data-lp-reveal="right">
            <article>
              <Leaf size={21} />
              <span>Direção</span>
              <strong>prioridade antes de atividade</strong>
            </article>
            <article>
              <BarChart3 size={21} />
              <span>Leitura</span>
              <strong>dados antes de opinião solta</strong>
            </article>
            <article>
              <Users size={21} />
              <span>Proximidade</span>
              <strong>ao lado da liderança</strong>
            </article>
            <article>
              <ShieldCheck size={21} />
              <span>Governança</span>
              <strong>registro sem burocracia</strong>
            </article>
          </div>
        </div>

        <div className="lp-photo-rail" aria-label="Galeria de fotos da CALI">
          <div className="lp-photo-track">
            {[...PHOTO_SLOTS, ...PHOTO_SLOTS].map((slot, index) => (
              <BrandSlot
                key={`${slot.title}-${index}`}
                title={slot.title}
                mark={slot.mark}
                src={slot.src}
                objectPosition={slot.objectPosition}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-burgundy" id="workspace">
        <div className="lp-shell">
          <div className="lp-section-heading lp-section-heading-dark" data-lp-reveal>
            <span className="lp-kicker">DENTRO DO WORKSPACE</span>
            <h2>O que importa para acompanhar uma relação de advisory de verdade.</h2>
            <p>
              Menos módulos por ter módulo. Mais contexto para a liderança enxergar execução,
              dependências, decisões e resultado.
            </p>
          </div>

          <div className="lp-module-grid">
            {MODULES.map((module, index) => {
              const Icon = module.icon;
              return (
                <article
                  className="lp-module-card"
                  key={module.title}
                  data-lp-reveal={index % 3 === 0 ? 'left' : index % 3 === 1 ? 'up' : 'right'}
                  style={{ transitionDelay: `${index * 55}ms` }}
                >
                  <Icon size={21} />
                  <h3>{module.title}</h3>
                  <p>{module.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-ivory">
        <div className="lp-shell">
          <div className="lp-section-heading" data-lp-reveal>
            <span className="lp-kicker">UM LOGIN · DOIS AMBIENTES</span>
            <h2>Cliente e CALI trabalham sobre a mesma operação, com responsabilidades diferentes.</h2>
          </div>

          <div className="lp-audience-grid">
            <article className="lp-audience-card" data-lp-reveal="left">
              <span className="lp-card-index">01</span>
              <div className="lp-audience-icon"><Users size={23} /></div>
              <small>AMBIENTE DO CLIENTE</small>
              <h3>Visibilidade sem virar operador da ferramenta.</h3>
              <p>
                Início, cronograma, entregáveis, horas, documentos e relatórios. O cliente
                acompanha, comenta, aprova, solicita ajuste e acessa o histórico do trabalho.
              </p>
              <div className="lp-mini-list">
                <span><Check size={15} /> acompanhar</span>
                <span><Check size={15} /> participar</span>
                <span><Check size={15} /> validar</span>
                <span><Check size={15} /> avaliar</span>
              </div>
            </article>

            <article className="lp-audience-card lp-audience-card-dark" data-lp-reveal="right">
              <span className="lp-card-index">02</span>
              <div className="lp-audience-icon"><LayoutDashboard size={23} /></div>
              <small>AMBIENTE CALI</small>
              <h3>A operação inteira no mesmo sistema.</h3>
              <p>
                Carteira, clientes, projetos, horas, agenda, documentos, relatórios, Mapa de
                People e propostas. A CALI conduz a execução e mantém a governança.
              </p>
              <div className="lp-mini-list">
                <span><Check size={15} /> administrar</span>
                <span><Check size={15} /> executar</span>
                <span><Check size={15} /> interpretar</span>
                <span><Check size={15} /> decidir</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-screens-section">
        <div className="lp-shell">
          <div className="lp-section-heading lp-section-heading-centered lp-section-heading-dark" data-lp-reveal="up">
            <span className="lp-kicker">O WORKSPACE NA PRÁTICA</span>
            <h2>Veja o Workspace em movimento.</h2>
            <p>O carrossel está preparado para receber os prints oficiais da CALI, com enquadramento ajustável e leitura consistente em desktop e celular.</p>
          </div>

          <div
            className="lp-screen-carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            data-lp-reveal="zoom"
          >
            <div className="lp-screen-meta">
              <div>
                <span>{currentScreen.eyebrow}</span>
                <strong>{currentScreen.label}</strong>
              </div>
              <small>{String(activeScreen + 1).padStart(2, '0')} / {String(SCREENSHOTS.length).padStart(2, '0')}</small>
            </div>

            <div className="lp-screen-frame">
              {SCREENSHOTS.map((slot, index) => (
                <div
                  className={`lp-screen-slide ${index === activeScreen ? 'is-active' : ''}`}
                  key={slot.label}
                  aria-hidden={index !== activeScreen}
                >
                  <ScreenVisual slot={slot} />
                </div>
              ))}
            </div>

            <div className="lp-screen-bottom">
              <p>{currentScreen.description}</p>
              <div className="lp-screen-controls">
                <button
                  type="button"
                  aria-label="Tela anterior"
                  onClick={() => setActiveScreen((value) => (value - 1 + SCREENSHOTS.length) % SCREENSHOTS.length)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Próxima tela"
                  onClick={() => setActiveScreen((value) => (value + 1) % SCREENSHOTS.length)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="lp-screen-dots" aria-label="Selecionar tela">
              {SCREENSHOTS.map((slot, index) => (
                <button
                  type="button"
                  key={slot.label}
                  aria-label={`Ver ${slot.label}`}
                  className={index === activeScreen ? 'is-active' : ''}
                  onClick={() => setActiveScreen(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="lp-section lp-video-section" id="fale-com-a-pati">
        <img className="lp-video-art lp-video-art-oak" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true" />
        <img className="lp-video-art lp-video-art-lime" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
        <div className="lp-shell lp-video-grid">
          <div className="lp-video-copy" data-lp-reveal="left">
            <span className="lp-kicker">FALE COM A PATI</span>
            <h2>Tem gente de verdade do outro lado.</h2>
            <p>
              O Workspace organiza a relação de advisory, mas a conversa continua sendo direta.
              Estratégia, contexto e decisão passam por quem está acompanhando o negócio de perto.
            </p>
            <a className="lp-button lp-button-light" href={WA_LINK} target="_blank" rel="noreferrer">
              Falar com a Pati <MessageCircle size={17} />
            </a>
          </div>

          <div className="lp-video-card" data-lp-reveal="right">
            <div className="lp-video-badge"><Sparkles size={15} /> CALI RH · PEOPLE ADVISORY</div>
            <video
              className="lp-pati-video"
              src={patiWaveVideo}
              poster={patiWavePoster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vídeo da Patrícia, CALI RH"
            />
            <div className="lp-video-caption">
              <strong>Patrícia Lima</strong>
              <span>People Advisory Executive · CALI RH</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-light" id="como-funciona">
        <div className="lp-shell">
          <div className="lp-section-heading lp-section-heading-centered" data-lp-reveal>
            <span className="lp-kicker">COMO FUNCIONA</span>
            <h2>Do primeiro direcionamento ao fechamento do ciclo.</h2>
          </div>

          <div className="lp-steps">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.n}
                  data-lp-reveal={index % 2 === 0 ? 'left' : 'right'}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="lp-step-number">
                    <span>{step.n}</span>
                    <i><Icon size={20} /></i>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-section lp-packages" id="pacotes">
        <div className="lp-shell">
          <div className="lp-section-heading lp-section-heading-centered" data-lp-reveal>
            <span className="lp-kicker">ASSESSORIA ESTRATÉGICA MENSAL</span>
            <h2>Dois formatos de acompanhamento. A mesma lógica: RH para o negócio.</h2>
            <p>Sem preço exposto. O escopo é definido pela complexidade real da empresa e do ciclo.</p>
          </div>

          <div className="lp-package-grid">
            <article className="lp-package-card" data-lp-reveal="left">
              <div className="lp-package-top">
                <div>
                  <small>CALI PARTNER</small>
                  <h3>Direção estratégica periódica.</h3>
                </div>
                <span className="lp-term-badge">8 meses</span>
              </div>
              <p className="lp-package-intro">
                Para empresas que precisam organizar a agenda de pessoas, ganhar direção e
                ter senioridade disponível nas decisões críticas.
              </p>
              <div className="lp-package-facts">
                <span><strong>10–15h</strong><small>por mês</small></span>
                <span><strong>Online</strong><small>100%</small></span>
                <span><strong>Mensal</strong><small>ritmo principal</small></span>
              </div>
              <div className="lp-package-list">
                {PACKAGE_FEATURES.partner.map((item) => <span key={item}><Check size={15} />{item}</span>)}
              </div>
              <a className="lp-package-link" href="https://calirh.com" target="_blank" rel="noreferrer">
                Conhecer a assessoria <ArrowRight size={16} />
              </a>
            </article>

            <article className="lp-package-card lp-package-card-featured" data-lp-reveal="right">
              <div className="lp-package-ribbon">MAIOR PROXIMIDADE</div>
              <div className="lp-package-top">
                <div>
                  <small>CALI FULL</small>
                  <h3>Presença executiva mais próxima.</h3>
                </div>
                <span className="lp-term-badge">12 meses</span>
              </div>
              <p className="lp-package-intro">
                Para momentos de maior complexidade: crescimento, reestruturação, mudança de
                rota ou quando pessoas já são agenda central da diretoria.
              </p>
              <div className="lp-package-facts">
                <span><strong>20–25h</strong><small>por mês</small></span>
                <span><strong>1 visita</strong><small>fixa / mês</small></span>
                <span><strong>Quinzenal</strong><small>ritmo principal</small></span>
              </div>
              <div className="lp-package-list">
                {PACKAGE_FEATURES.full.map((item) => <span key={item}><Check size={15} />{item}</span>)}
              </div>
              <a className="lp-package-link" href="https://calirh.com" target="_blank" rel="noreferrer">
                Conhecer a assessoria <ArrowRight size={16} />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-final-cta">
        <img className="lp-final-art" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
        <div className="lp-shell lp-final-grid" data-lp-reveal="up">
          <div>
            <span className="lp-eyebrow">JÁ É CLIENTE CALI?</span>
            <h2>O trabalho continua aqui.</h2>
            <p>Entre no Workspace com o e-mail cadastrado. Sem senha para memorizar.</p>
          </div>
          <div className="lp-final-actions">
            <Link className="lp-button lp-button-light" to="/login">
              Acessar Workspace <ArrowRight size={17} />
            </Link>
            <a className="lp-text-link lp-text-link-light" href={WA_LINK} target="_blank" rel="noreferrer">
              Ainda não é cliente? Fale com a CALI <MessageCircle size={15} />
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-shell">
          <img src="/brand/cali-workspace-burgundy.svg" alt="CALI Workspace" />
          <div className="lp-footer-copy">
            <span>© 2026 CALI RH · HR FOR BUSINESS</span>
            <span>Curitiba · atendimento remoto em todo o Brasil</span>
          </div>
          <div className="lp-footer-links">
            <a href="mailto:patricia@calirh.com">patricia@calirh.com</a>
            <a href="https://calirh.com" target="_blank" rel="noreferrer">calirh.com</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
