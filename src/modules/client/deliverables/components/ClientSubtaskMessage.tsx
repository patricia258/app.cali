import type { ProfileMedia } from '../../../../api/workspace/identity';
import { ConversationAttachmentButton } from '../../../../components/projects/conversation/components/ConversationAttachmentButton';
import { ProjectConversationAvatar } from '../../../../components/projects/conversation/components/ProjectConversationAvatar';
import { readConversationMessageBody } from '../../../../lib/conversationMessageBody';
import { withMentions } from '../../../../lib/mentionText';

const messageDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ClientSubtaskMessage({ body, createdAt, identity, name, mine, onOpen }: {
  body: string;
  createdAt: string;
  identity?: ProfileMedia;
  name: string;
  mine: boolean;
  onOpen: (path: string) => void;
}) {
  const { attachments, text } = readConversationMessageBody(body);
  const avatar = <ProjectConversationAvatar
    identity={identity}
    name={name}
    className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-cali-surface-muted tw:text-sm tw:font-bold tw:text-cali-brand"
  />;

  return (
    <div className={`tw:flex tw:max-w-[78%] tw:items-start tw:gap-3 ${mine ? 'tw:self-end' : 'tw:self-start'}`}>
      {!mine && avatar}
      <div className={`tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-cali-sand-line tw:px-4.5 tw:py-3 tw:[overflow-wrap:anywhere] ${mine ? 'tw:bg-cali-orange-surface' : 'tw:bg-cali-sand-soft'}`}>
        <div className="tw:flex tw:items-baseline tw:gap-3">
          <strong className="tw:text-cali-body tw:text-cali-ink">{name}</strong>
          <time dateTime={createdAt} className="tw:text-xs tw:text-cali-muted">{messageDate.format(new Date(createdAt)).replace('.', '')}</time>
        </div>
        {text && <p className="tw:mt-1 tw:mb-0 tw:whitespace-pre-wrap tw:text-cali-body tw:leading-[1.5] tw:text-cali-text">{withMentions(text)}</p>}
        {attachments.length > 0 && (
          <div className="tw:mt-2.5 tw:flex tw:flex-col tw:items-start tw:gap-2">
            {attachments.map((item) => <ConversationAttachmentButton key={item.path} name={item.name} size={item.size} className="tw:mt-2.5" onOpen={() => onOpen(item.path)} />)}
          </div>
        )}
      </div>
      {mine && avatar}
    </div>
  );
}
