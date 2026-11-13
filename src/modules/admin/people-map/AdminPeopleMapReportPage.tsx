import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useParams } from '../../../hooks/useParams';
import { officialReportOrigin, useOfficialReportAuth } from './hooks/useOfficialReportAuth';
import '../../../components/workspace/document-shell.css';

const EMBED_TOOLBAR_HEIGHT = 50;
const reportSurface = 'tw:[font-family:Inter,Arial,sans-serif] tw:bg-[#efe8df]';
const toolbarAction = 'tw:inline-flex tw:min-h-[34px] tw:cursor-pointer tw:items-center tw:gap-[7px] tw:rounded-[7px] tw:border tw:border-solid tw:px-[13px] tw:py-[9px] tw:whitespace-nowrap tw:[font:700_11px/1.2_Inter,Arial,sans-serif] tw:no-underline';
const secondaryAction = `${toolbarAction} tw:border-[#dec9c3] tw:bg-white tw:text-cali-brand`;
const primaryAction = `${toolbarAction} tw:border-cali-brand tw:bg-cali-brand tw:text-white tw:disabled:cursor-wait tw:disabled:opacity-55`;

export function AdminPeopleMapReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useOfficialReportAuth({ iframe: iframeRef });
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reportUrl = useMemo(() => {
    if (!id) return '';
    const params = new URLSearchParams({ id, workspace: '1', v: String(reloadKey) });
    return `${officialReportOrigin}/relatorio.html?${params.toString()}`;
  }, [id, reloadKey]);

  function sendToOfficialReport(type: string) {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type }, officialReportOrigin);
  }

  function printOfficialReport() {
    sendToOfficialReport('CALI_MAPA_PRINT_REQUEST');
  }

  if (!id) {
    return (
      <div className={`${reportSurface} tw:grid tw:min-h-screen tw:place-items-center tw:text-cali-brand`}>
        Relatório inválido: identificador não informado.
      </div>
    );
  }

  return (
    <div className={`${reportSurface} tw:flex tw:h-screen tw:flex-col tw:overflow-hidden tw:text-cali-day-canvas`}>
      <header className="tw:relative tw:z-10 tw:flex tw:min-h-[58px] tw:shrink-0 tw:items-center tw:justify-between tw:gap-[18px] tw:border-b tw:border-solid tw:border-[#eadfd6] tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:px-6 tw:[@media(max-width:820px)]:flex-col tw:[@media(max-width:820px)]:items-start tw:[@media(max-width:820px)]:gap-2 tw:[@media(max-width:820px)]:px-4 tw:[@media(max-width:820px)]:py-2">
        <div className="tw:min-w-0">
          <strong className="tw:block tw:text-[9px] tw:font-extrabold tw:tracking-[.14em] tw:uppercase tw:text-cali-gold">Backoffice / Mapa de People</strong>
          <span className="tw:mt-[4px] tw:block tw:text-[14px] tw:font-bold tw:text-cali-brand">Relatório oficial</span>
        </div>
        <div className="tw:flex tw:items-center tw:gap-2 tw:[@media(max-width:820px)]:flex-wrap">
          <button type="button" onClick={() => navigate('/admin/mapa-de-people')} className={secondaryAction}><ArrowLeft size={16}/>Painel do Mapa</button>
          <button type="button" onClick={() => { setLoaded(false); setReloadKey((value) => value + 1); }} className={secondaryAction}><RefreshCw size={15}/>Atualizar</button>
          <a href={`${officialReportOrigin}/relatorio.html?id=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer" className={secondaryAction}><ExternalLink size={15}/>Abrir original</a>
          <button type="button" onClick={printOfficialReport} disabled={!loaded} className={primaryAction}><Printer size={16}/>Imprimir / Salvar PDF</button>
        </div>
      </header>

      <div className="tw:relative tw:min-h-0 tw:flex-1 tw:overflow-hidden tw:bg-[#efe8df]">
        {!loaded && (
          <div className="tw:absolute tw:inset-0 tw:z-[2] tw:grid tw:place-items-center tw:bg-[#efe8df] tw:text-[13px] tw:font-bold tw:tracking-[.03em] tw:text-cali-brand" role="status">
            Carregando a versão oficial do relatório…
          </div>
        )}
        <iframe
          className="tw:block tw:w-full tw:border-0 tw:bg-[#efe8df]"
          key={reportUrl}
          ref={iframeRef}
          title="Mapa de People — Relatório oficial"
          src={reportUrl}
          onLoad={() => setLoaded(true)}
          style={{ height: `calc(100% + ${EMBED_TOOLBAR_HEIGHT}px)`, transform: `translateY(-${EMBED_TOOLBAR_HEIGHT}px)` }}
        />
      </div>
    </div>
  );
}
