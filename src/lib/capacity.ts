/* Capacidade mensal de horas — regra ÚNICA de cálculo (política da proprietária, 2026-10-13).
   Home do cliente, Horas, painel administrativo e relatórios devem usar estas funções para nunca mostrar números diferentes.
   Não limita o indicador a 100%: 105%, 118%, 125% aparecem como são. Excedente não gera cobrança nem suspensão automática. */
export type Capacity = { contractedMinutes: number; usedMinutes: number; balanceMinutes: number; excessMinutes: number; usagePercent: number | null; excessPercent: number | null; level: 'none' | 'ok' | 'attention' | 'full' | 'excess' };

export function capacityOf(contractedHours: number | null | undefined, usedMinutes: number | null | undefined): Capacity {
  const contractedMinutes = Math.max(0, Math.round(Number(contractedHours || 0) * 60));
  const used = Math.max(0, Math.round(Number(usedMinutes || 0)));
  if (!contractedMinutes) return { contractedMinutes: 0, usedMinutes: used, balanceMinutes: 0, excessMinutes: 0, usagePercent: null, excessPercent: null, level: 'none' };
  const usagePercent = Math.round((used / contractedMinutes) * 1000) / 10;
  const excessMinutes = Math.max(0, used - contractedMinutes);
  const excessPercent = excessMinutes > 0 ? Math.round((excessMinutes / contractedMinutes) * 1000) / 10 : null;
  const level = excessMinutes > 0 ? 'excess' : usagePercent >= 100 ? 'full' : usagePercent >= 75 ? 'attention' : 'ok';
  return { contractedMinutes, usedMinutes: used, balanceMinutes: Math.max(0, contractedMinutes - used), excessMinutes, usagePercent, excessPercent, level };
}

/** "17h 41min", "45min", "0h". */
export function minutesLabel(total: number): string { const minutes = Math.max(0, Math.round(total)); const h = Math.floor(minutes / 60), m = minutes % 60; return h && m ? `${h}h ${String(m).padStart(2, '0')}min` : h ? `${h}h` : `${m}min`; }
export const percentLabel = (value: number | null) => value === null ? '—' : `${String(value).replace('.', ',')}%`;

/** Textos oficiais dos marcos (documento da proprietária). */
export const capacityMessages = {
  attention: 'A sua empresa já utilizou 75% da capacidade contratada para este mês. Ainda temos atividades previstas e, se necessário, podemos revisar juntos a ordem de prioridades.',
  full: 'A capacidade mensal contratada foi integralmente utilizada. A CALI acompanhará as demandas previstas e alinhará com você as prioridades, necessidades adicionais e próximos encaminhamentos.',
  excess: 'Neste mês, a utilização ultrapassou a capacidade contratada. Vamos acompanhar a evolução das demandas e, se necessário, reorganizar as prioridades para manter o planejamento alinhado à necessidade da empresa.',
} as const;
