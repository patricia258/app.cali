import { useLayoutEffect, useRef, useState } from 'react';
import type { DeliverableConversationMessage as Message } from '../../../api/projects/conversation';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { InlineNotice } from '../../ds/InlineNotice';
import { DeliverableConversationComposer } from './components/DeliverableConversationComposer';
import { DeliverableConversationMessage } from './components/DeliverableConversationMessage';
import { useDeliverableConversationIdentities } from './hooks/useDeliverableConversationIdentities';
import { useDeliverableConversationMessages } from './hooks/useDeliverableConversationMessages';
import { useRefreshDeliverableConversation } from './hooks/useRefreshDeliverableConversation';

const defaultAdmin = { full_name: 'Patrícia Lima' };
const defaultClient = { full_name: 'Cliente' };
const workspace = { full_name: 'CALI Workspace' };

type Props = { role: 'admin' | 'client'; companyId: string; deliverableId: string; active: boolean };

export function DeliverableConversation({ role, companyId, deliverableId, active }: Props) {
  const { user } = useWorkspaceAuth();
  const actorId = user?.id;
  const [visible, setVisible] = useState(true);
  const list = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const messages = useDeliverableConversationMessages(actorId, companyId, deliverableId, visible, active);
  const people = useDeliverableConversationIdentities(role, companyId, actorId, active).data;
  const arrivingId = useRefreshDeliverableConversation(actorId, companyId, deliverableId);
  const rows = messages.data ?? [];
  const latestId = rows.at(-1)?.id;

  function identity(message: Message) {
    const byId = message.author_user_id && people?.identities.get(message.author_user_id);
    if (byId) return byId;
    if (message.source_actor === 'client') return people?.client ?? defaultClient;
    if (message.source_actor === 'system') return workspace;
    return people?.admin ?? defaultAdmin;
  }

  function followSent() {
    const history = list.current;
    if (history) history.scrollTop = history.scrollHeight;
  }

  useLayoutEffect(() => {
    if (active && followLatest.current) followSent();
  }, [active, latestId, visible]);

  return <div hidden={!active} className={active ? "tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:overflow-hidden" : "tw:hidden"}>
    <div ref={list} aria-live="polite" aria-busy={messages.isFetching || undefined}
      onScroll={() => {
        const history = list.current;
        if (history) followLatest.current = history.scrollHeight - history.scrollTop - history.clientHeight <= 36;
      }} className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-[1.46rem] tw:overflow-y-auto tw:overscroll-contain tw:px-[2.08rem] tw:py-[1.54rem] tw:[scrollbar-width:none]">
      {messages.isPending && actorId && <p role="status" className="tw:m-auto tw:text-sm tw:text-cali-muted">Carregando a conversa…</p>}
      {messages.isError && <InlineNotice role="alert" tone="danger">Não foi possível carregar a conversa.{' '}
        <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-current tw:underline" onClick={() => void messages.refetch()}>Tentar novamente</button>
      </InlineNotice>}
      {messages.isSuccess && !rows.length && <p className="tw:m-auto tw:text-[.9231rem] tw:text-cali-muted">
        {visible ? 'A conversa começa aqui.' : 'Nenhuma nota interna neste entregável.'}
      </p>}
      {rows.map((message) => <DeliverableConversationMessage key={message.id} message={message} identity={identity(message)} visible={visible} arriving={message.id === arrivingId}
        mine={(message.source_actor ?? 'admin') === role} />)}
    </div>
    <DeliverableConversationComposer role={role} visible={visible} actorId={actorId}
      companyId={companyId} deliverableId={deliverableId} onChannelChange={(next) => { followLatest.current = true; setVisible(next); }}
      onSent={() => { followLatest.current = true; }} />
  </div>;
}
