import { useState } from 'react';
import { useResolvedWorkspaceMedia } from '../hooks/useResolvedWorkspaceMedia';

export function ProfileSignatureImage({ source }: { source: string }) {
  const { data: url, isPending } = useResolvedWorkspaceMedia(source);
  const [failedUrl, setFailedUrl] = useState('');

  if (isPending) return <span role="status">Carregando assinatura…</span>;
  if (!url || url === failedUrl) return <span role="status">Imagem da assinatura indisponível.</span>;
  return <img className="tw:max-h-[5rem] tw:max-w-[65%] tw:object-contain" data-workspace-identity src={url} alt="Sua assinatura atual" onError={() => setFailedUrl(url)} />;
}
