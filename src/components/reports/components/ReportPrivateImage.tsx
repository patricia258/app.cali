import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useResolvedWorkspaceMedia } from '../../workspace/hooks/useResolvedWorkspaceMedia';

type Props = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'onError'> & {
  source: string;
  fallback: ReactNode;
  alt: string;
};

export function ReportPrivateImage({ source, fallback, alt, ...image }: Props) {
  const { data: signed, isFetching } = useResolvedWorkspaceMedia(source);
  const [failed, setFailed] = useState('');
  if (!signed || signed === failed) return <span data-report-media-pending={isFetching || undefined}>{fallback}</span>;
  return <img {...image} src={signed} alt={alt} onError={() => setFailed(signed)} />;
}
