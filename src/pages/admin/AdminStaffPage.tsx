import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Undo2, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

/* Equipe CALI (só administradora): cadastro de quem trabalha com a CALI no perfil Partner, com as empresas que atende
   e os módulos liberados. Tabelas: staff_members e staff_company_assignments (migração 20261012150000).
   ETAPA 1: aqui só se prepara o cadastro. O acesso do Partner ao Workspace é liberado nas próximas etapas. */

type Staff = { id: string; email: string; full_name: string; modules: string[]; active: boolean; user_id: string | null; invited_at: string; accepted_at: string | null };
type Company = { id: string; display_name: string };
type Draft = { id: string | null; email: string; full_name: string; modules: string[]; companies: string[]; active: boolean };
export const STAFF_MODULES: [string, string, string][] = [
  ['records', 'Ocorrências', 'Responder dúvidas e pedidos dos clientes'],
  ['projects', 'Projetos e entregas', 'Trabalhar nas entregas; o envio ao cliente passa pela sua aprovação'],
  ['hours', 'Horas', 'Usar o cronômetro e lançar horas com justificativa, sujeitas à sua aprovação'],
  ['calendar', 'Calendário', 'Criar agendamentos em nome da CALI'],
  ['documents', 'Documentos', 'Preparar documentos das empresas atribuídas'],
  ['reports', 'Relatórios', 'Preparar relatórios e enviar para você aprovar'],
  ['notices', 'Avisos', 'Publicar comunicados'],
  ['team', 'Equipe do cliente', 'Ver o quadro de pessoas, sem dados salariais'],
  ['people_map', 'Mapa de People', 'Acessar e gerar o Mapa'],
];
type Pending = { id: string; kind: 'hours' | 'review'; staff_user_id: string; company_id: string; title: string; detail: string; meta: string; created_at: string };
type Decision = { item: Pending; approve: boolean; note: string };
const REVIEW_KINDS: Record<string, string> = { report: 'Relatório', deliverable: 'Entrega', document: 'Documento', notice: 'Comunicado', other: 'Outro' };
const blank = (): Draft => ({ id: null, email: '', full_name: '', modules: ['records', 'projects', 'hours'], companies: [], active: true });
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

