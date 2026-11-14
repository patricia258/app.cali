import type { ProfileMedia } from '../../../../api/workspace/identity';
import { WorkspaceProfileAvatar } from '../../../workspace/WorkspaceProfileAvatar';

export function ProjectConversationAvatar({ identity, name, className }: {
  identity?: ProfileMedia;
  name: string;
  className: string;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'C';
  return <span aria-hidden="true" title={name} className={`tw:overflow-hidden ${className}`}>
    <WorkspaceProfileAvatar identity={identity} alt="" fallback={<span data-workspace-identity>{initials}</span>} />
  </span>;
}
