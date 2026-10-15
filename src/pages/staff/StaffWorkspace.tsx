/* Área do Partner (equipe CALI) — /equipe. Moldura própria, simples, com as classes aprovadas do V2
   (.app > aside.sidebar + main.main > header.topbar + .content). Não usa os módulos automáticos da administradora.
   O Partner vê só as empresas e módulos atribuídos (regras no banco, migrações 20261012150000/170000/190000) e tudo que
   vai para o cliente passa pela administradora: horas e materiais entram em filas de aprovação. */
import { ReportPrintPageV17 } from '../reports/ReportPrintPageV17';
import { CompanyTeamPage } from '../team/CompanyTeamPage';
import { MfaGate } from '../../auth/MfaGate';
import { TermsGate } from '../../auth/TermsGate';
import { StaffDocumentsPage } from '../admin/AdminDocumentsPageV4';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, Clock3, FileBarChart2, FolderOpen, LayoutDashboard, Megaphone, MessageCircleMore, Send, Pause, SendHorizontal, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { type WelcomeStep } from '../../v2/WelcomeTour';
import { WorkspaceShellV2 } from '../../v2/WorkspaceShellV2';
import { StaffNoticesPage } from '../notices/NoticesBoard';
import { StaffDashboard } from './StaffDashboard';
import { StaffRecordsPage } from '../records/WorkspaceRecordsPage';
import { StaffProjectsPage } from '../admin/AdminProjectsPageV3';
import { StaffHoursPage } from '../admin/AdminHoursPageV3';
import '../../styles/routes/calendar';
import { StaffCalendarPage } from '../admin/AdminCalendarPage';
import '../../v2/v2.generated.css';
import '../../styles/routes/records';
import '../../styles/routes/projects';
import '../../v2/operational.css';

type Company = { id: string; display_name: string; service_plan: string | null; monthly_hours_contracted: number | null; logo_workspace_url: string | null; logo_url: string | null };
type Me = { id: string; name: string; modules: string[]; companies: Company[] };
const moment = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
const welcomeSteps: WelcomeStep[] = [
  { label: 'BOAS-VINDAS À EQUIPE CALI', title: 'Que bom ter você no time', text: 'Este é o seu espaço de trabalho na CALI. Veja em um minuto como ele funciona.' },
  { href: '/equipe', label: 'VISÃO GERAL', title: 'O resumo do seu dia', text: 'As empresas que você atende, as prioridades e a agenda.' },
  { href: '/equipe/projetos', label: 'PROJETOS', title: 'Entregas e prazos', text: 'Atualize a situação das entregas, registre etapas e converse com o cliente ou com a Patricia.' },
  { href: '/equipe/horas', label: 'HORAS', title: 'O tempo trabalhado', text: 'Use o cronômetro (play e pausar) no dia a dia. Lançamento manual pede justificativa e passa pela Patricia.' },
  { href: '/equipe/ocorrencias', label: 'OCORRÊNCIAS', title: 'Dúvidas e pedidos dos clientes', text: 'O cliente vê o seu nome na resposta.' },
  { href: '/equipe/aprovacoes', label: 'APROVAÇÕES', title: 'O que depende da Patricia', text: 'Criações, alterações, horas e o que vai ao cliente passam por ela antes. Aqui você acompanha a resposta.' },
  { label: 'TUDO PRONTO', title: 'Pode começar', text: 'Para rever esta apresentação, abra o menu do seu perfil.' },
];

function useMe() {
  const { user } = useWorkspaceAuth(); const [me, setMe] = useState<Me | null>(null); const [error, setError] = useState('');
  useEffect(() => { let alive = true; (async () => {
    if (!supabase || !user) return;
    const [staff, companies] = await Promise.all([supabase.from('staff_members').select('full_name,modules').eq('user_id', user.id).limit(1), supabase.rpc('partner_companies')]);
    if (!alive) return;
    if (staff.error || companies.error || !(staff.data || []).length) { setError('Não foi possível carregar o seu acesso. Recarregue a página; se continuar, fale com a Patricia.'); return; }
    setMe({ id: user.id, name: (staff.data as any)[0].full_name, modules: (staff.data as any)[0].modules || [], companies: (companies.data || []) as Company[] });
  })(); return () => { alive = false; }; }, [user?.id]);
  return { me, error };
}

