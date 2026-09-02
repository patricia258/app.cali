import type { IntelligenceSnapshot } from './reportIntelligence';
import {
  buildReportAlertsV14,
  formatHoursV14,
  type DeliveryPerformanceRow,
  type ReportCloseAlert,
} from './reportV14';

export type CapacitySignalV15={
  state:'normal'|'first_over'|'second_over'|'mandatory_review'|'manual_rule';
  consecutive:number;
  extraMinutes:number;
  message:string;
};

function num(value:unknown){const parsed=Number(value||0);return Number.isFinite(parsed)?parsed:0;}
function extraMinutes(contractedHours:number|null|undefined,consumedMinutes:number){return Math.max(0,num(consumedMinutes)-num(contractedHours)*60);}

export function capacitySignalV15(snapshot:IntelligenceSnapshot):CapacitySignalV15{
  const contracted=num(snapshot.contract.contractedHoursPeriod||snapshot.hours.contractedHours);
  const extra=extraMinutes(contracted,snapshot.hours.consumedMinutes);
  if(extra<=0)return{state:'normal',consecutive:0,extraMinutes:0,message:'Consumo dentro da capacidade contratada.'};

  if(extra>180){
    return{
      state:'manual_rule',consecutive:1,extraMinutes:extra,
      message:`O período registrou ${formatHoursV14(extra)} além da capacidade contratada. Como o excedente passou de 3h em um único mês, a regra comercial ainda não é automatizada e a conta precisa de revisão manual antes do próximo ciclo.`,
    };
  }

  const previous=[...snapshot.previousReports].sort((a,b)=>String(b.periodStart).localeCompare(String(a.periodStart)));
  let consecutive=1;
  for(const report of previous){
    const previousContracted=num(report.contractedHours);
    const previousExtra=extraMinutes(previousContracted,report.consumedMinutes);
    if(previousExtra<=0||previousExtra>180)break;
    consecutive+=1;
  }

  if(consecutive>=3){
    return{
      state:'mandatory_review',consecutive,extraMinutes:extra,
      message:`${consecutive}º período consecutivo com consumo adicional de até 3h. Antes do próximo ciclo, é obrigatória a decisão entre upgrade de capacidade ou readequação do escopo.`,
    };
  }
  if(consecutive===2){
    return{
      state:'second_over',consecutive,extraMinutes:extra,
      message:`Segundo período consecutivo acima da capacidade contratada (${formatHoursV14(extra)} adicionais neste período). A tolerância de até 3h segue sem cobrança adicional neste segundo mês; se houver recorrência no próximo, será obrigatório revisar pacote ou escopo.`,
    };
  }
  return{
    state:'first_over',consecutive,extraMinutes:extra,
    message:`Primeiro período acima da capacidade contratada, com ${formatHoursV14(extra)} adicionais. Até 3h extras podem ocorrer por até 2 meses consecutivos sem cobrança adicional.`,
  };
}

export function buildReportAlertsV15(snapshot:IntelligenceSnapshot,rows:DeliveryPerformanceRow[]):ReportCloseAlert[]{
  const alerts=buildReportAlertsV14(snapshot,rows).filter((alert)=>alert.source!=='hours');
  const signal=capacitySignalV15(snapshot);
  if(signal.state==='normal')return alerts;

  if(signal.state==='manual_rule'){
    alerts.push({
      id:'hours:manual-rule-over-3h',severity:'warning',title:`Consumo adicional acima de 3h (${formatHoursV14(signal.extraMinutes)})`,
      detail:'A regra comercial para excedente acima de 3h em um único mês ainda não foi automatizada. O relatório pode ser fechado, mas a conta precisa de revisão manual antes do próximo ciclo.',
      blocking:false,source:'hours',actionLabel:'Abrir Horas',actionHref:'/admin/horas',
    });
    return alerts;
  }

  if(signal.state==='mandatory_review'){
    alerts.push({
      id:'hours:mandatory-capacity-review',severity:'critical',title:'Revisão de capacidade obrigatória para o próximo ciclo',
      detail:signal.message,blocking:false,source:'hours',actionLabel:'Revisar conta',actionHref:'/admin/clientes',
    });
    return alerts;
  }

  alerts.push({
    id:`hours:${signal.state}`,severity:signal.state==='second_over'?'warning':'info',
    title:signal.state==='second_over'?'Segundo mês consecutivo acima da capacidade':'Consumo adicional no período',
    detail:signal.message,blocking:false,source:'hours',actionLabel:'Abrir Horas',actionHref:'/admin/horas',
  });
  return alerts;
}
