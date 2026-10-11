import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, ChevronDown, MessagesSquare, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { Shell } from '../../components/WorkspaceShell';
import { activeFront, coreFront, eligibleMode, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front, type Plan } from '../../lib/contractFronts';
import { supabase } from '../../lib/supabase';

// Cali ADM — administrativo, financeiro e dúvidas de upgrade/escopo (41 8787-9244).
const ADM_WHATSAPP='554187879244';
// Cali Pati — contato direto com a Patrícia (41 98779-1933). Usado só onde o cliente já tem a frente
// e quer entender melhor o que já é dele, não para sinalizar interesse em algo fora do escopo.
const PATI_WHATSAPP='5541987791933';

// Exemplos comerciais por código do catálogo. São situações ilustrativas, não ativações nem
// promessas de entregáveis adicionais. O catálogo e as regras de elegibilidade seguem no banco.
type FrontStory={problem:string;examples:[string,string]};
const frontStory:Record<string,FrontStory>={
  strategic_direction:{problem:'Quando decisões de pessoas precisam acompanhar a direção do negócio.',examples:['Definir o que priorizar no RH neste momento.','Orientar escolhas da liderança diante de mudanças no time.']},
  essential_indicators:{problem:'Quando você precisa enxergar sinais da equipe antes de decidir.',examples:['Acompanhar turnover e absenteísmo.','Ler sinais de clima e identificar onde agir primeiro.']},
  dp_advisory:{problem:'Quando uma decisão de pessoal pede orientação técnica.',examples:['Analisar impactos de admissões ou movimentações.','Orientar encaminhamentos em desligamentos, sem executar o DP.']},
  critical_decisions:{problem:'Quando uma decisão sensível pode afetar pessoas e estrutura.',examples:['Avaliar uma promoção ou redistribuição de responsabilidades.','Pensar os próximos passos antes de um desligamento.']},
  dho:{problem:'Quando o desenvolvimento do time precisa de uma direção clara.',examples:['Identificar necessidades de desenvolvimento.','Definir prioridades para acompanhar a evolução das pessoas.']},
  leadership:{problem:'Quando líderes precisam de apoio para conduzir melhor suas equipes.',examples:['Organizar práticas de feedback e acompanhamento.','Dar clareza a papéis e decisões de gestão.']},
  compensation:{problem:'Quando cargos e remuneração cresceram sem critérios claros.',examples:['Desenhar níveis e caminhos de evolução.','Definir diretrizes para decisões de remuneração.']},
  people_analytics:{problem:'Quando os números precisam explicar o que acontece com a equipe.',examples:['Cruzar movimentações, permanência e composição do quadro.','Investigar tendências para orientar prioridades.']},
  development:{problem:'Quando desenvolver pessoas exige um plano além de ações isoladas.',examples:['Organizar uma trilha de desenvolvimento.','Definir acompanhamento para uma necessidade do time.']},
  occupational:{problem:'Quando saúde ocupacional e conformidade precisam de acompanhamento.',examples:['Organizar responsabilidades e pontos de atenção.','Acompanhar validações com especialistas responsáveis.']},
  selection_vacancy:{problem:'Quando uma vaga precisa ser bem definida e acompanhada.',examples:['Desenhar perfil e critérios da vaga.','Supervisionar etapas e decisões, sem fazer sourcing operacional.']},
  employer_brand:{problem:'Quando a reputação como empregadora pede um trabalho dedicado.',examples:['Identificar o que a experiência de quem trabalha aí comunica.','Desenhar uma ação com escopo próprio para fortalecer essa percepção.']},
  executive_diagnostic:{problem:'Quando você precisa entender um desafio antes de abrir um projeto.',examples:['Investigar um problema de pessoas com recorte definido.','Organizar achados e prioridades para a decisão.']},
  leadership_shadowing:{problem:'Quando observar a rotina de liderança ajuda a encontrar ajustes.',examples:['Acompanhar situações reais de gestão.','Devolver pontos de atenção e caminhos de desenvolvimento.']},
  talks:{problem:'Quando um tema merece um encontro específico com a equipe.',examples:['Definir público, objetivo e formato do encontro.','Conduzir uma palestra ou treinamento pontual sobre o tema combinado.']},
};
const categoryTag:Record<Front['category'],string>={recurring:'Frente contínua',vacancy:'Por vaga',addon:'Serviço avulso',project:'Projeto pontual'};
function storyFor(front:Front):FrontStory{return frontStory[front.code]||{problem:front.description,examples:['Entender o desafio da sua empresa.','Definir com a CALI o escopo adequado.']};}
function availability(front:Front,plan:Plan){
  const mode=eligibleMode(front,plan);
  if(mode==='slot_included')return'Possibilidade prevista no CALI Full, sujeita à definição da frente ativa.';
  if(mode==='slot_paid')return'Frente adicional, mediante alinhamento de escopo e contratação.';
  if(mode==='build_assisted')return'Possível como implantação assistida com seu RH interno.';
  return'Projeto ou serviço com escopo combinado à parte.';
}
function IncludedCard({front}:{front:Front}){
  const story=storyFor(front);
  return <article className="v2-fronts-card included">
    <span className="v2-fronts-card-number" aria-hidden="true"><Check size={16}/></span>
    <h3>{front.title}</h3>
    <p className="v2-fronts-card-lead">{story.problem}</p>
    <span className="v2-fronts-examples-label">Na prática</span>
    <ul className="v2-fronts-examples">{story.examples.map(example=><li key={example}>{example}</li>)}</ul>
  </article>;
}
function PossibleCard({front,plan,onChoose}:{front:Front;plan:Plan;onChoose:(front:Front)=>void}){
  const story=storyFor(front);
  return <details className="v2-fronts-faq-card">
    <summary><span className="v2-fronts-faq-summary-text">{front.title}</span><ChevronDown size={18} className="v2-fronts-faq-chevron"/></summary>
    <div className="v2-fronts-faq-answer">
      <span className="v2-fronts-card-eyebrow">{categoryTag[front.category]}</span>
      <p className="v2-fronts-faq-problem">{story.problem}</p>
      <span className="v2-fronts-examples-label">O que pode envolver</span>
      <ul className="v2-fronts-examples">{story.examples.map(example=><li key={example}>{example}</li>)}</ul>
      <p className="v2-fronts-availability">{availability(front,plan)}</p>
      <button type="button" className="v2-fronts-cta-ghost" onClick={()=>onChoose(front)}>Conversar sobre esta frente <ArrowUpRight size={15}/></button>
    </div>
  </details>;
}