type Notice = { id: string; title: string; body: string | null; action_url: string | null; created_at: string };
// Cronômetro ligado, sempre à vista na barra do topo (como o da administradora). Pausar grava a sessão direto no extrato; a tarefa continua aberta.
function StaffTimerBar({ me }: { me: Me }) {
  const [timers, setTimers] = useState<{ id: string; company_id: string; started_at: string; paused_seconds: number | null; description: string | null }[]>([]);
  const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState('');
  const load = async () => { if (!supabase) return; const result = await supabase.from('work_timers').select('id,company_id,started_at,paused_seconds,description').eq('user_id', me.id).eq('status', 'active').order('started_at'); if (!result.error) setTimers((result.data as any) || []); };
  useEffect(() => { void load(); const refresh = window.setInterval(() => void load(), 8000); const tick = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(refresh); window.clearInterval(tick); }; }, [me.id]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4200); return () => window.clearTimeout(timer); }, [notice]);
  const stop = async (id: string) => { if (!supabase) return; setBusy(id); const result = await supabase.rpc('partner_stop_timer', { p_timer_id: id }); setBusy(''); setNotice(result.error ? 'Não foi possível pausar o cronômetro. Tente de novo.' : (result.data as any)?.discarded ? 'Cronômetro descartado: menos de 30 segundos.' : 'Sessão registrada. Dê play para continuar depois.'); await load(); window.dispatchEvent(new Event('cali-staff-timer-changed')); };
  const clock = (timer: { started_at: string; paused_seconds: number | null }) => { const total = Math.max(0, Math.floor((now - new Date(timer.started_at).getTime()) / 1000) - (timer.paused_seconds || 0)); return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };
  return <>{timers.length > 0 && <div className="v2-staff-timers" aria-label="Cronômetros ligados">{timers.map((timer) => <article key={timer.id} className="v2-staff-timer"><Clock3 size={15} /><div><strong>{clock(timer)}</strong><small title={timer.description || ''}>{(timer.description || '').split(' · ').pop() || me.companies.find((item) => item.id === timer.company_id)?.display_name || 'Atuação'}</small></div><button type="button" disabled={busy === timer.id} onClick={() => void stop(timer.id)}><Pause size={12} /> Pausar</button></article>)}</div>}{notice && <div className="inline-notice success v2-toast" role="status"><span>{notice}</span></div>}</>;
}
function StaffBell({ me }: { me: Me }) {
  const [items, setItems] = useState<Notice[]>([]); const [open, setOpen] = useState(false); const key = `cali:staff-bell-seen:${me.id}`; const [seen, setSeen] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  useEffect(() => { let alive = true; const load = async () => { if (!supabase) return; const result = await supabase.from('notifications').select('id,title,body,action_url,created_at,notification_type').eq('user_id', me.id).order('created_at', { ascending: false }).limit(15); if (alive && !result.error) { const rows = (result.data || []) as Notice[]; setItems((current) => { if (current.length && rows[0] && rows[0].id !== current[0]?.id) window.dispatchEvent(new Event('cali:staff-refresh')); return rows; }); } }; void load(); const timer = window.setInterval(load, 20000); const onFocus = () => void load(); window.addEventListener('focus', onFocus); return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); }; }, [me.id]);
  const fresh = items.filter((item) => item.created_at > seen).length;
  const toggle = () => { const next = !open; setOpen(next); if (next && items[0]) { try { localStorage.setItem(key, items[0].created_at); } catch { /* segue */ } setSeen(items[0].created_at); } };
  return <span className="v2-staff-bell"><button type="button" className={'notification-button ' + (fresh ? 'has-new' : '')} onClick={toggle} aria-label={fresh ? `${fresh} avisos novos` : 'Avisos'} aria-expanded={open}><Bell size={17} />{fresh > 0 && <b>{fresh}</b>}</button>
    {open && <div className="v2-staff-bell-list" role="menu"><strong>Avisos</strong>{items.length ? items.map((item) => <Link key={item.id} className={(item as any).notification_type === 'chat_mention' ? 'is-mention' : undefined} to={item.action_url && item.action_url.startsWith('/equipe') ? item.action_url : '/equipe'} onClick={() => setOpen(false)}><span>{item.title}</span>{item.body && <small>{item.body}</small>}<em>{moment(item.created_at)}</em></Link>) : <p>Nenhum aviso por enquanto.</p>}</div>}</span>;
}

