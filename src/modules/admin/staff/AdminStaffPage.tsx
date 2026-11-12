import { DialogForm } from '../../../components/ds/DialogForm';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useState, type FormEvent } from 'react';
import { Check, Mail, Pencil, Plus, Undo2, X } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { decideStaffSubmission } from '../../../api/admin/staff/decisions';
import {
  readStaffAdministration, saveStaffDirectoryPerson, sendStaffInvite,
  type StaffDirectoryCompany, type StaffDirectoryPerson, type StaffDraft,
} from '../../../api/admin/staff/directory';

/* Equipe CALI (só administradora): cadastro de quem trabalha com a CALI no perfil Partner, com as empresas que atende
   e os módulos liberados. Tabelas: staff_members e staff_company_assignments (migração 20261012150000).
   ETAPA 1: aqui só se prepara o cadastro. O acesso do Partner ao Workspace é liberado nas próximas etapas. */

export const STAFF_MODULES: [string, string, string][] = [
  ['records', 'Ocorrências', 'Responder dúvidas e pedidos dos clientes'],
  ['projects', 'Projetos e entregas', 'Trabalhar nas entregas; o envio ao cliente passa pela sua aprovação'],
  ['hours', 'Horas', 'Usar o cronômetro e lançar horas com justificativa, sujeitas à sua aprovação'],
  ['calendar', 'Calendário', 'Criar agendamentos em nome da CALI'],
  ['documents', 'Documentos', 'Preparar documentos das empresas atribuídas'],
  ['reports', 'Relatórios', 'Preparar relatórios e enviar para você aprovar'],
  ['notices', 'Avisos', 'Preparar comunicados para revisão'],
  ['proposals', 'Propostas', 'Preparar propostas atribuídas para revisão'],
  ['team', 'Equipe do cliente', 'Ver o quadro de pessoas, sem dados salariais'],
  ['people_map', 'Mapa de People', 'Preparar pareceres atribuídos para revisão'],
];
type Pending = { id: string; kind: 'hours' | 'review'; reviewKind?: string; entityId?: string | null; payload?: any; staff_user_id: string; company_id: string; title: string; detail: string; meta: string; created_at: string };
type Decision = { item: Pending; approve: boolean; note: string };
const REVIEW_KINDS: Record<string, string> = { report: 'Relatório', deliverable: 'Entrega', document: 'Documento', notice: 'Comunicado', other: 'Outro', record_close: 'Encerrar ocorrência', change: 'Alteração em projeto' };
const CHANGE_EFFECT: Record<string, string> = { project_create: 'o projeto é criado como rascunho, com as frentes informadas', front_create: 'a frente é criada no projeto', deliverable_create: 'o entregável é criado como “Não iniciado”', deliverable_update: 'o entregável é alterado com os novos dados', deliverable_delete: 'o entregável é excluído', deliverable_cancel: 'o entregável é cancelado, com o motivo informado', task_create: 'a etapa é criada no entregável', task_complete: 'a etapa é marcada como concluída' };
const blank = (): StaffDraft => ({ id: null, email: '', full_name: '', modules: ['records', 'projects', 'hours'], companies: [], active: true });
const momentLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

