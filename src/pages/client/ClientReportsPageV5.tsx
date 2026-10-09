import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, FileText, ShieldCheck, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import type { ReportIdentityV55 } from '../../components/reports/ReportValidationV55';
import { supabase } from '../../lib/supabase';
import '../../styles/client-modules.css';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { type ReportType } from '../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';

type Report={
  id:string;title:string;reportType:ReportType;periodStart:string;periodEnd:string;summary:string;
  movements:string[];decisions:string[];risks:string[];nextSteps:string[];snapshot:IntelligenceSnapshot|null;
  protocol:string;publishedAt?:string|null;sentAt?:string|null;version:number;status:'sent'|'published';
  approvalIdentity?:ReportIdentityV55|null;ackIdentity?:ReportIdentityV55|null;acknowledgedAt?:string|null;
  ackProtocol?:string|null;approvedAt?:string|null;openCount:number;firstOpenedAt?:string|null;
  lastOpenedAt?:string|null;pdfCount:number;
};
type Company={name:string;logoUrl?:string|null;workspaceLogo?:boolean};

function rowToReport(row:any):Report{
  return{
    id:row.id,title:row.title,reportType:(row.report_type||'monthly') as ReportType,
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

export function ClientReportsPageV5(){
  const { user } = useWorkspaceAuth();
  const[reports,setReports]=useState<Report[]>([]);
  const[company,setCompany]=useState<Company|null>(null);
  const[selectedId,setSelectedId]=useState('');
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[expanded,setExpanded]=useState<Set<string>>(()=>new Set());
  const[periodFilter,setPeriodFilter]=useState('');
  const[ackOpen,setAckOpen]=useState(false);
  const[acknowledging,setAcknowledging]=useState(false);

  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    if(!ackOpen)return;
    document.body.classList.add('workspace-modal-open');
    return()=>document.body.classList.remove('workspace-modal-open');
  },[ackOpen]);

  async function load(preferredId?:string){
    if(!supabase)return;
    setLoading(true);setError('');
    try{
      const userId=user?.id;
      if(!userId)throw new Error('Sessão do cliente não encontrada.');
      const profile=await supabase.from('profiles').select('company_id').eq('id',userId).maybeSingle();
      if(profile.error)throw profile.error;
      const companyId=profile.data?.company_id;
      if(!companyId)throw new Error('Empresa vinculada ao acesso não encontrada.');
      const[companyResult,reportResult]=await Promise.all([
        supabase.from('companies').select('display_name,logo_url,logo_workspace_url').eq('id',companyId).maybeSingle(),
        supabase.from('reports').select('id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,sent_at,version,approval_identity_snapshot,acknowledgement_identity_snapshot,acknowledged_at,acknowledgement_protocol,approved_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count').eq('company_id',companyId).in('status',['sent','published']).order('period_start',{ascending:false}).order('version',{ascending:false})
      ]);
      if(companyResult.error)throw companyResult.error;
      if(reportResult.error)throw reportResult.error;
      const companyName=companyResult.data?.display_name||'Empresa';
      setCompany({name:companyName,logoUrl:null});
      const workspaceLogo=Boolean(companyResult.data?.logo_workspace_url);
      void resolveWorkspaceMedia(companyResult.data?.logo_workspace_url||companyResult.data?.logo_url,86400,true).then((logoUrl)=>setCompany({name:companyName,logoUrl,workspaceLogo}));
      const next=(reportResult.data||[]).map(rowToReport);
      setReports(next);
      const queryId=new URLSearchParams(window.location.search).get('report')||'';
      const desired=preferredId||queryId||selectedId;
      setSelectedId(next.some((item)=>item.id===desired)?desired:(next[0]?.id||''));
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível carregar os relatórios.');
    }finally{setLoading(false);}
  }

  async function recordOpen(id:string){
    if(!supabase)return;
    const result=await supabase.rpc('record_report_client_event_v55',{p_report_id:id,p_event_type:'opened'});
    if(result.error)return;
    const data=result.data as any;
    setReports((current)=>current.map((item)=>item.id===id?{
      ...item,
      openCount:Number(data?.open_count??item.openCount),
      firstOpenedAt:data?.first_opened_at||item.firstOpenedAt,
      lastOpenedAt:data?.last_opened_at||item.lastOpenedAt
    }:item));
  }

  const selected=useMemo(()=>reports.find((item)=>item.id===selectedId)||null,[reports,selectedId]);
  const periods=useMemo(()=>[...new Map(reports.map((report)=>[`${report.reportType}:${report.periodStart.slice(0,7)}`,periodLabel(report.reportType,report.periodStart)])).entries()],[reports]);
  const visibleReports=useMemo(()=>periodFilter?reports.filter((report)=>`${report.reportType}:${report.periodStart.slice(0,7)}`===periodFilter):reports,[reports,periodFilter]);

  function toggleDetails(id:string){
    setExpanded((current)=>{
      const next=new Set(current);
      next.has(id)?next.delete(id):next.add(id);
      return next;
    });
  }
  function noteReportOpened(report:Report){
    setSelectedId(report.id);
    void recordOpen(report.id);
  }
  function requestAcknowledge(report:Report){setError('');setSelectedId(report.id);setAckOpen(true);}
  async function acknowledge(){
    if(!selected||!supabase)return;
    setAcknowledging(true);setError('');
    try{
      if(!selected.openCount)await recordOpen(selected.id);
      const result=await supabase.rpc('acknowledge_report_v55',{p_report_id:selected.id});
      if(result.error)throw result.error;
      const data=result.data as any;
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

  return <Shell role="client"><section className="v2-client-module"><div className="wf">
    <div className="wf-head"><div><small>ÁREA DA EMPRESA / LEITURA EXECUTIVA</small><h1>Relatórios</h1><p>Fatos, evolução e encaminhamentos — não apenas gráficos.</p></div></div>
    {error?<div className="inline-notice" role="alert">{error}</div>:null}
    <div className="wf-controls"><strong>Fechamento do ciclo</strong><label className="wf-control-right"><CalendarDays size={14}/><span>Período</span><select value={periodFilter} onChange={(event)=>setPeriodFilter(event.target.value)}><option value="">Todos os períodos</option>{periods.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
    {!reports.length ? <div className="wf-empty"><FileText size={28}/><strong>Nenhum relatório foi liberado ainda.</strong><p>Quando a CALI enviar um fechamento, ele ficará disponível aqui.</p></div> : <>
      <div className="wf-report-selection" aria-label="Leituras disponíveis">{visibleReports.map(report=><button type="button" key={report.id} className={selectedId===report.id?'selected':''} onClick={()=>setSelectedId(report.id)}><strong>{report.title}</strong><span>{periodLabel(report.reportType,report.periodStart)} · v{report.version}</span></button>)}</div>
      {(() => {
        const reading=visibleReports.find(item=>item.id===selectedId)||visibleReports[0];
        return reading ? <div className="wf-report-layout"><section className="wf-report-paper"><span>LEITURA EXECUTIVA · {periodLabel(reading.reportType,reading.periodStart)}</span><h2>{reading.title}</h2><p>{reading.summary || 'O resumo executivo não foi informado nesta versão.'}</p>
          {([['01','Evidências e entregas',reading.movements],['02','Decisões necessárias',reading.decisions],['03','Pontos de atenção',reading.risks],['04','Próximos passos',reading.nextSteps]] as const).map(([n,title,items])=>items.length>0?<div className="wf-report-section" key={n}><h3>{n} · {title}</h3>{items.map((item,i)=><p key={i}>{item}</p>)}</div>:null)}
          <p>O relatório completo reúne os indicadores, as evidências e os registros desta publicação.</p><a className="wf-primary" href={`/cliente/relatorios/impressao/${reading.id}`} target="_blank" rel="noopener noreferrer" onClick={()=>noteReportOpened(reading)}>Ver relatório completo / PDF</a>
        </section><aside className="wf-report-side v2-burgundy-aside"><h3>Sobre a leitura</h3><p>{company?.name || 'Sua empresa'}</p><ul><li>Versão {reading.version}</li><li>Protocolo {reading.protocol}</li><li>Disponível desde {formatDateTime(reading.sentAt||reading.publishedAt)}</li><li>{reading.acknowledgedAt ? `Ciência em ${formatDateTime(reading.acknowledgedAt)}` : 'Ciência ainda não registrada'}</li></ul></aside></div> : <p className="wf-empty">Nenhum relatório neste período.</p>;
      })()}
      <section className="wf-records"><div className="wf-controls"><strong>Versões, acesso e ciência</strong><span>{visibleReports.length} {visibleReports.length===1?'relatório':'relatórios'}</span></div>{visibleReports.map((report)=>{
        const isExpanded=expanded.has(report.id);
        const viewed=Boolean(report.openCount||report.acknowledgedAt);
        return <article className="wf-report-version" key={report.id}><div className="wf-report-version-head"><button type="button" className="wf-inline" onClick={()=>toggleDetails(report.id)} aria-expanded={isExpanded} aria-controls={`report-detail-${report.id}`} aria-label={`${isExpanded?'Recolher':'Mostrar'} detalhes de ${report.title}`}><ChevronDown size={18}/></button><div><strong>{report.title}</strong><small>{periodLabel(report.reportType,report.periodStart)} · v{report.version} · {report.protocol}</small></div><span className="wf-tag">{viewed?'Visualizado':'Novo'}</span><span className="wf-tag">{report.acknowledgedAt?'Ciência registrada':'Ciência pendente'}</span></div>{isExpanded?<div id={`report-detail-${report.id}`} className="wf-report-version-detail"><p>Disponível desde {formatDateTime(report.sentAt||report.publishedAt)}{report.acknowledgedAt?` · Ciência em ${formatDateTime(report.acknowledgedAt)}`:''}</p><div className="wf-modal-actions"><a className="wf-primary" href={`/cliente/relatorios/impressao/${report.id}`} target="_blank" rel="noopener noreferrer" onClick={()=>noteReportOpened(report)}>Ver relatório</a>{!report.acknowledgedAt?<button type="button" className="wf-outline" onClick={()=>requestAcknowledge(report)}>Registrar ciência</button>:null}</div></div>:null}</article>;
      })}</section>
    </>}
    {ackOpen&&selected?<div className="wf-overlay" role="presentation"><section className="wf-modal" role="dialog" aria-modal="true" aria-label="Registrar ciência"><div className="wf-modal-header"><span>CIÊNCIA DA LEITURA</span><button type="button" onClick={()=>setAckOpen(false)} aria-label="Fechar"><X size={20}/></button></div><h2>Registrar ciência deste fechamento?</h2><p>Este registro é opcional. Ele confirma que você teve ciência desta versão e não representa concordância ou aprovação do conteúdo.</p><div className="wf-info"><ShieldCheck size={18}/><span>Sua identidade e a assinatura configurada no perfil serão registradas com data, hora e protocolo.</span></div>{error?<p className="inline-notice" role="alert">{error}</p>:null}<div className="wf-modal-actions"><button className="wf-outline" type="button" onClick={()=>setAckOpen(false)}>Agora não</button><button className="wf-primary" type="button" disabled={acknowledging} onClick={()=>void acknowledge()}>{acknowledging?'Registrando…':'Registrar ciência'}</button></div></section></div>:null}
  </div></section></Shell>;
}