function Frame({ me, children }: { me: Me; children: ReactNode }) {
  const navigate = useNavigate(); const { pathname } = useLocation(); const has = (key: string) => me.modules.includes(key);
  /* A Visão geral usa a composição da administradora (.content > .ap-app), sem invólucro, para herdar as mesmas regras, inclusive no celular. */
  const plain = ['/equipe', '/equipe/ocorrencias', '/equipe/projetos', '/equipe/avisos', '/equipe/horas', '/equipe/calendario', '/equipe/documentos'].includes(pathname.replace(/\/$/, ''));
  const nav = ([['/equipe', 'Visão geral', LayoutDashboard, true], ['/equipe/pessoas', 'Equipe', Users, has('team')], ['/equipe/projetos', 'Projetos', BriefcaseBusiness, has('projects')], ['/equipe/horas', 'Horas', Clock3, has('hours')], ['/equipe/calendario', 'Calendário', CalendarDays, has('calendar')], ['/equipe/ocorrencias', 'Ocorrências', MessageCircleMore, has('records')], ['/equipe/documentos', 'Documentos', FolderOpen, has('documents')], ['/equipe/relatorios', 'Relatórios', FileBarChart2, has('reports')], ['/equipe/avisos', 'Avisos', Megaphone, has('notices')], ['/equipe/aprovacoes', 'Aprovações', Send, true]] as [string, string, typeof Clock3, boolean][]).filter((item) => item[3]).map(([href, label, icon]) => ({ href, label, icon }));
  /* Entrada e saída ficam registradas para a administradora (função staff_log_session). */
  useEffect(() => { try { if (sessionStorage.getItem('cali:staff-session') === me.id) return; sessionStorage.setItem('cali:staff-session', me.id); } catch { /* segue */ } void supabase?.rpc('staff_log_session', { p_event: 'staff_session_started' }); }, [me.id]);
  async function logout() { try { await supabase?.rpc('staff_log_session', { p_event: 'staff_session_ended' }); sessionStorage.removeItem('cali:staff-session'); } catch { /* a saída não pode ficar presa ao registro */ } await supabase?.auth.signOut(); navigate('/login', { replace: true }); }
  /* Mesma moldura da administradora e do cliente (topo, busca, sino, menu do perfil com "Ver meu perfil" e "Sair"). */
  return <WorkspaceShellV2 role="partner" navigation={nav} extras={<StaffTimerBar me={me} />} notifications={<StaffBell me={me} />} bridges={null} onLogout={() => void logout()} welcomeSteps={welcomeSteps}>{plain ? children : <div className="v2-client-module v2-staff-area">{children}</div>}</WorkspaceShellV2>;
}

