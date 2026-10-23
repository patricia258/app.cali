/* Relatório do respondente (/perfil/relatorio/:token). A pessoa não vê o relatório na tela (decisão da proprietária, 23/10):
   logo após o envio (?novo=1) o PDF é gerado fora da tela, guardado no bucket privado e enviado por e-mail; a página mostra só
   o agradecimento. Aberta depois (link antigo de e-mail), oferece apenas o download do PDF. */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { anonPublicRpc, anonStorage } from '../lib/supabase';
import { RespondentReport, type ProfileResultView } from './ProfileReports';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import './profile-pages.css';

type ReportPayload = ProfileResultView & { has_pdf: boolean };
type MailState = 'idle' | 'working' | 'sent' | 'failed';

export function ProfileReportPage() {
  const { token = '' } = useParams();
  const fresh = useSearchParams()[0].get('novo') === '1';
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [mail, setMail] = useState<MailState>('idle');
  const [busy, setBusy] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    document.title = 'Perfil Comportamental · CALI RH';
    void anonPublicRpc<ReportPayload | null>('cali_profile_report', { p_token: token }).then(({ data }) => { if (data) setReport(data); else setMissing(true); });
  }, [token]);

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

  const first = report.person_name.split(' ')[0];
  const sending = fresh && !report.has_pdf && (mail === 'idle' || mail === 'working');
  const done = fresh && (mail === 'sent' || (report.has_pdf && mail === 'idle'));
  const showDownload = !fresh || mail === 'failed';
  return <div className="cali-profile-shell">
    <div className="cps-done">
      <img className="cps-done-logo" src="/brand/cali-rh-bordo.png" alt="CALI RH" />
      <span className={`cps-done-mark${sending ? ' working' : ''}`} aria-hidden="true"><img src="/brand/cali-oak-mark-light.svg" alt="" /></span>
      <h1>{fresh ? `Obrigada, ${first}!` : 'Seu Perfil Comportamental'}</h1>
      {fresh && <p>Suas respostas foram registradas.</p>}
      <div className="cps-done-status" role="status">
        {sending && <><span className="cps-spinner small" /> Estamos preparando o seu relatório em PDF e enviando para o seu e-mail. Mantenha esta página aberta por alguns segundos.</>}
        {done && 'Pronto! O seu relatório em PDF foi enviado para o seu e-mail. Se não encontrar, confira a caixa de spam. Pode fechar esta página.'}
        {mail === 'failed' && 'Não conseguimos enviar o e-mail agora. Baixe o seu relatório pelo botão abaixo.'}
        {!fresh && 'Baixe o seu relatório em PDF pelo botão abaixo.'}
      </div>
      {showDownload && <button type="button" className="cps-primary" disabled={busy} onClick={() => void download()}><Download size={16} /> {busy ? 'Gerando o PDF…' : 'Baixar PDF'}</button>}
      <small>Dúvidas sobre o seu resultado ou seus dados: privacidade@calirh.com</small>
    </div>
    <div className="cps-capture" ref={captureRef} aria-hidden="true"><RespondentReport result={report} /></div>
  </div>;
}
