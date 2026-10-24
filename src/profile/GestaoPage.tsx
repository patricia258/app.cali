/* Relatório de gestão (/admin/perfil-comportamental/gestao/:linkId e /cliente/perfil-comportamental/gestao/:linkId).
   Administradora: preenche momento, setor, resultado perseguido e o parecer da CALI; aprova e assina (gera o protocolo
   CALI-GESTAO e congela a assinatura); depois libera no aplicativo (empresa com conta, avisada por e-mail) e/ou envia o PDF
   ao gestor por e-mail (empresa sem conta). Editar o conteúdo depois de aprovar desfaz a aprovação. Tudo vai para a auditoria.
   Cliente: só abre o que foi liberado para a própria empresa (cali_workspace.profile_gestao). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GestaoReport, MOMENTS, SECTORS, type GestaoData } from './GestaoReport';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import './profile-pages.css';

const NOTE_LIMIT = 700;
const when = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

export function GestaoPage({ role }: { role: 'admin' | 'client' }) {
  const { linkId = '' } = useParams();
  const admin = role === 'admin';
  const [data, setData] = useState<GestaoData | null>(null);
  const [missing, setMissing] = useState(false);
  const [fields, setFields] = useState({ moment: '', sector: '', goal: '', note: '' });
  const [recipient, setRecipient] = useState({ name: '', email: '' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  const back = admin ? '/admin/perfil-comportamental' : '/cliente/equipe';

  async function load() {
    if (!supabase) return;
    const { data: payload } = await supabase.rpc('profile_gestao', { p_link: linkId });
    if (!payload) { setMissing(true); return; }
    const value = payload as GestaoData;
    setData(value);
    setFields({ moment: value.moment || '', sector: value.sector || '', goal: value.goal || '', note: value.note || '' });
  }
  useEffect(() => { document.title = 'Relatório de gestão · CALI RH'; void load(); }, [linkId]);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function saveFields() {
    if (!supabase || !data) return;
    setBusy('save');
    const { error } = await supabase.from('profile_links').update({ gestao_moment: fields.moment || null, gestao_sector: fields.sector || null, gestao_goal: fields.goal.trim() || null, gestao_note: fields.note.trim() || null }).eq('id', data.link_id);
    setBusy('');
    if (error) { setNote(`Não foi possível salvar: ${error.message}`); return; }
    setNote(data.approved_at ? 'Salvo. Como o conteúdo mudou, o relatório voltou para rascunho: aprove de novo.' : 'Salvo.');
    await load();
  }

  async function rpc(name: string, args: Record<string, unknown>, message: string) {
    if (!supabase) return false;
    setBusy(name);
    const { error } = await supabase.rpc(name, args);
    setBusy('');
    if (error) { setNote(error.message); return false; }
    setNote(message);
    await load();
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
    if (!supabase || !data || !captureRef.current) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient.email.trim())) { setNote('Confira o e-mail do gestor.'); return; }
    setBusy('send');
    try {
      const blob = await makePdf();
      const path = `gestao/${data.link_id}/${data.protocol || 'relatorio'}-${Date.now()}.pdf`;
      const upload = await supabase.storage.from('cali-profiles').upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (upload.error) throw upload.error;
      const { error } = await supabase.rpc('profile_gestao_send', { p_link: data.link_id, p_name: recipient.name.trim(), p_email: recipient.email.trim(), p_path: path });
      if (error) throw error;
      setNote(`PDF enviado para ${recipient.email.trim()}.`);
      setRecipient({ name: '', email: '' });
      await load();
    } catch (error) { setNote(error instanceof Error ? error.message : 'Não foi possível enviar.'); }
    finally { setBusy(''); }
  }

  if (missing) return <div className="cali-profile-shell"><div className="cps-empty"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" /><h1>Relatório não disponível</h1><p>{admin ? 'Este link não existe mais.' : 'Este relatório ainda não foi liberado pela CALI RH.'}</p><Link className="cps-back" to={back}><ArrowLeft size={15} /> Voltar</Link></div></div>;
  if (!data) return <div className="cali-profile-shell"><div className="cps-empty"><span className="cps-spinner" aria-label="Carregando" /></div></div>;

  const changed = fields.moment !== (data.moment || '') || fields.sector !== (data.sector || '') || fields.goal.trim() !== (data.goal || '') || fields.note.trim() !== (data.note || '');
  const missingItems = [data.n < 5 ? 'pelo menos 5 respostas' : '', !data.goal?.trim() ? 'o resultado que a empresa persegue' : '', (data.note?.trim().length || 0) < 20 ? 'o parecer da CALI' : ''].filter(Boolean);
  const approved = Boolean(data.approved_at);
  return <div className="cali-profile-shell">
    <header className="cps-bar">
      <Link className="cps-back" to={back}><ArrowLeft size={15} /> {admin ? 'Perfil comportamental' : 'Equipe'}</Link>
      <div className="cps-bar-status">{note}</div>
      <button type="button" className="cps-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
      <button type="button" className="cps-primary" disabled={busy === 'pdf'} onClick={() => void download()}><Download size={15} /> {busy === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</button>
    </header>
    {admin && <div className="cps-admin-tools cgp-tools">
      <div className="cgp-step"><b>1. Conteúdo</b>{approved && <span>Editar volta o relatório para rascunho.</span>}</div>
      <label>Momento da empresa<select value={fields.moment} onChange={(event) => setFields({ ...fields, moment: event.target.value })}><option value="">Não informado</option>{Object.entries(MOMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Setor (vocabulário)<select value={fields.sector} onChange={(event) => setFields({ ...fields, sector: event.target.value })}><option value="">Não informado</option>{Object.entries(SECTORS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <label className="wide">Resultado que a empresa persegue<input value={fields.goal} maxLength={160} placeholder="Ex.: Abrir a segunda unidade sem perder a qualidade do atendimento" onChange={(event) => setFields({ ...fields, goal: event.target.value })} /></label>
      <label className="full">Parecer da CALI <em>{fields.note.length}/{NOTE_LIMIT} · entra na última página, assinado</em><textarea rows={5} maxLength={NOTE_LIMIT} value={fields.note} placeholder="O que você quer que esta liderança leve da leitura, com as suas palavras." onChange={(event) => setFields({ ...fields, note: event.target.value })} /></label>
      <div className="cgp-actions"><button type="button" className="cps-secondary" disabled={!changed || busy === 'save'} onClick={() => void saveFields()}>{busy === 'save' ? 'Salvando…' : 'Salvar'}</button></div>

      <div className="cgp-step"><b>2. Aprovação</b>{approved ? <span>Aprovado e assinado em {when(data.approved_at!)} · protocolo {data.protocol}</span> : missingItems.length ? <span>Falta: {missingItems.join(', ')}.</span> : <span>Pronto para aprovar.</span>}</div>
      <div className="cgp-actions">{approved
        ? <button type="button" className="cps-secondary" disabled={Boolean(busy)} onClick={() => void rpc('profile_gestao_approve', { p_link: data.link_id, p_approve: false }, 'Aprovação desfeita: o relatório voltou para rascunho.')}>Reabrir para edição</button>
        : <button type="button" className="cps-primary" disabled={Boolean(missingItems.length) || changed || Boolean(busy)} title={changed ? 'Salve antes de aprovar' : ''} onClick={() => void rpc('profile_gestao_approve', { p_link: data.link_id, p_approve: true }, 'Aprovado e assinado.')}>Aprovar e assinar</button>}</div>

      {approved && <>
        <div className="cgp-step"><b>3. Entrega</b><span>{data.has_account ? 'A empresa tem conta no aplicativo: libere lá (as pessoas da empresa são avisadas por e-mail) e, se quiser, envie também o PDF.' : 'A empresa não tem conta no aplicativo: envie o PDF por e-mail ao gestor.'}</span></div>
        {data.company_id && data.has_account && <div className="cgp-actions cgp-left">{data.released_at
          ? <button type="button" className="cps-secondary" disabled={Boolean(busy)} onClick={() => void rpc('profile_gestao_release', { p_link: data.link_id, p_release: false }, 'Relatório retirado do aplicativo do cliente.')}>Liberado no aplicativo em {when(data.released_at)} · retirar</button>
          : <button type="button" className="cps-primary" disabled={Boolean(busy)} onClick={() => void rpc('profile_gestao_release', { p_link: data.link_id, p_release: true }, 'Liberado no aplicativo; as pessoas da empresa foram avisadas por e-mail.')}>Liberar no aplicativo</button>}</div>}
        <label>Nome do gestor<input value={recipient.name} maxLength={120} placeholder="Ex.: Ana Ribeiro" onChange={(event) => setRecipient({ ...recipient, name: event.target.value })} /></label>
        <label className="wide">E-mail do gestor<input type="email" value={recipient.email} placeholder="ana@empresa.com" onChange={(event) => setRecipient({ ...recipient, email: event.target.value })} /></label>
        <div className="cgp-actions"><button type="button" className="cps-primary" disabled={busy === 'send' || !recipient.email.trim()} onClick={() => void sendToManager()}><Send size={15} /> {busy === 'send' ? 'Gerando e enviando…' : 'Enviar PDF ao gestor'}</button></div>
        {!!data.sent_log?.length && <ul className="cgp-log">{data.sent_log.map((item) => <li key={item.at}>{when(item.at)} · PDF enviado para {item.name ? `${item.name} (${item.email})` : item.email} · {item.protocol}</li>)}</ul>}
      </>}
      <span className="cps-note">Nenhum nome de quem respondeu aparece neste relatório. Aprovação, liberação e envios ficam registrados na auditoria.</span>
    </div>}
    <main className="cps-report" style={{ zoom }}><GestaoReport data={data} /></main>
    <div className="cps-capture" ref={captureRef} aria-hidden="true"><GestaoReport data={data} /></div>
  </div>;
}