export function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffDirectoryPerson[]>([]); const [companies, setCompanies] = useState<StaffDirectoryCompany[]>([]); const [assigned, setAssigned] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [draft, setDraft] = useState<StaffDraft | null>(null); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState(''); const [pending, setPending] = useState<Pending[]>([]); const [decision, setDecision] = useState<Decision | null>(null); const [deciding, setDeciding] = useState(false); const [decisionError, setDecisionError] = useState(''); const [sessions, setSessions] = useState<Record<string, { in?: string; out?: string }>>({}); const [invite, setInvite] = useState<{ name: string; email: string; sent: boolean } | null>(null); const [inviting, setInviting] = useState('');

  async function load() {
    setLoading(true); setError('');
    const message = 'Não foi possível carregar a Equipe CALI. Clique em "Tentar de novo".';
    const result = await readStaffAdministration().catch(() => null);
    if (!result) { setError(message); setLoading(false); return; }
    if (!result.directory) setError(message);
    else {
      setStaff(result.directory.staff);
      setCompanies(result.directory.companies);
      setAssigned(result.directory.assigned);
    }
    setSessions(result.sessions);
    setPending([
      ...result.hours.map((row) => ({ id: row.id, kind: 'hours' as const, staff_user_id: row.staff_user_id, company_id: row.company_id, title: `${Math.floor(row.minutes / 60)}h${String(row.minutes % 60).padStart(2, '0')} · ${row.description}`, detail: `Justificativa: ${row.justification}`, meta: `Horas de ${dayLabel(row.work_date + 'T12:00:00')}`, created_at: row.created_at })),
      ...result.reviews.map((row) => ({ id: row.id, kind: 'review' as const, staff_user_id: row.staff_user_id, company_id: row.company_id, reviewKind: row.kind, entityId: row.entity_id, payload: row.payload, title: row.title, detail: row.kind === 'change' ? `Se você aprovar, ${CHANGE_EFFECT[row.payload?.action] || 'a alteração é aplicada'}.${row.payload?.reason ? ` Motivo informado: ${row.payload.reason}` : ''}` : row.kind === 'record_close' ? (row.note || 'A pessoa considera esta ocorrência resolvida e pede o encerramento.') : (row.note || 'Sem recado.'), meta: REVIEW_KINDS[row.kind] || row.kind, created_at: row.created_at })),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setLoading(false);
  }
  async function decide(event: FormEvent) {
    event.preventDefault();
    if (!decision) return;
    if (!decision.approve && !decision.note.trim()) { setDecisionError('Escreva o motivo para a pessoa saber o que ajustar.'); return; }
    setDeciding(true); setDecisionError('');
    try {
      await decideStaffSubmission({ ...decision.item, approve: decision.approve, note: decision.note });
      setDecision(null);
      await load();
    } catch (reason) {
      setDecisionError(reason instanceof Error ? reason.message : 'Não foi possível registrar a decisão. Tente de novo.');
    } finally {
      setDeciding(false);
    }
  }
  useEffect(() => { void load(); }, []);

  /* Convite: tenta o envio automático (função workspace-staff-invite). Se ela não responder, mostra o convite pronto
     para a administradora enviar pelo próprio e-mail — a pessoa nunca fica sem saber como entrar. */
  async function sendInvite(person: { id: string; full_name: string; email: string }) {
    setInviting(person.id);
    const sent = await sendStaffInvite(person.id).catch(() => false);
    setInviting(''); setInvite({ name: person.full_name, email: person.email, sent });
  }
  const inviteText = (name: string, email: string) => `Olá, ${name.split(' ')[0]}!\n\nVocê agora faz parte da Equipe CALI e já tem acesso ao CALI Workspace.\n\nComo entrar:\n1. Abra ${window.location.origin}/login\n2. Informe este e-mail: ${email}\n3. Digite o código de 6 números que chega em seguida na sua caixa de entrada. Não há senha.\n\nNo primeiro acesso você verá uma apresentação rápida do que cada parte faz.\n\nQualquer dúvida, fale comigo.\nPatricia · CALI RH`;
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    const email = draft.email.trim().toLowerCase(); const name = draft.full_name.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setFormError('Preencha o nome e um e-mail válido.'); return; }
    if (!draft.companies.length) { setFormError('Escolha pelo menos uma empresa que esta pessoa vai atender.'); return; }
    if (!draft.modules.length) { setFormError('Escolha pelo menos um módulo.'); return; }
    setSaving(true); setFormError('');
    try {
      const before = draft.id ? assigned[draft.id] || [] : [];
      const id = await saveStaffDirectoryPerson({ ...draft, full_name: name, email }, before);
      const created = !draft.id; setDraft(null); await load(); if (created && id) void sendInvite({ id, full_name: name, email });
    } catch (err) { const message = String((err as any)?.message || ''); setFormError(/duplicate|unique/i.test(message) ? 'Já existe uma pessoa cadastrada com este e-mail.' : 'Não foi possível salvar. Tente de novo.'); } finally { setSaving(false); }
  }
  const companyName = new Map(companies.map((item) => [item.id, item.display_name]));
  const moduleName = new Map(STAFF_MODULES.map(([key, label]) => [key, label]));

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-staff v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Equipe CALI</h1><p>Quem trabalha com você no perfil Partner, quais empresas atende e o que pode fazer. Para o cliente, quem está à frente continua sendo você.</p></div><div className="v2-head-actions"><Button variant="workflowPrimary" type="button" onClick={() => { setFormError(''); setDraft(blank()); }}><Plus size={15} /> Adicionar pessoa</Button></div></div>
    {error && <InlineNotice>{error} <button type="button" className="v2-link-button" onClick={() => void load()}>Tentar de novo</button></InlineNotice>}
    <div className="v2-staff-profiles">
      <article><small>ADMINISTRADORA</small><strong>Patricia · acesso completo</strong><p>Vê e faz tudo. Aprova relatórios, entregas e horas antes de chegarem ao cliente.</p></article>
      <article><small>PARTNER</small><strong>Apoio operacional</strong><p>Vê só as empresas e os módulos que você atribuir. Não vê Propostas, Auditoria, valores nem dados salariais. O que vai para o cliente passa por você.</p></article>
    </div>
    {pending.length > 0 && <section className="v2-staff-queue"><header><div><small>PARA VOCÊ APROVAR</small><h2>{pending.length} {pending.length === 1 ? 'item aguardando a sua decisão' : 'itens aguardando a sua decisão'}</h2><p>Nada disto chegou ao cliente. Horas aprovadas viram lançamento oficial; material aprovado continua com você para enviar.</p></div></header>
      <div className="wf-records">{pending.map((item) => <div className="wf-record-row" key={item.kind + item.id}><span className="wf-tag wait">{item.meta}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><div><small>Quem enviou</small><span>{staff.find((person) => person.user_id === item.staff_user_id)?.full_name || 'Partner'}</span></div><div><small>Empresa</small><span>{companyName.get(item.company_id) || '—'}</span></div><div className="v2-staff-queue-actions"><Button type="button" variant="workflowSecondary" onClick={() => { setDecisionError(''); setDecision({ item, approve: false, note: '' }); }}><Undo2 size={14} /> {item.kind === 'hours' ? 'Recusar' : 'Devolver'}</Button><Button type="button" variant="workflowPrimary" onClick={() => { setDecisionError(''); setDecision({ item, approve: true, note: '' }); }}><Check size={14} /> Aprovar</Button></div></div>)}</div></section>}
    {loading ? <LoadingState>Carregando equipe…</LoadingState> : staff.length ? <div className="wf-records v2-staff-list">{staff.map((person) => <div className="wf-record-row" key={person.id}>
      <span className="avatar">{person.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</span>
      <div><strong>{person.full_name}</strong><small>{person.email}</small></div>
      <div><small>Empresas</small><span>{(assigned[person.id] || []).map((id) => companyName.get(id)).filter(Boolean).join(', ') || 'Nenhuma'}</span></div>
      <div><small>Módulos</small><span>{person.modules.map((key) => moduleName.get(key) || key).join(', ') || 'Nenhum'}</span></div>
      <div><small>Último acesso</small><span>{person.user_id && sessions[person.user_id]?.in ? momentLabel(sessions[person.user_id].in!) : 'Ainda não entrou'}</span><small>{person.user_id && sessions[person.user_id]?.out && sessions[person.user_id].out! > (sessions[person.user_id].in || '') ? `Saiu ${momentLabel(sessions[person.user_id].out!)}` : person.user_id && sessions[person.user_id]?.in ? 'Sem saída registrada depois' : ''}</small></div>
      <div><small>Situação</small><span className={`wf-tag ${!person.active ? 'off' : person.accepted_at ? 'ok' : 'wait'}`}>{!person.active ? 'Desativada' : person.accepted_at ? `Ativa desde ${dayLabel(person.accepted_at)}` : 'Cadastro preparado'}</span></div>
      <span className="v2-staff-row-actions"><button type="button" className="v2-row-icon" disabled={inviting === person.id || !person.active} title="Enviar convite de acesso" aria-label={`Enviar convite para ${person.full_name}`} onClick={() => void sendInvite(person)}><Mail size={15} /></button><button type="button" className="v2-row-icon" title="Editar" aria-label={`Editar ${person.full_name}`} onClick={() => { setFormError(''); setDraft({ id: person.id, email: person.email, full_name: person.full_name, modules: person.modules, companies: assigned[person.id] || [], active: person.active }); }}><Pencil size={15} /></button></span>
    </div>)}</div> : <div className="v2-staff-empty"><strong>Nenhuma pessoa cadastrada na Equipe CALI.</strong><p>Clique em “Adicionar pessoa” para preparar o cadastro do seu Partner.</p></div>}
    <InlineNotice className="v2-staff-stage"><strong>Como a pessoa entra:</strong> ao salvar o cadastro, ela recebe um convite por e-mail com o endereço do Workspace. Lá ela informa o e-mail e recebe um código, igual aos clientes. Para reenviar o convite, use o ícone de carta na linha da pessoa. No primeiro acesso ela vê as boas-vindas da Equipe CALI. Para tirar o acesso, edite a pessoa e desmarque “Cadastro ativo”.</InlineNotice>

    {invite && <div className="wf-overlay" onMouseDown={() => setInvite(null)}><DialogFrame className="wf-modal v2-staff-form v2-staff-decision" aria-label="Convite" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>CONVITE DE ACESSO</small><h2>{invite.sent ? 'Convite enviado' : 'Envie o convite'}</h2></div><button type="button" onClick={() => setInvite(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body">{invite.sent
        ? <p className="v2-staff-decision-effect"><strong>{invite.name}</strong> recebeu um e-mail em <strong>{invite.email}</strong> com o endereço do Workspace e o passo a passo para entrar com código.</p>
        : <><InlineNotice className="v2-staff-stage"><strong>O envio automático não funcionou agora.</strong> O cadastro está salvo e a pessoa já consegue entrar. Envie o convite abaixo pelo seu e-mail ou copie o texto.</InlineNotice><pre className="v2-staff-invite-text">{inviteText(invite.name, invite.email)}</pre></>}</div>
      <footer>{!invite.sent && <><Button type="button" variant="workflowSecondary" onClick={() => { void navigator.clipboard?.writeText(inviteText(invite.name, invite.email)); }}>Copiar texto</Button><a className="wf-primary" href={`mailto:${invite.email}?subject=${encodeURIComponent('Você faz parte da Equipe CALI: seu acesso ao Workspace')}&body=${encodeURIComponent(inviteText(invite.name, invite.email))}`}>Abrir no meu e-mail</a></>}{invite.sent && <Button type="button" variant="workflowPrimary" onClick={() => setInvite(null)}>Fechar</Button>}</footer>
    </DialogFrame></div>}
    {decision && <div className="wf-overlay" onMouseDown={() => setDecision(null)}><DialogForm className="wf-modal v2-staff-form v2-staff-decision" aria-label="Decisão" onSubmit={decide} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>{decision.item.meta.toUpperCase()}</small><h2>{decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar lançamento' : 'Devolver para ajuste'}</h2></div><button type="button" onClick={() => setDecision(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body"><div className="v2-staff-decision-item"><strong>{decision.item.title}</strong><small>{decision.item.detail}</small></div>
        <p className="v2-staff-decision-effect">{decision.approve ? (decision.item.kind === 'hours' ? 'Ao aprovar, as horas entram no controle de horas da empresa como lançamento manual, com o nome de quem lançou e a justificativa guardados na nota interna. Elas ficam ocultas do cliente até você marcar como visíveis em Horas.' : decision.item.reviewKind === 'change' ? `Ao aprovar, ${CHANGE_EFFECT[decision.item.payload?.action] || 'a alteração é aplicada'} agora, como se você mesma tivesse feito.` : decision.item.reviewKind === 'record_close' ? 'Ao aprovar, a ocorrência é finalizada agora e o cliente é avisado, como quando você clica em Finalizar.' : decision.item.reviewKind === 'deliverable' && decision.item.entityId ? 'Ao aprovar, o entregável é enviado agora ao cliente para validação, como quando você clica em Enviar ao cliente.' : 'Ao aprovar, a pessoa é avisada de que o material está liberado. O envio ao cliente continua sendo feito por você.') : decision.item.reviewKind === 'record_close' ? 'A ocorrência continua aberta e a pessoa verá o seu motivo.' : 'A pessoa verá o seu motivo e poderá corrigir e enviar de novo.'}</p>
        <div className="v2-staff-fields one"><label>{decision.approve ? 'Recado (opcional)' : 'Motivo (obrigatório)'}<input value={decision.note} onChange={(event) => setDecision({ ...decision, note: event.target.value })} autoFocus /></label></div>
        {decisionError && <InlineNotice className="v2-staff-error" role="alert">{decisionError}</InlineNotice>}</div>
      <footer><Button type="button" variant="workflowSecondary" onClick={() => setDecision(null)}>Cancelar</Button><Button type="submit" variant="workflowPrimary" disabled={deciding}>{deciding ? 'Registrando…' : decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar' : 'Devolver'}</Button></footer>
    </DialogForm></div>}
    {draft && <div className="wf-overlay" onMouseDown={() => setDraft(null)}><DialogForm className="wf-modal v2-staff-form" aria-label={draft.id ? 'Editar pessoa da equipe' : 'Adicionar pessoa à equipe'} onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>EQUIPE CALI · PARTNER</small><h2>{draft.id ? 'Editar pessoa' : 'Adicionar pessoa'}</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="Fechar"><X size={16} /></button></header>
      <div className="v2-staff-body">
        <div className="v2-staff-fields"><label>Nome completo<input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} autoFocus /></label><label>E-mail de acesso<input type="email" value={draft.email} disabled={Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label></div>
        <fieldset><legend>Empresas que esta pessoa atende</legend><div className="v2-staff-checks">{companies.map((item) => <label key={item.id}><input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft, companies: toggle(draft.companies, item.id) })} /><span>{item.display_name}</span></label>)}</div></fieldset>
        <fieldset><legend>O que ela pode fazer</legend><div className="v2-staff-checks modules">{STAFF_MODULES.map(([key, label, hint]) => <label key={key}><input type="checkbox" checked={draft.modules.includes(key)} onChange={() => setDraft({ ...draft, modules: toggle(draft.modules, key) })} /><span><b>{label}</b><small>{hint}</small></span></label>)}</div></fieldset>
        {draft.id && <label className="v2-staff-active"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>Cadastro ativo</span></label>}
        {formError && <InlineNotice className="v2-staff-error" role="alert">{formError}</InlineNotice>}
      </div>
      <footer><Button type="button" variant="workflowSecondary" onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" variant="workflowPrimary" disabled={saving}>{saving ? 'Salvando…' : draft.id ? 'Salvar alterações' : 'Salvar cadastro'}</Button></footer>
    </DialogForm></div>}
  </div></div></div></Shell>;
}
