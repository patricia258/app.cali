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
    className="tw:grid tw:size-[2.46rem] tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[#f3ece6] tw:text-[.85rem] tw:font-bold tw:text-cali-brand"
  />;

  return (
    <div className={`tw:flex tw:max-w-[78%] tw:items-start tw:gap-[.77rem] ${mine ? 'tw:self-end' : 'tw:self-start'}`}>
      {!mine && avatar}
      <div className={`tw:min-w-0 tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#eee1db] tw:px-[1.08rem] tw:py-[.77rem] tw:[overflow-wrap:anywhere] ${mine ? 'tw:bg-[#f7e7d2]' : 'tw:bg-[#faf4f1]'}`}>
        <div className="tw:flex tw:items-baseline tw:gap-[.77rem]">
          <strong className="tw:text-[.92rem] tw:text-cali-ink">{name}</strong>
          <time dateTime={createdAt} className="tw:text-[.77rem] tw:text-[#9a8d85]">{messageDate.format(new Date(createdAt)).replace('.', '')}</time>
        </div>
        {text && <p className="tw:mt-[.31rem] tw:mb-0 tw:whitespace-pre-wrap tw:text-[.96rem] tw:leading-[1.5] tw:text-[#3d3531]">{withMentions(text)}</p>}
        {attachments.length > 0 && (
          <div className="tw:mt-[.62rem] tw:flex tw:flex-col tw:items-start tw:gap-[.46rem]">
            {attachments.map((item) => <ConversationAttachmentButton key={item.path} name={item.name} size={item.size} className="tw:mt-[.62rem]" onOpen={() => onOpen(item.path)} />)}
          </div>
        )}
      </div>
      {mine && avatar}
    </div>
  );
}
