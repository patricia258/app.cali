import { addBusinessDays, endOfDay, isValid } from 'date-fns';

export function reportQuestionDeadline(firstOpenedAt?: string | null) {
  if (!firstOpenedAt) return null;
  const firstOpened = new Date(firstOpenedAt);
  return isValid(firstOpened) ? endOfDay(addBusinessDays(firstOpened, 3)) : null;
}
