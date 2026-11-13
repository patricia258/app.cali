/* Área do Partner (equipe CALI) — /equipe. Moldura própria, simples, com as classes aprovadas do V2
   (.app > aside.sidebar + main.main > header.topbar + .content). Não usa os módulos automáticos da administradora.
   O Partner vê só as empresas e módulos atribuídos (regras no banco, migrações 20261012150000/170000/190000) e tudo que
   vai para o cliente passa pela administradora: horas e materiais entram em filas de aprovação. */
import { FilterSelect } from '../../components/ds/FilterSelect';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { LoadingState } from '../../components/ds/LoadingState';
import { CompanyTeamPage } from '../team/CompanyTeamPage';
import { MfaGate } from '../../auth/MfaGate';
import { TermsGate } from '../../auth/TermsGate';
import { StaffDocumentsPage } from '../documents/AdminDocumentsPage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Link } from '../../components/navigation/Link';
import { Navigate } from '../../components/navigation/Navigate';
import { useLocation } from '../../hooks/useLocation';
import { useNavigate } from '../../hooks/useNavigate';
import { Bell, BriefcaseBusiness, CalendarDays, Clock3, FileBarChart2, FolderOpen, LayoutDashboard, Megaphone, MessageCircleMore, Send, Users } from 'lucide-react';
import { readPartnerNotifications, readPartnerReports, readPartnerReviews, recordPartnerSession, type PartnerNotification, type PartnerReview } from '../../api/partner/operations';
import { endWorkspaceSession } from '../../api/access/session';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { type WelcomeStep } from '../../components/workspace/WelcomeTour';
import { WorkspaceShellLayout } from '../../components/workspace/WorkspaceShellLayout';
import { StaffNotices } from './notices/StaffNotices';
import { StaffTimerBar } from './timer/StaffTimerBar';
import { StaffMaterials } from './materials/StaffMaterials';
import { StaffDashboard } from './home/StaffDashboard';
import { usePartnerWorkspace } from './hooks/usePartnerWorkspace';
import type { PartnerWorkspace } from '../../api/partner/workspace';
import { StaffRecordsPage } from '../records/WorkspaceRecordsPage';
import { StaffProjectsPage } from '../projects/AdminProjectsPage';
import { StaffHoursPage } from '../hours/AdminHoursPage';
import { StaffCalendarPage } from '../calendar/AdminCalendarPage';
import '../../components/workspace/workspace-shell.generated.css';
import '../../components/workspace/operational.css';

const moment = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
const welcomeSteps: WelcomeStep[] = [
  { label: 'BOAS-VINDAS À EQUIPE CALI', title: 'Que bom ter você no time', text: 'Este é o seu espaço de trabalho na CALI. Veja em um minuto como ele funciona.' },
  { href: '/equipe', label: 'VISÃO GERAL', title: 'O resumo do seu dia', text: 'As empresas que você atende, as prioridades e a agenda.' },
  { href: '/equipe/projetos', label: 'PROJETOS', title: 'Entregas e prazos', text: 'Atualize a situação das entregas, registre etapas e converse com o cliente ou com a Patricia.' },
  { href: '/equipe/horas', label: 'HORAS', title: 'O tempo trabalhado', text: 'Use o cronômetro (play e pausar) no dia a dia. Lançamento manual pede justificativa e passa pela Patricia.' },
  { href: '/equipe/ocorrencias', label: 'OCORRÊNCIAS', title: 'Dúvidas e pedidos dos clientes', text: 'O cliente vê o seu nome na resposta.' },
  { href: '/equipe/aprovacoes', label: 'APROVAÇÕES', title: 'O que depende da Patricia', text: 'Criações, alterações, horas e o que vai ao cliente passam por ela antes. Aqui você acompanha a resposta.' },
  { label: 'TUDO PRONTO', title: 'Pode começar', text: 'Para rever esta apresentação, abra o menu do seu perfil.' },
];

