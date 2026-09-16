import type { ReportType } from './reportComposition';
import type { IntelligenceSnapshot } from './reportIntelligence';
import type { DeliveryPerformanceRow } from './reportV14';

export type PeriodChangeSignalV16={
  id:string;
  label:string;
  value:string;
  detail:string;
  direction:'up'|'down'|'stable'|'new';
  tone:'positive'|'attention'|'neutral';
};

function pctDelta(current:number,previous:number){
  if(previous===0)return current===0?0:null;
  return Math.round(((current-previous)/previous)*100);
}
function signedPct(value:number|null){
  if(value===null)return 'novo dado';
  if(value===0)return 'estável';
  return `${value>0?'+':''}${value}%`;
}
function trend(value:number|null,positiveWhenUp=false):Pick<PeriodChangeSignalV16,'direction'|'tone'>{
  if(value===null)return{direction:'new',tone:'neutral'};
  if(value===0)return{direction:'stable',tone:'neutral'};
  if(value>0)return{direction:'up',tone:positiveWhenUp?'positive':'attention'};
  return{direction:'down',tone:positiveWhenUp?'attention':'positive'};
}

export function periodChangeSignalsV16(snapshot:IntelligenceSnapshot,reportType:ReportType='monthly'):PeriodChangeSignalV16[]{
  const series=[...(snapshot.monthlySeries||[])].filter((item)=>item.monthRef).sort((a,b)=>a.monthRef.localeCompare(b.monthRef));
  if(series.length<2)return[];
  const current=series[series.length-1],previous=reportType==='quarterly'?series[0]:series[series.length-2];
  const comparison=reportType==='quarterly'?'do primeiro ao último mês do trimestre':'em relação ao período anterior';
  const signals:PeriodChangeSignalV16[]=[];

  const hoursDelta=pctDelta(current.consumedMinutes,previous.consumedMinutes);
  signals.push({id:'hours',label:'Ritmo de dedicação',value:signedPct(hoursDelta),detail:hoursDelta===null?'Primeiro período com horas comparáveis.':hoursDelta===0?`O volume de horas permaneceu estável ${comparison}.`:`O volume de horas ${hoursDelta>0?'aumentou':'reduziu'} ${Math.abs(hoursDelta)}% ${comparison}.`,...trend(hoursDelta,false)});

  const approvalsDelta=current.approvedCount-previous.approvedCount;
  signals.push({id:'approvals',label:'Entregas aprovadas',value:approvalsDelta===0?'estável':`${approvalsDelta>0?'+':''}${approvalsDelta}`,detail:approvalsDelta===0?`O número de aprovações permaneceu no mesmo nível ${comparison}.`:`${Math.abs(approvalsDelta)} aprovação(ões) ${approvalsDelta>0?'a mais':'a menos'} ${comparison}.`,direction:approvalsDelta===0?'stable':approvalsDelta>0?'up':'down',tone:approvalsDelta>0?'positive':approvalsDelta<0?'attention':'neutral'});

  const adjustmentDelta=current.adjustmentEventsCount-previous.adjustmentEventsCount;
  signals.push({id:'adjustments',label:'Solicitações de ajuste',value:adjustmentDelta===0?'estável':`${adjustmentDelta>0?'+':''}${adjustmentDelta}`,detail:adjustmentDelta===0?`O volume de ajustes não mudou ${comparison}.`:`${Math.abs(adjustmentDelta)} solicitação(ões) de ajuste ${adjustmentDelta>0?'a mais':'a menos'} ${comparison}.`,direction:adjustmentDelta===0?'stable':adjustmentDelta>0?'up':'down',tone:adjustmentDelta>0?'attention':'positive'});

  if(current.feedbackAverage!==null&&previous.feedbackAverage!==null){
    const delta=Number((current.feedbackAverage-previous.feedbackAverage).toFixed(1));
    signals.push({id:'feedback',label:'Percepção do cliente',value:delta===0?'estável':`${delta>0?'+':''}${delta.toFixed(1).replace('.',',')}`,detail:delta===0?'A média de avaliação permaneceu estável.':`A média de avaliação ${delta>0?'subiu':'caiu'} ${Math.abs(delta).toFixed(1).replace('.',',')} ponto(s) na escala de 1 a 5.`,direction:delta===0?'stable':delta>0?'up':'down',tone:delta>0?'positive':delta<0?'attention':'neutral'});
  }

  return signals.slice(0,4);
}

export function reportReviewCountsV16(snapshot:IntelligenceSnapshot,deliveries:DeliveryPerformanceRow[],selectedDemands:number,selectedDecisions:number,openAlerts:number){
  const factSources=(snapshot.hours.entriesCount||0)+(snapshot.events.count||0)+(snapshot.records.length||0)+deliveries.length+(snapshot.feedback.count||0)+(snapshot.documents.publishedCount||0);
  return{
    facts:factSources,
    editorial:selectedDemands+selectedDecisions,
    alerts:openAlerts,
  };
}

export function feedbackLabelV16(snapshot:IntelligenceSnapshot){
  if(!snapshot.feedback.count||snapshot.feedback.average===null)return null;
  return `${Number(snapshot.feedback.average).toFixed(1).replace('.',',')} / 5`;
}
