import type { PortalPricingRule } from './portalAdminApi';

type Answers=Record<string,any>;
type Band={min:number;max:number};
type InvestmentBand={value:string;label:string;min:number|null;max:number|null};

export const INVESTMENT_BANDS:Record<string,{period:string;options:InvestmentBand[]}>= {
  'assessoria-estrategica':{period:'por mês',options:[{value:'ate5',label:'Até R$ 5 mil',min:0,max:5000},{value:'5a8',label:'R$ 5 mil a R$ 8 mil',min:5000,max:8000},{value:'8a12',label:'R$ 8 mil a R$ 12 mil',min:8000,max:12000},{value:'12mais',label:'Acima de R$ 12 mil',min:12000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'mentoria-rh':{period:'por ciclo',options:[{value:'ate15',label:'Até R$ 1,5 mil',min:0,max:1500},{value:'15a24',label:'R$ 1,5 mil a R$ 2,4 mil',min:1500,max:2400},{value:'24mais',label:'Acima de R$ 2,4 mil',min:2400,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'diagnostico-executivo':{period:'pelo projeto',options:[{value:'ate3',label:'Até R$ 3 mil',min:0,max:3000},{value:'3a45',label:'R$ 3 mil a R$ 4,5 mil',min:3000,max:4500},{value:'45mais',label:'Acima de R$ 4,5 mil',min:4500,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'cultura-direcao':{period:'pelo projeto',options:[{value:'ate4',label:'Até R$ 4 mil',min:0,max:4000},{value:'4mais',label:'Acima de R$ 4 mil',min:4000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'shadowing-lideranca':{period:'pelo ciclo',options:[{value:'ate4',label:'Até R$ 4 mil',min:0,max:4000},{value:'4mais',label:'Acima de R$ 4 mil',min:4000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  treinamentos:{period:'pela contratação',options:[{value:'ate25',label:'Até R$ 2,5 mil',min:0,max:2500},{value:'25a5',label:'R$ 2,5 mil a R$ 5 mil',min:2500,max:5000},{value:'5mais',label:'Acima de R$ 5 mil',min:5000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'marca-empregadora':{period:'pelo projeto ou mensalidade',options:[{value:'ate4',label:'Até R$ 4 mil',min:0,max:4000},{value:'4mais',label:'Acima de R$ 4 mil',min:4000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
  'solucao-personalizada':{period:'pela contratação',options:[{value:'ate3',label:'Até R$ 3 mil',min:0,max:3000},{value:'3mais',label:'Acima de R$ 3 mil',min:3000,max:null},{value:'avaliar',label:'Prefiro avaliar pelo escopo',min:null,max:null}]},
};

const LEGACY:Record<string,InvestmentBand[]>={
  'mentoria-rh':[{value:'ate2',label:'Até R$ 2 mil',min:0,max:2000},{value:'2a4',label:'R$ 2 mil a R$ 4 mil',min:2000,max:4000},{value:'4a7',label:'R$ 4 mil a R$ 7 mil',min:4000,max:7000},{value:'7mais',label:'Acima de R$ 7 mil',min:7000,max:null}],
  'diagnostico-executivo':[{value:'ate5',label:'Até R$ 5 mil',min:0,max:5000},{value:'8a12',label:'R$ 8 mil a R$ 12 mil',min:8000,max:12000},{value:'12mais',label:'Acima de R$ 12 mil',min:12000,max:null}],
  'cultura-direcao':[{value:'ate6',label:'Até R$ 6 mil',min:0,max:6000},{value:'6a10',label:'R$ 6 mil a R$ 10 mil',min:6000,max:10000},{value:'10a15',label:'R$ 10 mil a R$ 15 mil',min:10000,max:15000},{value:'15mais',label:'Acima de R$ 15 mil',min:15000,max:null}],
  treinamentos:[{value:'ate3',label:'Até R$ 3 mil',min:0,max:3000},{value:'3a6',label:'R$ 3 mil a R$ 6 mil',min:3000,max:6000},{value:'6a12',label:'R$ 6 mil a R$ 12 mil',min:6000,max:12000}],
  'marca-empregadora':[{value:'ate6',label:'Até R$ 6 mil',min:0,max:6000},{value:'6a10',label:'R$ 6 mil a R$ 10 mil',min:6000,max:10000},{value:'10a15',label:'R$ 10 mil a R$ 15 mil',min:10000,max:15000},{value:'15mais',label:'Acima de R$ 15 mil',min:15000,max:null}],
  'solucao-personalizada':[{value:'ate5',label:'Até R$ 5 mil',min:0,max:5000},{value:'10a20',label:'R$ 10 mil a R$ 20 mil',min:10000,max:20000},{value:'20mais',label:'Acima de R$ 20 mil',min:20000,max:null}],
};

export const PACKAGE_PRICE_BANDS:Record<string,Record<string,Band>>={
  'assessoria-estrategica':{PARTNER:{min:3900,max:5800},FULL:{min:6500,max:8000}},
  'mentoria-rh':{ESSENCIAL:{min:1500,max:1800},AMPLIADO:{min:2200,max:2400}},
  'diagnostico-executivo':{ESSENCIAL:{min:2800,max:3000},COMPLETO:{min:4000,max:4500}},
  'cultura-direcao':{PROJETO:{min:3800,max:4000}},
  'shadowing-lideranca':{CICLO:{min:3500,max:4000}},
  treinamentos:{PALESTRA:{min:1800,max:2500},WORKSHOP:{min:2800,max:3800},TREINAMENTO:{min:4000,max:5000}},
  'marca-empregadora':{PROJETO:{min:3800,max:4000},RECORRENTE:{min:3200,max:4000}},
  'solucao-personalizada':{SOB_MEDIDA:{min:2800,max:3000}},
};

export function investmentContextFor(serviceSlug:string,answers:Answers={}){
  const config=INVESTMENT_BANDS[serviceSlug];if(!config)return null;
  const value=answers.investimento||answers.budget||'';if(!value)return null;
  const band=config.options.find(item=>item.value===value)||LEGACY[serviceSlug]?.find(item=>item.value===value);if(!band)return null;
  return {...band,period:config.period,open:value==='avaliar'};
}

export function initialPackageFor(serviceSlug:string,answers:Answers={},pricing:PortalPricingRule[]=[]){
  if(serviceSlug==='assessoria-estrategica'){
    const investment=investmentContextFor(serviceSlug,answers);if(investment?.max&&investment.max<=5800)return 'PARTNER';
    if(['PARTNER','FULL'].includes(String(answers.modelo_interesse)))return String(answers.modelo_interesse);
    const fronts=answers.frentes?.length||0;if(fronts>=5||answers.frequencia==='semanal'||answers.presencial==='mensal'||answers.presencial==='mais')return 'FULL';return 'PARTNER';
  }
  if(serviceSlug==='treinamentos'){const meetings=Number(answers.encontros||1),hours=Number(answers.carga_horaria||1.5);return meetings>1?'TREINAMENTO':hours>=4?'WORKSHOP':'PALESTRA';}
  if(serviceSlug==='mentoria-rh'){if(answers.modalidade==='grupo'||answers.suporte==='proximo'||(answers.objetivos?.length||0)>=3||answers.frequencia==='semanal')return 'AMPLIADO';return 'ESSENCIAL';}
  if(serviceSlug==='diagnostico-executivo')return Number(answers.entrevistas||0)>3||answers.survey==='sim'||answers.documentos!=='organizada'?'COMPLETO':'ESSENCIAL';
  if(serviceSlug==='cultura-direcao')return 'PROJETO';if(serviceSlug==='shadowing-lideranca')return 'CICLO';
  if(serviceSlug==='marca-empregadora')return answers.modelo_contratacao==='recorrente'?'RECORRENTE':'PROJETO';
  return pricing.find(item=>item.service_slug===serviceSlug)?.package_code||'SOB_MEDIDA';
}

export function calculateProposal(input:{serviceSlug:string;answers:Answers;packageCode:string;basePrice:number|string;discount?:number|string;extras?:number|string;months?:number|string;finalOverride?:number|string|null;scopeMode?:'integral'|'prioritized'}){
  const {serviceSlug,answers,packageCode}=input;const n=(value:any,fallback=0)=>Number(value)||fallback;
  let factor=1,extras=n(input.extras),months=n(input.months,1);const breakdown:any[]=[];
  if(serviceSlug==='assessoria-estrategica'){const size=n(answers.colaboradores,20),sizeFactor=size<=20?1:size<=50?1.08:size<=100?1.15:1.22;const fronts=answers.frentes?.length||1,included=packageCode==='FULL'?2:1,frontFactor=1+Math.max(0,fronts-included)*.06,cadenceFactor=answers.frequencia==='semanal'?1.14:answers.frequencia==='quinzenal'?1.06:1;factor=sizeFactor*frontFactor*cadenceFactor;breakdown.push(['Porte',sizeFactor],['Frentes',frontFactor],['Cadência',cadenceFactor]);months=Math.max(months||6,6);}
  else if(serviceSlug==='treinamentos'){const groups=n(answers.turmas,1),meetings=n(answers.encontros,1),participants=n(answers.participantes,20),formatFactor=answers.formato==='presencial'?1.15:answers.formato==='hibrido'?1.2:1,participantFactor=participants>35?1.15:participants>20?1.08:1,includedMeetings=packageCode==='TREINAMENTO'?3:1,meetingFactor=1+Math.max(0,meetings-includedMeetings)*.12,groupFactor=1+Math.max(0,groups-1)*.18;factor=groupFactor*meetingFactor*formatFactor*participantFactor;if(answers.materiais==='sim')extras+=Math.min(participants*groups*25,500);breakdown.push(['Turmas',groups],['Encontros',meetings],['Formato',formatFactor],['Participantes',participantFactor]);}
  else if(serviceSlug==='mentoria-rh'){const participants=answers.modalidade==='grupo'?n(answers.participantes,2):1,durationFactor=answers.duracao_sessao==='90'?1.25:1,supportFactor=answers.suporte==='proximo'?1.2:answers.suporte==='mensagens'?1.1:1;factor=(1+Math.max(0,participants-1)*.12)*durationFactor*supportFactor;breakdown.push(['Participantes',participants],['Duração',durationFactor],['Suporte',supportFactor]);}
  else if(serviceSlug==='diagnostico-executivo'){const interviews=n(answers.entrevistas,packageCode==='COMPLETO'?6:3),units=n(answers.unidades,1),docFactor=answers.documentos==='desorganizada'?1.2:answers.documentos==='parcial'?1.1:1,includedInterviews=packageCode==='COMPLETO'?6:3;factor=(1+Math.max(0,interviews-includedInterviews)*.03)*(1+Math.max(0,units-1)*.05)*docFactor;breakdown.push(['Entrevistas',interviews],['Unidades',units],['Documentação',docFactor]);}
  else if(serviceSlug==='cultura-direcao'){const interviews=n(answers.entrevistas,4),groups=n(answers.grupos,1),workshops=n(answers.workshops,1);factor=1+Math.max(0,interviews-4)*.03+Math.max(0,groups-1)*.06+Math.max(0,workshops-1)*.08;breakdown.push(['Entrevistas',interviews],['Grupos focais',groups],['Workshops',workshops]);}
  else if(serviceSlug==='shadowing-lideranca'){const leaders=n(answers.lideres,1),hours=n(answers.horas,4);factor=Math.max(1,hours/4);breakdown.push(['Líderes',leaders],['Horas por líder',hours]);}
  else if(serviceSlug==='marca-empregadora'){const units=n(answers.unidades,1),personas=n(answers.personas,2),assets=answers.ativos?.length||1;factor=(1+Math.max(0,units-1)*.08)*(1+Math.max(0,personas-2)*.05)*(1+Math.max(0,assets-3)*.06);breakdown.push(['Unidades',units],['Personas',personas],['Ativos',assets]);}
  const scopeMode=input.scopeMode||'integral';if(scopeMode==='prioritized'){factor=Math.min(factor,1);extras=0;breakdown.push(['Escopo priorizado',1]);}
  const priceBand=PACKAGE_PRICE_BANDS[serviceSlug]?.[packageCode]||null,monthly=serviceSlug==='assessoria-estrategica'||(serviceSlug==='marca-empregadora'&&packageCode==='RECORRENTE');
  const rawSubtotal=Math.round((n(input.basePrice)*factor+extras)/50)*50,subtotal=priceBand&&rawSubtotal>0?Math.min(priceBand.max,Math.max(priceBand.min,rawSubtotal)):rawSubtotal;
  const discountValue=Math.round(subtotal*Math.min(Math.max(n(input.discount),0),50)/100),calculatedFinal=subtotal-discountValue,hasOverride=input.finalOverride!==null&&input.finalOverride!==''&&Number.isFinite(Number(input.finalOverride));
  const requestedFinal=hasOverride?Math.max(0,Number(input.finalOverride)):calculatedFinal,finalUnit=priceBand&&requestedFinal>0?Math.min(priceBand.max,Math.max(priceBand.min,requestedFinal)):requestedFinal,effectiveDiscountValue=Math.max(0,subtotal-finalUnit),effectiveDiscountPct=subtotal?Number(((effectiveDiscountValue/subtotal)*100).toFixed(2)):0;
  return {factor:Number(factor.toFixed(3)),subtotal,rawSubtotal,discountValue:effectiveDiscountValue,discountPct:effectiveDiscountPct,finalUnit,total:finalUnit,months,monthly,extras,manualFinal:hasOverride,scopeMode,breakdown,priceBand,ceilingApplied:Boolean(priceBand&&rawSubtotal>priceBand.max)};
}

export function scopeDefaults(serviceSlug:string,packageCode:string){
  const map:Record<string,string[]>= {
    'assessoria-estrategica':packageCode==='FULL'?['Direção estratégica quinzenal com a liderança','Até duas prioridades simultâneas definidas para o ciclo','Leitura dos indicadores-chave e apoio às decisões críticas','Uma visita presencial mensal com finalidade previamente definida','Roadmap das demais frentes e revisão periódica de prioridades']:['Direção estratégica mensal com a liderança','Uma prioridade central definida para o ciclo','Leitura dos indicadores-chave e apoio às decisões críticas','Estruturação de política, processo ou rotina vinculada à prioridade','Roadmap das demais frentes para ciclos posteriores'],
    'mentoria-rh':packageCode==='AMPLIADO'?['Leitura inicial do momento e dos objetivos profissionais','Cinco encontros aplicados a casos reais','Plano de desenvolvimento com competências prioritárias','Práticas e registros de aplicação entre os encontros','Encontro final de consolidação e próximos movimentos']:['Leitura inicial do momento e do objetivo prioritário','Três encontros aplicados a casos reais','Plano de desenvolvimento focado em uma competência central','Práticas de aplicação entre os encontros','Síntese final com próximos movimentos'],
    'diagnostico-executivo':packageCode==='COMPLETO'?['Kickoff e organização dos insumos','Até 6 entrevistas com lideranças-chave','Leitura documental e dos indicadores disponíveis','Relatório executivo, mapa de riscos e prioridades de 90 dias','Reunião executiva de devolutiva']:['Kickoff focado na decisão prioritária','Até 3 entrevistas com lideranças-chave','Leitura dos documentos e indicadores já disponíveis','Síntese executiva e prioridades de 90 dias','Reunião remota de devolutiva'],
    'cultura-direcao':['Leitura da cultura atual por pesquisa ou amostra definida','Até 4 entrevistas e 1 grupo focal','1 workshop de direção com a liderança','Comportamentos esperados e direcionadores culturais','Roadmap de 90 dias com responsáveis e indicadores'],
    'shadowing-lideranca':['Alinhamento de objetivo, consentimento e confidencialidade','Até 4 horas de observação em duas situações reais de uma liderança','Registro técnico de padrões de comunicação, decisão e influência','Devolutiva individual confidencial','Plano de ação com três comportamentos prioritários'],
    treinamentos:packageCode==='PALESTRA'?['Reunião breve de briefing com o sponsor','Palestra estratégica de 60 a 90 minutos','Conteúdo contextualizado ao público e ao negócio','Facilitação ao vivo por Patrícia Lima','Material-síntese de apoio']:packageCode==='WORKSHOP'?['Reunião de briefing com o sponsor','Workshop aplicado de até quatro horas','Conteúdo e exercícios conectados ao contexto real','Facilitação ao vivo por Patrícia Lima','Material de apoio e compromissos de aplicação']:['Reunião de briefing e desenho da competência prioritária','Até três encontros personalizados','Conteúdo, exercícios e prática entre os encontros','Facilitação ao vivo por Patrícia Lima','Síntese de aplicação e próximos compromissos'],
    'marca-empregadora':packageCode==='RECORRENTE'?['Revisão mensal das prioridades de marca empregadora','Orientação estratégica para ativação por RH, Marketing ou agência','Acompanhamento do roadmap e dos responsáveis','Leitura dos indicadores de percepção e atração disponíveis','Recomendações para o ciclo seguinte']:['Diagnóstico de percepção interna e externa','Definição ou refinamento do EVP e dos pilares','Personas e canais prioritários','Roadmap de ativação com responsabilidades definidas','Matriz de indicadores para acompanhamento'],
    'solucao-personalizada':['Leitura aprofundada do contexto','Desenho do escopo sob medida','Definição de entregas, limites e responsabilidades','Cronograma e checkpoints de validação','Recomendações conectadas ao resultado esperado'],
  };return map[serviceSlug]||[];
}

export const DEFAULT_ADVANTAGES=['Mais de 15 anos de experiência em Recursos Humanos e atuação em mais de 110 empresas, aplicados à leitura de riscos, dependências e prioridades deste contexto.','Condução direta por Patrícia Lima, com repertório de diretoria e CHRO, sem repasses ou camadas intermediárias.','Método conectado ao negócio, com decisões, responsáveis e próximos movimentos claramente organizados.'];
