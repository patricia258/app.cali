/* Relatório individual e recuperação de PDF disponíveis à CALI. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '../../components/navigation/Link';
import { useParams } from '../../hooks/useParams';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { anonPublicRpc, supabase } from '../../api/supabase';
import { EvaluatorReport, RespondentReport, type ProfileBase, type ProfileResultView, type ProfileSigner } from './components/ProfileReports';
import type { RoleProfile } from './components/ProfileCharts';
import { METHOD_VERSION, STYLES, type Style } from './profileMethod';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import './profile-pages.css';

type Row = ProfileResultView & { company_id: string | null; team_member_id: string | null; email: string; report_path: string | null; companies?: { display_name: string } | null };
const FIELDS = 'id,person_name,email,company_id,company_name,job_title,purpose,created_at,scores,primary_style,secondary_style,mixed,method_version,role_profile,team_member_id,report_path,companies(display_name),protocol';

function hasReportData(row: Row) {
  return Number.isFinite(Date.parse(row.created_at)) &&
    STYLES.includes(row.primary_style) && STYLES.includes(row.secondary_style) &&
    STYLES.every((style) => Number.isFinite(row.scores?.natural?.[style]?.pct) &&
      Number.isFinite(row.scores?.pressure?.[style]?.pct) && Number.isFinite(row.scores?.adaptation?.[style]));
}

export function ProfileEvaluatorPage({ role }: { role: 'admin' | 'client' }) {
  const { id = '' } = useParams();
  const admin = role === 'admin';
  const [row, setRow] = useState<Row | null>(null);
  const [team, setTeam] = useState<Array<{ primary_style: Style }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; work_email: string | null }>>([]);
  const [missing, setMissing] = useState(false);
  const [base, setBase] = useState<ProfileBase | null>(null);
  const [signer, setSigner] = useState<ProfileSigner | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [respondentBusy, setRespondentBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  const respondentCapture = useRef<HTMLDivElement>(null);
  const back = admin ? '/admin/perfil-comportamental' : '/cliente/equipe';

  useEffect(() => {
    document.title = 'Perfil Comportamental · CALI RH';
    if (!admin || !supabase) return;
    void supabase.schema('public').rpc('cali_profile_base').then(({ data }) => { if (data) setBase(data as ProfileBase); });
    void anonPublicRpc<ProfileSigner | null>('cali_profile_signer', {}).then(({ data }) => setSigner(data || null));
    void (async () => {
      const { data } = await supabase!.from('profile_results').select(FIELDS).eq('id', id).maybeSingle();
      if (!data) { setMissing(true); return; }
      const result = data as unknown as Row;
      setRow({ ...result, company_name: result.companies?.display_name || result.company_name });
      if (result.company_id) {
        const others = await supabase!.from('profile_results').select('primary_style').eq('company_id', result.company_id);
        setTeam((others.data || []) as Array<{ primary_style: Style }>);
        if (admin) {
          const people = await supabase!.from('team_members').select('id,full_name,work_email').eq('company_id', result.company_id).is('archived_at', null).order('full_name');
          setMembers((people.data || []) as typeof members);
        }
      }
    })();
  }, [id, admin]);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function update(patch: Partial<Pick<Row, 'team_member_id' | 'role_profile'>>, message: string) {
    if (!supabase || !row) return;
    const previous = row;
    setRow({ ...row, ...patch });
    const { error } = await supabase.from('profile_results').update(patch).eq('id', row.id);
    if (error) { setRow(previous); setNote(`Não foi possível salvar: ${error.message}`); return; }
    setNote(message);
  }

  async function download() {
    if (!row || !captureRef.current) return;
    setBusy(true);
    try { downloadBlob(await pagesToPdf(captureRef.current), `perfil-comportamental-avaliador-${fileSlug(row.person_name)}.pdf`); }
    finally { setBusy(false); }
  }

  async function downloadRespondent() {
    if (!admin || !row || !supabase) return;
    setRespondentBusy(true);
    setNote('');
    const name = `perfil-comportamental-cali-${fileSlug(row.person_name)}.pdf`;
    try {
      if (row.report_path) {
        const archived = await supabase.storage.from('cali-profiles').download(row.report_path);
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

  if (!admin || missing) return <div className="cali-profile-shell"><div className="cps-empty"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" /><h1>Relatório não disponível</h1><p>{admin ? 'Este resultado não existe mais.' : 'Relatórios individuais ficam com a CALI RH. Consulte o relatório de gestão na área da sua empresa.'}</p><Link className="cps-back" to={back}><ArrowLeft size={15} /> Voltar</Link></div></div>;
  if (!row) return <div className="cali-profile-shell"><div className="cps-empty"><span className="cps-spinner" aria-label="Carregando" /></div></div>;
  const hasInputs = hasReportData(row);
  const canRegenerate = hasInputs && row.method_version === METHOD_VERSION && Boolean(row.protocol);

  return <div className="cali-profile-shell">
    <header className="cps-bar">
      <Link className="cps-back" to={back}><ArrowLeft size={15} /> {admin ? 'Perfil comportamental' : 'Equipe'}</Link>
      <div className="cps-bar-status" role="status">{note}</div>
      {hasInputs && <>
        <button type="button" className="cps-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
        <button type="button" className="cps-primary" disabled={busy} onClick={() => void download()}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar PDF'}</button>
      </>}
    </header>
    {admin && <div className="cps-admin-tools">
      {row.company_id ? <label>Ficha do colaborador <select value={row.team_member_id || ''} onChange={(event) => void update({ team_member_id: event.target.value || null }, event.target.value ? 'Vinculado à ficha do colaborador.' : 'Vínculo com a ficha removido.')}><option value="">Não vinculado</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.work_email ? ` · ${member.work_email}` : ''}</option>)}</select></label> : <span className="cps-note">Link livre: sem empresa vinculada, não aparece em ficha de colaborador.</span>}
      <span className="cps-note">A matriz de papel (página 5) pode ser preenchida aqui mesmo: escolha o que a função pede em cada estilo. {row.email}</span>
      <button type="button" className="cps-secondary" disabled={respondentBusy} onClick={() => void downloadRespondent()}><Download size={15} /> {respondentBusy ? 'Preparando…' : 'PDF do respondente'}</button>
    </div>}
    {hasInputs ? <>
      <main className="cps-report" style={{ zoom }}>
        <EvaluatorReport result={row} team={team} base={base} signer={signer} editableRole onRoleChange={(roleProfile: RoleProfile) => void update({ role_profile: roleProfile }, 'Perfil da função salvo.')} />
      </main>
      <div className="cps-capture" ref={captureRef} aria-hidden="true"><EvaluatorReport result={row} team={team} base={base} signer={signer} /></div>
    </> : <div className="cps-empty"><p>Os dados históricos disponíveis não permitem reconstruir o relatório técnico.</p></div>}
    {canRegenerate && <div className="cps-capture" ref={respondentCapture} aria-hidden="true"><RespondentReport result={row} signer={signer} /></div>}
  </div>;
}
