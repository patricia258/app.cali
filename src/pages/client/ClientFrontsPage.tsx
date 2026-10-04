import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, LockKeyhole, MessagesSquare, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { Shell } from '../../components/WorkspaceShell';
import { activeFront, coreFront, eligibleMode, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front, type Plan } from '../../lib/contractFronts';
import { supabase } from '../../lib/supabase';

// Cali ADM — administrativo, financeiro e dúvidas de upgrade/escopo (41 8787-9244).
const ADM_WHATSAPP='554187879244';
// Cali Pati — contato direto com a Patrícia (41 98779-1933). Usado só onde o cliente já tem a frente
// e quer entender melhor o que já é dele, não para sinalizar interesse em algo fora do escopo.
const PATI_WHATSAPP='5541987791933';

const categoryTag:Record<Front['category'],string>={recurring:'Núcleo CALI Full',vacancy:'Por vaga',addon:'Serviço avulso',project:'Projeto pontual'};

// Primeira camada de "mais detalhes": a descrição oficial do catálogo + como a Cali atua naquele
// formato, segundo a regra de modularidade já confirmada na Matriz. Exemplos específicos por frente
// ainda dependem de conteúdo da Pati — ver aviso no rodapé de cada card.
function modalityBullet(front:Front,plan:Plan,isIncluded:boolean){
  if(isIncluded)return plan==='full'?'A Cali diagnostica, desenha, implanta e acompanha com você.':'A Cali diagnostica, recomenda e desenha — a execução fica com seu time.';
  if(plan.startsWith('build_'))return'Implantação assistida: a Cali ensina e supervisiona, seu RH interno executa.';
  if(front.category==='recurring')return'Faz parte do núcleo do CALI Full.';
  if(front.category==='vacancy')return'Cada vaga ocupa 1 slot — desenho e supervisão, sem sourcing operacional.';
  if(front.category==='addon')return'Contratado à parte, com escopo e calendário próprios.';
  return'Projeto com início e fim definidos, fora da recorrência mensal.';
}

function FrontBullets({front,plan,isIncluded}:{front:Front;plan:Plan;isIncluded:boolean}){
  const bullets=[front.description,modalityBullet(front,plan,isIncluded)];
  return <ul className="fronts-card-bullets">{bullets.map((bullet,index)=>{const words=bullet.split(' ');const lead=words.slice(0,2).join(' ');const rest=words.slice(2).join(' ');return <li key={index}><Check size={13}/><span><strong>{lead}</strong>{rest?` ${rest}`:''}</span></li>;})}</ul>;
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
  return <Shell role="client"><div className="fronts-page">
    <header className="fronts-hero fronts-hero-compact"><span className="fronts-hero-leaf" aria-hidden="true"/>
      <span className="section-kicker">SEU ESCOPO COM A CALI</span>
      <h1>Olá, {company?.display_name||'tudo bem'}!</h1>
      <p>Esse espaço é dedicado a que você conheça as frentes contratadas do seu pacote {plan?planName[plan]:company?.service_type||'em definição'}.</p>
    </header>
    {loading?<p>Carregando escopo…</p>:error?<p role="alert" className="fronts-error">{error}</p>:!plan?<section className="fronts-panel"><p>Seu escopo está sendo organizado. Converse com a Paty se precisar confirmar uma frente do contrato.</p></section>:<>
      {(plan==='partner'||plan==='full')&&<section className="fronts-section"><div className="fronts-section-title"><h2><Check size={18} className="fronts-section-icon"/>Já faz parte do seu plano</h2><span>{grouped.included.length} frentes</span></div><div className="fronts-grid fronts-grid-row">{grouped.included.map(front=><article className="fronts-card included" key={front.code}><span className="fronts-badge"><Check size={15}/>No seu plano</span><h3>{front.title}</h3><FrontBullets front={front} plan={plan} isIncluded/><a className="fronts-card-footer" href={`https://wa.me/${PATI_WHATSAPP}?text=${encodeURIComponent(`Olá, Paty! Quero entender melhor a frente ${front.title} do meu plano ${planName[plan]}.`)}`} target="_blank" rel="noreferrer">Para mais detalhes, fale com a Paty <ArrowUpRight size={14}/></a></article>)}</div></section>}
      {showContractedInline&&<section className="fronts-section"><div className="fronts-section-title"><h2>Em implantação</h2><span>{grouped.contracted.length} {grouped.contracted.length===1?'frente':'frentes'}</span></div>{grouped.contracted.length?<div className="fronts-grid">{grouped.contracted.map(({item,front})=><article className="fronts-card active" key={item.id}><span className="fronts-badge"><Check size={15}/>Implantação assistida</span><h3>{front?.title}</h3><p>{item.scope_label||front?.description}</p></article>)}</div>:<div className="fronts-panel">A CALI ainda não registrou uma frente de implantação neste espaço.</div>}</section>}
      {grouped.possible.length>0&&<section className="fronts-section"><div className="fronts-section-title"><h2><MessagesSquare size={18} className="fronts-section-icon fronts-section-icon-gold"/>Podemos conversar sobre</h2><span>Amplie também o seu pacote</span></div><div className="fronts-grid">{grouped.possible.map(front=><article className="fronts-card possible" key={front.code}><span className="fronts-card-eyebrow">{categoryTag[front.category]}</span><span className="fronts-badge"><LockKeyhole size={15}/>Fora do escopo atual</span><h3>{front.title}</h3><details className="fronts-card-details"><summary>Ver o que isso contempla</summary><FrontBullets front={front} plan={plan} isIncluded={false}/><p className="fronts-card-note">Exemplos específicos desta frente: peça pra Paty detalhar no WhatsApp.</p></details><button type="button" onClick={()=>setChosen(front)}>Entender essa frente <ArrowUpRight size={16}/></button></article>)}</div></section>}
    </>}
    {chosen&&createPortal(<div className="modal-backdrop full-screen-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setChosen(null);}}><section className="modal-card fronts-info-modal" role="dialog" aria-modal="true" aria-labelledby="front-dialog-title"><button type="button" className="modal-close" onClick={()=>setChosen(null)} aria-label="Fechar"><X size={19}/></button><span className="section-kicker">FALE COM O TIME CALI</span><h2 id="front-dialog-title">{chosen.title}</h2><p>{chosen.description}</p><p>Esta frente depende de alinhamento de escopo e contrato. Podemos avaliar juntos o que faz sentido para sua empresa.</p><a className="primary fronts-contact" href={`https://wa.me/${ADM_WHATSAPP}?text=${encodeURIComponent(contact)}`} target="_blank" rel="noreferrer">Conversar no WhatsApp <ArrowUpRight size={16}/></a></section></div>,document.body)}
  </div></Shell>;
}