function Head({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="title-dot">.</span></h1><p>{text}</p></div>{action}</div>;
}
const CompanySelect = ({ me, value, onChange, all }: { me: Me; value: string; onChange: (value: string) => void; all?: boolean }) => <select className="wf-record-filter" aria-label="Empresa" value={value} onChange={(event) => onChange(event.target.value)}>{all && <option value="">Todas as minhas empresas</option>}{!all && <option value="">Escolha a empresa</option>}{me.companies.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>;

/* Consulta (somente leitura) dos módulos liberados. O banco só devolve o que é das empresas atribuídas. */
type BrowseRow = { id: string; company_id: string | null; title: string; sub: string; tag: string; when: string | null };
type BrowseConfig = { eyebrow: string; title: string; text: string; empty: string; load: () => Promise<BrowseRow[] | null> };
const label = (map: Record<string, string>, value: unknown) => map[String(value || '')] || String(value || '—');
const STATUS: Record<string, string> = { not_started: 'Não iniciada', in_progress: 'Em andamento', internal_review: 'Revisão interna', client_review: 'Com o cliente', approved: 'Aprovada', adjustment_requested: 'Ajuste solicitado', cancelled: 'Cancelada', done: 'Concluída', draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado ao cliente', published: 'Publicado', archived: 'Arquivado', active: 'Ativa', leave: 'Afastada', terminated: 'Desligada', paused: 'Pausado', planning: 'Em planejamento' };
const browse: Record<string, BrowseConfig> = {
  projetos: { eyebrow: 'EQUIPE CALI / PROJETOS', title: 'Projetos e entregas', text: 'As entregas das suas empresas, com situação e prazo. Para enviar uma entrega ao cliente, use “Enviar para aprovação”.', empty: 'Nenhuma entrega nas suas empresas.', load: async () => { const result = await supabase!.from('deliverables').select('id,company_id,title,protocol,status,due_at,workstream').is('cancelled_at', null).order('due_at', { ascending: true, nullsFirst: false }).limit(300); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.workstream].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.due_at })); } },
  calendario: { eyebrow: 'EQUIPE CALI / CALENDÁRIO', title: 'Calendário', text: 'Compromissos das suas empresas a partir de hoje.', empty: 'Nenhum compromisso marcado nas suas empresas.', load: async () => { const result = await supabase!.from('events').select('id,company_id,title,starts_at,mode,event_type,protocol').is('cancelled_at', null).gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at').limit(200); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.mode].filter(Boolean).join(' · '), tag: label({ meeting: 'Reunião', visit: 'Visita', onsite: 'Visita', deadline: 'Prazo', delivery: 'Entrega', training: 'Treinamento', holiday: 'Feriado', other: 'Compromisso' }, row.event_type || 'other'), when: row.starts_at })); } },
  documentos: { eyebrow: 'EQUIPE CALI / DOCUMENTOS', title: 'Documentos', text: 'Documentos das suas empresas, do mais recente ao mais antigo.', empty: 'Nenhum documento nas suas empresas.', load: async () => { const result = await supabase!.from('files').select('id,company_id,title,protocol,status,version_label,document_kind,updated_at').order('updated_at', { ascending: false }).limit(300); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.document_kind, row.version_label].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.updated_at })); } },
  relatorios: { eyebrow: 'EQUIPE CALI / RELATÓRIOS', title: 'Relatórios', text: 'Relatórios das suas empresas. Os já enviados ao cliente abrem na versão impressa ao clicar. Só a Patricia aprova e envia.', empty: 'Nenhum relatório nas suas empresas.', load: async () => { const result = await supabase!.from('reports').select('id,company_id,title,protocol,status,period_end').order('period_end', { ascending: false }).limit(200); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: String(row.protocol || ''), tag: label(STATUS, row.status), when: row.period_end, href: ['sent', 'published'].includes(row.status) ? `/equipe/relatorios/impressao/${row.id}` : undefined })); } },
  avisos: { eyebrow: 'EQUIPE CALI / AVISOS', title: 'Avisos', text: 'Comunicados publicados para as suas empresas.', empty: 'Nenhum comunicado publicado.', load: async () => { const result = await supabase!.from('notices').select('id,title,protocol,category,status,published_at').order('published_at', { ascending: false }).limit(100); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: null, title: row.title, sub: String(row.protocol || ''), tag: label({ feriado: 'Feriado', atendimento: 'Atendimento', comunicado: 'Comunicado' }, row.category), when: row.published_at })); } },
  pessoas: { eyebrow: 'EQUIPE CALI / EQUIPE DO CLIENTE', title: 'Equipe do cliente', text: 'O quadro de pessoas das suas empresas. Dados salariais não aparecem aqui.', empty: 'Nenhuma pessoa cadastrada nas suas empresas.', load: async () => { const result = await supabase!.from('team_members').select('id,company_id,full_name,job_title,department,status,admission_date').is('archived_at', null).order('full_name').limit(1000); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.full_name, sub: [row.job_title, row.department].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.admission_date })); } },
};
function StaffNotices({ me }: { me: Me }) {
  const [open, setOpen] = useState(false); const [version, setVersion] = useState(0); const [draft, setDraft] = useState({ category: 'comunicado', title: '', body: '', date: '', companies: [] as string[] }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; if (!draft.companies.length) { setError('Escolha pelo menos uma empresa.'); return; } if (!draft.title.trim() || !draft.body.trim()) { setError('Escreva o título e a mensagem.'); return; }
    setBusy(true); setError(''); const result = await supabase.rpc('partner_publish_notice', { p_category: draft.category, p_title: draft.title.trim(), p_body: draft.body.trim(), p_companies: draft.companies, p_date: draft.date || null, p_time: null, p_coverage: null }); setBusy(false);
    if (result.error) { setError('Não foi possível publicar. Tente de novo.'); return; } setDraft({ category: 'comunicado', title: '', body: '', date: '', companies: [] }); setOpen(false); setDone('Comunicado publicado. As empresas escolhidas foram avisadas e a Patricia também.'); setVersion((value) => value + 1); }
  /* Mesma composição da página de Avisos da administradora (.content > .ap-app.v2-admin-notices > .ap-content). */
  return <div className="ap-app v2-admin-page v2-admin-notices"><div className="ap-content">{done && <div className="inline-notice success v2-toast" role="status"><span>{done}</span></div>}
    <StaffNoticesPage key={version} onCompose={() => { setDone(''); setError(''); setOpen(true); }} />
    {open && <div className="wf-overlay" onMouseDown={() => setOpen(false)}><form className="wf-modal v2-staff-form" role="dialog" aria-modal="true" aria-label="Novo comunicado" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>QUADRO DE AVISOS · EQUIPE CALI</small><h2>Novo comunicado</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body">
        <p className="v2-staff-summary">Sai em nome da CALI e chega no sino e no e-mail das empresas escolhidas. Não passa por aprovação: revise antes de publicar.</p>
        <div className="v2-staff-fields"><label>Tipo<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="comunicado">Comunicado</option><option value="atendimento">Atendimento</option><option value="feriado">Feriado</option></select></label><label>Data do aviso (opcional)<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label></div>
        <div className="v2-staff-fields one"><label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /></label><label>Mensagem<textarea rows={4} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label></div>
        <fieldset><legend>Para quais empresas</legend><div className="v2-staff-checks">{me.companies.map((item) => <label key={item.id}><input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft, companies: draft.companies.includes(item.id) ? draft.companies.filter((id) => id !== item.id) : [...draft.companies, item.id] })} /><span>{item.display_name}</span></label>)}</div></fieldset>
        {error && <div className="inline-notice v2-staff-error" role="alert">{error}</div>}
      </div>
      <footer><button type="button" className="wf-secondary" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="wf-primary" disabled={busy}>{busy ? 'Publicando…' : 'Publicar comunicado'}</button></footer>
    </form></div>}</div></div>;
}

