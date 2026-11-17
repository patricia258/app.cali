import { Checkbox } from '../../../components/ds/Checkbox';
import { Select } from '../../../components/ds/Select';
import { Textarea } from '../../../components/ds/Textarea';
import { WorkspaceAdminPanel } from '../../../components/workspace/components/WorkspaceAdminPanel';
import { WorkspaceAdminPanelHeader } from '../../../components/workspace/components/WorkspaceAdminPanelHeader';
/* Painel de capacidade mensal da administradora (política de 2026-10-13): por empresa, consumo, saldo ou excedente, ritmo
   estimado, ocorrências de excedente na vigência do pacote, avisos já enviados ao cliente e a decisão de pausar.
   A pausa NUNCA é automática: o sistema avisa ao passar de 110% e ela decide. Nada aqui cobra ou altera contrato. */
import type { ComponentPropsWithoutRef } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react';
import { hoursAvailable } from '../../../api/hours/client';
import {
  pauseCompanyCapacity, readCapacityDetails, readCapacityOverview, recordCapacityReview, resumeCompanyCapacity,
  type CapacityHistoryRow as History, type CapacityOverviewRow as Row, type CapacityReview as Review,
} from '../../../api/hours/capacity';
import { capacityOf, minutesLabel, percentLabel } from '../../../lib/capacity';

