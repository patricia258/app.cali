import { useEffect, useRef } from 'react';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import type { ConversationMessageRow } from '../../../api/records/conversation';
import { RecordMessageComposer } from './components/RecordMessageComposer';
import { RecordMessageRow } from './components/RecordMessageRow';
import { useRecordConversationIdentities } from './hooks/useRecordConversationIdentities';
import { useRecordConversationScroll } from './hooks/useRecordConversationScroll';
import { useRecordMessages } from './hooks/useRecordMessages';
import type { RecordMessageReceipt } from './hooks/usePostRecordMessage';

export function RecordConversation({ recordId, companyId, role, actorId, partner, locked, authors, staffPhotos, onSent, onHistoryFocus }: {
  recordId: string;
  companyId: string;
  role: 'admin' | 'client';
  actorId?: string;
  partner: boolean;
  locked: boolean;
  authors: Record<string, string>;
  staffPhotos: Record<string, string>;
  onSent: (result: RecordMessageReceipt, internal: boolean) => Promise<void>;
  onHistoryFocus: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const messages = useRecordMessages(recordId, actorId);
  const { data: identities } = useRecordConversationIdentities(role, companyId, partner ? undefined : actorId);
  const rows = messages.data ?? [];
  const knownMessageIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (messages.data) knownMessageIds.current = new Set(messages.data.map((message) => message.id));
  }, [messages.data]);
  const { historyRef, onScroll, followSentMessage } = useRecordConversationScroll(rows.at(-1)?.id);

  function identityFor(message: ConversationMessageRow) {
    if (partner && message.author_id) return {
      full_name: authors[message.author_id] || (message.author_role === 'client' ? 'Cliente' : 'CALI'),
      avatar_url: staffPhotos[message.author_id],
    };
    if (message.author_role === 'system') return { full_name: partner ? 'Sistema' : 'CALI RH' };
    const known = message.author_id ? identities?.byId.get(message.author_id) : undefined;
    return known ?? (message.author_role === 'admin' ? identities?.admin : identities?.client)
      ?? { full_name: message.author_role === 'admin' ? 'Patrícia Lima' : 'Cliente' };
  }

  return (
    <>
      <div className="tw:mt-0 tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-[1.85rem] tw:pt-[1.08rem] tw:pb-[1.38rem] tw:[scrollbar-width:none]" data-v2-operation="conversation-history" aria-live="polite" aria-busy={messages.isPending} ref={historyRef} onScroll={onScroll}>
        {messages.isPending && <span className="tw:m-auto tw:text-[1rem] tw:text-cali-muted">Carregando conversa…</span>}
        {messages.isError && !rows.length && <InlineNotice tone="danger">Não foi possível carregar a conversa. <button type="button" onClick={() => void messages.refetch()}>Tentar novamente</button></InlineNotice>}
        {messages.isSuccess && !rows.length && <p className={partner ? 'tw:m-0 tw:text-[.92rem] tw:text-[#8c7e74]' : 'tw:m-auto tw:text-[1rem] tw:text-cali-muted'}>{partner ? 'Ainda não há mensagens nesta conversa.' : 'A conversa começa aqui.'}</p>}
        {rows.map((message) => <RecordMessageRow
          key={message.id}
          message={message}
          identity={identityFor(message)}
          mine={partner ? message.author_id === actorId : message.author_role === role}
          partner={partner}
          arriving={Boolean(knownMessageIds.current && !knownMessageIds.current.has(message.id))}
          canManage={!partner && role === 'admin' && message.author_role === 'admin' && message.visibility === 'client'}
          onChanged={async () => { await messages.refetch(); }}
          onDeleted={() => input.current ? input.current.focus() : onHistoryFocus()}
        />)}
      </div>
      {!locked && <RecordMessageComposer role={role} partner={partner} companyId={companyId} recordId={recordId} actorId={actorId} input={input} onSent={async (result, internal) => {
        followSentMessage();
        await Promise.all([messages.refetch(), onSent(result, internal)]);
      }} />}
    </>
  );
}
