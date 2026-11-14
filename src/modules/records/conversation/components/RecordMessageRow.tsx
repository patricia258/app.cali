import { Fragment, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { openPrivateWorkspaceFile } from '../../../../api/files/workspace';
import type { ConversationIdentity, ConversationMessageRow } from '../../../../api/records/conversation';
import { confirmAction, showMessage } from '../../../../components/feedback/workspaceDialogs';
import { withMentions } from '../../../../lib/mentionText';
import { keysByContent } from '../../../../lib/keysByContent';
import { useDeleteRecordMessage } from '../hooks/useDeleteRecordMessage';
import { readConversationMessageBody } from '../../../../lib/conversationMessageBody';
import { RecordMessageEditor } from './RecordMessageEditor';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function MessageAvatar({ identity, mine, partner }: { identity: ConversationIdentity; mine: boolean; partner: boolean }) {
  const [broken, setBroken] = useState(false);
  const initials = identity.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]?.toUpperCase()).join('') || 'C';
  const position = `${identity.avatar_position_x ?? 50}% ${identity.avatar_position_y ?? 50}%`;
  return <span data-workspace-identity aria-hidden="true" className={`tw:relative tw:z-1 tw:grid tw:size-[2.62rem] tw:flex-none tw:place-items-center tw:overflow-hidden tw:rounded-[.54rem] tw:text-[.77rem] tw:leading-none tw:font-bold ${partner ? 'tw:bg-[#f3ece6] tw:text-cali-brand' : mine ? 'tw:bg-[#f2dfa4] tw:text-cali-brand' : 'tw:bg-cali-brand tw:text-white'}`}>
    {identity.avatar_url && !broken ? (
      <img src={identity.avatar_url} alt="" className="tw:block tw:size-full tw:object-cover" onError={() => setBroken(true)} style={{
        objectPosition: position,
        transformOrigin: position,
        transform: `scale(${Math.max(1, identity.avatar_zoom ?? 1)})`,
      }} />
    ) : <span>{initials}</span>}
  </span>;
}

export function RecordMessageRow({ message, identity, mine, partner, canManage, arriving, onChanged, onDeleted }: {
  message: ConversationMessageRow;
  identity: ConversationIdentity;
  mine: boolean;
  partner: boolean;
  canManage: boolean;
  arriving: boolean;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const { mutateAsync: removeMessage, isPending: deleting } = useDeleteRecordMessage(message.id);
  const { text, attachments } = readConversationMessageBody(message.body);
  const internal = message.visibility === 'internal';
  const date = new Date(message.created_at);
  const timestamp = Number.isNaN(date.getTime()) ? message.created_at : dateFormat.format(date).replace('.', '');

  const bubbleTone = internal && partner
    ? 'tw:border-[#ecd9b0] tw:bg-[#fffaf1]'
    : mine
      ? 'tw:border-[#eed3c2] tw:bg-[#f7e3d6]'
      : 'tw:border-[#eadfd8] tw:bg-[#f8f3ef]';

  function closeEditor() {
    setEditing(false);
    editButton.current?.focus();
  }

  async function remove() {
    if (deleting || !await confirmAction('Excluir esta mensagem do histórico visível para o cliente?')) return;
    try {
      await removeMessage();
      onDeleted();
      await onChanged();
    } catch (error) {
      void showMessage(error instanceof Error ? error.message : 'Não foi possível excluir a mensagem.');
    }
  }

  return (
    <div data-message-id={message.id} data-message-created-at={message.created_at} className={`tw:relative tw:mb-[.77rem] tw:flex tw:w-full tw:items-start tw:gap-[.77rem] ${mine ? 'tw:justify-end' : ''} ${arriving ? 'tw:motion-safe:animate-message-arrive' : ''}`}>
      {!mine && <MessageAvatar key={identity.avatar_url} identity={identity} mine={mine} partner={partner} />}
      <div className={`tw:relative tw:flex tw:max-w-[min(74%,36.92rem)] tw:min-w-0 tw:flex-col tw:gap-[.23rem] tw:rounded-[.77rem] tw:border tw:border-solid tw:px-[1.08rem] tw:py-[.77rem] tw:text-[#322f2c] ${bubbleTone}`}>
        <div className="tw:contents">
          <strong className="tw:min-h-[2.08rem] tw:text-[.92rem] tw:leading-[2.08rem] tw:font-bold">{identity.full_name}{internal ? ' · nota interna' : ''}</strong>
          {(message.edited_at || canManage) && <span className="tw:ml-1.5 tw:inline-flex tw:items-center tw:gap-1.5">
            {message.edited_at && <em title="Mensagem editada pela CALI" className="tw:text-[0.5625rem] tw:not-italic tw:opacity-65">editada</em>}
            {canManage && <span className="tw:inline-flex tw:items-center tw:gap-1 tw:[&_button]:grid tw:[&_button]:size-6 tw:[&_button]:cursor-pointer tw:[&_button]:place-items-center tw:[&_button]:rounded-lg tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-cali-line tw:[&_button]:bg-cali-surface/65 tw:[&_button]:p-0 tw:[&_button]:text-cali-accent tw:[&_button:hover]:bg-cali-gold/15">
              <button type="button" ref={editButton} aria-label="Editar mensagem" title="Editar mensagem" onClick={() => setEditing(true)}><Pencil size={13} /></button>
              <button type="button" aria-label="Excluir mensagem" title="Excluir mensagem" disabled={deleting} onClick={() => void remove()}><Trash2 size={13} /></button>
            </span>}
          </span>}
        </div>
        {editing ? (
          <RecordMessageEditor messageId={message.id} text={text} attachments={attachments} onCancel={closeEditor} onSaved={() => { closeEditor(); void onChanged(); }} />
        ) : text && <p className="tw:m-0 tw:text-[.92rem] tw:leading-[1.5] tw:whitespace-pre-wrap tw:[overflow-wrap:anywhere]">{keysByContent(text.split(/(https?:\/\/[^\s]+)/g), (part) => part).map(({ item: part, key }) => /^https?:\/\//i.test(part) ? (
          <a key={key} className="tw:font-semibold tw:text-inherit tw:underline" href={part} target="_blank" rel="noopener noreferrer">{part}</a>
        ) : <Fragment key={key}>{withMentions(part)}</Fragment>)}</p>}
        {attachments.length > 0 && <div className="tw:mt-[.62rem] tw:flex tw:flex-col tw:items-start tw:gap-[.46rem]">
          {keysByContent(attachments, (attachment) => attachment.path).map(({ item: attachment, key }) => <button key={key} type="button" className="tw:inline-flex tw:max-w-full tw:cursor-pointer tw:items-center tw:gap-[.69rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-[#fffaf7] tw:px-[.92rem] tw:py-[.62rem] tw:text-left tw:text-cali-ink" onClick={() => {
            void openPrivateWorkspaceFile(attachment.path, attachment.name).catch(() => showMessage('Não foi possível abrir este anexo agora.'));
          }}><span aria-hidden="true">📎</span><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-px"><strong className="tw:max-w-[17.69rem] tw:truncate tw:text-[.92rem]">{attachment.name}</strong><small className="tw:text-[.77rem] tw:text-[#8a7c74]">{attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : 'arquivo'}</small></span></button>)}
        </div>}
        <time dateTime={message.created_at} className="tw:mt-[.15rem] tw:text-[.77rem] tw:text-[#96867c]">{timestamp}</time>
      </div>
      {mine && <MessageAvatar key={identity.avatar_url} identity={identity} mine={mine} partner={partner} />}
    </div>
  );
}
