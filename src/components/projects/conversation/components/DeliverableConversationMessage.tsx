import { Fragment, useState } from 'react';
import { openPrivateWorkspaceFile } from '../../../../api/files/workspace';
import type { DeliverableConversationIdentity, DeliverableConversationMessage as Message } from '../../../../api/projects/conversation';
import { readConversationMessageBody } from '../../../../lib/conversationMessageBody';
import { keysByContent } from '../../../../lib/keysByContent';
import { withMentions } from '../../../../lib/mentionText';
import { InlineNotice } from '../../../ds/InlineNotice';
import { ProjectConversationAvatar } from './ProjectConversationAvatar';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function DeliverableConversationMessage({ message, identity, mine, visible, arriving }: {
  message: Message; identity: DeliverableConversationIdentity; mine: boolean; visible: boolean; arriving: boolean;
}) {
  const [attachmentError, setAttachmentError] = useState(false);
  const { attachments, text } = readConversationMessageBody(message.body);
  const date = new Date(message.created_at);
  const timestamp = Number.isNaN(date.getTime()) ? message.created_at : dateFormat.format(date).replace('.', '');
  const surface = !visible
    ? 'tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:workspace-night:border-cali-line tw:workspace-night:bg-(--theme-surface-soft)'
    : mine
      ? 'tw:border-[#eee1db] tw:bg-[#f7e7d2] tw:workspace-night:border-[#9b7848] tw:workspace-night:bg-[#73552f]'
      : 'tw:border-[#eee1db] tw:bg-[#faf4f1] tw:workspace-night:border-[#4a343b] tw:workspace-night:bg-[#2a1d21]';
  const alignment = mine ? 'tw:self-end' : 'tw:self-start';
  const avatar = <ProjectConversationAvatar identity={identity} name={identity.full_name}
    className="tw:grid tw:size-[2.31rem] tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-brand tw:text-[.77rem] tw:font-semibold tw:text-white tw:workspace-night:bg-[#2a1d21]" />;
  const arrival = arriving ? 'tw:motion-safe:animate-message-arrive' : '';

  return <div data-message-id={message.id} className={`tw:flex tw:max-w-3/4 tw:shrink-0 tw:origin-bottom tw:items-start tw:gap-[.69rem] tw:motion-safe:transition-transform tw:motion-safe:hover:-translate-y-px tw:max-sm:max-w-[90%] ${alignment} ${arrival}`}>
    {!mine && avatar}
    <article className={`tw:flex tw:min-w-0 tw:flex-col tw:rounded-[.77rem] tw:border tw:border-solid tw:px-[1.15rem] tw:py-[.92rem] tw:text-[.923rem] tw:text-[#322f2c] tw:[overflow-wrap:anywhere] tw:workspace-night:text-cali-text ${surface}`}>
      <strong className="tw:text-[.846rem]">{identity.full_name}{visible ? '' : ' · nota interna'}</strong>
      {text && <p className="tw:m-0 tw:mb-[.77rem] tw:whitespace-pre-wrap tw:leading-[1.5]">{keysByContent(text.split(/(https?:\/\/[^\s]+)/g), (part) => part).map(({ item: part, key }) => /^https?:\/\//i.test(part)
        ? <a key={key} href={part} target="_blank" rel="noopener noreferrer" className="tw:font-semibold tw:text-inherit tw:underline">{part}</a>
        : <Fragment key={key}>{withMentions(part)}</Fragment>)}</p>}
      {attachments.length > 0 && <div className="tw:flex tw:flex-wrap tw:gap-2">
        {keysByContent(attachments, (attachment) => attachment.path).map(({ item: attachment, key }) => <button
          key={key} type="button" className="tw:flex tw:cursor-pointer tw:items-start tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-2.5 tw:py-2 tw:text-left tw:text-cali-text"
          onClick={() => {
            setAttachmentError(false);
            void openPrivateWorkspaceFile(attachment.path, attachment.name).catch(() => setAttachmentError(true));
          }}>
          <span aria-hidden="true">📎</span>
          <span className="tw:grid tw:min-w-0 tw:gap-0.5"><strong>{attachment.name}</strong><small>{attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : 'arquivo'}</small></span>
        </button>)}
      </div>}
      {attachmentError && <InlineNotice role="alert" tone="danger">Não foi possível abrir este anexo agora.</InlineNotice>}
      <time className="tw:text-[.6923rem] tw:text-[#978579] tw:workspace-night:text-cali-muted" dateTime={message.created_at}>{timestamp}</time>
    </article>
    {mine && avatar}
  </div>;
}
