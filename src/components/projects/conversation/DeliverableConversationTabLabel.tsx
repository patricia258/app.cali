import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { useDeliverableConversationCount } from './hooks/useDeliverableConversationCount';

export function DeliverableConversationTabLabel({ companyId, deliverableId, enabled }: { companyId: string; deliverableId: string; enabled: boolean }) {
  const { user } = useWorkspaceAuth();
  const { data } = useDeliverableConversationCount(user?.id, companyId, deliverableId, enabled);
  return <>Conversas{data == null ? '' : ` (${data})`}</>;
}
