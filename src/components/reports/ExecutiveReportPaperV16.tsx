import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import { groupHours, packageLabel, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import { deliveryRowsForPdf, deliveryTimingLabelV14, formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportV14';
import { feedbackLabelV16, periodChangeSignalsV16 } from '../../lib/reportV16';

type Company={name:string;logoUrl?:string|null};
type Props={company:Company;snapshot:IntelligenceSnapshot;editor:ReportEditor;reportType:ReportType;periodName:string;protocol:string;deliveries:DeliveryPerformanceRow[]};

const CALI_LOGO='https://mapa.calirh.com/logo.svg';
function lines(value:string){return String(value||'').split('\n').map((item)=>item.trim()).filter(Boolean);}
function formatDate(value?:string|null){if(!value)return'—';const date=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(date);}
function periodRange(snapshot:IntelligenceSnapshot){return `${formatDate(snapshot.period.start)} a ${formatDate(snapshot.period.end)}`;}
function responsibleLabel(value:string){if(value==='client')return'Cliente';if(value==='shared')return'CALI + cliente';if(value==='flow')return'Fluxo';return value||'—';}

export function ExecutiveReportPaperV16({company,snapshot,editor,reportType,periodName,protocol,deliveries}:Props){
  const kpis=reportKpisV14(snapshot,deliveries);
  const usedMinutes=Math.max(0,Number(kpis.consumedMinutes||0));
  const contractedMinutes=Math.max(0,Number(kpis.contractedHours||0)*60);
  const usagePercent=contractedMinutes?Math.round((usedMinutes/contractedMinutes)*100):null;
  const extraMinutes=Math.max(0,usedMinutes-contractedMinutes);
  const hourGroups=groupHours(snapshot).slice(0,4);
  const deliveryRows=deliveryRowsForPdf(snapshot,deliveries).slice(0,5);
  const changes=periodChangeSignalsV16(snapshot,reportType);
  const demands=lines(editor.movements).slice(0,5);
  const risks=lines(editor.risks).slice(0,3);
  const decisions=lines(editor.decisions).slice(0,4);
  const nextSteps=lines(editor.nextSteps).slice(0,3);
  const dependencies=(snapshot.dependencies?.items||[]).filter((item)=>Number(item.delayBusinessDays||0)>0||Number(item.impactBusinessDays||0)>0).slice(0,3);
  const feedback=snapshot.feedback.responses.filter((item)=>item.comment?.trim()).slice(0,2);
  const feedbackLabel=feedbackLabelV16(snapshot);
  const showSecondPage=Boolean(demands.length||risks.length||decisions.length||nextSteps.length||feedback.length||dependencies.length);
  const cycleLabel=snapshot.cycleContext?.projectName||kpis.cycleLabel||snapshot.projects[0]?.name||'Acompanhamento CALI';
  const documentType=reportType==='quarterly'?'RELATÓRIO TRIMESTRAL':'RELATÓRIO MENSAL';

  return <div className="reports-v16-document">
    <article className="reports-v16-paper reports-v16-paper-one">
      <header className="reports-v16-paper-header">
        <div className="reports-v16-brand"><img src={CALI_LOGO} alt="CALI RH"/></div>
        <div className="reports-v16-client-id"><div><small>{documentType}</small><strong>{company.name}</strong><span>{periodName}</span></div>{company.logoUrl?<img src={company.logoUrl} alt={company.name}/>:null}</div>
      </header>
      <div className="reports-v16-meta"><span>{packageLabel(snapshot)}</span><i/><span>{cycleLabel}</span><i/><span>{periodRange(snapshot)}</span></div>

      <section className="reports-v16-reading">
        <span className="reports-v16-kicker">LEITURA EXECUTIVA CALI</span>
        <h1>O que este período revela.</h1>
        <p>{editor.summary.trim()||'A leitura executiva deste período ainda está em revisão.'}</p>
      </section>

      <section className="reports-v16-facts">
        <div className="reports-v16-section-head"><div><small>FATOS DO PERÍODO</small><h2>Execução em uma leitura.</h2></div></div>
        <div className="reports-v16-metrics">
          <div><small>Capacidade utilizada</small><strong>{usagePercent===null?'—':`${usagePercent}%`}</strong><span>{formatHoursV14(usedMinutes)} de {kpis.contractedHours?`${kpis.contractedHours}h`:'—'}</span></div>
          <div><small>Entregas previstas</small><strong>{kpis.completedDeliveries}/{kpis.plannedDeliveries}</strong><span>concluídas no período</span></div>
          <div><small>Aderência ao prazo</small><strong>{kpis.deliveryAdherence===null?'—':`${kpis.deliveryAdherence}%`}</strong><span>{kpis.deliveryAdherence===null?'sem base concluída':'das conclusões avaliadas'}</span></div>
          <div><small>Percepção do cliente</small><strong>{feedbackLabel||'—'}</strong><span>{snapshot.feedback.count?`${snapshot.feedback.count} avaliação(ões)`:'sem avaliação no período'}</span></div>
        </div>
        {extraMinutes>0?<p className="reports-v16-capacity-note">Consumo adicional no período: <strong>+{formatHoursV14(extraMinutes)}</strong>.</p>:null}
      </section>

      {(deliveryRows.length||hourGroups.length)?<section className="reports-v16-execution-grid">
        <div className="reports-v16-execution-block"><div className="reports-v16-section-head compact"><div><small>ENTREGAS</small><h2>Planejado x realizado</h2></div></div>{deliveryRows.length?<table><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{deliveryRows.map((item)=><tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream?<span>{item.workstream}</span>:null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table>:<p className="reports-v16-empty">Nenhum entregável movimentado no período.</p>}</div>
        {hourGroups.length?<div className="reports-v16-hours"><div className="reports-v16-section-head compact"><div><small>DEDICAÇÃO</small><h2>Onde o tempo foi aplicado</h2></div></div>{hourGroups.map((item)=><div className="reports-v16-hour-row" key={item.label}><span>{item.label}</span><b>{formatHoursV14(item.minutes)}</b></div>)}</div>:null}
      </section>:null}

      {changes.length?<section className="reports-v16-changes"><div className="reports-v16-section-head compact"><div><small>COMPARATIVO</small><h2>{reportType==='quarterly'?'Evolução dentro do trimestre':'O que mudou desde o fechamento anterior'}</h2></div></div><div>{changes.map((item)=><article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div></section>:null}

      <footer className="reports-v16-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>1{showSecondPage?' / 2':''}</b></footer>
    </article>

    {showSecondPage?<article className="reports-v16-paper reports-v16-paper-two">
      <header className="reports-v16-paper-header compact"><div className="reports-v16-brand"><img src={CALI_LOGO} alt="CALI RH"/></div><div className="reports-v16-client-id"><div><small>LEITURA E DIREÇÃO</small><strong>{company.name}</strong><span>{periodName}</span></div></div></header>
      <div className="reports-v16-page-two-title"><span>DO FATO À DIREÇÃO</span><h1>O que merece decisão, atenção e movimento.</h1></div>

      {demands.length?<section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>DEMANDAS RELEVANTES</small><h2>O que entrou no período</h2></div></div><ul>{demands.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></section>:null}

      {dependencies.length?<section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>DEPENDÊNCIAS</small><h2>Pontos com impacto no fluxo</h2></div></div><div className="reports-v16-dependencies">{dependencies.map((item,index)=><article key={`${item.title}-${index}`}><div><strong>{item.title}</strong><span>{responsibleLabel(item.responsible)}</span></div><p>{item.detail||'Dependência em acompanhamento.'}</p>{Math.max(Number(item.delayBusinessDays||0),Number(item.impactBusinessDays||0))>0?<b>Impacto: {Math.max(Number(item.delayBusinessDays||0),Number(item.impactBusinessDays||0))} dia(s) útil(eis)</b>:null}</article>)}</div></section>:null}

      {risks.length?<section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>PONTOS DE ATENÇÃO</small><h2>O que merece leitura executiva</h2></div></div><div className="reports-v16-numbered">{risks.map((item,index)=><article key={`${item}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><p>{item}</p></article>)}</div></section>:null}

      {decisions.length?<section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>DECISÕES</small><h2>Direcionamentos registrados</h2></div></div><ol>{decisions.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ol></section>:null}

      {nextSteps.length?<section className="reports-v16-editorial-block next"><div className="reports-v16-section-head compact"><div><small>{reportType==='quarterly'?'PRÓXIMO TRIMESTRE':'PRÓXIMO CICLO'}</small><h2>{reportType==='quarterly'?'Prioridades do próximo trimestre':'Próximos movimentos'}</h2></div></div><div className="reports-v16-numbered">{nextSteps.map((item,index)=><article key={`${item}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><p>{item}</p></article>)}</div></section>:null}

      {(feedbackLabel||feedback.length)?<section className="reports-v16-feedback"><div><small>PERCEPÇÃO DO CLIENTE</small>{feedbackLabel?<strong>{feedbackLabel}</strong>:null}<span>{snapshot.feedback.count} avaliação(ões) no período</span></div>{feedback[0]?.comment?<blockquote>“{feedback[0].comment}”</blockquote>:<p>Não houve comentário adicional associado às avaliações deste período.</p>}</section>:null}

      <footer className="reports-v16-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>2 / 2</b></footer>
    </article>:null}
  </div>;
}
