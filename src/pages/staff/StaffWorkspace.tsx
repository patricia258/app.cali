/* Área do Partner (equipe CALI) — /equipe. Moldura própria, simples, com as classes aprovadas do V2
   (.app > aside.sidebar + main.main > header.topbar + .content). Não usa os módulos automáticos da administradora.
   O Partner vê só as empresas e módulos atribuídos (regras no banco, migrações 20261012150000/170000/190000) e tudo que
   vai para o cliente passa pela administradora: horas e materiais entram em filas de aprovação. */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Clock3, FileBarChart2, FolderOpen, LayoutDashboard, LogOut, Megaphone, MessageCircleMore, Send, SendHorizontal, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { WelcomeTour, type WelcomeStep } from '../../v2/WelcomeTour';
import '../../v2/v2.generated.css';
import '../../v2/operational.css';

type Company = { id: string; display_name: string; service_plan: string | null; monthly_hours_contracted: number | null; logo_workspace_url: string | null; logo_url: string | null };
type Me = { id: string; name: string; modules: string[]; companies: Company[] };
const MODULES: Record<string, string> = { records: 'Ocorrências', projects: 'Projetos e entregas', hours: 'Horas', calendar: 'Calendário', documents: 'Documentos', reports: 'Relatórios', notices: 'Avisos', team: 'Equipe do cliente', people_map: 'Mapa de People' };
const PLAN: Record<string, string> = { partner: 'CALI Partner', full: 'CALI Full', build: 'CALI Build' };
const moment = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
const welcomeSteps: WelcomeStep[] = [
  { label: 'BOAS-VINDAS À EQUIPE CALI', title: 'Que bom ter você no time', text: 'Este é o seu espaço de trabalho na CALI. Aqui você atende as empresas que foram atribuídas a você, sempre em nome da CALI.' },
  { href: '/equipe', label: 'INÍCIO', title: 'Suas empresas e seus módulos', text: 'Mostra as empresas que você atende e o que está liberado para você em cada uma.' },
  { href: '/equipe/ocorrencias', label: 'OCORRÊNCIAS', title: 'Responder dúvidas e pedidos', text: 'As conversas das suas empresas. O cliente vê o seu nome na resposta, então escreva com o cuidado de quem fala pela CALI.' },
  { href: '/equipe/horas', label: 'HORAS', title: 'Registrar o tempo trabalhado', text: 'Lance as horas com uma justificativa. Elas só entram no relatório do cliente depois que a Patricia aprovar.' },
  { href: '/equipe/aprovacoes', label: 'ENVIAR PARA APROVAÇÃO', title: 'Tudo que vai ao cliente passa pela Patricia', text: 'Relatório, entrega ou documento pronto? Envie por aqui. Você acompanha se foi aprovado ou devolvido com orientação.' },
  { label: 'TUDO PRONTO', title: 'Pode começar', text: 'Em caso de dúvida sobre o que pode ou não fazer, fale com a Patricia antes de responder ao cliente.' },
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

function Frame({ me, children }: { me: Me; children: ReactNode }) {
  const { pathname } = useLocation(); const navigate = useNavigate();
  const has = (key: string) => me.modules.includes(key);
  const nav = [['/equipe', 'Início', LayoutDashboard, true], ['/equipe/ocorrencias', 'Ocorrências', MessageCircleMore, has('records')], ['/equipe/projetos', 'Projetos e entregas', BriefcaseBusiness, has('projects')], ['/equipe/horas', 'Horas', Clock3, has('hours')], ['/equipe/calendario', 'Calendário', CalendarDays, has('calendar')], ['/equipe/documentos', 'Documentos', FolderOpen, has('documents')], ['/equipe/relatorios', 'Relatórios', FileBarChart2, has('reports')], ['/equipe/avisos', 'Avisos', Megaphone, has('notices')], ['/equipe/pessoas', 'Equipe do cliente', Users, has('team')], ['/equipe/aprovacoes', 'Enviar para aprovação', Send, true]] as [string, string, typeof Clock3, boolean][];
  async function logout() { await supabase?.auth.signOut(); navigate('/login', { replace: true }); }
  return <div className="app" data-workspace-role="partner">
    <aside className="sidebar" aria-label="Menu lateral CALI"><div className="brand"><span className="v2-brand-mark oak" role="img" aria-label="CALI" /></div>
      <nav aria-label="Navegação principal">{nav.filter((item) => item[3]).map(([href, label, Icon]) => <Link key={href} to={href} className={'nav-link ' + (pathname === href ? 'active' : '')} title={label} aria-label={label}><Icon size={17} /></Link>)}</nav>
      <div className="sidebar-bottom"><span className="gold-rule" /><button type="button" className="nav-link v2-staff-logout" onClick={() => void logout()} title="Sair" aria-label="Sair"><LogOut size={17} /></button></div>
    </aside>
    <main className="main"><header className="topbar"><div className="top-left"><strong className="v2-staff-brand">CALI <span>WORKSPACE · EQUIPE</span></strong></div><div className="top-actions"><span className="v2-staff-me"><span className="avatar small">{initials(me.name)}</span><span><strong>{me.name}</strong><small>Partner · Equipe CALI</small></span></span></div></header>
      <div className="content"><div className="v2-client-module v2-staff-area">{children}</div></div>
    </main>
    <WelcomeTour steps={welcomeSteps} />
  </div>;
}

function Head({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="title-dot">.</span></h1><p>{text}</p></div>{action}</div>;
}
const CompanySelect = ({ me, value, onChange, all }: { me: Me; value: string; onChange: (value: string) => void; all?: boolean }) => <select className="wf-record-filter" aria-label="Empresa" value={value} onChange={(event) => onChange(event.target.value)}>{all && <option value="">Todas as minhas empresas</option>}{!all && <option value="">Escolha a empresa</option>}{me.companies.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>;

function Home({ me }: { me: Me }) {
  return <><Head eyebrow="EQUIPE CALI / INÍCIO" title={`Olá, ${me.name.split(' ')[0]}`} text="Estas são as empresas que você atende e o que está liberado para você." />
    <div className="v2-staff-cards">{me.companies.map((item) => <article key={item.id}><span className="avatar"><Building2 size={16} /></span><div><strong>{item.display_name}</strong><small>{PLAN[String(item.service_plan || '').toLowerCase()] || item.service_plan || 'Pacote não informado'}{item.monthly_hours_contracted ? ` · ${item.monthly_hours_contracted}h contratadas por mês` : ''}</small></div></article>)}{!me.companies.length && <div className="empty">Nenhuma empresa atribuída a você ainda. Fale com a Patricia.</div>}</div>
    <section className="panel v2-staff-modules"><h3>O que você pode fazer</h3><p>Módulos liberados pela Patricia. Tudo que vai para o cliente passa pela aprovação dela.</p><div>{me.modules.map((key) => <span className="wf-tag" key={key}>{MODULES[key] || key}</span>)}{!me.modules.length && <small>Nenhum módulo liberado ainda.</small>}</div></section>
    <p className="soft-note">Projetos, calendário, documentos, relatórios, avisos e equipe do cliente estão disponíveis para consulta. Para alterar algo que vai ao cliente, prepare o material e use “Enviar para aprovação”.</p></>;
}

/* Consulta (somente leitura) dos módulos liberados. O banco só devolve o que é das empresas atribuídas. */
type BrowseRow = { id: string; company_id: string | null; title: string; sub: string; tag: string; when: string | null };
type BrowseConfig = { eyebrow: string; title: string; text: string; empty: string; load: () => Promise<BrowseRow[] | null> };
const label = (map: Record<string, string>, value: unknown) => map[String(value || '')] || String(value || '—');
const STATUS: Record<string, string> = { not_started: 'Não iniciada', in_progress: 'Em andamento', internal_review: 'Revisão interna', client_review: 'Com o cliente', approved: 'Aprovada', adjustment_requested: 'Ajuste solicitado', cancelled: 'Cancelada', done: 'Concluída', draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado ao cliente', published: 'Publicado', archived: 'Arquivado', active: 'Ativa', leave: 'Afastada', terminated: 'Desligada', paused: 'Pausado', planning: 'Em planejamento' };
const browse: Record<string, BrowseConfig> = {
  projetos: { eyebrow: 'EQUIPE CALI / PROJETOS', title: 'Projetos e entregas', text: 'As entregas das suas empresas, com situação e prazo. Para enviar uma entrega ao cliente, use “Enviar para aprovação”.', empty: 'Nenhuma entrega nas suas empresas.', load: async () => { const result = await supabase!.from('deliverables').select('id,company_id,title,protocol,status,due_at,workstream').is('cancelled_at', null).order('due_at', { ascending: true, nullsFirst: false }).limit(300); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.workstream].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.due_at })); } },
  calendario: { eyebrow: 'EQUIPE CALI / CALENDÁRIO', title: 'Calendário', text: 'Compromissos das suas empresas a partir de hoje.', empty: 'Nenhum compromisso marcado nas suas empresas.', load: async () => { const result = await supabase!.from('events').select('id,company_id,title,starts_at,mode,event_type,protocol').is('cancelled_at', null).gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at').limit(200); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.mode].filter(Boolean).join(' · '), tag: label({ meeting: 'Reunião', visit: 'Visita', onsite: 'Visita', deadline: 'Prazo', delivery: 'Entrega', training: 'Treinamento', holiday: 'Feriado', other: 'Compromisso' }, row.event_type || 'other'), when: row.starts_at })); } },
  documentos: { eyebrow: 'EQUIPE CALI / DOCUMENTOS', title: 'Documentos', text: 'Documentos das suas empresas, do mais recente ao mais antigo.', empty: 'Nenhum documento nas suas empresas.', load: async () => { const result = await supabase!.from('files').select('id,company_id,title,protocol,status,version_label,document_kind,updated_at').order('updated_at', { ascending: false }).limit(300); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: [row.protocol, row.document_kind, row.version_label].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.updated_at })); } },
  relatorios: { eyebrow: 'EQUIPE CALI / RELATÓRIOS', title: 'Relatórios', text: 'Relatórios das suas empresas. Só a Patricia aprova e envia ao cliente; a sua contribuição vai por “Enviar para aprovação”.', empty: 'Nenhum relatório nas suas empresas.', load: async () => { const result = await supabase!.from('reports').select('id,company_id,title,protocol,status,period_end').order('period_end', { ascending: false }).limit(200); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.title, sub: String(row.protocol || ''), tag: label(STATUS, row.status), when: row.period_end })); } },
  avisos: { eyebrow: 'EQUIPE CALI / AVISOS', title: 'Avisos', text: 'Comunicados publicados para as suas empresas.', empty: 'Nenhum comunicado publicado.', load: async () => { const result = await supabase!.from('notices').select('id,title,protocol,category,status,published_at').order('published_at', { ascending: false }).limit(100); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: null, title: row.title, sub: String(row.protocol || ''), tag: label({ feriado: 'Feriado', atendimento: 'Atendimento', comunicado: 'Comunicado' }, row.category), when: row.published_at })); } },
  pessoas: { eyebrow: 'EQUIPE CALI / EQUIPE DO CLIENTE', title: 'Equipe do cliente', text: 'O quadro de pessoas das suas empresas. Dados salariais não aparecem aqui.', empty: 'Nenhuma pessoa cadastrada nas suas empresas.', load: async () => { const result = await supabase!.from('team_members').select('id,company_id,full_name,job_title,department,status,admission_date').is('archived_at', null).order('full_name').limit(1000); return result.error ? null : (result.data as any[]).map((row) => ({ id: row.id, company_id: row.company_id, title: row.full_name, sub: [row.job_title, row.department].filter(Boolean).join(' · '), tag: label(STATUS, row.status), when: row.admission_date })); } },
};
function Browse({ me, kind }: { me: Me; kind: string }) {
  const config = browse[kind]; const [rows, setRows] = useState<BrowseRow[] | null>(null); const [failed, setFailed] = useState(false); const [company, setCompany] = useState(''); const [query, setQuery] = useState('');
  useEffect(() => { let alive = true; setRows(null); setFailed(false); void config.load().then((data) => { if (!alive) return; if (data) setRows(data); else setFailed(true); }); return () => { alive = false; }; }, [kind]);
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const text = query.trim().toLocaleLowerCase('pt-BR');
  const visible = (rows || []).filter((row) => (!company || row.company_id === company) && (!text || `${row.title} ${row.sub}`.toLocaleLowerCase('pt-BR').includes(text)));
  return <><Head eyebrow={config.eyebrow} title={config.title} text={config.text} />
    <div className="toolbar"><CompanySelect me={me} value={company} onChange={setCompany} all /><input className="v2-staff-search" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" /></div>
    {failed ? <div className="inline-notice">Não foi possível carregar. Recarregue a página; se continuar, fale com a Patricia.</div> : !rows ? <div className="data-loading">Carregando…</div> : visible.length ? <div className="wf-records v2-staff-browse">{visible.map((row) => <div className="wf-record-row" key={row.id}><div><strong>{row.title}</strong><small>{[row.company_id ? companyName.get(row.company_id) : '', row.sub].filter(Boolean).join(' · ') || '—'}</small></div><span className="wf-tag">{row.tag}</span><small>{row.when ? dayLabel(row.when) : '—'}</small></div>)}</div> : <div className="empty">{config.empty}</div>}
    <p className="soft-note">Tela de consulta. Você vê, mas não altera por aqui.</p></>;
}

