import { Button } from '../../../components/ds/Button';
import { AdminListControls, AdminListFilter } from '../../../components/workspace/components/AdminListControls';
import { AdminMetricsStrip } from '../../../components/workspace/components/AdminMetricsStrip';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { auditSourceLimit, auditTimelineKey, readAuditTimeline } from '../../../api/admin/audit/timeline';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { PrivacyRequestsPanel } from '../companies/components/PrivacyRequestsPanel';
import { AuditItemTrail } from './components/AuditItemTrail';
import { AuditTimeline } from './components/AuditTimeline';

/* Auditoria (só administradora): reúne em uma lista o que o sistema já registra — quem fez o quê, quando e em qual empresa.
   Só leitura; não cria registro novo. Fontes: activity_log, team_changes, team_private_audit, deliverable_status_history,
   project_lifecycle_events e report_client_events. Eventos técnicos de diagnóstico ficam de fora. */

type Row = { id: string; at: string; actor: string | null; company: string | null; area: Area; action: string; detail: string; protocol: string };
type Area = 'Acesso' | 'Horas' | 'Relatórios' | 'Agenda' | 'Documentos' | 'Ocorrências' | 'Equipe' | 'Projetos' | 'Outros';
const AREAS: Area[] = ['Acesso', 'Horas', 'Relatórios', 'Agenda', 'Documentos', 'Ocorrências', 'Equipe', 'Projetos', 'Outros'];

