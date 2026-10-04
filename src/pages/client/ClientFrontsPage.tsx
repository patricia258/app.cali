import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, LockKeyhole, Megaphone, Sparkles, Target, UserPlus, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { Shell } from '../../components/WorkspaceShell';
import { activeFront, coreFront, eligibleMode, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front, type Plan } from '../../lib/contractFronts';
import { supabase } from '../../lib/supabase';

// Cali ADM — administrativo, financeiro e dúvidas de upgrade/escopo (41 8787-9244).
// Número pessoal da Pati (41 98779-1933) é usado só em fluxos que pedem contato direto com ela, não aqui.
const ADM_WHATSAPP='554187879244';

function possibleGroupMeta(category:Front['category'],plan:Plan){
  if(plan.startsWith('build_'))return category==='vacancy'?{label:'Vaga para implantação assistida',icon:UserPlus}:{label:'Disponível para implantação assistida',icon:Sparkles};
  if(category==='recurring')return{label:'Amplie com o CALI Full',icon:Sparkles};
  if(category==='vacancy')return{label:'Para a próxima vaga que abrir',icon:UserPlus};
  if(category==='addon')return{label:'Serviço avulso',icon:Megaphone};
  return{label:'Projeto pontual',icon:Target};
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
  const possibleGroups=useMemo(()=>{
    if(!plan)return[];
    const order:Front['category'][]=['recurring','vacancy','addon','project'];
    return order.map(category=>({category,items:grouped.possible.filter(front=>front.category===category)})).filter(group=>group.items.length>0);
  },[grouped.possible,plan]);
  const showContractedInline=plan?plan.startsWith('build_'):false;
  const contact=chosen?`Olá! Gostaria de conversar sobre ${chosen.title} para ${company?.display_name||'minha empresa'}.`:'';
  return <Shell role="client"><div className="fronts-page">
    <header className="fronts-hero fronts-hero-compact">
      <span className="section-kicker">SEU ESCOPO COM A CALI</span>
      <h1>Olá, {company?.display_name||'tudo bem'}!</h1>
      <p>Esse espaço é dedicado a que você conheça as frentes contratadas do seu pacote {plan?planName[plan]:company?.service_type||'em definição'}.</p>
    </header>
    {loading?<p>Carregando escopo…</p>:error?<p role="alert" className="fronts-error">{error}</p>:!plan?<section className="fronts-panel"><p>Seu escopo está sendo organizado. Converse com a Paty se precisar confirmar uma frente do contrato.</p></section>:<>
      {(plan==='partner'||plan==='full')&&<section className="fronts-section"><div className="fronts-section-title"><h2>Já faz parte do seu plano</h2><span>{grouped.included.length} frentes</span></div><div className="fronts-grid fronts-grid-row">{grouped.included.map(front=><article className="fronts-card included" key={front.code}><span className="fronts-badge"><Check size={15}/>No seu plano</span><h3>{front.title}</h3><p>{front.description}</p><span className="fronts-card-tag">Núcleo {planName[plan]}</span></article>)}</div></section>}
      {showContractedInline&&<section className="fronts-section"><div className="fronts-section-title"><h2>Em implantação</h2><span>{grouped.contracted.length} {grouped.contracted.length===1?'frente':'frentes'}</span></div>{grouped.contracted.length?<div className="fronts-grid">{grouped.contracted.map(({item,front})=><article className="fronts-card active" key={item.id}><span className="fronts-badge"><Check size={15}/>Implantação assistida</span><h3>{front?.title}</h3><p>{item.scope_label||front?.description}</p></article>)}</div>:<div className="fronts-panel">A CALI ainda não registrou uma frente de implantação neste espaço.</div>}</section>}
      {possibleGroups.length>0&&<section className="fronts-section"><div className="fronts-section-title"><h2>Podemos conversar sobre</h2></div>
        {possibleGroups.map(group=>{const meta=possibleGroupMeta(group.category,plan);const GroupIcon=meta.icon;return <div className="fronts-subgroup" key={group.category}><div className="fronts-subgroup-title"><GroupIcon size={16}/><span>{meta.label}</span></div><div className="fronts-grid">{group.items.map(front=><article className="fronts-card possible" key={front.code}><span className="fronts-badge"><LockKeyhole size={15}/>Fora do escopo atual</span><h3>{front.title}</h3><p>{front.description}</p><button type="button" onClick={()=>setChosen(front)}>Entender essa frente <ArrowUpRight size={16}/></button></article>)}</div></div>;})}
      </section>}
    </>}
    {chosen&&createPortal(<div className="modal-backdrop full-screen-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setChosen(null);}}><section className="modal-card fronts-info-modal" role="dialog" aria-modal="true" aria-labelledby="front-dialog-title"><button type="button" className="modal-close" onClick={()=>setChosen(null)} aria-label="Fechar"><X size={19}/></button><span className="section-kicker">FALE COM O TIME CALI</span><h2 id="front-dialog-title">{chosen.title}</h2><p>{chosen.description}</p><p>Esta frente depende de alinhamento de escopo e contrato. Podemos avaliar juntos o que faz sentido para sua empresa.</p><a className="primary fronts-contact" href={`https://wa.me/${ADM_WHATSAPP}?text=${encodeURIComponent(contact)}`} target="_blank" rel="noreferrer">Conversar no WhatsApp <ArrowUpRight size={16}/></a></section></div>,document.body)}
  </div></Shell>;
}