type RecordRow = { id: string; company_id: string; protocol: string | null; title: string; summary: string | null; workflow_status: string | null; last_activity_at: string | null; created_at: string };
type Message = { id: string; record_id: string; author_id: string | null; author_role: string; body: string; visibility: string | null; created_at: string; deleted_at: string | null };
function Records({ me }: { me: Me }) {
  const [rows, setRows] = useState<RecordRow[]>([]); const [company, setCompany] = useState(''); const [active, setActive] = useState<RecordRow | null>(null); const [messages, setMessages] = useState<Message[]>([]); const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { if (!supabase) return; const result = await supabase.from('account_records').select('id,company_id,protocol,title,summary,workflow_status,last_activity_at,created_at').eq('visibility', 'client').order('last_activity_at', { ascending: false, nullsFirst: false }).limit(200); if (result.error) setError('Não foi possível carregar as ocorrências.'); else setRows((result.data || []) as RecordRow[]); const people = await supabase.from('profiles').select('id,full_name'); setNames(Object.fromEntries(((people.data || []) as any[]).map((item) => [item.id, item.full_name]))); setLoading(false); })(); }, []);
  async function open(row: RecordRow) { setActive(row); setText(''); setMessages([]); if (!supabase) return; const result = await supabase.from('account_record_messages').select('id,record_id,author_id,author_role,body,visibility,created_at,deleted_at').eq('record_id', row.id).order('created_at'); setMessages(((result.data || []) as Message[]).filter((item) => !item.deleted_at && item.visibility !== 'internal')); }
  async function send(event: FormEvent) { event.preventDefault(); if (!supabase || !active || !text.trim()) return; setBusy(true); setError(''); const result = await supabase.from('account_record_messages').insert({ record_id: active.id, company_id: active.company_id, author_id: me.id, author_role: 'admin', body: text.trim(), visibility: 'client' }).select('id,record_id,author_id,author_role,body,visibility,created_at,deleted_at').single(); setBusy(false); if (result.error) { setError('Não foi possível enviar a resposta. Tente de novo.'); return; } setMessages((list) => [...list, result.data as Message]); setText(''); }
  const companyName = useMemo(() => new Map(me.companies.map((item) => [item.id, item.display_name])), [me]);
  const visible = rows.filter((row) => !company || row.company_id === company);
  const status: Record<string, string> = { open: 'Aberta', in_progress: 'Em andamento', waiting_client: 'Aguardando cliente', closed: 'Encerrada', reopened: 'Reaberta' };
  return <><Head eyebrow="EQUIPE CALI / OCORRÊNCIAS" title="Ocorrências" text="Dúvidas e pedidos das suas empresas. O cliente vê o seu nome na resposta." />
    <div className="toolbar"><CompanySelect me={me} value={company} onChange={setCompany} all /></div>
    {error && <div className="inline-notice">{error}</div>}
    {loading ? <div className="data-loading">Carregando ocorrências…</div> : visible.length ? <div className="wf-records v2-staff-records">{visible.map((row) => <button type="button" className="wf-record-row" key={row.id} onClick={() => void open(row)}><div><strong>{row.title}</strong><small>{row.protocol || 'Sem protocolo'} · {companyName.get(row.company_id) || 'Empresa'}</small></div><span className="wf-tag">{status[row.workflow_status || ''] || row.workflow_status || 'Aberta'}</span><small>{moment(row.last_activity_at || row.created_at)}</small><ArrowRight size={15} /></button>)}</div> : <div className="empty">Nenhuma ocorrência nas suas empresas.</div>}
    {active && <div className="wf-overlay" onMouseDown={() => setActive(null)}><section className="wf-modal v2-staff-form v2-staff-chat" role="dialog" aria-modal="true" aria-label="Ocorrência" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>{active.protocol || 'OCORRÊNCIA'} · {companyName.get(active.company_id)}</small><h2>{active.title}</h2></div><button type="button" onClick={() => setActive(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body">{active.summary && <p className="v2-staff-summary">{active.summary}</p>}{messages.map((item) => <div key={item.id} className={'v2-staff-msg ' + (item.author_role === 'client' ? 'client' : 'cali')}><strong>{item.author_id ? names[item.author_id] || (item.author_role === 'client' ? 'Cliente' : 'CALI') : 'Sistema'}</strong><p>{item.body}</p><small>{moment(item.created_at)}</small></div>)}{!messages.length && <p className="v2-staff-summary">Ainda não há mensagens nesta conversa.</p>}</div>
      <form className="v2-staff-reply" onSubmit={send}><input placeholder="Escrever resposta ao cliente…" value={text} onChange={(event) => setText(event.target.value)} /><button type="submit" className="wf-primary" disabled={busy || !text.trim()} aria-label="Enviar resposta"><SendHorizontal size={15} /></button></form>
    </section></div>}</>;
}

type HourRow = { id: string; company_id: string; work_date: string; minutes: number; description: string; justification: string; status: string; decision_note: string | null; created_at: string };
function Hours({ me }: { me: Me }) {
  const [rows, setRows] = useState<HourRow[]>([]); const [draft, setDraft] = useState({ company: '', date: new Date().toISOString().slice(0, 10), hours: '1', minutes: '0', description: '', justification: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  async function load() { if (!supabase) return; const result = await supabase.from('staff_hour_submissions').select('id,company_id,work_date,minutes,description,justification,status,decision_note,created_at').order('created_at', { ascending: false }).limit(100); if (!result.error) setRows((result.data || []) as HourRow[]); }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; const total = Number(draft.hours || 0) * 60 + Number(draft.minutes || 0); setDone('');
    if (!draft.company) { setError('Escolha a empresa.'); return; } if (!(total > 0 && total <= 1440)) { setError('Informe uma duração entre 1 minuto e 24 horas.'); return; } if (draft.description.trim().length < 3) { setError('Descreva o que foi feito.'); return; } if (draft.justification.trim().length < 10) { setError('Escreva a justificativa (pelo menos 10 caracteres): por que este lançamento é manual.'); return; }
    setBusy(true); setError(''); const result = await supabase.from('staff_hour_submissions').insert({ staff_user_id: me.id, company_id: draft.company, work_date: draft.date, minutes: total, description: draft.description.trim(), justification: draft.justification.trim() }); setBusy(false);
    if (result.error) { setError('Não foi possível enviar o lançamento. Tente de novo.'); return; } setDraft({ ...draft, description: '', justification: '' }); setDone('Lançamento enviado para a Patricia aprovar.'); void load(); }
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const tone: Record<string, [string, string]> = { pending: ['wait', 'Aguardando aprovação'], approved: ['ok', 'Aprovado'], rejected: ['bad', 'Recusado'] };
  return <><Head eyebrow="EQUIPE CALI / HORAS" title="Horas" text="Lance o tempo trabalhado com uma justificativa. Só entra no relatório do cliente depois que a Patricia aprovar." />
    <form className="panel v2-staff-hours" onSubmit={save}><h3>Novo lançamento</h3>
      <div className="v2-staff-fields three"><label>Empresa<CompanySelect me={me} value={draft.company} onChange={(value) => setDraft({ ...draft, company: value })} /></label><label>Data<input type="date" value={draft.date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Duração<span className="v2-staff-duration"><input type="number" min="0" max="24" value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} aria-label="Horas" /> h <input type="number" min="0" max="59" step="5" value={draft.minutes} onChange={(event) => setDraft({ ...draft, minutes: event.target.value })} aria-label="Minutos" /> min</span></label></div>
      <div className="v2-staff-fields"><label>O que foi feito<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ex.: revisão da política de férias" /></label><label>Justificativa do lançamento manual<input value={draft.justification} onChange={(event) => setDraft({ ...draft, justification: event.target.value })} placeholder="Ex.: reunião presencial, sem cronômetro" /></label></div>
      {error && <div className="inline-notice v2-staff-error" role="alert">{error}</div>}{done && <div className="inline-notice v2-staff-done" role="status">{done}</div>}
      <div className="v2-staff-submit"><button type="submit" className="wf-primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar para aprovação'}</button></div></form>
    <div className="section-head"><h2>Meus lançamentos</h2></div>
    {rows.length ? <div className="wf-records v2-staff-sent">{rows.map((row) => <div className="wf-record-row" key={row.id}><time>{dayLabel(row.work_date)}</time><strong>{duration(row.minutes)}</strong><div><strong>{row.description}</strong><small>{companyName.get(row.company_id) || 'Empresa'} · {row.justification}{row.decision_note ? ` · Retorno: ${row.decision_note}` : ''}</small></div><span className={`wf-tag ${tone[row.status]?.[0] || ''}`}>{tone[row.status]?.[1] || row.status}</span></div>)}</div> : <div className="empty">Você ainda não enviou lançamentos.</div>}</>;
}

type ReviewRow = { id: string; company_id: string; kind: string; title: string; note: string | null; status: string; decision_note: string | null; created_at: string };
const KINDS: Record<string, string> = { report: 'Relatório', deliverable: 'Entrega', document: 'Documento', notice: 'Comunicado', other: 'Outro' };
function Reviews({ me }: { me: Me }) {
  const [rows, setRows] = useState<ReviewRow[]>([]); const [draft, setDraft] = useState({ company: '', kind: 'deliverable', title: '', note: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  async function load() { if (!supabase) return; const result = await supabase.from('staff_review_requests').select('id,company_id,kind,title,note,status,decision_note,created_at').order('created_at', { ascending: false }).limit(100); if (!result.error) setRows((result.data || []) as ReviewRow[]); }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; setDone(''); if (!draft.company) { setError('Escolha a empresa.'); return; } if (draft.title.trim().length < 3) { setError('Diga o que você está enviando.'); return; }
    setBusy(true); setError(''); const result = await supabase.from('staff_review_requests').insert({ staff_user_id: me.id, company_id: draft.company, kind: draft.kind, title: draft.title.trim(), note: draft.note.trim() || null }); setBusy(false);
    if (result.error) { setError('Não foi possível enviar. Tente de novo.'); return; } setDraft({ ...draft, title: '', note: '' }); setDone('Enviado para a Patricia.'); void load(); }
  const companyName = new Map(me.companies.map((item) => [item.id, item.display_name])); const tone: Record<string, [string, string]> = { pending: ['wait', 'Aguardando a Patricia'], approved: ['ok', 'Aprovado'], returned: ['bad', 'Devolvido para ajuste'] };
  return <><Head eyebrow="EQUIPE CALI / APROVAÇÃO" title="Enviar para aprovação" text="Relatório, entrega, documento ou comunicado pronto? Envie para a Patricia. Só ela aprova e envia ao cliente." />
    <form className="panel v2-staff-hours" onSubmit={save}><h3>Novo envio</h3>
      <div className="v2-staff-fields three"><label>Empresa<CompanySelect me={me} value={draft.company} onChange={(value) => setDraft({ ...draft, company: value })} /></label><label>O que é<select className="wf-record-filter" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}>{Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Relatório de outubro" /></label></div>
      <div className="v2-staff-fields one"><label>Recado para a Patricia (opcional)<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Onde está o material e o que ela precisa olhar" /></label></div>
      {error && <div className="inline-notice v2-staff-error" role="alert">{error}</div>}{done && <div className="inline-notice v2-staff-done" role="status">{done}</div>}
      <div className="v2-staff-submit"><button type="submit" className="wf-primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar para a Patricia'}</button></div></form>
    <div className="section-head"><h2>Meus envios</h2></div>
    {rows.length ? <div className="wf-records v2-staff-sent">{rows.map((row) => <div className="wf-record-row" key={row.id}><time>{moment(row.created_at)}</time><strong>{KINDS[row.kind] || row.kind}</strong><div><strong>{row.title}</strong><small>{companyName.get(row.company_id) || 'Empresa'}{row.note ? ` · ${row.note}` : ''}{row.decision_note ? ` · Retorno: ${row.decision_note}` : ''}</small></div><span className={`wf-tag ${tone[row.status]?.[0] || ''}`}>{tone[row.status]?.[1] || row.status}</span></div>)}</div> : <div className="empty">Você ainda não enviou nada para aprovação.</div>}</>;
}

export function StaffWorkspace() {
  const auth = useWorkspaceAuth(); const { me, error } = useMe();
  if (!auth.ready) return <div className="v2-client-module"><div className="data-loading">Carregando…</div></div>;
  if (!auth.user || !auth.active) return <Navigate to="/login" replace />;
  if (auth.role !== 'partner') return <Navigate to={auth.role === 'admin' ? '/admin' : '/cliente'} replace />;
  if (error) return <div className="v2-client-module v2-staff-fail"><div className="inline-notice">{error}</div></div>;
  if (!me) return <div className="v2-client-module"><div className="data-loading">Carregando o seu espaço…</div></div>;
  return <Frame me={me}><Routes>
    <Route index element={<Home me={me} />} />
    <Route path="ocorrencias" element={me.modules.includes('records') ? <Records me={me} /> : <Navigate to="/equipe" replace />} />
    <Route path="horas" element={me.modules.includes('hours') ? <Hours me={me} /> : <Navigate to="/equipe" replace />} />
    {([['projetos', 'projects'], ['calendario', 'calendar'], ['documentos', 'documents'], ['relatorios', 'reports'], ['avisos', 'notices'], ['pessoas', 'team']] as [string, string][]).map(([path, module]) => <Route key={path} path={path} element={me.modules.includes(module) ? <Browse me={me} kind={path} /> : <Navigate to="/equipe" replace />} />)}
    <Route path="aprovacoes" element={<Reviews me={me} />} />
    <Route path="*" element={<Navigate to="/equipe" replace />} />
  </Routes></Frame>;
}