function Browse({ me, kind }: { me: Me; kind: string }) {
  const config = browse[kind]; const [rows, setRows] = useState<BrowseRow[] | null>(null); const [failed, setFailed] = useState(false); const [company, setCompany] = useState(''); const [query, setQuery] = useState('');
  useEffect(() => { let alive = true; setRows(null); setFailed(false); void config.load().then((data) => { if (!alive) return; if (data) setRows(data); else setFailed(true); }); return () => { alive = false; }; }, [kind]);
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const text = query.trim().toLocaleLowerCase('pt-BR');
  const visible = (rows || []).filter((row) => (!company || row.company_id === company) && (!text || `${row.title} ${row.sub}`.toLocaleLowerCase('pt-BR').includes(text)));
  return <><Head eyebrow={config.eyebrow} title={config.title} text={config.text} />
    <div className="toolbar"><CompanySelect me={me} value={company} onChange={setCompany} all /><input className="v2-staff-search" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" /></div>
    {failed ? <div className="inline-notice">Não foi possível carregar. Recarregue a página; se continuar, fale com a Patricia.</div> : !rows ? <div className="data-loading">Carregando…</div> : visible.length ? <div className="wf-records v2-staff-browse">{visible.map((row) => <div className={`wf-record-row${(row as any).href ? ' is-link' : ''}`} key={row.id} role={(row as any).href ? 'link' : undefined} tabIndex={(row as any).href ? 0 : undefined} onClick={() => { if ((row as any).href) window.open((row as any).href, '_blank', 'noopener'); }}><div><strong>{row.title}</strong><small>{[row.company_id ? companyName.get(row.company_id) : '', row.sub].filter(Boolean).join(' · ') || '—'}</small></div><span className="wf-tag">{row.tag}</span><small>{row.when ? dayLabel(row.when) : '—'}</small></div>)}</div> : <div className="empty">{config.empty}</div>}
    <p className="soft-note">{kind === 'avisos' ? 'Você publica comunicados para as suas empresas; os já publicados aparecem na lista.' : 'Tela de consulta. Você vê, mas não altera por aqui.'}</p></>;
}

