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
    <article className="tw:grid tw:min-w-0 tw:grid-cols-[auto_minmax(0,1fr)] tw:content-start tw:gap-x-[0.769rem] tw:gap-y-[0.462rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:p-[1.231rem]">
      <span
        className="tw:row-start-1 tw:grid tw:size-[1.692rem] tw:place-items-center tw:rounded-[0.462rem] tw:bg-[#e8f7ef] tw:text-[#308564]"
        aria-hidden="true"
      >
        <Check size={13} />
      </span>
      <h3 className="tw:col-start-2 tw:m-0 tw:self-center tw:text-[1rem]/[1.3] tw:font-semibold tw:text-[#3e3533]">
        {front.title}
      </h3>
      <p className="tw:col-span-full tw:m-0 tw:text-[0.923rem]/[1.7] tw:text-[#91806f]">{story.problem}</p>
      <span className="tw:col-span-full tw:mt-[0.308rem] tw:text-[0.692rem] tw:font-bold tw:tracking-[0.1rem] tw:text-[#a5866b] tw:uppercase">
        Na prática
      </span>
      <ul className="tw:col-span-full tw:m-0 tw:flex tw:list-disc tw:flex-col tw:gap-[0.308rem] tw:pl-[1.154rem] tw:text-[0.923rem]/[1.7] tw:text-[#91806f]">
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
    <details className="tw:group tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:open:border-[#dcc9b2]">
      <summary className="tw:flex tw:cursor-pointer tw:list-none tw:items-center tw:justify-between tw:gap-[0.923rem] tw:px-[1.231rem] tw:py-[1.077rem] tw:text-[0.923rem] tw:font-semibold tw:text-[#3e3533] tw:[&::-webkit-details-marker]:hidden">
        <span>{front.title}</span>
        <ChevronDown
          size={18}
          className="tw:size-[1.231rem] tw:flex-none tw:text-[#b5a49b] tw:motion-safe:transition-transform tw:motion-safe:duration-[180ms] tw:group-open:rotate-180"
        />
      </summary>
      <div className="tw:flex tw:flex-col tw:items-start tw:gap-[0.615rem] tw:px-[1.231rem] tw:pb-[1.231rem]">
        <span className="tw:text-[0.692rem] tw:font-bold tw:tracking-[0.1rem] tw:text-[#a5866b] tw:uppercase">
          {categoryTag[front.category]}
        </span>
        <p className="tw:m-0 tw:text-[0.846rem]/[1.55] tw:text-[#82786f]">{story.problem}</p>
        <span className="tw:col-span-full tw:mt-[0.308rem] tw:text-[0.692rem] tw:font-bold tw:tracking-[0.1rem] tw:text-[#a5866b] tw:uppercase">
          O que pode envolver
        </span>
        <ul className="tw:col-span-full tw:m-0 tw:flex tw:list-disc tw:flex-col tw:gap-[0.308rem] tw:pl-[1.154rem] tw:text-[0.846rem]/[1.5] tw:text-[#655b57]">
          {story.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        <p className="tw:m-0 tw:text-[0.846rem]/[1.55] tw:text-[#82786f]">{availability(front, plan)}</p>
        <button
          type="button"
          className="tw:mt-[0.308rem] tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.538rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-[0.923rem] tw:py-[0.692rem] tw:text-[0.846rem] tw:font-semibold tw:text-cali-brand"
          onClick={() => onChoose(front)}
        >
          Conversar sobre esta frente <ArrowUpRight size={15} />
        </button>
      </div>
    </details>
  );
}
