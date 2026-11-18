import { formatProjectDate } from '../../../domain/projects';

export function scheduleReviewDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'A definir';
  return formatProjectDate(value);
}
