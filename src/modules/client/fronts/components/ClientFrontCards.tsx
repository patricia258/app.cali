import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import type { Front, Plan } from '../../../../api/fronts/contracts';
import { eligibleMode } from '../../../../lib/contractFronts';

// Exemplos comerciais por código do catálogo. São situações ilustrativas, não ativações nem
// promessas de entregáveis adicionais. O catálogo e as regras de elegibilidade seguem no banco.
type FrontStory = { problem: string; examples: [string, string] };
const frontStory: Record<string, FrontStory> = {
  strategic_direction: {
    problem: 'Quando decisões de pessoas precisam acompanhar a direção do negócio.',
    examples: [
      'Definir o que priorizar no RH neste momento.',
      'Orientar escolhas da liderança diante de mudanças no time.',
    ],
  },
  essential_indicators: {
    problem: 'Quando você precisa enxergar sinais da equipe antes de decidir.',
    examples: ['Acompanhar turnover e absenteísmo.', 'Ler sinais de clima e identificar onde agir primeiro.'],
  },
  dp_advisory: {
    problem: 'Quando uma decisão de pessoal pede orientação técnica.',
    examples: [
      'Analisar impactos de admissões ou movimentações.',
      'Orientar encaminhamentos em desligamentos, sem executar o DP.',
    ],
  },
  critical_decisions: {
    problem: 'Quando uma decisão sensível pode afetar pessoas e estrutura.',
    examples: [
      'Avaliar uma promoção ou redistribuição de responsabilidades.',
      'Pensar os próximos passos antes de um desligamento.',
    ],
  },
  dho: {
    problem: 'Quando o desenvolvimento do time precisa de uma direção clara.',
    examples: [
      'Identificar necessidades de desenvolvimento.',
      'Definir prioridades para acompanhar a evolução das pessoas.',
    ],
  },
  leadership: {
    problem: 'Quando líderes precisam de apoio para conduzir melhor suas equipes.',
    examples: ['Organizar práticas de feedback e acompanhamento.', 'Dar clareza a papéis e decisões de gestão.'],
  },
  compensation: {
    problem: 'Quando cargos e remuneração cresceram sem critérios claros.',
    examples: ['Desenhar níveis e caminhos de evolução.', 'Definir diretrizes para decisões de remuneração.'],
  },
  people_analytics: {
    problem: 'Quando os números precisam explicar o que acontece com a equipe.',
    examples: [
      'Cruzar movimentações, permanência e composição do quadro.',
      'Investigar tendências para orientar prioridades.',
    ],
  },
  development: {
    problem: 'Quando desenvolver pessoas exige um plano além de ações isoladas.',
    examples: ['Organizar uma trilha de desenvolvimento.', 'Definir acompanhamento para uma necessidade do time.'],
  },
  occupational: {
    problem: 'Quando saúde ocupacional e conformidade precisam de acompanhamento.',
    examples: [
      'Organizar responsabilidades e pontos de atenção.',
      'Acompanhar validações com especialistas responsáveis.',
    ],
  },
  selection_vacancy: {
    problem: 'Quando uma vaga precisa ser bem definida e acompanhada.',
    examples: [
      'Desenhar perfil e critérios da vaga.',
      'Supervisionar etapas e decisões, sem fazer sourcing operacional.',
    ],
  },
  employer_brand: {
    problem: 'Quando a reputação como empregadora pede um trabalho dedicado.',
    examples: [
      'Identificar o que a experiência de quem trabalha aí comunica.',
      'Desenhar uma ação com escopo próprio para fortalecer essa percepção.',
    ],
  },
  executive_diagnostic: {
    problem: 'Quando você precisa entender um desafio antes de abrir um projeto.',
    examples: [
      'Investigar um problema de pessoas com recorte definido.',
      'Organizar achados e prioridades para a decisão.',
    ],
  },
  leadership_shadowing: {
    problem: 'Quando observar a rotina de liderança ajuda a encontrar ajustes.',
    examples: [
      'Acompanhar situações reais de gestão.',
      'Devolver pontos de atenção e caminhos de desenvolvimento.',
    ],
  },
  talks: {
    problem: 'Quando um tema merece um encontro específico com a equipe.',
    examples: [
      'Definir público, objetivo e formato do encontro.',
      'Conduzir uma palestra ou treinamento pontual sobre o tema combinado.',
    ],
  },
};
const categoryTag: Record<Front['category'], string> = {
  recurring: 'Frente contínua',
  vacancy: 'Por vaga',
  addon: 'Serviço avulso',
  project: 'Projeto pontual',
};
function storyFor(front: Front): FrontStory {
  return (
    frontStory[front.code] || {
      problem: front.description,
      examples: ['Entender o desafio da sua empresa.', 'Definir com a CALI o escopo adequado.'],
    }
  );
}
function availability(front: Front, plan: Plan) {
  const mode = eligibleMode(front, plan);
  if (mode === 'slot_included') return 'Possibilidade prevista no CALI Full, sujeita à definição da frente ativa.';
  if (mode === 'slot_paid') return 'Frente adicional, mediante alinhamento de escopo e contratação.';
  if (mode === 'build_assisted') return 'Possível como implantação assistida com seu RH interno.';
  return 'Projeto ou serviço com escopo combinado à parte.';
}
export function IncludedFrontCard({ front }: { front: Front }) {
  const story = storyFor(front);
  return (
    <article className="tw:grid tw:min-w-0 tw:grid-cols-[auto_minmax(0,1fr)] tw:content-start tw:gap-x-3 tw:gap-y-2 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-5">
      <span
        className="tw:row-start-1 tw:grid tw:size-7 tw:place-items-center tw:rounded-lg tw:bg-cali-success-surface tw:text-cali-success"
        aria-hidden="true"
      >
        <Check size={13} />
      </span>
      <h3 className="tw:col-start-2 tw:m-0 tw:self-center tw:text-base/[1.3] tw:font-semibold tw:text-cali-text">
        {front.title}
      </h3>
      <p className="tw:col-span-full tw:m-0 tw:text-cali-body/[1.7] tw:text-cali-sand-text">{story.problem}</p>
      <span className="tw:col-span-full tw:mt-1 tw:text-cali-label tw:font-bold tw:tracking-[0.1rem] tw:text-cali-sand-text tw:uppercase">
        Na prática
      </span>
      <ul className="tw:col-span-full tw:m-0 tw:flex tw:list-disc tw:flex-col tw:gap-1 tw:pl-4.5 tw:text-cali-body/[1.7] tw:text-cali-sand-text">
        {story.examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </article>
  );
}
export function PossibleFrontCard({
  front,
  plan,
  onChoose,
}: {
  front: Front;
  plan: Plan;
  onChoose: (front: Front) => void;
}) {
  const story = storyFor(front);
  return (
    <details className="tw:group tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:open:border-cali-sand-accent">
      <summary className="tw:flex tw:cursor-pointer tw:list-none tw:items-center tw:justify-between tw:gap-3.5 tw:px-5 tw:py-4.5 tw:text-cali-body tw:font-semibold tw:text-cali-text tw:[&::-webkit-details-marker]:hidden">
        <span>{front.title}</span>
        <ChevronDown
          size={18}
          className="tw:size-5 tw:flex-none tw:text-cali-sand-accent tw:motion-safe:transition-transform tw:motion-safe:duration-[180ms] tw:group-open:rotate-180"
        />
      </summary>
      <div className="tw:flex tw:flex-col tw:items-start tw:gap-2.5 tw:px-5 tw:pb-5">
        <span className="tw:text-cali-label tw:font-bold tw:tracking-[0.1rem] tw:text-cali-sand-text tw:uppercase">
          {categoryTag[front.category]}
        </span>
        <p className="tw:m-0 tw:text-sm/[1.55] tw:text-cali-muted">{story.problem}</p>
        <span className="tw:col-span-full tw:mt-1 tw:text-cali-label tw:font-bold tw:tracking-[0.1rem] tw:text-cali-sand-text tw:uppercase">
          O que pode envolver
        </span>
        <ul className="tw:col-span-full tw:m-0 tw:flex tw:list-disc tw:flex-col tw:gap-1 tw:pl-4.5 tw:text-sm/[1.5] tw:text-cali-muted">
          {story.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        <p className="tw:m-0 tw:text-sm/[1.55] tw:text-cali-muted">{availability(front, plan)}</p>
        <button
          type="button"
          className="tw:mt-1 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-sm tw:font-semibold tw:text-cali-brand"
          onClick={() => onChoose(front)}
        >
          Conversar sobre esta frente <ArrowUpRight size={15} />
        </button>
      </div>
    </details>
  );
}
