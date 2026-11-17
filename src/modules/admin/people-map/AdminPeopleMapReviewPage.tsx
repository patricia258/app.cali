import { Select } from '../../../components/ds/Select';
import { Textarea } from '../../../components/ds/Textarea';
import { useMapaDeliveryState } from './hooks/useMapaDeliveryState';
import { useSendMapaReport } from './hooks/useSendMapaReport';
import { DocumentAction } from '../../../components/workspace/components/DocumentAction';
import { FieldLabel } from '../../../components/ds/FieldLabel';
import { AdminMaterialReview } from '../../material-review/AdminMaterialReview';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Building2, FileText, Mail, RefreshCw, Save, Send, UserRound } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSearchParams } from '../../../hooks/useSearchParams';
import { DocumentShell } from '../../../components/workspace/DocumentShell';
import { DocumentPanel } from '../../../components/workspace/components/DocumentPanel';
import { readMapaReview, saveMapaReview } from '../../../api/admin/people-map/reviews';
import { PeopleMapSendDialog } from './components/PeopleMapSendDialog';

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
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const protocolo=params.get('protocolo')||'';
  const [record,setRecord]=useState<MapaRecord|null>(null);
  const [draft,setDraft]=useState<Draft|null>(null);
  const [loading,setLoading]=useState(true);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [emailProtocol,setEmailProtocol]=useState<string|null>(null);
  const [pdfFile,setPdfFile]=useState<File|null>(null);
  const [emailFeedback,setEmailFeedback]=useState('');
  const [emailMessage,setEmailMessage]=useState('');
  const emailDialog = useRef<symbol | null>(null);
  const emailCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emailOpen = emailProtocol !== null && emailProtocol === protocolo;
  const delivery = useMapaDeliveryState(record?.id, emailOpen);
  const sendReport = useSendMapaReport();
  const deliveryReady = delivery.isSuccess && !delivery.isFetching;

  useEffect(() => {
    let active = true;
    if (!protocolo) { setError('Protocolo não informado.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    void readMapaReview(protocolo).then((row) => {
      if (!active) return;
      const found = row as MapaRecord | null;
      if (!found) { setError('Resposta não encontrada para este protocolo.'); return; }
      setRecord(found);
      const saved = found.observacoes || {};
      setDraft({
        d1_obs: saved.d1_obs || '', d2_obs: saved.d2_obs || '', d3_obs: saved.d3_obs || '', d4_obs: saved.d4_obs || '',
        parecer: saved.parecer || '', servico_recomendado: saved.servico_recomendado || 'Diagnóstico Executivo de People',
      });
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a revisão.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [protocolo, reviewRefresh]);

  useEffect(()=>{
    if(!emailOpen)return;
    document.body.classList.add('workspace-modal-open');
    return()=>document.body.classList.remove('workspace-modal-open');
  },[emailOpen]);

  useEffect(() => {
    setEmailProtocol(null);
    return () => {
      emailDialog.current = null;
      clearTimeout(emailCloseTimer.current);
    };
  }, [protocolo]);

  const scores=useMemo(()=>record?scoresFor(record):null,[record]);
  const qv2=record?.diagnostico_v2?.qualificacao||{};

  async function save(){
    if(!record||!draft)return false;
    setSaving(true);setFeedback('Salvando revisão…');
    try{
      if (!await saveMapaReview(record.id, normalizeStatus(record.status), draft)) throw new Error('erro inesperado');
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

  function openEmailModal() {
    clearTimeout(emailCloseTimer.current);
    emailDialog.current = Symbol();
    setPdfFile(null);
    setEmailFeedback('');
    setEmailMessage('');
    setEmailProtocol(protocolo);
  }

  function closeEmailModal() {
    clearTimeout(emailCloseTimer.current);
    emailDialog.current = null;
    sendReport.reset();
    setEmailProtocol(null);
    setPdfFile(null);
    setEmailMessage('');
    setEmailFeedback('');
  }

  async function sendEmail(){
    const dialog = emailDialog.current;
    if (!dialog || !record || sendReport.isPending || !deliveryReady || !delivery.data) return;
    const { revision, hasPdf } = delivery.data;
    const responseId = record.id;
    const recipient = record.c_email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(recipient)) { setEmailFeedback('Confira o e-mail da resposta do Mapa.'); return; }
    const attachment = hasPdf ? null : pdfFile;
    if (!hasPdf && !attachment) { setEmailFeedback('Selecione o PDF aprovado antes de enviar.'); return; }
    if (attachment && attachment.type !== 'application/pdf' && !attachment.name.toLowerCase().endsWith('.pdf')) { setEmailFeedback('Selecione um arquivo PDF.'); return; }
    if (attachment && attachment.size > 8 * 1024 * 1024) { setEmailFeedback('O PDF precisa ter até 8 MB.'); return; }
    const fileIdentity = attachment && [attachment.name, attachment.size, attachment.lastModified];
    const message = emailMessage.trim();
    const isCurrent = sendReport.captureScope();
    const isActiveDialog = () => isCurrent() && emailDialog.current === dialog;
    const requestId = await confirmDelivery([recipient], [responseId, revision, fileIdentity, message]);
    if (!requestId || !isActiveDialog()) return;
    setEmailFeedback('Enviando relatório…');
    try {
      const data = await sendReport.send({
        responseId, revision, attachment, requestId, recipient,
        customMessage: message || null, isCurrent,
      });
      if (!isCurrent()) return;
      const sentAt = new Date().toISOString();
      setRecord((current) => current?.id === responseId ? { ...current, status: 'enviado', relatorio_enviado_em: sentAt } : current);
      if (!isActiveDialog()) return;
      completeDelivery();
      const sentTo = Array.isArray(data.to) ? data.to.join(', ') : (data.to || recipient);
      setEmailFeedback(`Enviado para ${sentTo} ✓`);
      emailCloseTimer.current = setTimeout(() => { if (isActiveDialog()) closeEmailModal(); }, 1400);
    } catch (err) {
      if (isActiveDialog()) setEmailFeedback(err instanceof Error ? err.message : 'Não foi possível enviar.');
    }
  }

  if(loading)return <DocumentShell><div className="people-map-review-state tw:flex tw:min-h-[60vh] tw:items-center tw:justify-center tw:gap-2.5 tw:text-cali-neutral-accent"><RefreshCw className="tw:animate-spin tw:[animation-duration:0.9s] tw:motion-reduce:animate-none" size={22}/>Abrindo revisão…</div></DocumentShell>;
  if(error||!record||!draft||!scores)return <DocumentShell><div className="people-map-review-state error tw:flex tw:min-h-[60vh] tw:flex-col tw:items-center tw:justify-center tw:gap-2.5 tw:text-cali-neutral-accent tw:[&>span]:text-xs tw:[&>span]:text-cali-sand-text tw:[&>button]:mt-1.5"><strong>Não foi possível abrir a revisão.</strong><span>{error}</span><DocumentAction variant="secondary" onClick={()=>navigate('/admin/mapa-de-people')}>Voltar ao Mapa</DocumentAction></div></DocumentShell>;

  const dimensions:[1|2|3|4,string,keyof Draft,number|null][]=[
    [1,'D1 · Maturidade Estrutural','d1_obs',scores.d1],
    [2,'D2 · Liderança & Cultura','d2_obs',scores.d2],
    [3,'D3 · Dados & Decisão','d3_obs',scores.d3],
    [4,'D4 · Dimensões Operacionais','d4_obs',scores.d4],
  ];

  const reviewSectionHeader = 'tw:mb-4 tw:flex tw:items-start tw:justify-between tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-brand/8 tw:pb-3.5';
  const reviewSectionTitle = 'tw:mt-1! tw:mb-0! tw:text-lg/[inherit]! tw:text-cali-neutral-strong tw:workspace-night:text-cali-day-canvas';
  const reviewSideTitle = 'tw:m-0! tw:text-cali-body/[inherit]! tw:text-cali-neutral-strong tw:workspace-night:text-cali-day-canvas';
  const reviewInput = `tw:w-full tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-neutral-line
    tw:px-3.5 tw:py-3 tw:text-[var(--graphite)] tw:outline-none
    tw:focus:border-[var(--burgundy)] tw:focus:shadow-[0_0_0_0.1875rem_rgb(var(--cali-rgb-burgundy-accent)/0.07059)] tw:bg-cali-neutral-surface tw:text-cali-small/[1.5]! tw:workspace-night:border-cali-sand-soft/14 tw:workspace-night:bg-cali-surface tw:workspace-night:text-cali-day-canvas`;
  const reviewFacts = 'tw:mt-3.5 tw:mb-0 tw:grid tw:gap-2 tw:[&>div]:grid tw:[&>div]:gap-0.5 tw:[&>div]:border-0 tw:[&>div]:border-b tw:[&>div]:border-solid tw:[&>div]:border-cali-brand/7 tw:[&>div]:pb-2 tw:[&>div:last-child]:border-b-0 tw:[&>div:last-child]:pb-0 tw:[&_dt]:text-cali-micro tw:[&_dt]:font-extrabold tw:[&_dt]:tracking-[0.06em] tw:[&_dt]:text-cali-sand-text tw:[&_dt]:uppercase tw:[&_dd]:m-0 tw:[&_dd]:text-xs tw:[&_dd]:text-cali-neutral-text tw:[&_dd]:[overflow-wrap:anywhere] tw:workspace-night:[&_dt]:text-cali-sand-text tw:workspace-night:[&_dd]:text-cali-neutral-line';

  return <DocumentShell>
    <section className="page people-map-review-page tw:pb-18">
      <button className="people-map-review-back tw:mb-4.5 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:border-0 tw:bg-transparent tw:text-cali-detail/[inherit] tw:font-extrabold tw:text-cali-brand" onClick={()=>navigate('/admin/mapa-de-people')}><ArrowLeft size={17}/>Voltar ao Mapa</button>
      <div className="people-map-review-head tw:mb-5.5 tw:flex tw:items-end tw:justify-between tw:gap-6 tw:[@media(max-width:61.25rem)]:items-start tw:[@media(max-width:42.5rem)]:flex-col"><div><span className="eyebrow tw:text-xs/[1.4]! tw:font-bold tw:tracking-[0.14em] tw:text-[var(--burgundy)]">REVISÃO DO RELATÓRIO · {record.protocolo}</span><h1 className="tw:mt-1.5! tw:mb-1! tw:text-3xl/[1.2]! tw:tracking-[-0.035em] tw:max-[37.5rem]:text-2xl! tw:workspace-night:text-cali-day-canvas">{record.c_empresa||record.c_nome}</h1><p className="tw:m-0! tw:text-cali-small/[1.55]! tw:text-cali-neutral-accent tw:workspace-night:text-cali-neutral-line">{record.c_nome}{record.c_cargo?` · ${record.c_cargo}`:''} · respondido em {formatDate(record.created_at)}</p></div><div className="people-map-review-score tw:grid tw:grid-cols-[auto_auto] tw:items-baseline tw:text-right tw:[@media(max-width:61.25rem)]:min-w-[5.9375rem] tw:[@media(max-width:42.5rem)]:justify-start tw:[@media(max-width:42.5rem)]:text-left"><strong className="tw:text-4xl/none tw:text-cali-brand">{fmt(scores.total)}</strong><span className="tw:ml-1 tw:text-xs/[inherit] tw:text-cali-sand-text">/10</span><small className="tw:col-span-full tw:mt-1 tw:text-cali-caption/[1.4]! tw:text-cali-sand-text">score geral</small></div></div>
      <div className="people-map-review-grid tw:grid tw:grid-cols-[minmax(0,1fr)_minmax(18.75rem,21.875rem)] tw:items-start tw:gap-4.5 tw:[@media(max-width:61.25rem)]:grid-cols-1">
        <main className="people-map-review-main tw:grid tw:gap-3.5">
          {dimensions.map(([dimension,title,key,score])=><DocumentPanel className="people-map-review-card" key={dimension}><header className={reviewSectionHeader}><div><span className="section-kicker tw:text-xs/[1.4]! tw:font-bold tw:tracking-[0.12em] tw:text-[var(--v2-gold)]">DIMENSÃO {dimension}</span><h2 className={reviewSectionTitle}>{title}</h2></div><strong className="tw:text-2xl/[inherit] tw:text-cali-brand">{fmt(score)}<small className="tw:ml-0.5 tw:text-cali-caption/[1.4]! tw:text-cali-sand-text">/10</small></strong></header><div className="people-map-review-answers tw:mb-4 tw:grid tw:grid-cols-2 tw:gap-x-3 tw:gap-y-2 tw:[@media(max-width:42.5rem)]:grid-cols-1">{rows(record,dimension).map(([label,value])=><div key={label} className="tw:rounded-cali-panel tw:bg-cali-brand/4 tw:px-3 tw:py-2.5 tw:workspace-night:bg-cali-neutral-surface/4"><span className="tw:block tw:text-cali-label/[inherit] tw:text-cali-sand-text tw:workspace-night:text-cali-sand-text">{label}</span><b className="tw:mt-1 tw:block tw:text-xs/[inherit] tw:text-cali-neutral-text tw:workspace-night:text-cali-neutral-line">{scoreLabel(value)}</b></div>)}</div><FieldLabel className="tw:grid tw:gap-cali-control-gap tw:text-cali-small tw:font-bold tw:text-[var(--graphite)]">Observação da Patrícia<Textarea variant="embedded" className={reviewInput} rows={4} value={String(draft[key]||'')} onChange={(e)=>setDraft({...draft,[key]:e.target.value})}/></FieldLabel></DocumentPanel>)}
          <DocumentPanel className="people-map-review-card"><header className={reviewSectionHeader}><div><span className="section-kicker tw:text-xs/[1.4]! tw:font-bold tw:tracking-[0.12em] tw:text-[var(--v2-gold)]">DEVOLUTIVA</span><h2 className={reviewSectionTitle}>Parecer final</h2></div><FileText size={22}/></header><FieldLabel className="tw:grid tw:gap-cali-control-gap tw:text-cali-small tw:font-bold tw:text-[var(--graphite)]">O que você indicaria primeiro<Textarea variant="embedded" className={reviewInput} rows={7} value={draft.parecer} onChange={(e)=>setDraft({...draft,parecer:e.target.value})}/></FieldLabel><FieldLabel className="tw:grid tw:gap-cali-control-gap tw:text-cali-small tw:font-bold tw:text-[var(--graphite)]">Serviço recomendado<Select variant="compact" className="tw:w-full" value={draft.servico_recomendado} onChange={(e)=>setDraft({...draft,servico_recomendado:e.target.value})}>{SERVICES.map((service)=><option key={service}>{service}</option>)}</Select></FieldLabel></DocumentPanel>
        </main>
        <aside className="people-map-review-side tw:sticky tw:top-23 tw:grid tw:gap-3 tw:[@media(max-width:61.25rem)]:static">
          <DocumentPanel className="people-map-review-sidecard"><div className="people-map-review-side-title tw:flex tw:items-center tw:gap-2 tw:text-cali-brand"><UserRound size={18}/><h3 className={reviewSideTitle}>Contato</h3></div><dl className={reviewFacts}><div><dt>Nome</dt><dd>{record.c_nome}</dd></div><div><dt>Empresa</dt><dd>{record.c_empresa}</dd></div><div><dt>Cargo</dt><dd>{record.c_cargo||'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{record.c_email}</dd></div><div><dt>WhatsApp</dt><dd>{record.c_whatsapp||'Não informado'}</dd></div><div><dt>Preferência</dt><dd>{record.c_preferencia_contato||'Não informada'}</dd></div><div><dt>LinkedIn / site</dt><dd>{record.c_linkedin_site||'Não informado'}</dd></div></dl></DocumentPanel>
          <DocumentPanel className="people-map-review-sidecard"><div className="people-map-review-side-title tw:flex tw:items-center tw:gap-2 tw:text-cali-brand"><Building2 size={18}/><h3 className={reviewSideTitle}>Qualificação</h3></div><dl className={reviewFacts}><div><dt>Prazo</dt><dd>{record.q_prazo||'—'}</dd></div><div><dt>Decisores</dt><dd>{[...(record.q_decisor||[]),record.q_decisor_outro].filter(Boolean).join(', ')||'—'}</dd></div><div><dt>Formato</dt><dd>{record.q_formato||'—'}</dd></div><div><dt>Apoio posterior</dt><dd>{qv2.apoio_pos||'—'}</dd></div><div><dt>Jurídico</dt><dd>{qv2.juridico||'—'}</dd></div><div><dt>Investimento</dt><dd>{record.q_investimento||'—'}</dd></div><div><dt>Origem</dt><dd>{record.q_origem||'—'}</dd></div></dl></DocumentPanel>
          {record.status!=='enviado'&&<AdminMaterialReview kind="mapa" entityId={record.id} onApproved={() => setReviewRefresh((version) => version + 1)} />}<DocumentPanel className="people-map-review-sidecard people-map-review-actions tw:grid tw:gap-2 tw:[&>button]:w-full tw:[&>button]:justify-start tw:[&>small]:text-cali-caption/[1.4]! tw:[&>small]:text-cali-sand-text"><h3 className={reviewSideTitle}>Fluxo aprovado</h3><p className="tw:mt-1 tw:mb-1 tw:text-cali-small/[1.55]! tw:text-cali-neutral-accent tw:workspace-night:text-cali-neutral-line">Salve a revisão, confira o relatório e envie exatamente o PDF aprovado ao decisor.</p><DocumentAction variant="secondary" onClick={save} disabled={saving}><Save size={16}/>{saving?'Salvando…':'Salvar revisão'}</DocumentAction><DocumentAction variant="primary" onClick={saveAndOpenReport} disabled={saving}><FileText size={16}/>{saving?'Salvando…':'Salvar e abrir relatório'}</DocumentAction><DocumentAction variant="secondary" onClick={openEmailModal}><Mail size={16}/>Enviar relatório por e-mail</DocumentAction><DocumentAction variant="secondary" onClick={openWhatsapp}><Send size={16}/>Preparar WhatsApp</DocumentAction>{record.relatorio_enviado_em&&<small>Último envio: {new Date(record.relatorio_enviado_em).toLocaleString('pt-BR')}</small>}<span className="people-map-review-feedback tw:min-h-4 tw:text-cali-label/[inherit] tw:text-cali-neutral-accent" aria-live="polite">{feedback}</span></DocumentPanel>
        </aside>
      </div>
    </section>
    {emailOpen && createPortal(
      <PeopleMapSendDialog
        surface="document"
        recipient={`${record.c_nome} <${record.c_email}>`} recipientLabel="Destinatário da resposta"
        file={pdfFile} onFile={(file) => { setPdfFile(file); setEmailFeedback(''); }}
        onClose={closeEmailModal} onSend={sendEmail}
        sending={sendReport.isPending} sent={record.status === 'enviado'}
        deliveryReady={deliveryReady} deliveryError={delivery.isError} onRetry={() => void delivery.refetch()}
        officialPdf={delivery.data?.hasPdf} revision={delivery.data?.revision} feedback={emailFeedback}
      >
        <div className="tw:mb-4 tw:grid tw:gap-4">
          <div className="tw:grid tw:gap-1 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-brand/8 tw:bg-cali-brand/4 tw:px-3 tw:py-3 tw:workspace-night:border-cali-line-strong tw:workspace-night:bg-cali-surface">
            <span className="tw:text-cali-micro/[inherit] tw:font-extrabold tw:tracking-[0.08em] tw:text-cali-sand-text tw:uppercase">Assunto</span>
            <strong className="tw:text-xs/[inherit] tw:font-[650] tw:text-cali-neutral-text tw:workspace-night:text-cali-neutral-line">{REPORT_EMAIL_SUBJECT}</strong>
          </div>
          <FieldLabel className="tw:grid tw:gap-2 tw:text-xs/[inherit] tw:font-[750] tw:text-cali-neutral-strong tw:workspace-night:text-cali-day-canvas">
            <span>Mensagem adicional <em className="tw:font-medium tw:text-cali-sand-text tw:not-italic">opcional</em></span>
            <Textarea variant="embedded" className="tw:min-h-20.5 tw:w-full tw:resize-y tw:rounded-cali-panel! tw:border tw:border-solid tw:border-cali-line! tw:bg-cali-neutral-surface! tw:px-3! tw:py-3! tw:text-xs/[1.5]! tw:text-cali-ink! tw:focus:border-cali-brand/32! tw:focus:shadow-[0_0_0_3px_rgb(var(--cali-rgb-burgundy-accent)/0.07059)] tw:workspace-night:border-cali-line-strong! tw:workspace-night:bg-cali-neutral-inverse! tw:workspace-night:text-cali-day-canvas!" rows={3} value={emailMessage} disabled={sendReport.isPending} maxLength={3000} placeholder="Escreva aqui uma observação pessoal para acompanhar o e-mail padrão da CALI." onChange={(event) => setEmailMessage(event.target.value)} />
            <small className="tw:text-cali-label/[1.4] tw:font-medium tw:text-cali-sand-text tw:workspace-night:text-cali-sand-accent">{emailMessage.length}/3000 · entra no corpo do e-mail sem substituir o modelo aprovado.</small>
          </FieldLabel>
        </div>
      </PeopleMapSendDialog>, document.body
    )}
  </DocumentShell>;
}
