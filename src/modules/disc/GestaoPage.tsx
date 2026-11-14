/* Relatório de gestão (/admin/perfil-comportamental/gestao/:linkId e /cliente/perfil-comportamental/gestao/:linkId).
   Administradora: preenche momento, setor, resultado perseguido e o parecer da CALI; aprova e assina (gera o protocolo
   CALI-GESTAO e congela a assinatura); depois libera no aplicativo (empresa com conta, avisada por e-mail) e/ou envia o PDF
   ao gestor por e-mail (empresa sem conta). Editar o conteúdo depois de aprovar desfaz a aprovação. Tudo vai para a auditoria.
   Cliente: só abre o que foi liberado para a própria empresa (cali_workspace.profile_gestao). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '../../components/navigation/Link';
import { ArrowLeft, Download, Printer, Send } from 'lucide-react';
import { useManagementDiscReport } from './hooks/useManagementDiscReport';
import { useSaveManagementDiscContext } from './hooks/useSaveManagementDiscContext';
import { useChangeManagementDiscState } from './hooks/useChangeManagementDiscState';
import { useSendManagementDiscPdf } from './hooks/useSendManagementDiscPdf';
import { useDiscReportRoute } from './hooks/useDiscReportRoute';
import { GestaoReport, MOMENTS, SECTORS } from './components/GestaoReport';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import { discReport, DiscReportEmpty, DiscReportLoading } from './components/DiscReportShell';

const NOTE_LIMIT = 700;
const adminLabel = 'tw:flex tw:flex-col tw:items-stretch tw:gap-1.5 tw:text-left tw:font-[Inter,sans-serif] tw:text-[.75rem] tw:leading-[normal] tw:font-semibold tw:text-[#3e3533]';
const adminInput = 'tw:w-full tw:rounded-lg tw:border tw:border-solid tw:border-[#e3d6cc] tw:bg-white tw:px-2.5 tw:py-2 tw:font-[Inter,sans-serif] tw:text-[.8125rem] tw:leading-[normal] tw:font-medium';
const adminStep = 'tw:col-span-full tw:flex tw:flex-wrap tw:items-baseline tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-[#f1e9e2] tw:pt-3 tw:font-[Inter,sans-serif] tw:text-[.78125rem] tw:leading-[normal] tw:text-[#6b5d63] tw:first:border-0 tw:first:pt-0 tw:[&_b]:text-[.8125rem] tw:[&_b]:text-cali-brand';
const adminActions = 'tw:col-span-full tw:flex tw:flex-wrap tw:gap-2';
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

export function GestaoPage({ role }: { role: 'admin' | 'client' }) {
  const { linkId, back } = useDiscReportRoute(role);
  return <ManagementReport key={`${role}:${linkId}`} role={role} linkId={linkId} back={back} />;
}

function ManagementReport({ role, linkId, back }: { role: 'admin' | 'client'; linkId: string; back: string }) {
  const admin = role === 'admin';
  const report = useManagementDiscReport(linkId, role);
  const data = report.data;
  const { mutateAsync: saveContext } = useSaveManagementDiscContext();
  const { mutateAsync: updateStatus } = useChangeManagementDiscState();
  const { mutateAsync: sendPdf } = useSendManagementDiscPdf();
  const [fields, setFields] = useState({ moment: '', sector: '', goal: '', note: '' });
  const [recipient, setRecipient] = useState({ name: '', email: '' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.title = 'Relatório de gestão · CALI RH'; }, []);
  useEffect(() => {
    if (data) setFields({ moment: data.moment || '', sector: data.sector || '', goal: data.goal || '', note: data.note || '' });
  }, [data, report.dataUpdatedAt]);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function saveFields() {
    if (!data) return;
    setBusy('save');
    const { error } = await saveContext({ id: data.link_id, fields });
    setBusy('');
    if (error) { setNote(`Não foi possível salvar: ${error.message}`); return; }
    setNote(data.approved_at ? 'Salvo. Como o conteúdo mudou, o relatório voltou para rascunho: aprove de novo.' : 'Salvo.');
    await report.refetch();
  }

  async function changeState(action: 'approve' | 'release', id: string, value: boolean, message: string) {
    setBusy(action);
    const { error } = await updateStatus({ id, action, value });
    setBusy('');
    if (error) { setNote(error.message); return false; }
    setNote(message);
    await report.refetch();
    return true;
  }

  async function makePdf() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return pagesToPdf(captureRef.current!);
  }

  async function download() {
    if (!data || !captureRef.current) return;
    setBusy('pdf');
    try { downloadBlob(await makePdf(), `relatorio-gestao-${fileSlug(data.company || data.title)}.pdf`); }
    finally { setBusy(''); }
  }

  async function sendToManager() {
    if (!data || !captureRef.current) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient.email.trim())) { setNote('Confira o e-mail do gestor.'); return; }
    setBusy('send');
    try {
      const blob = await makePdf();
      const path = `gestao/${data.link_id}/${data.protocol || 'relatorio'}-${Date.now()}.pdf`;
      await sendPdf({ id: data.link_id, recipient, path, blob });
      setNote(`PDF enviado para ${recipient.email.trim()}.`);
      setRecipient({ name: '', email: '' });
      await report.refetch();
    } catch (error) { setNote(error instanceof Error ? error.message : 'Não foi possível enviar.'); }
    finally { setBusy(''); }
  }

  if (report.isError || data === null || !linkId) return <DiscReportEmpty message={admin ? 'Este link não existe mais.' : 'Este relatório ainda não foi liberado pela CALI RH.'} back={back} />;
  if (!data) return <DiscReportLoading />;

  const changed = fields.moment !== (data.moment || '') || fields.sector !== (data.sector || '') || fields.goal.trim() !== (data.goal || '') || fields.note.trim() !== (data.note || '');
  const missingItems = [data.n < 5 ? 'pelo menos 5 respostas' : '', !data.goal?.trim() ? 'o resultado que a empresa persegue' : '', (data.note?.trim().length || 0) < 20 ? 'o parecer da CALI' : ''].filter(Boolean);
  const approved = Boolean(data.approved_at);
  return <div className={discReport.shell}>
    <header className={discReport.header}>
      <Link className={discReport.back} to={back}><ArrowLeft size={15} /> {admin ? 'Perfil comportamental' : 'Equipe'}</Link>
      <div className={discReport.status}>{note}</div>
      <button type="button" className={discReport.secondary} onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
      <button type="button" className={discReport.primary} disabled={busy === 'pdf'} onClick={() => void download()}><Download size={15} /> {busy === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</button>
    </header>
    {admin && <div className={`${discReport.toolbar} tw:grid tw:grid-cols-[12.5rem_12.5rem_1fr] tw:items-end tw:justify-items-stretch tw:gap-3 tw:text-left tw:max-[761px]:grid-cols-1`}>
      <div className={adminStep}><b>1. Conteúdo</b>{approved && <span>Editar volta o relatório para rascunho.</span>}</div>
      <label className={adminLabel}>Momento da empresa<select className={adminInput} value={fields.moment} onChange={(event) => setFields({ ...fields, moment: event.target.value })}><option value="">Não informado</option>{Object.entries(MOMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className={adminLabel}>Setor (vocabulário)<select className={adminInput} value={fields.sector} onChange={(event) => setFields({ ...fields, sector: event.target.value })}><option value="">Não informado</option>{Object.entries(SECTORS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <label className={adminLabel}>Resultado que a empresa persegue<input className={adminInput} value={fields.goal} maxLength={160} placeholder="Ex.: Abrir a segunda unidade sem perder a qualidade do atendimento" onChange={(event) => setFields({ ...fields, goal: event.target.value })} /></label>
      <label className={`${adminLabel} tw:col-span-full`}>Parecer da CALI <em className="tw:ml-1.5 tw:font-medium tw:text-[#8c807a] tw:not-italic">{fields.note.length}/{NOTE_LIMIT} · entra na última página, assinado</em><textarea className="tw:w-full tw:resize-y tw:rounded-lg tw:border tw:border-solid tw:border-[#e3d6cc] tw:bg-white tw:px-3 tw:py-2.5 tw:font-[Inter,sans-serif] tw:text-[.84375rem] tw:leading-[1.6] tw:font-normal" rows={5} maxLength={NOTE_LIMIT} value={fields.note} placeholder="O que você quer que esta liderança leve da leitura, com as suas palavras." onChange={(event) => setFields({ ...fields, note: event.target.value })} /></label>
      <div className={`${adminActions} tw:justify-end`}><button type="button" className={discReport.secondary} disabled={!changed || busy === 'save'} onClick={() => void saveFields()}>{busy === 'save' ? 'Salvando…' : 'Salvar'}</button></div>

      <div className={adminStep}><b>2. Aprovação</b>{approved ? <span>Aprovado e assinado em {when(data.approved_at!)} · protocolo {data.protocol}</span> : missingItems.length ? <span>Falta: {missingItems.join(', ')}.</span> : <span>Pronto para aprovar.</span>}</div>
      <div className={`${adminActions} tw:justify-end`}>{approved
        ? <button type="button" className={discReport.secondary} disabled={Boolean(busy)} onClick={() => void changeState('approve', data.link_id, false, 'Aprovação desfeita: o relatório voltou para rascunho.')}>Reabrir para edição</button>
        : <button type="button" className={discReport.primary} disabled={Boolean(missingItems.length) || changed || Boolean(busy)} title={changed ? 'Salve antes de aprovar' : ''} onClick={() => void changeState('approve', data.link_id, true, 'Aprovado e assinado.')}>Aprovar e assinar</button>}</div>

      {approved && <>
        <div className={adminStep}><b>3. Entrega</b><span>{data.has_account ? 'A empresa tem conta no aplicativo: libere lá (as pessoas da empresa são avisadas por e-mail) e, se quiser, envie também o PDF.' : 'A empresa não tem conta no aplicativo: envie o PDF por e-mail ao gestor.'}</span></div>
        {data.company_id && data.has_account && <div className={`${adminActions} tw:justify-start`}>{data.released_at
          ? <button type="button" className={discReport.secondary} disabled={Boolean(busy)} onClick={() => void changeState('release', data.link_id, false, 'Relatório retirado do aplicativo do cliente.')}>Liberado no aplicativo em {when(data.released_at)} · retirar</button>
          : <button type="button" className={discReport.primary} disabled={Boolean(busy)} onClick={() => void changeState('release', data.link_id, true, 'Liberado no aplicativo; as pessoas da empresa foram avisadas por e-mail.')}>Liberar no aplicativo</button>}</div>}
        <label className={adminLabel}>Nome do gestor<input className={adminInput} value={recipient.name} maxLength={120} placeholder="Ex.: Ana Ribeiro" onChange={(event) => setRecipient({ ...recipient, name: event.target.value })} /></label>
        <label className={adminLabel}>E-mail do gestor<input className={adminInput} type="email" value={recipient.email} placeholder="ana@empresa.com" onChange={(event) => setRecipient({ ...recipient, email: event.target.value })} /></label>
        <div className={`${adminActions} tw:justify-end`}><button type="button" className={discReport.primary} disabled={busy === 'send' || !recipient.email.trim()} onClick={() => void sendToManager()}><Send size={15} /> {busy === 'send' ? 'Gerando e enviando…' : 'Enviar PDF ao gestor'}</button></div>
        {!!data.sent_log?.length && <ul className="tw:col-span-full tw:m-0 tw:pl-[1.125rem] tw:text-[.75rem] tw:leading-[1.6] tw:text-[#6b5d63]">{data.sent_log.map((item) => <li key={item.at}>{when(item.at)} · PDF enviado para {item.name ? `${item.name} (${item.email})` : item.email} · {item.protocol}</li>)}</ul>}
      </>}
      <span className={`${discReport.note} tw:col-span-full`}>Nenhum nome de quem respondeu aparece neste relatório. Aprovação, liberação e envios ficam registrados na auditoria.</span>
    </div>}
    <main className={discReport.report} style={{ zoom }}><GestaoReport data={data} /></main>
    <div className={discReport.capture} ref={captureRef} aria-hidden="true"><GestaoReport data={data} /></div>
  </div>;
}
