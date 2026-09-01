import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Archive, BookOpenText, CheckCircle2, Eye, FileText, Loader2,
  Pencil, Printer, RefreshCw, Save, Send, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { ExecutiveReportPaperV12 } from '../../components/reports/ExecutiveReportPaperV12';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../lib/reportComposition';
import {
  buildExecutiveReading, groupHours, normalizeIntelligenceSnapshot, packageLabel,
  reportSourceCount, shouldShowNextCycle, type IntelligenceSnapshot,
} from '../../lib/reportIntelligence';

type ReportStatus = 'draft' | 'review' | 'published' | 'archived';
type EditorKey = keyof ReportEditor;
type Company = { id: string; name: string; logoUrl?: string | null; monthlyHours: number; serviceType?: string | null; servicePlan?: string | null };
type Report = {
  id: string; companyId: string; title: string; reportType: ReportType; periodStart: string; periodEnd: string;
  status: ReportStatus; summary: string; movements: string[]; decisions: string[]; risks: string[]; nextSteps: string[];
  sourceSnapshot: IntelligenceSnapshot | null; protocol: string; updatedAt: string;
};

const emptyEditor: ReportEditor = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };
const statusLabel: Record<ReportStatus, string> = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' };

function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function monthlyPeriod(date = new Date()) { return { start: isoDate(new Date(date.getFullYear(), date.getMonth(), 1)), end: isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)) }; }
function quarterlyPeriod(date = new Date()) { const startMonth = Math.floor(date.getMonth() / 3) * 3; return { start: isoDate(new Date(date.getFullYear(), startMonth, 1)), end: isoDate(new Date(date.getFullYear(), startMonth + 3, 0)) }; }
function quarterKey(value: string) { const [year, month] = value.split('-').map(Number); return `${year}-Q${Math.floor((month - 1) / 3) + 1}`; }
function quarterPeriod(value: string) { const [yearText, quarterText] = value.split('-Q'); const year = Number(yearText); const quarter = Number(quarterText); const startMonth = (quarter - 1) * 3; return { start: isoDate(new Date(year, startMonth, 1)), end: isoDate(new Date(year, startMonth + 3, 0)) }; }
function quarterOptions() { const year = new Date().getFullYear(); const options: Array<{value:string;label:string}> = []; for (let y = year + 1; y >= year - 6; y -= 1) for (let q = 4; q >= 1; q -= 1) options.push({ value: `${y}-Q${q}`, label: `${q}º trimestre · ${y}` }); return options; }
function periodLabel(type: ReportType, start: string) { const [year, month] = start.split('-').map(Number); return type === 'monthly' ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)) : `${Math.floor((month - 1) / 3) + 1}º trimestre de ${year}`; }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(`${value.slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date); }
function formatDateTime(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' }).format(date).replace('.', ''); }
function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function reportRow(row: Record<string, any>): Report { return { id: row.id, companyId: row.company_id, title: row.title, reportType: (row.report_type || 'monthly') as ReportType, periodStart: String(row.period_start || row.reference_month).slice(0,10), periodEnd: String(row.period_end || row.reference_month).slice(0,10), status: row.status as ReportStatus, summary: row.executive_summary || '', movements: Array.isArray(row.movements) ? row.movements.map(String) : [], decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [], risks: Array.isArray(row.risks) ? row.risks.map(String) : [], nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [], sourceSnapshot: normalizeIntelligenceSnapshot(row.source_snapshot), protocol: row.protocol || '—', updatedAt: row.updated_at }; }
function trendStart(start: string, type: ReportType) { if (type === 'quarterly') return start; const [year, month] = start.split('-').map(Number); return isoDate(new Date(year, month - 6, 1)); }
function recordDate(value?: string | null) { if (!value) return '—'; return new Intl.DateTimeFormat('pt-BR', { day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit' }).format(new Date(value)).replace('.', ''); }

function EditableSection({ label, title, field, editor, editing, setEditing, setEditor, empty }: {
  label:string; title:string; field:EditorKey; editor:ReportEditor; editing:EditorKey|null;
  setEditing:(value:EditorKey|null)=>void; setEditor:React.Dispatch<React.SetStateAction<ReportEditor>>; empty:string;
}) {
  const value = editor[field];
  return <section className={`reports-v12-editor-section ${field === 'summary' ? 'lead' : ''} ${field === 'risks' && lines(value).length ? 'attention' : ''}`}>
    <div><span>{label}</span><h3>{title}</h3></div>
    {editing === field ? <textarea autoFocus rows={field === 'summary' ? 8 : 6} value={value} onChange={(event) => setEditor((current) => ({ ...current, [field]: event.target.value }))} /> : field === 'summary' ? <div className="reports-v12-summary-editor">{value ? value.split(/\n\n+/).map((item,index)=><p key={index}>{item}</p>) : <p className="reports-v12-empty-copy">{empty}</p>}</div> : lines(value).length ? <ul>{lines(value).map((item,index)=><li key={`${field}-${index}`}>{item}</li>)}</ul> : <p className="reports-v12-empty-copy">{empty}</p>}
    <button type="button" onClick={() => setEditing(editing === field ? null : field)}><Pencil size={14}/>{editing === field ? 'Concluir' : 'Editar'}</button>
  </section>;
}

export function AdminReportsPageV12() {
  const navigate = useNavigate();
  const initial = monthlyPeriod();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [editor, setEditor] = useState<ReportEditor>(emptyEditor);
  const [editing, setEditing] = useState<EditorKey | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const companyReports = useMemo(() => reports.filter((item) => item.companyId === companyId), [reports, companyId]);
  const quarters = useMemo(() => quarterOptions(), []);
  const periodName = periodLabel(reportType, periodStart);
  const hourGroups = snapshot ? groupHours(snapshot) : [];
  const showNext = snapshot ? shouldShowNextCycle(snapshot, reportType) : false;

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd); }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => { if (!previewOpen) return; document.body.classList.add('workspace-modal-open'); return () => document.body.classList.remove('workspace-modal-open'); }, [previewOpen]);

  async function loadBase() {
    if (!supabase) return;
    setLoadingBase(true); setError('');
    try {
      const [companyResult, reportResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_type,service_plan').neq('status','closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at').neq('status','archived').order('period_start',{ascending:false}),
      ]);
      if (companyResult.error) throw companyResult.error; if (reportResult.error) throw reportResult.error;
      const nextCompanies: Company[] = await Promise.all((companyResult.data || []).map(async (row:any) => ({ id:row.id,name:row.display_name,logoUrl:await resolveWorkspaceMedia(row.logo_url),monthlyHours:Number(row.monthly_hours_contracted||0),serviceType:row.service_type,servicePlan:row.service_plan })));
      setCompanies(nextCompanies); setReports((reportResult.data || []).map((row:any)=>reportRow(row)));
      if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.'); }
    finally { setLoadingBase(false); }
  }

  async function loadPeriod(nextCompanyId:string,nextType:ReportType,nextStart:string,nextEnd:string) {
    if (!supabase) return;
    setLoadingPeriod(true); setError(''); setNotice(''); setEditing(null);
    try {
      const seriesFrom = trendStart(nextStart, nextType);
      const [snapshotResult, seriesResult, reportResult] = await Promise.all([
        supabase.rpc('build_report_intelligence_snapshot',{p_company_id:nextCompanyId,p_period_start:nextStart,p_period_end:nextEnd}),
        supabase.rpc('build_report_monthly_series',{p_company_id:nextCompanyId,p_period_start:seriesFrom,p_period_end:nextEnd}),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at').eq('company_id',nextCompanyId).eq('report_type',nextType).eq('period_start',nextStart).eq('period_end',nextEnd).maybeSingle(),
      ]);
      if (snapshotResult.error) throw snapshotResult.error; if (seriesResult.error) throw seriesResult.error; if (reportResult.error) throw reportResult.error;
      const base = normalizeIntelligenceSnapshot({ ...(snapshotResult.data as object), monthlySeries: seriesResult.data });
      if (!base) throw new Error('A base inteligente do período retornou em formato inválido.');
      setSnapshot(base);
      if (reportResult.data) {
        const report = reportRow(reportResult.data as Record<string,any>); setActiveReport(report);
        setEditor({ summary:report.summary,movements:report.movements.join('\n'),decisions:report.decisions.join('\n'),risks:report.risks.join('\n'),nextSteps:report.nextSteps.join('\n') });
      } else { setActiveReport(null); setEditor(buildExecutiveReading(base,nextType)); }
    } catch (requestError) { setSnapshot(null); setActiveReport(null); setEditor(emptyEditor); setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o relatório.'); }
    finally { setLoadingPeriod(false); }
  }

  function changeType(next:ReportType) { setReportType(next); const anchor=new Date(`${periodStart}T12:00:00`); const period=next==='monthly'?monthlyPeriod(anchor):quarterlyPeriod(anchor); setPeriodStart(period.start);setPeriodEnd(period.end); }
  function changeMonth(value:string) { const [year,month]=value.split('-').map(Number); const period=monthlyPeriod(new Date(year,month-1,1));setPeriodStart(period.start);setPeriodEnd(period.end); }
  function changeQuarter(value:string) { const period=quarterPeriod(value);setPeriodStart(period.start);setPeriodEnd(period.end); }
  function regenerate() { if (!snapshot) return; if (activeReport && !window.confirm('Atualizar a leitura assistida substitui os textos editados deste relatório. Deseja continuar?')) return; setEditor(buildExecutiveReading(snapshot,reportType)); setNotice('Leitura executiva refeita a partir da memória atual da conta.'); }
  function printReport() { const original=document.title;document.title=`Relatório CALI RH - ${selectedCompany?.name||'Cliente'} - ${periodName}`;window.print();window.setTimeout(()=>{document.title=original;},700); }

  async function persist(status:'draft'|'review'|'published') {
    if (!supabase || !snapshot || !selectedCompany) return;
    if (!editor.summary.trim()) { setError('Inclua a síntese executiva antes de salvar.'); return; }
    setSaving(true); setError('');
    const payload = {
      company_id:selectedCompany.id,
      title:`Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,
      report_type:reportType,period_start:periodStart,period_end:periodEnd,reference_month:`${periodStart.slice(0,7)}-01`,status,
      executive_summary:editor.summary.trim(),movements:lines(editor.movements),decisions:lines(editor.decisions),risks:lines(editor.risks),next_steps:lines(editor.nextSteps),
      hours_summary:{contracted_hours:snapshot.contract.contractedHoursPeriod,consumed_minutes:snapshot.hours.consumedMinutes,consumed_percent:snapshot.contract.contractedHoursPeriod?(snapshot.hours.consumedMinutes/60/snapshot.contract.contractedHoursPeriod)*100:null,categories:hourGroups},
      source_snapshot:snapshot,service_type_snapshot:snapshot.contract.serviceType||selectedCompany.serviceType||null,service_plan_snapshot:snapshot.contract.servicePlan||selectedCompany.servicePlan||null,contracted_hours_snapshot:snapshot.contract.contractedHoursPeriod,
    };
    try {
      const result=activeReport?await supabase.from('reports').update(payload).eq('id',activeReport.id).select('id').single():await supabase.from('reports').insert(payload).select('id').single();
      if (result.error) throw result.error;
      await supabase.from('activity_log').insert({company_id:selectedCompany.id,event_type:status==='published'?'report_published':status==='review'?'report_review_saved':'report_draft_saved',entity_type:'report',entity_id:result.data.id,metadata:{report_type:reportType,period_start:periodStart,period_end:periodEnd,records_considered:snapshot.records.length,dependencies_considered:snapshot.dependencies.items.length}});
      setNotice(status==='published'?'Relatório publicado.':status==='review'?'Relatório salvo em revisão.':'Rascunho salvo.'); await loadBase(); await loadPeriod(selectedCompany.id,reportType,periodStart,periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.'); }
    finally { setSaving(false); }
  }
  async function archive() { if (!supabase || !activeReport) return; setSaving(true); const {error:updateError}=await supabase.from('reports').update({status:'archived'}).eq('id',activeReport.id); if(updateError)setError(updateError.message); else {setNotice('Relatório arquivado.');setActiveReport(null);await loadBase();}setSaving(false); }
  function openHistory(report:Report){setCompanyId(report.companyId);setReportType(report.reportType);setPeriodStart(report.periodStart);setPeriodEnd(report.periodEnd);}

  if (loadingBase) return <Shell role="admin"><section className="page reports-admin-v12"><div className="data-loading"><Loader2 className="spin" size={20}/>Carregando Relatórios…</div></section></Shell>;

  return <Shell role="admin"><section className="page reports-admin-v12">
    <header className="reports-v12-header"><div><span className="eyebrow">INTELIGÊNCIA DA CONTA</span><h1>Relatórios</h1><p>O fechamento cruza o que estava previsto para o ciclo com o que realmente aconteceu: execução, registros, reuniões, dependências, horas, comportamento de resposta e percepção do cliente.</p></div><div className="reports-v12-controls"><label><span>Cliente</span><select value={companyId} onChange={(event)=>setCompanyId(event.target.value)}>{companies.map((company)=><option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label><span>Tipo</span><select value={reportType} onChange={(event)=>changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>{reportType==='monthly'?<label><span>Período</span><input type="month" value={periodStart.slice(0,7)} onChange={(event)=>changeMonth(event.target.value)}/></label>:<label><span>Período</span><select value={quarterKey(periodStart)} onChange={(event)=>changeQuarter(event.target.value)}>{quarters.map((option)=><option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}</div></header>
    {notice&&<div className="inline-notice success"><CheckCircle2 size={18}/>{notice}</div>}{error&&<div className="inline-notice"><AlertTriangle size={18}/>{error}</div>}
    {loadingPeriod?<div className="panel data-loading"><Loader2 className="spin" size={20}/>Cruzando a memória da conta em {periodName}…</div>:snapshot&&<>
      <section className="reports-v12-actionbar"><div><Sparkles size={18}/><span><strong>Leitura assistida pronta</strong><small>{reportSourceCount(snapshot)} registros operacionais considerados · {snapshot.records.length} registro(s) de contexto · {snapshot.dependencies.items.length} dependência(s) explícita(s)</small></span></div><div><button className="secondary" type="button" onClick={()=>navigate(`/admin/registros?company=${companyId}`)}><BookOpenText size={15}/>Abrir Registros</button><button className="secondary" type="button" onClick={regenerate}><RefreshCw size={15}/>Refazer leitura</button><button className="secondary" type="button" disabled={saving} onClick={()=>void persist('draft')}><Save size={15}/>Salvar</button><button className="primary" type="button" onClick={()=>setPreviewOpen(true)}><Eye size={15}/>Prévia PDF</button></div></section>
      <section className="reports-v12-context-strip"><div><small>PACOTE</small><strong>{packageLabel(snapshot)}</strong></div><div><small>CICLO / PROJETO</small><strong>{snapshot.cycleContext?.projectName||snapshot.projects[0]?.name||'Sem ciclo vinculado'}</strong></div><div><small>MEMÓRIA DO MÊS</small><strong>{snapshot.records.length?`${snapshot.records.length} registro(s) contextual(is)`:'Ainda sem registros de contexto'}</strong></div><div><small>DEPENDÊNCIAS</small><strong>{snapshot.dependencies.items.length?snapshot.dependencies.items.slice(0,2).map((item)=>item.title).join(' · '):'Nenhuma dependência aberta'}</strong></div></section>
      {snapshot.records.length===0&&snapshot.events.count>0&&<section className="reports-v12-quality watch"><AlertTriangle size={17}/><div><strong>Há agenda, mas pouca memória consultiva</strong><span>Existem eventos no período sem registro de reunião/ocorrência associado. Use Registros para guardar contexto e transcrições; isso aprofunda a síntese sem repetir números.</span></div></section>}
      <div className="reports-v12-layout"><main className="reports-v12-editor">
        <header className="reports-v12-editor-head"><div><span className="section-kicker">{activeReport?.protocol||'NOVO RELATÓRIO'}</span><h2>{reportTypeLabel[reportType]} · {selectedCompany?.name}</h2><p>{periodName} · {packageLabel(snapshot)}</p></div><span className={`report-status-v3 ${activeReport?.status||'draft'}`}>{activeReport?statusLabel[activeReport.status]:'Não salvo'}</span></header>
        <EditableSection label="SÍNTESE EXECUTIVA" title="Leitura do período" field="summary" editor={editor} editing={editing} setEditing={setEditing} setEditor={setEditor} empty="A leitura assistida ainda não encontrou contexto suficiente. Registre reunião, ocorrência ou percepção e atualize."/>
        <EditableSection label="EVOLUÇÃO" title={reportType==='quarterly'?'Evolução e marcos do trimestre':'Evolução do ciclo no mês'} field="movements" editor={editor} editing={editing} setEditing={setEditing} setEditor={setEditor} empty="Nenhum movimento qualitativo identificado além do fluxo operacional."/>
        {snapshot.records.length>0&&<section className="reports-v12-evidence-section"><div><span>REGISTROS DO PERÍODO</span><h3>O que aconteceu com a conta</h3></div><div className="reports-v12-evidence-list">{snapshot.records.filter((item)=>item.includeInReport).slice(0,6).map((record)=><article key={record.id}><time>{recordDate(record.occurredAt)}</time><div><strong>{record.title}</strong>{record.summary&&<p>{record.summary}</p>}</div></article>)}</div><button type="button" onClick={()=>navigate(`/admin/registros?company=${companyId}`)}>Ver todos</button></section>}
        {snapshot.dependencies.items.length>0&&<section className="reports-v12-evidence-section dependency"><div><span>DEPENDÊNCIAS</span><h3>O que está aberto e por quê</h3></div><div className="reports-v12-dependency-editor">{snapshot.dependencies.items.slice(0,6).map((item,index)=><article key={`${item.protocol||item.title}-${index}`}><strong>{item.title}</strong><p>{item.detail}</p><small>{item.responsible==='client'?'Aguardando cliente':item.responsible==='flow'?'Dependência de fluxo':'Responsabilidade compartilhada'}{item.delayBusinessDays>0?` · +${item.delayBusinessDays} dia(s) útil(eis)`:''}</small></article>)}</div></section>}
        <EditableSection label="ALINHAMENTOS" title="Decisões e definições" field="decisions" editor={editor} editing={editing} setEditing={setEditing} setEditor={setEditor} empty="Nenhuma decisão adicional registrada. O bloco não aparece no PDF enquanto estiver vazio."/>
        <EditableSection label="ATENÇÃO" title="Pontos que pedem atenção" field="risks" editor={editor} editing={editing} setEditing={setEditing} setEditor={setEditor} empty="Nenhum ponto de atenção qualitativo identificado."/>
        {showNext&&<EditableSection label="TRANSIÇÃO" title={reportType==='quarterly'?'Próximo trimestre':'Próximo ciclo'} field="nextSteps" editor={editor} editing={editing} setEditing={setEditing} setEditor={setEditor} empty="Nenhum movimento de transição registrado."/>}
        <footer className="reports-v12-origin"><ShieldCheck size={16}/><span><strong>Origem preservada</strong><small>A síntese é assistida pelos dados reais da conta e continua editável. Fontes e registros permanecem no snapshot do relatório.</small></span></footer>
        <div className="reports-v12-workflow"><div>{activeReport&&<button className="secondary danger-text" type="button" disabled={saving} onClick={()=>void archive()}><Archive size={15}/>Arquivar</button>}</div><div><button className="secondary" type="button" disabled={saving} onClick={()=>void persist('review')}>Em revisão</button><button className="primary" type="button" disabled={saving} onClick={()=>void persist('published')}>{saving?<Loader2 className="spin" size={15}/>:<Send size={15}/>}Publicar</button></div></div>
      </main><aside className="reports-v12-preview"><div className="reports-v12-preview-head"><div><FileText size={18}/><strong>Prévia executiva</strong></div><button type="button" onClick={()=>setPreviewOpen(true)}>Abrir PDF</button></div><div className="reports-v12-mini-viewport"><div className="reports-v12-mini-scale"><ExecutiveReportPaperV12 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol||'gerado ao salvar'}/></div></div></aside></div>
    </>}
    <section className="reports-v12-history"><div><div><span className="section-kicker">HISTÓRICO</span><h2>Relatórios salvos</h2></div><span>{companyReports.length} registro(s)</span></div>{companyReports.length?companyReports.map((report)=><button key={report.id} className={activeReport?.id===report.id?'active':''} type="button" onClick={()=>openHistory(report)}><FileText size={17}/><span><small>{report.protocol} · {reportTypeLabel[report.reportType]}</small><strong>{report.title}</strong><em>{formatDate(report.periodStart)} → {formatDate(report.periodEnd)}</em></span><b className={`report-status-v3 ${report.status}`}>{statusLabel[report.status]}</b></button>):<div className="panel reports-v12-history-empty"><FileText size={24}/><div><strong>Nenhum relatório salvo para este cliente.</strong><span>A leitura assistida acima já pode ser revisada.</span></div></div>}</section>
    {previewOpen&&snapshot&&<div className="modal-backdrop workspace-modal-backdrop reports-v12-print-backdrop"><section className="modal-card reports-v12-preview-modal" role="dialog" aria-modal="true"><div className="reports-v12-preview-toolbar"><div><strong>Prévia A4</strong><span>O documento cresce em páginas conforme o conteúdo, mantendo blocos íntegros sempre que possível.</span></div><div><button className="secondary" type="button" onClick={()=>setPreviewOpen(false)}><X size={16}/>Fechar</button><button className="primary" type="button" onClick={printReport}><Printer size={16}/>Imprimir / Salvar PDF</button></div></div><div className="reports-v12-paper-full-wrap"><ExecutiveReportPaperV12 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol||'gerado ao salvar'}/></div></section></div>}
  </section></Shell>;
}
