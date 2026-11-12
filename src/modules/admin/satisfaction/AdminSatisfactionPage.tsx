import { confirmAction } from '../../../components/feedback/workspaceDialogs';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { EmptyState } from '../../../components/ds/EmptyState';
import { FilterSelect } from '../../../components/ds/FilterSelect';
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
  const x=(index:number)=>45+(index*(545/Math.max(1,monthSeries.length-1)));
  const y=(average:number)=>185-((average-1)/4)*165;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-nps v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Satisfação</h1><p>Como os clientes avaliam cada entrega aprovada e cada solicitação finalizada, de 1 a 5.</p></div><div className="v2-head-actions"><Button variant="workflowSecondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> {loading?'Atualizando…':'Atualizar'}</Button><Button variant="workflowSecondary" type="button" disabled={loading || Boolean(error)} onClick={() => window.print()}>Imprimir / salvar PDF</Button></div></div>
    {error&&<InlineNotice>{error}</InlineNotice>}

    <div className="wf-controls v2-nps-controls">
      <div className="wf-segments">{([['month','Este mês'],['30','30 dias'],['90','90 dias'],['180','6 meses'],['365','12 meses'],['all','Todo período']] satisfies Array<[PeriodPreset,string]>).map(([value,label])=><button type="button" key={value} className={period===value&&!from&&!to?'on':''} onClick={()=>selectPreset(value)}>{label}</button>)}</div>
      <label className="v2-nps-date">De<input type="date" value={from} onChange={(e)=>{setFrom(e.target.value);setPeriod('all');}}/></label>
      <label className="v2-nps-date">Até<input type="date" value={to} onChange={(e)=>{setTo(e.target.value);setPeriod('all');}}/></label>
      <FilterSelect aria-label="Empresa" value={company || 'all'} onChange={(e)=>{setCompany(e.target.value);setRequestsPage(1);}}><option value="all">Todas as empresas</option>{companies.map(([id,name])=><option value={id} key={id}>{name}</option>)}</FilterSelect>
      <FilterSelect aria-label="Origem" value={source} onChange={(e)=>setSource(e.target.value as typeof source)}><option value="all">Todas as origens</option><option value="record">Ocorrências / solicitações</option><option value="deliverable">Entregáveis</option></FilterSelect>
      <FilterSelect aria-label="Nota" value={score} onChange={(e)=>setScore(e.target.value)}><option value="all">Todas as notas</option>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value}/5 · {scoreLabel(value)}</option>)}</FilterSelect>
    </div>

    <p className="satisfaction-print-cohort">
      {companies.find(([id]) => id === company)?.[1] ?? 'Todas as empresas'} · {range.start?.toLocaleDateString('pt-BR') ?? 'Início do histórico'}
      {range.end ? ` a ${range.end.toLocaleDateString('pt-BR')}` : ''} · {source === 'all' ? 'Todas as origens' : sourceLabel(source)}
      {score !== 'all' ? ` · Nota ${score}/5` : ''}
    </p>
    <section className="v2-nps-kpis">
      <article><i><Star size={16}/></i><span>Índice de satisfação</span><strong>{metrics.average==null?'—':metrics.average.toFixed(1).replace('.',',')}<small>/5</small></strong><em>média das notas do período</em></article>
      <article><i><BarChart3 size={16}/></i><span>Satisfeitos</span><strong>{metrics.total?Math.round(metrics.satisfied/metrics.total*100):0}%</strong><em>{metrics.satisfied} de {metrics.total} com nota 4 ou 5</em></article>
      <article><i><MessageSquareText size={16}/></i><span>Base do período</span><strong>{metrics.total}</strong><em>{metrics.total===1?'avaliação registrada':'avaliações registradas'}</em></article>
      {source !== 'deliverable' && <article className={responseRate !== null && responseRate < 30 ? 'weak' : ''}><i><Clock3 size={16}/></i><span>Taxa de resposta</span><strong>{responseRate === null ? '—' : `${responseRate}%`}</strong><em>{answered} de {cohort.length} encerramentos no período</em></article>}
      <article><i><UserRound size={16}/></i><span>Feedback qualitativo</span><strong>{metrics.total?Math.round(metrics.comments/metrics.total*100):0}%</strong><em>{metrics.comments} com comentário</em></article>
      <article className={metrics.attention?'attention':''}><i><CalendarRange size={16}/></i><span>Pedem atenção</span><strong>{metrics.attention}</strong><em>{metrics.attention?`${handledCount} de ${metrics.attention} já tratadas`:'notas de 1 a 3 · ação CALI'}</em></article>
    </section>

    <div className="v2-nps-grid">
      <section className="v2-nps-panel"><header><div><small>DISTRIBUIÇÃO</small><h2>Como as notas estão concentradas</h2></div></header><div className="v2-nps-dist">{metrics.distribution.slice().reverse().map((item)=>{const pct=metrics.total?Math.round(item.count/metrics.total*100):0;return <div key={item.score}><span>{item.score}/5</span><div><i className={tone(item.score)} style={{width:`${pct}%`}}/></div><strong>{item.count}</strong><small>{pct}%</small></div>;})}</div><div className="v2-nps-themes"><small>TEMAS NAS NOTAS BAIXAS TRATADAS</small>{themeSeries.length?<div>{themeSeries.map(([key,count])=><span key={key||'none'}>{themeLabel(key)} <b>{count}</b></span>)}</div>:<p className="v2-nps-empty">{lowRows.length?'Marque as notas de 1 a 3 como tratadas, com um tema, para ver aqui o que mais se repete.':'Nenhuma nota de 1 a 3 no recorte.'}</p>}</div></section>
      <section className="v2-nps-panel"><header><div><small>EVOLUÇÃO</small><h2>Satisfação ao longo do tempo</h2></div><span>média mensal · 1–5</span></header>{monthSeries.length>1?<div className="v2-nps-line"><svg viewBox="0 0 620 220" role="img" aria-label="Evolução mensal da satisfação"><line x1="38" y1="20" x2="38" y2="185"/><line x1="38" y1="185" x2="600" y2="185"/>{[1,2,3,4,5].map((value)=><text key={value} x="8" y={190-(value-1)*41}>{value}</text>)}<polyline points={monthSeries.map((item,index)=>`${x(index)},${y(item.average)}`).join(' ')} fill="none"/>{monthSeries.map((item,index)=><g key={item.key}><circle cx={x(index)} cy={y(item.average)} r="4.5"/><text className="line-value" x={x(index)} y={y(item.average)-9}>{item.average.toFixed(1).replace('.',',')}</text><text className="line-label" x={x(index)} y="207">{item.label}</text></g>)}</svg></div>:<p className="v2-nps-empty">São necessárias pelo menos duas referências mensais para mostrar uma tendência.</p>}</section>
      <section className="v2-nps-panel"><header><div><small>RECORTE POR EMPRESA</small><h2>Onde a percepção está concentrada</h2></div><BarChart3 size={16}/></header>{companySeries.length?<div className="v2-nps-rank">{companySeries.map((item)=><div key={item.id}><div><strong>{item.name}</strong><small>{item.count} {item.count===1?'avaliação':'avaliações'} · média {item.average.toFixed(1).replace('.',',')}{(()=>{const before=previousAverage.get(item.id);if(before==null)return null;const delta=item.average-before;if(Math.abs(delta)<0.05)return <b className="flat"> · estável</b>;return <b className={delta<0?'down':'up'}> · {delta<0?'▼':'▲'} {Math.abs(delta).toFixed(1).replace('.',',')} vs período anterior</b>;})()}</small></div><div><i style={{width:`${Math.max(8,item.average/5*100)}%`}}/></div></div>)}</div>:<p className="v2-nps-empty">Sem avaliações no recorte.</p>}</section>
      <section className="v2-nps-panel"><header><div><small>ORIGEM DA AVALIAÇÃO</small><h2>De onde o feedback está vindo</h2></div><Clock3 size={16}/></header><div className="v2-nps-source">{sourceSeries.map((item)=><div key={item.key}><span>{item.label}</span><strong>{item.count}</strong><div><i style={{width:`${periodFiltered.length?item.count/periodFiltered.length*100:0}%`}}/></div></div>)}</div></section>
    </div>

    {source !== 'deliverable' && <section className="v2-nps-panel satisfaction-requests">
      <h2>Solicitações de avaliação</h2>
      <p>{cohort.length} solicitadas · {answered} respondidas · {waiting.length} aguardando · {closedUnanswered} encerradas sem resposta</p>
      {waiting.length > 0 && <ul>{waiting.map((entry, index) => <li key={entry.id} className={index >= requestsPage * 10 ? 'satisfaction-print-only' : undefined}>
        <span>{entry.account_records.title} · {formatDate(entry.closed_at)}</span>
        <Button type="button" variant="workflowSecondary" disabled={closing !== null} onClick={() => void closeRequest(entry.id)}>Encerrar espera</Button>
      </li>)}</ul>}
      {waiting.length > requestsPage * 10 && <Button type="button" variant="workflowSecondary"
        onClick={() => setRequestsPage((page) => page + 1)}>Mostrar mais solicitações</Button>}
    </section>}

    <div className="wf-group-head"><div><span>RESPOSTAS</span><strong>Todas as avaliações do período</strong></div><b>{filtered.length}</b></div>
    {loading?<LoadingState>Carregando avaliações…</LoadingState>:filtered.length?<div className="wf-records v2-nps-list">
      <div className="wf-record-row header"><span/><span>Empresa / Quem avaliou</span><span>Nota</span><span>Avaliação</span><span>Data</span><span>Origem</span><span>Registro</span></div>
      {filtered.map((row)=>{
        const href=row.sourceType==='record'&&row.entityId?`/admin/registros?record=${encodeURIComponent(row.entityId)}`:row.sourceType==='deliverable'&&row.entityId?`/admin/projetos?deliverable=${encodeURIComponent(row.entityId)}`:'';
        return <div className="wf-record-row" key={`${row.sourceType}-${row.id}`}>
          <span className="v2-record-logo">{row.companyLogoResolved?<img src={row.companyLogoResolved} alt=""/>:<span aria-hidden="true">{initials(row.company)}</span>}</span>
          <span className="v2-record-author"><strong>{row.company}</strong><small>{row.responderName||'Cliente'}</small></span>
          <span className="v2-nps-score"><span className={`wf-tag ${tone(row.score)}`}>{row.score}/5 · {scoreLabel(row.score)}</span>{row.score<=3&&(followups[followKey(row)]?<button type="button" className="v2-nps-follow done" title={followups[followKey(row)].note||'Sem anotação'} onClick={()=>openFollowup(row)}>Tratada · {themeLabel(followups[followKey(row)].theme)}</button>:<button type="button" className="v2-nps-follow" onClick={()=>openFollowup(row)}>Marcar como tratada</button>)}</span>
          <span className="v2-nps-comment"><strong>{row.title||'Avaliação do cliente'}</strong><small>{row.comment?.trim()||'Sem comentário adicional.'}</small></span>
          <span><time>{formatDate(row.createdAt)}</time></span>
          <span>{sourceLabel(row.sourceType)}</span>
          <span>{href?<a className="v2-nps-link" href={href}>{row.protocol||'Ver registro'} <ArrowUpRight size={13}/></a>:<small>Sem vínculo</small>}</span>
        </div>;
      })}
    </div>:<EmptyState variant="workflow"><strong>Nenhuma avaliação encontrada com os filtros atuais.</strong><p>Amplie o período ou limpe os filtros.</p></EmptyState>}


  </div></div>
  {editing&&<div className="ap-pd-overlay" onMouseDown={(event)=>{if(event.target===event.currentTarget)setEditing(null);}}><DialogFrame className="ap-status-confirm v2-nps-follow-dialog" aria-label="Tratativa da avaliação">
    <div><small>SATISFAÇÃO · NOTA {editing.score}/5</small><h2>{followups[followKey(editing)]?'Tratativa registrada':'Marcar como tratada'}</h2><p>{editing.company} · {editing.responderName||'Cliente'} · {editing.title||'Avaliação do cliente'}</p>{editing.comment?.trim()&&<p className="v2-nps-quote">“{editing.comment.trim()}”</p>}</div>
    <label>Tema do comentário<select value={draft.theme} onChange={(event)=>setDraft((current)=>({...current,theme:event.target.value}))}><option value="">Sem tema</option>{THEMES.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <label>O que foi feito<textarea value={draft.note} onChange={(event)=>setDraft((current)=>({...current,note:event.target.value}))} placeholder="Ex.: liguei em 12/10 e alinhamos novo prazo."/></label>
    {error&&<small className="v2-nps-follow-error">{error}</small>}
    <footer>{followups[followKey(editing)]&&<button type="button" className="v2-nps-remove" disabled={savingFollow} onClick={()=>void removeFollowup()}>Remover marcação</button>}<button type="button" onClick={()=>setEditing(null)}>Voltar</button><button type="button" disabled={savingFollow} onClick={()=>void saveFollowup()}>{savingFollow?'Salvando…':'Salvar'}</button></footer>
  </DialogFrame></div>}
  </div></Shell>;
}
