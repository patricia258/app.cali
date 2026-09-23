import type { PortalPricingRule } from './portalAdminApi';
import { initialPackageFor, investmentContextFor, scopeDefaults } from './portalProposalLogic';

export type PackageMeta={code:string;label:string;description:string;minimumMonths:number;suggestedHours?:number;hoursRange?:string};
export const PACKAGE_META:Record<string,PackageMeta[]>={
  'assessoria-estrategica':[
    {code:'PARTNER',label:'CALI PARTNER',description:'Direção estratégica sênior para uma prioridade central por ciclo, com leitura de indicadores e apoio à decisão.',minimumMonths:8,suggestedHours:10,hoursRange:'8 a 12'},
    {code:'FULL',label:'CALI FULL',description:'Maior cadência e até duas prioridades simultâneas, sem criar expectativa de RH interno em tempo integral.',minimumMonths:12,suggestedHours:16,hoursRange:'14 a 18'},
  ],
  'cali-build':[
    {code:'ESSENCIAL',label:'CALI Build Essencial',description:'Uma frente principal por ciclo, com método, checkpoints e revisão técnica da execução interna.',minimumMonths:4,suggestedHours:10,hoursRange:'8 a 12'},
    {code:'COMPLETO',label:'CALI Build Completo',description:'Implantação mais ampla ou múltiplas frentes conectadas, com maior cadência, revisão e governança executiva.',minimumMonths:6,suggestedHours:16,hoursRange:'14 a 18'},
  ],
  'mentoria-rh':[
    {code:'ESSENCIAL',label:'Programa Essencial',description:'Três encontros para organizar um objetivo prioritário e construir um plano aplicável.',minimumMonths:1},
    {code:'AMPLIADO',label:'Programa Ampliado',description:'Cinco encontros para aprofundar competências relacionadas e acompanhar a aplicação prática.',minimumMonths:1},
  ],
  'diagnostico-executivo':[
    {code:'ESSENCIAL',label:'Leitura Essencial',description:'Uma leitura executiva de raio curto para esclarecer uma decisão, organizar os riscos prioritários e orientar os primeiros movimentos de gestão de pessoas.',minimumMonths:1},
    {code:'COMPLETO',label:'Diagnóstico Completo',description:'Uma leitura organizacional mais ampla, apoiada por entrevistas, documentos e indicadores, que transforma sinais dispersos em prioridades e plano de 90 dias.',minimumMonths:1},
  ],
  'cultura-direcao':[{code:'PROJETO',label:'Projeto Cultura e Direção',description:'Leitura da cultura atual, definição de comportamentos e roadmap de 90 dias.',minimumMonths:1}],
  'shadowing-lideranca':[{code:'CICLO',label:'Ciclo Individual de Shadowing',description:'Observação estruturada, devolutiva individual e plano de desenvolvimento para uma liderança.',minimumMonths:1}],
  treinamentos:[
    {code:'PALESTRA',label:'Palestra Estratégica',description:'Encontro único de 60 ou 90 minutos, com conteúdo objetivo e interação compatível com o tempo disponível.',minimumMonths:1},
    {code:'WORKSHOP',label:'Workshop Aplicado',description:'Oficina prática de 2 a 4 horas, com exercícios ou dinâmica conectados ao contexto real.',minimumMonths:1},
    {code:'TREINAMENTO',label:'Treinamento Personalizado',description:'Desenvolvimento de uma competência prioritária em 2 ou 3 encontros, com prática entre etapas.',minimumMonths:1},
    {code:'PROGRAMA',label:'Programa de Liderança Sob Medida',description:'Trilha estruturada de 4 a 10 encontros, com evolução acompanhada.',minimumMonths:1},
  ],
  'marca-empregadora':[
    {code:'PROJETO',label:'Projeto de Marca Empregadora',description:'Projeto estratégico para diagnosticar a percepção atual, definir ou refinar o EVP e organizar um plano de ativação viável para RH, Marketing e liderança.',minimumMonths:1},
    {code:'RECORRENTE',label:'Sustentação Recorrente',description:'Sustentação consultiva para revisar prioridades, orientar a ativação e acompanhar indicadores, sem assumir a produção criativa ou a operação dos canais.',minimumMonths:4},
  ],
  'solucao-personalizada':[{code:'SOB_MEDIDA',label:'Projeto sob medida',description:'Escopo, formato e investimento construídos após a leitura do contexto.',minimumMonths:1}],
};