const decisionLabel: Record<string, string> = { monitor: 'Manter e acompanhar', reprioritize: 'Reorganizar prioridades', reschedule: 'Reprogramar atividades', complement: 'Contratação complementar', capacity_change: 'Propor alteração de capacidade' };
const monthShort = (iso: string) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00`)).replace('.', '');
const eventLabel: Record<string, string> = { m75: 'aviso de 75%', m100: 'aviso de 100%', excess: 'aviso de excedente', tolerance: 'alerta de tolerância (110%)', review: 'pendência de adequação' };

export function CapacityPanel({ month, companies, onNotice }: { month: string; companies: { id: string; name: string }[]; onNotice: (message: string) => void }) {
  const [overview, setOverview] = useState<{ month: string; rows: Row[] }>();
  const [busy, setBusy] = useState(''); const [confirming, setConfirming] = useState('');
  const [openId, setOpenId] = useState(''); const [history, setHistory] = useState<History[] | null>(null); const [reviews, setReviews] = useState<Review[]>([]);
  const [draft, setDraft] = useState({ analysis: '', decision: 'monitor', communicated: false });
  const detailVersion = useRef(0);
  const overviewVersion = useRef(0);

  async function openDetail(companyId: string) {
    const version = ++detailVersion.current;
    if (openId === companyId) {
      setOpenId('');
      return;
    }
    setOpenId(companyId);
    setHistory(null);
    setReviews([]);
    setDraft({ analysis: '', decision: 'monitor', communicated: false });
    if (!hoursAvailable) return;

    const { past, notes } = await readCapacityDetails(companyId, `${month}-01`);
    if (detailVersion.current !== version) return;
    setHistory(past.data ?? []);
    if (!notes.error) setReviews(notes.data ?? []);
    if (past.error || notes.error) onNotice('Não foi possível carregar todo o histórico de capacidade.');
  }

  async function saveReview(companyId: string) {
    if (!hoursAvailable || busy || draft.analysis.trim().length < 3) return;
    const version = detailVersion.current;
    setBusy(companyId);
    const result = await recordCapacityReview(companyId, `${month}-01`, draft);
    setBusy('');
    if (result.error || !result.data) {
      onNotice('Não foi possível registrar a avaliação. Tente de novo.');
      return;
    }
    if (detailVersion.current === version) {
      const review = result.data;
      setReviews((current) => [review, ...current]);
      setDraft({ analysis: '', decision: 'monitor', communicated: false });
    }
    onNotice('Avaliação registrada. Nada foi alterado no contrato.');
  }
  const monthStart = `${month}-01`;
  async function load() {
    if (!hoursAvailable) return;
    const version = ++overviewVersion.current;
    const result = await readCapacityOverview(monthStart);
    if (!result.error && overviewVersion.current === version) {
      setOverview({ month: monthStart, rows: result.data ?? [] });
    }
  }
  useEffect(() => {
    setOpenId('');
    setConfirming('');
    void load();
    return () => { detailVersion.current++; overviewVersion.current++; };
  }, [month]);
  async function pause(row: Row) { if (!hoursAvailable || busy) return; const version = overviewVersion.current; setBusy(row.company_id);
    const result = await pauseCompanyCapacity(row.company_id, monthStart);
    setBusy(''); if (overviewVersion.current === version) setConfirming(''); if (result.error) { onNotice('Não foi possível registrar a pausa. Tente de novo.'); return; } onNotice('Atividades pausadas até o próximo mês. O cliente vê o aviso em Horas.'); if (overviewVersion.current === version) await load(); }
  async function resume(row: Row) { if (!hoursAvailable || busy) return; const version = overviewVersion.current; setBusy(row.company_id);
    const result = await resumeCompanyCapacity(row.company_id, monthStart);
    setBusy(''); if (result.error) { onNotice('Não foi possível retomar. Tente de novo.'); return; } onNotice('Atividades retomadas.'); if (overviewVersion.current === version) await load(); }

  const today = new Date(); const [year, monthIndex] = month.split('-').map(Number); const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === monthIndex;
  const daysInMonth = new Date(year, monthIndex, 0).getDate(); const day = isCurrent ? today.getDate() : daysInMonth; const daysLeft = isCurrent ? daysInMonth - day : 0;
  const rows = overview?.month === monthStart ? overview.rows : [];
  const list = rows.map((row) => ({ row, name: companies.find((company) => company.id === row.company_id)?.name || 'Cliente', capacity: capacityOf(row.contracted_minutes / 60, row.used_minutes) }))
    .filter((item) => item.capacity.level !== 'none' && ((item.capacity.usagePercent || 0) >= 75 || item.row.paused || item.row.excess_months > 0))
    .sort((a, b) => (b.capacity.usagePercent || 0) - (a.capacity.usagePercent || 0));
  if (!list.length) return null;

  return <WorkspaceAdminPanel className="v2-capadmin"><WorkspaceAdminPanelHeader><div><h2>Capacidade mensal em atenção</h2><span>{list.length} {list.length === 1 ? 'empresa' : 'empresas'} com 75% ou mais{isCurrent ? ` · dia ${day} de ${daysInMonth}, faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : ''}</span></div></WorkspaceAdminPanelHeader>
    <div className="tw:flex tw:flex-col tw:gap-3">{list.map(({ row, name, capacity }) => { const pct = capacity.usagePercent || 0; const projected = isCurrent && day > 0 ? Math.round((pct / day) * daysInMonth) : null; const needsAttention = capacity.level === 'excess' || pct >= 100; const overTolerance = pct >= 110;
      return <article key={row.company_id} className={`tw:grid tw:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_auto] tw:items-center tw:gap-5.5 tw:rounded-xl tw:border tw:border-l-[.308rem] tw:border-solid tw:px-5 tw:py-4.5 tw:max-[61.25rem]:grid-cols-1 ${needsAttention ? 'tw:border-cali-danger-line tw:border-l-cali-danger tw:bg-cali-sand-surface' : 'tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-sand-surface'}`}>
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:[&>strong]:text-base tw:[&>span]:text-cali-body tw:[&>span]:text-cali-muted"><strong>{name}</strong><span>{percentLabel(capacity.usagePercent)} · {minutesLabel(capacity.usedMinutes)} de {minutesLabel(capacity.contractedMinutes)}{capacity.excessMinutes > 0 ? ` · +${minutesLabel(capacity.excessMinutes)} (${percentLabel(capacity.excessPercent)} acima)` : ` · saldo ${minutesLabel(capacity.balanceMinutes)}`}</span></div>
        <div className="tw:flex tw:flex-col tw:gap-1 tw:text-sm tw:text-cali-muted">
          <span className={row.excess_months >= 3 ? 'tw:font-bold tw:text-cali-red-text' : row.excess_months > 0 ? 'tw:font-bold tw:text-cali-warning' : ''}>{row.excess_months > 0 ? `${row.excess_months}ª ocorrência de excedente em ${row.window_months} meses` : `Sem excedente em ${row.window_months} meses`}{row.excess_months >= 3 ? ' — avaliar adequação do pacote' : ''}</span>
          {projected !== null && capacity.level !== 'excess' && projected > 100 && <span className="tw:font-bold tw:text-cali-warning">Ritmo atual: estimativa de {projected}% no fim do mês (estimativa, não previsão)</span>}
          <span>{row.events.length ? `Cliente avisado: ${row.events.filter((kind) => ['m75', 'm100', 'excess'].includes(kind)).map((kind) => eventLabel[kind]).join(', ') || 'nenhum aviso ao cliente'}` : 'Nenhum aviso enviado ao cliente neste mês'}</span>
        </div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2.5 tw:max-[61.25rem]:justify-start tw:[&>em]:inline-flex tw:[&>em]:items-center tw:[&>em]:gap-2 tw:[&>em]:text-sm tw:[&>em]:font-bold tw:[&>em]:not-italic">{row.paused
          ? <><em><PauseCircle size={14} /> Pausada até o próximo mês</em><CapacityAction disabled={busy === row.company_id} onClick={() => void resume(row)}><PlayCircle size={14} /> Retomar</CapacityAction></>
          : confirming === row.company_id ? <><em>Pausar as atividades desta empresa até o próximo mês?</em><CapacityAction onClick={() => setConfirming('')}>Voltar</CapacityAction><CapacityAction primary disabled={busy === row.company_id} onClick={() => void pause(row)}>Sim, pausar</CapacityAction></>
          : overTolerance ? <><em className="tw:text-cali-red-text"><AlertTriangle size={14} /> Passou da tolerância de 10%</em><CapacityAction primary onClick={() => setConfirming(row.company_id)}><PauseCircle size={14} /> Pausar até o próximo mês</CapacityAction></>
          : capacity.level === 'excess' ? <CapacityAction onClick={() => setConfirming(row.company_id)}><PauseCircle size={14} /> Pausar até o próximo mês</CapacityAction> : null}<CapacityAction aria-expanded={openId === row.company_id} onClick={() => void openDetail(row.company_id)}>{openId === row.company_id ? 'Fechar' : 'Histórico e avaliação'}</CapacityAction></div>
        {openId === row.company_id && <div className="tw:col-span-full tw:mt-2 tw:grid tw:grid-cols-2 tw:gap-7 tw:border-0 tw:border-t tw:border-dashed tw:border-cali-line tw:pt-4.5 tw:max-[61.25rem]:grid-cols-1 tw:[&_h4]:mt-0 tw:[&_h4]:mb-3 tw:[&_h4]:text-cali-body tw:[&_h4]:text-cali-ink">
          <div><h4>Consumo nos últimos {row.window_months} meses</h4>{history?.length ? <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:p-0">{history.map((item) => { const cap = capacityOf(item.contracted_minutes / 60, item.used_minutes); const value = cap.usagePercent || 0; return <li key={item.month} className="tw:grid tw:grid-cols-[4.308rem_minmax(1rem,1fr)_4.462rem_minmax(0,1.4fr)] tw:items-center tw:gap-3 tw:text-sm tw:text-cali-muted tw:max-[30rem]:grid-cols-[4.308rem_minmax(1rem,1fr)_4.462rem]"><span>{monthShort(item.month)}</span><span className="tw:h-2.5 tw:overflow-hidden tw:rounded-md tw:bg-cali-neutral-soft" aria-hidden="true"><span className={`tw:block tw:h-full ${cap.excessMinutes > 0 ? 'tw:bg-cali-danger' : 'tw:bg-cali-green-accent'}`} style={{ width: `${Math.min(100, value)}%` }} /></span><strong className={cap.excessMinutes > 0 ? 'tw:text-cali-danger' : undefined}>{cap.level === 'none' ? '—' : percentLabel(cap.usagePercent)}</strong><span className="tw:text-cali-muted tw:max-[30rem]:col-span-full">{cap.level === 'none' ? 'sem capacidade definida' : `${minutesLabel(cap.usedMinutes)} de ${minutesLabel(cap.contractedMinutes)}${cap.excessMinutes > 0 ? ` · +${minutesLabel(cap.excessMinutes)}` : ''}`}</span></li>; })}</ul> : <p className="tw:mt-0 tw:mb-3 tw:text-sm tw:text-cali-muted">{history === null ? 'Carregando histórico…' : 'Nenhum histórico disponível neste período.'}</p>}</div>
          <div><h4>Avaliação de adequação de capacidade</h4><p className="tw:mt-0 tw:mb-3 tw:text-sm tw:text-cali-muted">Registre a sua análise e o encaminhamento. Isto não altera contrato, cobrança nem atendimento.</p>
            <label className="tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-bold tw:text-cali-ink">Análise<Textarea className="tw:w-full" rows={3} value={draft.analysis} onChange={(event) => setDraft({ ...draft, analysis: event.target.value })} placeholder="O que explica o consumo e o que foi conversado." /></label>
            <div className="tw:mt-3 tw:flex tw:flex-wrap tw:items-end tw:gap-3.5"><label className="tw:flex tw:min-w-0 tw:flex-[1_1_13.846rem] tw:flex-col tw:gap-1.5 tw:text-sm tw:font-bold tw:text-cali-ink">Encaminhamento<Select className="tw:w-full" value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value })}>{Object.entries(decisionLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label className="tw:flex tw:min-h-[2.769rem] tw:items-center tw:gap-2 tw:text-sm tw:font-semibold"><Checkbox checked={draft.communicated} onChange={(event) => setDraft({ ...draft, communicated: event.target.checked })} /> Já comunicado ao cliente</label><CapacityAction primary disabled={busy === row.company_id || draft.analysis.trim().length < 3} onClick={() => void saveReview(row.company_id)}>Registrar avaliação</CapacityAction></div>
            {reviews.length > 0 && <ul className="tw:mt-4.5 tw:mb-0 tw:flex tw:list-none tw:flex-col tw:gap-2.5 tw:p-0">{reviews.map((review) => <li key={review.id} className="tw:rounded-cali-compact-control tw:border tw:border-l-[.231rem] tw:border-solid tw:border-cali-line tw:border-l-cali-gold tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body"><strong>{decisionLabel[review.decision] || review.decision}</strong><time className="tw:ml-2.5 tw:text-cali-detail tw:text-cali-muted">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(review.created_at)).replace('.', '')}{review.communicated ? ' · comunicado ao cliente' : ' · ainda não comunicado'}</time><p className="tw:mt-1 tw:mb-0 tw:leading-[1.5] tw:whitespace-pre-wrap tw:text-cali-text">{review.analysis}</p></li>)}</ul>}
          </div>
        </div>}
      </article>; })}</div>
    <p className="tw:mt-3.5 tw:mb-0 tw:text-sm tw:text-cali-muted">Excedente não gera cobrança, suspensão automática nem mudança de contrato. A pausa é uma decisão sua e vale só até o fim do mês.</p>
  </WorkspaceAdminPanel>;
}

function CapacityAction({ primary, ...props }: ComponentPropsWithoutRef<'button'> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`tw:inline-flex tw:h-10.5 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-cali-compact-control tw:border tw:border-solid tw:px-3.5 tw:text-sm tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-not-allowed tw:disabled:opacity-45 ${primary ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface' : 'tw:border-cali-input-line tw:bg-cali-neutral-surface tw:text-cali-brand'}`}
    />
  );
}
