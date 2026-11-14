/* Resultados individuais vinculados à ficha, disponíveis à CALI. */
import { Fragment } from 'react';
import { Link } from '../../../components/navigation/Link';
import { ExternalLink } from 'lucide-react';
import { useMemberDiscHistory } from '../hooks/useMemberDiscHistory';
import { STYLES, bandOf } from '../profileMethod';
import { STYLE_CONTENT } from '../profileContent';

export function TeamMemberProfiles({ memberId, admin }: { memberId: string; admin: boolean }) {
  const history = useMemberDiscHistory(memberId, admin);
  const rows = history.data;

  if (!admin) return <p className="tw:text-[.8125rem] tw:text-[#8c7e74]">Consulte os relatórios de gestão disponíveis para a sua empresa.</p>;
  if (history.isError) return <p className="tw:text-[.8125rem] tw:text-[#8c7e74]" role="alert">Não foi possível carregar o histórico de perfil comportamental.</p>;
  if (!rows) return <p className="tw:text-[.8125rem] tw:text-[#8c7e74]">Carregando…</p>;
  if (!rows.length) return <p className="tw:text-[.8125rem] tw:text-[#8c7e74]">Nenhum perfil comportamental vinculado a esta pessoa. Envie um link de empresa em Perfil comportamental para vincular pelo e-mail corporativo.</p>;
  return <div className="tw:flex tw:flex-col tw:gap-2.5">{rows.map((row) => {
    const p = STYLE_CONTENT[row.primary_style], s = STYLE_CONTENT[row.secondary_style];
    return <article className="tw:flex tw:flex-col tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:px-4 tw:py-3.5" key={row.id}>
      <header className="tw:flex tw:items-center tw:justify-between tw:gap-2.5 tw:[&_small]:text-[.6875rem] tw:[&_small]:text-[#8c7e74]"><div><strong className="tw:text-[.9375rem]" style={{ color: p.ink }}>{row.mixed ? `Perfil misto: ${p.name} e ${s.name}` : `${p.name}, com traço ${s.name}`}</strong><br /><small>{p.oneLiner}</small></div><small>{new Intl.DateTimeFormat('pt-BR').format(new Date(row.created_at))}</small></header>
      <div className="tw:grid tw:grid-cols-[5.625rem_1fr_2rem] tw:items-center tw:gap-x-2.5 tw:gap-y-1.5 tw:text-[.6875rem]">{STYLES.map((style) => <Fragment key={style}><span className="tw:font-semibold" style={{ color: STYLE_CONTENT[style].ink }}>{STYLE_CONTENT[style].name}</span><div className="tw:h-2 tw:overflow-hidden tw:rounded tw:bg-[#f3ece6]"><i className="tw:block tw:h-full" style={{ width: `${row.scores.natural[style].pct}%`, background: STYLE_CONTENT[style].color }} /></div><b title={bandOf(row.scores.natural[style].pct)}>{row.scores.natural[style].pct}</b></Fragment>)}</div>
      <footer className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <Link className="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-lg tw:bg-cali-brand tw:px-3 tw:py-2 tw:font-[Inter,sans-serif] tw:text-[.75rem] tw:leading-[normal] tw:font-semibold tw:text-white tw:no-underline" to={`/admin/perfil-comportamental/${row.id}`}><ExternalLink size={13} /> Abrir relatório</Link>
      </footer>
    </article>;
  })}</div>;
}
