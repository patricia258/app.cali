import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { StatusBadge } from '../../../components/ds/StatusBadge';
import { WorkflowDialogOverlay } from '../../../components/ds/WorkflowDialog';
import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { WorkflowList, WorkflowListRow } from '../../../components/ds/WorkflowList';
import { isJsonObject } from '../../../domain/json';
import { errorMessage } from '../../../lib/errorMessage';
import { StaffDialog, StaffDialogBody, StaffDialogFields, StaffDialogFooter, StaffDialogForm, StaffDialogHeader } from '../../../components/workspace/StaffDialog';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useState, type FormEvent } from 'react';
import { Check, Mail, Pencil, Plus, Undo2 } from 'lucide-react';
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
type Pending = { id: string; kind: 'hours' | 'review'; reviewKind?: string; entityId?: string | null; payload?: Parameters<typeof decideStaffSubmission>[0]['payload']; staff_user_id: string; company_id: string; title: string; detail: string; meta: string; created_at: string };
type Decision = { item: Pending; approve: boolean; note: string };
const REVIEW_KINDS: Record<string, string> = { report: 'Relatório', deliverable: 'Entrega', document: 'Documento', notice: 'Comunicado', other: 'Outro', record_close: 'Encerrar ocorrência', change: 'Alteração em projeto' };
const CHANGE_EFFECT: Record<string, string> = { project_create: 'o projeto é criado como rascunho, com as frentes informadas', front_create: 'a frente é criada no projeto', deliverable_create: 'o entregável é criado como “Não iniciado”', deliverable_update: 'o entregável é alterado com os novos dados', deliverable_delete: 'o entregável é excluído', deliverable_cancel: 'o entregável é cancelado, com o motivo informado', task_create: 'a etapa é criada no entregável', task_complete: 'a etapa é marcada como concluída' };
function changeEffect(payload: Pending['payload'], fallback: string) {
  return isJsonObject(payload) && typeof payload.action === 'string' ? CHANGE_EFFECT[payload.action] || fallback : fallback;
}
const blank = (): StaffDraft => ({ id: null, email: '', full_name: '', modules: ['records', 'projects', 'hours'], companies: [], active: true });
const momentLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.', '');
const dayLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

