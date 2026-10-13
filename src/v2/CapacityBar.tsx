/* Barra de utilização da capacidade mensal — a mesma na Home e em Horas do cliente (e onde mais for preciso).
   Escala fixa 0–100% com marcas em 0, 50, 75 e 100; o que passa de 100% aparece numa faixa vermelha À PARTE, à direita,
   sem comprimir a escala. Não depende só de cor: traz o percentual escrito e um aviso quando há excedente. */
import { AlertTriangle } from 'lucide-react';
import { type Capacity, minutesLabel, percentLabel } from '../lib/capacity';

export function CapacityBar({ capacity, dark, bare }: { capacity: Capacity; dark?: boolean; bare?: boolean }) {
  const pct = capacity.usagePercent ?? 0; const base = Math.min(100, Math.max(0, pct)); const over = Math.max(0, pct - 100); const overFill = Math.min(100, (over / 50) * 100);
  return <div className={`v2-cap ${dark ? 'dark' : ''} ${over > 0 ? 'has-excess' : ''}`}>
    <div className="v2-cap-row" role="progressbar" aria-label="Utilização da capacidade mensal contratada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(base)} aria-valuetext={`${percentLabel(capacity.usagePercent)} utilizados${over > 0 ? `, ${minutesLabel(capacity.excessMinutes)} acima do contratado` : ''}`}>
      <div className="v2-cap-track"><span className="v2-cap-fill" style={{ width: `${base}%` }}><i style={{ width: base > 0 ? `${10000 / base}%` : '100%' }} /></span>{[50, 75].map((mark) => <b key={mark} style={{ left: `${mark}%` }} />)}</div>
      <div className="v2-cap-over" title={over > 0 ? `${percentLabel(capacity.excessPercent)} acima do contratado` : 'Sem excedente'}><span style={{ width: `${overFill}%` }} /></div>
    </div>
    <div className="v2-cap-scalerow"><div className="v2-cap-scale"><span style={{ left: '0%' }}>0%</span><span style={{ left: '50%' }}>50%</span><span style={{ left: '75%' }}>75%</span><span style={{ left: '100%' }}>100%</span></div><span className={`v2-cap-overlabel ${over > 0 ? 'on' : ''}`}>Excedente</span></div>
    {!bare && <div className="v2-cap-read"><strong>{percentLabel(capacity.usagePercent)} utilizados</strong><span>{minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}</span>{over > 0 && <em><AlertTriangle size={13} /> {minutesLabel(capacity.excessMinutes)} acima ({percentLabel(capacity.excessPercent)})</em>}</div>}
  </div>;
}

/** Cartão "Horas do mês" (modelo aprovado pela proprietária em 2026-10-13): plano e mês, percentual grande, barra,
 *  três cartões e, quando for o caso, o aviso do marco atingido. */
export function CapacityCard({ capacity, plan, month, occurrence, paused }: { capacity: Capacity; plan?: string | null; month: string; occurrence?: number; paused?: boolean }) {
  const occurrenceText = occurrence === 1 ? 'Esta é a primeira ocorrência registrada.' : occurrence === 2 ? 'Esta é a segunda ocorrência no período acompanhado; a recorrência pode indicar a necessidade de rever o volume de horas.' : occurrence && occurrence >= 3 ? 'É a terceira ocorrência no período acompanhado; vamos avaliar juntos a adequação do pacote e as alternativas disponíveis.' : '';
  const level = capacity.level; const excess = capacity.excessMinutes > 0;
  const alert = level === 'excess'
    ? { tone: 'red', title: 'A capacidade mensal foi ultrapassada.', text: `O consumo está ${minutesLabel(capacity.excessMinutes)} acima das ${minutesLabel(capacity.contractedMinutes)} contratadas. ${occurrenceText ? `${occurrenceText} ` : ''}Vamos acompanhar juntos a demanda do período e avaliar se será necessário reorganizar as prioridades.`, foot: 'Não há cobrança adicional ou alteração automática do contrato.' }
    : level === 'full' ? { tone: 'red', title: 'A capacidade mensal foi integralmente utilizada.', text: 'A CALI acompanhará as demandas previstas e alinhará com você as prioridades, necessidades adicionais e próximos encaminhamentos.', foot: '' }
    : level === 'attention' ? { tone: 'amber', title: 'Atenção ao consumo do mês.', text: 'A sua empresa já utilizou 75% da capacidade contratada para este mês. Ainda temos atividades previstas e, se necessário, podemos revisar juntos a ordem de prioridades.', foot: '' }
    : null;
  return <section className="v2-capcard" aria-label="Horas do mês">
    <header><div><h2>Horas do mês</h2><p>{[plan, month].filter(Boolean).join(' · ')}</p></div></header>
    {capacity.level === 'none' ? <p className="v2-capcard-none">Capacidade mensal ainda não definida no contrato.</p> : <>
      <p className="v2-capcard-pct"><strong>{percentLabel(capacity.usagePercent)}</strong><span>da capacidade mensal</span></p>
      <CapacityBar capacity={capacity} bare />
      <div className="v2-capcard-stats"><div><span>Contratadas</span><strong>{minutesLabel(capacity.contractedMinutes)}</strong></div><div><span>Utilizadas</span><strong>{minutesLabel(capacity.usedMinutes)}</strong></div><div className={excess ? 'on' : ''}><span>Excedentes</span><strong>{excess ? `+${minutesLabel(capacity.excessMinutes)}` : '0h'}</strong><small>{excess ? `${percentLabel(capacity.excessPercent)} acima do contratado` : `Saldo do mês: ${minutesLabel(capacity.balanceMinutes)}`}</small></div></div>
      {paused && <div className="v2-capcard-alert red" role="status"><AlertTriangle size={18} /><div><strong>Atividades pausadas até a renovação do mês.</strong><p>A capacidade deste mês passou do limite de tolerância. A CALI retoma as atividades no início do próximo mês e fala com você sobre as prioridades.</p><small>Não há cobrança adicional ou alteração automática do contrato.</small></div></div>}
      {alert && <div className={`v2-capcard-alert ${alert.tone}`} role="status"><AlertTriangle size={18} /><div><strong>{alert.title}</strong><p>{alert.text}</p>{alert.foot && <small>{alert.foot}</small>}</div></div>}
    </>}
  </section>;
}