function StaffBell({ me }: { me: PartnerWorkspace }) {
  const [items, setItems] = useState<PartnerNotification[]>([]); const [open, setOpen] = useState(false); const key = `cali:staff-bell-seen:${me.id}`; const [seen, setSeen] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  useEffect(() => {
    let active = true;
    const load = async () => {
      const rows = await readPartnerNotifications(me.id);
      if (!active || !rows) return;
      setItems((current) => {
        if (current.length && rows[0] && rows[0].id !== current[0]?.id) window.dispatchEvent(new Event('cali:staff-refresh'));
        return rows;
      });
    };
    void load();
    const timer = window.setInterval(load, 20000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [me.id]);
  const fresh = items.filter((item) => item.created_at > seen).length;
  const toggle = () => { const next = !open; setOpen(next); if (next && items[0]) { try { localStorage.setItem(key, items[0].created_at); } catch { /* segue */ } setSeen(items[0].created_at); } };
  return <span className="v2-staff-bell tw:relative tw:inline-flex"><button type="button" className={`tw:relative tw:grid tw:size-[2.92rem] tw:cursor-pointer tw:place-items-center tw:rounded-[.62rem] tw:border tw:border-solid tw:text-cali-brand ${fresh ? 'tw:border-[#e9c8cf] tw:bg-[#fbeef0]' : 'tw:border-[#e9dfd8] tw:bg-white'}`} onClick={toggle} aria-label={fresh ? `${fresh} avisos novos` : 'Avisos'} aria-expanded={open}><Bell size={17} />{fresh > 0 && <b className="tw:absolute tw:-top-[.46rem] tw:-right-[.46rem] tw:h-[1.31rem] tw:min-w-[1.31rem] tw:rounded-[.69rem] tw:bg-[#b7495d] tw:px-[.31rem] tw:text-center tw:text-[.77rem] tw:leading-[1.31rem] tw:text-white">{fresh}</b>}</button>
    {open && <div className="tw:absolute tw:top-[3.54rem] tw:right-0 tw:z-60 tw:flex tw:max-h-[60vh] tw:w-[min(26.15rem,86vw)] tw:flex-col tw:gap-[.46rem] tw:overflow-y-auto tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-[.92rem] tw:shadow-[0_1.38rem_4.62rem_#28172426] tw:[scrollbar-width:none] tw:motion-safe:animate-[v2-pop_.2s_ease-out_backwards]" role="menu"><strong className="tw:px-[.46rem] tw:pt-[.15rem] tw:pb-[.46rem] tw:text-[.85rem] tw:tracking-[.03rem] tw:text-[#8c7e74]">Avisos</strong>{items.length ? items.map((item) => <Link key={item.id} className={`tw:flex tw:flex-col tw:gap-[.23rem] tw:rounded-[.54rem] tw:px-[.77rem] tw:py-[.69rem] tw:text-[.92rem] tw:text-[#322f2c] tw:no-underline tw:hover:bg-[#faf6f2] ${item.notification_type === 'chat_mention' ? 'tw:border-0 tw:border-l-[.31rem] tw:border-solid tw:border-[#d9a514] tw:bg-[#fff8e6]' : ''}`} to={item.action_url && item.action_url.startsWith('/equipe') ? item.action_url : '/equipe'} onClick={() => setOpen(false)}><span className="tw:font-bold">{item.title}</span>{item.body && <small className="tw:text-[.85rem] tw:leading-[1.45] tw:text-[#655a55]">{item.body}</small>}<em className="tw:text-[.77rem] tw:text-[#96867c] tw:not-italic">{moment(item.created_at)}</em></Link>) : <p className="tw:m-0 tw:px-[.46rem] tw:py-[.62rem] tw:text-[.92rem] tw:text-[#8c7e74]">Nenhum aviso por enquanto.</p>}</div>}</span>;
}

function Frame({ me, children }: { me: PartnerWorkspace; children: ReactNode }) {
  const navigate = useNavigate(); const { pathname } = useLocation(); const has = (key: string) => me.modules.includes(key);
  /* A Visão geral usa a composição da administradora (.content > .ap-app), sem invólucro, para herdar as mesmas regras, inclusive no celular. */
  const plain = ['/equipe', '/equipe/ocorrencias', '/equipe/projetos', '/equipe/avisos', '/equipe/horas', '/equipe/calendario', '/equipe/documentos'].includes(pathname.replace(/\/$/, ''));
  const nav = ([['/equipe', 'Visão geral', LayoutDashboard, true], ['/equipe/pessoas', 'Equipe', Users, has('team')], ['/equipe/projetos', 'Projetos', BriefcaseBusiness, has('projects')], ['/equipe/horas', 'Horas', Clock3, has('hours')], ['/equipe/calendario', 'Calendário', CalendarDays, has('calendar')], ['/equipe/ocorrencias', 'Ocorrências', MessageCircleMore, has('records')], ['/equipe/documentos', 'Documentos', FolderOpen, has('documents')], ['/equipe/relatorios', 'Relatórios', FileBarChart2, has('reports')], ['/equipe/materiais', 'Materiais', FileBarChart2, has('reports') || has('proposals') || has('people_map')], ['/equipe/avisos', 'Avisos', Megaphone, has('notices')], ['/equipe/aprovacoes', 'Aprovações', Send, true]] satisfies [string, string, typeof Clock3, boolean][]).filter((item) => item[3]).map(([href, label, icon]) => ({ href, label, icon }));
  /* Entrada e saída ficam registradas para a administradora (função staff_log_session). */
  useEffect(() => { try { if (sessionStorage.getItem('cali:staff-session') === me.id) return; sessionStorage.setItem('cali:staff-session', me.id); } catch { /* segue */ } void recordPartnerSession('staff_session_started'); }, [me.id]);
  async function logout() { try { await recordPartnerSession('staff_session_ended'); sessionStorage.removeItem('cali:staff-session'); } catch { /* a saída não pode ficar presa ao registro */ } await endWorkspaceSession(); navigate('/login', { replace: true }); }
  /* Mesma moldura da administradora e do cliente (topo, busca, sino, menu do perfil com "Ver meu perfil" e "Sair"). */
  return <WorkspaceShellLayout role="partner" navigation={nav} extras={<StaffTimerBar me={me} />} notifications={<StaffBell me={me} />} onLogout={() => void logout()} welcomeSteps={welcomeSteps}>{plain ? children : <div className="v2-client-module tw:flex tw:flex-col tw:gap-[1.23rem] tw:[&>*]:my-0 tw:[&>.ap-app>.ap-content]:max-w-none tw:[&>.ap-app>.ap-content]:p-0">{children}</div>}</WorkspaceShellLayout>;
}

function Head({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="title-dot">.</span></h1><p>{text}</p></div>{action}</div>;
}
const CompanySelect = ({ me, value, onChange, all }: { me: PartnerWorkspace; value: string; onChange: (value: string) => void; all?: boolean }) => <FilterSelect className="tw:h-[3.08rem] tw:min-w-[15.38rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.85rem] tw:py-0 tw:text-[.85rem] tw:text-[#322f2c]" aria-label="Empresa" value={value} onChange={(event) => onChange(event.target.value)}>{all && <option value="">Todas as minhas empresas</option>}{!all && <option value="">Escolha a empresa</option>}{me.companies.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</FilterSelect>;

/* Consulta (somente leitura) dos módulos liberados. O banco só devolve o que é das empresas atribuídas. */
type BrowseRow = { id: string; company_id: string | null; title: string; sub: string; tag: string; when: string | null; href?: string };
type BrowseConfig = { eyebrow: string; title: string; text: string; empty: string; load: () => Promise<BrowseRow[] | null> };
const label = <T,>(map: Record<string, string>, value: T) => map[String(value || '')] || String(value || '—');
const STATUS: Record<string, string> = { not_started: 'Não iniciada', in_progress: 'Em andamento', internal_review: 'Revisão interna', client_review: 'Com o cliente', approved: 'Aprovada', adjustment_requested: 'Ajuste solicitado', cancelled: 'Cancelada', done: 'Concluída', draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado ao cliente', published: 'Publicado', archived: 'Arquivado', active: 'Ativa', leave: 'Afastada', terminated: 'Desligada', paused: 'Pausado', planning: 'Em planejamento' };
const reports: BrowseConfig = {
  eyebrow: 'EQUIPE CALI / RELATÓRIOS',
  title: 'Relatórios',
  text: 'Relatórios das suas empresas. Os já enviados ao cliente abrem na versão impressa ao clicar. Só a Patricia aprova e envia.',
  empty: 'Nenhum relatório nas suas empresas.',
  async load() {
    const rows = await readPartnerReports();
    return rows?.map((row) => ({
      id: row.id, company_id: row.company_id, title: row.title, sub: row.protocol || '',
      tag: label(STATUS, row.status), when: row.period_end,
      href: ['sent', 'published'].includes(row.status) ? `/equipe/relatorios/impressao/${row.id}` : undefined,
    })) ?? null;
  },
};
function PartnerReports({ me }: { me: PartnerWorkspace }) {
  const config = reports; const [rows, setRows] = useState<BrowseRow[] | null>(null); const [failed, setFailed] = useState(false); const [company, setCompany] = useState(''); const [query, setQuery] = useState('');
  useEffect(() => { let alive = true; setRows(null); setFailed(false); void config.load().then((data) => { if (!alive) return; if (data) setRows(data); else setFailed(true); }); return () => { alive = false; }; }, [me.id]);
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const text = query.trim().toLocaleLowerCase('pt-BR');
  const visible = (rows || []).filter((row) => (!company || row.company_id === company) && (!text || `${row.title} ${row.sub}`.toLocaleLowerCase('pt-BR').includes(text)));
  return <><Head eyebrow={config.eyebrow} title={config.title} text={config.text} />
    <div className="toolbar tw:flex tw:gap-[.77rem]"><CompanySelect me={me} value={company} onChange={setCompany} all /><input className="tw:h-[3.08rem] tw:max-w-[24.62rem] tw:min-w-0 tw:flex-1 tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[.92rem] tw:text-[.92rem] tw:text-[#322f2c]" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" /></div>
    {failed ? <InlineNotice>Não foi possível carregar. Recarregue a página; se continuar, fale com a Patricia.</InlineNotice> : !rows ? <LoadingState>Carregando…</LoadingState> : visible.length ? <div className="wf-records v2-staff-browse">{visible.map((row) => <div className={`wf-record-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto_8.46rem]! tw:items-center tw:gap-[1.08rem] tw:[@media(max-width:860px)]:grid-cols-[minmax(0,1fr)_auto]! ${row.href ? 'is-link tw:cursor-pointer tw:hover:bg-[#fbf7f4]!' : 'tw:cursor-default'}`} key={row.id} role={row.href ? 'link' : undefined} tabIndex={row.href ? 0 : undefined} onClick={() => { if (row.href) window.open(row.href, '_blank', 'noopener'); }}><div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem]"><strong className="tw:text-[.92rem] tw:text-[#322f2c]">{row.title}</strong><small className="tw:text-[.85rem] tw:text-[#8c7e74]">{[row.company_id ? companyName.get(row.company_id) : '', row.sub].filter(Boolean).join(' · ') || '—'}</small></div><span className="wf-tag">{row.tag}</span><small className="tw:text-[.85rem] tw:text-[#8c7e74] tw:[@media(max-width:860px)]:hidden">{row.when ? dayLabel(row.when) : '—'}</small></div>)}</div> : <div className="empty">{config.empty}</div>}
    <p className="soft-note">Tela de consulta. Você vê, mas não altera por aqui.</p></>;
}

/* Acompanhamento do que foi enviado para a Patricia. O envio acontece dentro de cada tela (entregável, ocorrência, horas,
   alteração em projeto); aqui a pessoa só acompanha a resposta. */
const KINDS: Record<string, string> = { deliverable: 'Entregável', report: 'Relatório', document: 'Documento', notice: 'Comunicado', other: 'Outro', record_close: 'Encerrar ocorrência', change: 'Alteração em projeto' };
function Reviews({ me }: { me: PartnerWorkspace }) {
  const [rows, setRows] = useState<PartnerReview[] | null>(null); const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  useEffect(() => {
    let active = true;
    void readPartnerReviews().then(({ reviews, submissions }) => {
      if (!active) return;
      const hours = submissions.map((row) => ({
        id: `h-${row.id}`, company_id: row.company_id, kind: 'hours',
        title: `${duration(row.minutes)} · ${row.description}`, note: null,
        status: row.status === 'rejected' ? 'returned' : row.status,
        decision_note: row.decision_note, created_at: row.created_at,
      }));
      setRows([...reviews, ...hours].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    });
    return () => { active = false; };
  }, [me.id]);
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const tone: Record<string, [string, string]> = { pending: ['tw:bg-[#fff4de] tw:text-[#9b6c21]', 'Aguardando'], approved: ['tw:bg-[#e6f6ec] tw:text-[#31805a]', 'Aprovado'], returned: ['tw:bg-[#fdecee] tw:text-[#b7495d]', 'Devolvido'] };
  const visible = (rows || []).filter((row) => filter === 'all' || row.status === 'pending'); const waiting = (rows || []).filter((row) => row.status === 'pending').length;
  return <><Head eyebrow="EQUIPE CALI / APROVAÇÕES" title="Aprovações" text="O que você enviou para a Patricia e o que ela respondeu." />
    <div className="toolbar tw:flex tw:gap-[.77rem]"><div className="wf-segments"><button type="button" className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>Aguardando ({waiting})</button><button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tudo</button></div></div>
    {!rows ? <LoadingState>Carregando…</LoadingState> : visible.length ? <div className="wf-records v2-staff-sent">{visible.map((row) => <div className="wf-record-row tw:cursor-default tw:grid-cols-[8.46rem_4.92rem_minmax(0,1fr)_auto]! tw:items-center tw:gap-[1.08rem] tw:[@media(max-width:860px)]:grid-cols-1!" key={row.id}><time className="tw:text-[.85rem] tw:text-[#8c7e74]">{moment(row.created_at)}</time><strong className="tw:text-[.92rem] tw:text-[#322f2c]">{row.kind === 'hours' ? 'Horas' : KINDS[row.kind] || row.kind}</strong><div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.23rem]"><strong className="tw:text-[.92rem] tw:text-[#322f2c]">{row.title}</strong><small className="tw:text-[.85rem] tw:text-[#8c7e74]">{[companyName.get(row.company_id) || 'Empresa', row.note, row.decision_note ? `Resposta: ${row.decision_note}` : ''].filter(Boolean).join(' · ')}</small></div><span className={`wf-tag ${tone[row.status]?.[0] || ''}`}>{tone[row.status]?.[1] || row.status}</span></div>)}</div> : <div className="empty">{filter === 'pending' ? 'Nada aguardando no momento.' : 'Você ainda não enviou nada para aprovação.'}</div>}</>;
}

const sectionModules = {
  '/': null,
  ocorrencias: 'records',
  calendario: 'calendar',
  horas: 'hours',
  documentos: 'documents',
  pessoas: 'team',
  relatorios: 'reports',
  materiais: null,
  projetos: 'projects',
  avisos: 'notices',
  aprovacoes: null,
} as const;

export type StaffSection = keyof typeof sectionModules;
const StaffContext = createContext<PartnerWorkspace | null>(null);

export function StaffWorkspaceSection({ section }: { section: StaffSection }) {
  const me = useContext(StaffContext);
  if (!me) return null;

  const module = sectionModules[section];
  if (module && !me.modules.includes(module)) return <Navigate to="/equipe" replace />;

  switch (section) {
    case '/': return <StaffDashboard me={me} />;
    case 'ocorrencias': return <StaffRecordsPage companies={me.companies.map((item) => ({
      id: item.id, name: item.display_name, logo: item.logo_workspace_url, logoFallback: item.logo_url,
    }))} />;
    case 'calendario': return <StaffCalendarPage />;
    case 'horas': return <StaffHoursPage companies={me.companies} />;
    case 'documentos': return <StaffDocumentsPage />;
    case 'pessoas': return <CompanyTeamPage role="client" staff />;
    case 'relatorios': return <PartnerReports me={me} />;
    case 'materiais': return ['reports','proposals','people_map'].some((key) => me.modules.includes(key)) ? <StaffMaterials /> : <Navigate to="/equipe" replace />;
    case 'projetos': return <StaffProjectsPage companies={me.companies} />;
    case 'avisos': return <StaffNotices me={me} />;
    case 'aprovacoes': return <Reviews me={me} />;
  }
}

function AuthorizedStaffWorkspace() {
  const { me, error } = usePartnerWorkspace();
  const { pathname } = useLocation();
  if (error) return <div className="v2-client-module v2-staff-fail"><InlineNotice>{error}</InlineNotice></div>;
  if (!me) return <div className="v2-client-module"><LoadingState>Carregando o seu espaço…</LoadingState></div>;
  // Relatório impresso abre em página cheia, sem o menu, como para a administradora e o cliente.
  if (pathname.startsWith('/equipe/relatorios/impressao/')) {
    if (!me.modules.includes('reports')) return <Navigate to="/equipe" replace />;
    return <Outlet />;
  }
  return (
    <Frame me={me}>
      <StaffContext.Provider value={me}>
        <Outlet />
      </StaffContext.Provider>
    </Frame>
  );
}

export function StaffWorkspace() {
  const auth = useWorkspaceAuth();
  if (!auth.ready) return <div className="v2-client-module"><LoadingState>Carregando…</LoadingState></div>;
  if (!auth.user || !auth.active) return <Navigate to="/login" replace />;
  if (auth.role !== 'partner') return <Navigate to={auth.role === 'admin' ? '/admin' : '/cliente'} replace />;
  return (
    <MfaGate>
      <TermsGate>
        <AuthorizedStaffWorkspace />
      </TermsGate>
    </MfaGate>
  );
}
