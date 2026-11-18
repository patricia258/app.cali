import { useParams } from '../../../../hooks/useParams';
import { useSearchParams } from '../../../../hooks/useSearchParams';

export function useProfileTestRoute() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('previa') === '1';
  return { slug, preview, inviteToken: preview ? '' : params.get('c') ?? '' };
}