export function ClientFrontsPage(){
  const {user}=useWorkspaceAuth();
  const [company,setCompany]=useState<CompanyPlan|null>(null),[catalog,setCatalog]=useState<Front[]>([]),[contracts,setContracts]=useState<ContractedFront[]>([]);
  const [chosen,setChosen]=useState<Front|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{if(!chosen)return;document.body.classList.add('workspace-modal-open');const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setChosen(null);};window.addEventListener('keydown',onKeyDown);return()=>{document.body.classList.remove('workspace-modal-open');window.removeEventListener('keydown',onKeyDown);};},[chosen]);
  useEffect(()=>{let alive=true;async function load(){if(!supabase||!user){setLoading(false);return;}try{
    const profile=await supabase.from('profiles').select('company_id').eq('id',user.id).maybeSingle();
    if(profile.error||!profile.data?.company_id)throw new Error('Seu acesso ainda não está vinculado a uma empresa.');
    const info=await supabase.from('companies').select('id,display_name,service_plan,service_type').eq('id',profile.data.company_id).maybeSingle();
    if(info.error||!info.data)throw info.error||new Error('Empresa não encontrada.');
    const result=await loadContractFronts(info.data.id);if(!alive)return;
    setCompany(info.data as CompanyPlan);setCatalog(result.catalog);setContracts(result.contracts);
  }catch(e){if(alive)setError(e instanceof Error?e.message:'Não foi possível carregar o escopo.');}finally{if(alive)setLoading(false);}}void load();return()=>{alive=false;};},[user?.id]);
  const plan=company?.service_plan||null;
  const active=useMemo(()=>contracts.filter(activeFront),[contracts]);
  const grouped=useMemo(()=>({included:catalog.filter(front=>coreFront(front,plan)), contracted:active.map(item=>({item,front:catalog.find(front=>front.code===item.front_code)})).filter(entry=>entry.front), possible:catalog.filter(front=>!coreFront(front,plan)&&!active.some(item=>item.front_code===front.code)&&eligibleMode(front,plan))}),[catalog,active,plan]);
  const showContractedInline=plan?plan.startsWith('build_'):false;
  const contact=chosen?`Olá! Gostaria de conversar sobre ${chosen.title} para ${company?.display_name||'minha empresa'}.`:'';
  return <Shell role="client"><div className="v2-client-module">
    <header className="page-head"><div><span className="eyebrow">{company?.display_name||'CALI Workspace'} / ESCOPO DA ASSESSORIA</span><h1>Frentes contratadas<span className="title-dot">.</span></h1><p>Conheça os assuntos em que a CALI pode atuar com a sua empresa.</p></div><div className="v2-fronts-head-actions"><span className="chip gold">{plan?planName[plan]:company?.service_type||'Plano em definição'}</span>{plan&&<a className="outline-button" href={`https://wa.me/${PATI_WHATSAPP}?text=${encodeURIComponent(`Olá, Pati! Quero conversar sobre as frentes do meu ${planName[plan]}.`)}`} target="_blank" rel="noreferrer">Falar com a Pati <ArrowUpRight size={14}/></a>}</div></header>
    {loading?<p>Carregando escopo…</p>:error?<p role="alert" className="v2-fronts-error">{error}</p>:!plan?<section className="v2-fronts-panel"><p>Seu escopo está sendo organizado. Converse com a Pati se precisar confirmar uma frente do contrato.</p></section>:<>
      {(plan==='partner'||plan==='full')&&<section className="v2-fronts-section"><div className="v2-fronts-section-title"><h2><Check size={20} className="v2-fronts-section-icon"/>Já faz parte do seu plano</h2><span>{grouped.included.length} {grouped.included.length===1?'frente':'frentes'}</span></div><div className="v2-fronts-grid v2-fronts-included" aria-label="Frentes incluídas no seu plano">{grouped.included.map(front=><IncludedCard front={front} key={front.code}/>)}</div></section>}
      {showContractedInline&&<section className="v2-fronts-section"><div className="v2-fronts-section-title"><h2>Em implantação</h2><span>{grouped.contracted.length} {grouped.contracted.length===1?'frente':'frentes'}</span></div>{grouped.contracted.length?<div className="v2-fronts-grid">{grouped.contracted.map(({item,front})=><article className="v2-fronts-card active" key={item.id}><span className="v2-fronts-badge"><Check size={15}/>Implantação assistida</span><h3>{front?.title}</h3><p>{item.scope_label||front?.description}</p></article>)}</div>:<div className="v2-fronts-panel">A CALI ainda não registrou uma frente de implantação neste espaço.</div>}</section>}
      {grouped.possible.length>0&&<section className="v2-fronts-section"><div className="v2-fronts-section-title"><h2><MessagesSquare size={20} className="v2-fronts-section-icon v2-fronts-section-icon-gold"/>Outras possibilidades</h2><span>Abra uma frente para ver exemplos</span></div><div className="v2-fronts-faq-grid">{grouped.possible.map(front=><PossibleCard front={front} plan={plan} onChoose={setChosen} key={front.code}/>)}</div></section>}
    </>}
    {chosen&&createPortal(<div className="v2-client-module v2-fronts-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setChosen(null);}}><section className="wf-modal wf-create" role="dialog" aria-modal="true" aria-labelledby="front-dialog-title"><button type="button" className="modal-close" onClick={()=>setChosen(null)} aria-label="Fechar"><X size={19}/></button><span className="section-kicker">AVALIAR UMA NOVA FRENTE</span><h2 id="front-dialog-title">{chosen.title}</h2><p>Vamos entender a necessidade da sua empresa e confirmar o formato, o escopo e a disponibilidade antes de qualquer contratação.</p><a className="primary v2-fronts-contact" href={`https://wa.me/${ADM_WHATSAPP}?text=${encodeURIComponent(contact)}`} target="_blank" rel="noreferrer">Conversar com a CALI <ArrowUpRight size={16}/></a></section></div>,document.body)}
  </div></Shell>;
}
