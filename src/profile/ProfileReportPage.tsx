/* Relatório do respondente (/perfil/relatorio/:token): abre pelo link do e-mail ou logo após o envio do teste.
   Logo após o envio (?novo=1) gera o PDF no navegador, guarda no bucket privado e pede o e-mail com o anexo. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { anonPublicRpc, anonStorage } from '../lib/supabase';
import { RespondentReport, type ProfileBase, type ProfileResultView } from './ProfileReports';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import './profile-pages.css';

type ReportPayload = ProfileResultView & { has_pdf: boolean };
type MailState = 'idle' | 'working' | 'sent' | 'failed';

export function ProfileReportPage() {
  const { token = '' } = useParams();
  const fresh = useSearchParams()[0].get('novo') === '1';
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [base, setBase] = useState<ProfileBase | null>(null);
  const [mail, setMail] = useState<MailState>('idle');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    document.title = 'Perfil Comportamental · CALI RH';
    void anonPublicRpc<ProfileBase>('cali_profile_base', {}).then(({ data }) => { if (data) setBase(data); });
    void anonPublicRpc<ReportPayload | null>('cali_profile_report', { p_token: token }).then(({ data }) => { if (data) setReport(data); else setMissing(true); });
  }, [token]);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Logo após o envio: PDF → bucket privado → e-mail com anexo (uma vez só).
  useEffect(() => {
    if (!report || !fresh || report.has_pdf || started.current || !captureRef.current) return;
    started.current = true;
    setMail('working');
    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const blob = await pagesToPdf(captureRef.current!);
        const path = `${report.id}/perfil-comportamental-${Date.now()}.pdf`;
        if (!anonStorage) throw new Error('storage');
        const upload = await anonStorage.from('cali-profiles').upload(path, blob, { contentType: 'application/pdf', upsert: false });
        if (upload.error) throw upload.error;
        const ready = await anonPublicRpc<{ ok: boolean }>('cali_profile_report_ready', { p_token: token, p_path: path });
        setMail(ready.data?.ok ? 'sent' : 'failed');
      } catch { setMail('failed'); }
    })();
  }, [report, fresh, token]);

  async function download() {
    if (!report || !captureRef.current) return;
    setBusy(true);
    try { downloadBlob(await pagesToPdf(captureRef.current), `perfil-comportamental-cali-${fileSlug(report.person_name)}.pdf`); }
    finally { setBusy(false); }
  }

  if (missing) return <div className="cali-profile-shell"><div className="cps-empty"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" /><h1>Relatório não encontrado</h1><p>Confira o link recebido por e-mail ou fale com a CALI RH: privacidade@calirh.com.</p></div></div>;
  if (!report) return <div className="cali-profile-shell"><div className="cps-empty"><span className="cps-spinner" aria-label="Carregando" /></div></div>;

  return <div className="cali-profile-shell">
    <header className="cps-bar">
      <img src="/brand/cali-rh-bordo.png" alt="CALI RH" />
      <div className="cps-bar-status">{mail === 'working' ? 'Preparando seu PDF e enviando por e-mail…' : mail === 'sent' ? 'Enviamos o relatório em PDF para o seu e-mail.' : mail === 'failed' ? 'Não conseguimos enviar o e-mail agora. Baixe o PDF pelo botão ao lado.' : ''}</div>
      <button type="button" className="cps-primary" disabled={busy} onClick={() => void download()}><Download size={16} /> {busy ? 'Gerando…' : 'Baixar PDF'}</button>
    </header>
    {fresh && <div className="cps-thanks"><strong>Obrigada, {report.person_name.split(' ')[0]}! Suas respostas foram registradas.</strong><span>Este é o seu relatório. Ele também chega por e-mail, em PDF.</span></div>}
    <main className="cps-report" style={{ zoom }}><RespondentReport result={report} base={base} /></main>
    <div className="cps-capture" ref={captureRef} aria-hidden="true"><RespondentReport result={report} base={base} /></div>
  </div>;
}
