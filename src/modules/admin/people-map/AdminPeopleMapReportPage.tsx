import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useParams } from '../../../hooks/useParams';
import './official-report-embed.css';

const MAPA_ORIGIN = 'https://mapa.calirh.com';
const EMBED_TOOLBAR_HEIGHT = 50;

export function AdminPeopleMapReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reportUrl = useMemo(() => {
    if (!id) return '';
    const params = new URLSearchParams({ id, workspace: '1', v: String(reloadKey) });
    return `${MAPA_ORIGIN}/relatorio.html?${params.toString()}`;
  }, [id, reloadKey]);

  function sendToOfficialReport(type: string) {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type }, MAPA_ORIGIN);
  }

  function printOfficialReport() {
    sendToOfficialReport('CALI_MAPA_PRINT_REQUEST');
  }

  if (!id) {
    return (
      <div className="mapa-report-embed-invalid">
        Relatório inválido: identificador não informado.
      </div>
    );
  }

  return (
    <div className="mapa-report-embed">
      <header className="mapa-report-toolbar">
        <div className="mapa-report-title">
          <strong>Backoffice / Mapa de People</strong>
          <span>Relatório oficial</span>
        </div>
        <div className="mapa-report-actions">
          <button type="button" onClick={() => navigate('/admin/mapa-de-people')} className="mapa-report-action"><ArrowLeft size={16}/>Painel do Mapa</button>
          <button type="button" onClick={() => { setLoaded(false); setReloadKey((value) => value + 1); }} className="mapa-report-action"><RefreshCw size={15}/>Atualizar</button>
          <a href={`${MAPA_ORIGIN}/relatorio.html?id=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer" className="mapa-report-action"><ExternalLink size={15}/>Abrir original</a>
          <button type="button" onClick={printOfficialReport} disabled={!loaded} className="mapa-report-action is-primary"><Printer size={16}/>Imprimir / Salvar PDF</button>
        </div>
      </header>

      <div className="mapa-report-frame">
        {!loaded && (
          <div className="mapa-report-loading" role="status">
            Carregando a versão oficial do relatório…
          </div>
        )}
        <iframe
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