export const DISCOUNT_TYPES=['Condição comercial','Cliente novo','Indicação','Campanha do mês','Parceria','Outro'];
export const BUDGET_STRATEGIES=[
  {value:'adequar',label:'Adequar pacote e escopo ao teto informado'},
  {value:'fasear',label:'Contratar uma primeira fase dentro do teto'},
  {value:'manter',label:'Manter escopo integral e justificar o valor'},
] as const;
export const PAYMENT_METHODS=[
  {value:'monthly',label:'Mensal recorrente'},
  {value:'split',label:'Entrada + finalização'},
  {value:'pix',label:'À vista via PIX'},
  {value:'card',label:'Cartão de crédito + taxas'},
  {value:'custom',label:'Condição personalizada'},
] as const;
export const BONUS_PRESETS:Record<string,Array<{code:string;title:string;description:string}>>={
  'assessoria-estrategica':[
    {code:'leadership-guide',title:'Guia prático de rituais de liderança',description:'Material editável com estrutura para reuniões, alinhamentos e acompanhamentos do ciclo.'},
    {code:'extra-alignment',title:'Encontro adicional de alinhamento',description:'Uma conversa extraordinária de até 60 minutos com a liderança, agendada durante o primeiro ciclo.'},
    {code:'governance-checklist',title:'Checklist de governança de pessoas',description:'Checklist editável para acompanhar decisões, responsáveis, prazos e pendências do primeiro ciclo.'},
  ],
  'cali-build':[
    {code:'implementation-board',title:'Quadro de implantação CALI Build',description:'Modelo editável para organizar frente, etapa, responsável interno, evidência, checkpoint e aprovação.'},
    {code:'quality-checklist',title:'Checklist de qualidade da implantação',description:'Critérios para o RH interno revisar cada entrega antes do checkpoint técnico com a CALI.'},
  ],
  'mentoria-rh':[
    {code:'application-book',title:'Caderno de aplicação CALI',description:'Roteiro editável para registrar decisões, práticas e próximos movimentos entre os encontros.'},
    {code:'extra-checkin',title:'Check-in adicional de 30 minutos',description:'Um encontro breve após o encerramento para revisar a aplicação do plano de desenvolvimento.'},
  ],
  'diagnostico-executivo':[{code:'thirty-day-checkin',title:'Check-in executivo de 30 dias',description:'Uma conversa de 30 minutos para revisar o avanço das prioridades indicadas na devolutiva.'}],
  'cultura-direcao':[{code:'ritual-guide',title:'Guia de rituais culturais',description:'Modelo editável para conectar comportamentos esperados às reuniões, decisões e conversas de liderança.'}],
  'shadowing-lideranca':[{code:'followup',title:'Check-in de evolução',description:'Uma conversa de 30 minutos após o ciclo para revisar a aplicação do plano de ação da liderança.'}],
  treinamentos:[{code:'application-guide',title:'Guia de aplicação pós-encontro',description:'Material editável para transformar os principais aprendizados em compromissos de aplicação.'}],
  'marca-empregadora':[{code:'activation-matrix',title:'Matriz de ativação e indicadores',description:'Modelo editável para organizar iniciativa, responsável, canal, prazo e indicador.'}],
  'solucao-personalizada':[{code:'followup',title:'Check-in executivo de 30 dias',description:'Uma conversa breve para revisar a aplicação da entrega principal e orientar o próximo movimento.'}],
};

