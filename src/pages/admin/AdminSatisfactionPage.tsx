import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, CalendarRange, Clock3, MessageSquareText, RefreshCw, Star, UserRound } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { resolveCompanyAsset } from '../../lib/companyWorkspaceLogo';
import { supabase } from '../../lib/supabase';

type SatisfactionRow = {
  id:string;
  companyId:string;
  company:string;
  companyLogoWorkspace?:string|null;
  companyLogoOriginal?:string|null;
  companyLogoResolved?:string;
  responderName?:string|null;
  responderAvatar?:string|null;
  responderAvatarResolved?:string;
  score:number;
  comment?:string|null;
  createdAt:string;
  sourceType:'record'|'deliverable';
  entityId?:string|null;
  protocol?:string|null;
  title?:string|null;
};

type PeriodPreset='30'|'90'|'180'|'365'|'all';

function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date).replace('.','');}
function scoreLabel(score:number){return score<=2?'Crítica':score===3?'Neutra':score===4?'Positiva':'Excelente';}
function sourceLabel(source:SatisfactionRow['sourceType']){return source==='record'?'Ocorrência / solicitação':'Entregável';}
function initials(value?:string|null){return (value||'C').split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'C';}

export function AdminSatisfactionPage(){
  const [rows,setRows]=useState<SatisfactionRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [period,setPeriod]=useState<PeriodPreset>('90');
  const [company,setCompany]=useState('all');
  const [source,setSource]=useState<'all'|'record'|'deliverable'>('all');
  const [score,setScore]=useState('all');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  // Solicitações finalizadas (visíveis ao cliente): denominador da taxa de resposta.
  const [closedRecords,setClosedRecords]=useState<{companyId:string;closedAt:string}[]>([]);

  async function load(){
    if(!supabase)return;setLoading(true);setError('');
    try{
      const result=await supabase.rpc('get_admin_satisfaction_responses_v39');
      if(result.error)throw result.error;
      const hydrated=await Promise.all(((result.data||[])as SatisfactionRow[]).map(async(row)=>({
        ...row,
        companyLogoResolved:await resolveCompanyAsset(row.companyLogoWorkspace||row.companyLogoOriginal||''),
        responderAvatarResolved:await resolveCompanyAsset(row.responderAvatar||''),
      })));
      setRows(hydrated);
      const closed=await supabase.from('account_records').select('company_id,closed_at,last_activity_at').eq('workflow_status','completed').eq('visibility','client');
      if(!closed.error)setClosedRecords((closed.data||[]).map((row:any)=>({companyId:row.company_id,closedAt:row.closed_at||row.last_activity_at})).filter((row)=>row.closedAt));
    }catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível carregar as avaliações.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const companies=useMemo(()=>Array.from(new Map(rows.map((row)=>[row.companyId,row.company])).entries()).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),[rows]);
  const range=useMemo(()=>{
    const now=new Date();
    let start:Date|null=null,end:Date|null=null;
    if(from){start=new Date(`${from}T00:00:00`);}else if(period!=='all'){start=new Date(now);start.setDate(start.getDate()-Number(period));start.setHours(0,0,0,0);}
    if(to){end=new Date(`${to}T23:59:59.999`);}
    return{start,end};
  },[period,from,to]);
  const periodFiltered=useMemo(()=>{
    const{start,end}=range;
    return rows.filter((row)=>{
      const created=new Date(row.createdAt);
      return (!start||created>=start)&&(!end||created<=end)&&(source==='all'||row.sourceType===source)&&(score==='all'||row.score===Number(score));
    });
  },[rows,range,source,score]);

  const filtered=useMemo(()=>periodFiltered.filter((row)=>company==='all'||row.companyId===company),[periodFiltered,company]);

  const metrics=useMemo(()=>{
    const total=filtered.length,average=total?filtered.reduce((sum,row)=>sum+row.score,0)/total:null;
    const comments=filtered.filter((row)=>Boolean(row.comment?.trim())).length;
    const attention=filtered.filter((row)=>row.score<=3).length;
    const distribution=[1,2,3,4,5].map((value)=>({score:value,count:filtered.filter((row)=>row.score===value).length}));
    const satisfied=filtered.filter((row)=>row.score>=4).length;
    return{total,average,comments,attention,distribution,satisfied};
  },[filtered]);

  // Taxa de resposta: só faz sentido para solicitações — no entregável a nota é parte da aprovação (sempre há avaliação).
  const responseRate=useMemo(()=>{
    const{start,end}=range;
    const finished=closedRecords.filter((row)=>{const closed=new Date(row.closedAt);return(!start||closed>=start)&&(!end||closed<=end)&&(company==='all'||row.companyId===company);}).length;
    const answered=rows.filter((row)=>{const created=new Date(row.createdAt);return row.sourceType==='record'&&(!start||created>=start)&&(!end||created<=end)&&(company==='all'||row.companyId===company);}).length;
    return{finished,answered,pct:finished?Math.min(100,Math.round(answered/finished*100)):null};
  },[closedRecords,rows,range,company]);

  // Variação por empresa: média do período contra a média do período anterior de mesmo tamanho.
  const previousAverage=useMemo(()=>{
    const map=new Map<string,number>();
    if(period==='all'||from||to||!range.start)return map;
    const end=range.start,start=new Date(end);start.setDate(start.getDate()-Number(period));
    const sums=new Map<string,{sum:number;count:number}>();
    rows.forEach((row)=>{const created=new Date(row.createdAt);if(created>=start&&created<end&&(source==='all'||row.sourceType===source)){const current=sums.get(row.companyId)||{sum:0,count:0};current.sum+=row.score;current.count+=1;sums.set(row.companyId,current);}});
    sums.forEach((value,key)=>map.set(key,value.sum/value.count));
    return map;
  },[rows,range,period,from,to,source]);

  const monthSeries=useMemo(()=>{
    const map=new Map<string,{sum:number;count:number}>();
    filtered.forEach((row)=>{const date=new Date(row.createdAt);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;const current=map.get(key)||{sum:0,count:0};current.sum+=row.score;current.count+=1;map.set(key,current);});
    return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([key,value])=>({key,label:new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(`${key}-01T12:00:00`)).replace('.',''),average:value.sum/value.count,count:value.count}));
  },[filtered]);

  const companySeries=useMemo(()=>{
    const map=new Map<string,{id:string;name:string;count:number;sum:number}>();
    periodFiltered.forEach((row)=>{const current=map.get(row.companyId)||{id:row.companyId,name:row.company,count:0,sum:0};current.count+=1;current.sum+=row.score;map.set(row.companyId,current);});
    return Array.from(map.values()).sort((a,b)=>b.count-a.count||b.sum-a.sum).slice(0,6).map((item)=>({...item,average:item.sum/item.count}));
  },[periodFiltered]);

  const sourceSeries=useMemo(()=>['deliverable','record'].map((value)=>({key:value,label:value==='deliverable'?'Entregáveis':'Ocorrências / solicitações',count:periodFiltered.filter((row)=>row.sourceType===value).length})),[periodFiltered]);

  function selectPreset(value:PeriodPreset){setPeriod(value);setFrom('');setTo('');}

  const tone=(value:number)=>value<=2?'red':value===3?'yellow':value===4?'blue':'green';
  const x=(index:number)=>45+(index*(545/Math.max(1,monthSeries.length-1)));
  const y=(average:number)=>185-((average-1)/4)*165;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-nps v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Satisfação</h1><p>Como os clientes avaliam cada entrega aprovada e cada solicitação finalizada, de 1 a 5.</p></div><div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> {loading?'Atualizando…':'Atualizar'}</button></div></div>
    {error&&<div className="inline-notice">{error}</div>}

    <div className="wf-controls v2-nps-controls">
      <div className="wf-segments">{([['30','30 dias'],['90','90 dias'],['180','6 meses'],['365','12 meses'],['all','Todo período']] as Array<[PeriodPreset,string]>).map(([value,label])=><button type="button" key={value} className={period===value&&!from&&!to?'on':''} onClick={()=>selectPreset(value)}>{label}</button>)}</div>
      <label className="v2-nps-date">De<input type="date" value={from} onChange={(e)=>{setFrom(e.target.value);setPeriod('all');}}/></label>
      <label className="v2-nps-date">Até<input type="date" value={to} onChange={(e)=>{setTo(e.target.value);setPeriod('all');}}/></label>
      <select className="wf-record-filter" aria-label="Empresa" value={company} onChange={(e)=>setCompany(e.target.value)}><option value="all">Todas as empresas</option>{companies.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select>
      <select className="wf-record-filter" aria-label="Origem" value={source} onChange={(e)=>setSource(e.target.value as any)}><option value="all">Todas as origens</option><option value="record">Ocorrências / solicitações</option><option value="deliverable">Entregáveis</option></select>
      <select className="wf-record-filter" aria-label="Nota" value={score} onChange={(e)=>setScore(e.target.value)}><option value="all">Todas as notas</option>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value}/5 · {scoreLabel(value)}</option>)}</select>
    </div>

    <section className="v2-nps-kpis">
      <article><i><Star size={16}/></i><span>Índice de satisfação</span><strong>{metrics.average==null?'—':metrics.average.toFixed(1).replace('.',',')}<small>/5</small></strong><em>média das notas do período</em></article>
      <article><i><BarChart3 size={16}/></i><span>Satisfeitos</span><strong>{metrics.total?Math.round(metrics.satisfied/metrics.total*100):0}%</strong><em>{metrics.satisfied} de {metrics.total} com nota 4 ou 5</em></article>
      <article><i><MessageSquareText size={16}/></i><span>Base do período</span><strong>{metrics.total}</strong><em>{metrics.total===1?'avaliação registrada':'avaliações registradas'}</em></article>
      <article className={responseRate.pct!=null&&responseRate.pct<30?'weak':''}><i><Clock3 size={16}/></i><span>Taxa de resposta</span><strong>{responseRate.pct==null?'—':`${responseRate.pct}%`}</strong><em>{responseRate.finished?`${responseRate.answered} de ${responseRate.finished} solicitações finalizadas${responseRate.pct!=null&&responseRate.pct<30?' · sinal fraco':''}`:'sem solicitações finalizadas no período'}</em></article>
      <article><i><UserRound size={16}/></i><span>Feedback qualitativo</span><strong>{metrics.total?Math.round(metrics.comments/metrics.total*100):0}%</strong><em>{metrics.comments} com comentário</em></article>
      <article className={metrics.attention?'attention':''}><i><CalendarRange size={16}/></i><span>Pedem atenção</span><strong>{metrics.attention}</strong><em>notas de 1 a 3 · ação CALI</em></article>
    </section>

    <div className="v2-nps-grid">
      <section className="v2-nps-panel"><header><div><small>DISTRIBUIÇÃO</small><h2>Como as notas estão concentradas</h2></div></header><div className="v2-nps-dist">{metrics.distribution.slice().reverse().map((item)=>{const pct=metrics.total?Math.round(item.count/metrics.total*100):0;return <div key={item.score}><span>{item.score}/5</span><div><i className={tone(item.score)} style={{width:`${pct}%`}}/></div><strong>{item.count}</strong><small>{pct}%</small></div>;})}</div></section>
      <section className="v2-nps-panel"><header><div><small>EVOLUÇÃO</small><h2>Satisfação ao longo do tempo</h2></div><span>média mensal · 1–5</span></header>{monthSeries.length>1?<div className="v2-nps-line"><svg viewBox="0 0 620 220" role="img" aria-label="Evolução mensal da satisfação"><line x1="38" y1="20" x2="38" y2="185"/><line x1="38" y1="185" x2="600" y2="185"/>{[1,2,3,4,5].map((value)=><text key={value} x="8" y={190-(value-1)*41}>{value}</text>)}<polyline points={monthSeries.map((item,index)=>`${x(index)},${y(item.average)}`).join(' ')} fill="none"/>{monthSeries.map((item,index)=><g key={item.key}><circle cx={x(index)} cy={y(item.average)} r="4.5"/><text className="line-value" x={x(index)} y={y(item.average)-9}>{item.average.toFixed(1).replace('.',',')}</text><text className="line-label" x={x(index)} y="207">{item.label}</text></g>)}</svg></div>:<p className="v2-nps-empty">São necessárias pelo menos duas referências mensais para mostrar uma tendência.</p>}</section>
      <section className="v2-nps-panel"><header><div><small>RECORTE POR EMPRESA</small><h2>Onde a percepção está concentrada</h2></div><BarChart3 size={16}/></header>{companySeries.length?<div className="v2-nps-rank">{companySeries.map((item)=><div key={item.id}><div><strong>{item.name}</strong><small>{item.count} {item.count===1?'avaliação':'avaliações'} · média {item.average.toFixed(1).replace('.',',')}{(()=>{const before=previousAverage.get(item.id);if(before==null)return null;const delta=item.average-before;if(Math.abs(delta)<0.05)return <b className="flat"> · estável</b>;return <b className={delta<0?'down':'up'}> · {delta<0?'▼':'▲'} {Math.abs(delta).toFixed(1).replace('.',',')} vs período anterior</b>;})()}</small></div><div><i style={{width:`${Math.max(8,item.average/5*100)}%`}}/></div></div>)}</div>:<p className="v2-nps-empty">Sem avaliações no recorte.</p>}</section>
      <section className="v2-nps-panel"><header><div><small>ORIGEM DA AVALIAÇÃO</small><h2>De onde o feedback está vindo</h2></div><Clock3 size={16}/></header><div className="v2-nps-source">{sourceSeries.map((item)=><div key={item.key}><span>{item.label}</span><strong>{item.count}</strong><div><i style={{width:`${periodFiltered.length?item.count/periodFiltered.length*100:0}%`}}/></div></div>)}</div></section>
    </div>

    <div className="wf-group-head"><div><span>RESPOSTAS</span><strong>Todas as avaliações do período</strong></div><b>{filtered.length}</b></div>
    {loading?<div className="data-loading">Carregando avaliações…</div>:filtered.length?<div className="wf-records v2-nps-list">
      <div className="wf-record-row header"><span/><span>Empresa / Quem avaliou</span><span>Nota</span><span>Avaliação</span><span>Data</span><span>Origem</span><span>Registro</span></div>
      {filtered.map((row)=>{
        const href=row.sourceType==='record'&&row.entityId?`/admin/registros?record=${encodeURIComponent(row.entityId)}`:row.sourceType==='deliverable'&&row.entityId?`/admin/projetos?deliverable=${encodeURIComponent(row.entityId)}`:'';
        return <div className="wf-record-row" key={`${row.sourceType}-${row.id}`}>
          <span className="v2-record-logo">{row.companyLogoResolved?<img src={row.companyLogoResolved} alt=""/>:<span aria-hidden="true">{initials(row.company)}</span>}</span>
          <span className="v2-record-author"><strong>{row.company}</strong><small>{row.responderName||'Cliente'}</small></span>
          <span><span className={`wf-tag ${tone(row.score)}`}>{row.score}/5 · {scoreLabel(row.score)}</span></span>
          <span className="v2-nps-comment"><strong>{row.title||'Avaliação do cliente'}</strong><small>{row.comment?.trim()||'Sem comentário adicional.'}</small></span>
          <span><time>{formatDate(row.createdAt)}</time></span>
          <span>{sourceLabel(row.sourceType)}</span>
          <span>{href?<a className="v2-nps-link" href={href}>{row.protocol||'Ver registro'} <ArrowUpRight size={13}/></a>:<small>Sem vínculo</small>}</span>
        </div>;
      })}
    </div>:<div className="wf-empty"><strong>Nenhuma avaliação encontrada com os filtros atuais.</strong><p>Amplie o período ou limpe os filtros.</p></div>}

    <p className="v2-nps-note">A avaliação nasce quando o cliente aprova um entregável ou quando uma solicitação visível a ele é finalizada. As duas origens são reunidas aqui sem misturar o contexto de cada uma. A taxa de resposta considera só as solicitações: no entregável a nota faz parte da aprovação.</p>
  </div></div></div></Shell>;
}
