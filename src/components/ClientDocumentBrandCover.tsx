import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { resolveCompanyAsset } from '../lib/companyWorkspaceLogo';
import { resolveDocumentBrandVisual } from '../lib/documentsIdentityRuntimeV42';

const colorPromises = new Map<string, Promise<string>>();

export function ClientDocumentBrandCover({ companyId, companyName, logoUrl, compact = false }: { companyId: string; companyName: string; logoUrl?: string | null; compact?: boolean }) {
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
      if (!colorPromises.has(key)) colorPromises.set(key, resolveDocumentBrandVisual({ id: companyId, display_name: companyName, logo_url: logoUrl }, url).then((brand) => brand.color));
      const color = await colorPromises.get(key)!;
      if (active) setVisual({ url, color });
    }
    void load();
    return () => { active = false; };
  }, [companyId, companyName, logoUrl]);
  return <div className={`client-document-brand-cover${compact ? ' compact' : ''}`} style={{ backgroundColor: visual.color }} aria-label={`Capa com a marca de ${companyName}`}>
    {visual.url ? <img src={visual.url} alt={`Logo ${companyName}`} /> : <FileText size={compact ? 25 : 32} aria-hidden="true" />}
  </div>;
}
