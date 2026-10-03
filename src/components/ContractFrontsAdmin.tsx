import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { activeFront, coreFront, eligibleMode, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front } from '../lib/contractFronts';

export function ContractFrontsAdmin({company}:{company:CompanyPlan}) {
  const [catalog,setCatalog]=useState<Front[]>([]),[contracts,setContracts]=useState<ContractedFront[]>([]);
  const [code,setCode]=useState(''),[mode,setMode]=useState<ContractedFront['mode']>('slot_paid'),[scope,setScope]=useState(''),[end,setEnd]=useState('');
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const plan=company.service_plan;
  async function refresh(){try{const result=await loadContractFronts(company.id);setCatalog(result.catalog);setContracts(result.contracts);setError('');}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as frentes.');}finally{setLoading(false);}}
  useEffect(()=>{setLoading(true);setCode('');setNotice('');void refresh();},[company.id]);
  const available=useMemo(()=>catalog.filter(front=>eligibleMode(front,plan)),[catalog,plan]);
  const active=contracts.filter(activeFront);
  const selected=catalog.find(front=>front.code===code);
  const defaultMode=selected?eligibleMode(selected,plan):null;
  const modes:ContractedFront['mode'][] = defaultMode==='slot_included'?['slot_included','slot_paid']:defaultMode?[defaultMode]:[];
  const included=active.filter(item=>item.mode==='slot_included').length;
  const paid=active.filter(item=>item.mode==='slot_paid').length;
  async function add(){if(!supabase||!selected||!plan)return;setError('');setNotice('');setSaving(true);try{
    if(selected.code==='selection_vacancy'&&!scope.trim())throw new Error('Identifique a vaga antes de ativar esta frente.');
    const result=await supabase.from('company_fronts').insert({company_id:company.id,front_code:code,mode,scope_label:scope.trim()||null,ends_at:end||null});
    if(result.error)throw result.error;setCode('');setScope('');setEnd('');await refresh();setNotice('Frente registrada no escopo da empresa.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível ativar a frente.');}finally{setSaving(false);}}
  async function close(id:string){if(!supabase)return;setSaving(true);setError('');setNotice('');try{const result=await supabase.from('company_fronts').update({status:'ended'}).eq('id',id);if(result.error)throw result.error;await refresh();setNotice('Frente encerrada. O histórico permanece registrado.');}catch(e){setError(e instanceof Error?e.message:'Não foi possível encerrar a frente.');}finally{setSaving(false);}}
  return <section className="contract-fronts-admin account-tab-pane"><div className="account-pane-heading"><CheckCircle2 size={18}/><div><strong>Frentes contratadas</strong><span>Ative somente o que estiver no contrato ou aditivo desta empresa.</span></div></div>
    {!plan?<p className="fronts-note">Defina CALI Partner, Full ou Build nos dados da empresa e salve antes de configurar as frentes.</p>:<>
      <div className="fronts-summary"><strong>{planName[plan]}</strong>{plan==='partner'||plan==='full'?<span>{plan==='full'?`${included}/1 incluída · `:''}{paid}/1 adicional contratada</span>:<span>{active.filter(item=>item.mode==='build_assisted').length} em implantação assistida</span>}</div>
      {loading?<p>Carregando frentes…</p>:<><div className="fronts-active-list">{active.length?active.map(item=><div key={item.id}><div><strong>{catalog.find(front=>front.code===item.front_code)?.title||item.front_code}</strong><small>{item.scope_label?`${item.scope_label} · `:''}{item.mode==='slot_included'?'Incluída':item.mode==='slot_paid'?'Adicional contratada':item.mode==='build_assisted'?'Implantação assistida':'Projeto ou adicional'}{item.ends_at?` · até ${new Date(`${item.ends_at}T12:00:00`).toLocaleDateString('pt-BR')}`:''}</small></div><button type="button" className="fronts-close" disabled={saving} onClick={()=>void close(item.id)} aria-label={`Encerrar ${item.scope_label||item.front_code}`} title="Encerrar frente"><X size={16}/></button></div>):<p className="fronts-note">Nenhuma frente adicional ativada. O núcleo de Partner e Full é exibido automaticamente.</p>}</div>
      <div className="fronts-form"><label>Frente<select value={code} onChange={event=>{const next=event.target.value;setCode(next);const item=catalog.find(front=>front.code===next);setMode(item?eligibleMode(item,plan)||'addon':'slot_paid');}}><option value="">Selecione</option>{available.map(front=><option key={front.code} value={front.code}>{front.title}</option>)}</select></label>{selected&&<><label>Formato<select value={mode} onChange={event=>setMode(event.target.value as ContractedFront['mode'])}>{modes.map(item=><option key={item} value={item}>{item==='slot_included'?'Slot incluído':item==='slot_paid'?'Slot adicional contratado':item==='build_assisted'?'Implantação assistida':'Projeto ou adicional'}</option>)}</select></label><label>Escopo {selected.code==='selection_vacancy'?'da vaga':''}<input value={scope} onChange={event=>setScope(event.target.value)} placeholder={selected.code==='selection_vacancy'?'Ex.: Analista de operações':'Se o contrato delimitar'}/></label><label>Até (opcional)<input type="date" value={end} min={new Date().toISOString().slice(0,10)} onChange={event=>setEnd(event.target.value)}/></label><button className="fronts-primary" type="button" disabled={saving} onClick={()=>void add()}><Plus size={16}/>Ativar frente</button></>}</div></>}
    </>}{error&&<p role="alert" className="fronts-error">{error}</p>}{notice&&<p role="status" className="fronts-success">{notice}</p>}
  </section>;
}
