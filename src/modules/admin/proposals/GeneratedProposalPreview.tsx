import { DocumentAction } from '../../../components/workspace/components/DocumentAction';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { AdminMaterialReview } from '../../material-review/AdminMaterialReview';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Loader2, Mail, Printer, X } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useParams } from '../../../hooks/useParams';
import { DocumentShell } from '../../../components/workspace/DocumentShell';
import { DocumentPanel } from '../../../components/workspace/components/DocumentPanel';
import { loadPortalProposal, portalServiceLabel, sendPortalProposal, updatePortalProposal, type PortalProposal, type PortalSubmission } from '../../../api/commercial/portal';
import { PACKAGE_META } from '../../../lib/portalProposalConfig';
import { getProposalProfile } from '../../../lib/portalProposalParity';
import './portal-proposal-preview.css';

type FullProposal=PortalProposal&{submission:PortalSubmission};
const CALI_LOGO='https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-bordo.png';
const CALI_LOGO_LIGHT='https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-light.png';
const present=<T,>(v:T)=>String(v??'').replace(/sponsor\s*\/\s*diretoria/gi,'liderança responsável ou diretoria').replace(/\bsponsor\b/gi,'liderança responsável');
const list=(v:string[] | undefined):string[]=>Array.isArray(v)?v.map(present).filter(Boolean):[];
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=(v?:string|null)=>v?new Intl.DateTimeFormat('pt-BR').format(new Date(v)):'—';
const safe=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _.-]+/g,'').replace(/\s+/g,' ').trim();
const filename=(p:FullProposal)=>safe(`Proposta CALI RH - ${portalServiceLabel(p.service_slug)} - ${p.submission.company_name||p.submission.contact_name} - ${p.submission.protocol}.pdf`);
function fileBase64(file:File){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(new Error('Não foi possível ler o PDF.'));r.readAsDataURL(file)})}
function scopeGroups(items:PortalProposal['scope_items']){const groups:Array<{number:number;text:string;subitems:string[]}>=[];for(const raw of items){const item=present(raw),isSub=/^\s*[-–—]\s*/.test(item),text=item.replace(/^\s*[-–—]\s*/,'');if(isSub&&groups.length)groups.at(-1)!.subitems.push(text);else groups.push({number:groups.length+1,text,subitems:[]})}return groups}
function paymentConditions(p:FullProposal){const calc=p.calculator_data||{},x=calc.payment||{},rows:string[]=[];const recurring=p.service_slug==='assessoria-estrategica'||p.service_slug==='cali-build'||(p.service_slug==='marca-empregadora'&&p.package_code==='RECORRENTE');if(recurring)return rows;if(x.method==='monthly')rows.push(`Pagamento mensal com vencimento em ${x.monthlyDue||'1º dia útil de cada mês'}.`);else if(x.method==='split'){const a=Number(x.entryPct||50),b=Number(x.finalPct||50);rows.push(`Pagamento: ${a}% na contratação e ${b}% na finalização.`)}else if(x.method==='pix'){const d=Number(x.pixDiscount||p.discount_pct||0);rows.push(d>0?`Pagamento via PIX à vista, com ${d.toLocaleString('pt-BR',{maximumFractionDigits:2})}% de desconto já aplicado.`:'Pagamento via PIX à vista.')}else if(x.method==='card'){const n=Number(x.cardInstallments||1),fees=x.cardFees==='included'?'taxas incluídas no valor final':'taxas acrescidas conforme a operadora';rows.push(`Pagamento em até ${n}x no cartão, com ${fees}.`)}else if(x.method==='custom')rows.push(`Pagamento: ${x.customLabel||'conforme condição acordada'}.`);return rows}
function paragraphs(value:string,limit=3){const raw=present(value).replace(/\s+/g,' ').trim();if(!raw)return[];const manual=present(value).split(/\n+/).map(x=>x.trim()).filter(Boolean);if(manual.length>1)return manual.slice(0,limit);const sentences=raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim()).filter(Boolean)||[raw];if(sentences.length<=1)return[raw];const buckets:string[]=[];let current='';for(const sentence of sentences){if((current+' '+sentence).trim().length>245&&current){buckets.push(current.trim());current=sentence}else current=(current+' '+sentence).trim()}if(current)buckets.push(current.trim());return buckets.slice(0,limit)}
function withKeys<T>(items: readonly T[], identity: (item: T) => string = String) {
  const occurrences = new Map<string, number>();
  return items.map(item => {
    const content = identity(item);
    const occurrence = (occurrences.get(content) ?? 0) + 1;
    occurrences.set(content, occurrence);
    return { item, key: JSON.stringify([content, occurrence]) };
  });
}
function unique(items:string[]){return [...new Set(items.map(x=>present(x).trim()).filter(Boolean))]}
function descriptor(slug:string){const map:Record<string,string>={'assessoria-estrategica':'People Advisory recorrente','cali-build':'Estruturação assistida de RH','mentoria-rh':'Desenvolvimento para profissionais de RH','diagnostico-executivo':'Diagnóstico executivo de People','cultura-direcao':'Cultura e direção organizacional','shadowing-lideranca':'Desenvolvimento aplicado de liderança',treinamentos:'Treinamentos e experiências de aprendizagem','marca-empregadora':'Marca empregadora e experiência','solucao-personalizada':'Solução desenhada sob medida'};return map[slug]||portalServiceLabel(slug)}
function quadrantClass(v:string){const x=present(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(x.includes('embrionario'))return'embrionario';if(x.includes('fragil'))return'fragil';if(x.includes('estruturacao'))return'estruturacao';if(x.includes('estrategico'))return'estrategico';return'neutro'}
function cleanRecurringPaymentNote(v:string | null | undefined){const x=present(v).trim();if(!x)return'';if(/implantacao\s*\(1.?\s*cobranca\)|50%\s*na assinatura|pagamentos recorrentes.*2.?\s*mes/i.test(x.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return'';return x}
function Page({proposal,index,total,className='',darkHeader=false,minimalFooter=false,children}:{proposal:FullProposal;index:number;total:number;className?:string;darkHeader?:boolean;minimalFooter?:boolean;children:ReactNode}){const validity=new Date(proposal.updated_at||proposal.created_at);validity.setDate(validity.getDate()+Number(proposal.validity_days||15));return <article className={`portal-proposal-page proposal-v3 ${className}`}><span className="proposal-watermark proposal-watermark-lime" aria-hidden="true"/><span className="proposal-watermark proposal-watermark-oak" aria-hidden="true"/><header className={darkHeader?'dark':''}><img src={darkHeader?CALI_LOGO_LIGHT:CALI_LOGO} alt="CALI — HR for Business"/><div><strong>{proposal.submission.protocol}</strong><span>{date(proposal.updated_at||proposal.created_at)} · válida até {date(validity.toISOString())}</span></div></header><main>{children}</main><footer className={minimalFooter?'minimal':''}>{!minimalFooter&&<span>Patrícia Lima · CALI RH · patricia@calirh.com</span>}<span>{String(index).padStart(2,'0')} / {String(total).padStart(2,'0')}</span></footer></article>}

export function GeneratedProposalPreview(){
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
 const{proposalId=''}=useParams();const navigate=useNavigate();const[proposal,setProposal]=useState<FullProposal|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[sendOpen,setSendOpen]=useState(false),[sending,setSending]=useState(false),[note,setNote]=useState(''),[file,setFile]=useState<File|null>(null),[sentMessage,setSentMessage]=useState('');
 useEffect(()=>{void(async()=>{setLoading(true);setError('');try{const data=await loadPortalProposal(proposalId);if(!data)throw new Error('Proposta não encontrada.');setProposal(data)}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a proposta.')}finally{setLoading(false)}})()},[proposalId]);
 function print(){if(!proposal)return;const old=document.title;document.title=filename(proposal).replace(/\.pdf$/i,'');window.print();window.setTimeout(()=>{document.title=old},700)}
 async function send() {
   if (!proposal || sending || !['aprovada', 'enviada'].includes(proposal.status)) return;
   const attachment = proposal.pdf_path ? null : file;
   if (!proposal.pdf_path && !attachment) return;
   if (attachment && attachment.size > 8 * 1024 * 1024) return setError('O PDF ultrapassa 8 MB.');
   const recipientEmail = proposal.submission.contact_email.trim();
   if (!recipientEmail.includes('@')) return setError('Confira o e-mail do contato no briefing.');
   const fileIdentity = attachment && [attachment.name, attachment.size, attachment.lastModified];
   const requestId = await confirmDelivery([recipientEmail], [proposal.id, proposal.version, proposal.pdf_path, fileIdentity, note]);
   if (!requestId) return;
   setSending(true);
   setError('');
   setSentMessage('');
   try {
     const result = await sendPortalProposal({
       proposal_id: proposal.id,
       request_id: requestId,
       version: proposal.version,
       pdf_base64: attachment ? await fileBase64(attachment) : undefined,
       pdf_name: attachment?.name,
       note,
       recipient_email: recipientEmail,
     });
     completeDelivery();
     setSentMessage(`Proposta enviada para ${result.to || recipientEmail} ✓`);
     const refreshed = await loadPortalProposal(proposal.id).catch(() => null);
     setProposal((current) => current?.id === proposal.id ? refreshed ?? {
       ...current, status: 'enviada', sent_at: current.sent_at ?? new Date().toISOString(),
     } : current);
   } catch (reason) {
     setError(reason instanceof Error ? reason.message : 'Falha no envio.');
   } finally {
     setSending(false);
   }
 }
 async function refreshAfterReview() {
   if (!proposal) return;
   try {
     const refreshed = await loadPortalProposal(proposal.id);
     if (!refreshed) throw new Error('Proposta não encontrada.');
     setProposal(current => current?.id === refreshed.id ? refreshed : current);
   } catch (reason) {
     setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a proposta.');
   }
 }
 async function approve(){
   if(!proposal||sending||proposal.status!=='rascunho')return;
   setSending(true);setError('');
   try{
     const saved=await updatePortalProposal(proposal.id,{status:'aprovada'});
     if(!saved)throw new Error('Não foi possível aprovar a proposta.');
     setProposal({...proposal,status:saved.status});
   }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível aprovar a proposta.');}
   finally{setSending(false);}
 }
 if(loading)return <DocumentShell><section className="page"><DocumentPanel as="div" padding="loading" className="portal-admin-loading tw:flex tw:items-center tw:justify-center tw:gap-2.5 tw:text-center! tw:text-[color:var(--muted,#756b6d)]"><Loader2 className="tw:motion-safe:animate-[spin_.8s_linear_infinite]"/>Carregando proposta…</DocumentPanel></section></DocumentShell>;
 if(!proposal)return <DocumentShell><section className="page"><InlineNotice tone="danger">{error||'Proposta não encontrada.'}</InlineNotice></section></DocumentShell>;

 const calc=proposal.calculator_data||{},packageInfo=(PACKAGE_META[proposal.service_slug]||[]).find(x=>x.code===proposal.package_code),hours=Number(calc.monthlyHours||packageInfo?.suggestedHours||0),months=Math.max(Number(proposal.contract_months||1),Number(packageInfo?.minimumMonths||1)),profile=getProposalProfile(proposal.service_slug,proposal.package_code,proposal.submission.answers||{},months,hours),scope=scopeGroups(proposal.scope_items),cycles=Array.isArray(calc.cycles)?calc.cycles.map(x => typeof x === 'string' ? { title: present(x), focus: '', objective: '', duration: '' } : { title: present(x.title), focus: present(x.focus), objective: present(x.objective), duration: present(x.duration) }):[],roadmap=list(calc.roadmapItems),out=list(calc.outOfScope),pain=list(calc.painPoints),results=list(calc.expectedResults),advantages=list(calc.advantages),cadence=list(calc.cadence),cali=list(calc.caliResponsibilities),client=list(calc.clientResponsibilities),map=calc.mapaPeople,paymentConditionsList=paymentConditions(proposal),bonus=calc.bonus||null,monthly=Boolean(calc.monthly||proposal.service_slug==='assessoria-estrategica'||proposal.service_slug==='cali-build'||(proposal.service_slug==='marca-empregadora'&&proposal.package_code==='RECORRENTE')),nextSteps=(monthly?[['Avaliação e aprovação da proposta','Confirmação do escopo, investimento e condições desta versão.'],['Assinatura + pagamento da Ativação','Formalização do contrato e pagamento da Ativação para abertura da operação CALI.'],['Kickoff','Reunião de início para organizar insumos, responsáveis e o primeiro ciclo.']]:(Array.isArray(calc.nextSteps)&&calc.nextSteps.length?calc.nextSteps:profile.nextSteps)).map((x): [string, string] => [present(x[0]), present(x[1])]),firstName=proposal.submission.contact_name.trim().split(/\s+/)[0]||'Olá',reference=Number(proposal.subtotal||proposal.final_unit||0),discount=Math.max(0,reference-Number(proposal.final_unit||0)),commercial=unique((proposal.service_slug==='assessoria-estrategica'||proposal.service_slug==='cali-build'||(proposal.service_slug==='marca-empregadora'&&proposal.package_code==='RECORRENTE'))?[...(profile.commercial||[]),`Mensalidades pagas antecipadamente, com vencimento no ${present(calc.payment?.monthlyDue)||'1º dia útil de cada mês'}.`]:(list(calc.commercialConditions).length?list(calc.commercialConditions):profile.commercial||[])),operating=unique([...(profile.operating||[]).map(present),...cadence]),companyName=proposal.submission.company_name||'Sua empresa',solutionCopy=proposal.public_notes||profile.solutionCopy,solutionTagline=present(calc.solutionTagline)||descriptor(proposal.service_slug),contextParagraphs=paragraphs(calc.contextSummary||'Contexto em revisão.',3),readingParagraphs=paragraphs(calc.executiveReading||'',2),solutionParagraphs=paragraphs(solutionCopy||'',2),whats=`https://wa.me/5541987791933?text=${encodeURIComponent(`Olá, Pati! Aqui é ${proposal.submission.contact_name||''}, da ${proposal.submission.company_name||''}. Analisei a proposta ${packageInfo?.label||proposal.package_code} (${proposal.submission.protocol}) e gostaria de conversar sobre ela.`)}`,activationPct=Number(calc.payment?.activationPct??20),activationValue=Number(proposal.final_unit||0)*activationPct/100,paymentNote=monthly?cleanRecurringPaymentNote(proposal.payment_terms):present(proposal.payment_terms),commercialWithPayment=unique([...commercial,...paymentConditionsList,...(paymentNote?[paymentNote]:[])]),total=monthly?6:5;
 const sendingAgain = proposal.status === 'enviada';
 const deliverable = proposal.status === 'aprovada' || sendingAgain;
 const operatingClean=operating.filter(x=>!/carga mensal contratada|\b\d+\s*horas\b|contrato mínimo|mensalidade remunera|atuação 100% online|passagens|hospedagem|alimentação|deslocamentos/i.test(x)).slice(0,4);
 const roadmapOrCycles=roadmap.length?roadmap:cycles.map(x=>[x.title,x.focus].filter(Boolean).join(' — ')).filter(Boolean);

 return <DocumentShell><section className="page portal-proposal-preview tw:mx-auto tw:max-w-[93.75rem] tw:pb-20 tw:[&_.inline-notice]:rounded-[0.4375rem]! tw:[&_.inline-notice]:text-xs!"><header className="portal-proposal-preview-toolbar tw:mb-[1.125rem] tw:grid tw:grid-cols-[auto_1fr_auto] tw:items-center tw:gap-4 tw:max-[1000px]:grid-cols-1 tw:print:hidden!"><DocumentAction variant="secondary" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><ArrowLeft size={16}/>Editar proposta</DocumentAction><div><strong className="tw:block">Prévia da proposta · modelo editorial</strong><span className="tw:mt-[0.1875rem] tw:block tw:text-[0.6875rem] tw:text-[color:var(--muted,#756b6d)]">Confira as {total===6?'seis':'cinco'} páginas A4 antes de salvar e enviar.</span></div><div className="tw:flex tw:gap-2 tw:max-[1000px]:flex-wrap"><DocumentAction variant="secondary" onClick={print}><Printer size={16}/>Salvar PDF</DocumentAction>{proposal.status==='rascunho'&&<DocumentAction variant="primary" disabled={sending} onClick={()=>void approve()}>Aprovar proposta</DocumentAction>}{deliverable&&<DocumentAction variant="primary" disabled={sending} onClick={()=>{setError('');setSentMessage('');setSendOpen(true)}}><Mail size={16}/>{sendingAgain ? 'Reenviar por e-mail' : 'Enviar por e-mail'}</DocumentAction>}</div></header>{proposal.status==='rascunho'&&<div className="tw:print:hidden!"><AdminMaterialReview kind="proposal" entityId={proposal.id} onApproved={refreshAfterReview} /></div>}{error&&<InlineNotice tone="danger" className="tw:print:hidden!">{error}</InlineNotice>}{proposal.status==='enviada'&&proposal.sent_at&&<InlineNotice className="tw:print:hidden!">Versão enviada em {date(proposal.sent_at)}. Uma nova edição criará outra versão sem alterar esta.</InlineNotice>}<div className="portal-proposal-document tw:grid tw:grid-cols-[minmax(0,1fr)] tw:justify-items-center tw:gap-7">

 <Page proposal={proposal} index={1} total={total} className="proposal-cover" darkHeader>
   <div className="proposal-cover-band">
     <div className="proposal-kicker light">Proposta CALI RH</div>
     <h1>Olá, {firstName}.</h1>
     <p className="cover-recipient">Preparamos esta proposta para <strong>{companyName}</strong>, a partir do contexto compartilhado no briefing.</p>
     <div className="cover-service">
       <span>{descriptor(proposal.service_slug)}</span>
       <strong>{packageInfo?.label||portalServiceLabel(proposal.service_slug)}</strong>
     </div>
   </div>
   <section className="proposal-context-block">
     <div className="section-heading compact"><span>01</span><div><small>Leitura do contexto</small><h2>O que entendemos até aqui</h2></div></div>
     <div className="editorial-copy">{withKeys(contextParagraphs).map(({ item: x, key })=><p key={key}>{x}</p>)}</div>
   </section>
   {pain.length>0&&<section className="context-signals"><span>Sinais que orientam esta proposta</span><div>{withKeys(pain.slice(0,4)).map(({ item: x, key })=><b key={key}>{x}</b>)}</div></section>}
   <div className="cover-bottom-grid single">
     {map?.include&&Number(map.score)>0&&<aside className={`map-result editorial quadrant-${quadrantClass(map.quadrant)}`}><span>Mapa de People</span><strong>{Number(map.score).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}<small>/10</small></strong><b>{map.quadrant}</b></aside>}
     <aside className="proposal-note"><span>Leitura CALI</span>{readingParagraphs.length?withKeys(readingParagraphs).map(({ item: x, key })=><p key={key}>{x}</p>):<p>A proposta foi organizada a partir do briefing, da capacidade interna e do resultado esperado para este ciclo.</p>}</aside>
   </div>
 </Page>

 <Page proposal={proposal} index={2} total={total} className="proposal-solution">
   <div className="solution-service-card">
     <span className="solution-service-mark" aria-hidden="true"/>
     <div className="solution-service-number">02</div>
     <div className="solution-service-copy"><small>Solução recomendada</small><h1>{packageInfo?.label||proposal.package_code}</h1>{solutionTagline&&<p>{solutionTagline}</p>}</div>
   </div>
   <div className="solution-statement">{withKeys(solutionParagraphs).map(({ item: x, key })=><p key={key}>{x}</p>)}</div>
   <div className="solution-grid editorial">
     <section><span>Por que agora</span><p>{present(calc.whyNow)||'O momento pede clareza de prioridade, método e uma sequência de execução que preserve a capacidade interna.'}</p></section>
     <section><span>Objetivo deste ciclo</span><p>{present(calc.cycleObjective)||'Transformar a prioridade central em um movimento claro, aplicável e sustentável.'}</p></section>
   </div>
   {results.length>0&&<section className="outcome-section"><div className="subheading"><small>Resultado esperado</small><h2>O que deve estar diferente ao final</h2></div><div className="outcome-grid">{withKeys(results.slice(0,4)).map(({ item: x, key }, i)=><div key={key}><span>0{i+1}</span><p>{x}</p></div>)}</div></section>}
   {advantages.length>0&&<section className="why-cali"><div className="subheading"><small>Valor agregado</small><h2>Por que a CALI neste contexto</h2></div><div className="advantage-grid editorial">{withKeys(advantages.slice(0,4)).map(({ item: x, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></div>)}</div></section>}
 </Page>

 <Page proposal={proposal} index={3} total={total} className="proposal-delivery">
   <div className="section-heading"><span>03</span><div><small>Escopo contratado</small><h1>O que entra neste trabalho</h1><p>O escopo abaixo traduz a prioridade desta versão em entregas claras, sem misturar o que pertence a etapas futuras.</p></div></div>
   <section className="scope-section"><ol className="scope-list editorial">{withKeys(scope, group => JSON.stringify([group.text, group.subitems])).map(({ item: x, key })=><li key={key}><span>{String(x.number).padStart(2,'0')}</span><div><strong>{x.text}</strong>{x.subitems.length>0&&<ul>{withKeys(x.subitems).map(({ item: s, key })=><li key={key}>{s}</li>)}</ul>}</div></li>)}</ol></section>
   {operatingClean.length>0&&<section className="operating-section"><div className="subheading"><small>Ritmo e formato</small><h2>Como a operação acontece</h2></div><div className="operating-cards">{withKeys(operatingClean).map(({ item: x, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></div>)}</div></section>}
   {cycles.length>0&&<section className="cycle-section"><div className="subheading"><small>Sequência prevista</small><h2>Ciclos e fases</h2></div><div className="cycle-list editorial">{withKeys(cycles.slice(0,6), cycle => JSON.stringify(cycle)).map(({ item: c, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong>{c.duration&&<small>{c.duration}</small>}{c.focus&&<p>{c.focus}</p>}</div></div>)}</div></section>}
 </Page>

 <Page proposal={proposal} index={4} total={total} className="proposal-governance">
   <div className="section-heading"><span>04</span><div><small>Governança do trabalho</small><h1>Responsabilidades, continuidade e limites</h1><p>Uma boa proposta também deixa claro quem conduz cada parte, o que depende da empresa e o que não está incluído nesta contratação.</p></div></div>
   <section className="responsibility-section"><div className="subheading"><small>Responsabilidades</small><h2>Quem faz o quê</h2></div><div className="responsibility-grid editorial"><div><span>A CALI conduz</span><ul>{withKeys(cali).map(({ item: x, key })=><li key={key}>{x}</li>)}</ul></div><div><span>A empresa viabiliza</span><ul>{withKeys(client).map(({ item: x, key })=><li key={key}>{x}</li>)}</ul></div></div></section>
   {roadmapOrCycles.length>0&&<section className="roadmap-editorial"><div className="subheading"><small>Continuidade</small><h2>O que fica organizado para depois</h2></div><div className="roadmap-list">{withKeys(roadmapOrCycles.slice(0,5)).map(({ item: x, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><p>{present(x)}</p></div>)}</div></section>}
   {out.length>0&&<section className="limits-editorial"><div className="subheading"><small>Limites desta proposta</small><h2>O que não está incluído</h2></div><ul>{withKeys(out.slice(0,5)).map(({ item: x, key })=><li key={key}>{x}</li>)}</ul></section>}
 </Page>

 <Page proposal={proposal} index={5} total={total} className="proposal-commercial">
   <div className="section-heading"><span>05</span><div><small>Condições comerciais</small><h1>{monthly?'Investimento e condições':'Investimento e próximos passos'}</h1><p>O desenho comercial abaixo corresponde ao escopo, à capacidade reservada e ao prazo desta versão.</p></div></div>
   <section className="investment-card">
     <div className="investment-main"><span>{monthly?'Mensalidade':'Investimento'}</span><strong>{money(proposal.final_unit)}</strong>{monthly&&<small>por mês</small>}</div>
     {discount>0&&<div className="investment-meta">
       <div><span>Referência</span><strong>{money(reference)}</strong></div>
       <div><span>{present(calc.discountType)||'Condição aplicada'}</span><strong>− {money(discount)}</strong>{calc.discountDescription&&<small>{present(calc.discountDescription)}</small>}</div>
     </div>}
   </section>
   {monthly&&<section className="activation-card editorial"><div><span>Ativação · {activationPct.toLocaleString('pt-BR',{maximumFractionDigits:2})}%</span><strong>{money(activationValue)}</strong></div><p>Inclui a preparação para o início da operação: organização de insumos e acessos, configuração da dinâmica de trabalho, planejamento do primeiro ciclo e preparação do kickoff. É uma cobrança única na assinatura, separada das mensalidades, não abatida e não reembolsável.</p></section>}
   <div className="commercial-facts editorial">{hours>0&&<div><span>Capacidade</span><strong>{monthly?`Até ${hours}h/mês`:`${hours}h previstas`}</strong></div>}<div><span>{monthly?'Prazo mínimo':'Duração prevista'}</span><strong>{months} {months===1?'mês':'meses'}</strong></div><div><span>Natureza</span><strong>{monthly?'Atuação recorrente':'Projeto com início e fim'}</strong></div></div>
   <div className="commercial-columns commercial-conditions-only"><section><div className="subheading"><small>Condições importantes</small><h2>Para esta contratação</h2></div><ul className="commercial-conditions">{withKeys(commercialWithPayment.slice(0,8)).map(({ item: x, key })=><li key={key}>{x}</li>)}</ul></section></div>
   {!monthly&&<><section className="next-section"><div className="subheading"><small>Próximos passos</small><h2>Próximos passos</h2></div><div className="next-steps editorial">{withKeys(nextSteps.slice(0,3), step => JSON.stringify(step)).map(({ item: s, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s[0]}</strong><p>{s[1]}</p></div></div>)}</div></section><div className="proposal-signature editorial"><div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div><a href={whats} target="_blank" rel="noreferrer">Vamos conversar sobre a proposta?</a></div></>}
 </Page>
 {monthly&&<Page proposal={proposal} index={6} total={total} className="proposal-next" minimalFooter>
   <div className="section-heading"><span>06</span><div><h1>Próximos passos</h1><p>Uma sequência simples para transformar a proposta aprovada em início de operação.</p></div></div>
   <div className="next-steps next-steps-final editorial">{withKeys(nextSteps.slice(0,3), step => JSON.stringify(step)).map(({ item: s, key }, i)=><div key={key}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s[0]}</strong><p>{s[1]}</p></div></div>)}</div>
   {bonus?.title&&<aside className="bonus bonus-final editorial"><span>Bônus selecionado</span><strong>{present(bonus.title)}</strong><p>{present(bonus.description)}</p></aside>}
   <div className="proposal-signature proposal-signature-final editorial"><div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div><a href={whats} target="_blank" rel="noreferrer">Vamos conversar sobre a proposta?</a></div>
 </Page>}

 </div>{sendOpen&&<><button className="portal-send-backdrop tw:print:hidden! tw:fixed tw:inset-0 tw:z-120 tw:border-0 tw:bg-[#28191c57] tw:backdrop-blur-[0.125rem]" onClick={()=>setSendOpen(false)} aria-label="Fechar"/><aside className="portal-send-drawer tw:print:hidden! tw:fixed tw:top-0 tw:right-0 tw:z-121 tw:flex tw:h-screen tw:w-[min(38.75rem,95vw)]
   tw:flex-col tw:bg-[var(--surface,#fff)] tw:shadow-[-1.125rem_0_3.4375rem_#28161a2e]"><header className="tw:flex tw:justify-between tw:gap-[1.125rem] tw:bg-cali-brand tw:px-[1.625rem] tw:py-6 tw:text-white"><div><span className="eyebrow tw:text-xs/[1.4]! tw:font-bold tw:tracking-[0.14em] tw:text-[#ddbb7f]">ENVIO APROVADO</span><h2 className="tw:mx-0 tw:my-1 tw:text-[1.6875rem] tw:text-white">{sendingAgain ? 'Reenviar proposta' : 'Enviar proposta'}</h2><p className="tw:m-0 tw:text-cali-small/[1.55]! tw:text-[#ead9d1]">{portalServiceLabel(proposal.service_slug)} · {proposal.submission.protocol}</p></div><button type="button" className="icon-button tw:relative tw:grid tw:size-11 tw:place-items-center tw:rounded-xl tw:border tw:border-solid
   tw:border-[#5a1e2d1a] tw:bg-white/72 tw:text-[var(--graphite)] tw:shadow-[0_0.3125rem_1.125rem_#311f1909]
   tw:[transition:background_.22s_ease,color_.22s_ease,border-color_.22s_ease,box-shadow_.22s_ease,transform_.18s_ease]
   tw:hover:-translate-y-px tw:hover:bg-white tw:hover:shadow-[0_0.5625rem_1.5rem_#311f1912] tw:motion-reduce:transition-none
   tw:workspace-night:border-cali-line tw:workspace-night:bg-[#241b1f] tw:workspace-night:text-cali-text
   tw:workspace-night:shadow-[0_0.4375rem_1.25rem_#00000021] tw:workspace-night:hover:bg-[#2c2126]" aria-label="Fechar envio da proposta" onClick={()=>setSendOpen(false)}><X/></button></header><div className="portal-send-scroll tw:flex-1 tw:overflow-auto tw:p-5"><section className="tw:mb-3 tw:rounded-xl tw:border tw:border-solid tw:border-[color:var(--line,#e8dfda)] tw:p-[1.125rem]">{proposal.pdf_path ? <><h3 className="tw:mx-0 tw:mt-0 tw:mb-2.5 tw:text-cali-brand">1. PDF oficial</h3><p className="tw:text-cali-small/[1.55]!">O envio usa o PDF arquivado da versão {proposal.version}.</p></> : <><h3 className="tw:mx-0 tw:mt-0 tw:mb-2.5 tw:text-cali-brand">1. Salve o PDF</h3><p className="tw:text-cali-small/[1.55]!">Use “Salvar PDF”. O nome sugerido é <strong>{filename(proposal)}</strong>.</p></>}</section><section className="tw:mb-3 tw:rounded-xl tw:border tw:border-solid tw:border-[color:var(--line,#e8dfda)] tw:p-[1.125rem]"><h3 className="tw:mx-0 tw:mt-0 tw:mb-2.5 tw:text-cali-brand">2. Confirme o destinatário</h3><p className="tw:text-cali-small/[1.55]!"><strong>{proposal.submission.contact_name}</strong> · {proposal.submission.contact_email}</p><p className="tw:text-cali-small/[1.55]!">Para mudar o destinatário, atualize o contato no briefing.</p></section><section className="tw:mb-3 tw:rounded-xl tw:border tw:border-solid tw:border-[color:var(--line,#e8dfda)] tw:p-[1.125rem]"><h3 className="tw:mx-0 tw:mt-0 tw:mb-2.5 tw:text-cali-brand">{proposal.pdf_path ? "3. Confirme o envio" : "3. Anexe e envie"}</h3>{!proposal.pdf_path&&<label className="tw:mx-0 tw:my-3 tw:block tw:text-cali-small! tw:font-bold">Proposta final em PDF<input className="tw:mt-1.5 tw:block tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[color:var(--line,#ded5d0)]
   tw:bg-[var(--surface,#fff)] tw:p-2.5 tw:text-inherit" type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>}<label className="tw:mx-0 tw:my-3 tw:block tw:text-cali-small! tw:font-bold">Mensagem pessoal adicional<textarea className="tw:mt-1.5 tw:block tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[color:var(--line,#ded5d0)]
   tw:bg-[var(--surface,#fff)] tw:p-2.5 tw:text-inherit" rows={5} value={note} onChange={e=>setNote(e.target.value)}/></label>{sentMessage&&<InlineNotice>{sentMessage}</InlineNotice>}{error&&<InlineNotice tone="danger" className="tw:print:hidden!">{error}</InlineNotice>}</section></div><footer className="tw:border-0 tw:border-t tw:border-solid tw:border-[color:var(--line,#e8dfda)] tw:px-5 tw:py-3.5"><DocumentAction className="tw:flex tw:w-full tw:items-center tw:justify-center tw:gap-2" variant="primary" disabled={(!proposal.pdf_path&&!file)||sending||!proposal.submission.contact_email.includes('@')} onClick={()=>void send()}>{sending ? 'Enviando…' : sendingAgain ? 'Confirmar e reenviar' : 'Confirmar e enviar'}</DocumentAction></footer></aside></>}</section></DocumentShell>
}
