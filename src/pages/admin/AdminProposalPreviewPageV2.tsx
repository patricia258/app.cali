import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Loader2, Mail, Printer, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../../components/WorkspaceShell';
import { loadPortalProposal, portalServiceLabel, sendPortalProposal, type PortalProposal, type PortalSubmission } from '../../lib/portalAdminApi';
import { PACKAGE_META } from '../../lib/portalProposalConfig';
import { getProposalProfile } from '../../lib/portalProposalParity';

type FullProposal=PortalProposal&{submission:PortalSubmission};
const CALI_LOGO='https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-bordo.png';
const CALI_LOGO_LIGHT='https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-light.png';
const list=(v:any):string[]=>Array.isArray(v)?v.map(String).filter(Boolean):[];
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=(v?:string|null)=>v?new Intl.DateTimeFormat('pt-BR').format(new Date(v)):'—';
const safe=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _.-]+/g,'').replace(/\s+/g,' ').trim();
const filename=(p:FullProposal)=>safe(`Proposta CALI RH - ${portalServiceLabel(p.service_slug)} - ${p.submission.company_name||p.submission.contact_name} - ${p.submission.protocol}.pdf`);
function fileBase64(file:File){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(new Error('Não foi possível ler o PDF.'));r.readAsDataURL(file)})}
function scopeGroups(items:any[]){const groups:Array<{number:number;text:string;subitems:string[]}>=[];for(const item of items.map(String)){const isSub=/^\s*[-–—]\s*/.test(item),text=item.replace(/^\s*[-–—]\s*/,'');if(isSub&&groups.length)groups.at(-1)!.subitems.push(text);else groups.push({number:groups.length+1,text,subitems:[]})}return groups}
function paymentRows(p:FullProposal){const calc=p.calculator_data||{},x=calc.payment||{},rows:Array<[string,string]>=[];if(x.method==='monthly')rows.push(['Forma','Mensal recorrente'],['Vencimento',x.monthlyDue||'1º dia útil de cada mês']);else if(x.method==='split'){const a=Number(x.entryPct||50),b=Number(x.finalPct||50);rows.push([`Entrada · ${a}%`,money(p.final_unit*a/100)],[`Finalização · ${b}%`,money(p.final_unit*b/100)])}else if(x.method==='pix')rows.push(['Forma','PIX à vista'],['Desconto aplicado',`${Number(x.pixDiscount||p.discount_pct||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`]);else if(x.method==='card')rows.push(['Parcelamento',`Até ${Number(x.cardInstallments||1)}x no cartão`],['Taxas',x.cardFees==='included'?'Incluídas no valor final':'Acrescidas conforme a operadora']);else rows.push(['Forma',x.customLabel||(calc.monthly?'Mensal recorrente':'Conforme cronograma acordado')]);return rows}
function paragraphs(value:string,limit=3){const raw=String(value||'').replace(/\s+/g,' ').trim();if(!raw)return[];const manual=String(value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);if(manual.length>1)return manual.slice(0,limit);const sentences=raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim()).filter(Boolean)||[raw];if(sentences.length<=1)return[raw];const buckets:string[]=[];let current='';for(const sentence of sentences){if((current+' '+sentence).trim().length>260&&current){buckets.push(current.trim());current=sentence}else current=(current+' '+sentence).trim()}if(current)buckets.push(current.trim());return buckets.slice(0,limit)}
function unique(items:string[]){return [...new Set(items.map(x=>x.trim()).filter(Boolean))]}
function Page({proposal,index,total,className='',darkHeader=false,children}:{proposal:FullProposal;index:number;total:number;className?:string;darkHeader?:boolean;children:ReactNode}){const validity=new Date(proposal.updated_at||proposal.created_at);validity.setDate(validity.getDate()+Number(proposal.validity_days||15));return <article className={`portal-proposal-page proposal-v3 ${className}`}><span className="proposal-watermark proposal-watermark-lime" aria-hidden="true"/><span className="proposal-watermark proposal-watermark-oak" aria-hidden="true"/><header className={darkHeader?'dark':''}><img src={darkHeader?CALI_LOGO_LIGHT:CALI_LOGO} alt="CALI — HR for Business"/><div><strong>{proposal.submission.protocol}</strong><span>{date(proposal.updated_at||proposal.created_at)} · válida até {date(validity.toISOString())}</span></div></header><main>{children}</main><footer><span>Patrícia Lima · CALI RH · patricia@calirh.com</span><span>{String(index).padStart(2,'0')} / {String(total).padStart(2,'0')}</span></footer></article>}

