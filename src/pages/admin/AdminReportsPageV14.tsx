import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock3, Eye, FileText, History, Loader2, Lock,
  Mail, Pencil, Printer, RefreshCw, RotateCcw, Send, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { ExecutiveReportPaperV14 } from '../../components/reports/ExecutiveReportPaperV14';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../lib/reportComposition';
import { buildExecutiveReading, normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import {
  buildReportAlertsV14, decisionOptionsV14, isAlertDismissed, periodLabelV14, reportKpisV14,
  type DeliveryPerformanceRow, type DismissedReportAlert, type ReportCloseAlert,
  type ReportLifecycleStatus,
} from '../../lib/reportV14';

type Company = { id:string; name:string; logoUrl?:string|null; serviceType?:string|null; servicePlan?:string|null };
type Report = {
  id:string; companyId:string; title:string; reportType:ReportType; periodStart:string; periodEnd:string;
  status:ReportLifecycleStatus; summary:string; movements:string[]; decisions:string[]; risks:string[]; nextSteps:string[];
  snapshot:IntelligenceSnapshot|null; protocol:string; updatedAt:string; version:number; revisionParentId?:string|null;
  dismissedAlerts:DismissedReportAlert[]; internalNote:string; dataRefreshedAt?:string|null;
  reviewStartedAt?:string|null; approvedAt?:string|null; sentAt?:string|null; sentTo:string[];
};

type FreshPeriodData = { snapshot:IntelligenceSnapshot; deliveries:DeliveryPerformanceRow[] };
const emptyEditor:ReportEditor={summary:'',movements:'',decisions:'',risks:'',nextSteps:''};
const statusLabel:Record<ReportLifecycleStatus,string>={draft:'Rascunho automático',review:'Em revisão',approved:'Aprovado',sent:'Enviado',published:'Publicado (legado)',archived:'Arquivado'};

function isoDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function monthlyPeriod(date=new Date()){return{start:isoDate(new Date(date.getFullYear(),date.getMonth(),1)),end:isoDate(new Date(date.getFullYear(),date.getMonth()+1,0))};}
function quarterlyPeriod(date=new Date()){const startMonth=Math.floor(date.getMonth()/3)*3;return{start:isoDate(new Date(date.getFullYear(),startMonth,1)),end:isoDate(new Date(date.getFullYear(),startMonth+3,0))};}
function quarterKey(value:string){const[year,month]=value.split('-').map(Number);return `${year}-Q${Math.floor((month-1)/3)+1}`;}
function quarterPeriod(value:string){const[yearText,quarterText]=value.split('-Q');const year=Number(yearText),quarter=Number(quarterText),startMonth=(quarter-1)*3;return{start:isoDate(new Date(year,startMonth,1)),end:isoDate(new Date(year,startMonth+3,0))};}
function quarterOptions(){const year=new Date().getFullYear();const options:Array<{value:string;label:string}>=[];for(let y=year+1;y>=year-6;y-=1)for(let q=4;q>=1;q-=1)options.push({value:`${y}-Q${q}`,label:`${q}º trimestre · ${y}`});return options;}
function trendStart(start:string,type:ReportType){if(type==='quarterly')return start;const[year,month]=start.split('-').map(Number);return isoDate(new Date(year,month-6,1));}
function lines(value:string){return value.split('\n').map((item)=>item.trim()).filter(Boolean);}
function formatDateTime(value?:string|null){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);}
function dismissedFrom(value:unknown):DismissedReportAlert[]{return Array.isArray(value)?value.filter((item:any)=>item&&item.id&&item.reason).map((item:any)=>({id:String(item.id),reason:String(item.reason),dismissedAt:String(item.dismissedAt||item.dismissed_at||new Date().toISOString())})):[];}
function reportRow(row:any):Report{return{
  id:row.id,companyId:row.company_id,title:row.title,reportType:(row.report_type||'monthly') as ReportType,
  periodStart:String(row.period_start||row.reference_month).slice(0,10),periodEnd:String(row.period_end||row.reference_month).slice(0,10),status:row.status as ReportLifecycleStatus,
  summary:row.executive_summary||'',movements:Array.isArray(row.movements)?row.movements.map(String):[],decisions:Array.isArray(row.decisions)?row.decisions.map(String):[],risks:Array.isArray(row.risks)?row.risks.map(String):[],nextSteps:Array.isArray(row.next_steps)?row.next_steps.map(String):[],
  snapshot:normalizeIntelligenceSnapshot(row.source_snapshot),protocol:row.protocol||'—',updatedAt:row.updated_at,version:Number(row.version||1),revisionParentId:row.revision_parent_id,
  dismissedAlerts:dismissedFrom(row.dismissed_alerts),internalNote:row.internal_note||'',dataRefreshedAt:row.data_refreshed_at,reviewStartedAt:row.review_started_at,approvedAt:row.approved_at,sentAt:row.sent_at,sentTo:Array.isArray(row.sent_to)?row.sent_to.map(String):[],
};}
function editorFrom(report:Report):ReportEditor{return{summary:report.summary,movements:report.movements.join('\n'),decisions:report.decisions.join('\n'),risks:report.risks.join('\n'),nextSteps:report.nextSteps.join('\n')};}
function frozenDeliveryRows(snapshot:IntelligenceSnapshot|null){const raw=(snapshot as any)?.deliveryPerformanceV14;return Array.isArray(raw)?raw as DeliveryPerformanceRow[]:null;}