const profileCard = 'tw:flex tw:flex-col tw:gap-[.46rem] tw:rounded-[.69rem] tw:border tw:border-t-[.23rem] tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:px-[1.38rem] tw:py-[1.23rem] tw:[&>small]:text-[.77rem] tw:[&>small]:font-extrabold tw:[&>small]:tracking-[.092rem] tw:[&>small]:text-[#af8f72] tw:[&>strong]:text-[1.08rem] tw:[&>strong]:text-[#322f2c] tw:[&>p]:m-0 tw:[&>p]:text-[.92rem] tw:[&>p]:leading-[1.55] tw:[&>p]:text-[#8c7e74]';
const rowText = 'tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:flex-col tw:[&>div]:gap-[.23rem] tw:[&>div]:text-[.85rem] tw:[&>div]:text-[#322f2c] tw:[&_strong]:text-[.92rem] tw:[&_small]:text-[.77rem] tw:[&_small]:text-[#96867c]';
const rowIcon = 'tw:grid tw:size-[2.46rem] tw:cursor-pointer tw:place-items-center tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-45';
const reviewButton = 'tw:inline-flex tw:h-[2.62rem] tw:items-center tw:gap-[.46rem] tw:rounded-[.54rem] tw:px-[.92rem] tw:text-[.85rem] tw:font-bold';
const warningClass = 'tw:mt-[1.38rem] tw:border tw:border-solid tw:border-[#ecd9b0] tw:bg-[#fffaf1] tw:leading-[1.55] tw:text-[#7a5a2c]';
const errorClass = 'tw:border tw:border-solid tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]';
const staffChecks = 'tw:grid tw:grid-cols-2 tw:gap-[.62rem] tw:[@media(max-width:860px)]:grid-cols-1 tw:[&>label:has(input:checked)]:border-cali-brand tw:[&>label:has(input:checked)]:bg-[#fbf5f6] tw:[&_span]:flex tw:[&_span]:min-w-0 tw:[&_span]:flex-col tw:[&_span]:gap-[.23rem] tw:[&_small]:text-[.77rem] tw:[&_small]:leading-[1.45] tw:[&_small]:text-[#8c7e74]';
const checkLabel = 'tw:flex tw:cursor-pointer tw:items-start tw:gap-[.69rem] tw:rounded-[.62rem] tw:border tw:border-solid tw:border-[#eadfd8] tw:bg-white tw:px-[.92rem] tw:py-[.77rem] tw:text-[.92rem] tw:text-[#322f2c] tw:[&>input]:mx-0 tw:[&>input]:mt-[.15rem] tw:[&>input]:mb-0 tw:[&>input]:flex-none tw:[&>input]:accent-cali-brand';

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
      ...result.reviews.map((row) => ({ id: row.id, kind: 'review' as const, staff_user_id: row.staff_user_id, company_id: row.company_id, reviewKind: row.kind, entityId: row.entity_id, payload: row.payload, title: row.title, detail: row.kind === 'change' ? `Se você aprovar, ${changeEffect(row.payload, 'a alteração é aplicada')}.${row.payload?.reason ? ` Motivo informado: ${row.payload.reason}` : ''}` : row.kind === 'record_close' ? (row.note || 'A pessoa considera esta ocorrência resolvida e pede o encerramento.') : (row.note || 'Sem recado.'), meta: REVIEW_KINDS[row.kind] || row.kind, created_at: row.created_at })),
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
    } catch (err) { const message = errorMessage(err, ''); setFormError(/duplicate|unique/i.test(message) ? 'Já existe uma pessoa cadastrada com este e-mail.' : 'Não foi possível salvar. Tente de novo.'); } finally { setSaving(false); }
  }
  const companyName = new Map(companies.map((item) => [item.id, item.display_name]));
  const moduleName = new Map(STAFF_MODULES.map(([key, label]) => [key, label]));

  return <Shell role="admin"><WorkspaceAdminPage className="v2-client-module"><WorkspaceAdminContent><WorkflowPage>
    <WorkflowHeading><div><small>BACKOFFICE / CALI RH</small><h1>Equipe CALI</h1><p>Quem trabalha com você no perfil Partner, quais empresas atende e o que pode fazer. Para o cliente, quem está à frente continua sendo você.</p></div><div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="workflowPrimary" type="button" onClick={() => { setFormError(''); setDraft(blank()); }}><Plus size={15} /> Adicionar pessoa</Button></div></WorkflowHeading>
    {error && <InlineNotice>{error} <button type="button" className="v2-link-button tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:no-underline" onClick={() => void load()}>Tentar de novo</button></InlineNotice>}
    <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-2 tw:gap-[1.23rem] tw:[@media(max-width:860px)]:grid-cols-1">
      <article className={`${profileCard} tw:border-t-cali-brand`}><small>ADMINISTRADORA</small><strong>Patricia · acesso completo</strong><p>Vê e faz tudo. Aprova relatórios, entregas e horas antes de chegarem ao cliente.</p></article>
      <article className={`${profileCard} tw:border-t-cali-gold`}><small>PARTNER</small><strong>Apoio operacional</strong><p>Vê só as empresas e os módulos que você atribuir. Não vê Propostas, Auditoria, valores nem dados salariais. O que vai para o cliente passa por você.</p></article>
    </div>
    {pending.length > 0 && <section className="tw:mb-[1.23rem] tw:flex tw:flex-col tw:gap-[1.08rem] tw:rounded-[.77rem] tw:border tw:border-l-[.31rem] tw:border-solid tw:border-[#ecd9b0] tw:border-l-[#d9a441] tw:bg-[#fffaf1] tw:px-[1.54rem] tw:py-[1.38rem]"><header><div><small className="tw:text-[.77rem] tw:font-extrabold tw:tracking-[.092rem] tw:text-[#a66a00]">PARA VOCÊ APROVAR</small><h2 className="tw:my-[.38rem] tw:text-[1.23rem] tw:text-[#322f2c]">{pending.length} {pending.length === 1 ? 'item aguardando a sua decisão' : 'itens aguardando a sua decisão'}</h2><p className="tw:m-0 tw:text-[.92rem] tw:leading-[1.55] tw:text-[#6f5c45]">Nada disto chegou ao cliente. Horas aprovadas viram lançamento oficial; material aprovado continua com você para enviar.</p></div></header>
      <WorkflowList>{pending.map((item) => <WorkflowListRow className={`tw:cursor-default tw:grid-cols-[13.54rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]! tw:items-center tw:gap-[1.08rem] tw:[@media(max-width:860px)]:grid-cols-1! ${rowText}`} key={item.kind + item.id}><StatusBadge variant="workflow" className="tw:justify-self-start tw:bg-[#fff4de] tw:tracking-normal tw:text-[#9b6c21]">{item.meta}</StatusBadge><div><strong>{item.title}</strong><small>{item.detail}</small></div><div><small>Quem enviou</small><span>{staff.find((person) => person.user_id === item.staff_user_id)?.full_name || 'Partner'}</span></div><div><small>Empresa</small><span>{companyName.get(item.company_id) || '—'}</span></div><div className="tw:flex tw:flex-row! tw:items-center tw:gap-[.62rem]!"><Button className={reviewButton} type="button" variant="workflowSecondary" onClick={() => { setDecisionError(''); setDecision({ item, approve: false, note: '' }); }}><Undo2 size={14} /> {item.kind === 'hours' ? 'Recusar' : 'Devolver'}</Button><Button className={reviewButton} type="button" variant="workflowPrimary" onClick={() => { setDecisionError(''); setDecision({ item, approve: true, note: '' }); }}><Check size={14} /> Aprovar</Button></div></WorkflowListRow>)}</WorkflowList></section>}
    {loading ? <LoadingState>Carregando equipe…</LoadingState> : staff.length ? <WorkflowList>{staff.map((person) => <WorkflowListRow className={`tw:cursor-default tw:grid-cols-[2.92rem_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.9fr)_auto]! tw:items-center tw:gap-[1.08rem] tw:[@media(max-width:1100px)]:grid-cols-[2.92rem_minmax(0,1fr)_auto]! tw:[@media(max-width:1100px)]:[&>div:nth-of-type(n+2)]:col-start-2 ${rowText}`} key={person.id}>
      <span className="tw:grid tw:size-[2.62rem] tw:place-items-center tw:rounded-[.54rem] tw:bg-[#f3ece6] tw:text-[.85rem] tw:font-bold tw:text-cali-brand">{person.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</span>
      <div><strong>{person.full_name}</strong><small>{person.email}</small></div>
      <div><small>Empresas</small><span>{(assigned[person.id] || []).map((id) => companyName.get(id)).filter(Boolean).join(', ') || 'Nenhuma'}</span></div>
      <div><small>Módulos</small><span>{person.modules.map((key) => moduleName.get(key) || key).join(', ') || 'Nenhum'}</span></div>
      <div><small>Último acesso</small><span>{person.user_id && sessions[person.user_id]?.in ? momentLabel(sessions[person.user_id].in!) : 'Ainda não entrou'}</span><small>{person.user_id && sessions[person.user_id]?.out && sessions[person.user_id].out! > (sessions[person.user_id].in || '') ? `Saiu ${momentLabel(sessions[person.user_id].out!)}` : person.user_id && sessions[person.user_id]?.in ? 'Sem saída registrada depois' : ''}</small></div>
      <div><small>Situação</small><StatusBadge variant="workflow" className={`tw:self-start ${!person.active ? 'tw:bg-[#f1ece8] tw:text-[#8c7e74]' : person.accepted_at ? 'tw:bg-[#e6f6ec] tw:text-[#31805a]' : 'tw:bg-[#fff4de] tw:text-[#9b6c21]'}`}>{!person.active ? 'Desativada' : person.accepted_at ? `Ativa desde ${dayLabel(person.accepted_at)}` : 'Cadastro preparado'}</StatusBadge></div>
      <span className="tw:inline-flex tw:items-center tw:gap-[.62rem]"><button type="button" className={rowIcon} disabled={inviting === person.id || !person.active} title="Enviar convite de acesso" aria-label={`Enviar convite para ${person.full_name}`} onClick={() => void sendInvite(person)}><Mail size={15} /></button><button type="button" className={rowIcon} title="Editar" aria-label={`Editar ${person.full_name}`} onClick={() => { setFormError(''); setDraft({ id: person.id, email: person.email, full_name: person.full_name, modules: person.modules, companies: assigned[person.id] || [], active: person.active }); }}><Pencil size={15} /></button></span>
    </WorkflowListRow>)}</WorkflowList> : <div className="tw:flex tw:flex-col tw:gap-[.46rem] tw:rounded-[.69rem] tw:border tw:border-dashed tw:border-[#e0d3c9] tw:bg-white tw:p-[2.15rem] tw:text-center tw:[&>strong]:text-[1rem] tw:[&>strong]:text-[#322f2c] tw:[&>p]:m-0 tw:[&>p]:text-[.92rem] tw:[&>p]:text-[#8c7e74]"><strong>Nenhuma pessoa cadastrada na Equipe CALI.</strong><p>Clique em “Adicionar pessoa” para preparar o cadastro do seu Partner.</p></div>}
    <InlineNotice className={warningClass}><strong>Como a pessoa entra:</strong> ao salvar o cadastro, ela recebe um convite por e-mail com o endereço do Workspace. Lá ela informa o e-mail e recebe um código, igual aos clientes. Para reenviar o convite, use o ícone de carta na linha da pessoa. No primeiro acesso ela vê as boas-vindas da Equipe CALI. Para tirar o acesso, edite a pessoa e desmarque “Cadastro ativo”.</InlineNotice>

    {invite && <WorkflowDialogOverlay  onMouseDown={() => setInvite(null)}><StaffDialog compact aria-label="Convite" onMouseDown={(event) => event.stopPropagation()}>
      <StaffDialogHeader onClose={() => setInvite(null)}><div><small>CONVITE DE ACESSO</small><h2>{invite.sent ? 'Convite enviado' : 'Envie o convite'}</h2></div></StaffDialogHeader>
      <StaffDialogBody>{invite.sent
        ? <p className="tw:m-0 tw:text-[.92rem] tw:leading-[1.55] tw:text-[#655a55]"><strong>{invite.name}</strong> recebeu um e-mail em <strong>{invite.email}</strong> com o endereço do Workspace e o passo a passo para entrar com código.</p>
        : <><InlineNotice className={warningClass}><strong>O envio automático não funcionou agora.</strong> O cadastro está salvo e a pessoa já consegue entrar. Envie o convite abaixo pelo seu e-mail ou copie o texto.</InlineNotice><pre className="tw:m-0 tw:rounded-[.62rem] tw:bg-[#faf6f2] tw:px-[1.08rem] tw:py-[.92rem] tw:[font-family:inherit] tw:text-[.92rem] tw:leading-[1.6] tw:whitespace-pre-wrap tw:text-[#322f2c]">{inviteText(invite.name, invite.email)}</pre></>}</StaffDialogBody>
      <StaffDialogFooter>{!invite.sent && <><Button type="button" variant="workflowSecondary" onClick={() => { void navigator.clipboard?.writeText(inviteText(invite.name, invite.email)); }}>Copiar texto</Button><a className="wf-primary tw:inline-flex tw:items-center tw:justify-center tw:rounded-[.54rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:text-white tw:no-underline" href={`mailto:${invite.email}?subject=${encodeURIComponent('Você faz parte da Equipe CALI: seu acesso ao Workspace')}&body=${encodeURIComponent(inviteText(invite.name, invite.email))}`}>Abrir no meu e-mail</a></>}{invite.sent && <Button type="button" variant="workflowPrimary" onClick={() => setInvite(null)}>Fechar</Button>}</StaffDialogFooter>
    </StaffDialog></WorkflowDialogOverlay>}
    {decision && <WorkflowDialogOverlay  onMouseDown={() => setDecision(null)}><StaffDialogForm compact aria-label="Decisão" onSubmit={decide} onMouseDown={(event) => event.stopPropagation()}>
      <StaffDialogHeader onClose={() => setDecision(null)}><div><small>{decision.item.meta.toUpperCase()}</small><h2>{decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar lançamento' : 'Devolver para ajuste'}</h2></div></StaffDialogHeader>
      <StaffDialogBody><div className="tw:flex tw:flex-col tw:gap-[.31rem] tw:rounded-[.62rem] tw:bg-[#faf6f2] tw:px-[1.08rem] tw:py-[.92rem] tw:text-[.92rem] tw:text-[#322f2c] tw:[&>small]:text-[.85rem] tw:[&>small]:text-[#8c7e74]"><strong>{decision.item.title}</strong><small>{decision.item.detail}</small></div>
        <p className="tw:m-0 tw:text-[.92rem] tw:leading-[1.55] tw:text-[#655a55]">{decision.approve ? (decision.item.kind === 'hours' ? 'Ao aprovar, as horas entram no controle de horas da empresa como lançamento manual, com o nome de quem lançou e a justificativa guardados na nota interna. Elas ficam ocultas do cliente até você marcar como visíveis em Horas.' : decision.item.reviewKind === 'change' ? `Ao aprovar, ${changeEffect(decision.item.payload, 'a alteração é aplicada')} agora, como se você mesma tivesse feito.` : decision.item.reviewKind === 'record_close' ? 'Ao aprovar, a ocorrência é finalizada agora e o cliente é avisado, como quando você clica em Finalizar.' : decision.item.reviewKind === 'deliverable' && decision.item.entityId ? 'Ao aprovar, o entregável é enviado agora ao cliente para validação, como quando você clica em Enviar ao cliente.' : 'Ao aprovar, a pessoa é avisada de que o material está liberado. O envio ao cliente continua sendo feito por você.') : decision.item.reviewKind === 'record_close' ? 'A ocorrência continua aberta e a pessoa verá o seu motivo.' : 'A pessoa verá o seu motivo e poderá corrigir e enviar de novo.'}</p>
        <StaffDialogFields columns={1}><label>{decision.approve ? 'Recado (opcional)' : 'Motivo (obrigatório)'}<input value={decision.note} onChange={(event) => setDecision({ ...decision, note: event.target.value })} autoFocus /></label></StaffDialogFields>
        {decisionError && <InlineNotice className={errorClass} role="alert">{decisionError}</InlineNotice>}</StaffDialogBody>
      <StaffDialogFooter><Button type="button" variant="workflowSecondary" onClick={() => setDecision(null)}>Cancelar</Button><Button type="submit" variant="workflowPrimary" disabled={deciding}>{deciding ? 'Registrando…' : decision.approve ? 'Aprovar' : decision.item.kind === 'hours' ? 'Recusar' : 'Devolver'}</Button></StaffDialogFooter>
    </StaffDialogForm></WorkflowDialogOverlay>}
    {draft && <WorkflowDialogOverlay  onMouseDown={() => setDraft(null)}><StaffDialogForm aria-label={draft.id ? 'Editar pessoa da equipe' : 'Adicionar pessoa à equipe'} onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
      <StaffDialogHeader onClose={() => setDraft(null)}><div><small>EQUIPE CALI · PARTNER</small><h2>{draft.id ? 'Editar pessoa' : 'Adicionar pessoa'}</h2></div></StaffDialogHeader>
      <StaffDialogBody>
        <StaffDialogFields><label>Nome completo<input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} autoFocus /></label><label>E-mail de acesso<input type="email" value={draft.email} disabled={Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label></StaffDialogFields>
        <fieldset><legend>Empresas que esta pessoa atende</legend><div className={staffChecks}>{companies.map((item) => <label className={checkLabel} key={item.id}><input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft, companies: toggle(draft.companies, item.id) })} /><span>{item.display_name}</span></label>)}</div></fieldset>
        <fieldset><legend>O que ela pode fazer</legend><div className={staffChecks}>{STAFF_MODULES.map(([key, label, hint]) => <label className={checkLabel} key={key}><input type="checkbox" checked={draft.modules.includes(key)} onChange={() => setDraft({ ...draft, modules: toggle(draft.modules, key) })} /><span><b>{label}</b><small>{hint}</small></span></label>)}</div></fieldset>
        {draft.id && <label className={checkLabel}><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>Cadastro ativo</span></label>}
        {formError && <InlineNotice className={errorClass} role="alert">{formError}</InlineNotice>}
      </StaffDialogBody>
      <StaffDialogFooter><Button type="button" variant="workflowSecondary" onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" variant="workflowPrimary" disabled={saving}>{saving ? 'Salvando…' : draft.id ? 'Salvar alterações' : 'Salvar cadastro'}</Button></StaffDialogFooter>
    </StaffDialogForm></WorkflowDialogOverlay>}
  </WorkflowPage></WorkspaceAdminContent></WorkspaceAdminPage></Shell>;
}
