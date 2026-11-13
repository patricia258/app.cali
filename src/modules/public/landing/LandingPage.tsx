import { LandingSection, LandingSectionHeading, LandingWidth } from './components/LandingSection';
import { LandingContact } from './components/LandingContact';
import { LandingClosing } from './components/LandingClosing';
import { LandingPackages } from './components/LandingPackages';
import { LandingAudience } from './components/LandingAudience';
import { LandingScreens, type ScreenSlot } from './components/LandingScreens';
import { LandingGallery, type PhotoSlot } from './components/LandingGallery';
import { LandingHeroCopy } from './components/LandingHeroCopy';
import { LandingProductPreview } from './components/LandingProductPreview';
import { LandingPrinciples } from './components/LandingPrinciples';
import { LandingModules } from './components/LandingModules';
import { LandingHeader } from './components/LandingHeader';
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  MessageCircle,
  Workflow,
} from 'lucide-react';
import { patiWavePoster, patiWaveVideo } from '../../../assets/patiWaveMedia';
import { LandingFooter } from './components/LandingFooter';
import { LandingReveal } from './components/LandingReveal';
import { LandingSteps } from './components/LandingSteps';
import './landing-identity.css';

const carouselPhotoModules = import.meta.glob(
  '../../../assets/landing-carousel/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>;

const workspaceScreenModules = import.meta.glob(
  '../../../assets/workspace-screens/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>;

const CAROUSEL_PHOTO_URLS = Object.entries(carouselPhotoModules)
  .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  .map(([, url]) => url);

const WORKSPACE_SCREEN_URLS = Object.entries(workspaceScreenModules)
  .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  .map(([, url]) => url);

const WA_LINK =
  'https://wa.me/5541987791933?text=' +
  encodeURIComponent('Olá, Patrícia. Vim pela apresentação do CALI Workspace e quero entender melhor a assessoria da CALI.');

const DEFAULT_SCREENSHOTS: ScreenSlot[] = [
  {
    label: 'Início',
    eyebrow: 'ÁREA DO CLIENTE',
    description: 'Visão executiva do ciclo, entregas, horas e frentes ativas.',
    src: '/landing/client-home.svg?v=9',
  },
  {
    label: 'Planejamento',
    eyebrow: 'AGENDA & PRÓXIMOS PASSOS',
    description: 'Reuniões, validações, prazos e próximos compromissos.',
    src: '/landing/client-planejamento.svg?v=9',
  },
  {
    label: 'Entregáveis',
    eyebrow: 'CRONOGRAMA COMPARTILHADO',
    description: 'Frentes, entregáveis, aprovações e sequência de implantação.',
    src: '/landing/client-entregaveis.svg?v=9',
  },
  {
    label: 'Horas do ciclo',
    eyebrow: 'TRANSPARÊNCIA DO SERVIÇO',
    description: 'Consumo, saldo disponível e registros do período.',
    src: '/landing/client-horas.svg?v=9',
  },
  {
    label: 'Ocorrências',
    eyebrow: 'CANAL COM A CALI',
    description: 'Solicitações, status e histórico.',
    src: '/landing/client-ocorrencias.svg?v=9',
  },
  {
    label: 'Documentos',
    eyebrow: 'GOVERNANÇA',
    description: 'Acervo, busca, versões aprovadas e documentos.',
    src: '/landing/client-documentos.svg?v=9',
  },
];

const SCREEN_DESCRIPTIONS = [
  { label: 'Visão geral', description: 'Prioridades, entregas e horas do ciclo reunidas na entrada da empresa.' },
  { label: 'Conversa com a Pati', description: 'Um canal direto para dúvidas e pedidos que precisam de acompanhamento.' },
  { label: 'Planejamento', description: 'Reuniões, prazos e próximos passos publicados em um lugar só.' },
  { label: 'Entregáveis', description: 'Cronograma para acompanhar, comentar e aprovar o que está sendo construído.' },
  { label: 'Detalhe da entrega', description: 'Prazo, versão, arquivos e aprovação da entrega no mesmo lugar.' },
  { label: 'Horas do ciclo', description: 'Consumo e saldo do período com o detalhe do trabalho realizado.' },
  { label: 'Ocorrências', description: 'Solicitações e situações acompanhadas com status e histórico.' },
  { label: 'Histórico da solicitação', description: 'A conversa com a CALI permanece junto da solicitação.' },
  { label: 'Documentos', description: 'Versões aprovadas e arquivos da empresa organizados para consulta.' },
];

const SCREENSHOTS: ScreenSlot[] = WORKSPACE_SCREEN_URLS.length
  ? WORKSPACE_SCREEN_URLS.map((src, index) => ({
      label: SCREEN_DESCRIPTIONS[index]?.label ?? `Tela do Workspace ${index + 1}`,
      eyebrow: 'CALI WORKSPACE',
      description: SCREEN_DESCRIPTIONS[index]?.description ?? 'Tela real do CALI Workspace.',
      src,
    }))
  : DEFAULT_SCREENSHOTS;

const DEFAULT_PHOTO_SLOTS: PhotoSlot[] = [
  { title: 'Foto CALI 1', mark: 'oak', src: '/landing/pati-mic.webp?v=9', objectPosition: '50% 34%' },
  { title: 'Foto CALI 2', mark: 'lime', src: '/landing/pati-presentation.webp?v=9', objectPosition: '62% 50%' },
  { title: 'Foto CALI 3', mark: 'oak', src: '/landing/pati-conarh.webp?v=9', objectPosition: '50% 32%' },
  { title: 'Foto CALI 4', mark: 'lime', src: '/landing/pati-speaking.webp?v=9', objectPosition: '65% 44%' },
];

const PHOTO_SLOTS: PhotoSlot[] = CAROUSEL_PHOTO_URLS.length
  ? CAROUSEL_PHOTO_URLS.map((src, index) => ({
      title: `Foto CALI ${index + 1}`,
      mark: index % 2 === 0 ? 'oak' : 'lime',
      src,
      objectPosition: '50% 50%',
    }))
  : DEFAULT_PHOTO_SLOTS;

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

const PACKAGE_FEATURES = {
  partner: [
    'Reunião mensal com founders, diretoria ou RH',
    'Indicadores, desenvolvimento e apoio às decisões críticas',
    'Políticas e processos priorizados conforme escopo e complexidade',
    'Acesso ao CALI Workspace durante o contrato',
  ],
  full: [
    '1 visita presencial fixa por mês',
    'Acompanhamento quinzenal com a liderança',
    'Cargos & Salários, People Analytics nível 3 e desenvolvimento',
    'Políticas, processos e projetos conforme complexidade e escopo',
    'Acesso ao CALI Workspace durante o contrato',
  ],
};

export function LandingPage() {
  return (
    <main className="cali-landing tw:min-h-screen tw:overflow-x-hidden tw:bg-cali-day-canvas tw:font-cali-body tw:text-[.875rem] tw:leading-normal tw:text-cali-ink">
      <LandingHeader contactHref={WA_LINK} />

      <section className="tw:relative tw:isolate tw:grid tw:min-h-[min(55rem,100svh)] tw:items-center tw:overflow-hidden tw:bg-[radial-gradient(ellipse_50%_60%_at_82%_38%,#e7c66f29,transparent_72%),radial-gradient(ellipse_60%_70%_at_8%_90%,#b58c5224,transparent_70%),linear-gradient(#f7f3ee09_1px,transparent_1px),linear-gradient(90deg,#f7f3ee09_1px,transparent_1px),linear-gradient(150deg,#6a2536_0%,#4a1826_48%,#2e1018_100%)] tw:[background-size:auto,auto,2rem_2rem,2rem_2rem,auto] tw:pt-[clamp(9.6875rem,18vh,12.5rem)] tw:pb-[clamp(5.625rem,11vh,7.8125rem)] tw:text-cali-day-canvas tw:[@media(35rem<width<=60rem)]:min-h-0 tw:[@media(35rem<width<=60rem)]:pt-[9.0625rem] tw:[@media(35rem<width<=60rem)]:pb-[5.3125rem] tw:[@media(max-width:35rem)]:min-h-0 tw:[@media(max-width:35rem)]:pt-[7.375rem] tw:[@media(max-width:35rem)]:pb-[4.5rem]" id="inicio">
        <div className="tw:mx-auto tw:grid tw:w-[min(82.5rem,calc(100%-5rem))] tw:grid-cols-[minmax(0,.84fr)_minmax(0,1.16fr)] tw:content-center tw:items-center tw:gap-[clamp(2.125rem,5vw,4.875rem)] tw:[@media(35rem<width<=60rem)]:w-[min(45.625rem,calc(100%-3rem))] tw:[@media(35rem<width<=60rem)]:grid-cols-1 tw:[@media(35rem<width<=60rem)]:justify-items-center tw:[@media(35rem<width<=60rem)]:gap-[2.875rem] tw:[@media(max-width:35rem)]:w-[calc(100%-2rem)] tw:[@media(max-width:35rem)]:grid-cols-1 tw:[@media(max-width:35rem)]:justify-items-center tw:[@media(max-width:35rem)]:gap-9">
          <LandingHeroCopy />

          <LandingProductPreview image={WORKSPACE_SCREEN_URLS[0] || '/landing/cali-workspace-sign-in-preview.jpg?v=1'} />
        </div>
      </section>

      <LandingSection tone="light" id="cali">
        <LandingWidth className="tw:grid tw:grid-cols-[minmax(0,1.03fr)_minmax(26.25rem,.97fr)] tw:items-center tw:gap-[clamp(3.375rem,8vw,6.875rem)] tw:[@media(max-width:65rem)]:grid-cols-1">
          <LandingReveal direction="left">
            <span className="tw:mb-[1.125rem] tw:inline-block tw:text-[.656rem] tw:font-bold tw:tracking-[.14em] tw:text-cali-brand">A CALI RH</span>
            <h2 className="tw:m-0 tw:text-[clamp(2.55rem,4.15vw,4.45rem)] tw:leading-[1.02] tw:text-cali-brand tw:[@media(max-width:35rem)]:text-[clamp(2.25rem,11vw,3.7rem)]">A plataforma organiza o trabalho. A condução continua sendo da CALI.</h2>
            <p className="tw:m-0 tw:mt-6 tw:max-w-[41.25rem] tw:text-base tw:leading-[1.75] tw:text-[#655d58]">
              A CALI atua como <strong className="tw:text-[#4b4140]">People Advisory Executive</strong> junto à liderança.
              O Workspace registra prioridades, entregas e decisões sem transformar o cliente em operador de software.
            </p>
            <p className="tw:m-0 tw:mt-3.5 tw:max-w-[41.25rem] tw:text-base tw:leading-[1.75] tw:text-[#655d58]">
              <strong className="tw:text-[#4b4140]">A CALI conduz.</strong> O cliente enxerga o ciclo, valida o que importa e decide com contexto.
            </p>
            <a className="tw:mt-6.5 tw:inline-flex tw:items-center tw:gap-2 tw:text-[.8rem] tw:font-semibold tw:text-cali-brand tw:hover:gap-3" href="https://calirh.com" target="_blank" rel="noreferrer">
              Ver a atuação da CALI <ArrowRight size={15} aria-hidden="true" />
            </a>
          </LandingReveal>
          <LandingPrinciples />
        </LandingWidth>
        <LandingGallery photos={PHOTO_SLOTS} />
      </LandingSection>

      <LandingSection tone="burgundy" id="workspace">
        <LandingWidth>
          <LandingSectionHeading dark eyebrow="DENTRO DO WORKSPACE" title="O que precisa estar visível para a decisão não depender de memória."
            description="Projetos, horas, documentos, conversas e indicadores ficam no mesmo contexto, com histórico e responsabilidade claros." />
          <LandingModules modules={MODULES} />
        </LandingWidth>
      </LandingSection>

      <LandingSection tone="ivory">
        <LandingWidth>
          <LandingSectionHeading eyebrow="UM LOGIN · DOIS AMBIENTES" title="Um login. Papéis diferentes. A mesma fonte de verdade." />
          <LandingAudience />
        </LandingWidth>
      </LandingSection>

      <LandingScreens screens={SCREENSHOTS} />

      <LandingContact contactHref={WA_LINK} video={patiWaveVideo} poster={patiWavePoster} />

      <LandingSteps />

      <LandingPackages features={PACKAGE_FEATURES} />

      <LandingClosing contactHref={WA_LINK} />

      <LandingFooter />
    </main>
  );
}
