import type { FormQuestion } from '../../forms/formModel';
import { errorMessage } from '../../../lib/errorMessage';

export type FormAdminTab = 'questions' | 'share' | 'responses';

export const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

export const errorText = <T,>(err: T, fallback: string) => {
  const message = errorMessage(err, '');
  if (/duplicate key|forms_slug_key/.test(message)) return 'Este link já está em uso por outro formulário. Escolha outro.';
  if (/forms_slug_check/.test(message)) return 'O link só pode ter letras minúsculas, números e hífens (3 a 60 caracteres).';
  return message || fallback;
};

export function scaleOptions(question: FormQuestion) {
  const min = question.scaleMin ?? 0, max = question.scaleMax ?? 10;
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => String(min + index));
}
