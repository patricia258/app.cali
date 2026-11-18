import { useEffect, useState } from 'react';

export function useObjectUrl(blob?: Blob | null) {
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>();

  useEffect(() => {
    if (!blob) {
      setPreview(undefined);
      return;
    }

    const url = URL.createObjectURL(blob);
    setPreview({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return preview?.blob === blob ? preview?.url : undefined;
}