/* Acompanhamento do que foi enviado para a Patricia. O envio acontece dentro de cada tela (entregável, ocorrência, horas,
   alteração em projeto); aqui a pessoa só acompanha a resposta. */
type ReviewRow = { id: string; company_id: string; kind: string; title: string; note: string | null; status: string; decision_note: string | null; created_at: string };
const KINDS: Record<string, string> = { deliverable: 'Entregável', report: 'Relatório', document: 'Documento', notice: 'Comunicado', other: 'Outro', record_close: 'Encerrar ocorrência', change: 'Alteração em projeto' };
function Reviews({ me }: { me: Me }) {
  const [rows, setRows] = useState<ReviewRow[] | null>(null); const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  useEffect(() => { void (async () => { if (!supabase) return; const [reviews, hours] = await Promise.all([
    supabase.from('staff_review_requests').select('id,company_id,kind,title,note,status,decision_note,created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('staff_hour_submissions').select('id,company_id,minutes,description,status,decision_note,created_at').order('created_at', { ascending: false }).limit(200)]);
    setRows([...((reviews.data || []) as ReviewRow[]), ...((hours.data || []) as any[]).map((row) => ({ id: `h-${row.id}`, company_id: row.company_id, kind: 'hours', title: `${duration(row.minutes)} · ${row.description}`, note: null, status: row.status === 'rejected' ? 'returned' : row.status, decision_note: row.decision_note, created_at: row.created_at }))].sort((a, b) => b.created_at.localeCompare(a.created_at))); })(); }, []);
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const tone: Record<string, [string, string]> = { pending: ['wait', 'Aguardando'], approved: ['ok', 'Aprovado'], returned: ['bad', 'Devolvido'] };
  const visible = (rows || []).filter((row) => filter === 'all' || row.status === 'pending'); const waiting = (rows || []).filter((row) => row.status === 'pending').length;
  return <><Head eyebrow="EQUIPE CALI / APROVAÇÕES" title="Aprovações" text="O que você enviou para a Patricia e o que ela respondeu." />
    <div className="toolbar"><div className="wf-segments"><button type="button" className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>Aguardando ({waiting})</button><button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tudo</button></div></div>
    {!rows ? <div className="data-loading">Carregando…</div> : visible.length ? <div className="wf-records v2-staff-sent">{visible.map((row) => <div className="wf-record-row" key={row.id}><time>{moment(row.created_at)}</time><strong>{row.kind === 'hours' ? 'Horas' : KINDS[row.kind] || row.kind}</strong><div><strong>{row.title}</strong><small>{[companyName.get(row.company_id) || 'Empresa', row.note, row.decision_note ? `Resposta: ${row.decision_note}` : ''].filter(Boolean).join(' · ')}</small></div><span className={`wf-tag ${tone[row.status]?.[0] || ''}`}>{tone[row.status]?.[1] || row.status}</span></div>)}</div> : <div className="empty">{filter === 'pending' ? 'Nada aguardando no momento.' : 'Você ainda não enviou nada para aprovação.'}</div>}</>;
}

export function StaffWorkspace() {
  const auth = useWorkspaceAuth(); const { me, error } = useMe();
  if (!auth.ready) return <div className="v2-client-module"><div className="data-loading">Carregando…</div></div>;
  if (!auth.user || !auth.active) return <Navigate to="/login" replace />;
  if (auth.role !== 'partner') return <Navigate to={auth.role === 'admin' ? '/admin' : '/cliente'} replace />;
  if (error) return <div className="v2-client-module v2-staff-fail"><div className="inline-notice">{error}</div></div>;
  if (!me) return <div className="v2-client-module"><div className="data-loading">Carregando o seu espaço…</div></div>;
  // Relatório impresso abre em página cheia, sem o menu, como para a administradora e o cliente.
  if (location.pathname.startsWith('/equipe/relatorios/impressao/')) return <MfaGate><Routes><Route path="relatorios/impressao/:reportId" element={<ReportPrintPageV17 role="staff" />} /></Routes></MfaGate>;
  return <MfaGate><TermsGate><Frame me={me}><Routes>
    <Route index element={<StaffDashboard me={me} />} />
    <Route path="ocorrencias" element={me.modules.includes('records') ? <StaffRecordsPage companies={me.companies.map((item) => ({ id: item.id, name: item.display_name, logo: item.logo_workspace_url, logoFallback: item.logo_url }))} /> : <Navigate to="/equipe" replace />} />
    <Route path="calendario" element={me.modules.includes('calendar') ? <StaffCalendarPage /> : <Navigate to="/equipe" replace />} />
    <Route path="horas" element={me.modules.includes('hours') ? <StaffHoursPage companies={me.companies} /> : <Navigate to="/equipe" replace />} />
    <Route path="documentos" element={me.modules.includes('documents') ? <StaffDocumentsPage /> : <Navigate to="/equipe" replace />} />
    <Route path="pessoas" element={me.modules.includes('team') ? <CompanyTeamPage role="client" staff /> : <Navigate to="/equipe" replace />} />
    {([['relatorios', 'reports']] as [string, string][]).map(([path, module]) => <Route key={path} path={path} element={me.modules.includes(module) ? <Browse me={me} kind={path} /> : <Navigate to="/equipe" replace />} />)}
    <Route path="projetos" element={me.modules.includes('projects') ? <StaffProjectsPage companies={me.companies} /> : <Navigate to="/equipe" replace />} />
    <Route path="avisos" element={me.modules.includes('notices') ? <StaffNotices me={me} /> : <Navigate to="/equipe" replace />} />
    <Route path="aprovacoes" element={<Reviews me={me} />} />
    <Route path="*" element={<Navigate to="/equipe" replace />} />
  </Routes></Frame></TermsGate></MfaGate>;
}
