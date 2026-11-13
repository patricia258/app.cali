import { CompanyField, CompanyInput, CompanySelect } from './CompanyFormFields';
import { AccountPaneHeading } from './AccountPaneHeading';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { addContractFront, closeContractFront, loadContractFronts, type CompanyPlan, type ContractedFront, type Front } from '../../../../api/fronts/contracts';
import { activeFront, eligibleMode, planName } from '../../../../lib/contractFronts';

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
  async function add(){if(!selected||!plan)return;setError('');setNotice('');setSaving(true);try{
    if(selected.code==='selection_vacancy'&&!scope.trim())throw new Error('Identifique a vaga antes de ativar esta frente.');
    await addContractFront(company.id, code, mode, scope, end);
    await refresh();setNotice('Frente registrada no escopo da empresa.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível ativar a frente.');}finally{setSaving(false);}}
  async function close(id:string){setSaving(true);setError('');setNotice('');try{await closeContractFront(id);await refresh();setNotice('Frente encerrada. O histórico permanece registrado.');}catch(e){setError(e instanceof Error?e.message:'Não foi possível encerrar a frente.');}finally{setSaving(false);}}
  return <section className="contract-fronts-admin account-tab-pane"><AccountPaneHeading icon={CheckCircle2} title="Frentes contratadas" description="Ative somente o que estiver no contrato ou aditivo desta empresa." />
    {!plan?<p className="tw:mt-0 tw:mb-[.923rem] tw:text-[.846rem] tw:text-[#9a8c83]">Defina CALI Partner, Full ou Build nos dados da empresa e salve antes de configurar as frentes.</p>:<>
      <div className="tw:mb-[.923rem] tw:flex tw:items-center tw:justify-between tw:gap-[.923rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4 tw:text-[.923rem]"><strong>{planName[plan]}</strong>{plan==='partner'||plan==='full'?<span>{plan==='full'?`${included}/1 incluída · `:''}{paid}/1 adicional contratada</span>:<span>{active.filter(item=>item.mode==='build_assisted').length} em implantação assistida</span>}</div>
      {loading?<p>Carregando frentes…</p>:<><div className="tw:mt-0 tw:mb-[1.077rem] tw:flex tw:flex-col tw:p-0">{active.length?active.map(item=><div key={item.id} className="tw:flex tw:items-center tw:justify-between tw:gap-[.923rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0e8e1] tw:px-[.154rem] tw:py-[.923rem] tw:text-[.923rem]"><div><strong>{catalog.find(front=>front.code===item.front_code)?.title||item.front_code}</strong><small>{item.scope_label?`${item.scope_label} · `:''}{item.mode==='slot_included'?'Incluída':item.mode==='slot_paid'?'Adicional contratada':item.mode==='build_assisted'?'Implantação assistida':'Projeto ou adicional'}{item.ends_at?` · até ${new Date(`${item.ends_at}T12:00:00`).toLocaleDateString('pt-BR')}`:''}</small></div><button type="button" className="tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.769rem] tw:py-[.538rem] tw:text-[.846rem] tw:text-[#9d4b64]" disabled={saving} onClick={()=>void close(item.id)} aria-label={`Encerrar ${item.scope_label||item.front_code}`} title="Encerrar frente"><X size={16}/></button></div>):<p className="tw:mt-0 tw:mb-[.923rem] tw:text-[.846rem] tw:text-[#9a8c83]">Nenhuma frente adicional ativada. O núcleo de Partner e Full é exibido automaticamente.</p>}</div>
      <div className="tw:grid tw:grid-cols-2 tw:items-end tw:gap-x-[1.385rem] tw:gap-y-[1.077rem] tw:max-[43.75rem]:grid-cols-1"><CompanyField>Frente<CompanySelect value={code} onChange={event=>{const next=event.target.value;setCode(next);const item=catalog.find(front=>front.code===next);setMode(item?eligibleMode(item,plan)||'addon':'slot_paid');}}><option value="">Selecione</option>{available.map(front=><option key={front.code} value={front.code}>{front.title}</option>)}</CompanySelect></CompanyField>{selected&&<><CompanyField>Formato<CompanySelect value={mode} onChange={event=>setMode(event.target.value as ContractedFront['mode'])}>{modes.map(item=><option key={item} value={item}>{item==='slot_included'?'Slot incluído':item==='slot_paid'?'Slot adicional contratado':item==='build_assisted'?'Implantação assistida':'Projeto ou adicional'}</option>)}</CompanySelect></CompanyField><CompanyField>Escopo {selected.code==='selection_vacancy'?'da vaga':''}<CompanyInput value={scope} onChange={event=>setScope(event.target.value)} placeholder={selected.code==='selection_vacancy'?'Ex.: Analista de operações':'Se o contrato delimitar'}/></CompanyField><CompanyField>Até (opcional)<CompanyInput type="date" value={end} min={new Date().toISOString().slice(0,10)} onChange={event=>setEnd(event.target.value)}/></CompanyField><button className="tw:mt-[1.077rem] tw:inline-flex tw:w-fit tw:items-center tw:gap-[.538rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4 tw:py-[.769rem] tw:text-[.846rem] tw:font-semibold tw:text-white" type="button" disabled={saving} onClick={()=>void add()}><Plus size={16}/>Ativar frente</button></>}</div></>}
    </>}{error&&<p role="alert" className="tw:text-[.846rem] tw:text-[#b7495d]">{error}</p>}{notice&&<p role="status" className="tw:text-[.846rem] tw:text-[#42785a]">{notice}</p>}
  </section>;
}