const activityLabels: Record<string, [Area, string]> = {
  workspace_access_code_requested: ['Acesso', 'Pediu código de acesso'], privacy_request_created: ['Acesso', 'Fez um pedido de privacidade (LGPD)'], privacy_request_answered: ['Acesso', 'Respondeu um pedido de privacidade'], privacy_data_exported: ['Acesso', 'Baixou os próprios dados'], company_data_exported: ['Acesso', 'Exportou os dados da empresa (fim de contrato)'], workspace_access_code_verified: ['Acesso', 'Entrou com código de acesso'], workspace_access_requested: ['Acesso', 'Solicitou acesso ao Workspace'],
  timer_started: ['Horas', 'Iniciou o cronômetro'], timer_paused: ['Horas', 'Pausou o cronômetro'], timer_session_paused: ['Horas', 'Pausou e registrou uma sessão'], timer_stopped: ['Horas', 'Finalizou o cronômetro'], timer_session_discarded: ['Horas', 'Sessão com menos de 30 segundos descartada'], hours_entry_deleted: ['Horas', 'Excluiu um lançamento de horas'], hours_entry_updated: ['Horas', 'Editou um lançamento de horas'],
  account_record_timer_started: ['Ocorrências', 'Iniciou o cronômetro em uma ocorrência'], account_record_feedback: ['Ocorrências', 'Cliente avaliou uma ocorrência'], client_unopened_record_deleted: ['Ocorrências', 'Cliente excluiu uma ocorrência ainda não aberta'],
  report_draft_generated: ['Relatórios', 'Gerou o rascunho do relatório'], report_review_saved: ['Relatórios', 'Salvou a revisão do relatório'], report_approved: ['Relatórios', 'Aprovou o relatório'], report_sent: ['Relatórios', 'Enviou o relatório ao cliente'], report_acknowledged: ['Relatórios', 'Cliente deu ciência do relatório'], report_withdrawn_for_correction: ['Relatórios', 'Recolheu o relatório para correção'], report_correction_started: ['Relatórios', 'Iniciou a correção do relatório'], report_test_reset: ['Relatórios', 'Reiniciou o relatório de teste'],
  scheduling_request_submitted: ['Agenda', 'Cliente pediu um horário'], scheduling_request_proposed: ['Agenda', 'Propôs novo horário'], scheduling_request_confirmed: ['Agenda', 'Confirmou o agendamento'], scheduling_request_declined: ['Agenda', 'Recusou o agendamento'], calendar_event_deleted: ['Agenda', 'Excluiu um compromisso do calendário'],
  staff_hours_edited: ['Horas', 'Equipe CALI editou um lançamento antes da aprovação'], staff_file_attached: ['Projetos', 'Equipe CALI anexou um arquivo na conversa'], hour_entry_edited: ['Horas', 'Lançamento de horas editado'], timer_auto_paused_inactivity: ['Horas', 'Cronômetro pausado sozinho por inatividade'],
  staff_session_started: ['Acesso', 'Equipe CALI: entrou no Workspace'], staff_session_ended: ['Acesso', 'Equipe CALI: saiu do Workspace'],
  staff_notice_published: ['Outros', 'Equipe CALI publicou um comunicado'],
  staff_hours_approved: ['Horas', 'Aprovou horas lançadas pela Equipe CALI'], staff_hours_rejected: ['Horas', 'Recusou horas lançadas pela Equipe CALI'],
  document_published: ['Documentos', 'Publicou um documento'], document_final_file_added: ['Documentos', 'Anexou o arquivo final do documento'], document_archived: ['Documentos', 'Arquivou um documento'],
};
const hidden = new Set(['preview_perf_diagnostic', 'preview_render_error']);
const teamLabels: Record<string, string> = { admission: 'Registrou admissão', termination: 'Registrou desligamento', promotion: 'Registrou promoção', transfer: 'Registrou mudança de área', manager_change: 'Registrou mudança de gestor', correction: 'Corrigiu dados de uma pessoa', leave: 'Registrou afastamento', return: 'Registrou retorno' };
const lifecycleLabels: Record<string, string> = { pause: 'Pausou', resume: 'Retomou', cancel: 'Cancelou', complete: 'Concluiu', reopen: 'Reabriu' };
const reportEventLabels: Record<string, string> = { opened: 'Cliente abriu o relatório', pdf_opened: 'Cliente abriu o PDF do relatório', acknowledged: 'Cliente deu ciência do relatório', question_submitted: 'Cliente enviou dúvida sobre o relatório' };
const statusLabels: Record<string, string> = { not_started: 'Não iniciada', in_progress: 'Em andamento', internal_review: 'Revisão interna', client_review: 'Com o cliente', approved: 'Aprovada', adjustment_requested: 'Ajuste solicitado', cancelled: 'Cancelada', done: 'Concluída', paused: 'Pausada' };
const fieldLabels: Record<string, string> = { salary: 'remuneração', salary_review_date: 'data de revisão salarial', gender: 'gênero', gender_detail: 'gênero (detalhe)', has_children: 'filhos' };
const text = <T,>(value: T) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const day = (iso: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
const shortDay = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso));
const hour = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function AdminAuditPage() {
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [companies, setCompanies] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [partial, setPartial] = useState<string[]>([]);
  const [company, setCompany] = useState(''); const [area, setArea] = useState(''); const [actor, setActor] = useState(''); const [period, setPeriod] = useState('30'); const [search, setSearch] = useState(''); const [shown, setShown] = useState(60); const [grouping, setGrouping] = useState<'day' | 'protocol'>('day'); const [trail, setTrail] = useState(''); const [kinds, setKinds] = useState<Record<string, string>>({});

  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const { activity, team, priv, status, lifecycle, reports, people, firms, members, protocolSources, failed } =
        await queryClient.fetchQuery({
          queryKey: auditTimelineKey(user.id),
          queryFn: ({ signal }) => readAuditTimeline(signal),
          staleTime: 0,
        });
      const protocolOf = new Map<string, string>(); const kindOf: Record<string, string> = {}; const kindLabels = ['Ocorrência', 'Entrega', 'Compromisso', 'Documento', 'Relatório', 'Projeto', 'Aviso']; protocolSources.forEach((list, position) => list.forEach((item) => { if (item.protocol) { protocolOf.set(item.id, item.protocol); kindOf[item.protocol] = kindLabels[position]; } })); setKinds(kindOf);
      const reasonText = <T,>(value: T) => text(value) === 'under_30_seconds' ? '' : text(value);
      const member = new Map(members.map((item) => [item.id, item.full_name as string]));
      const out: Row[] = [];
      activity.forEach((item) => { if (hidden.has(item.event_type)) return; const known = activityLabels[item.event_type]; const meta = item.metadata || {}; out.push({ id: `a${item.id}`, at: item.created_at, actor: item.actor_user_id, company: item.company_id, area: known?.[0] || 'Outros', action: known?.[1] || String(item.event_type).replace(/_/g, ' '), detail: [text(meta.title), reasonText(meta.reason) && `Motivo: ${reasonText(meta.reason)}`, text(meta.minutes) && `${text(meta.minutes)} min`].filter(Boolean).join(' · '), protocol: protocolOf.get(item.entity_id ?? '') || protocolOf.get(text(meta.record_id)) || protocolOf.get(text(meta.deliverable_id)) || protocolOf.get(text(meta.report_id)) || text(meta.protocol) }); });
      team.forEach((item) => out.push({ id: `t${item.id}`, at: item.created_at, actor: item.actor_user_id, company: item.company_id, area: 'Equipe', action: teamLabels[item.change_type] || 'Atualizou a equipe', detail: member.get(item.member_id ?? '') || '', protocol: '' }));
      priv.forEach((item) => out.push({ id: `p${item.id}`, at: item.created_at, actor: item.actor_user_id, company: item.company_id, area: 'Equipe', action: 'Alterou dados com acesso restrito', detail: [member.get(item.member_id ?? ''), (item.changed_fields || []).map((field: string) => fieldLabels[field] || field).join(', ')].filter(Boolean).join(' · '), protocol: '' }));
      status.forEach((item) => out.push({ id: `s${item.id}`, at: item.created_at, actor: item.actor_user_id, company: item.company_id, area: 'Projetos', action: 'Mudou a situação de uma entrega', detail: [`${statusLabels[item.from_status ?? ''] || item.from_status || 'Início'} → ${statusLabels[item.to_status] || item.to_status}`, text(item.note)].filter(Boolean).join(' · '), protocol: protocolOf.get(item.deliverable_id) || '' }));
      lifecycle.forEach((item) => out.push({ id: `l${item.id}`, at: item.created_at, actor: item.created_by, company: item.company_id, area: 'Projetos', action: `${lifecycleLabels[item.action] || 'Alterou'} ${item.scope_type === 'project' ? 'o projeto' : item.scope_type === 'workstream' ? 'uma frente' : 'uma entrega'}`, detail: [text(item.scope_label), text(item.reason) && `Motivo: ${text(item.reason)}`].filter(Boolean).join(' · '), protocol: protocolOf.get(item.project_id ?? '') || '' }));
      reports.forEach((item) => out.push({ id: `r${item.id}`, at: item.created_at, actor: item.user_id, company: item.company_id, area: 'Relatórios', action: reportEventLabels[item.event_type] || 'Cliente interagiu com o relatório', detail: '', protocol: protocolOf.get(item.report_id) || '' }));
      out.sort((a, b) => b.at.localeCompare(a.at));
      setRows(out); setNames(Object.fromEntries(people.map((item) => [item.id, item.full_name || '']))); setCompanies(firms); setPartial(failed);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar a auditoria.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setShown(60); }, [company, area, actor, period, search, grouping, trail]);

  const companyName = useMemo(() => new Map(companies.map((item) => [item.id, item.display_name])), [companies]);
  const who = (id: string | null) => id ? names[id] || 'Usuário sem nome no perfil' : 'Sistema';
  const filtered = useMemo(() => { const since = period === 'all' ? '' : new Date(Date.now() - Number(period) * 86400000).toISOString(); const query = search.trim().toLocaleLowerCase('pt-BR'); return rows.filter((row) => trail ? row.protocol === trail : (!company || row.company === company) && (!area || row.area === area) && (!actor || (row.actor || 'system') === actor) && (!since || row.at >= since) && (!query || `${row.action} ${row.detail} ${row.protocol} ${who(row.actor)} ${companyName.get(row.company || '') || ''}`.toLocaleLowerCase('pt-BR').includes(query))); }, [rows, company, area, actor, period, search, names, companyName, trail]);
  const actors = useMemo(() => [...new Set(rows.map((row) => row.actor || 'system'))].map((id) => [id, id === 'system' ? 'Sistema' : who(id)] satisfies [string, string]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [rows, names]);
  const byProtocol = grouping === 'protocol' && !trail;
  const ordered = byProtocol ? (() => { const latest = new Map<string, string>(); filtered.forEach((row) => { const key = row.protocol || ''; if (!latest.has(key)) latest.set(key, row.at); }); return filtered.slice().sort((a, b) => (a.protocol ? 0 : 1) - (b.protocol ? 0 : 1) || (latest.get(b.protocol) || '').localeCompare(latest.get(a.protocol) || '') || b.at.localeCompare(a.at)); })() : filtered;
  const visible = ordered.slice(0, shown);
  const groups = visible.reduce<{ day: string; protocol: string; items: Row[] }[]>((list, row) => { const label = byProtocol ? (row.protocol ? `${kinds[row.protocol] || 'Item'} · ${row.protocol}` : 'Sem protocolo (acessos, cronômetro, equipe)') : day(row.at); const last = list[list.length - 1]; if (last && last.day === label) last.items.push(row); else list.push({ day: label, protocol: byProtocol ? row.protocol : '', items: [row] }); return list; }, []);
  const trailPeople = [...new Set(filtered.map((row) => who(row.actor)))];
  const openTrail = (protocol: string) => { setTrail(protocol); window.scrollTo({ top: 0 }); };
  const people = new Set(filtered.map((row) => row.actor || 'system')).size; const sensitive = filtered.filter((row) => /Excluiu|restrito|descartada|Recolheu|Cancelou/.test(row.action)).length;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Auditoria</h1><p>Quem fez o quê, quando e em qual empresa. O histórico não pode ser editado nem apagado; aqui você só responde os pedidos de privacidade.</p></div><div className="v2-head-actions"><Button variant="workflowSecondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar'}</Button></div></div>
    {error && <InlineNotice>{error}</InlineNotice>}
    <PrivacyRequestsPanel />
    <AdminMetricsStrip metrics={[
          { label: 'Registros no recorte', value: filtered.length, description: 'dos {rows.length} mais recentes carregados' },
          { label: 'Pessoas que agiram', value: people, description: 'inclui ações automáticas do sistema' },
          { label: 'Ações sensíveis', value: sensitive, description: 'exclusões, dados restritos, cancelamentos' },
        ]} />
    <AdminListControls alwaysWrap>
      <AdminListFilter aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico carregado</option></AdminListFilter>
      <AdminListFilter aria-label="Empresa" value={company} onChange={(event) => setCompany(event.target.value)}><option value="">Todas as empresas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</AdminListFilter>
      <AdminListFilter aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)}><option value="">Todas as áreas</option>{AREAS.map((item) => <option key={item}>{item}</option>)}</AdminListFilter>
      <AdminListFilter aria-label="Quem" value={actor} onChange={(event) => setActor(event.target.value)}><option value="">Todas as pessoas</option>{actors.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</AdminListFilter>
      <AdminListFilter aria-label="Agrupar por" value={grouping} onChange={(event) => setGrouping(event.target.value as 'day' | 'protocol')}><option value="day">Agrupar por dia</option><option value="protocol">Agrupar por protocolo</option></AdminListFilter>
      <label className="tw:flex tw:h-[2.769rem] tw:min-w-0 tw:flex-[1_1_16.923rem] tw:items-center tw:gap-[0.615rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-[0.846rem] tw:text-[#96867c] tw:focus-within:border-cali-gold">
        <Search size={14} className="tw:shrink-0" />
        <input
          className="tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-[0.846rem]/[inherit] tw:text-[#322f2c] tw:outline-none"
          aria-label="Buscar na auditoria"
          placeholder="Buscar ação, pessoa, protocolo ou detalhe"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
    </AdminListControls>
    {trail && <AuditItemTrail
      protocol={trail}
      kind={kinds[trail] || 'Item'}
      facts={[
        { label: 'Movimentações', value: filtered.length },
        { label: 'Primeira', value: filtered.length ? shortDay(filtered[filtered.length - 1].at) : '—' },
        { label: 'Última', value: filtered.length ? shortDay(filtered[0].at) : '—' },
        { label: 'Quem participou', value: trailPeople.join(', ') || '—' },
      ]}
      onBack={() => setTrail('')}
    />}
    {loading && <LoadingState>Carregando auditoria…</LoadingState>}
    {!loading && !groups.length && <div className="tw:mt-[1.231rem] tw:rounded-[0.692rem] tw:border tw:border-dashed tw:border-[#e0d3c9] tw:bg-white tw:p-[2.154rem] tw:text-center tw:text-[0.923rem]/[inherit] tw:text-[#8c7e74]">
      Nenhum registro neste recorte. Amplie o período ou limpe os filtros.
    </div>}
    {!loading && groups.length > 0 && <AuditTimeline
      groups={groups.map((group) => ({
        title: group.day,
        protocol: byProtocol ? group.protocol : undefined,
        entries: group.items.map((row) => ({
          ...row,
          day: byProtocol || trail ? shortDay(row.at) : undefined,
          time: hour(row.at),
          actor: who(row.actor),
          company: companyName.get(row.company ?? '') || '—',
        })),
      }))}
      remaining={filtered.length - shown}
      onOpen={openTrail}
      onMore={() => setShown((count) => count + 60)}
    />}
    {partial.length > 0 && <InlineNotice className="tw:mt-[1.385rem] tw:border tw:border-solid tw:border-[#ecd9b0]! tw:bg-[#fffaf1]! tw:text-[#7a5a2c]!"><strong>Auditoria incompleta:</strong> não foi possível ler {partial.join(', ')}. O restante aparece normalmente. Clique em “Atualizar”; se continuar, avise o suporte técnico.</InlineNotice>}
    <p className="soft-note tw:mt-[1.385rem]!">A lista mostra os {auditSourceLimit} registros mais recentes de cada fonte (acessos, horas, relatórios, agenda, documentos, ocorrências, equipe e projetos). Diagnósticos técnicos do sistema não aparecem.</p>
  </div></div></div></Shell>;
}