export function technicalPackageFor(serviceSlug:string,answers:Record<string,unknown>,pricing:PortalPricingRule[]){
  return initialPackageFor(serviceSlug,{...answers,investimento:'avaliar',budget:'avaliar'},pricing);
}
export function packageForBudget(serviceSlug:string,answers:Record<string,unknown>,pricing:PortalPricingRule[]){
  const investment=investmentContextFor(serviceSlug,answers);const technical=technicalPackageFor(serviceSlug,answers,pricing);
  if(serviceSlug==='cali-build')return technical;
  const max=investment?.max;
  if(max===null||max===undefined)return technical;
  const codes=new Set((PACKAGE_META[serviceSlug]||[]).map(item=>item.code));
  const technicalRule=pricing.find(rule=>rule.service_slug===serviceSlug&&rule.package_code===technical);
  if(technicalRule&&Number(technicalRule.base_price)>0&&Number(technicalRule.base_price)<=max)return technical;
  const fitting=pricing.filter(rule=>rule.service_slug===serviceSlug&&codes.has(rule.package_code)&&Number(rule.base_price)>0&&Number(rule.base_price)<=max).sort((a,b)=>Number(a.base_price)-Number(b.base_price));
  return fitting.at(-1)?.package_code||technical;
}
export function prioritizedScope(serviceSlug:string,answers:Record<string,any>,phased=false,packageCode=initialPackageFor(serviceSlug,answers,[])){
  if(serviceSlug==='cali-build'){
    const selected=Array.isArray(answers.frentes_build)?answers.frentes_build:[];
    const labels:Record<string,string>={planejamento:'Planejamento estratégico de pessoas',desenho:'Estrutura, organograma e clareza de papéis',governanca:'Governança, políticas e processos',people_analytics:'Indicadores, People Analytics e dashboards',desempenho:'Gestão de desempenho e metas',clima:'Clima e engajamento',cultura:'Cultura, valores e rituais',cargos:'Cargos, carreira e remuneração',sucessao:'Sucessão e gestão de talentos',liderancas:'Desenvolvimento de lideranças',atracao:'Atração, seleção e onboarding',marca:'Marca empregadora e experiência do colaborador',comunicacao:'Comunicação interna',saude:'Saúde, riscos psicossociais e conformidade',relacoes:'Relações de trabalho e regras operacionais'};
    const limit=packageCode==='COMPLETO'?3:1;
    const priorities=selected.slice(0,limit).map((x:string)=>labels[x]||x);
    const focus=answers.escopo_build==='rh_completo'?'arquitetura do RH e prioridades do primeiro ciclo':priorities.length?priorities.join(', '):'prioridade inicial definida no kickoff';
    return [
      phased?'Fase 1 da estruturação assistida, com escopo delimitado':'Diagnóstico de implantação e arquitetura do ciclo',
      `Foco inicial: ${focus}`,
      'Método, templates e critérios fornecidos pela CALI para execução pelo RH interno',
      'Checkpoints técnicos para revisão, correção e validação das entregas construídas internamente',
      'Roadmap das próximas frentes, responsáveis, indicadores e marcos de aprovação',
    ];
  }
  if(serviceSlug==='assessoria-estrategica'){
    const selected=Array.isArray(answers.frentes)?answers.frentes:[];
    const challenge=String(answers.principal_desafio||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const keywordMap:Record<string,string[]>={governanca:['governan','process'],clima:['clima','engaj'],comunicacao:['comunic'],planejamento:['planej'],desenho:['estrutur','desenho'],cultura:['cultur'],cargos:['cargo','salario'],atracao:['atracao','selec','onboard']};
    const ordered=[...selected.filter((value:string)=>(keywordMap[value]||[]).some(keyword=>challenge.includes(keyword))),...selected].filter((value:string,index:number,list:string[])=>list.indexOf(value)===index);
    const labels:Record<string,string>={planejamento:'Planejamento estratégico de pessoas',desenho:'Estrutura e desenho organizacional',governanca:'Governança, políticas e processos',people_analytics:'People Analytics e dashboards',desempenho:'Gestão de desempenho e metas',clima:'Clima e engajamento',cultura:'Cultura e valores',cargos:'Cargos, carreira e salários',sucessao:'Sucessão e gestão de talentos',liderancas:'Desenvolvimento e apoio às lideranças',decisoes:'Decisões sensíveis e relações de trabalho',atracao:'Atração, seleção e onboarding',marca:'Marca empregadora e experiência do colaborador',comunicacao:'Comunicação interna',saude:'Saúde mental, ocupacional e conformidade',diversidade:'Diversidade, equidade e inclusão'};
    const limit=packageCode==='FULL'?2:1,priorities=ordered.slice(0,limit).map((x:string)=>labels[x]||x),description=priorities.length?priorities.join(', '):(packageCode==='FULL'?'até duas frentes críticas':'uma frente crítica');
    return [phased?'Fase 1 de direção estratégica com a liderança':'Direção estratégica mensal com a liderança',`${packageCode==='FULL'?'Prioridades':'Prioridade'} do primeiro ciclo: ${description}`,`${packageCode==='FULL'?'Encontros quinzenais':'Encontro mensal'} e apoio a decisões críticas dentro da carga contratada`,'Organização de um roadmap para as demais frentes levantadas no briefing','Revisão das prioridades conforme a evolução do ciclo'];
  }
  const defaults=scopeDefaults(serviceSlug,packageCode);
  if(serviceSlug==='treinamentos'){
    // Em treinamentos o budget não cria uma "fase 1" nem um roadmap posterior.
    // O pacote define uma entrega fechada; qualquer adequação comercial deve preservar
    // um escopo legível e coerente com o formato contratado.
    return defaults;
  }
  return [phased?'Primeira fase do trabalho, com escopo e entregas delimitados':'Escopo priorizado conforme o investimento informado',...defaults.slice(0,3),'Roadmap das demais necessidades para uma etapa posterior'];
}

export function defaultNarrative(company:string,answers:Record<string,any>){
  const contextParts=[answers.momento_empresa,answers.principal_desafio,Array.isArray(answers.frentes)?answers.frentes.join(', '):''].filter(Boolean);
  return {
    contextSummary:`${company||'A empresa'} compartilhou um contexto que combina ${contextParts.join(', ')||'necessidades de gestão de pessoas que pedem organização e direção'}. Esta proposta parte do briefing recebido e considera o momento atual, a capacidade de implantação e as decisões que precisam ser sustentadas pela liderança.`,
    painPoints:[answers.principal_desafio,...(Array.isArray(answers.frentes)?answers.frentes:[])].filter(Boolean).slice(0,4).map(String),
    executiveReading:'A leitura inicial indica que o trabalho deve começar pelo que cria base para as demais necessidades avançarem com consistência. Por isso, a recomendação prioriza uma sequência viável de implantação, sem perder de vista o conjunto de temas levantados.',
    whyNow:'O momento pede foco, critérios claros de decisão e uma condução que conecte pessoas ao negócio sem ampliar desnecessariamente a estrutura fixa da empresa.',
    cycleObjective:'Organizar a prioridade central deste ciclo, definir responsáveis e transformar as decisões em uma rotina de acompanhamento aplicável.',
    expectedResults:['Prioridades organizadas e compreendidas pela liderança','Decisões apoiadas por critérios e informações mais claras','Roadmap com responsáveis e próximos movimentos definidos'],
  };
}

