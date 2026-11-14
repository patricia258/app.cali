import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { StatusBadge } from '../../../components/ds/StatusBadge';
import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { WorkflowGroupHeading } from '../../../components/ds/WorkflowGroupHeading';
import { WorkflowList, WorkflowListRow } from '../../../components/ds/WorkflowList';
import { WorkspaceConfirmDialog } from '../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import { SatisfactionDateFilter } from './components/SatisfactionDateFilter';
import { SatisfactionSelectFilter } from './components/SatisfactionSelectFilter';
import { SatisfactionBar } from './components/SatisfactionBar';
import { SatisfactionMetric } from './components/SatisfactionMetric';
import { SatisfactionEmpty, SatisfactionPanel } from './components/SatisfactionPanel';
import { SatisfactionTrend } from './components/SatisfactionTrend';
import { confirmAction } from '../../../components/feedback/workspaceDialogs';
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import { ArrowUpRight, BarChart3, CalendarRange, Clock3, MessageSquareText, RefreshCw, Star, UserRound } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { resolveCompanyAsset } from '../../../lib/companyWorkspaceLogo';
import {
  closeFeedbackRequest, deleteSatisfactionFollowup, readSatisfactionClosures, readSatisfactionReviews,
  satisfactionClosuresKey, satisfactionRatingsKey, saveSatisfactionFollowup, type SatisfactionClosure,
  type SatisfactionReview,
} from '../../../api/admin/satisfaction/reviews';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { filterSatisfactionResponses, summarizeClosureCohort, summarizeSatisfaction } from './satisfactionSummary';
import './satisfaction-print.css';

type SatisfactionRow = SatisfactionReview & { companyLogoResolved: string; responderAvatarResolved: string };

type PeriodPreset='month'|'30'|'90'|'180'|'365'|'all';
// Tratativa das notas baixas (tabela satisfaction_followups, só administradora).
type Followup={theme:string|null;note:string|null;handledAt:string};
const THEMES:[string,string][]=[['prazo','Prazo'],['qualidade','Qualidade da entrega'],['comunicacao','Comunicação'],['atendimento','Atendimento'],['outro','Outro']];
const themeLabel=(value?:string|null)=>THEMES.find(([key])=>key===value)?.[1]||'Sem tema';
const followKey=(row:{sourceType:string;id:string})=>`${row.sourceType}:${row.id}`;

function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date).replace('.','');}
function scoreLabel(score:number){return score<=2?'Crítica':score===3?'Neutra':score===4?'Positiva':'Excelente';}
function sourceLabel(source:SatisfactionRow['sourceType']){return source==='record'?'Ocorrência / solicitação':'Entregável';}
function initials(value?:string|null){return (value||'C').split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'C';}

