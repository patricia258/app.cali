import { useState, type ReactNode } from 'react';
import { useResolvedWorkspaceMedia } from './hooks/useResolvedWorkspaceMedia';

export function WorkspaceCompanyLogo({ original, derived, alt, fallback, className }: {
  original?: string | null;
  derived?: string | null;
  alt: string;
  fallback: ReactNode;
  className: string;
}) {
  const { data: originalUrl, isPending } = useResolvedWorkspaceMedia(original);
  const [failed, setFailed] = useState<string[]>([]);
  const showOriginal = originalUrl && !failed.includes(originalUrl);
  const derivedSource = derived !== original && (!original || !isPending && !showOriginal) ? derived : null;
  const { data: derivedUrl } = useResolvedWorkspaceMedia(derivedSource);
  const source = showOriginal ? originalUrl : derivedUrl;

  if (!source || failed.includes(source)) return <>{fallback}</>;
  return <img
    data-workspace-identity
    className={className}
    src={source}
    alt={alt}
    draggable={false}
    decoding="async"
    onError={() => setFailed((current) => [...current, source])}
  />;
}
