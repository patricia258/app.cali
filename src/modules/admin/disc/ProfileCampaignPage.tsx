import { FormStatusBadge, type FormStatus } from '../../../components/forms/FormStatusBadge';
import { FormResultsTable } from '../../../components/forms/FormResultsTable';
/* Perfil Comportamental CALI — convites de um link (/admin/perfil-comportamental/convites/:linkId).
   Especificação "Prazos-Lembretes-Painel_v1": cada pessoa recebe um convite com prazo (data, não contagem regressiva),
   até 3 lembretes automáticos, saída em um clique; a empresa (ponto focal) recebe véspera e fechamento.
   Indicadores: resposta, abertura, conclusão, tempo mediano, expirados e bloco de abandono. Validade: 6 meses. */
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { useParams } from '../../../hooks/useParams';
import { ArrowLeft, BarChart3, CalendarClock, ExternalLink, RefreshCw, RotateCcw, Send, Trash2, UserPlus } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import {
  deliverDiscInvites, extendDiscCampaignDeadline, queueDiscInvites, readDiscCampaign,
  removeQueuedDiscInvite, renewDiscInvite, saveCampaignSettings,
} from '../../../api/disc/campaigns';

type LinkRow = { id: string; slug: string; title: string; company_id: string | null; company_label: string | null; purpose: string; status: 'open' | 'closed'; deadline_days: number; deadline_log: Array<{ at: string; to: string; reason: string; invites: number }>; focal_name: string | null; focal_email: string | null };
type InviteState = 'created' | 'sent' | 'opened' | 'started' | 'completed' | 'expired' | 'declined';
type InviteRow = { id: string; person_name: string; email: string; team_member_id: string | null; cycle: number; previous_invite_id: string | null; created_at: string; sent_at: string | null; deadline_at: string | null; opened_at: string | null; started_at: string | null; last_block: number | null; progress_at: string | null; completed_at: string | null; result_id: string | null; declined_at: string | null; reminder1_at: string | null; reminder2_at: string | null; reminder3_at: string | null; state: InviteState };
type Member = { id: string; full_name: string; work_email: string | null };

const TOTAL_BLOCKS = 24;
const STATE: Record<InviteState, { label: string; tone: FormStatus }> = {
  created: { label: 'Na fila', tone: 'draft' }, sent: { label: 'Aguardando resposta', tone: 'closed' }, opened: { label: 'Visualizado sem resposta', tone: 'draft' },
  started: { label: 'Parcial', tone: 'draft' }, completed: { label: 'Respondido', tone: 'open' }, expired: { label: 'Expirado', tone: 'closed' }, declined: { label: 'Recusou', tone: 'closed' },
};
const dateTime = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const dateOnly = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const plusMonths = (iso: string, months: number) => { const date = new Date(iso); date.setMonth(date.getMonth() + months); return date; };
const pct = (part: number, whole: number) => whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Nome; e-mail", "Nome, e-mail", "Nome <e-mail>" ou colunas coladas do Excel (tab). */
function parsePeople(text: string) {
  const people: Array<{ person_name: string; email: string }> = [], invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const email = line.match(/[^\s<>;,\t]+@[^\s<>;,\t]+\.[^\s<>;,\t]+/)?.[0] || '';
    const name = line.replace(email, '').replace(/[<>;,\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!EMAIL.test(email) || name.length < 2) invalid.push(line); else people.push({ person_name: name, email: email.toLowerCase() });
  }
  return { people, invalid };
}

