import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { resolveCompanyAsset } from '../../../../lib/companyWorkspaceLogo';
import { resolveDocumentBrandVisual } from '../../../../lib/documentBrandVisual';

const colorPromises = new Map<string, Promise<string>>();

export function ClientDocumentBrandCover({
  companyId,
  companyName,
  logoUrl,
  compact = false,
}: {
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
  compact?: boolean;
}) {
  const [visual, setVisual] = useState({ url: '', color: '#F7F3EE' });
  useEffect(() => {
    let active = true;
    setVisual({ url: '', color: '#F7F3EE' });
    async function load() {
      const url = await resolveCompanyAsset(logoUrl);
      if (!active) return;
      setVisual((current) => ({ ...current, url }));
      if (!url) return;
      const key = `${companyId}:${url}`;
      if (!colorPromises.has(key))
        colorPromises.set(
          key,
          resolveDocumentBrandVisual({ id: companyId, display_name: companyName }, url).then(
            (brand) => brand.color,
          ),
        );
      const color = await colorPromises.get(key)!;
      if (active) setVisual({ url, color });
    }
    void load();
    return () => {
      active = false;
    };
  }, [companyId, companyName, logoUrl]);
  return (
    <div
      className={`tw:grid tw:size-full tw:place-items-center tw:text-cali-brand ${compact ? 'tw:p-[0.615rem]' : 'tw:p-[0.923rem]'}`}
      style={{ backgroundColor: visual.color }}
      aria-label={`Capa com a marca de ${companyName}`}
    >
      {visual.url ? (
        <img
          className={`tw:block tw:h-auto tw:w-auto tw:max-w-[86%] tw:object-contain ${compact ? 'tw:max-h-[6.462rem]' : 'tw:max-h-[9.692rem]'}`}
          src={visual.url}
          alt={`Logo ${companyName}`}
        />
      ) : (
        <FileText size={compact ? 25 : 32} aria-hidden="true" />
      )}
    </div>
  );
}
