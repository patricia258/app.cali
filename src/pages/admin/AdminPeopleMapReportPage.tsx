import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#EFE8DF', color: '#5A1E2D', fontFamily: 'Inter, Arial, sans-serif' }}>
        Relatório inválido: identificador não informado.
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#EFE8DF', color: '#F7F3EE', fontFamily: 'Inter, Arial, sans-serif' }}>
      <header style={{ height: 58, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '0 24px', background: '#242122', boxShadow: '0 8px 24px rgba(43,43,43,.12)' }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', color: '#B58C52', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>CALI · Mapa de People</strong>
          <span style={{ display: 'block', marginTop: 2, color: 'rgba(247,243,238,.68)', fontSize: 11 }}>Relatório oficial integrado ao Workspace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
          <button type="button" onClick={() => navigate('/admin/mapa-de-people')} style={secondaryButtonStyle}><ArrowLeft size={16}/>Painel do Mapa</button>
          <button type="button" onClick={() => { setLoaded(false); setReloadKey((value) => value + 1); }} style={secondaryButtonStyle}><RefreshCw size={15}/>Atualizar</button>
          <a href={`${MAPA_ORIGIN}/relatorio.html?id=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer" style={secondaryButtonStyle}><ExternalLink size={15}/>Abrir original</a>
          <button type="button" onClick={printOfficialReport} disabled={!loaded} style={{ ...primaryButtonStyle, opacity: loaded ? 1 : .55, cursor: loaded ? 'pointer' : 'wait' }}><Printer size={16}/>Imprimir / Salvar PDF</button>
        </div>
      </header>

      <div style={{ position: 'relative', height: 'calc(100vh - 58px)', overflow: 'hidden', background: '#EFE8DF' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', background: '#EFE8DF', color: '#5A1E2D', fontSize: 13, fontWeight: 700, letterSpacing: '.03em' }}>
            Carregando a versão oficial do relatório…
          </div>
        )}
        <iframe
          key={reportUrl}
          ref={iframeRef}
          title="Mapa de People — Relatório oficial"
          src={reportUrl}
          onLoad={() => setLoaded(true)}
          style={{
            display: 'block',
            width: '100%',
            height: `calc(100% + ${EMBED_TOOLBAR_HEIGHT}px)`,
            border: 0,
            transform: `translateY(-${EMBED_TOOLBAR_HEIGHT}px)`,
            background: '#EFE8DF',
          }}
        />
      </div>
    </div>
  );
}

const secondaryButtonStyle = {
  minHeight: 34,
  border: '1px solid rgba(247,243,238,.25)',
  background: 'transparent',
  color: '#F7F3EE',
  borderRadius: 999,
  padding: '8px 14px',
  textDecoration: 'none',
  font: '600 12px/1 Inter, Arial, sans-serif',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;

const primaryButtonStyle = {
  ...secondaryButtonStyle,
  background: '#B58C52',
  borderColor: '#B58C52',
  color: '#3E1520',
  fontWeight: 800,
} as const;
