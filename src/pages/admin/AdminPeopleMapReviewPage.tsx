import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Building2, FileText, Mail, Plus, RefreshCw, Save, Send, UserRound, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import '../../people-map-review.css';

type DiagnosticoV2 = {
  version?: number;
  d1?: { processos?: number[]; estrutura?: number[]; governanca?: number[] };
  d2?: { comportamento?: number[]; valores?: { cultura_decisao?: number | null }; desenvolvimento?: number[] };
  d3?: { indicadores?: number[]; decisao?: number[]; tecnologia?: number[] };
  d4?: { tamanho?: number[]; vinculos?: { gestao?: number | null }; rotatividade?: number[] };
  qualificacao?: Record<string, string | null>;
};

type MapaRecord = {
  id: string;
  created_at: string;
  protocolo: string;
  status: string;
  c_nome: string;
  c_empresa: string;
  c_cargo: string | null;
  c_email: string;
  c_whatsapp: string;
  c_preferencia_contato: string | null;
  c_linkedin_site: string | null;
  q_prazo: string | null;
  q_decisor: string[] | null;
  q_decisor_outro: string | null;
  q_formato: string | null;
  q_investimento: string | null;
  q_origem: string | null;
  observacoes: Record<string, string> | null;
  relatorio_enviado_em: string | null;
  diagnostico_v2: DiagnosticoV2 | null;
  d1_rh_hoje: number | null;
  d1_processos: number | null;
  d1_cargos_salarios: number | null;
  d2_valores: number | null;
  d2_lideres_preparo: number | null;
  d2_comportamento_dono: number | null;
  d2_sucessao: number | null;
  d3_indicadores: number | null;
  d3_decisao: number | null;
  d3_custo: number | null;
  d4_colaboradores: number | null;
  d4_unidades: number | null;
  d4_turnover: number | null;
};

type Draft = { d1_obs:string; d2_obs:string; d3_obs:string; d4_obs:string; parecer:string; servico_recomendado:string };

