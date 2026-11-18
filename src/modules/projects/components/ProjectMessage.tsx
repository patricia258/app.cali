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
      className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-surface-muted tw:text-sm tw:font-bold tw:text-cali-brand tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:object-cover"
    />
  );
  const bubble = internal
    ? 'tw:border-cali-warning-line tw:bg-cali-warning-surface'
    : mine
      ? 'tw:border-[var(--v2-line-eee1db,var(--cali-color-sand-line))] tw:bg-[var(--v2-surface-f7e7d2,var(--cali-color-orange-surface))]'
      : 'tw:border-[var(--v2-line-eee1db,var(--cali-color-sand-line))] tw:bg-[var(--v2-surface-faf4f1,var(--cali-color-sand-soft))]';

  return (
    <div className={`tw:flex tw:max-w-[90%] tw:shrink-0 tw:items-start tw:text-cali-body ${task ? 'tw:w-full tw:gap-3' : 'tw:gap-3'} ${mine ? task ? 'tw:justify-end tw:self-end' : 'tw:self-end tw:flex-row-reverse' : ''}`}>
      {!mine && avatar}
      <article className={`tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:px-4.5 tw:py-3.5 tw:wrap-anywhere ${bubble}`}>
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-6 tw:text-xs tw:text-[var(--v2-text-805957,var(--cali-color-sand-strong))]">
          <strong>{name}{internal ? ' · nota interna' : ''}</strong>
          <time className="tw:shrink-0 tw:text-cali-label tw:text-[var(--v2-text-978579,var(--cali-color-sand-text))]">{date}</time>
        </div>
        {children}
      </article>
      {mine && avatar}
    </div>
  );
}
