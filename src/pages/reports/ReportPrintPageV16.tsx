import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExecutiveReportPaperV16 } from '../../components/reports/ExecutiveReportPaperV16';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { type ReportEditor, type ReportType } from '../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import type { DeliveryPerformanceRow } from '../../lib/reportV14';

type Props={role:'admin'|'client'};
type Loaded={company:{name:string;logoUrl?:string|null};snapshot:IntelligenceSnapshot;editor:ReportEditor;reportType:ReportType;periodName:string;protocol:string;deliveries:DeliveryPerformanceRow[];version:number};
function periodLabel(type:ReportType,start:string){const[year,month]=start.split('-').map(Number);return type==='monthly'?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(year,month-1,1)):`${Math.floor((month-1)/3)+1}º trimestre de ${year}`;}
function editorOf(row:any):ReportEditor{return{summary:row.executive_summary||'',movements:Array.isArray(row.movements)?row.movements.map(String).join('\n'):'',decisions:Array.isArray(row.decisions)?row.decisions.map(String).join('\n'):'',risks:Array.isArray(row.risks)?row.risks.map(String).join('\n'):'',nextSteps:Array.isArray(row.next_steps)?row.next_steps.map(String).join('\n'):''};}
function deliveriesOf(snapshot:IntelligenceSnapshot){const raw=(snapshot as any)?.deliveryPerformanceV14;return Array.isArray(raw)?raw as DeliveryPerformanceRow[]:[];}
async function waitForPrintAssets(){const images=Array.from(document.images);await Promise.all(images.map((image)=>image.complete?Promise.resolve():new Promise<void>((resolve)=>{const done=()=>resolve();image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});})));try{await document.fonts?.ready;}catch{}}

export function ReportPrintPageV16({role}:Props){
  const{reportId}=useParams(),navigate=useNavigate();
  const[data,setData]=useState<Loaded|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const autoPrint=useMemo(()=>new URLSearchParams(window.location.search).get('print')==='1',[]);

  useEffect(()=>{
    const html=document.documentElement;
    const previousTheme=html.getAttribute('data-workspace-theme');
    const previousScheme=html.style.colorScheme;
    html.classList.add('report-print-v16-isolated');
    html.setAttribute('data-workspace-theme','day');
    html.style.colorScheme='light';
    document.body.classList.add('reports-v16-print-route');
    return()=>{
      html.classList.remove('report-print-v16-isolated');
      document.body.classList.remove('reports-v16-print-route');
      if(previousTheme)html.setAttribute('data-workspace-theme',previousTheme);else html.removeAttribute('data-workspace-theme');
      html.style.colorScheme=previousScheme;
    };
  },[]);

  useEffect(()=>{void load();},[reportId,role]);
  useEffect(()=>{if(!data||!autoPrint)return;let cancelled=false;void(async()=>{await waitForPrintAssets();if(cancelled)return;document.title=`Relatório CALI RH - ${data.company.name} - ${data.periodName}`;window.setTimeout(()=>{if(!cancelled)window.print();},220);})();return()=>{cancelled=true;};},[data,autoPrint]);

  async function load(){if(!supabase||!reportId)return;setLoading(true);setError('');try{let companyId='';if(role==='client'){const user=await supabase.auth.getUser();if(user.error)throw user.error;const profile=await supabase.from('profiles').select('company_id').eq('id',user.data.user?.id||'').maybeSingle();if(profile.error)throw profile.error;companyId=String(profile.data?.company_id||'');if(!companyId)throw new Error('Empresa vinculada ao acesso não encontrada.');}
      let query=supabase.from('reports').select('id,company_id,report_type,period_start,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,version').eq('id',reportId);
      if(role==='client')query=query.eq('company_id',companyId).in('status',['sent','published']);else query=query.neq('status','archived');
      const reportResult=await query.maybeSingle();if(reportResult.error)throw reportResult.error;const report=reportResult.data;if(!report)throw new Error('Relatório não encontrado ou não disponível para este acesso.');
      const snapshot=normalizeIntelligenceSnapshot(report.source_snapshot);if(!snapshot)throw new Error('A fotografia aprovada deste relatório não está disponível.');
      const companyResult=await supabase.from('companies').select('display_name,logo_url').eq('id',report.company_id).maybeSingle();if(companyResult.error)throw companyResult.error;
      const start=String(report.period_start||report.reference_month).slice(0,10),type=(report.report_type||'monthly') as ReportType;
      setData({company:{name:companyResult.data?.display_name||'Empresa',logoUrl:await resolveWorkspaceMedia(companyResult.data?.logo_url,86400,true)},snapshot,editor:editorOf(report),reportType:type,periodName:periodLabel(type,start),protocol:report.protocol||'—',deliveries:deliveriesOf(snapshot),version:Number(report.version||1)});
    }catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível abrir o relatório.');}finally{setLoading(false);}}

  if(loading)return <main className="report-print-v16-state"><Loader2 className="spin" size={22}/>Preparando versão para impressão…</main>;
  if(error||!data)return <main className="report-print-v16-state error"><strong>Não foi possível abrir o relatório.</strong><p>{error}</p><button type="button" onClick={()=>navigate(-1)}>Voltar</button></main>;
  return <main className="report-print-v16-page">
    <div className="report-print-v16-toolbar"><div><strong>Relatório executivo · v{data.version}</strong><span>{data.company.name} · {data.periodName}</span></div><div><button type="button" onClick={()=>navigate(-1)}><ArrowLeft size={16}/>Voltar</button><button className="primary" type="button" onClick={()=>window.print()}><Printer size={16}/>Imprimir / salvar PDF</button></div></div>
    <div className="report-print-v16-stage"><ExecutiveReportPaperV16 company={data.company} snapshot={data.snapshot} editor={data.editor} reportType={data.reportType} periodName={data.periodName} protocol={data.protocol} deliveries={data.deliveries}/></div>
  </main>;
}