function NarrativeField({label,title,value,onChange,helper,rows=5,locked}:{label:string;title:string;value:string;onChange:(value:string)=>void;helper:string;rows?:number;locked:boolean}){
  return <section className="reports-v14-narrative-field"><header><div><span>{label}</span><h3>{title}</h3></div><b>{locked?<><Lock size={13}/>congelado</>:<><Pencil size={13}/>editável</>}</b></header><p>{helper}</p><textarea rows={rows} value={value} readOnly={locked} onChange={(event)=>onChange(event.target.value)}/></section>;
}

export function AdminReportsPageV14(){
  const initial=monthlyPeriod();
  const[companies,setCompanies]=useState<Company[]>([]),[reports,setReports]=useState<Report[]>([]);
  const[companyId,setCompanyId]=useState(''),[reportType,setReportType]=useState<ReportType>('monthly'),[periodStart,setPeriodStart]=useState(initial.start),[periodEnd,setPeriodEnd]=useState(initial.end);
  const[snapshot,setSnapshot]=useState<IntelligenceSnapshot|null>(null),[liveSnapshot,setLiveSnapshot]=useState<IntelligenceSnapshot|null>(null),[deliveries,setDeliveries]=useState<DeliveryPerformanceRow[]>([]),[activeReport,setActiveReport]=useState<Report|null>(null);
  const[editor,setEditor]=useState<ReportEditor>(emptyEditor),[internalNote,setInternalNote]=useState(''),[dismissedAlerts,setDismissedAlerts]=useState<DismissedReportAlert[]>([]);
  const[loadingBase,setLoadingBase]=useState(true),[loadingPeriod,setLoadingPeriod]=useState(false),[saving,setSaving]=useState(false),[autosaveState,setAutosaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle'),[lastSavedAt,setLastSavedAt]=useState<string|null>(null);
  const[notice,setNotice]=useState(''),[error,setError]=useState(''),[previewOpen,setPreviewOpen]=useState(false);
  const[dismissTarget,setDismissTarget]=useState<ReportCloseAlert|null>(null),[dismissReason,setDismissReason]=useState('');
  const[sendOpen,setSendOpen]=useState(false),[sendRecipients,setSendRecipients]=useState(''),[sendMessage,setSendMessage]=useState(''),[sending,setSending]=useState(false);
  const lastSavedPayload=useRef('');

  const selectedCompany=useMemo(()=>companies.find((item)=>item.id===companyId)||null,[companies,companyId]);
  const periodName=periodLabelV14(reportType,periodStart),quarters=useMemo(()=>quarterOptions(),[]);
  const companyReports=useMemo(()=>reports.filter((item)=>item.companyId===companyId).sort((a,b)=>b.periodStart.localeCompare(a.periodStart)||b.version-a.version),[reports,companyId]);
  const alerts=useMemo(()=>snapshot?buildReportAlertsV14(snapshot,deliveries):[],[snapshot,deliveries]);
  const unresolvedAlerts=useMemo(()=>alerts.filter((item)=>!isAlertDismissed(item,dismissedAlerts)),[alerts,dismissedAlerts]);
  const unresolvedBlocking=useMemo(()=>unresolvedAlerts.filter((item)=>item.blocking),[unresolvedAlerts]);
  const decisionOptions=useMemo(()=>snapshot?decisionOptionsV14(snapshot):[],[snapshot]);
  const selectedDecisions=useMemo(()=>new Set(lines(editor.decisions)),[editor.decisions]);
  const kpis=useMemo(()=>snapshot?reportKpisV14(snapshot,deliveries):null,[snapshot,deliveries]);
  const canEdit=Boolean(activeReport&&(activeReport.status==='draft'||activeReport.status==='review'));
  const lifecycleStatus=activeReport?.status||'draft';

  useEffect(()=>{void loadBase();},[]);
  useEffect(()=>{if(companyId&&periodStart&&periodEnd)void loadPeriod(companyId,reportType,periodStart,periodEnd);},[companyId,reportType,periodStart,periodEnd]);
  useEffect(()=>{if(!previewOpen&&!dismissTarget&&!sendOpen)return;document.body.classList.add('workspace-modal-open');return()=>document.body.classList.remove('workspace-modal-open');},[previewOpen,dismissTarget,sendOpen]);

  useEffect(()=>{
    if(!activeReport||!canEdit)return;
    const payload=JSON.stringify({summary:editor.summary,movements:editor.movements,decisions:editor.decisions,risks:editor.risks,nextSteps:editor.nextSteps,internalNote,dismissedAlerts});
    if(payload===lastSavedPayload.current)return;
    setAutosaveState('saving');
    const timer=window.setTimeout(async()=>{
      if(!supabase)return;
      const result=await supabase.from('reports').update({executive_summary:editor.summary,movements:lines(editor.movements),decisions:lines(editor.decisions),risks:lines(editor.risks),next_steps:lines(editor.nextSteps),internal_note:internalNote,dismissed_alerts:dismissedAlerts}).eq('id',activeReport.id);
      if(result.error){setAutosaveState('error');setError(`Autosave: ${result.error.message}`);return;}
      lastSavedPayload.current=payload;setAutosaveState('saved');setLastSavedAt(new Date().toISOString());
    },850);
    return()=>window.clearTimeout(timer);
  },[activeReport?.id,canEdit,editor,internalNote,dismissedAlerts]);

  async function loadBase(){
    if(!supabase)return;setLoadingBase(true);setError('');
    try{
      const[companyResult,reportResult]=await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,service_type,service_plan').neq('status','closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at,version,revision_parent_id,dismissed_alerts,internal_note,data_refreshed_at,review_started_at,approved_at,sent_at,sent_to').neq('status','archived').order('period_start',{ascending:false}).order('version',{ascending:false}),
      ]);
      if(companyResult.error)throw companyResult.error;if(reportResult.error)throw reportResult.error;
      const nextCompanies:Company[]=await Promise.all((companyResult.data||[]).map(async(row:any)=>({id:row.id,name:row.display_name,logoUrl:await resolveWorkspaceMedia(row.logo_url,86400,true),serviceType:row.service_type,servicePlan:row.service_plan})));
      setCompanies(nextCompanies);setReports((reportResult.data||[]).map(reportRow));if(!companyId&&nextCompanies.length)setCompanyId(nextCompanies[0].id);
    }catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível carregar Relatórios.');}finally{setLoadingBase(false);}
  }

  async function fetchFreshPeriod(nextCompanyId:string,nextType:ReportType,nextStart:string,nextEnd:string):Promise<FreshPeriodData>{
    if(!supabase)throw new Error('Supabase não configurado.');
    const seriesFrom=trendStart(nextStart,nextType);
    const[snapshotResult,seriesResult,performanceResult]=await Promise.all([
      supabase.rpc('build_report_intelligence_snapshot',{p_company_id:nextCompanyId,p_period_start:nextStart,p_period_end:nextEnd}),
      supabase.rpc('build_report_monthly_series',{p_company_id:nextCompanyId,p_period_start:seriesFrom,p_period_end:nextEnd}),
      supabase.from('deliverable_delivery_performance').select('*').eq('company_id',nextCompanyId),
    ]);
    if(snapshotResult.error)throw snapshotResult.error;if(seriesResult.error)throw seriesResult.error;if(performanceResult.error)throw performanceResult.error;
    const fresh=normalizeIntelligenceSnapshot({...((snapshotResult.data||{}) as object),monthlySeries:seriesResult.data});
    if(!fresh)throw new Error('A memória automática do período retornou em formato inválido.');
    return{snapshot:fresh,deliveries:(performanceResult.data||[]) as DeliveryPerformanceRow[]};
  }

  async function createDraft(fresh:FreshPeriodData,version=1,parentId:string|null=null){
    if(!supabase||!selectedCompany)throw new Error('Cliente não selecionado.');
    const base=buildExecutiveReading(fresh.snapshot,reportType);
    const decisions=decisionOptionsV14(fresh.snapshot).slice(0,4);
    const sourceSnapshot:any={...fresh.snapshot,deliveryPerformanceV14:fresh.deliveries};
    const payload={company_id:selectedCompany.id,title:`Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,report_type:reportType,period_start:periodStart,period_end:periodEnd,reference_month:`${periodStart.slice(0,7)}-01`,status:'draft',version,revision_parent_id:parentId,executive_summary:base.summary,movements:lines(base.movements),decisions:decisions.length?decisions:lines(base.decisions),risks:lines(base.risks),next_steps:lines(base.nextSteps),source_snapshot:sourceSnapshot,service_type_snapshot:fresh.snapshot.contract.serviceType||selectedCompany.serviceType||null,service_plan_snapshot:fresh.snapshot.contract.servicePlan||selectedCompany.servicePlan||null,contracted_hours_snapshot:fresh.snapshot.contract.contractedHoursPeriod,data_refreshed_at:new Date().toISOString(),dismissed_alerts:[],internal_note:null};
    const result=await supabase.from('reports').insert(payload).select('id').single();if(result.error)throw result.error;
    await supabase.from('activity_log').insert({company_id:selectedCompany.id,event_type:'report_draft_generated',entity_type:'report',entity_id:result.data.id,metadata:{report_type:reportType,period_start:periodStart,period_end:periodEnd,version}});
  }

  async function loadPeriod(nextCompanyId:string,nextType:ReportType,nextStart:string,nextEnd:string){
    if(!supabase)return;setLoadingPeriod(true);setError('');setNotice('');setAutosaveState('idle');
    try{
      const fresh=await fetchFreshPeriod(nextCompanyId,nextType,nextStart,nextEnd);setLiveSnapshot(fresh.snapshot);
      const reportResult=await supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at,version,revision_parent_id,dismissed_alerts,internal_note,data_refreshed_at,review_started_at,approved_at,sent_at,sent_to').eq('company_id',nextCompanyId).eq('report_type',nextType).eq('period_start',nextStart).eq('period_end',nextEnd).order('version',{ascending:false}).limit(1).maybeSingle();
      if(reportResult.error)throw reportResult.error;
      if(!reportResult.data||reportResult.data.status==='archived'){
        const version=reportResult.data?Number(reportResult.data.version||1)+1:1;await createDraft(fresh,version,reportResult.data?.id||null);await loadBase();return await loadPeriod(nextCompanyId,nextType,nextStart,nextEnd);
      }
      const report=reportRow(reportResult.data),savedSnapshot=report.snapshot||fresh.snapshot;
      const frozen=frozenDeliveryRows(savedSnapshot);const useFrozen=['approved','sent','published'].includes(report.status)&&frozen;
      setActiveReport(report);setSnapshot(savedSnapshot);setDeliveries(useFrozen?frozen!:fresh.deliveries);setEditor(editorFrom(report));setInternalNote(report.internalNote);setDismissedAlerts(report.dismissedAlerts);setLastSavedAt(report.updatedAt);
      lastSavedPayload.current=JSON.stringify({summary:report.summary,movements:report.movements.join('\n'),decisions:report.decisions.join('\n'),risks:report.risks.join('\n'),nextSteps:report.nextSteps.join('\n'),internalNote:report.internalNote,dismissedAlerts:report.dismissedAlerts});
    }catch(requestError){setSnapshot(null);setLiveSnapshot(null);setDeliveries([]);setActiveReport(null);setEditor(emptyEditor);setError(requestError instanceof Error?requestError.message:'Não foi possível montar o fechamento.');}finally{setLoadingPeriod(false);}
  }

  function changeType(next:ReportType){setReportType(next);const anchor=new Date(`${periodStart}T12:00:00`),period=next==='monthly'?monthlyPeriod(anchor):quarterlyPeriod(anchor);setPeriodStart(period.start);setPeriodEnd(period.end);}
  function changeMonth(value:string){const[year,month]=value.split('-').map(Number),period=monthlyPeriod(new Date(year,month-1,1));setPeriodStart(period.start);setPeriodEnd(period.end);}
  function changeQuarter(value:string){const period=quarterPeriod(value);setPeriodStart(period.start);setPeriodEnd(period.end);}
  function toggleDecision(value:string){if(!canEdit)return;const next=new Set(selectedDecisions);next.has(value)?next.delete(value):next.add(value);setEditor((current)=>({...current,decisions:Array.from(next).join('\n')}));}

  async function refreshData(){
    if(!supabase||!activeReport||!canEdit)return;setSaving(true);setError('');
    try{const fresh=await fetchFreshPeriod(companyId,reportType,periodStart,periodEnd);const sourceSnapshot:any={...fresh.snapshot,deliveryPerformanceV14:fresh.deliveries};const result=await supabase.from('reports').update({source_snapshot:sourceSnapshot,data_refreshed_at:new Date().toISOString(),service_type_snapshot:fresh.snapshot.contract.serviceType||selectedCompany?.serviceType||null,service_plan_snapshot:fresh.snapshot.contract.servicePlan||selectedCompany?.servicePlan||null,contracted_hours_snapshot:fresh.snapshot.contract.contractedHoursPeriod}).eq('id',activeReport.id);if(result.error)throw result.error;setSnapshot(fresh.snapshot);setLiveSnapshot(fresh.snapshot);setDeliveries(fresh.deliveries);setNotice('Dados automáticos recalculados. Sua leitura foi preservada.');await loadBase();}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível recalcular os dados.');}finally{setSaving(false);}
  }

  async function startReview(){if(!supabase||!activeReport||activeReport.status!=='draft')return;setSaving(true);const now=new Date().toISOString();const result=await supabase.from('reports').update({status:'review',review_started_at:now}).eq('id',activeReport.id);if(result.error)setError(result.error.message);else{setNotice('Relatório em revisão. Confira a leitura e os alertas antes de aprovar.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}setSaving(false);}

  async function approveReport(){
    if(!supabase||!activeReport||!snapshot||activeReport.status!=='review')return;
    if(!editor.summary.trim()){setError('A leitura do período precisa estar preenchida antes da aprovação.');return;}
    if(unresolvedBlocking.length){setError(`Existem ${unresolvedBlocking.length} alerta(s) bloqueante(s). Resolva ou descarte conscientemente com justificativa antes de aprovar.`);return;}
    setSaving(true);setError('');
    try{const user=await supabase.auth.getUser();if(user.error)throw user.error;const sourceSnapshot:any={...snapshot,deliveryPerformanceV14:deliveries};const now=new Date().toISOString();const result=await supabase.from('reports').update({status:'approved',approved_at:now,approved_by:user.data.user?.id||null,source_snapshot:sourceSnapshot,executive_summary:editor.summary,movements:lines(editor.movements),decisions:lines(editor.decisions),risks:lines(editor.risks),next_steps:lines(editor.nextSteps),internal_note:internalNote,dismissed_alerts:dismissedAlerts}).eq('id',activeReport.id);if(result.error)throw result.error;await supabase.from('activity_log').insert({company_id:companyId,event_type:'report_approved',entity_type:'report',entity_id:activeReport.id,metadata:{version:activeReport.version,period_start:periodStart,period_end:periodEnd}});setNotice('Relatório aprovado e congelado. A próxima ação é o envio ao cliente.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível aprovar o relatório.');}finally{setSaving(false);}
  }

  async function openSend(){
    if(!supabase||!activeReport)return;setSendMessage('');setError('');
    const contacts=await supabase.from('profiles').select('email,full_name,is_primary').eq('company_id',companyId).eq('role','client').eq('active',true).order('is_primary',{ascending:false});
    setSendRecipients((contacts.data||[]).map((item:any)=>item.email).filter(Boolean).join(', '));setSendOpen(true);
  }

  async function sendReport(){
    if(!supabase||!activeReport||activeReport.status!=='approved')return;
    const recipients=sendRecipients.split(/[;,]/).map((item)=>item.trim()).filter(Boolean);if(!recipients.length){setError('Informe pelo menos um e-mail de destinatário.');return;}
    setSending(true);setError('');
    try{const result=await supabase.functions.invoke('workspace-send-executive-report',{body:{report_id:activeReport.id,recipients,message:sendMessage}});if(result.error)throw result.error;if((result.data as any)?.error)throw new Error((result.data as any).error);setSendOpen(false);setNotice('Relatório enviado ao cliente e registrado no histórico.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível enviar o relatório.');}finally{setSending(false);}
  }

  async function createNewVersion(){
    if(!activeReport||!liveSnapshot||!['approved','sent','published'].includes(activeReport.status))return;setSaving(true);setError('');
    try{const fresh=await fetchFreshPeriod(companyId,reportType,periodStart,periodEnd);await createDraft(fresh,activeReport.version+1,activeReport.id);setNotice(`Versão ${activeReport.version+1} criada como novo rascunho.`);await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível criar nova versão.');}finally{setSaving(false);}
  }

  function dismissAlert(){if(!dismissTarget||!dismissReason.trim())return;setDismissedAlerts((current)=>[...current.filter((item)=>item.id!==dismissTarget.id),{id:dismissTarget.id,reason:dismissReason.trim(),dismissedAt:new Date().toISOString()}]);setDismissTarget(null);setDismissReason('');}
  function restoreAlert(id:string){if(!canEdit)return;setDismissedAlerts((current)=>current.filter((item)=>item.id!==id));}
  function printReport(){const original=document.title;document.title=`Relatório CALI RH - ${selectedCompany?.name||'Cliente'} - ${periodName}`;window.print();window.setTimeout(()=>{document.title=original;},700);}

  function primaryAction(){
    if(!activeReport)return null;
    if(activeReport.status==='draft')return <button className="primary reports-v14-primary" type="button" disabled={saving} onClick={()=>void startReview()}><Eye size={16}/>Iniciar revisão</button>;
    if(activeReport.status==='review')return <button className="primary reports-v14-primary" type="button" disabled={saving} onClick={()=>void approveReport()}><CheckCircle2 size={16}/>Aprovar relatório</button>;
    if(activeReport.status==='approved')return <button className="primary reports-v14-primary" type="button" disabled={saving} onClick={()=>void openSend()}><Send size={16}/>Enviar ao cliente</button>;
    return <button className="primary reports-v14-primary" type="button" onClick={()=>setPreviewOpen(true)}><Eye size={16}/>Ver relatório</button>;
  }

  if(loadingBase)return <Shell role="admin"><section className="page reports-admin-v14"><div className="data-loading"><Loader2 className="spin" size={20}/>Carregando Relatórios…</div></section></Shell>;

  return <Shell role="admin"><section className="page reports-admin-v14">
    <header className="reports-v14-header"><div><span className="eyebrow">FECHAMENTO INTELIGENTE</span><h1>Relatórios</h1><p>O Workspace fecha os fatos do período automaticamente. Você revisa apenas o que exige leitura executiva, aprova e envia.</p></div><div className="reports-v14-filters"><label><span>Cliente</span><select value={companyId} onChange={(event)=>setCompanyId(event.target.value)}>{companies.map((company)=><option value={company.id} key={company.id}>{company.name}</option>)}</select></label><label><span>Tipo</span><select value={reportType} onChange={(event)=>changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>{reportType==='monthly'?<label><span>Período</span><input type="month" value={periodStart.slice(0,7)} onChange={(event)=>changeMonth(event.target.value)}/></label>:<label><span>Período</span><select value={quarterKey(periodStart)} onChange={(event)=>changeQuarter(event.target.value)}>{quarters.map((option)=><option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}</div></header>

    {notice&&<div className="inline-notice success"><CheckCircle2 size={18}/>{notice}</div>}{error&&<div className="inline-notice"><AlertTriangle size={18}/>{error}</div>}

    {loadingPeriod?<div className="panel data-loading"><Loader2 className="spin" size={20}/>Fechando {periodName}…</div>:snapshot&&activeReport&&selectedCompany&&<>
      <section className="reports-v14-commandbar"><div className="reports-v14-state"><span className={`reports-v14-status ${lifecycleStatus}`}>{statusLabel[lifecycleStatus]}</span><span>Versão {activeReport.version}</span><i/><span>{autosaveState==='saving'?'salvando…':autosaveState==='error'?'falha no autosave':`salvo automaticamente ${formatDateTime(lastSavedAt||activeReport.updatedAt)}`}</span></div><div className="reports-v14-actions">{canEdit&&<button className="secondary" type="button" disabled={saving} onClick={()=>void refreshData()}><RefreshCw size={15}/>Recalcular dados</button>}{['approved','sent','published'].includes(lifecycleStatus)&&<button className="secondary" type="button" disabled={saving} onClick={()=>void createNewVersion()}><RotateCcw size={15}/>Criar nova versão</button>}<button className="secondary" type="button" onClick={()=>setPreviewOpen(true)}><Printer size={15}/>Visualizar / PDF</button>{primaryAction()}</div></section>

      <div className="reports-v14-workspace"><main className="reports-v14-close-column">
        {kpis&&<section className="reports-v14-auto-reading"><header><div><Sparkles size={18}/><span><strong>Leitura automática do período</strong><small>Fatos vindos do Workspace · não editáveis aqui</small></span></div><b>Dados apurados {formatDateTime(activeReport.dataRefreshedAt||activeReport.updatedAt)}</b></header><div className="reports-v14-kpis"><article><span>Horas</span><strong>{Math.round(kpis.consumedMinutes/6)/10}h {kpis.contractedHours?`de ${kpis.contractedHours}h`:''}</strong></article><article><span>Entregas</span><strong>{kpis.plannedDeliveries?`${kpis.completedDeliveries} de ${kpis.plannedDeliveries}`:`${snapshot.deliverables.approvedCount} aprovadas`}</strong></article><article><span>Prazo</span><strong>{kpis.deliveryAdherence===null?'Sem base':`${kpis.deliveryAdherence}% aderente`}</strong></article><article><span>Ciclo</span><strong>{kpis.cyclePosition}</strong><small>{kpis.cycleLabel}</small></article></div></section>}

        <section className={`reports-v14-alerts ${unresolvedBlocking.length?'has-blocking':''}`}><header><div><AlertTriangle size={18}/><span><strong>Pendências de fechamento</strong><small>{unresolvedAlerts.length?`${unresolvedAlerts.length} ponto(s) para conferir`:'Nenhuma pendência aberta'}</small></span></div>{unresolvedBlocking.length>0&&<b>{unresolvedBlocking.length} bloqueante(s)</b>}</header>{alerts.length?<div className="reports-v14-alert-list">{alerts.map((alert)=>{const dismissed=dismissedAlerts.find((item)=>item.id===alert.id);return <article key={alert.id} className={`${alert.severity} ${dismissed?'dismissed':''}`}><i/><div><span><strong>{alert.title}</strong>{alert.blocking&&<b>bloqueante</b>}</span><p>{alert.detail}</p>{dismissed&&<small>Ignorado: {dismissed.reason}</small>}</div><div>{dismissed?<button type="button" disabled={!canEdit} onClick={()=>restoreAlert(alert.id)}>Restaurar</button>:<>{alert.actionHref&&<a href={alert.actionHref}>{alert.actionLabel||'Ver origem'}</a>}<button type="button" disabled={!canEdit} onClick={()=>{setDismissTarget(alert);setDismissReason('');}}>Ignorar com justificativa</button></>}</div></article>})}</div>:<div className="reports-v14-alert-empty"><CheckCircle2 size={19}/><span>O sistema não encontrou nenhuma exceção que precise da sua intervenção.</span></div>}</section>

        <section className="reports-v14-your-reading"><header><div><span className="section-kicker">SUA LEITURA</span><h2>O que os dados não conseguem dizer sozinhos</h2></div><span>{canEdit?'IA redige · você valida':'Versão congelada'}</span></header>
          <NarrativeField label="01" title="Leitura do período" value={editor.summary} onChange={(value)=>setEditor((current)=>({...current,summary:value}))} helper="3–5 linhas. Interprete o mês; não repita a lista de entregas." rows={6} locked={!canEdit}/>
          <NarrativeField label="02" title="Pontos de atenção" value={editor.risks} onChange={(value)=>setEditor((current)=>({...current,risks:value}))} helper="Até 3 no PDF. Prefira o formato: risco → recomendação. Se não houver, deixe vazio." rows={5} locked={!canEdit}/>
          <NarrativeField label="03" title={reportType==='quarterly'?'Prioridades do próximo trimestre':'Prioridades do próximo ciclo'} value={editor.nextSteps} onChange={(value)=>setEditor((current)=>({...current,nextSteps:value}))} helper="Até 3 movimentos. Indique prazo ou dependência quando isso for relevante." rows={5} locked={!canEdit}/>
        </section>

        <section className="reports-v14-decisions"><header><div><span className="section-kicker">DECISÕES DO PERÍODO</span><h2>Selecione o que merece entrar no relatório</h2></div><span>vem de Registros</span></header>{decisionOptions.length?<div>{decisionOptions.map((decision)=><label key={decision}><input type="checkbox" disabled={!canEdit} checked={selectedDecisions.has(decision)} onChange={()=>toggleDecision(decision)}/><span>{decision}</span></label>)}</div>:<p>Nenhuma decisão estruturada foi registrada neste período. O relatório não cria uma seção vazia.</p>}</section>

        <section className="reports-v14-internal-note"><div><ShieldCheck size={17}/><span><strong>Observação interna</strong><small>Nunca aparece para o cliente.</small></span></div><textarea rows={3} readOnly={!canEdit} value={internalNote} onChange={(event)=>setInternalNote(event.target.value)} placeholder="Algo para lembrar na conversa, mas que não deve ser escrito no relatório."/></section>
      </main>

      <aside className="reports-v14-preview"><header><div><FileText size={17}/><span><strong>Relatório final · 2 páginas</strong><small>O que você vê é o que o cliente recebe no Workspace.</small></span></div><button type="button" onClick={()=>setPreviewOpen(true)}>Abrir em tamanho real</button></header><div className="reports-v14-preview-scroll"><div className="reports-v14-preview-scale"><ExecutiveReportPaperV14 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport.protocol} deliveries={deliveries}/></div></div></aside>
      </div>

      <section className="reports-v14-history"><header><div><History size={18}/><span><strong>Histórico e versões</strong><small>O que já foi aprovado ou enviado nunca é alterado silenciosamente.</small></span></div><b>{companyReports.length}</b></header><div>{companyReports.slice(0,10).map((report)=><button key={report.id} type="button" className={report.id===activeReport.id?'active':''} onClick={()=>{setReportType(report.reportType);setPeriodStart(report.periodStart);setPeriodEnd(report.periodEnd);}}><FileText size={16}/><span><strong>{periodLabelV14(report.reportType,report.periodStart)} · v{report.version}</strong><small>{report.protocol}</small></span><em className={report.status}>{statusLabel[report.status]}</em></button>)}</div></section>
    </>}

    {dismissTarget&&<div className="modal-backdrop workspace-modal-backdrop reports-v14-modal-backdrop"><section className="modal-card reports-v14-small-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={()=>setDismissTarget(null)}><X size={19}/></button><span className="section-kicker">DESCARTAR ALERTA</span><h2>Por que este ponto não bloqueia o relatório?</h2><p><strong>{dismissTarget.title}</strong></p><textarea autoFocus rows={4} value={dismissReason} onChange={(event)=>setDismissReason(event.target.value)} placeholder="Registre o motivo. Essa justificativa fica no histórico interno."/><footer><button className="secondary" type="button" onClick={()=>setDismissTarget(null)}>Cancelar</button><button className="primary" type="button" disabled={!dismissReason.trim()} onClick={dismissAlert}>Ignorar conscientemente</button></footer></section></div>}

    {sendOpen&&activeReport&&<div className="modal-backdrop workspace-modal-backdrop reports-v14-modal-backdrop"><section className="modal-card reports-v14-send-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={()=>setSendOpen(false)}><X size={19}/></button><span className="section-kicker">ENVIAR AO CLIENTE</span><h2>Relatório aprovado · v{activeReport.version}</h2><p>O cliente receberá um e-mail com acesso ao relatório no CALI Workspace. O envio congela esta versão no histórico.</p><label><span>Destinatários</span><input type="text" value={sendRecipients} onChange={(event)=>setSendRecipients(event.target.value)} placeholder="email@cliente.com, outro@cliente.com"/><small>Separe mais de um e-mail por vírgula.</small></label><label><span>Mensagem opcional</span><textarea rows={4} value={sendMessage} onChange={(event)=>setSendMessage(event.target.value)} placeholder="Uma observação curta da Patrícia antes do link para o relatório."/></label><footer><button className="secondary" type="button" disabled={sending} onClick={()=>setSendOpen(false)}>Cancelar</button><button className="primary" type="button" disabled={sending||!sendRecipients.trim()} onClick={()=>void sendReport()}>{sending?<Loader2 className="spin" size={16}/>:<Mail size={16}/>}Enviar relatório</button></footer></section></div>}

    {previewOpen&&snapshot&&activeReport&&selectedCompany&&<div className="modal-backdrop workspace-modal-backdrop reports-v14-preview-backdrop"><section className="modal-card reports-v14-preview-modal" role="dialog" aria-modal="true"><div className="reports-v14-preview-toolbar"><div><strong>Relatório executivo · 2 páginas A4</strong><span>{selectedCompany.name} · {periodName} · v{activeReport.version}</span></div><div><button className="secondary" type="button" onClick={()=>setPreviewOpen(false)}><X size={16}/>Fechar</button><button className="primary" type="button" onClick={printReport}><Printer size={16}/>Imprimir / Salvar PDF</button></div></div><div className="reports-v14-full-document"><ExecutiveReportPaperV14 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport.protocol} deliveries={deliveries}/></div></section></div>}
  </section></Shell>;
}
