import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Eye, FileText, Loader2, Mail, Printer,
  RefreshCw, RotateCcw, Send, Trash2, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { ExecutiveReportPaperV15 } from '../../components/reports/ExecutiveReportPaperV15';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../lib/reportComposition';
import {
  buildExecutiveReading, groupHours, normalizeIntelligenceSnapshot,
  type IntelligenceSnapshot,
} from '../../lib/reportIntelligence';
import {
  decisionOptionsV14, deliveryRowsForPdf, deliveryTimingLabelV14,
  formatHoursV14, isAlertDismissed, periodLabelV14, reportKpisV14,
  type DeliveryPerformanceRow, type DismissedReportAlert, type ReportCloseAlert,
  type ReportLifecycleStatus,
} from '../../lib/reportV14';
import { buildReportAlertsV15, capacitySignalV15 } from '../../lib/reportV15';

type Company={id:string;name:string;logoUrl?:string|null;serviceType?:string|null;servicePlan?:string|null};
type Report={
  id:string;companyId:string;title:string;reportType:ReportType;periodStart:string;periodEnd:string;
  status:ReportLifecycleStatus;summary:string;movements:string[];decisions:string[];risks:string[];nextSteps:string[];
  snapshot:IntelligenceSnapshot|null;protocol:string;updatedAt:string;version:number;revisionParentId?:string|null;
  dismissedAlerts:DismissedReportAlert[];internalNote:string;dataRefreshedAt?:string|null;
  reviewStartedAt?:string|null;approvedAt?:string|null;sentAt?:string|null;sentTo:string[];
};
type FreshPeriodData={snapshot:IntelligenceSnapshot;deliveries:DeliveryPerformanceRow[]};

const emptyEditor:ReportEditor={summary:'',movements:'',decisions:'',risks:'',nextSteps:''};
const statusLabel:Record<ReportLifecycleStatus,string>={draft:'Rascunho',review:'Em revisão',approved:'Aprovado',sent:'Enviado',published:'Publicado',archived:'Arquivado'};

function isoDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function monthlyPeriod(date=new Date()){return{start:isoDate(new Date(date.getFullYear(),date.getMonth(),1)),end:isoDate(new Date(date.getFullYear(),date.getMonth()+1,0))};}
function quarterlyPeriod(date=new Date()){const startMonth=Math.floor(date.getMonth()/3)*3;return{start:isoDate(new Date(date.getFullYear(),startMonth,1)),end:isoDate(new Date(date.getFullYear(),startMonth+3,0))};}
function quarterKey(value:string){const[year,month]=value.split('-').map(Number);return `${year}-Q${Math.floor((month-1)/3)+1}`;}
function quarterPeriod(value:string){const[yearText,quarterText]=value.split('-Q');const year=Number(yearText),quarter=Number(quarterText),startMonth=(quarter-1)*3;return{start:isoDate(new Date(year,startMonth,1)),end:isoDate(new Date(year,startMonth+3,0))};}
function quarterOptions(){const year=new Date().getFullYear();const options:Array<{value:string;label:string}>=[];for(let y=year+1;y>=year-6;y-=1)for(let q=4;q>=1;q-=1)options.push({value:`${y}-Q${q}`,label:`${q}º trimestre · ${y}`});return options;}
function trendStart(start:string,type:ReportType){if(type==='quarterly')return start;const[year,month]=start.split('-').map(Number);return isoDate(new Date(year,month-6,1));}
function lines(value:string){return String(value||'').split('\n').map((item)=>item.trim()).filter(Boolean);}
function formatDate(value?:string|null){if(!value)return'—';const date=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
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
function firstSentence(value?:string|null){return String(value||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s/)[0]?.slice(0,180)||'';}
function demandOptions(snapshot:IntelligenceSnapshot){
  const values=snapshot.records.filter((record)=>record.includeInReport).filter((record)=>record.type!=='meeting'||record.requiresAction).map((record)=>record.summary?`${record.title} — ${firstSentence(record.summary)}`:record.title).filter(Boolean);
  return Array.from(new Set(values)).slice(0,12);
}

function TextField({title,value,onChange,helper,rows=5,locked}:{title:string;value:string;onChange:(value:string)=>void;helper:string;rows?:number;locked:boolean}){
  return <div className="reports-v15-text-field"><div><h3>{title}</h3><p>{helper}</p></div><textarea rows={rows} value={value} readOnly={locked} onChange={(event)=>onChange(event.target.value)}/></div>;
}

export function AdminReportsPageV15(){
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
  const alerts=useMemo(()=>snapshot?buildReportAlertsV15(snapshot,deliveries):[],[snapshot,deliveries]);
  const unresolvedAlerts=useMemo(()=>alerts.filter((item)=>!isAlertDismissed(item,dismissedAlerts)),[alerts,dismissedAlerts]);
  const unresolvedBlocking=useMemo(()=>unresolvedAlerts.filter((item)=>item.blocking),[unresolvedAlerts]);
  const decisionOptions=useMemo(()=>snapshot?Array.from(new Set([...decisionOptionsV14(snapshot),...lines(editor.decisions)])):[],[snapshot,editor.decisions]);
  const demandChoices=useMemo(()=>snapshot?Array.from(new Set([...demandOptions(snapshot),...lines(editor.movements)])):[],[snapshot,editor.movements]);
  const selectedDecisions=useMemo(()=>new Set(lines(editor.decisions)),[editor.decisions]);
  const selectedDemands=useMemo(()=>new Set(lines(editor.movements)),[editor.movements]);
  const kpis=useMemo(()=>snapshot?reportKpisV14(snapshot,deliveries):null,[snapshot,deliveries]);
  const hourGroups=useMemo(()=>snapshot?groupHours(snapshot).slice(0,6):[],[snapshot]);
  const periodDeliveries=useMemo(()=>snapshot?deliveryRowsForPdf(snapshot,deliveries):[],[snapshot,deliveries]);
  const capacitySignal=useMemo(()=>snapshot?capacitySignalV15(snapshot):null,[snapshot]);
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
    const demands=demandOptions(fresh.snapshot).slice(0,4);
    const sourceSnapshot:any={...fresh.snapshot,deliveryPerformanceV14:fresh.deliveries};
    const payload={company_id:selectedCompany.id,title:`Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,report_type:reportType,period_start:periodStart,period_end:periodEnd,reference_month:`${periodStart.slice(0,7)}-01`,status:'draft',version,revision_parent_id:parentId,executive_summary:base.summary,movements:demands,decisions:decisions.length?decisions:lines(base.decisions),risks:lines(base.risks),next_steps:lines(base.nextSteps),source_snapshot:sourceSnapshot,service_type_snapshot:fresh.snapshot.contract.serviceType||selectedCompany.serviceType||null,service_plan_snapshot:fresh.snapshot.contract.servicePlan||selectedCompany.servicePlan||null,contracted_hours_snapshot:fresh.snapshot.contract.contractedHoursPeriod,data_refreshed_at:new Date().toISOString(),dismissed_alerts:[],internal_note:null};
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
  function toggleSelection(value:string,kind:'decisions'|'movements'){if(!canEdit)return;const current=new Set(lines(editor[kind]));current.has(value)?current.delete(value):current.add(value);setEditor((state)=>({...state,[kind]:Array.from(current).join('\n')}));}

  async function refreshData(){
    if(!supabase||!activeReport||!canEdit)return;setSaving(true);setError('');
    try{const fresh=await fetchFreshPeriod(companyId,reportType,periodStart,periodEnd);const sourceSnapshot:any={...fresh.snapshot,deliveryPerformanceV14:fresh.deliveries};const result=await supabase.from('reports').update({source_snapshot:sourceSnapshot,data_refreshed_at:new Date().toISOString(),service_type_snapshot:fresh.snapshot.contract.serviceType||selectedCompany?.serviceType||null,service_plan_snapshot:fresh.snapshot.contract.servicePlan||selectedCompany?.servicePlan||null,contracted_hours_snapshot:fresh.snapshot.contract.contractedHoursPeriod}).eq('id',activeReport.id);if(result.error)throw result.error;setSnapshot(fresh.snapshot);setLiveSnapshot(fresh.snapshot);setDeliveries(fresh.deliveries);setNotice('Dados automáticos atualizados. Sua leitura foi preservada.');await loadBase();}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível atualizar os dados.');}finally{setSaving(false);}
  }
  async function startReview(){if(!supabase||!activeReport||activeReport.status!=='draft')return;setSaving(true);const now=new Date().toISOString();const result=await supabase.from('reports').update({status:'review',review_started_at:now}).eq('id',activeReport.id);if(result.error)setError(result.error.message);else{setNotice('Relatório em revisão. Confira fatos, alertas e sua leitura antes de aprovar.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}setSaving(false);}
  async function approveReport(){
    if(!supabase||!activeReport||!snapshot||activeReport.status!=='review')return;
    if(!editor.summary.trim()){setError('A leitura do período precisa estar preenchida antes da aprovação.');return;}
    if(unresolvedBlocking.length){setError(`Existem ${unresolvedBlocking.length} item(ns) que precisam ser corrigidos antes da aprovação.`);return;}
    setSaving(true);setError('');
    try{const user=await supabase.auth.getUser();if(user.error)throw user.error;const sourceSnapshot:any={...snapshot,deliveryPerformanceV14:deliveries};const now=new Date().toISOString();const result=await supabase.from('reports').update({status:'approved',approved_at:now,approved_by:user.data.user?.id||null,source_snapshot:sourceSnapshot,executive_summary:editor.summary,movements:lines(editor.movements),decisions:lines(editor.decisions),risks:lines(editor.risks),next_steps:lines(editor.nextSteps),internal_note:internalNote,dismissed_alerts:dismissedAlerts}).eq('id',activeReport.id);if(result.error)throw result.error;await supabase.from('activity_log').insert({company_id:companyId,event_type:'report_approved',entity_type:'report',entity_id:activeReport.id,metadata:{version:activeReport.version,period_start:periodStart,period_end:periodEnd}});setNotice('Relatório aprovado e congelado. A próxima ação é enviar ao cliente.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível aprovar o relatório.');}finally{setSaving(false);}
  }
  async function openSend(){if(!supabase||!activeReport)return;setSendMessage('');setError('');const contacts=await supabase.from('profiles').select('email,full_name,is_primary').eq('company_id',companyId).eq('role','client').eq('active',true).order('is_primary',{ascending:false});setSendRecipients((contacts.data||[]).map((item:any)=>item.email).filter(Boolean).join(', '));setSendOpen(true);}
  async function sendReport(){if(!supabase||!activeReport||activeReport.status!=='approved')return;const recipients=sendRecipients.split(/[;,]/).map((item)=>item.trim()).filter(Boolean);if(!recipients.length){setError('Informe pelo menos um e-mail de destinatário.');return;}setSending(true);setError('');try{const result=await supabase.functions.invoke('workspace-send-executive-report',{body:{report_id:activeReport.id,recipients,message:sendMessage}});if(result.error)throw result.error;if((result.data as any)?.error)throw new Error((result.data as any).error);setSendOpen(false);setNotice('Relatório disponibilizado no Workspace e enviado por e-mail.');await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível enviar o relatório.');}finally{setSending(false);}}
  async function createNewVersion(){if(!activeReport||!liveSnapshot||!['approved','sent','published'].includes(activeReport.status))return;setSaving(true);setError('');try{const fresh=await fetchFreshPeriod(companyId,reportType,periodStart,periodEnd);await createDraft(fresh,activeReport.version+1,activeReport.id);setNotice(`Versão ${activeReport.version+1} criada como novo rascunho.`);await loadBase();await loadPeriod(companyId,reportType,periodStart,periodEnd);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível criar nova versão.');}finally{setSaving(false);}}
  async function deleteReport(report:Report){if(!supabase||!['draft','review'].includes(report.status))return;const ok=window.confirm(`Excluir definitivamente ${periodLabelV14(report.reportType,report.periodStart)} · v${report.version}?`);if(!ok)return;const result=await supabase.from('reports').delete().eq('id',report.id).in('status',['draft','review']);if(result.error){setError(result.error.message);return;}setNotice('Rascunho excluído.');await loadBase();if(report.id===activeReport?.id)await loadPeriod(companyId,reportType,periodStart,periodEnd);}
  function dismissAlert(){if(!dismissTarget||!dismissReason.trim())return;setDismissedAlerts((current)=>[...current.filter((item)=>item.id!==dismissTarget.id),{id:dismissTarget.id,reason:dismissReason.trim(),dismissedAt:new Date().toISOString()}]);setDismissTarget(null);setDismissReason('');}
  function restoreAlert(id:string){if(!canEdit)return;setDismissedAlerts((current)=>current.filter((item)=>item.id!==id));}
  function printReport(){const original=document.title;document.body.classList.add('reports-v15-printing');document.title=`Relatório CALI RH - ${selectedCompany?.name||'Cliente'} - ${periodName}`;window.print();window.setTimeout(()=>{document.body.classList.remove('reports-v15-printing');document.title=original;},800);}

  function primaryAction(){if(!activeReport)return null;if(activeReport.status==='draft')return <button className="primary" type="button" disabled={saving} onClick={()=>void startReview()}><Eye size={16}/>Iniciar revisão</button>;if(activeReport.status==='review')return <button className="primary" type="button" disabled={saving} onClick={()=>void approveReport()}><CheckCircle2 size={16}/>Aprovar relatório</button>;if(activeReport.status==='approved')return <button className="primary" type="button" disabled={saving} onClick={()=>void openSend()}><Send size={16}/>Enviar ao cliente</button>;return <button className="primary" type="button" onClick={()=>setPreviewOpen(true)}><Eye size={16}/>Ver relatório</button>;}

  if(loadingBase)return <Shell role="admin"><section className="page reports-admin-v15"><div className="data-loading"><Loader2 className="spin" size={20}/>Carregando Relatórios…</div></section></Shell>;

  const contractedMinutes=Math.max(0,Number(kpis?.contractedHours||0)*60);
  const usedMinutes=Math.max(0,Number(kpis?.consumedMinutes||0));
  const extraMinutes=Math.max(0,usedMinutes-contractedMinutes);
  const usagePercent=contractedMinutes?Math.round((usedMinutes/contractedMinutes)*100):null;

  return <Shell role="admin"><section className="page reports-admin-v15">
    <header className="reports-v15-heading"><div><span className="eyebrow">FECHAMENTO MENSAL</span><h1>Relatórios</h1><p>Confira os fatos, complete somente a leitura consultiva e aprove a versão que o cliente receberá.</p></div><div className="reports-v15-filters"><label>Cliente<select value={companyId} onChange={(event)=>setCompanyId(event.target.value)}>{companies.map((company)=><option value={company.id} key={company.id}>{company.name}</option>)}</select></label><label>Tipo<select value={reportType} onChange={(event)=>changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>{reportType==='monthly'?<label>Período<input type="month" value={periodStart.slice(0,7)} onChange={(event)=>changeMonth(event.target.value)}/></label>:<label>Período<select value={quarterKey(periodStart)} onChange={(event)=>changeQuarter(event.target.value)}>{quarters.map((option)=><option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}</div></header>

    {notice&&<div className="inline-notice success"><CheckCircle2 size={18}/>{notice}</div>}{error&&<div className="inline-notice"><AlertTriangle size={18}/>{error}</div>}

    {loadingPeriod?<div className="panel data-loading"><Loader2 className="spin" size={20}/>Fechando {periodName}…</div>:snapshot&&activeReport&&selectedCompany&&<>
      <div className="reports-v15-toolbar"><div><strong>{statusLabel[lifecycleStatus]}</strong><span>v{activeReport.version}</span><span>{autosaveState==='saving'?'Salvando…':autosaveState==='error'?'Falha no autosave':`Salvo automaticamente ${formatDateTime(lastSavedAt||activeReport.updatedAt)}`}</span></div><div>{canEdit&&<button className="secondary" type="button" disabled={saving} onClick={()=>void refreshData()}><RefreshCw size={15}/>Atualizar dados</button>}{['approved','sent','published'].includes(lifecycleStatus)&&<button className="secondary" type="button" disabled={saving} onClick={()=>void createNewVersion()}><RotateCcw size={15}/>Nova versão</button>}<button className="secondary" type="button" onClick={()=>setPreviewOpen(true)}><FileText size={15}/>Visualizar relatório</button>{primaryAction()}</div></div>

      <main className="reports-v15-close">
        <section className="reports-v15-section reports-v15-identification"><div className="reports-v15-section-heading"><span>01</span><div><h2>Identificação do fechamento</h2><p>Informações automáticas da conta e do período.</p></div></div><dl><div><dt>Cliente</dt><dd>{selectedCompany.name}</dd></div><div><dt>Período</dt><dd>{periodName}</dd></div><div><dt>Projeto / ciclo</dt><dd>{snapshot.cycleContext?.projectName||kpis?.cycleLabel||snapshot.projects[0]?.name||'—'}</dd></div><div><dt>Status</dt><dd>{statusLabel[lifecycleStatus]}</dd></div></dl></section>

        <section className="reports-v15-section reports-v15-capacity-admin"><div className="reports-v15-section-heading"><span>02</span><div><h2>Uso da capacidade contratada</h2><p>Horas são fatos do Workspace e não podem ser alteradas no relatório.</p></div></div><div className="reports-v15-capacity-admin-numbers"><div><small>Contratadas</small><strong>{kpis?.contractedHours?`${kpis.contractedHours}h`:'—'}</strong></div><div><small>Utilizadas</small><strong>{formatHoursV14(usedMinutes)}</strong></div><div><small>{extraMinutes>0?'Consumo adicional':'Capacidade utilizada'}</small><strong>{extraMinutes>0?`+${formatHoursV14(extraMinutes)}`:usagePercent===null?'—':`${usagePercent}%`}</strong></div></div>{contractedMinutes>0&&<div className="reports-v15-usage-track"><span style={{width:`${Math.min(100,Math.max(0,usagePercent||0))}%`}}/></div>}<p className="reports-v15-rule-note">Horas não utilizadas não acumulam e não geram crédito para o mês seguinte.</p>{extraMinutes>0&&capacitySignal?.message?<p className="reports-v15-capacity-signal">{capacitySignal.message}</p>:null}{hourGroups.length>0&&<table className="reports-v15-simple-table"><thead><tr><th>Onde houve dedicação</th><th>Horas</th></tr></thead><tbody>{hourGroups.map((item)=><tr key={item.label}><td>{item.label}</td><td>{formatHoursV14(item.minutes)}</td></tr>)}</tbody></table>}</section>

        <section className="reports-v15-section"><div className="reports-v15-section-heading"><span>03</span><div><h2>Entregas e andamento</h2><p>Planejado x realizado, com prazo calculado pela origem do projeto.</p></div></div>{periodDeliveries.length?<table className="reports-v15-simple-table deliveries"><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{periodDeliveries.map((item)=><tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream?<small>{item.workstream}</small>:null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table>:<p className="reports-v15-empty">Nenhum entregável movimentado neste período.</p>}</section>

        <section className="reports-v15-section"><div className="reports-v15-section-heading"><span>04</span><div><h2>Demandas recebidas no período</h2><p>Selecione somente solicitações e movimentos adicionais que ajudam o cliente a entender o mês.</p></div></div>{demandChoices.length?<div className="reports-v15-check-list">{demandChoices.map((item)=><label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDemands.has(item)} onChange={()=>toggleSelection(item,'movements')}/><span>{item}</span></label>)}</div>:<p className="reports-v15-empty">Nenhuma demanda adicional estruturada foi registrada no período.</p>}</section>

        <section className="reports-v15-section reports-v15-alert-section"><div className="reports-v15-section-heading"><span>05</span><div><h2>Conferência antes da aprovação</h2><p>{unresolvedAlerts.length?`${unresolvedAlerts.length} item(ns) merecem sua conferência.`:'Nenhuma pendência aberta.'}</p></div></div>{unresolvedAlerts.length?<div className="reports-v15-alert-list">{unresolvedAlerts.map((alert)=>{const dismissed=dismissedAlerts.find((item)=>item.id===alert.id);return <article key={alert.id}><div><strong>{alert.blocking?'Precisa corrigir':'Atenção'}</strong><span><b>{alert.title}</b><p>{alert.detail}</p>{dismissed?<small>Ignorado: {dismissed.reason}</small>:null}</span></div><div>{alert.actionHref?<a href={alert.actionHref}>{alert.actionLabel||'Ver origem'}</a>:null}{dismissed?<button type="button" disabled={!canEdit} onClick={()=>restoreAlert(alert.id)}>Restaurar</button>:<button type="button" disabled={!canEdit} onClick={()=>{setDismissTarget(alert);setDismissReason('');}}>Ignorar com justificativa</button>}</div></article>})}</div>:<div className="reports-v15-ok"><CheckCircle2 size={18}/>Os fatos estão consistentes para o fechamento.</div>}</section>

        <section className="reports-v15-section reports-v15-editor-section"><div className="reports-v15-section-heading"><span>06</span><div><h2>Leitura do período</h2><p>A IA prepara a primeira leitura. Você ajusta somente contexto, interpretação e posicionamento.</p></div></div><TextField title="Leitura do mês" value={editor.summary} onChange={(value)=>setEditor((current)=>({...current,summary:value}))} helper="Interprete o período sem repetir a tabela de entregas ou os números de horas." rows={6} locked={!canEdit}/><TextField title="Pontos de atenção para o cliente" value={editor.risks} onChange={(value)=>setEditor((current)=>({...current,risks:value}))} helper="Até 3 pontos. Só o que tem impacto e merece direcionamento executivo." rows={5} locked={!canEdit}/><TextField title={reportType==='quarterly'?'Prioridades do próximo trimestre':'Próximos movimentos'} value={editor.nextSteps} onChange={(value)=>setEditor((current)=>({...current,nextSteps:value}))} helper="Até 3 movimentos, com prazo ou dependência quando relevante." rows={5} locked={!canEdit}/></section>

        <section className="reports-v15-section"><div className="reports-v15-section-heading"><span>07</span><div><h2>Decisões relevantes</h2><p>Vêm dos registros da conta. Marque apenas o que tem valor executivo.</p></div></div>{decisionOptions.length?<div className="reports-v15-check-list">{decisionOptions.map((item)=><label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDecisions.has(item)} onChange={()=>toggleSelection(item,'decisions')}/><span>{item}</span></label>)}</div>:<p className="reports-v15-empty">Nenhuma decisão estruturada foi registrada neste período.</p>}</section>

        <details className="reports-v15-internal"><summary>Adicionar nota interna</summary><p>Visível somente para você. Não aparece no PDF, Workspace ou e-mail do cliente.</p><textarea rows={4} readOnly={!canEdit} value={internalNote} onChange={(event)=>setInternalNote(event.target.value)} placeholder="Anotação para a conversa ou para o próximo fechamento."/></details>

        <section className="reports-v15-history"><div className="reports-v15-section-heading"><span>08</span><div><h2>Histórico e versões</h2><p>Rascunhos e revisões podem ser excluídos. Aprovados e enviados ficam protegidos.</p></div></div><div className="reports-v15-history-table"><div className="head"><span>Período</span><span>Versão</span><span>Status</span><span>Data</span><span>Ações</span></div>{companyReports.slice(0,12).map((report)=><div className={report.id===activeReport.id?'active':''} key={report.id}><button type="button" className="period" onClick={()=>{setReportType(report.reportType);setPeriodStart(report.periodStart);setPeriodEnd(report.periodEnd);}}>{periodLabelV14(report.reportType,report.periodStart)}</button><span>v{report.version}</span><span>{statusLabel[report.status]}</span><span>{formatDateTime(report.sentAt||report.approvedAt||report.updatedAt)}</span><span className="actions"><button type="button" onClick={()=>{setReportType(report.reportType);setPeriodStart(report.periodStart);setPeriodEnd(report.periodEnd);}}>Abrir</button>{['draft','review'].includes(report.status)?<button type="button" className="delete" onClick={()=>void deleteReport(report)} aria-label="Excluir versão"><Trash2 size={14}/></button>:null}</span></div>)}</div></section>
      </main>
    </>}

    {dismissTarget&&<div className="modal-backdrop workspace-modal-backdrop reports-v15-modal-backdrop"><section className="modal-card reports-v15-small-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={()=>setDismissTarget(null)}><X size={19}/></button><span className="section-kicker">JUSTIFICATIVA INTERNA</span><h2>Ignorar este alerta?</h2><p><strong>{dismissTarget.title}</strong></p><textarea autoFocus rows={4} value={dismissReason} onChange={(event)=>setDismissReason(event.target.value)} placeholder="Registre por que este ponto não impede o fechamento."/><footer><button className="secondary" type="button" onClick={()=>setDismissTarget(null)}>Cancelar</button><button className="primary" type="button" disabled={!dismissReason.trim()} onClick={dismissAlert}>Confirmar justificativa</button></footer></section></div>}

    {sendOpen&&activeReport&&<div className="modal-backdrop workspace-modal-backdrop reports-v15-modal-backdrop"><section className="modal-card reports-v15-send-modal" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={()=>setSendOpen(false)}><X size={19}/></button><span className="section-kicker">ENVIAR AO CLIENTE</span><h2>Relatório aprovado · v{activeReport.version}</h2><p>Ao confirmar, esta versão ficará disponível no Workspace do cliente e os destinatários receberão a notificação por e-mail.</p><div className="reports-v15-send-channels"><label><input type="checkbox" checked readOnly/>Disponibilizar no Workspace</label><label><input type="checkbox" checked readOnly/>Enviar notificação por e-mail</label></div><label><span>Destinatários</span><input type="text" value={sendRecipients} onChange={(event)=>setSendRecipients(event.target.value)} placeholder="email@cliente.com, outro@cliente.com"/></label><label><span>Mensagem opcional</span><textarea rows={4} value={sendMessage} onChange={(event)=>setSendMessage(event.target.value)} placeholder="Uma observação curta antes do acesso ao relatório."/></label><footer><button className="secondary" type="button" disabled={sending} onClick={()=>setSendOpen(false)}>Cancelar</button><button className="primary" type="button" disabled={sending||!sendRecipients.trim()} onClick={()=>void sendReport()}>{sending?<Loader2 className="spin" size={16}/>:<Mail size={16}/>}Enviar relatório</button></footer></section></div>}

    {previewOpen&&snapshot&&activeReport&&selectedCompany&&<div className="modal-backdrop workspace-modal-backdrop reports-v15-preview-backdrop"><section className="modal-card reports-v15-preview-modal" role="dialog" aria-modal="true"><div className="reports-v15-preview-toolbar"><div><strong>Relatório executivo</strong><span>{selectedCompany.name} · {periodName} · v{activeReport.version}</span></div><div><button className="secondary" type="button" onClick={()=>setPreviewOpen(false)}><X size={16}/>Voltar para edição</button><button className="secondary" type="button" onClick={printReport}><Printer size={16}/>Baixar / imprimir PDF</button>{activeReport.status==='review'?<button className="primary" type="button" onClick={()=>void approveReport()}><CheckCircle2 size={16}/>Aprovar relatório</button>:activeReport.status==='approved'?<button className="primary" type="button" onClick={()=>void openSend()}><Send size={16}/>Enviar ao cliente</button>:null}</div></div><div className="reports-v15-preview-document reports-v15-print-source"><ExecutiveReportPaperV15 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport.protocol} deliveries={deliveries}/></div></section></div>}
  </section></Shell>;
}
