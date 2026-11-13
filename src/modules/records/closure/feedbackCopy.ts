export function feedbackCopy(score: number) {
  if (score <= 2) return { face: '😞', title: 'Poxa, que pena.', copy: 'Lamento muito por essa nota. Pode me contar o que podemos melhorar?' };
  if (score === 3) return { face: '😐', title: 'Obrigada por me contar.', copy: 'Estou sempre buscando melhorar. O que poderia ter sido melhor?' };
  if (score === 4) return { face: '😊', title: 'Fico muito feliz por essa nota.', copy: 'Se quiser me contar mais alguma coisa, o campo abaixo é opcional.' };
  return { face: '🤩', title: 'Uau! Muito obrigada por essa avaliação.', copy: 'Fico muito feliz. Estou sempre buscando melhorar — se quiser deixar um comentário, vou adorar ler.' };
}

export function closureDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

const statuses = {
  completed: 'Finalizada', cancelled: 'Cancelada', standby: 'Stand by',
  waiting_client: 'Aguardando cliente', in_progress: 'Em andamento', open: 'Aberta',
};

export function closureStatus(value: string | null) {
  return value && Object.hasOwn(statuses, value) ? statuses[value as keyof typeof statuses] : '—';
}