export function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]); const [companies, setCompanies] = useState<Company[]>([]); const [assigned, setAssigned] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [draft, setDraft] = useState<Draft | null>(null); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState(''); const [pending, setPending] = useState<Pending[]>([]); const [decision, setDecision] = useState<Decision | null>(null); const [deciding, setDeciding] = useState(false); const [decisionError, setDecisionError] = useState('');

  async function load() {
    if (!supabase) return; setLoading(true); setError('');
    const [people, firms, links] = await Promise.all([
      supabase.from('staff_members').select('id,email,full_name,modules,active,user_id,invited_at,accepted_at').order('full_name'),
      supabase.from('companies').select('id,display_name').order('display_name'),
      supabase.from('staff_company_assignments').select('staff_id,company_id'),
    ]);
    if (people.error || firms.error || links.error) setError('Não foi possível carregar a Equipe CALI. Clique em "Tentar de novo".');
    else { setStaff((people.data || []) as Staff[]); setCompanies((firms.data || []) as Company[]); const map: Record<string, string[]> = {}; (links.data || []).forEach((row: any) => (map[row.staff_id] ||= []).push(row.company_id)); setAssigned(map); }
    const [hours, reviews] = await Promise.all([
      supabase.from('staff_hour_submissions').select('id,staff_user_id,company_id,work_date,minutes,description,justification,created_at').eq('status', 'pending').order('created_at'),
      supabase.from('staff_review_requests').select('id,staff_user_id,company_id,kind,title,note,created_at').eq('status', 'pending').order('created_at'),
    ]);
    setPending([
      ...((hours.data || []) as any[]).map((row) => ({ id: row.id, kind: 'hours' as const, staff_user_id: row.staff_user_id, company_id: row.company_id, title: `${Math.floor(row.minutes / 60)}h${String(row.minutes % 60).padStart(2, '0')} · ${row.description}`, detail: `Justificativa: ${row.justification}`, meta: `Horas de ${dayLabel(row.work_date + 'T12:00:00')}`, created_at: row.created_at })),
      ...((reviews.data || []) as any[]).map((row) => ({ id: row.id, kind: 'review' as const, staff_user_id: row.staff_user_id, company_id: row.company_id, title: row.title, detail: row.note || 'Sem recado.', meta: REVIEW_KINDS[row.kind] || row.kind, created_at: row.created_at })),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setLoading(false);
  }
  async function decide(event: FormEvent) {
    event.preventDefault(); if (!supabase || !decision) return;
    if (!decision.approve && !decision.note.trim()) { setDecisionError('Escreva o motivo para a pessoa saber o que ajustar.'); return; }
    setDeciding(true); setDecisionError('');
    const { data: session } = await supabase.auth.getUser();
    const result = decision.item.kind === 'hours'
      ? await supabase.rpc('admin_decide_staff_hours', { p_submission_id: decision.item.id, p_approve: decision.approve, p_note: decision.note.trim() || null })
      : await supabase.from('staff_review_requests').update({ status: decision.approve ? 'approved' : 'returned', decided_by: session.user?.id || null, decided_at: new Date().toISOString(), decision_note: decision.note.trim() || null }).eq('id', decision.item.id);
    setDeciding(false);
    if (result.error) { setDecisionError(result.error.message && !/violates|policy|permission/i.test(result.error.message) ? result.error.message : 'Não foi possível registrar a decisão. Tente de novo.'); return; }
    setDecision(null); await load();
  }
  useEffect(() => { void load(); }, []);

  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  async function save(event: FormEvent) {
    event.preventDefault(); if (!supabase || !draft) return;
    const email = draft.email.trim().toLowerCase(); const name = draft.full_name.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setFormError('Preencha o nome e um e-mail válido.'); return; }
    if (!draft.companies.length) { setFormError('Escolha pelo menos uma empresa que esta pessoa vai atender.'); return; }
    if (!draft.modules.length) { setFormError('Escolha pelo menos um módulo.'); return; }
    setSaving(true); setFormError('');
    try {
      const { data: session } = await supabase.auth.getUser(); let id = draft.id;
      if (id) { const result = await supabase.from('staff_members').update({ full_name: name, modules: draft.modules, active: draft.active, updated_at: new Date().toISOString() }).eq('id', id); if (result.error) throw result.error; }
      else { const result = await supabase.from('staff_members').insert({ email, full_name: name, modules: draft.modules, active: true, invited_by: session.user?.id || null }).select('id').single(); if (result.error) throw result.error; id = (result.data as any).id; }
      const before = draft.id ? assigned[draft.id] || [] : []; const add = draft.companies.filter((item) => !before.includes(item)); const remove = before.filter((item) => !draft.companies.includes(item));
      if (add.length) { const result = await supabase.from('staff_company_assignments').insert(add.map((company_id) => ({ staff_id: id, company_id }))); if (result.error) throw result.error; }
      if (remove.length) { const result = await supabase.from('staff_company_assignments').delete().eq('staff_id', id).in('company_id', remove); if (result.error) throw result.error; }
      setDraft(null); await load();
    } catch (err) { const message = String((err as any)?.message || ''); setFormError(/duplicate|unique/i.test(message) ? 'Já existe uma pessoa cadastrada com este e-mail.' : 'Não foi possível salvar. Tente de novo.'); } finally { setSaving(false); }
  }
  const companyName = new Map(companies.map((item) => [item.id, item.display_name]));
  const moduleName = new Map(STAFF_MODULES.map(([key, label]) => [key, label]));

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-staff v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Equipe CALI</h1><p>Quem trabalha com você no perfil Partner, quais empresas atende e o que pode fazer. Para o cliente, quem está à frente continua sendo você.</p></div><div className="v2-head-actions"><button className="wf-primary" type="button" onClick={() => { setFormError(''); setDraft(blank()); }}><Plus size={15} /> Adicionar pessoa</button></div></div>
    {error && <div className="inline-notice">{error} <button type="button" className="v2-link-button" onClick={() => void load()}>Tentar de novo</button></div>}
    <div className="v2-staff-profiles">
      <article><small>ADMINISTRADORA</small><strong>Patricia · acesso completo</strong><p>Vê e faz tudo. Aprova relatórios, entregas e horas antes de chegarem ao cliente.</p></article>
      <article><small>PARTNER</small><strong>Apoio operacional</strong><p>Vê só as empresas e os módulos que você atribuir. Não vê Propostas, Auditoria, valores nem dados salariais. O que vai para o cliente passa por você.</p></article>
    </div>
    {pending.length > 0 && <section className="v2-staff-queue"><header><div><small>PARA VOCÊ APROVAR</small><h2>{pending.length} {pending.length === 1 ? 'item aguardando a sua decisão' : 'itens aguardando a sua decisão'}</h2><p>Nada disto chegou ao cliente. Horas aprovadas viram lançamento oficial; material aprovado continua com você para enviar.</p></div></header>
      <div className="wf-records">{pending.map((item) => <div className="wf-record-row" key={item.kind + item.id}><span className="wf-tag wait">{item.meta}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><div><small>Quem enviou</small><span>{staff.find((person) => person.user_id === item.staff_user_id)?.full_name || 'Partner'}</span></div><div><small>Empresa</small><span>{companyName.get(item.company_id) || '—'}</span></div><div className="v2-staff-queue-actions"><button type="button" className="wf-secondary" onClick={() => { setDecisionError(''); setDecision({ item, approve: false, note: '' }); }}><Undo2 size={14} /> {item.kind === 'hours' ? 'Recusar' : 'Devolver'}</button><button type="button" className="wf-primary" onClick={() => { setDecisionError(''); setDecision({ item, approve: true, note: '' }); }}><Check size={14} /> Aprovar</button></div></div>)}</div></section>}
    {loading ? <div className="data-loading">Carregando equipe…</div> : staff.length ? <div className="wf-records v2-staff-list">{staff.map((person) => <div className="wf-record-row" key={person.id}>
      <span className="avatar">{person.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</span>
      <div><strong>{person.full_name}</strong><small>{person.email}</small></div>
      <div><small>Empresas</small><span>{(assigned[person.id] || []).map((id) => companyName.get(id)).filter(Boolean).join(', ') || 'Nenhuma'}</span></div>
      <div><small>Módulos</small><span>{person.modules.map((key) => moduleName.get(key) || key).join(', ') || 'Nenhum'}</span></div>
      <div><small>Situação</small><span className={`wf-tag ${!person.active ? 'off' : person.accepted_at ? 'ok' : 'wait'}`}>{!person.active ? 'Desativada' : person.accepted_at ? `Ativa desde ${dayLabel(person.accepted_at)}` : 'Cadastro preparado'}</span></div>
      <button type="button" className="v2-row-icon" aria-label={`Editar ${person.full_name}`} onClick={() => { setFormError(''); setDraft({ id: person.id, email: person.email, full_name: person.full_name, modules: person.modules, companies: assigned[person.id] || [], active: person.active }); }}><Pencil size={15} /></button>
    </div>)}</div> : <div className="v2-staff-empty"><strong>Nenhuma pessoa cadastrada na Equipe CALI.</strong><p>Clique em “Adicionar pessoa” para preparar o cadastro do seu Partner.</p></div>}
    <div className="inline-notice v2-staff-stage"><strong>Como a pessoa entra:</strong> depois de cadastrada aqui, ela acessa o endereço do Workspace, informa o e-mail e recebe um código, igual aos clientes. No primeiro acesso ela vê as boas-vindas da Equipe CALI. Para tirar o acesso, edite a pessoa e desmarque “Cadastro ativo”.</div>

    {decision && <div className="wf-overlay" onMouseDown={() => setDecision(null)}><form className="wf-modal v2-staff-form v2-staff-decision" role="dialog" aria-modal="true" aria-label="Decisão" onSubmit={decide} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>{decision.item.meta.toUpperCase()}</small><h2>{decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar lançamento' : 'Devolver para ajuste'}</h2></div><button type="button" onClick={() => setDecision(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body"><div className="v2-staff-decision-item"><strong>{decision.item.title}</strong><small>{decision.item.detail}</small></div>
        <p className="v2-staff-decision-effect">{decision.approve ? (decision.item.kind === 'hours' ? 'Ao aprovar, as horas entram no controle de horas da empresa como lançamento manual, com o nome de quem lançou e a justificativa guardados na nota interna. Elas ficam ocultas do cliente até você marcar como visíveis em Horas.' : 'Ao aprovar, a pessoa é avisada de que o material está liberado. O envio ao cliente continua sendo feito por você.') : 'A pessoa verá o seu motivo e poderá corrigir e enviar de novo.'}</p>
        <div className="v2-staff-fields one"><label>{decision.approve ? 'Recado (opcional)' : 'Motivo (obrigatório)'}<input value={decision.note} onChange={(event) => setDecision({ ...decision, note: event.target.value })} autoFocus /></label></div>
        {decisionError && <div className="inline-notice v2-staff-error" role="alert">{decisionError}</div>}</div>
      <footer><button type="button" className="wf-secondary" onClick={() => setDecision(null)}>Cancelar</button><button type="submit" className="wf-primary" disabled={deciding}>{deciding ? 'Registrando…' : decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar' : 'Devolver'}</button></footer>
    </form></div>}
    {draft && <div className="wf-overlay" onMouseDown={() => setDraft(null)}><form className="wf-modal v2-staff-form" role="dialog" aria-modal="true" aria-label={draft.id ? 'Editar pessoa da equipe' : 'Adicionar pessoa à equipe'} onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>EQUIPE CALI · PARTNER</small><h2>{draft.id ? 'Editar pessoa' : 'Adicionar pessoa'}</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body">
        <div className="v2-staff-fields"><label>Nome completo<input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} autoFocus /></label><label>E-mail de acesso<input type="email" value={draft.email} disabled={Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label></div>
        <fieldset><legend>Empresas que esta pessoa atende</legend><div className="v2-staff-checks">{companies.map((item) => <label key={item.id}><input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft, companies: toggle(draft.companies, item.id) })} /><span>{item.display_name}</span></label>)}</div></fieldset>
        <fieldset><legend>O que ela pode fazer</legend><div className="v2-staff-checks modules">{STAFF_MODULES.map(([key, label, hint]) => <label key={key}><input type="checkbox" checked={draft.modules.includes(key)} onChange={() => setDraft({ ...draft, modules: toggle(draft.modules, key) })} /><span><b>{label}</b><small>{hint}</small></span></label>)}</div></fieldset>
        {draft.id && <label className="v2-staff-active"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>Cadastro ativo</span></label>}
        {formError && <div className="inline-notice v2-staff-error" role="alert">{formError}</div>}
      </div>
      <footer><button type="button" className="wf-secondary" onClick={() => setDraft(null)}>Cancelar</button><button type="submit" className="wf-primary" disabled={saving}>{saving ? 'Salvando…' : draft.id ? 'Salvar alterações' : 'Salvar cadastro'}</button></footer>
    </form></div>}
  </div></div></div></Shell>;
}
