/* Relatório de gestão (/admin/perfil-comportamental/gestao/:linkId e /cliente/perfil-comportamental/gestao/:linkId).
   Administradora: preenche momento, setor e resultado perseguido (do diagnóstico) e libera para o cliente depois da
   devolutiva. Cliente: só abre o que foi liberado para a própria empresa (cali_workspace.profile_gestao). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GestaoReport, MOMENTS, SECTORS, type GestaoData } from './GestaoReport';
import { downloadBlob, fileSlug, pagesToPdf } from './profilePdf';
import './profile-pages.css';

export function GestaoPage({ role }: { role: 'admin' | 'client' }) {
  const { linkId = '' } = useParams();
  const admin = role === 'admin';
  const [data, setData] = useState<GestaoData | null>(null);
  const [missing, setMissing] = useState(false);
  const [fields, setFields] = useState({ moment: '', sector: '', goal: '' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const captureRef = useRef<HTMLDivElement>(null);
  const back = admin ? '/admin/perfil-comportamental' : '/cliente/equipe';

  async function load() {
    if (!supabase) return;
    const { data: payload } = await supabase.rpc('profile_gestao', { p_link: linkId });
    if (!payload) { setMissing(true); return; }
    const value = payload as GestaoData;
    setData(value);
    setFields({ moment: value.moment || '', sector: value.sector || '', goal: value.goal || '' });
  }
  useEffect(() => { document.title = 'Relatório de gestão · CALI RH'; void load(); }, [linkId]);

  useLayoutEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function save(patch: Record<string, string | null>, message: string) {
    if (!supabase || !data) return;
    const { error } = await supabase.from('profile_links').update(patch).eq('id', data.link_id);
    if (error) { setNote(`Não foi possível salvar: ${error.message}`); return; }
    setNote(message);
    await load();
  }

  async function download() {
    if (!data || !captureRef.current) return;
    setBusy(true);
    try { downloadBlob(await pagesToPdf(captureRef.current), `relatorio-gestao-${fileSlug(data.company || data.title)}.pdf`); }
    finally { setBusy(false); }
  }

  if (missing) return <div className="cali-profile-shell"><div className="cps-empty"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" /><h1>Relatório não disponível</h1><p>{admin ? 'Este link não existe mais.' : 'Este relatório ainda não foi liberado pela CALI RH.'}</p><Link className="cps-back" to={back}><ArrowLeft size={15} /> Voltar</Link></div></div>;
  if (!data) return <div className="cali-profile-shell"><div className="cps-empty"><span className="cps-spinner" aria-label="Carregando" /></div></div>;

  const ready = data.n >= 5 && Boolean(data.goal?.trim());
  const changed = fields.moment !== (data.moment || '') || fields.sector !== (data.sector || '') || fields.goal.trim() !== (data.goal || '');
  return <div className="cali-profile-shell">
    <header className="cps-bar">
      <Link className="cps-back" to={back}><ArrowLeft size={15} /> {admin ? 'Perfil comportamental' : 'Equipe'}</Link>
      <div className="cps-bar-status">{note}</div>
      <button type="button" className="cps-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
      <button type="button" className="cps-primary" disabled={busy} onClick={() => void download()}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar PDF'}</button>
    </header>
    {admin && <div className="cps-admin-tools cgp-tools">
      <label>Momento da empresa<select value={fields.moment} onChange={(event) => setFields({ ...fields, moment: event.target.value })}><option value="">Não informado</option>{Object.entries(MOMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Setor (vocabulário)<select value={fields.sector} onChange={(event) => setFields({ ...fields, sector: event.target.value })}><option value="">Não informado</option>{Object.entries(SECTORS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <label className="wide">Resultado que a empresa persegue<input value={fields.goal} maxLength={160} placeholder="Ex.: Abrir a segunda unidade sem perder a qualidade do atendimento" onChange={(event) => setFields({ ...fields, goal: event.target.value })} /></label>
      <div className="cgp-actions">
        <button type="button" className="cps-secondary" disabled={!changed} onClick={() => void save({ gestao_moment: fields.moment || null, gestao_sector: fields.sector || null, gestao_goal: fields.goal.trim() || null }, 'Personalização salva.')}>Salvar</button>
        {data.released_at
          ? <button type="button" className="cps-secondary" onClick={() => void save({ gestao_released_at: null }, 'Relatório retirado do cliente.')}>Liberado em {new Intl.DateTimeFormat('pt-BR').format(new Date(data.released_at))} · retirar</button>
          : <button type="button" className="cps-primary" disabled={!ready || changed} title={!ready ? 'Precisa de 5 respostas e do resultado que a empresa persegue' : changed ? 'Salve antes de liberar' : ''} onClick={() => void save({ gestao_released_at: new Date().toISOString() }, 'Liberado: o cliente vê este relatório em Equipe.')}>Liberar para o cliente</button>}
      </div>
      <span className="cps-note">O cliente só vê este relatório depois de liberado; nenhum nome aparece nele. Recomendação: liberar depois da sua devolutiva ao patrocinador.</span>
    </div>}
    <main className="cps-report" style={{ zoom }}><GestaoReport data={data} /></main>
    <div className="cps-capture" ref={captureRef} aria-hidden="true"><GestaoReport data={data} /></div>
  </div>;
}
