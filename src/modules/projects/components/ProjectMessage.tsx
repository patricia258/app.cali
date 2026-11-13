import type { ReactNode } from 'react';
import type { ProfileMedia } from '../../../api/workspace/identity';
import { ProjectConversationAvatar } from '../../../components/projects/conversation/components/ProjectConversationAvatar';

type ProjectMessageProps = {
  identity?: ProfileMedia;
  name: string;
  date: string;
  mine: boolean;
  internal?: boolean;
  task?: boolean;
  children: ReactNode;
};

export function ProjectMessage({ identity, name, date, mine, internal, task, children }: ProjectMessageProps) {
  const avatar = (
    <ProjectConversationAvatar
      identity={identity}
      name={name}
      className="tw:grid tw:size-[2.308rem] tw:shrink-0 tw:place-items-center tw:rounded-[.538rem] tw:bg-[#f3ece6] tw:text-[.846rem] tw:font-bold tw:text-cali-brand tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:object-cover"
    />
  );
  const bubble = internal
    ? 'tw:border-[#f0dfc0] tw:bg-[#fffaf1]'
    : mine
      ? 'tw:border-[var(--v2-line-eee1db,#eee1db)] tw:bg-[var(--v2-surface-f7e7d2,#f7e7d2)]'
      : 'tw:border-[var(--v2-line-eee1db,#eee1db)] tw:bg-[var(--v2-surface-faf4f1,#faf4f1)]';

  return (
    <div className={`tw:flex tw:max-w-[90%] tw:shrink-0 tw:items-start tw:text-[.923rem] ${task ? 'tw:w-full tw:gap-[.769rem]' : 'tw:gap-[.692rem]'} ${mine ? task ? 'tw:justify-end tw:self-end' : 'tw:self-end tw:flex-row-reverse' : ''}`}>
      {!mine && avatar}
      <article className={`tw:min-w-0 tw:rounded-[.769rem] tw:border tw:border-solid tw:px-[1.154rem] tw:py-[.923rem] tw:wrap-anywhere ${bubble}`}>
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-[1.538rem] tw:text-[.769rem] tw:text-[var(--v2-text-805957,#805957)]">
          <strong>{name}{internal ? ' · nota interna' : ''}</strong>
          <time className="tw:shrink-0 tw:text-[.692rem] tw:text-[var(--v2-text-978579,#978579)]">{date}</time>
        </div>
        {children}
      </article>
      {mine && avatar}
    </div>
  );
}