const SERVICES = [
  'Diagnóstico Executivo de People',
  'Assessoria Estratégica Mensal — CALI Partner',
  'Assessoria Estratégica Mensal — CALI Full',
  'Projeto de Cultura e Direção',
  'Shadowing de Liderança',
  'Mentoria para Profissionais de RH',
  'Marca Empregadora',
  'Treinamentos & Palestras',
];
const SCALE = ['—','Muito baixo','Baixo','Médio','Alto','Muito alto'];
const REPORT_EMAIL_SUBJECT = 'Seu relatório do Mapa de People chegou 🎉 | CALI RH';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mean(values:Array<number|null|undefined>){const valid=values.filter((v):v is number=>v!=null&&Number.isFinite(Number(v))).map(Number);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
function scale10(v:number|null){return v==null?null:v*2}
function fmt(v:number|null){return v==null?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}
function formatDate(v:string|null){return v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function scoreLabel(v:number|null|undefined){return v==null?'—':`${v}/5 · ${SCALE[v]||''}`}
function normalizeStatus(v:string){return v==='em_revisao'?'em_andamento':v}
function fileToBase64(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}

function scoresFor(r:MapaRecord){
  const v2=r.diagnostico_v2;
  if(v2?.version===2&&v2.d1&&v2.d2&&v2.d3&&v2.d4){
    const d1=scale10(mean([mean(v2.d1.processos||[]),mean(v2.d1.estrutura||[]),mean(v2.d1.governanca||[])]));
    const d2=scale10(mean([mean(v2.d2.comportamento||[]),v2.d2.valores?.cultura_decisao,mean(v2.d2.desenvolvimento||[])]));
    const d3=scale10(mean([mean(v2.d3.indicadores||[]),mean(v2.d3.decisao||[]),mean(v2.d3.tecnologia||[])]));
    const d4=scale10(mean([mean(v2.d4.tamanho||[]),v2.d4.vinculos?.gestao,mean(v2.d4.rotatividade||[])]));
    const total=[d1,d2,d3,d4].every((v)=>v!=null)?Number(((d1||0)*.25+(d2||0)*.30+(d3||0)*.20+(d4||0)*.25).toFixed(1)):null;
    return{d1,d2,d3,d4,total};
  }
  const d1=scale10(mean([r.d1_rh_hoje,r.d1_processos,r.d1_cargos_salarios]));
  const d2=scale10(mean([r.d2_valores,r.d2_lideres_preparo,r.d2_comportamento_dono,r.d2_sucessao]));
  const d3=scale10(mean([r.d3_indicadores,r.d3_decisao,r.d3_custo]));
  const d4=scale10(mean([r.d4_colaboradores,r.d4_unidades,r.d4_turnover]));
  const total=[d1,d2,d3,d4].every((v)=>v!=null)?Number(((d1||0)*.25+(d2||0)*.30+(d3||0)*.20+(d4||0)*.25).toFixed(1)):null;
  return{d1,d2,d3,d4,total};
}

function rows(r:MapaRecord,dimension:1|2|3|4):Array<[string,number|null|undefined]>{
  const v2=r.diagnostico_v2;
  if(v2?.version===2){
    if(dimension===1)return[['Cargos e atribuições',v2.d1?.processos?.[0]],['Fluxos de admissão, promoção e saída',v2.d1?.processos?.[1]],['Políticas aplicadas',v2.d1?.processos?.[2]],['Hierarquia clara',v2.d1?.estrutura?.[0]],['Proporção do time de gente',v2.d1?.estrutura?.[1]],['Regras de decisão',v2.d1?.governanca?.[0]],['Registro e controle',v2.d1?.governanca?.[1]]];
    if(dimension===2)return[['Iniciativa',v2.d2?.comportamento?.[0]],['Responsabilidade por resultado',v2.d2?.comportamento?.[1]],['Postura com o negócio',v2.d2?.comportamento?.[2]],['Cultura orienta decisão',v2.d2?.valores?.cultura_decisao],['Pipeline de sucessão',v2.d2?.desenvolvimento?.[0]],['Programa de liderança',v2.d2?.desenvolvimento?.[1]],['Preparo para responsabilidades maiores',v2.d2?.desenvolvimento?.[2]]];
    if(dimension===3)return[['Indicadores existem',v2.d3?.indicadores?.[0]],['Revisão periódica',v2.d3?.indicadores?.[1]],['Decisões de gente por dados',v2.d3?.decisao?.[0]],['Referência compartilhada',v2.d3?.decisao?.[1]],['Ferramentas de RH',v2.d3?.tecnologia?.[0]],['Uso de IA no RH',v2.d3?.tecnologia?.[1]]];
    return[['Tamanho do quadro',v2.d4?.tamanho?.[0]],['Distribuição geográfica',v2.d4?.tamanho?.[1]],['Gestão dos regimes',v2.d4?.vinculos?.gestao],['Nível de turnover',v2.d4?.rotatividade?.[0]],['Custo de gente no resultado',v2.d4?.rotatividade?.[1]]];
  }
  if(dimension===1)return[['Como descreve o RH hoje',r.d1_rh_hoje],['Processos formalizados',r.d1_processos],['Cargos e salários',r.d1_cargos_salarios]];
  if(dimension===2)return[['Valores praticados',r.d2_valores],['Preparo das lideranças',r.d2_lideres_preparo],['Senso de responsabilidade',r.d2_comportamento_dono],['Plano de sucessão',r.d2_sucessao]];
  if(dimension===3)return[['Acompanha indicadores',r.d3_indicadores],['Decisão por dado',r.d3_decisao],['Conhece custo de gente',r.d3_custo]];
  return[['Colaboradores',r.d4_colaboradores],['Unidades',r.d4_unidades],['Turnover',r.d4_turnover]];
}

export function AdminPeopleMapReviewPage(){
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const protocolo=params.get('protocolo')||'';
  const [record,setRecord]=useState<MapaRecord|null>(null);
  const [draft,setDraft]=useState<Draft|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [emailOpen,setEmailOpen]=useState(false);
  const [pdfFile,setPdfFile]=useState<File|null>(null);
  const [emailFeedback,setEmailFeedback]=useState('');
  const [emailRecipients,setEmailRecipients]=useState<string[]>([]);
  const [emailMessage,setEmailMessage]=useState('');
  const [sending,setSending]=useState(false);

  useEffect(()=>{(async()=>{
    if(!supabase){setError('Supabase não configurado.');setLoading(false);return}
    if(!protocolo){setError('Protocolo não informado.');setLoading(false);return}
    const {data,error:rpcError}=await supabase.schema('public').rpc('workspace_mapa_people_record',{p_protocolo:protocolo});
    if(rpcError){setError(rpcError.message);setLoading(false);return}
    const raw=data as MapaRecord|MapaRecord[]|null;
    const found=Array.isArray(raw)?raw[0]:raw;
    if(!found){setError('Resposta não encontrada para este protocolo.');setLoading(false);return}
    setRecord(found);
    const saved=found.observacoes||{};
    setDraft({d1_obs:saved.d1_obs||'',d2_obs:saved.d2_obs||'',d3_obs:saved.d3_obs||'',d4_obs:saved.d4_obs||'',parecer:saved.parecer||'',servico_recomendado:saved.servico_recomendado||'Diagnóstico Executivo de People'});
    setLoading(false);
  })()},[protocolo]);

  useEffect(()=>{
    if(!emailOpen)return;
    document.body.classList.add('workspace-modal-open');
    return()=>document.body.classList.remove('workspace-modal-open');
  },[emailOpen]);

  const scores=useMemo(()=>record?scoresFor(record):null,[record]);
  const qv2=record?.diagnostico_v2?.qualificacao||{};

  async function save(){
    if(!record||!draft||!supabase)return false;
    setSaving(true);setFeedback('Salvando revisão…');
    try{
      const {data,error:rpcError}=await supabase.schema('public').rpc('workspace_update_mapa_people_record',{p_id:record.id,p_status:normalizeStatus(record.status),p_observacoes:draft});
      if(rpcError||!data)throw new Error(rpcError?.message||'erro inesperado');
      setRecord((current)=>current?{...current,observacoes:draft}:current);
      setFeedback('Revisão salva ✓');
      return true;
    }catch(err){
      setFeedback(`Não foi possível salvar: ${err instanceof Error?err.message:'erro inesperado'}`);
      return false;
    }finally{
      setSaving(false);
    }
  }

  async function saveAndOpenReport(){
    if(!record)return;
    const ok=await save();
    if(ok)navigate(`/admin/mapa-de-people/relatorio/${record.id}`);
  }

  function openWhatsapp(){
    if(!record)return;
    let raw=(record.c_whatsapp||'').replace(/\D/g,'');
    if(raw.length===10||raw.length===11)raw=`55${raw}`;
    if(!raw){setFeedback('Este contato não possui WhatsApp informado.');return}
    const first=(record.c_nome||'').trim().split(/\s+/)[0]||'';
    const text=`Oi${first?`, ${first}`:''}! Aqui é a Patrícia, da CALI RH. Estou entrando em contato sobre o seu Mapa de People. Quando puder, me chama por aqui para conversarmos sobre a leitura e os próximos passos.`;
    window.open(`https://wa.me/${raw}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
  }

  function openEmailModal(){
    if(!record)return;
    setPdfFile(null);
    setEmailFeedback('');
    setEmailRecipients([record.c_email||'']);
    setEmailMessage('');
    setEmailOpen(true);
  }

  function updateRecipient(index:number,value:string){
    setEmailRecipients((current)=>current.map((recipient,i)=>i===index?value:recipient));
    setEmailFeedback('');
  }

  function addRecipient(){
    setEmailRecipients((current)=>current.length>=8?current:[...current,'']);
  }

  function removeRecipient(index:number){
    setEmailRecipients((current)=>current.length===1?['']:current.filter((_,i)=>i!==index));
    setEmailFeedback('');
  }

  async function sendEmail(){
    if(!record||!supabase)return;
    const recipients=[...new Set(emailRecipients.map((value)=>value.trim().toLowerCase()).filter(Boolean))];
    if(!recipients.length){setEmailFeedback('Informe pelo menos um destinatário.');return}
    const invalid=recipients.find((email)=>!EMAIL_PATTERN.test(email));
    if(invalid){setEmailFeedback(`Confira o e-mail: ${invalid}`);return}
    if(!pdfFile){setEmailFeedback('Selecione o PDF aprovado antes de enviar.');return}
    if(pdfFile.type!=='application/pdf'&&!pdfFile.name.toLowerCase().endsWith('.pdf')){setEmailFeedback('Selecione um arquivo PDF.');return}
    if(pdfFile.size>8*1024*1024){setEmailFeedback('O PDF precisa ter até 8 MB.');return}
    setSending(true);setEmailFeedback('Enviando relatório…');
    try{
      const pdf_base64=await fileToBase64(pdfFile);
      const {data,error:fnError}=await supabase.functions.invoke('workspace-enviar-relatorio-mapa',{body:{response_id:record.id,pdf_base64,request_id:crypto.randomUUID(),recipients,custom_message:emailMessage.trim()||null}});
      if(fnError||!data?.ok)throw new Error(data?.error||fnError?.message||'Falha ao enviar.');
      const sentAt=new Date().toISOString();
      const sentTo=Array.isArray(data.to)?data.to.join(', '):(data.to||recipients.join(', '));
      setEmailFeedback(`Enviado para ${sentTo} ✓`);
      setRecord((current)=>current?{...current,status:'enviado',relatorio_enviado_em:sentAt}:current);
      setTimeout(()=>{setEmailOpen(false);setPdfFile(null);setEmailRecipients([]);setEmailMessage('');setEmailFeedback('')},1400);
    }catch(err){
      setEmailFeedback(err instanceof Error?err.message:'Não foi possível enviar.');
    }finally{
      setSending(false);
    }
  }

  if(loading)return <Shell role="admin"><div className="people-map-review-state"><RefreshCw className="spin" size={22}/>Abrindo revisão…</div></Shell>;
  if(error||!record||!draft||!scores)return <Shell role="admin"><div className="people-map-review-state error"><strong>Não foi possível abrir a revisão.</strong><span>{error}</span><button className="secondary" onClick={()=>navigate('/admin/mapa-de-people')}>Voltar ao Mapa</button></div></Shell>;

  const dimensions:[1|2|3|4,string,keyof Draft,number|null][]=[
    [1,'D1 · Maturidade Estrutural','d1_obs',scores.d1],
    [2,'D2 · Liderança & Cultura','d2_obs',scores.d2],
    [3,'D3 · Dados & Decisão','d3_obs',scores.d3],
    [4,'D4 · Dimensões Operacionais','d4_obs',scores.d4],
  ];

  return <Shell role="admin">
    <section className="page people-map-review-page">
      <button className="people-map-review-back" onClick={()=>navigate('/admin/mapa-de-people')}><ArrowLeft size={17}/>Voltar ao Mapa</button>
      <div className="people-map-review-head"><div><span className="eyebrow">REVISÃO DO RELATÓRIO · {record.protocolo}</span><h1>{record.c_empresa||record.c_nome}</h1><p>{record.c_nome}{record.c_cargo?` · ${record.c_cargo}`:''} · respondido em {formatDate(record.created_at)}</p></div><div className="people-map-review-score"><strong>{fmt(scores.total)}</strong><span>/10</span><small>score geral</small></div></div>
      <div className="people-map-review-grid">
        <main className="people-map-review-main">
          {dimensions.map(([dimension,title,key,score])=><section className="panel people-map-review-card" key={dimension}><header><div><span className="section-kicker">DIMENSÃO {dimension}</span><h2>{title}</h2></div><strong>{fmt(score)}<small>/10</small></strong></header><div className="people-map-review-answers">{rows(record,dimension).map(([label,value])=><div key={label}><span>{label}</span><b>{scoreLabel(value)}</b></div>)}</div><label className="stacked-label">Observação da Patrícia<textarea rows={4} value={String(draft[key]||'')} onChange={(e)=>setDraft({...draft,[key]:e.target.value})}/></label></section>)}
          <section className="panel people-map-review-card people-map-review-final"><header><div><span className="section-kicker">DEVOLUTIVA</span><h2>Parecer final</h2></div><FileText size={22}/></header><label className="stacked-label">O que você indicaria primeiro<textarea rows={7} value={draft.parecer} onChange={(e)=>setDraft({...draft,parecer:e.target.value})}/></label><label className="stacked-label">Serviço recomendado<select value={draft.servico_recomendado} onChange={(e)=>setDraft({...draft,servico_recomendado:e.target.value})}>{SERVICES.map((service)=><option key={service}>{service}</option>)}</select></label></section>
        </main>
        <aside className="people-map-review-side">
          <section className="panel people-map-review-sidecard"><div className="people-map-review-side-title"><UserRound size={18}/><h3>Contato</h3></div><dl><div><dt>Nome</dt><dd>{record.c_nome}</dd></div><div><dt>Empresa</dt><dd>{record.c_empresa}</dd></div><div><dt>Cargo</dt><dd>{record.c_cargo||'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{record.c_email}</dd></div><div><dt>WhatsApp</dt><dd>{record.c_whatsapp||'Não informado'}</dd></div><div><dt>Preferência</dt><dd>{record.c_preferencia_contato||'Não informada'}</dd></div><div><dt>LinkedIn / site</dt><dd>{record.c_linkedin_site||'Não informado'}</dd></div></dl></section>
          <section className="panel people-map-review-sidecard"><div className="people-map-review-side-title"><Building2 size={18}/><h3>Qualificação</h3></div><dl><div><dt>Prazo</dt><dd>{record.q_prazo||'—'}</dd></div><div><dt>Decisores</dt><dd>{[...(record.q_decisor||[]),record.q_decisor_outro].filter(Boolean).join(', ')||'—'}</dd></div><div><dt>Formato</dt><dd>{record.q_formato||'—'}</dd></div><div><dt>Apoio posterior</dt><dd>{qv2.apoio_pos||'—'}</dd></div><div><dt>Jurídico</dt><dd>{qv2.juridico||'—'}</dd></div><div><dt>Investimento</dt><dd>{record.q_investimento||'—'}</dd></div><div><dt>Origem</dt><dd>{record.q_origem||'—'}</dd></div></dl></section>
          <section className="panel people-map-review-sidecard people-map-review-actions"><h3>Fluxo aprovado</h3><p>Salve a revisão, confira o relatório e envie exatamente o PDF aprovado ao decisor.</p><button className="secondary" onClick={save} disabled={saving}><Save size={16}/>{saving?'Salvando…':'Salvar revisão'}</button><button className="primary" onClick={saveAndOpenReport} disabled={saving}><FileText size={16}/>{saving?'Salvando…':'Salvar e abrir relatório'}</button><button className="secondary" onClick={openEmailModal}><Mail size={16}/>Enviar relatório por e-mail</button><button className="secondary" onClick={openWhatsapp}><Send size={16}/>Preparar WhatsApp</button>{record.relatorio_enviado_em&&<small>Último envio: {new Date(record.relatorio_enviado_em).toLocaleString('pt-BR')}</small>}<span className="people-map-review-feedback" aria-live="polite">{feedback}</span></section>
        </aside>
      </div>
    </section>
    {emailOpen&&createPortal(<div className="workspace-modal-layer people-map-send-layer" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!sending)setEmailOpen(false)}}><section className="workspace-standard-modal people-map-send-modal" role="dialog" aria-modal="true" aria-labelledby="people-map-send-title"><button className="people-map-send-close" onClick={()=>!sending&&setEmailOpen(false)} disabled={sending} aria-label="Fechar"><X size={20}/></button><span className="eyebrow">ENVIO DO RELATÓRIO</span><h2 id="people-map-send-title">Confirmar devolutiva</h2><p>O destinatário principal vem do Mapa, mas você pode alterar ou incluir outras pessoas antes do envio.</p><div className="people-map-email-form"><label className="stacked-label"><span>Destinatários</span><small>Até 8 endereços. O primeiro já vem preenchido com o e-mail do formulário.</small><div className="people-map-recipient-list">{emailRecipients.map((recipient,index)=><div className="people-map-recipient-row" key={index}><Mail size={16}/><input type="email" value={recipient} disabled={sending} placeholder="nome@empresa.com.br" onChange={(event)=>updateRecipient(index,event.target.value)}/><button type="button" aria-label={`Remover destinatário ${index+1}`} onClick={()=>removeRecipient(index)} disabled={sending}><X size={16}/></button></div>)}</div><button type="button" className="people-map-add-recipient" onClick={addRecipient} disabled={sending||emailRecipients.length>=8}><Plus size={15}/>Adicionar destinatário</button></label><div className="people-map-email-subject"><span>Assunto</span><strong>{REPORT_EMAIL_SUBJECT}</strong></div><label className="stacked-label"><span>Mensagem adicional <em>opcional</em></span><textarea rows={3} value={emailMessage} disabled={sending} maxLength={3000} placeholder="Escreva aqui uma observação pessoal para acompanhar o e-mail padrão da CALI." onChange={(event)=>setEmailMessage(event.target.value)}/><small>{emailMessage.length}/3000 · entra no corpo do e-mail sem substituir o modelo aprovado.</small></label></div><label className={`people-map-pdf-upload${pdfFile?' has-file':''}`}><input type="file" accept="application/pdf,.pdf" disabled={sending} onChange={(e)=>{setPdfFile(e.target.files?.[0]||null);setEmailFeedback('')}}/><FileText size={22}/><strong>{pdfFile?pdfFile.name:'Selecionar relatório aprovado'}</strong><span>{pdfFile?`${(pdfFile.size/1024/1024).toFixed(2)} MB · pronto para enviar`:'PDF de até 8 MB'}</span></label>{emailFeedback&&<div className="people-map-email-feedback" aria-live="polite">{emailFeedback}</div>}<footer><button className="secondary" onClick={()=>setEmailOpen(false)} disabled={sending}>Cancelar</button><button className="primary" onClick={sendEmail} disabled={sending}>{sending?'Enviando…':'Enviar relatório'}</button></footer></section></div>,document.body)}
  </Shell>;
}
