import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, CalendarRange, CheckCircle2, Clock3, MessageSquareText, RefreshCw, Star, UserRound } from 'lucide-react';
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
    }catch(requestError){setError(requestError instanceof Error?requestError.message:'Não foi possível carregar as avaliações.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const companies=useMemo(()=>Array.from(new Map(rows.map((row)=>[row.companyId,row.company])).entries()).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),[rows]);
  const periodFiltered=useMemo(()=>{
    const now=new Date();
    let start:Date|null=null,end:Date|null=null;
    if(from){start=new Date(`${from}T00:00:00`);}else if(period!=='all'){start=new Date(now);start.setDate(start.getDate()-Number(period));start.setHours(0,0,0,0);}
    if(to){end=new Date(`${to}T23:59:59.999`);}
    return rows.filter((row)=>{
      const created=new Date(row.createdAt);
      return (!start||created>=start)&&(!end||created<=end)&&(source==='all'||row.sourceType===source)&&(score==='all'||row.score===Number(score));
    });
  },[rows,period,source,score,from,to]);

  const filtered=useMemo(()=>periodFiltered.filter((row)=>company==='all'||row.companyId===company),[periodFiltered,company]);

  const metrics=useMemo(()=>{
    const total=filtered.length,average=total?filtered.reduce((sum,row)=>sum+row.score,0)/total:null;
    const comments=filtered.filter((row)=>Boolean(row.comment?.trim())).length;
    const attention=filtered.filter((row)=>row.score<=3).length;
    const distribution=[1,2,3,4,5].map((value)=>({score:value,count:filtered.filter((row)=>row.score===value).length}));
    return{total,average,comments,attention,distribution};
  },[filtered]);

  const monthSeries=useMemo(()=>{
    const map=new Map<string,{sum:number;count:number}>();
    filtered.forEach((row)=>{const date=new Date(row.createdAt);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;const current=map.get(key)||{sum:0,count:0};current.sum+=row.score;current.count+=1;map.set(key,current);});
    return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([key,value])=>({key,label:new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(`${key}-01T12:00:00`)).replace('.',''),average:value.sum/value.count,count:value.count}));
  },[filtered]);

  const companySeries=useMemo(()=>{
    const map=new Map<string,{name:string;count:number;sum:number}>();
    periodFiltered.forEach((row)=>{const current=map.get(row.companyId)||{name:row.company,count:0,sum:0};current.count+=1;current.sum+=row.score;map.set(row.companyId,current);});
    return Array.from(map.values()).sort((a,b)=>b.count-a.count||b.sum-a.sum).slice(0,6).map((item)=>({...item,average:item.sum/item.count}));
  },[periodFiltered]);

  const sourceSeries=useMemo(()=>['deliverable','record'].map((value)=>({key:value,label:value==='deliverable'?'Entregáveis':'Ocorrências / solicitações',count:periodFiltered.filter((row)=>row.sourceType===value).length})),[periodFiltered]);

  function selectPreset(value:PeriodPreset){setPeriod(value);setFrom('');setTo('');}

  return <Shell role="admin"><section className="page satisfaction-page-v39">
    <div className="eyebrow">EXPERIÊNCIA DO CLIENTE</div>
    <div className="page-heading satisfaction-heading-v39"><div><h1>NPS & satisfação</h1><p>Panorama consolidado de todas as avaliações registradas no Workspace, com leitura por período, cliente, origem e nota.</p></div><button className="secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>{loading?'Atualizando…':'Atualizar'}</button></div>
    {error&&<div className="inline-notice">{error}</div>}

    <section className="satisfaction-filter-panel-v39 panel">
      <div className="satisfaction-period-tabs-v39">
        {([['30','30 dias'],['90','90 dias'],['180','6 meses'],['365','12 meses'],['all','Todo período']] as Array<[PeriodPreset,string]>).map(([value,label])=><button key={value} className={period===value&&!from&&!to?'active':''} onClick={()=>selectPreset(value)}>{label}</button>)}
      </div>
      <div className="satisfaction-filter-grid-v39">
        <label>De<input type="date" value={from} onChange={(e)=>{setFrom(e.target.value);setPeriod('all');}}/></label>
        <label>Até<input type="date" value={to} onChange={(e)=>{setTo(e.target.value);setPeriod('all');}}/></label>
        <label>Cliente<select value={company} onChange={(e)=>setCompany(e.target.value)}><option value="all">Todos os clientes</option>{companies.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
        <label>Origem<select value={source} onChange={(e)=>setSource(e.target.value as any)}><option value="all">Todas as origens</option><option value="record">Ocorrências / solicitações</option><option value="deliverable">Entregáveis</option></select></label>
        <label>Nota<select value={score} onChange={(e)=>setScore(e.target.value)}><option value="all">Todas as notas</option>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value}/5 · {scoreLabel(value)}</option>)}</select></label>
      </div>
    </section>

    <section className="satisfaction-kpis-v39 satisfaction-kpis-v40">
      <article><span>Índice de satisfação</span><strong>{metrics.average==null?'—':metrics.average.toFixed(1).replace('.',',')}</strong><small>escala real do Workspace · 1–5</small><i><Star size={19}/></i></article>
      <article><span>Base do período</span><strong>{metrics.total}</strong><small>{metrics.total===1?'avaliação registrada':'avaliações registradas'}</small><i><MessageSquareText size={19}/></i></article>
      <article><span>Feedback qualitativo</span><strong>{metrics.total?Math.round(metrics.comments/metrics.total*100):0}%</strong><small>{metrics.comments} com comentário</small><i><UserRound size={19}/></i></article>
      <article className={metrics.attention?'attention':''}><span>Pedem atenção</span><strong>{metrics.attention}</strong><small>notas de 1 a 3 · ação CALI</small><i><CalendarRange size={19}/></i></article>
    </section>

    <div className="satisfaction-analysis-grid-v39">
      <section className="panel satisfaction-distribution-panel-v39"><div className="panel-title"><div><span className="section-kicker">DISTRIBUIÇÃO</span><h2>Como as notas estão concentradas</h2></div></div><div className="satisfaction-dist-v39">{metrics.distribution.slice().reverse().map((item)=>{const pct=metrics.total?Math.round(item.count/metrics.total*100):0;return <div key={item.score}><span>{item.score}/5</span><div><i style={{width:`${pct}%`}}/></div><strong>{item.count}</strong><small>{pct}%</small></div>;})}</div></section>
      <section className="panel satisfaction-trend-panel-v39"><div className="panel-title"><div><span className="section-kicker">EVOLUÇÃO</span><h2>Satisfação ao longo do tempo</h2></div><span>média mensal · 1–5</span></div>{monthSeries.length>1?<div className="satisfaction-line-chart-v40"><svg viewBox="0 0 620 220" role="img" aria-label="Evolução mensal da satisfação"><line x1="38" y1="20" x2="38" y2="185"/><line x1="38" y1="185" x2="600" y2="185"/>{[1,2,3,4,5].map((value)=><text key={value} x="8" y={190-(value-1)*41}>{value}</text>)}<polyline points={monthSeries.map((item,index)=>`${45+(index*(545/Math.max(1,monthSeries.length-1)))},${185-((item.average-1)/4)*165}`).join(' ')} fill="none"/><g>{monthSeries.map((item,index)=><g key={item.key}><circle cx={45+(index*(545/Math.max(1,monthSeries.length-1)))} cy={185-((item.average-1)/4)*165} r="5"/><text className="line-value" x={45+(index*(545/Math.max(1,monthSeries.length-1)))} y={177-((item.average-1)/4)*165}>{item.average.toFixed(1).replace('.',',')}</text><text className="line-label" x={45+(index*(545/Math.max(1,monthSeries.length-1)))} y="207">{item.label}</text></g>)}</g></svg></div>:<div className="satisfaction-empty-v39">São necessárias pelo menos duas referências mensais para mostrar uma tendência.</div>}</section>
    </div>

    <div className="satisfaction-secondary-grid-v40">
      <section className="panel satisfaction-client-ranking-v40"><div className="panel-title"><div><span className="section-kicker">RECORTE POR CLIENTE</span><h2>Onde a percepção está concentrada</h2></div><BarChart3 size={18}/></div>{companySeries.length?<div className="satisfaction-ranking-list-v40">{companySeries.map((item)=><div key={item.name}><div><strong>{item.name}</strong><small>{item.count} {item.count===1?'avaliação':'avaliações'} · média {item.average.toFixed(1).replace('.',',')}</small></div><div><i style={{width:`${Math.max(8,item.average/5*100)}%`}}/></div></div>)}</div>:<div className="satisfaction-empty-v39">Sem avaliações no recorte.</div>}</section>
      <section className="panel satisfaction-source-panel-v40"><div className="panel-title"><div><span className="section-kicker">ORIGEM DA AVALIAÇÃO</span><h2>De onde o feedback está vindo</h2></div><Clock3 size={18}/></div><div className="satisfaction-source-list-v40">{sourceSeries.map((item)=><div key={item.key}><span>{item.label}</span><strong>{item.count}</strong><div><i style={{width:`${periodFiltered.length?item.count/periodFiltered.length*100:0}%`}}/></div></div>)}</div><p className="satisfaction-chart-note-v40">A avaliação nasce ao aprovar um entregável ou ao finalizar uma solicitação visível ao cliente. As duas fontes são consolidadas aqui sem misturar o contexto original.</p></section>
    </div>

    <section className="panel satisfaction-flow-panel-v40"><div className="panel-title"><div><span className="section-kicker">FLUXO DO DADO</span><h2>Como a avaliação chega a esta página</h2></div><CheckCircle2 size={18}/></div><div className="satisfaction-flow-steps-v40"><div><b>01</b><strong>Momento da experiência</strong><span>Entregável aprovado ou solicitação finalizada.</span></div><div><b>02</b><strong>Cliente responde</strong><span>Nota de 1 a 5 e comentário quando necessário.</span></div><div><b>03</b><strong>Workspace registra</strong><span>Origem, cliente, respondente, data, protocolo e vínculo.</span></div><div><b>04</b><strong>CALI interpreta</strong><span>Distribuição, tendência e prioridade de ação.</span></div></div></section>

    <section className="panel satisfaction-response-panel-v39">
      <div className="panel-title"><div><span className="section-kicker">RESPOSTAS</span><h2>Todas as avaliações do período</h2></div><span>{filtered.length} {filtered.length===1?'resposta':'respostas'}</span></div>
      {loading?<div className="data-loading">Carregando avaliações…</div>:filtered.length?<div className="satisfaction-response-list-v39">{filtered.map((row)=>{
        const href=row.sourceType==='record'&&row.entityId?`/admin/registros?record=${encodeURIComponent(row.entityId)}`:'/admin/projetos';
        return <article key={`${row.sourceType}-${row.id}`}>
          <div className="satisfaction-company-v39"><span className="workspace-company-logo-tile-v39" style={{width:62,height:62,minWidth:62,display:'grid',placeItems:'center',overflow:'hidden',borderRadius:15,flex:'0 0 62px',boxSizing:'border-box',background:'#F7F3EE',border:'1px solid #E3D7CE'}}>{row.companyLogoResolved?<img src={row.companyLogoResolved} alt="" style={{width:'100%',height:'100%',display:'block',objectFit:'cover',borderRadius:'inherit'}}/>:<strong>{initials(row.company)}</strong>}</span><div><strong>{row.company}</strong><small>{sourceLabel(row.sourceType)}</small></div></div>
          <div className="satisfaction-score-v39"><strong>{row.score}/5</strong><span>{scoreLabel(row.score)}</span></div>
          <div className="satisfaction-feedback-v39"><strong>{row.title||row.protocol||'Avaliação do cliente'}</strong><p>{row.comment?.trim()||'Sem comentário adicional.'}</p><small>{formatDate(row.createdAt)}</small></div>
          <div className="satisfaction-responder-v39"><span style={{width:52,height:52,minWidth:52,display:'grid',placeItems:'center',padding:4,flex:'0 0 52px',overflow:'hidden',borderRadius:16,boxSizing:'border-box',border:'1px solid rgba(90,30,45,.24)',background:'transparent'}}><span className="satisfaction-responder-avatar-v48 profile-person-frame-v47" style={{width:42,height:42,minWidth:42,display:'grid',placeItems:'center',flex:'0 0 42px',overflow:'hidden',borderRadius:12}}>{row.responderAvatarResolved?<img src={row.responderAvatarResolved} alt="" style={{width:'100%',height:'100%',display:'block',objectFit:'cover'}}/>:initials(row.responderName)}</span></span><div><strong>{row.responderName||'Cliente'}</strong><small>respondente</small></div></div>
          <a href={href} aria-label="Abrir origem">Abrir <ArrowUpRight size={15}/></a>
        </article>;
      })}</div>:<div className="satisfaction-empty-v39">Nenhuma avaliação encontrada com os filtros atuais.</div>}
    </section>
  </section></Shell>;
}

