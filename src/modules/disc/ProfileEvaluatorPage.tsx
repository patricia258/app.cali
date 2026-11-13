/* Relatório individual e recuperação de PDF disponíveis à CALI. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '../../components/navigation/Link';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useDiscEvaluator, type DiscEvaluatorRow as Row } from './hooks/useDiscEvaluator';
import { useDiscReportRoute } from './hooks/useDiscReportRoute';
import { useDownloadRespondentReport } from './hooks/useDownloadRespondentReport';
import { useUpdateDiscEvaluator } from './hooks/useUpdateDiscEvaluator';
import { EvaluatorReport, RespondentReport } from './components/ProfileReports';
import type { RoleProfile } from './components/ProfileCharts';
import { METHOD_VERSION, STYLES } from './profileMethod';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import { discReport, DiscReportEmpty, DiscReportLoading, DiscReportNotice } from './components/DiscReportShell';

function hasReportData(row: Row) {
  return Number.isFinite(Date.parse(row.created_at)) &&
    STYLES.includes(row.primary_style) && STYLES.includes(row.secondary_style) &&
    STYLES.every((style) => Number.isFinite(row.scores?.natural?.[style]?.pct) &&
      Number.isFinite(row.scores?.pressure?.[style]?.pct) && Number.isFinite(row.scores?.adaptation?.[style]));
}

export function ProfileEvaluatorPage({ role }: { role: 'admin' | 'client' }) {
  const { id, back } = useDiscReportRoute(role);
  return <DiscEvaluator key={`${role}:${id}`} id={id} back={back} admin={role === 'admin'} />;
}

function DiscEvaluator({ id, back, admin }: { id: string; back: string; admin: boolean }) {
  const report = useDiscEvaluator(id, admin);
  const { row, team = [], members = [], base, signer } = report.data ?? {};
  const { mutateAsync: saveUpdate, isPending: saving } = useUpdateDiscEvaluator(id);
  const { mutateAsync: downloadArchived } = useDownloadRespondentReport();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [respondentBusy, setRespondentBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  const respondentCapture = useRef<HTMLDivElement>(null);
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function update(patch: Partial<Pick<Row, 'team_member_id' | 'role_profile'>>, message: string) {
    if (!row) return;
    try {
      await saveUpdate(patch);
      setNote(message);
    } catch (reason) {
      setNote(`Não foi possível salvar: ${reason instanceof Error ? reason.message : 'Tente novamente.'}`);
    }

  }

  async function download() {
    if (!row || !captureRef.current) return;
    setBusy(true);
    try { downloadBlob(await pagesToPdf(captureRef.current), `perfil-comportamental-avaliador-${fileSlug(row.person_name)}.pdf`); }
    finally { setBusy(false); }
  }

  async function downloadRespondent() {
    if (!admin || !row) return;
    setRespondentBusy(true);
    setNote('');
    const name = `perfil-comportamental-cali-${fileSlug(row.person_name)}.pdf`;
    try {
      if (row.report_path) {
        const archived = await downloadArchived(row.report_path);
        if (archived.data && !archived.error) {
          downloadBlob(archived.data, name);
          return;
        }
      }
      if (!respondentCapture.current) {
        setNote('PDF indisponível. Faltam dados para reconstruir o resultado histórico.');
        return;
      }
      downloadBlob(await pagesToPdf(respondentCapture.current), `copia-${name}`);
      setNote('Cópia gerada a partir do resultado histórico.');
    } catch {
      setNote('Não foi possível recuperar o PDF do respondente.');
    } finally {
      setRespondentBusy(false);
    }
  }

  if (!admin || !id || report.isError || report.data === null) return <DiscReportEmpty message={admin ? 'Este resultado não existe mais.' : 'Relatórios individuais ficam com a CALI RH. Consulte o relatório de gestão na área da sua empresa.'} back={back} />;
  if (!row) return <DiscReportLoading />;
  const hasInputs = hasReportData(row);
  const canRegenerate = hasInputs && row.method_version === METHOD_VERSION && Boolean(row.protocol);

  return <div className={discReport.shell}>
    <header className={discReport.header}>
      <Link className={discReport.back} to={back}><ArrowLeft size={15} /> {admin ? 'Perfil comportamental' : 'Equipe'}</Link>
      <div className={discReport.status} role="status">{note}</div>
      {hasInputs && <>
        <button type="button" className={discReport.secondary} onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
        <button type="button" className={discReport.primary} disabled={busy} onClick={() => void download()}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar PDF'}</button>
      </>}
    </header>
    {admin && <div className={`${discReport.toolbar} tw:flex tw:flex-wrap tw:items-center tw:gap-2.5`}>
      {row.company_id ? <label className="tw:inline-flex tw:items-center tw:gap-2">Ficha do colaborador <select className="tw:max-w-[17.5rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#e3d6cc] tw:bg-white tw:px-[.5625rem] tw:py-[.4375rem] tw:font-[Inter,sans-serif] tw:text-[.8125rem] tw:leading-[normal] tw:font-medium" disabled={saving} value={row.team_member_id || ''} onChange={(event) => void update({ team_member_id: event.target.value || null }, event.target.value ? 'Vinculado à ficha do colaborador.' : 'Vínculo com a ficha removido.')}><option value="">Não vinculado</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.work_email ? ` · ${member.work_email}` : ''}</option>)}</select></label> : <span className={`${discReport.note} tw:basis-full`}>Link livre: sem empresa vinculada, não aparece em ficha de colaborador.</span>}
      <span className={`${discReport.note} tw:basis-full`}>A matriz de papel (página 5) pode ser preenchida aqui mesmo: escolha o que a função pede em cada estilo. {row.email}</span>
      <button type="button" className={discReport.secondary} disabled={respondentBusy} onClick={() => void downloadRespondent()}><Download size={15} /> {respondentBusy ? 'Preparando…' : 'PDF do respondente'}</button>
    </div>}
    {hasInputs ? <>
      <main className={discReport.report} style={{ zoom }}>
        <EvaluatorReport result={row} team={team} base={base} signer={signer} editableRole onRoleChange={(roleProfile: RoleProfile) => void update({ role_profile: roleProfile }, 'Perfil da função salvo.')} />
      </main>
      <div className={discReport.capture} ref={captureRef} aria-hidden="true"><EvaluatorReport result={row} team={team} base={base} signer={signer} /></div>
    </> : <DiscReportNotice><p>Os dados históricos disponíveis não permitem reconstruir o relatório técnico.</p></DiscReportNotice>}
    {canRegenerate && <div className={discReport.capture} ref={respondentCapture} aria-hidden="true"><RespondentReport result={row} signer={signer} /></div>}
  </div>;
}
