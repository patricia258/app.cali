import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, FileText, MessageCircle, Printer, ShieldCheck, X } from 'lucide-react';
import { WorkspaceExecutiveReportPaper } from '../../../components/reports/WorkspaceExecutiveReportPaper';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import type { ReportIdentityV55 } from '../../../domain/report-identity';
import { useQueryClient } from '@tanstack/react-query';
import { acknowledgeClientReport, clientReportsKey, readClientReports, recordReportRead, type ClientReportRow } from '../../../api/client/reports/library';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { type ReportType } from '../../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../../lib/reportIntelligence';
import { reportQuestionDeadline } from '../../../domain/report-question';
import { formatReportQuestionDeadline, ReportQuestionDialog } from './components/ReportQuestionDialog';

type Report={
  id:string;title:string;reportType:ReportType;periodStart:string;periodEnd:string;summary:string;
  movements:string[];decisions:string[];risks:string[];nextSteps:string[];snapshot:IntelligenceSnapshot|null;
  protocol:string;publishedAt?:string|null;sentAt?:string|null;version:number;status:'sent'|'published';
  approvalIdentity?:ReportIdentityV55|null;ackIdentity?:ReportIdentityV55|null;acknowledgedAt?:string|null;
  ackProtocol?:string|null;approvedAt?:string|null;openCount:number;firstOpenedAt?:string|null;
  lastOpenedAt?:string|null;pdfCount:number;
};
type Company={name:string;logoUrl?:string|null;workspaceLogo?:boolean};

function rowToReport(row: ClientReportRow):Report{
  return{
    id:row.id,title:row.title,reportType:row.report_type||'monthly',
    periodStart:String(row.period_start||row.reference_month).slice(0,10),
    periodEnd:String(row.period_end||row.reference_month).slice(0,10),
    summary:row.executive_summary||'',
    movements:Array.isArray(row.movements)?row.movements.map(String):[],
    decisions:Array.isArray(row.decisions)?row.decisions.map(String):[],
    risks:Array.isArray(row.risks)?row.risks.map(String):[],
    nextSteps:Array.isArray(row.next_steps)?row.next_steps.map(String):[],
    snapshot:normalizeIntelligenceSnapshot(row.source_snapshot),protocol:row.protocol||'—',
    publishedAt:row.published_at,sentAt:row.sent_at,version:Number(row.version||1),status:row.status,
    approvalIdentity:row.approval_identity_snapshot||null,ackIdentity:row.acknowledgement_identity_snapshot||null,
    acknowledgedAt:row.acknowledged_at||null,ackProtocol:row.acknowledgement_protocol||null,
    approvedAt:row.approved_at||null,openCount:Number(row.client_open_count||0),
    firstOpenedAt:row.client_first_opened_at||null,lastOpenedAt:row.client_last_opened_at||null,
    pdfCount:Number(row.client_pdf_count||0)
  };
}
function periodLabel(type:ReportType,start:string){
  const[year,month]=start.split('-').map(Number);
  return type==='monthly'
    ?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(year,month-1,1))
    :`${Math.floor((month-1)/3)+1}º trimestre de ${year}`;
}
function formatDateTime(value?:string|null){
  if(!value)return'—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date).replace('.','');
}

