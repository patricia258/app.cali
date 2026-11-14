import { useState, type ReactNode } from 'react';
import { useResolvedWorkspaceMedia } from './hooks/useResolvedWorkspaceMedia';

type AvatarIdentity = {
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};

export function WorkspaceProfileAvatar({ identity, alt, fallback }: {
  identity?: AvatarIdentity | null;
  alt: string;
  fallback: ReactNode;
}) {
  const { data: source } = useResolvedWorkspaceMedia(identity?.avatar_url);
  const [failedSource, setFailedSource] = useState('');
  if (!source || failedSource === source) return <>{fallback}</>;

  const position = `${identity?.avatar_position_x ?? 50}% ${identity?.avatar_position_y ?? 50}%`;
  return <img
    data-workspace-identity
    className="tw:block tw:size-full tw:object-cover"
    src={source}
    alt={alt}
    style={{ objectPosition: position, transform: `scale(${identity?.avatar_zoom ?? 1})`, transformOrigin: position }}
    onError={() => setFailedSource(source)}
  />;
}