export function AdminSatisfactionPage(){
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const [rows,setRows]=useState<SatisfactionRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [period,setPeriod]=useState<PeriodPreset>('month');
  const [company,setCompany]=useState('');
  const [source,setSource]=useState<'all'|'record'|'deliverable'>('all');
  const [score,setScore]=useState('all');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [followups,setFollowups]=useState<Record<string,Followup>>({});
  const [editing,setEditing]=useState<SatisfactionRow|null>(null);
  const [draft,setDraft]=useState({theme:'',note:''});
  const [savingFollow,setSavingFollow]=useState(false);
  const [closures,setClosures]=useState<SatisfactionClosure[]>([]);
  const [closing,setClosing]=useState<string|null>(null);
  const [requestsPage,setRequestsPage]=useState(1);

  async function loadClosures() {
    if (!user) return;
    const entries = await queryClient.fetchQuery({
      queryKey: satisfactionClosuresKey(user.id),
      queryFn: ({ signal }) => readSatisfactionClosures(signal),
      staleTime: 0,
    });
    setClosures(entries);
  }

  async function closeRequest(id: string) {
    if (!user || closing || !(await confirmAction('Encerrar a espera por esta avaliação?'))) return;
    setClosing(id);
    setError('');
    try {
      await closeFeedbackRequest(id);
      await loadClosures();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível encerrar a espera.');
    } finally {
      setClosing(null);
    }
  }

  async function load(){
    if(!user)return;setLoading(true);setError('');
    try{
      const [result] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: satisfactionRatingsKey(user.id),
          queryFn: ({ signal }) => readSatisfactionReviews(signal),
          staleTime: 0,
        }),
        loadClosures(),
      ]);
      const hydrated=await Promise.all(result.ratings.map(async(row)=>({
        ...row,
        companyLogoResolved:await resolveCompanyAsset(row.companyLogoWorkspace||row.companyLogoOriginal||''),
        responderAvatarResolved:await resolveCompanyAsset(row.responderAvatar||''),
      })));
      setRows(hydrated);
      if(result.followups)setFollowups(result.followups);
    }catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível carregar as avaliações.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const companies=useMemo(() => {
    const names = new Map(rows.map((row) => [row.companyId, row.company]));
    closures.forEach(({ account_records: record }) => {
      if (record.companies) names.set(record.company_id, record.companies.display_name);
    });
    return [...names].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [rows, closures]);
  useEffect(() => {
    if (!company && companies.length) setCompany(companies[0][0]);
  }, [companies, company]);

  const range=useMemo(()=>{
    const now=new Date();
    let start:Date|null=null,end:Date|null=null;
    if (period === 'month' && !from && !to) {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    if(from){start=new Date(`${from}T00:00:00`);}else if(period!=='all'){start=new Date(now);start.setDate(start.getDate()-Number(period));start.setHours(0,0,0,0);}
    if(to){end=new Date(`${to}T23:59:59.999`);}
    return{start,end};
  },[period,from,to]);
  const periodFiltered = useMemo(
    () => filterSatisfactionResponses(rows, range, source, score),
    [rows, range, source, score],
  );
  const filtered=useMemo(()=>periodFiltered.filter((row)=>!company||company==='all'||row.companyId===company),[periodFiltered,company]);
  const metrics = useMemo(() => summarizeSatisfaction(filtered), [filtered]);
  const { cohort, waiting, answered, closedUnanswered, responseRate } = useMemo(
    () => summarizeClosureCohort(closures, range, company),
    [closures, range, company],
  );

  // Variação por empresa: média do período contra a média do período anterior de mesmo tamanho.
  const previousAverage=useMemo(()=>{
    const map=new Map<string,number>();
    if(period==='all'||from||to||!range.start)return map;
    const end=range.start;
    const start=period === 'month' ? subMonths(end, 1) : subDays(end, Number(period));
    const sums=new Map<string,{sum:number;count:number}>();
    rows.forEach((row)=>{const created=new Date(row.cohortAt || row.createdAt);if(created>=start&&created<end&&(source==='all'||row.sourceType===source)){const current=sums.get(row.companyId)||{sum:0,count:0};current.sum+=row.score;current.count+=1;sums.set(row.companyId,current);}});
    sums.forEach((value,key)=>map.set(key,value.sum/value.count));
    return map;
  },[rows,range,period,from,to,source]);

  const monthSeries=useMemo(()=>{
    const map=new Map<string,{sum:number;count:number}>();
    filtered.forEach((row)=>{const date=new Date(row.cohortAt || row.createdAt);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;const current=map.get(key)||{sum:0,count:0};current.sum+=row.score;current.count+=1;map.set(key,current);});
    return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([key,value])=>({key,label:new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(`${key}-01T12:00:00`)).replace('.',''),average:value.sum/value.count,count:value.count}));
  },[filtered]);

  const companySeries=useMemo(()=>{
    const map=new Map<string,{id:string;name:string;count:number;sum:number}>();
    periodFiltered.forEach((row)=>{const current=map.get(row.companyId)||{id:row.companyId,name:row.company,count:0,sum:0};current.count+=1;current.sum+=row.score;map.set(row.companyId,current);});
    return Array.from(map.values()).sort((a,b)=>b.count-a.count||b.sum-a.sum).slice(0,6).map((item)=>({...item,average:item.sum/item.count}));
  },[periodFiltered]);

  const sourceSeries=useMemo(()=>['deliverable','record'].map((value)=>({key:value,label:value==='deliverable'?'Entregáveis':'Ocorrências / solicitações',count:periodFiltered.filter((row)=>row.sourceType===value).length})),[periodFiltered]);

  const lowRows=useMemo(()=>filtered.filter((row)=>row.score<=3),[filtered]);
  const handledCount=lowRows.filter((row)=>followups[followKey(row)]).length;
  const themeSeries=useMemo(()=>{
    const map=new Map<string,number>();
    lowRows.forEach((row)=>{const item=followups[followKey(row)];if(item)map.set(item.theme||'',(map.get(item.theme||'')||0)+1);});
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  },[lowRows,followups]);

  function openFollowup(row:SatisfactionRow){const current=followups[followKey(row)];setDraft({theme:current?.theme||'',note:current?.note||''});setError('');setEditing(row);}
  async function saveFollowup(){
    if(!user||!editing)return;setSavingFollow(true);
    const result=await saveSatisfactionFollowup(editing, { theme: draft.theme || null, note: draft.note.trim() || null });
    setSavingFollow(false);
    if(result.error){setError(result.error.message);return;}
    setFollowups((current)=>({...current,[followKey(editing)]:{theme:result.data?.theme??(draft.theme||null),note:result.data?.note??(draft.note.trim()||null),handledAt:result.data?.handled_at||new Date().toISOString()}}));
    setEditing(null);
  }
  async function removeFollowup(){
    if(!user||!editing)return;setSavingFollow(true);
    const result=await deleteSatisfactionFollowup(editing);
    setSavingFollow(false);
    if(result.error){setError(result.error.message);return;}
    setFollowups((current)=>{const next={...current};delete next[followKey(editing)];return next;});
    setEditing(null);
  }

  function selectPreset(value:PeriodPreset){setPeriod(value);setFrom('');setTo('');}

  const tone=(value:number)=>value<=2?'red':value===3?'yellow':value===4?'blue':'green';

  return <Shell role="admin"><WorkspaceAdminPage className="v2-admin-nps v2-client-module"><WorkspaceAdminContent><WorkflowPage>
    <WorkflowHeading><div><small>BACKOFFICE / CALI RH</small><h1>Satisfação</h1><p>Como os clientes avaliam cada entrega aprovada e cada solicitação finalizada, de 1 a 5.</p></div><div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="workflowSecondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> {loading?'Atualizando…':'Atualizar'}</Button><Button variant="workflowSecondary" type="button" disabled={loading || Boolean(error)} onClick={() => window.print()}>Imprimir / salvar PDF</Button></div></WorkflowHeading>
    {error&&<InlineNotice>{error}</InlineNotice>}

    <div className="tw:mb-4 tw:flex tw:items-center tw:gap-3 tw:[@media(max-width:73.75rem)]:flex-wrap">
      <div className="tw:flex tw:flex-none tw:items-center tw:gap-1 tw:rounded-lg tw:bg-[#f5f1ed] tw:p-1 tw:[@media(max-width:40rem)]:flex-[1_1_100%] tw:[@media(max-width:40rem)]:flex-wrap">{([['month','Este mês'],['30','30 dias'],['90','90 dias'],['180','6 meses'],['365','12 meses'],['all','Todo período']] satisfies Array<[PeriodPreset,string]>).map(([value,label])=><button type="button" key={value} aria-pressed={period === value && !from && !to} className={`tw:cursor-pointer tw:rounded-md tw:border-0 tw:px-4 tw:py-2.5 tw:text-[.77rem] tw:leading-[inherit] ${period === value && !from && !to ? 'tw:bg-white tw:font-bold tw:text-cali-brand tw:shadow-sm' : 'tw:bg-transparent tw:text-[#8b7a72]'}`} onClick={()=>selectPreset(value)}>{label}</button>)}</div>
      <SatisfactionDateFilter label="De" value={from} onChange={(value) => { setFrom(value); setPeriod('all'); }} start />
      <SatisfactionDateFilter label="Até" value={to} onChange={(value) => { setTo(value); setPeriod('all'); }} />
      <SatisfactionSelectFilter aria-label="Empresa" value={company || 'all'} onChange={(e)=>{setCompany(e.target.value);setRequestsPage(1);}}><option value="all">Todas as empresas</option>{companies.map(([id,name])=><option value={id} key={id}>{name}</option>)}</SatisfactionSelectFilter>
      <SatisfactionSelectFilter aria-label="Origem" value={source} onChange={(e)=>setSource(e.target.value as typeof source)}><option value="all">Todas as origens</option><option value="record">Ocorrências / solicitações</option><option value="deliverable">Entregáveis</option></SatisfactionSelectFilter>
      <SatisfactionSelectFilter aria-label="Nota" value={score} onChange={(e)=>setScore(e.target.value)}><option value="all">Todas as notas</option>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value}/5 · {scoreLabel(value)}</option>)}</SatisfactionSelectFilter>
    </div>

    <p className="satisfaction-print-cohort">
      {companies.find(([id]) => id === company)?.[1] ?? 'Todas as empresas'} · {range.start?.toLocaleDateString('pt-BR') ?? 'Início do histórico'}
      {range.end ? ` a ${range.end.toLocaleDateString('pt-BR')}` : ''} · {source === 'all' ? 'Todas as origens' : sourceLabel(source)}
      {score !== 'all' ? ` · Nota ${score}/5` : ''}
    </p>
    <section className="tw:my-5 tw:grid tw:grid-cols-6 tw:gap-px tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-[#e8ddd6] tw:bg-[#e9ded6] tw:[@media(53.75rem<width<=73.75rem)]:grid-cols-3 tw:[@media(max-width:53.75rem)]:grid-cols-2" aria-label="Indicadores de satisfação">
      <SatisfactionMetric icon={<Star size={16} />} title="Índice de satisfação" value={metrics.average == null ? '—' : metrics.average.toFixed(1).replace('.', ',')} suffix="/5" detail="média das notas do período" />
      <SatisfactionMetric icon={<BarChart3 size={16} />} title="Satisfeitos" value={`${metrics.total ? Math.round(metrics.satisfied / metrics.total * 100) : 0}%`} detail={`${metrics.satisfied} de ${metrics.total} com nota 4 ou 5`} />
      <SatisfactionMetric icon={<MessageSquareText size={16} />} title="Base do período" value={metrics.total} detail={metrics.total === 1 ? 'avaliação registrada' : 'avaliações registradas'} />
      {source !== 'deliverable' && <SatisfactionMetric icon={<Clock3 size={16} />} title="Taxa de resposta" value={responseRate === null ? '—' : `${responseRate}%`} detail={`${answered} de ${cohort.length} encerramentos no período`} tone={responseRate !== null && responseRate < 30 ? 'weak' : 'normal'} />}
      <SatisfactionMetric icon={<UserRound size={16} />} title="Feedback qualitativo" value={`${metrics.total ? Math.round(metrics.comments / metrics.total * 100) : 0}%`} detail={`${metrics.comments} com comentário`} />
      <SatisfactionMetric icon={<CalendarRange size={16} />} title="Pedem atenção" value={metrics.attention} detail={metrics.attention ? `${handledCount} de ${metrics.attention} já tratadas` : 'notas de 1 a 3 · ação CALI'} tone={metrics.attention ? 'attention' : 'normal'} />
    </section>

    <div className="tw:grid tw:grid-cols-2 tw:gap-5 tw:[@media(max-width:53.75rem)]:grid-cols-1">
      <SatisfactionPanel eyebrow="DISTRIBUIÇÃO" title="Como as notas estão concentradas">
        <div className="tw:flex tw:flex-col tw:gap-3.5">
          {metrics.distribution.slice().reverse().map((item) => {
            const percent = metrics.total ? Math.round(item.count / metrics.total * 100) : 0;
            return (
              <div key={item.score} className="tw:grid tw:grid-cols-[2.31rem_minmax(0,1fr)_2rem_2.77rem] tw:items-center tw:gap-3 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#67574c]">
                <span>{item.score}/5</span><SatisfactionBar percent={percent} tone={tone(item.score)} />
                <strong className="tw:text-right tw:text-[#322f2c]">{item.count}</strong><small className="tw:text-right tw:text-[.77rem] tw:text-[#a18e80]">{percent}%</small>
              </div>
            );
          })}
        </div>
        <div className="tw:mt-auto tw:flex tw:flex-col tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-[#f1e9e2] tw:pt-4">
          <small className="tw:text-[.69rem] tw:tracking-[.092rem] tw:text-[#ad8259]">TEMAS NAS NOTAS BAIXAS TRATADAS</small>
          {themeSeries.length ? <div className="tw:flex tw:flex-wrap tw:gap-2">{themeSeries.map(([key, count]) => <span key={key || 'none'} className="tw:inline-flex tw:items-center tw:gap-2 tw:rounded-md tw:bg-[#f6f0eb] tw:px-3 tw:py-1.5 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#67574c]">{themeLabel(key)} <b className="tw:text-cali-brand">{count}</b></span>)}</div> : <SatisfactionEmpty>{lowRows.length ? 'Marque as notas de 1 a 3 como tratadas, com um tema, para ver aqui o que mais se repete.' : 'Nenhuma nota de 1 a 3 no recorte.'}</SatisfactionEmpty>}
        </div>
      </SatisfactionPanel>
      <SatisfactionTrend months={monthSeries} />
      <SatisfactionPanel eyebrow="RECORTE POR EMPRESA" title="Onde a percepção está concentrada" aside={<BarChart3 size={16} />}>
        {companySeries.length ? <div className="tw:flex tw:flex-col tw:gap-4">{companySeries.map((item) => {
          const previous = previousAverage.get(item.id);
          const delta = previous === undefined ? undefined : item.average - previous;
          return (
            <div key={item.id} className="tw:grid tw:grid-cols-2 tw:items-center tw:gap-4 tw:[@media(max-width:40rem)]:grid-cols-1">
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
                <strong className="tw:truncate tw:text-[.846rem] tw:text-[#322f2c]">{item.name}</strong>
                <small className="tw:text-[.77rem] tw:text-[#a18e80]">
                  {item.count} {item.count === 1 ? 'avaliação' : 'avaliações'} · média {item.average.toFixed(1).replace('.', ',')}
                  {delta !== undefined && (Math.abs(delta) < .05 ? ' · estável' : <b className={delta < 0 ? 'tw:text-[#b7495d]' : 'tw:text-[#31805a]'}> · {delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1).replace('.', ',')} vs período anterior</b>)}
                </small>
              </div>
              <SatisfactionBar percent={Math.max(8, item.average / 5 * 100)} tone="gold" />
            </div>
          );
        })}</div> : <SatisfactionEmpty>Sem avaliações no recorte.</SatisfactionEmpty>}
      </SatisfactionPanel>
      <SatisfactionPanel eyebrow="ORIGEM DA AVALIAÇÃO" title="De onde o feedback está vindo" aside={<Clock3 size={16} />}>
        <div className="tw:flex tw:flex-col tw:gap-4">
          {sourceSeries.map((item) => (
            <div key={item.key} className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-3 tw:gap-y-2 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#67574c]">
              <span>{item.label}</span><strong className="tw:text-[#322f2c]">{item.count}</strong>
              <SatisfactionBar className="tw:col-span-full" percent={periodFiltered.length ? item.count / periodFiltered.length * 100 : 0} />
            </div>
          ))}
        </div>
      </SatisfactionPanel>
    </div>

    {source !== 'deliverable' && <SatisfactionPanel className="satisfaction-requests tw:my-4" title="Solicitações de avaliação">
      <p>{cohort.length} solicitadas · {answered} respondidas · {waiting.length} aguardando · {closedUnanswered} encerradas sem resposta</p>
      {waiting.length > 0 && <ul className="tw:list-none tw:p-0">{waiting.map((entry, index) => <li key={entry.id} className={`tw:flex-wrap tw:items-center tw:justify-between tw:gap-2.5 tw:py-2 ${index >= requestsPage * 10 ? 'tw:hidden tw:print:flex' : 'tw:flex'}`}>
        <span>{entry.account_records.title} · {formatDate(entry.closed_at)}</span>
        <Button type="button" variant="workflowSecondary" disabled={closing !== null} onClick={() => void closeRequest(entry.id)}>Encerrar espera</Button>
      </li>)}</ul>}
      {waiting.length > requestsPage * 10 && <Button type="button" variant="workflowSecondary" onClick={() => setRequestsPage((page) => page + 1)}>Mostrar mais solicitações</Button>}
    </SatisfactionPanel>}

    <WorkflowGroupHeading label="RESPOSTAS" title="Todas as avaliações do período" count={filtered.length} />
    {loading?<LoadingState>Carregando avaliações…</LoadingState>:filtered.length?<WorkflowList>
      <WorkflowListRow header className="tw:grid-cols-[2.615rem_minmax(0,1.2fr)_minmax(0,.9fr)_minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_minmax(0,1.1fr)]! tw:[@media(max-width:53.75rem)]:hidden!"><span/><span>Empresa / Quem avaliou</span><span>Nota</span><span>Avaliação</span><span>Data</span><span>Origem</span><span>Registro</span></WorkflowListRow>
      {filtered.map((row)=>{
        const href=row.sourceType==='record'&&row.entityId?`/admin/registros?record=${encodeURIComponent(row.entityId)}`:row.sourceType==='deliverable'&&row.entityId?`/admin/projetos?deliverable=${encodeURIComponent(row.entityId)}`:'';
        return <WorkflowListRow className="tw:cursor-default! tw:grid-cols-[2.615rem_minmax(0,1.2fr)_minmax(0,.9fr)_minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_minmax(0,1.1fr)]! tw:[@media(max-width:53.75rem)]:grid-cols-[2.615rem_minmax(0,1fr)_auto]! tw:[@media(max-width:53.75rem)]:[&>span:nth-child(n+4)]:hidden!" key={`${row.sourceType}-${row.id}`}>
          <span className="tw:grid tw:size-[2.615rem] tw:place-items-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:text-[.846rem] tw:leading-none tw:font-extrabold tw:text-cali-brand">{row.companyLogoResolved?<img className="tw:size-full tw:object-contain" src={row.companyLogoResolved} alt=""/>:<span aria-hidden="true">{initials(row.company)}</span>}</span>
          <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1"><strong className="tw:truncate tw:text-[.846rem] tw:leading-[inherit] tw:font-semibold tw:text-[#322f2c]">{row.company}</strong><small className="tw:text-[.69rem] tw:leading-[inherit] tw:text-[#a18e80]">{row.responderName||'Cliente'}</small></span>
          <span className="tw:flex tw:flex-col tw:items-start tw:gap-2"><StatusBadge variant="workflow" tone={tone(row.score)}>{row.score}/5 · {scoreLabel(row.score)}</StatusBadge>{row.score<=3&&(followups[followKey(row)]?<button type="button" className="tw:cursor-pointer tw:rounded-md tw:border tw:border-solid tw:border-[#cfe9da] tw:bg-[#e6f6ec] tw:px-2.5 tw:py-1 tw:text-[.77rem] tw:leading-[inherit] tw:text-[#31805a]" title={followups[followKey(row)].note||'Sem anotação'} onClick={()=>openFollowup(row)}>Tratada · {themeLabel(followups[followKey(row)].theme)}</button>:<button type="button" className="tw:cursor-pointer tw:rounded-md tw:border tw:border-dashed tw:border-[#dec9c3] tw:bg-white tw:px-2.5 tw:py-1 tw:text-[.77rem] tw:leading-[inherit] tw:text-cali-brand" onClick={()=>openFollowup(row)}>Marcar como tratada</button>)}</span>
          <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1"><strong className="tw:truncate tw:text-[.846rem] tw:leading-[inherit] tw:font-semibold tw:text-[#322f2c]">{row.title||'Avaliação do cliente'}</strong><small className="tw:text-[.77rem] tw:leading-[1.45] tw:text-[#857870]">{row.comment?.trim()||'Sem comentário adicional.'}</small></span>
          <span><time>{formatDate(row.createdAt)}</time></span>
          <span>{sourceLabel(row.sourceType)}</span>
          <span>{href?<a className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-[.77rem] tw:leading-[inherit] tw:font-bold tw:text-cali-brand tw:no-underline" href={href}>{row.protocol||'Ver registro'} <ArrowUpRight size={13}/></a>:<small>Sem vínculo</small>}</span>
        </WorkflowListRow>;
      })}
    </WorkflowList>:<EmptyState variant="workflow"><strong>Nenhuma avaliação encontrada com os filtros atuais.</strong><p>Amplie o período ou limpe os filtros.</p></EmptyState>}


  </WorkflowPage></WorkspaceAdminContent>
  {editing&&<WorkspaceDialogOverlay onMouseDown={(event)=>{if(event.target===event.currentTarget)setEditing(null);}}><WorkspaceConfirmDialog className="tw:[&_p]:mb-2! tw:[&_p]:text-[.923rem]! tw:[&_footer>button]:text-[.846rem]! tw:[&_footer>button]:font-bold!" aria-label="Tratativa da avaliação">
    <div><small>SATISFAÇÃO · NOTA {editing.score}/5</small><h2>{followups[followKey(editing)]?'Tratativa registrada':'Marcar como tratada'}</h2><p>{editing.company} · {editing.responderName||'Cliente'} · {editing.title||'Avaliação do cliente'}</p>{editing.comment?.trim()&&<p className="tw:border-0 tw:border-l-[.23rem] tw:border-solid tw:border-[#e3c9a6] tw:bg-[#fffaf1] tw:px-3.5 tw:py-3 tw:text-[#67574c] tw:italic">“{editing.comment.trim()}”</p>}</div>
    <label>Tema do comentário<select className="tw:h-[3.077rem] tw:rounded-xl tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-4 tw:font-normal" value={draft.theme} onChange={(event)=>setDraft((current)=>({...current,theme:event.target.value}))}><option value="">Sem tema</option>{THEMES.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <label>O que foi feito<textarea className="tw:font-normal" value={draft.note} onChange={(event)=>setDraft((current)=>({...current,note:event.target.value}))} placeholder="Ex.: liguei em 12/10 e alinhamos novo prazo."/></label>
    {error&&<small className="tw:text-[#b7495d]" role="alert">{error}</small>}
    <footer>{followups[followKey(editing)]&&<button type="button" className="tw:mr-auto tw:border-[#ecd0d5]! tw:bg-white! tw:text-[#b7495d]!" disabled={savingFollow} onClick={()=>void removeFollowup()}>Remover marcação</button>}<button type="button" onClick={()=>setEditing(null)}>Voltar</button><button type="button" disabled={savingFollow} onClick={()=>void saveFollowup()}>{savingFollow?'Salvando…':'Salvar'}</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </WorkspaceAdminPage></Shell>;
}