export function AdminProposalPreviewPageV2(){
 const{proposalId=''}=useParams();const navigate=useNavigate();const[proposal,setProposal]=useState<FullProposal|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[sendOpen,setSendOpen]=useState(false),[sending,setSending]=useState(false),[company,setCompany]=useState(''),[recipient,setRecipient]=useState(''),[email,setEmail]=useState(''),[note,setNote]=useState(''),[file,setFile]=useState<File|null>(null),[sentMessage,setSentMessage]=useState('');
 useEffect(()=>{void(async()=>{setLoading(true);setError('');try{const data=await loadPortalProposal(proposalId);if(!data)throw new Error('Proposta não encontrada.');setProposal(data);setCompany(data.submission.company_name||'');setRecipient(data.submission.contact_name||'');setEmail(data.submission.contact_email||'')}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a proposta.')}finally{setLoading(false)}})()},[proposalId]);
 function print(){if(!proposal)return;const old=document.title;document.title=filename(proposal).replace(/\.pdf$/i,'');window.print();window.setTimeout(()=>{document.title=old},700)}
 async function send(){if(!proposal||!file)return;if(file.size>8*1024*1024)return setError('O PDF ultrapassa 8 MB.');if(recipient.trim().length<2||!email.includes('@'))return setError('Confirme nome e e-mail do decisor.');setSending(true);setError('');setSentMessage('');try{const result=await sendPortalProposal({proposal_id:proposal.id,pdf_base64:await fileBase64(file),pdf_name:file.name,note,company_name:company.trim(),recipient_name:recipient.trim(),recipient_email:email.trim()});setSentMessage(`Proposta enviada para ${result.to||email} ✓`);setProposal(c=>c?{...c,status:'enviada',sent_at:new Date().toISOString()}:c)}catch(e){setError(e instanceof Error?e.message:'Falha no envio.')}finally{setSending(false)}}
 if(loading)return <Shell role="admin"><section className="page"><div className="panel portal-admin-loading"><Loader2 className="spin"/>Carregando proposta…</div></section></Shell>;
 if(!proposal)return <Shell role="admin"><section className="page"><div className="inline-notice danger">{error||'Proposta não encontrada.'}</div></section></Shell>;

 const calc=proposal.calculator_data||{},packageInfo=(PACKAGE_META[proposal.service_slug]||[]).find(x=>x.code===proposal.package_code),hours=Number(calc.monthlyHours||packageInfo?.suggestedHours||0),months=Number(proposal.contract_months||packageInfo?.minimumMonths||1),profile=getProposalProfile(proposal.service_slug,proposal.package_code,proposal.submission.answers||{},months,hours),scope=scopeGroups(proposal.scope_items),cycles=Array.isArray(calc.cycles)?calc.cycles:[],roadmap=list(calc.roadmapItems),out=list(calc.outOfScope),pain=list(calc.painPoints),results=list(calc.expectedResults),advantages=list(calc.advantages),cadence=list(calc.cadence),cali=list(calc.caliResponsibilities),client=list(calc.clientResponsibilities),map=calc.mapaPeople,payment=paymentRows(proposal),bonus=calc.bonus||null,nextSteps=(Array.isArray(calc.nextSteps)&&calc.nextSteps.length?calc.nextSteps:profile.nextSteps) as Array<[string,string]>,monthly=Boolean(calc.monthly||proposal.service_slug==='assessoria-estrategica'||proposal.service_slug==='cali-build'||(proposal.service_slug==='marca-empregadora'&&proposal.package_code==='RECORRENTE')),firstName=proposal.submission.contact_name.trim().split(/\s+/)[0]||'Olá',reference=Number(proposal.subtotal||proposal.final_unit||0),discount=Math.max(0,reference-Number(proposal.final_unit||0)),commercial=unique(list(calc.commercialConditions).length?list(calc.commercialConditions):profile.commercial||[]),operating=unique([...(profile.operating||[]),...cadence]),companyName=proposal.submission.company_name||'Sua empresa',solutionCopy=proposal.public_notes||profile.solutionCopy,contextParagraphs=paragraphs(calc.contextSummary||'Contexto em revisão.',3),readingParagraphs=paragraphs(calc.executiveReading||'',2),solutionParagraphs=paragraphs(solutionCopy||'',2),whats=`https://wa.me/5541987791933?text=${encodeURIComponent(`Olá, Pati! Aqui é ${proposal.submission.contact_name||''}, da ${proposal.submission.company_name||''}. Analisei a proposta ${packageInfo?.label||proposal.package_code} (${proposal.submission.protocol}) e gostaria de conversar sobre ela.`)}`,total=4;
 const scopeDense=scope.length+cycles.length>9;

 return <Shell role="admin"><section className="page portal-proposal-preview"><header className="portal-proposal-preview-toolbar"><button className="secondary" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><ArrowLeft size={16}/>Editar proposta</button><div><strong>Prévia da proposta · novo modelo</strong><span>Confira o documento em A4 antes de salvar e enviar.</span></div><div><button className="secondary" onClick={print}><Printer size={16}/>Salvar PDF</button><button className="primary" onClick={()=>setSendOpen(true)}><Mail size={16}/>Enviar por e-mail</button></div></header>{error&&<div className="inline-notice danger">{error}</div>}{proposal.status==='enviada'&&proposal.sent_at&&<div className="inline-notice">Versão enviada em {date(proposal.sent_at)}. Uma nova edição criará outra versão sem alterar esta.</div>}<div className="portal-proposal-document">

 <Page proposal={proposal} index={1} total={total} className="proposal-cover" darkHeader>
   <div className="proposal-cover-band">
     <div className="proposal-kicker light">Proposta preparada para</div>
     <h1>{companyName}</h1>
     <p className="cover-recipient">Aos cuidados de <strong>{proposal.submission.contact_name}</strong>{proposal.submission.contact_role?<> · {proposal.submission.contact_role}</>:null}</p>
     <div className="cover-service">
       <span>{portalServiceLabel(proposal.service_slug)}</span>
       <strong>{packageInfo?.label||proposal.package_code}</strong>
     </div>
   </div>
   <section className="proposal-context-block">
     <div className="section-heading compact"><span>01</span><div><small>Leitura do contexto</small><h2>O ponto de partida</h2></div></div>
     <div className="editorial-copy">{contextParagraphs.map((x,i)=><p key={i}>{x}</p>)}</div>
   </section>
   <div className="proposal-fact-row">
     <div><span>Modelo</span><strong>{monthly?'Atuação recorrente':'Projeto estruturado'}</strong></div>
     {hours>0&&<div><span>Capacidade</span><strong>{monthly?`Até ${hours}h por mês`:`${hours}h previstas`}</strong></div>}
     <div><span>{monthly?'Prazo mínimo':'Duração prevista'}</span><strong>{months} {months===1?'mês':'meses'}</strong></div>
   </div>
   {pain.length>0&&<section className="context-signals"><span>Prioridades percebidas</span><div>{pain.slice(0,4).map((x,i)=><b key={i}>{x}</b>)}</div></section>}
   <div className="cover-bottom-grid">
     {map?.include&&Number(map.score)>0?<aside className="map-result editorial"><span>Mapa de People</span><strong>{Number(map.score).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}<small>/10</small></strong><b>{map.quadrant}</b></aside>:<aside className="proposal-note"><span>Leitura CALI</span>{readingParagraphs.length?readingParagraphs.map((x,i)=><p key={i}>{x}</p>):<p>A proposta foi organizada a partir do briefing, da capacidade interna e do resultado esperado para este ciclo.</p>}</aside>}
     {map?.include&&Number(map.score)>0&&<aside className="proposal-note"><span>Leitura CALI</span>{readingParagraphs.map((x,i)=><p key={i}>{x}</p>)}</aside>}
   </div>
 </Page>

 <Page proposal={proposal} index={2} total={total} className="proposal-solution">
   <div className="section-heading"><span>02</span><div><small>Solução recomendada</small><h1>{packageInfo?.label||proposal.package_code}</h1><p>{portalServiceLabel(proposal.service_slug)}</p></div></div>
   <div className="solution-statement">{solutionParagraphs.map((x,i)=><p key={i}>{x}</p>)}</div>
   <div className="solution-grid editorial">
     <section><span>Por que agora</span><p>{calc.whyNow||'O momento pede clareza de prioridade, método e uma sequência de execução que preserve a capacidade interna.'}</p></section>
     <section><span>Objetivo deste ciclo</span><p>{calc.cycleObjective||'Transformar a prioridade central em um movimento claro, aplicável e sustentável.'}</p></section>
   </div>
   {results.length>0&&<section className="outcome-section"><div className="subheading"><small>Resultado esperado</small><h2>O que deve estar diferente ao final</h2></div><div className="outcome-grid">{results.slice(0,4).map((x,i)=><div key={i}><span>0{i+1}</span><p>{x}</p></div>)}</div></section>}
   {advantages.length>0&&<section className="why-cali"><div className="subheading"><small>Valor agregado</small><h2>Por que a CALI neste contexto</h2></div><div className="advantage-grid editorial">{advantages.slice(0,4).map((x,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></div>)}</div></section>}
 </Page>

 <Page proposal={proposal} index={3} total={total} className={`proposal-delivery ${scopeDense?'dense':''}`}>
   <div className="section-heading"><span>03</span><div><small>Escopo e operação</small><h1>Como o trabalho acontece</h1><p>Clareza sobre o que entra agora, como a CALI atua e o que fica sob responsabilidade da empresa.</p></div></div>
   <section className="scope-section"><div className="subheading"><small>Escopo contratado</small><h2>O que está incluído</h2></div><ol className="scope-list editorial">{scope.map(x=><li key={x.number}><span>{String(x.number).padStart(2,'0')}</span><div><strong>{x.text}</strong>{x.subitems.length>0&&<ul>{x.subitems.map((s,i)=><li key={i}>{s}</li>)}</ul>}</div></li>)}</ol></section>
   {cycles.length>0?<section className="cycle-section"><div className="subheading"><small>Sequência prevista</small><h2>Ciclos e fases</h2></div><div className="cycle-list editorial">{cycles.slice(0,6).map((c:any,i:number)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong>{c.duration&&<small>{c.duration}</small>}{c.focus&&<p>{c.focus}</p>}</div></div>)}</div></section>:operating.length>0&&<section className="operating-section"><div className="subheading"><small>Ritmo do trabalho</small><h2>Cadência e formato</h2></div><ul className="clean-list">{operating.slice(0,4).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
   <section className="responsibility-section"><div className="subheading"><small>Responsabilidades</small><h2>Quem faz o quê</h2></div><div className="responsibility-grid editorial"><div><span>A CALI conduz</span><ul>{cali.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><span>A empresa viabiliza</span><ul>{client.map((x,i)=><li key={i}>{x}</li>)}</ul></div></div></section>
   {out.length>0&&<section className="limits-inline"><span>Fora do escopo</span><ul>{out.slice(0,4).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
 </Page>

 <Page proposal={proposal} index={4} total={total} className="proposal-commercial">
   <div className="section-heading"><span>04</span><div><small>Condições comerciais</small><h1>Investimento e decisão</h1><p>O desenho comercial abaixo corresponde ao escopo e à capacidade previstos nesta versão.</p></div></div>
   <section className="investment-card">
     <div className="investment-top">
       <div><span>{monthly?'Mensalidade':'Investimento'}</span><strong>{money(proposal.final_unit)}</strong>{monthly&&<small>por mês</small>}</div>
       {discount>0&&<div className="investment-saving"><span>{calc.discountType||'Condição comercial'}</span><strong>− {money(discount)}</strong>{calc.discountDescription&&<small>{calc.discountDescription}</small>}</div>}
     </div>
     <div className="investment-reference"><span>Referência</span><strong>{money(reference)}</strong></div>
   </section>
   <div className="commercial-facts editorial">{hours>0&&<div><span>Capacidade</span><strong>{monthly?`Até ${hours}h/mês`:`${hours}h previstas`}</strong></div>}<div><span>{monthly?'Prazo mínimo':'Duração prevista'}</span><strong>{months} {months===1?'mês':'meses'}</strong></div><div><span>Natureza</span><strong>{monthly?'Atuação recorrente':'Projeto com início e fim'}</strong></div></div>
   <div className="commercial-columns">
     <section><div className="subheading"><small>Pagamento</small><h2>Como funciona</h2></div><div className="payment-grid editorial">{payment.map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>{proposal.payment_terms&&<p className="small-note">{proposal.payment_terms}</p>}{bonus?.title&&<aside className="bonus editorial"><span>Bônus selecionado</span><strong>{bonus.title}</strong><p>{bonus.description}</p></aside>}</section>
     <section><div className="subheading"><small>Condições importantes</small><h2>Para esta contratação</h2></div><ul className="commercial-conditions">{commercial.slice(0,5).map((x,i)=><li key={i}>{x}</li>)}</ul></section>
   </div>
   <section className="next-section"><div className="subheading"><small>Próximos passos</small><h2>Se fizer sentido para vocês</h2></div><div className="next-steps editorial">{nextSteps.slice(0,3).map((s,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s[0]}</strong><p>{s[1]}</p></div></div>)}</div></section>
   <div className="proposal-signature editorial"><div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div><a href={whats} target="_blank" rel="noreferrer">Vamos conversar sobre a proposta?</a></div>
 </Page>

 </div>{sendOpen&&<><button className="portal-send-backdrop" onClick={()=>setSendOpen(false)} aria-label="Fechar"/><aside className="portal-send-drawer"><header><div><span className="eyebrow">ENVIO APROVADO</span><h2>Enviar proposta</h2><p>{portalServiceLabel(proposal.service_slug)} · {proposal.submission.protocol}</p></div><button className="icon-button" onClick={()=>setSendOpen(false)}><X/></button></header><div className="portal-send-scroll"><section><h3>1. Salve o PDF</h3><p>Use “Salvar PDF”. O nome sugerido é <strong>{filename(proposal)}</strong>.</p></section><section><h3>2. Confirme o destinatário</h3><label>Empresa<input value={company} onChange={e=>setCompany(e.target.value)}/></label><label>Nome do decisor<input value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label>E-mail de envio<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label></section><section><h3>3. Anexe e envie</h3><label>Proposta final em PDF<input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>Mensagem pessoal adicional<textarea rows={5} value={note} onChange={e=>setNote(e.target.value)}/></label>{sentMessage&&<div className="inline-notice">{sentMessage}</div>}{error&&<div className="inline-notice danger">{error}</div>}</section></div><footer><button className="primary" disabled={!file||sending||recipient.trim().length<2||!email.includes('@')} onClick={()=>void send()}>{sending?'Enviando…':'Confirmar e enviar'}</button></footer></aside></>}</section></Shell>
}
