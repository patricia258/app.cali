export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}
export function dateLabel(s?: string | null) {
  if (!s) return '—';
  return s.includes('T')
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(s))
    : new Intl.DateTimeFormat('pt-BR').format(new Date(`${s.slice(0, 10)}T12:00:00`));
}
