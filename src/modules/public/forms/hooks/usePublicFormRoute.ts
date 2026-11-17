import { useParams } from '../../../../hooks/useParams';
import { useSearchParams } from '../../../../hooks/useSearchParams';

export function usePublicFormRoute() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  return { slug, preview: params.get('previa') === '1' };
}
