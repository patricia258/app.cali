import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, LockKeyhole, X } from 'lucide-react';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { Shell } from '../../components/WorkspaceShell';
import { activeFront, coreFront, eligibleMode, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front } from '../../lib/contractFronts';
import { supabase } from '../../lib/supabase';
import '../../contract-fronts.css';

export function ClientFrontsPage(){
  const {user}=useWorkspaceAuth();
  const [company,setCompany]=useState<CompanyPlan|null>(null),[catalog,setCatalog]=useState<Front[]>([]),[contracts,setContracts]=useState<ContractedFront[]>([]);
  const [chosen,setChosen]=useState<Front|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
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
  const contact=chosen?`Olá, Paty! Gostaria de conversar sobre ${chosen.title} para ${company?.display_name||'minha empresa'}.`:'';
  return <Shell role="client"><div className="fronts-page"><header className="fronts-hero"><span className="section-kicker">SEU ESCOPO COM A CALI</span><h1>Frentes de atuação</h1><p>{company?`${company.display_name} · ${plan?planName[plan]:company.service_type||'Plano em definição'}`:''}</p></header>
    {loading?<p>Carregando escopo…</p>:error?<p role="alert" className="fronts-error">{error}</p>:!plan?<section className="fronts-panel"><p>Seu escopo está sendo organizado. Converse com a Paty se precisar confirmar uma frente do contrato.</p></section>:<>
      {(plan==='partner'||plan==='full')&&<section className="fronts-section"><div className="fronts-section-title"><h2>Já faz parte do seu plano</h2><span>{grouped.included.length} frentes</span></div><div className="fronts-grid">{grouped.included.map(front=><article className="fronts-card included" key={front.code}><span className="fronts-badge"><Check size={15}/>No seu plano</span><h3>{front.title}</h3><p>{front.description}</p></article>)}</div></section>}
      <section className="fronts-section"><div className="fronts-section-title"><h2>{plan.startsWith('build_')?'Em implantação':'Contratadas à parte'}</h2><span>{grouped.contracted.length} {grouped.contracted.length===1?'frente':'frentes'}</span></div>{grouped.contracted.length?<div className="fronts-grid">{grouped.contracted.map(({item,front})=><article className="fronts-card active" key={item.id}><span className="fronts-badge"><Check size={15}/>{item.mode==='build_assisted'?'Implantação assistida':item.mode==='slot_included'?'Slot incluído':'Contratada'}</span><h3>{front?.title}</h3><p>{item.scope_label||front?.description}</p></article>)}</div>:<div className="fronts-panel">{plan.startsWith('build_')?'A CALI ainda não registrou uma frente de implantação neste espaço.':'Nenhuma frente adicional registrada.'}</div>}</section>
      {grouped.possible.length>0&&<section className="fronts-section"><div className="fronts-section-title"><h2>Podemos conversar sobre</h2></div><div className="fronts-grid">{grouped.possible.map(front=><article className="fronts-card possible" key={front.code}><span className="fronts-badge"><LockKeyhole size={15}/>Fora do escopo atual</span><h3>{front.title}</h3><p>{front.description}</p><button type="button" onClick={()=>setChosen(front)}>Entender essa frente <ArrowUpRight size={16}/></button></article>)}</div></section>}
    </>}
    {chosen&&<div className="fronts-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setChosen(null);}}><div className="fronts-dialog" role="dialog" aria-modal="true" aria-labelledby="front-dialog-title"><button type="button" className="fronts-close" onClick={()=>setChosen(null)} aria-label="Fechar"><X size={19}/></button><span className="section-kicker">CONVERSE COM A PATY</span><h2 id="front-dialog-title">{chosen.title}</h2><p>{chosen.description}</p><p>Esta frente depende de alinhamento de escopo e contrato. Podemos avaliar juntos o que faz sentido para sua empresa.</p><a className="fronts-primary" href={`https://wa.me/5541987791933?text=${encodeURIComponent(contact)}`} target="_blank" rel="noreferrer">Conversar no WhatsApp <ArrowUpRight size={16}/></a></div></div>}
  </div></Shell>;
}
