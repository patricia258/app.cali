import { useParams } from '../../../hooks/useParams';

export function useDiscReportRoute(role: 'admin' | 'client') {
  const { id = '', linkId = '' } = useParams();
  return { id, linkId, back: role === 'admin' ? '/admin/perfil-comportamental' : '/cliente/equipe' };
}