export function ProfileCampaignPage() {
  const { linkId = '' } = useParams();
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const [link, setLink] = useState<LinkRow | null>(null);
  const [company, setCompany] = useState('');
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [settings, setSettings] = useState({ deadline_days: 7, focal_name: '', focal_email: '' });
  const [pasted, setPasted] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [extend, setExtend] = useState({ open: false, date: '', reason: '' });

  async function load() {
    setReferenceTime(Date.now());
    setLoading(true);
    const campaign = await readDiscCampaign(linkId);
    if (!campaign) { setMissing(true); setLoading(false); return; }
    const row = campaign.link as LinkRow;
    setLink(row);
    setSettings({ deadline_days: row.deadline_days, focal_name: row.focal_name || '', focal_email: row.focal_email || '' });
    if (campaign.invites.error) setNotice({ tone: 'error', text: campaign.invites.error.message });
    setInvites((campaign.invites.data || []) as InviteRow[]);
    setCompany(campaign.company || row.company_label || 'Link livre');
    setMembers(campaign.members.filter((member) => member.work_email && EMAIL.test(member.work_email)));
    setLoading(false);
  }
  useEffect(() => { document.title = 'Convites · Perfil comportamental · CALI RH'; void load(); }, [linkId]);

  const say = (text: string, tone: 'ok' | 'error' = 'ok') => setNotice({ tone, text });
  const queued = invites.filter((row) => row.state === 'created');
  const invitedEmails = useMemo(() => new Set(invites.map((row) => row.email.toLowerCase())), [invites]);
  const available = members.filter((member) => !invitedEmails.has(String(member.work_email).toLowerCase()));

  const metrics = useMemo(() => {
    const sent = invites.filter((row) => row.sent_at);
    const declined = sent.filter((row) => row.state === 'declined').length;
    const completed = sent.filter((row) => row.state === 'completed');
    const started = sent.filter((row) => row.started_at);
    const opened = sent.filter((row) => row.opened_at).length;
    const expired = sent.filter((row) => row.state === 'expired').length;
    const minutes = completed.filter((row) => row.started_at && row.completed_at).map((row) => (new Date(row.completed_at!).getTime() - new Date(row.started_at!).getTime()) / 60000).sort((a, b) => a - b);
    const median = minutes.length ? (minutes.length % 2 ? minutes[(minutes.length - 1) / 2] : (minutes[minutes.length / 2 - 1] + minutes[minutes.length / 2]) / 2) : null;
    const stops = sent.filter((row) => row.started_at && !row.completed_at && row.last_block).map((row) => row.last_block!);
    const counts = stops.reduce<Record<number, number>>((acc, block) => ({ ...acc, [block]: (acc[block] || 0) + 1 }), {});
    const stopBlock = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { sent: sent.length, declined, completed: completed.length, started: started.length, opened, expired, median, stopBlock, conclusion: started.length ? completed.length / started.length : null };
  }, [invites]);

  const nextDeadline = invites.filter((row) => row.deadline_at && ['sent', 'opened', 'started'].includes(row.state)).map((row) => row.deadline_at!).sort()[0];

  async function saveSettings() {
    if (!link) return;
    const days = Math.round(Number(settings.deadline_days));
    if (!(days >= 1 && days <= 60)) { say('O prazo padrão precisa ficar entre 1 e 60 dias.', 'error'); return; }
    if (settings.focal_email.trim() && !EMAIL.test(settings.focal_email.trim())) { say('Confira o e-mail do ponto focal.', 'error'); return; }
    setBusy('settings');
    const { error } = await saveCampaignSettings(link.id, { ...settings, deadline_days: days });
    setBusy('');
    if (error) { say(error.message, 'error'); return; }
    setLink({ ...link, deadline_days: days, focal_name: settings.focal_name.trim() || null, focal_email: settings.focal_email.trim().toLowerCase() || null });
    say('Configurações salvas.');
  }

  async function addPeople(people: Array<{ person_name: string; email: string; team_member_id?: string }>) {
    if (!link || !people.length) return;
    const fresh = people.filter((person) => !invitedEmails.has(person.email.toLowerCase()));
    const repeated = people.length - fresh.length;
    if (!fresh.length) { say(repeated === 1 ? 'Essa pessoa já está na lista.' : 'Essas pessoas já estão na lista.', 'error'); return; }
    setBusy('add');
    const { error } = await queueDiscInvites(link.id, fresh);
    setBusy('');
    if (error) { say(/duplicate|unique/i.test(error.message) ? 'Alguém da lista já tinha convite neste link.' : error.message, 'error'); return; }
    await load();
    say(`${fresh.length} ${fresh.length === 1 ? 'pessoa adicionada' : 'pessoas adicionadas'} à fila${repeated ? ` (${repeated} já estava${repeated === 1 ? '' : 'm'} na lista)` : ''}. Clique em "Enviar convites" para disparar.`);
  }

  async function addPasted() {
    const { people, invalid } = parsePeople(pasted);
    if (invalid.length) { say(`Confira ${invalid.length === 1 ? 'esta linha' : 'estas linhas'}: ${invalid.slice(0, 3).join(' | ')}${invalid.length > 3 ? '…' : ''}. Use "Nome; e-mail".`, 'error'); return; }
    if (!people.length) { say('Cole pelo menos uma pessoa: "Nome; e-mail", uma por linha.', 'error'); return; }
    await addPeople(people);
    setPasted('');
  }

  async function addPicked() {
    const people = available.filter((member) => picked.includes(member.id)).map((member) => ({ person_name: member.full_name, email: String(member.work_email).toLowerCase(), team_member_id: member.id }));
    await addPeople(people);
    setPicked([]);
  }

  async function sendQueued() {
    if (!link || !queued.length) return;
    setBusy('send');
    const { data, error } = await deliverDiscInvites(link.id);
    setBusy('');
    if (error) { say(error.message, 'error'); return; }
    const result = data as { sent: number; deadline_at: string };
    await load();
    say(`${result.sent} ${result.sent === 1 ? 'convite enviado' : 'convites enviados'}. Prazo: até ${dateTime(result.deadline_at)}.`);
  }

  async function removeQueued(row: InviteRow) {
    if (row.state !== 'created') return;
    const { error } = await removeQueuedDiscInvite(row.id);
    if (error) { say(error.message, 'error'); return; }
    setInvites((current) => current.filter((item) => item.id !== row.id));
  }

  async function renew(row: InviteRow) {
    const { error } = await renewDiscInvite(row.id);
    if (error) { say(error.message, 'error'); return; }
    await load();
    say(`Novo ciclo de ${row.person_name} na fila. O histórico anterior fica guardado.`);
  }

  async function saveExtension() {
    if (!link) return;
    if (!extend.date) { say('Escolha a nova data.', 'error'); return; }
    if (extend.reason.trim().length < 3) { say('Escreva o motivo da prorrogação: ele fica registrado.', 'error'); return; }
    setBusy('extend');
    const { data, error } = await extendDiscCampaignDeadline(link.id, extend.date, extend.reason);
    setBusy('');
    if (error) { say(error.message, 'error'); return; }
    setExtend({ open: false, date: '', reason: '' });
    await load();
    say(`Prazo prorrogado para ${(data as { updated: number }).updated} ${(data as { updated: number }).updated === 1 ? 'convite' : 'convites'} em aberto.`);
  }

  const reminders = (row: InviteRow) => [row.reminder1_at, row.reminder2_at, row.reminder3_at].filter(Boolean).length;
  const lastActivity = (row: InviteRow) => [row.completed_at, row.progress_at, row.opened_at, row.sent_at, row.declined_at].filter(Boolean).sort().pop();
  const validity = (row: InviteRow) => {
    if (!row.completed_at) return null;
    const until = plusMonths(row.completed_at, 6);
    const days = (until.getTime() - referenceTime) / 86400000;
    return { until, expired: days <= 0, soon: days > 0 && days <= 30 };
  };
  const renewed = (row: InviteRow) => invites.some((item) => item.previous_invite_id === row.id);

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module tw:[--fm-wine:#5a1e2d] tw:[--fm-line:#eadfd6] tw:[--fm-muted:#8c7e74]
    tw:[--fm-ink:#3e3533] tw:[&_.wf-head_.v2-head-actions_a]:no-underline tw:[&_label>span]:block
    tw:[&_label>span]:text-[0.846rem] tw:[&_label>span]:font-semibold tw:[&_label>span]:text-[color:var(--fm-ink)]
    tw:[&_label>span]:mb-[0.462rem] tw:[&_label>span_em]:not-italic tw:[&_label>span_em]:font-medium
    tw:[&_label>span_em]:text-[color:var(--fm-muted)] tw:[&_label>span_em]:ml-[0.308rem]    tw:[&_textarea]:resize-y tw:[&_:is(input,select,textarea):focus]:outline-none tw:[&_:is(input,select,textarea):focus]:[border-color:var(--fm-wine)]
    tw:[&_:is(input,select,textarea):focus]:[box-shadow:0_0_0_0.231rem_rgba(90,30,45,.08)]"><div className="ap-content"><div className="wf cpc tw:flex tw:flex-col tw:gap-[1.23rem]">
    <Link className="cpc-back tw:inline-flex tw:items-center tw:gap-[0.46rem] tw:self-start tw:text-[1rem] tw:font-semibold tw:text-cali-brand tw:no-underline" to="/admin/perfil-comportamental"><ArrowLeft size={15} /> Perfil comportamental</Link>
    {missing ? <EmptyState variant="workflow"><strong>Link não encontrado.</strong></EmptyState> : loading || !link ? <LoadingState>Carregando…</LoadingState> : <>
      <div className="wf-head"><div><small>CONVITES · {company.toUpperCase()}</small><h1>{link.title}</h1>
        <p>Cada pessoa recebe um convite com prazo de {link.deadline_days} dias, até 3 lembretes automáticos (em dia útil, das 8h às 18h) e um link para sair. {link.focal_email ? `${link.focal_name || 'O ponto focal'} recebe a véspera e o fechamento.` : 'Cadastre um ponto focal para a empresa receber a véspera e o fechamento.'}</p></div>
        <div className="v2-head-actions"><Button variant="formSecondary" type="button" onClick={() => void load()}><RefreshCw size={15} /> Atualizar</Button>
          <Link className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
            tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
            tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
            tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/gestao/${link.id}`}><BarChart3 size={15} /> Relatório de gestão</Link>
          <Button variant="workflowPrimary" type="button" disabled={!queued.length || busy === 'send' || link.status !== 'open'} onClick={() => void sendQueued()}><Send size={15} /> {busy === 'send' ? 'Enviando…' : `Enviar convites${queued.length ? ` (${queued.length})` : ''}`}</Button></div></div>

      <section className="cpc-metrics tw:grid tw:grid-cols-[1.3fr_repeat(5,1fr)] tw:gap-[0.92rem] tw:max-[1100px]:grid-cols-3
        tw:max-[640px]:grid-cols-2 tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:flex-col tw:[&>div]:gap-[0.31rem]
        tw:[&>div]:rounded-[0.92rem] tw:[&>div]:border tw:[&>div]:border-solid tw:[&>div]:border-[#eadfd6]
        tw:[&>div]:bg-white tw:[&>div]:p-[1.23rem] tw:[&>.main]:border-cali-brand tw:[&>.main]:bg-cali-brand
        tw:[&>.main_*]:text-white! tw:max-[640px]:[&>.main]:col-span-full tw:[&>.warn]:border-[#e9c46a]
        tw:[&>.warn]:bg-[#fff8e6] tw:[&_span]:text-[0.77rem] tw:[&_span]:font-bold tw:[&_span]:tracking-[0.08em]
        tw:[&_span]:text-[#8c7e74] tw:[&_span]:uppercase tw:[&_strong]:text-[2rem] tw:[&_strong]:leading-[1.1]
        tw:[&_strong]:font-bold tw:[&_strong]:text-[#3e3533] tw:[&_small]:text-[0.88rem] tw:[&_small]:leading-[1.35]
        tw:[&_small]:text-[#8c7e74]" aria-label="Indicadores">
        <div className="main"><span>Taxa de resposta</span><strong>{pct(metrics.completed, metrics.sent - metrics.declined)}</strong><small>{metrics.completed} de {metrics.sent - metrics.declined} convites válidos</small></div>
        <div><span>Abertura</span><strong>{pct(metrics.opened, metrics.sent)}</strong><small>abriram o link</small></div>
        <div className={metrics.conclusion !== null && metrics.conclusion < 0.8 ? 'warn' : ''}><span>Conclusão</span><strong>{metrics.conclusion === null ? '—' : `${Math.round(metrics.conclusion * 100)}%`}</strong><small>{metrics.conclusion !== null && metrics.conclusion < 0.8 ? 'abaixo de 80%: questionário cansativo' : 'de quem começou'}</small></div>
        <div className={metrics.median !== null && metrics.median < 8 ? 'warn' : ''}><span>Tempo mediano</span><strong>{metrics.median === null ? '—' : `${Math.round(metrics.median)} min`}</strong><small>{metrics.median !== null && metrics.median < 8 ? 'muito rápido: confira antes de usar' : 'do início ao envio'}</small></div>
        <div><span>Expirados</span><strong>{pct(metrics.expired, metrics.sent)}</strong><small>{metrics.expired} sem resposta no prazo</small></div>
        <div><span>Bloco de abandono</span><strong>{metrics.stopBlock ? `${metrics.stopBlock[0]} de ${TOTAL_BLOCKS}` : '—'}</strong><small>{metrics.stopBlock ? `${metrics.stopBlock[1]} ${metrics.stopBlock[1] === 1 ? 'pessoa parou' : 'pessoas pararam'} aqui` : 'onde as paradas se concentram'}</small></div>
      </section>

      <div className="cpc-grid tw:grid tw:grid-cols-2 tw:items-start tw:gap-[1.23rem] tw:max-[1100px]:grid-cols-1">
        <section className="cpc-card tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.92rem] tw:rounded-[0.92rem] tw:border tw:border-solid
          tw:border-[#eadfd6] tw:bg-white tw:p-[1.38rem] tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center
          tw:[&_h2]:gap-[0.62rem] tw:[&_h2]:text-[1.15rem] tw:[&_h2]:font-bold tw:[&_h2]:text-cali-brand
          tw:[&_label]:flex tw:[&_label]:min-w-0 tw:[&_label]:flex-col tw:[&_label]:gap-[0.46rem] tw:[&_label]:text-[0.92rem]
          tw:[&_label]:font-semibold tw:[&_label]:text-[#3e3533] tw:[&_:is(input:not([type=checkbox]),textarea)]:w-full
          tw:[&_:is(input:not([type=checkbox]),textarea)]:rounded-[0.62rem] tw:[&_:is(input:not([type=checkbox]),textarea)]:border
          tw:[&_:is(input:not([type=checkbox]),textarea)]:border-solid tw:[&_:is(input:not([type=checkbox]),textarea)]:border-[#e3d6cc]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:bg-white tw:[&_:is(input:not([type=checkbox]),textarea)]:px-[0.85rem]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:py-[0.69rem] tw:[&_:is(input:not([type=checkbox]),textarea)]:text-[1rem]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:font-normal tw:[&_textarea]:resize-y tw:[&_textarea]:leading-normal">
          <h2><CalendarClock size={16} /> Prazo e ponto focal</h2>
          <p className="cpc-muted tw:m-0 tw:text-[0.96rem] tw:leading-normal tw:text-[#8c7e74]">{nextDeadline ? <>Convites em aberto fecham <b>{dateTime(nextDeadline)}</b>.</> : 'O prazo começa a contar quando os convites são enviados.'}</p>
          <div className="cpc-fields tw:grid tw:grid-cols-[11.54rem_1fr_1fr] tw:gap-[0.77rem] tw:max-[640px]:grid-cols-1">
            <label>Prazo padrão (dias)<input type="number" min={1} max={60} value={settings.deadline_days} onChange={(event) => setSettings({ ...settings, deadline_days: Number(event.target.value) })} /></label>
            <label>Ponto focal da empresa<input value={settings.focal_name} placeholder="Nome" maxLength={120} onChange={(event) => setSettings({ ...settings, focal_name: event.target.value })} /></label>
            <label>E-mail do ponto focal<input type="email" value={settings.focal_email} placeholder="nome@empresa.com" onChange={(event) => setSettings({ ...settings, focal_email: event.target.value })} /></label>
          </div>
          <div className="cpc-row tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.62rem]"><Button type="button" variant="formSecondary" disabled={busy === 'settings'} onClick={() => void saveSettings()}>{busy === 'settings' ? 'Salvando…' : 'Salvar'}</Button>
            {metrics.sent > 0 && !extend.open && <Button type="button" variant="formSecondary" onClick={() => setExtend({ ...extend, open: true })}>Prorrogar prazo</Button>}</div>
          {extend.open && <div className="cpc-extend tw:flex tw:flex-col tw:gap-[0.77rem] tw:rounded-[0.77rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-[#fbf7f3] tw:p-[1.08rem]">
            <label>Nova data final<input type="date" value={extend.date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExtend({ ...extend, date: event.target.value })} /></label>
            <label>Motivo (fica registrado)<input value={extend.reason} maxLength={240} placeholder="Ex.: pedido da diretoria por causa do fechamento do mês" onChange={(event) => setExtend({ ...extend, reason: event.target.value })} /></label>
            <div className="cpc-row tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.62rem]"><Button type="button" variant="formSecondary" onClick={() => setExtend({ open: false, date: '', reason: '' })}>Cancelar</Button><Button type="button" variant="workflowPrimary" disabled={busy === 'extend'} onClick={() => void saveExtension()}>{busy === 'extend' ? 'Salvando…' : 'Prorrogar'}</Button></div>
          </div>}
          {!!link.deadline_log?.length && <ul className="cpc-log tw:m-0 tw:pl-[1.38rem] tw:text-[0.92rem] tw:leading-[1.6] tw:text-[#6b5d63]">{link.deadline_log.map((item) => <li key={item.at}><b>{dateOnly(item.at)}</b> · prorrogado até {dateOnly(item.to)} ({item.invites} {item.invites === 1 ? 'convite' : 'convites'}): {item.reason}</li>)}</ul>}
        </section>

        <section className="cpc-card tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.92rem] tw:rounded-[0.92rem] tw:border tw:border-solid
          tw:border-[#eadfd6] tw:bg-white tw:p-[1.38rem] tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center
          tw:[&_h2]:gap-[0.62rem] tw:[&_h2]:text-[1.15rem] tw:[&_h2]:font-bold tw:[&_h2]:text-cali-brand
          tw:[&_label]:flex tw:[&_label]:min-w-0 tw:[&_label]:flex-col tw:[&_label]:gap-[0.46rem] tw:[&_label]:text-[0.92rem]
          tw:[&_label]:font-semibold tw:[&_label]:text-[#3e3533] tw:[&_:is(input:not([type=checkbox]),textarea)]:w-full
          tw:[&_:is(input:not([type=checkbox]),textarea)]:rounded-[0.62rem] tw:[&_:is(input:not([type=checkbox]),textarea)]:border
          tw:[&_:is(input:not([type=checkbox]),textarea)]:border-solid tw:[&_:is(input:not([type=checkbox]),textarea)]:border-[#e3d6cc]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:bg-white tw:[&_:is(input:not([type=checkbox]),textarea)]:px-[0.85rem]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:py-[0.69rem] tw:[&_:is(input:not([type=checkbox]),textarea)]:text-[1rem]
          tw:[&_:is(input:not([type=checkbox]),textarea)]:font-normal tw:[&_textarea]:resize-y tw:[&_textarea]:leading-normal">
          <h2><UserPlus size={16} /> Adicionar pessoas</h2>
          <label className="cpc-paste tw:[&_span]:font-medium tw:[&_span]:text-[#6b5d63] tw:[&_b]:font-bold tw:[&_b]:text-[#3e3533]"><span>Uma pessoa por linha, no formato <b>Nome; e-mail</b>. Pode colar direto do Excel.</span>
            <textarea rows={4} value={pasted} placeholder={'Maria Souza; maria@empresa.com\nJoão Lima; joao@empresa.com'} onChange={(event) => setPasted(event.target.value)} /></label>
          <div className="cpc-row tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.62rem]"><Button type="button" variant="formSecondary" disabled={!pasted.trim() || busy === 'add'} onClick={() => void addPasted()}>Adicionar à fila</Button></div>
          {!!available.length && <div className="cpc-team tw:flex tw:flex-col tw:gap-[0.62rem] tw:border-t tw:border-solid tw:border-[#f1e9e2] tw:pt-[0.92rem]">
            <p className="cpc-muted tw:m-0 tw:text-[0.96rem] tw:leading-normal tw:text-[#8c7e74]">Equipe cadastrada de {company} ({available.length} sem convite)</p>
            <div className="cpc-team-list tw:flex tw:max-h-[16.92rem] tw:flex-col tw:gap-[0.15rem] tw:overflow-auto tw:[scrollbar-width:none]
              tw:[&_label]:cursor-pointer tw:[&_label]:flex-row! tw:[&_label]:items-center tw:[&_label]:gap-[0.77rem]!
              tw:[&_label]:rounded-[0.62rem] tw:[&_label]:px-[0.62rem] tw:[&_label]:py-[0.54rem] tw:[&_label]:font-medium!
              tw:[&_label:hover]:bg-[#fbf7f3] tw:[&_input]:size-[1.23rem] tw:[&_input]:accent-cali-brand tw:[&_span]:flex
              tw:[&_span]:flex-col tw:[&_span]:text-[1rem] tw:[&_small]:text-[0.85rem] tw:[&_small]:text-[#8c7e74]">{available.map((member) => <label key={member.id}><input type="checkbox" checked={picked.includes(member.id)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} /><span>{member.full_name}<small>{member.work_email}</small></span></label>)}</div>
            <div className="cpc-row tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.62rem]"><button type="button" className="cpc-link tw:mr-auto tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-[0.92rem] tw:font-semibold tw:text-cali-brand" onClick={() => setPicked(picked.length === available.length ? [] : available.map((member) => member.id))}>{picked.length === available.length ? 'Desmarcar todos' : 'Marcar todos'}</button><Button type="button" variant="formSecondary" disabled={!picked.length || busy === 'add'} onClick={() => void addPicked()}>Adicionar selecionados ({picked.length})</Button></div>
          </div>}
        </section>
      </div>

      {!invites.length ? <EmptyState variant="workflow"><strong>Nenhum convite ainda.</strong><p>Adicione as pessoas acima e clique em &quot;Enviar convites&quot;.</p></EmptyState>
        : <FormResultsTable><thead><tr><th>Pessoa</th><th>Situação</th><th>Prazo</th><th>Lembretes</th><th>Última atividade</th><th>Validade</th><th /></tr></thead><tbody>
          {invites.map((row) => { const valid = validity(row); return <tr key={row.id}>
            <td><span className="cpa-person tw:flex tw:flex-col tw:gap-[0.15rem] tw:text-inherit tw:no-underline tw:[&_strong]:text-[1rem]
              tw:[&_strong]:text-[#3e3533] tw:[&_small]:text-[0.85rem] tw:[&_small]:text-[#8c7e74]"><strong>{row.person_name}{row.cycle > 1 ? ` · ciclo ${row.cycle}` : ''}</strong><small>{row.email}</small></span></td>
            <td><FormStatusBadge status={STATE[row.state].tone}>{STATE[row.state].label}{(row.state === 'started' || (row.state === 'expired' && row.started_at)) && row.last_block ? ` · parou no bloco ${row.last_block}` : ''}</FormStatusBadge></td>
            <td className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">{row.deadline_at ? dateTime(row.deadline_at) : '—'}</td>
            <td className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">{row.sent_at ? `${reminders(row)} de 3` : '—'}</td>
            <td className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">{lastActivity(row) ? dateTime(lastActivity(row)!) : '—'}</td>
            <td>{valid ? <FormStatusBadge status={valid.expired ? 'closed' : valid.soon ? 'draft' : 'open'}>{valid.expired ? 'Vencido' : `Vigente até ${dateOnly(valid.until.toISOString())}`}</FormStatusBadge> : <span className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">—</span>}</td>
            <td className="cpa-actions tw:table-cell tw:text-right tw:whitespace-nowrap tw:[&>*]:ml-[0.46rem] tw:[&>*]:inline-flex
              tw:[&>*]:align-middle tw:[&_a.wf-secondary]:no-underline tw:[&_a.v2-forms-edit]:inline-grid tw:[&_a.v2-forms-edit]:place-items-center
              tw:[&_a.v2-forms-edit]:no-underline">
              {row.result_id && <Link className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
                tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
                tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
                tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/${row.result_id}`}><ExternalLink size={14} /> Resultado</Link>}
              {valid && (valid.expired || valid.soon) && !renewed(row) && <Button type="button" variant="formSecondary" onClick={() => void renew(row)}><RotateCcw size={14} /> Renovar</Button>}
              {row.state === 'created' && <button type="button" className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
                tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
                tw:[&:hover]:bg-[#fbf7f3]" aria-label="Tirar da fila" title="Tirar da fila" onClick={() => void removeQueued(row)}><Trash2 size={14} /></button>}
            </td>
          </tr>; })}
        </tbody></FormResultsTable>}
      {link.status !== 'open' && <InlineNotice className="cpc-notice error tw:m-0 tw:rounded-[0.77rem] tw:border tw:border-solid tw:border-[#f0c8c0] tw:bg-[#fdf1ee]
        tw:px-[1.23rem] tw:py-[0.92rem] tw:text-[1rem] tw:text-[#8d382a]" role="alert">Este link está bloqueado: desbloqueie em &quot;Links&quot; para enviar convites.</InlineNotice>}
      {notice && <InlineNotice className={`cpc-notice tw:m-0 tw:rounded-[0.77rem] tw:border tw:border-solid tw:px-[1.23rem] tw:py-[0.92rem] tw:text-[1rem] ${notice.tone === 'error' ? 'tw:border-[#f0c8c0] tw:bg-[#fdf1ee] tw:text-[#8d382a]' : 'tw:border-[#bfe0cb] tw:bg-[#eef8f1] tw:text-[#2f6b47]'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</InlineNotice>}
    </>}
  </div></div></div></Shell>;
}
