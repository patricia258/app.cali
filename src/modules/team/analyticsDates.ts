export function shortMonth(month: string) {
  const [year, index] = month.split('-').map(Number);
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, index - 1, 1));
  return `${name.replace('.', '')}/${String(year).slice(2)}`;
}
