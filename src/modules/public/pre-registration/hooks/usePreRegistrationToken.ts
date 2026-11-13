import { useParams } from '../../../../hooks/useParams';

export function usePreRegistrationToken() {
  return useParams().token ?? '';
}
