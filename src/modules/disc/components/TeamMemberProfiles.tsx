/* Resultados individuais vinculados à ficha, disponíveis à CALI. */
import { Fragment, useEffect, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { ExternalLink } from 'lucide-react';
import { readMemberDiscHistory } from '../../../api/disc/reports';
import { STYLES, bandOf, type Scores, type Style } from '../profileMethod';
import { STYLE_CONTENT } from '../profileContent';
import '../../admin/disc/profile-admin.css';

type Row = { id: string; created_at: string; primary_style: Style; secondary_style: Style; mixed: boolean; scores: Scores };

export function TeamMemberProfiles({ memberId, admin }: { memberId: string; admin: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!admin) return;
    let alive = true;
    void readMemberDiscHistory(memberId).then((data) => { if (alive) setRows(data as Row[]); });
    return () => { alive = false; };
  }, [admin, memberId]);

  if (!admin) return <p className="team-profile-empty">Consulte os relatórios de gestão disponíveis para a sua empresa.</p>;
  if (!rows) return <p className="team-profile-empty">Carregando…</p>;
  if (!rows.length) return <p className="team-profile-empty">Nenhum perfil comportamental vinculado a esta pessoa. Envie um link de empresa em Perfil comportamental para vincular pelo e-mail corporativo.</p>;
  return <div className="team-profile-tab">{rows.map((row) => {
    const p = STYLE_CONTENT[row.primary_style], s = STYLE_CONTENT[row.secondary_style];
    return <article className="team-profile-card" key={row.id}>
      <header><div><strong style={{ color: p.ink }}>{row.mixed ? `Perfil misto: ${p.name} e ${s.name}` : `${p.name}, com traço ${s.name}`}</strong><br /><small>{p.oneLiner}</small></div><small>{new Intl.DateTimeFormat('pt-BR').format(new Date(row.created_at))}</small></header>
      <div className="tp-bars">{STYLES.map((style) => <Fragment key={style}><span style={{ color: STYLE_CONTENT[style].ink, fontWeight: 600 }}>{STYLE_CONTENT[style].name}</span><div><i style={{ width: `${row.scores.natural[style].pct}%`, background: STYLE_CONTENT[style].color }} /></div><b title={bandOf(row.scores.natural[style].pct)}>{row.scores.natural[style].pct}</b></Fragment>)}</div>
      <footer>
        <Link to={`/admin/perfil-comportamental/${row.id}`}><ExternalLink size={13} /> Abrir relatório</Link>
      </footer>
    </article>;
  })}</div>;
}
