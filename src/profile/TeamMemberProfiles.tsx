/* Ficha do colaborador (Equipe) — aba Perfil comportamental. Administradora vê todos os resultados vinculados e libera
   para o cliente; o cliente vê só os liberados (RLS). */
import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { STYLES, bandOf, type Scores, type Style } from './profileMethod';
import { STYLE_CONTENT } from './profileContent';
import './profile-admin.css';

type Row = { id: string; created_at: string; primary_style: Style; secondary_style: Style; mixed: boolean; client_visible: boolean; scores: Scores };

export function TeamMemberProfiles({ memberId, admin }: { memberId: string; admin: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.from('profile_results').select('id,created_at,primary_style,secondary_style,mixed,client_visible,scores').eq('team_member_id', memberId).order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setRows((data || []) as Row[]); });
    return () => { alive = false; };
  }, [memberId]);

  async function toggle(row: Row, visible: boolean) {
    if (!supabase) return;
    setRows((current) => (current || []).map((item) => item.id === row.id ? { ...item, client_visible: visible } : item));
    const { error } = await supabase.from('profile_results').update({ client_visible: visible }).eq('id', row.id);
    if (error) setRows((current) => (current || []).map((item) => item.id === row.id ? row : item));
  }

  if (!rows) return <p className="team-profile-empty">Carregando…</p>;
  if (!rows.length) return <p className="team-profile-empty">{admin ? 'Nenhum perfil comportamental vinculado a esta pessoa. Envie um link de empresa em Perfil comportamental: o resultado entra aqui pelo e-mail corporativo.' : 'Nenhum perfil comportamental disponível para esta pessoa.'}</p>;
  return <div className="team-profile-tab">{rows.map((row) => {
    const p = STYLE_CONTENT[row.primary_style], s = STYLE_CONTENT[row.secondary_style];
    return <article className="team-profile-card" key={row.id}>
      <header><div><strong style={{ color: p.color }}>{row.mixed ? `${p.name} e ${s.name}` : `${p.name} com traço ${s.name}`}</strong><br /><small>{p.oneLiner}</small></div><small>{new Intl.DateTimeFormat('pt-BR').format(new Date(row.created_at))}</small></header>
      <div className="tp-bars">{STYLES.map((style) => <Fragment key={style}><span style={{ color: STYLE_CONTENT[style].color, fontWeight: 600 }}>{STYLE_CONTENT[style].name}</span><div><i style={{ width: `${row.scores.natural[style].pct}%`, background: STYLE_CONTENT[style].color }} /></div><b title={bandOf(row.scores.natural[style].pct)}>{row.scores.natural[style].pct}</b></Fragment>)}</div>
      <footer>
        <Link to={`/${admin ? 'admin' : 'cliente'}/perfil-comportamental/${row.id}`}><ExternalLink size={13} /> Abrir relatório</Link>
        {admin && <label><input type="checkbox" checked={row.client_visible} onChange={(event) => void toggle(row, event.target.checked)} /> Disponibilizar para o cliente</label>}
      </footer>
    </article>;
  })}</div>;
}
