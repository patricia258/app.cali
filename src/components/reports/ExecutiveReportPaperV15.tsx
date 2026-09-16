import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import { groupHours, packageLabel, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import {
  deliveryRowsForPdf,
  deliveryTimingLabelV14,
  formatHoursV14,
  reportKpisV14,
  type DeliveryPerformanceRow,
} from '../../lib/reportV14';

type Company = { name:string; logoUrl?:string|null };
type Props = {
  company:Company;
  snapshot:IntelligenceSnapshot;
  editor:ReportEditor;
  reportType:ReportType;
  periodName:string;
  protocol:string;
  deliveries:DeliveryPerformanceRow[];
};

const CALI_LOGO='https://mapa.calirh.com/logo.svg';

function lines(value:string){return String(value||'').split('\n').map((item)=>item.trim()).filter(Boolean);}
function formatDate(value?:string|null){
  if(!value)return '—';
  const date=new Date(`${String(value).slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(date);
}
function periodRange(snapshot:IntelligenceSnapshot){return `${formatDate(snapshot.period.start)} a ${formatDate(snapshot.period.end)}`;}

export function ExecutiveReportPaperV15({company,snapshot,editor,reportType,periodName,protocol,deliveries}:Props){
  const kpis=reportKpisV14(snapshot,deliveries);
  const usedMinutes=Math.max(0,Number(kpis.consumedMinutes||0));
  const contractedMinutes=Math.max(0,Number(kpis.contractedHours||0)*60);
  const usagePercent=contractedMinutes?Math.round((usedMinutes/contractedMinutes)*100):null;
  const extraMinutes=Math.max(0,usedMinutes-contractedMinutes);
  const hourGroups=groupHours(snapshot).slice(0,5);
  const deliveryRows=deliveryRowsForPdf(snapshot,deliveries).slice(0,6);
  const demands=lines(editor.movements).slice(0,4);
  const risks=lines(editor.risks).slice(0,3);
  const decisions=lines(editor.decisions).slice(0,4);
  const nextSteps=lines(editor.nextSteps).slice(0,3);
  const feedback=snapshot.feedback.responses.filter((item)=>item.comment?.trim()).slice(0,2);
  const showSecondPage=Boolean(risks.length||decisions.length||nextSteps.length||feedback.length);
  const cycleLabel=snapshot.cycleContext?.projectName||kpis.cycleLabel||snapshot.projects[0]?.name||'Acompanhamento CALI';
  const documentType=reportType==='quarterly'?'RELATÓRIO TRIMESTRAL':'RELATÓRIO MENSAL';

  return <div className="reports-v15-document">
    <article className="reports-v15-sheet reports-v15-sheet-one">
      <header className="reports-v15-paper-header">
        <div className="reports-v15-brand"><img src={CALI_LOGO} alt="CALI RH"/></div>
        <div className="reports-v15-paper-client">
          <div><small>{documentType}</small><strong>{company.name}</strong><span>{periodName}</span></div>
          {company.logoUrl?<img src={company.logoUrl} alt={company.name}/>:null}
        </div>
      </header>

      <div className="reports-v15-paper-meta">
        <span>{packageLabel(snapshot)}</span><i/><span>{cycleLabel}</span><i/><span>{periodRange(snapshot)}</span>
      </div>

      <section className="reports-v15-summary">
        <h2>Leitura do período</h2>
        <p>{editor.summary.trim()||'A leitura executiva deste período ainda está em revisão.'}</p>
      </section>

      <section className="reports-v15-capacity">
        <div className="reports-v15-section-title"><div><h2>Uso da capacidade contratada</h2><p>Horas registradas no Workspace no período.</p></div></div>
        <div className="reports-v15-capacity-numbers">
          <div><small>Contratadas</small><strong>{kpis.contractedHours?`${kpis.contractedHours}h`:'—'}</strong></div>
          <div><small>Utilizadas</small><strong>{formatHoursV14(usedMinutes)}</strong></div>
          <div><small>{extraMinutes>0?'Consumo adicional':'Capacidade utilizada'}</small><strong>{extraMinutes>0?`+${formatHoursV14(extraMinutes)}`:usagePercent===null?'—':`${usagePercent}%`}</strong></div>
        </div>
        {contractedMinutes>0&&<div className="reports-v15-capacity-track" aria-label={`${usagePercent||0}% da capacidade utilizada`}><span style={{width:`${Math.min(100,Math.max(0,usagePercent||0))}%`}}/></div>}
        <p className="reports-v15-capacity-note">Horas não utilizadas no período não são cumulativas nem convertidas em crédito para o período seguinte.</p>
        {hourGroups.length>0&&<table className="reports-v15-hours-table"><thead><tr><th>Onde houve dedicação</th><th>Horas</th></tr></thead><tbody>{hourGroups.map((item)=><tr key={item.label}><td>{item.label}</td><td>{formatHoursV14(item.minutes)}</td></tr>)}</tbody></table>}
      </section>

      <section className="reports-v15-deliveries">
        <div className="reports-v15-section-title"><div><h2>Entregas e andamento</h2><p>{kpis.plannedDeliveries?`${kpis.completedDeliveries} de ${kpis.plannedDeliveries} entregas previstas concluídas.`:'Entregas movimentadas no período.'}</p></div>{kpis.deliveryAdherence!==null?<strong>{kpis.deliveryAdherence}% no prazo</strong>:null}</div>
        {deliveryRows.length?<table><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{deliveryRows.map((item)=><tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream?<small>{item.workstream}</small>:null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table>:<p className="reports-v15-empty">Nenhum entregável com movimentação registrada neste período.</p>}
      </section>

      {demands.length>0&&<section className="reports-v15-demands"><div className="reports-v15-section-title"><div><h2>Demandas recebidas no período</h2><p>Solicitações e movimentos adicionais considerados relevantes para a prestação de contas.</p></div></div><ul>{demands.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></section>}

      <footer className="reports-v15-page-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>1{showSecondPage?' / 2':''}</b></footer>
    </article>

    {showSecondPage&&<article className="reports-v15-sheet reports-v15-sheet-two">
      <header className="reports-v15-paper-header compact">
        <div className="reports-v15-brand"><img src={CALI_LOGO} alt="CALI RH"/></div>
        <div className="reports-v15-paper-client"><div><small>LEITURA EXECUTIVA</small><strong>{company.name}</strong><span>{periodName}</span></div></div>
      </header>

      <div className="reports-v15-page-two-intro"><span>PRÓXIMO MOVIMENTO</span><h1>O que merece atenção e direção após este fechamento.</h1></div>

      {risks.length>0&&<section className="reports-v15-executive-block"><h2>Pontos de atenção</h2><div className="reports-v15-attention-list">{risks.map((item,index)=><article key={`${item}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><p>{item}</p></article>)}</div></section>}

      {decisions.length>0&&<section className="reports-v15-executive-block"><h2>Decisões relevantes do período</h2><ol>{decisions.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ol></section>}

      {nextSteps.length>0&&<section className="reports-v15-executive-block next"><h2>{reportType==='quarterly'?'Prioridades do próximo trimestre':'Próximos movimentos'}</h2><div>{nextSteps.map((item,index)=><article key={`${item}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><p>{item}</p></article>)}</div></section>}

      {feedback.length>0&&<section className="reports-v15-feedback"><small>PERCEPÇÃO DO CLIENTE</small>{snapshot.feedback.count>=3&&snapshot.feedback.average!==null?<strong>{Number(snapshot.feedback.average).toFixed(1)} / 10</strong>:null}<p>{feedback[0]?.comment}</p>{snapshot.feedback.count<3?<span>Leitura qualitativa · amostra insuficiente para indicador estatístico.</span>:<span>{snapshot.feedback.count} resposta(s) no período.</span>}</section>}

      <footer className="reports-v15-page-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>2 / 2</b></footer>
    </article>}
  </div>;
}