export function ClientReportsPage(){
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const[reports,setReports]=useState<Report[]>([]);
  const[company,setCompany]=useState<Company|null>(null);
  const[selectedId,setSelectedId]=useState('');
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[view,setView]=useState<'current'|'list'>('current');
  const[revealed,setRevealed]=useState<Set<string>>(()=>new Set());
  const[periodFilter,setPeriodFilter]=useState('');
  const[ackOpen,setAckOpen]=useState(false);
  const[acknowledging,setAcknowledging]=useState(false);
  const [question, setQuestion] = useState<{ id: string; deadline: Date } | null>(null);
  const [questionNotice, setQuestionNotice] = useState('');

  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    if(!ackOpen && !question)return;
    document.body.classList.add('workspace-modal-open');
    return()=>document.body.classList.remove('workspace-modal-open');
  }, [ackOpen, question]);
  useEffect(() => {
    if (!questionNotice) return;
    const timer = window.setTimeout(() => setQuestionNotice(''), 7000);
    return () => window.clearTimeout(timer);
  }, [questionNotice]);

  async function load(preferredId?:string){
    setLoading(true);setError('');
    try{
      const userId=user?.id;
      if(!userId)throw new Error('Sessão do cliente não encontrada.');
      const library = await queryClient.fetchQuery({
        queryKey: clientReportsKey(userId),
        queryFn: ({ signal }) => readClientReports(userId, signal),
        staleTime: 0,
      });
      const companyName=library.company?.display_name||'Empresa';
      setCompany({name:companyName,logoUrl:null});
      const workspaceLogo=Boolean(library.company?.logo_workspace_url);
      void resolveWorkspaceMedia(library.company?.logo_workspace_url||library.company?.logo_url,86400,true).then((logoUrl)=>setCompany({name:companyName,logoUrl,workspaceLogo}));
      const next=library.reports.map(rowToReport);
      setReports(next);
      const queryId=new URLSearchParams(window.location.search).get('report')||'';
      const desired=preferredId||queryId||selectedId;
      setSelectedId(next.some((item)=>item.id===desired)?desired:(next[0]?.id||''));
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível carregar os relatórios.');
    }finally{setLoading(false);}
  }

  async function recordOpen(id:string){
    const data = await recordReportRead(id, 'opened');
    if (!data) return;
    setReports((current)=>current.map((item)=>item.id===id?{
      ...item,
      openCount:Number(data?.open_count??item.openCount),
      firstOpenedAt:data?.first_opened_at||item.firstOpenedAt,
      lastOpenedAt:data?.last_opened_at||item.lastOpenedAt
    }:item));
  }

  const selected=useMemo(()=>reports.find((item)=>item.id===selectedId)||null,[reports,selectedId]);
  const questionDeadline = reportQuestionDeadline(selected?.firstOpenedAt);
  const periods=useMemo(()=>[...new Map(reports.map((report)=>[`${report.reportType}:${report.periodStart.slice(0,7)}`,periodLabel(report.reportType,report.periodStart)])).entries()],[reports]);
  const visibleReports=useMemo(()=>periodFilter?reports.filter((report)=>`${report.reportType}:${report.periodStart.slice(0,7)}`===periodFilter):reports,[reports,periodFilter]);

  function noteReportOpened(report:Report){
    setSelectedId(report.id);
    void recordOpen(report.id);
  }
  function requestAcknowledge(report:Report){setError('');setSelectedId(report.id);setAckOpen(true);}
  async function acknowledge(){
    if(!selected)return;
    setAcknowledging(true);setError('');
    try{
      if(!selected.openCount)await recordOpen(selected.id);
      const data = await acknowledgeClientReport(selected.id);
      setReports((current)=>current.map((item)=>item.id===selected.id?{
        ...item,
        acknowledgedAt:data?.acknowledged_at||item.acknowledgedAt,
        ackProtocol:data?.acknowledgement_protocol||item.ackProtocol,
        ackIdentity:data?.identity||item.ackIdentity
      }:item));
      setAckOpen(false);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível registrar a ciência.');
    }finally{setAcknowledging(false);}
  }

  if(loading) return <Shell role="client"><section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">Carregando leitura executiva…</section></Shell>;

  // O relatório mais recente abre a página. Enquanto o cliente não o visualiza, ele fica desfocado atrás do
  // convite; "Visualizar" registra a abertura (record_report_client_event_v55) e libera a leitura.
  const gated=Boolean(selected&&!selected.openCount&&!revealed.has(selected.id));
  // Imprime daqui mesmo: abre a caixa de impressão do navegador com o documento desta página e registra
  // o evento de PDF, como fazia a página de impressão separada.
  const printReport=async(report:Report)=>{
    const previous=document.title;
    document.title=`Relatório CALI RH - ${company?.name||'Empresa'} - ${periodLabel(report.reportType,report.periodStart)}`;
    void recordReportRead(report.id, 'pdf_opened').catch(() => undefined);
    await Promise.all(Array.from(document.images).map((image)=>image.complete?Promise.resolve():new Promise<void>((resolve)=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>resolve(),{once:true});})));
    try{await document.fonts?.ready;}catch{/* navegador sem FontFaceSet */}
    window.print();
    document.title=previous;
  };
  const openReport=(report:Report)=>{setRevealed((current)=>new Set(current).add(report.id));noteReportOpened(report);};
  const paper=selected&&selected.snapshot?<WorkspaceExecutiveReportPaper company={{name:company?.name||'Empresa',logoUrl:company?.logoUrl||null}} snapshot={selected.snapshot} editor={{summary:selected.summary,movements:selected.movements.join('\n'),decisions:selected.decisions.join('\n'),risks:selected.risks.join('\n'),nextSteps:selected.nextSteps.join('\n')}} reportType={selected.reportType} periodName={periodLabel(selected.reportType,selected.periodStart)} protocol={selected.protocol} deliveries={selected.snapshot.deliveryPerformanceV14 ?? []} approvalIdentity={selected.approvalIdentity} acknowledgementIdentity={selected.ackIdentity} approvedAt={selected.approvedAt} acknowledgedAt={selected.acknowledgedAt} acknowledgementProtocol={selected.ackProtocol}/>:null;

  return <Shell role="client"><section className="v2-client-module"><div className="wf">
    <div className="wf-head"><div><small>ÁREA DA EMPRESA / LEITURA EXECUTIVA</small><h1>Relatórios</h1><p>Fatos, evolução e encaminhamentos — não apenas gráficos.</p></div></div>
    {error?<InlineNotice role="alert">{error}</InlineNotice>:null}
    {questionNotice && <InlineNotice tone="success" role="status">{questionNotice}</InlineNotice>}
    <div className="wf-controls"><div className="wf-segments" role="tablist" aria-label="Relatórios"><button type="button" role="tab" aria-selected={view==='current'} className={view==='current'?'on':''} onClick={()=>setView('current')}>Leitura</button><button type="button" role="tab" aria-selected={view==='list'} className={view==='list'?'on':''} onClick={()=>setView('list')}>Todos os relatórios</button></div>{view==='current'&&selected?<strong>{periodLabel(selected.reportType,selected.periodStart)} · v{selected.version}{selected.id===reports[0]?.id?' · mais recente':''}</strong>:null}{view==='list'?<label className="wf-control-right"><CalendarDays size={15}/><span>Período</span><select value={periodFilter} onChange={(event)=>setPeriodFilter(event.target.value)} aria-label="Filtrar período"><option value="">Todos os períodos</option>{periods.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>:null}</div>
    {!reports.length?<EmptyState variant="workflow"><FileText size={24}/><strong>Nenhum relatório disponível ainda.</strong><p>Quando a CALI publicar um fechamento, ele aparecerá aqui.</p></EmptyState>:null}
    {view==='current'&&selected?<div className="wf-report-layout">
      <div className={`v2-report-stage${gated?' gated':''}`}>
        <div className="v2-report-paper report-print-v16-stage" aria-hidden={gated||undefined}>{paper||<article className="wf-report-paper"><span>LEITURA EXECUTIVA · {periodLabel(selected.reportType,selected.periodStart)}</span><h2>{selected.title}</h2><p>{selected.summary||'Resumo executivo não informado.'}</p></article>}</div>
        {gated?<div className="v2-report-invite" role="dialog" aria-label="Novo relatório disponível"><FileText size={22}/><small>NOVO RELATÓRIO DISPONÍVEL</small><h2>{periodLabel(selected.reportType,selected.periodStart)}</h2><p>{selected.title}. Deseja ver agora?</p><Button type="button" variant="workflowPrimary" onClick={()=>openReport(selected)}>Visualizar relatório</Button></div>:null}
      </div>
      <aside className="wf-report-side v2-burgundy-aside"><h3>Sobre a leitura</h3><p>{company?.name||'Empresa'}</p><ul><li>Versão {selected.version}</li><li>Protocolo {selected.protocol}</li><li>Disponível desde {formatDateTime(selected.sentAt||selected.publishedAt)}</li><li>{selected.acknowledgedAt?`Ciência em ${formatDateTime(selected.acknowledgedAt)}`:'Ciência ainda não registrada'}</li></ul>
        {!gated?<div className="v2-report-actions">{!selected.acknowledgedAt?<button type="button" className="v2-report-ack" onClick={()=>requestAcknowledge(selected)}><ShieldCheck size={14}/> Dar ciência</button>:null}<button type="button" className="v2-report-print" onClick={()=>void printReport(selected)}><Printer size={14}/> Imprimir / salvar PDF</button>{questionDeadline && Date.now() <= questionDeadline.getTime() && <button
          type="button" title={`Disponível até ${formatReportQuestionDeadline(questionDeadline)}`}
          onClick={() => { setQuestionNotice(''); setQuestion({ id: selected.id, deadline: questionDeadline }); }}>
          <MessageCircle size={14} /> Enviar dúvida
        </button>}</div>:null}
      </aside>
    </div>:null}
    {view==='list'&&reports.length?<div className="wf-records v2-report-list"><div className="wf-record-row header"><span>Relatório</span><span>Período</span><span>Publicação</span><span>Situação</span><span/></div>{visibleReports.map((report)=><button type="button" className="wf-record-row" key={report.id} onClick={()=>{setSelectedId(report.id);setView('current');}}><span><small>{report.protocol}</small><strong>{report.title}</strong></span><span>{periodLabel(report.reportType,report.periodStart)} · v{report.version}</span><span>{formatDateTime(report.sentAt||report.publishedAt)}</span><span className="v2-report-tags"><span className={`wf-tag ${report.openCount?'green':'blue'}`}>{report.openCount?'Visualizado':'Novo'}</span><span className={`wf-tag ${report.acknowledgedAt?'green':'yellow'}`}>{report.acknowledgedAt?'Ciência registrada':'Ciência pendente'}</span></span><ChevronRight size={14}/></button>)}{!visibleReports.length?<EmptyState variant="workflow">Nenhum relatório neste período.</EmptyState>:null}</div>:null}
    {question && <ReportQuestionDialog reportId={question.id} deadline={question.deadline}
      onClose={() => setQuestion(null)} onSent={(protocol) => {
        setQuestion(null);
        setQuestionNotice(`Dúvida registrada em Ocorrências${protocol ? ` · ${protocol}` : ''}.`);
      }} />}
    {ackOpen&&selected?<div className="wf-overlay" role="presentation"><DialogFrame className="wf-modal" aria-label="Registrar ciência"><div className="wf-modal-header"><span>CIÊNCIA DA LEITURA</span><button type="button" onClick={()=>setAckOpen(false)} aria-label="Fechar"><X size={20}/></button></div><h2>Registrar ciência deste fechamento?</h2><p>Este registro é opcional. Ele confirma que você teve ciência desta versão e não representa concordância ou aprovação do conteúdo.</p><div className="wf-info"><ShieldCheck size={18}/><span>Sua identidade e a assinatura configurada no perfil serão registradas com data, hora e protocolo.</span></div>{error?<InlineNotice as="p" role="alert">{error}</InlineNotice>:null}<div className="wf-modal-actions"><Button variant="workflowOutline" type="button" onClick={()=>setAckOpen(false)}>Agora não</Button><Button variant="workflowPrimary" type="button" disabled={acknowledging} onClick={()=>void acknowledge()}>{acknowledging?'Registrando…':'Registrar ciência'}</Button></div></DialogFrame></div>:null}
  </div></section></Shell>;
}
