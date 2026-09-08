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
function usageRatio(contractedHours:number|null|undefined,consumedMinutes:number){const contracted=num(contractedHours)*60;return contracted>0?num(consumedMinutes)/contracted:0;}
function extraMinutes(contractedHours:number|null|undefined,consumedMinutes:number){return Math.max(0,num(consumedMinutes)-num(contractedHours)*60);}

/**
 * Regra comercial aprovada para o relatório mensal:
 * - até 105% da capacidade: sem alerta de upgrade;
 * - primeiro período acima de 105%: sinaliza acompanhamento;
 * - dois fechamentos consecutivos acima de 105%: recomenda upgrade proporcional.
 * As horas não utilizadas seguem não cumulativas; este sinal trata apenas de excesso recorrente.
 */
export function capacitySignalV15(snapshot:IntelligenceSnapshot):CapacitySignalV15{
  const contracted=num(snapshot.contract.contractedHoursPeriod||snapshot.hours.contractedHours);
  const consumed=num(snapshot.hours.consumedMinutes);
  const extra=extraMinutes(contracted,consumed);
  const currentRatio=usageRatio(contracted,consumed);
  if(!contracted||currentRatio<=1.05)return{state:'normal',consecutive:0,extraMinutes:extra,message:'Consumo dentro da faixa de capacidade contratada.'};

  const previous=[...snapshot.previousReports]
    .filter((item)=>num(item.contractedHours)>0)
    .sort((a,b)=>String(b.periodStart).localeCompare(String(a.periodStart)))[0];
  const previousRatio=previous?usageRatio(previous.contractedHours,previous.consumedMinutes):0;

  if(previous&&previousRatio>1.05){
    const recommended=Math.max(1,Math.ceil(((consumed+num(previous.consumedMinutes))/2)/60));
    return{
      state:'second_over',consecutive:2,extraMinutes:extra,
      message:`Segundo fechamento consecutivo com uso acima de 105% da capacidade contratada. Pelo ritmo observado, recomenda-se revisar o pacote para aproximadamente ${recommended}h/mês.`,
    };
  }

  return{
    state:'first_over',consecutive:1,extraMinutes:extra,
    message:`O período utilizou mais de 105% da capacidade contratada (${formatHoursV14(extra)} acima da carga prevista). Se isso se repetir no próximo fechamento, o relatório recomendará automaticamente a revisão proporcional do pacote.`,
  };
}

export function buildReportAlertsV15(snapshot:IntelligenceSnapshot,rows:DeliveryPerformanceRow[]):ReportCloseAlert[]{
  // Complementos manuais entram nos cálculos de horas, mas não criam alertas técnicos
  // de cadastro incompleto (prazo/status) como se fossem registros canônicos do Workspace.
  const automaticRows=rows.filter((row)=>!(row as DeliveryPerformanceRow&{manual_source?:boolean}).manual_source);
  const alerts=buildReportAlertsV14(snapshot,automaticRows).filter((alert)=>alert.source!=='hours');
  const signal=capacitySignalV15(snapshot);
  if(signal.state==='normal')return alerts;

  if(signal.state==='second_over'){
    alerts.push({
      id:'hours:capacity-upgrade-recommendation',severity:'warning',title:'Recomendação de revisão da capacidade',
      detail:signal.message,blocking:false,source:'hours',actionLabel:'Revisar conta',actionHref:'/admin/clientes',
    });
    return alerts;
  }

  alerts.push({
    id:'hours:first-over-5-percent',severity:'info',title:'Uso acima de 105% da capacidade',
    detail:signal.message,blocking:false,source:'hours',actionLabel:'Abrir Horas',actionHref:'/admin/horas',
  });
  return alerts;
}
