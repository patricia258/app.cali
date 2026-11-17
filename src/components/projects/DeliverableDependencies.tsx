import { StatusBadge } from '../ds/StatusBadge';
/* Dependências do cliente no entregável + histórico do prazo (regra oficial de complexidade, itens 4 a 6).
   A administradora registra, marca recebimento e reprograma o prazo com justificativa; a Equipe CALI registra e marca
   recebimento (por função); o cliente só lê. Nada é reprogramado sozinho: o sistema sugere e a administradora decide. */
import { Button } from '../ds/Button';
import type { ComponentPropsWithoutRef } from 'react';
import { addDays, differenceInCalendarDays, format, isWeekend } from 'date-fns';
import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Plus } from 'lucide-react';
import { useDeliverableDependencies, type DependencyMode } from './hooks/useDeliverableDependencies';
import { isSupabaseConfigured } from '../../api/access/session';
import {
  addDeliverableDependency,
  cancelDeliverableDependency,
  markDeliverableDependencyReceived,
  writeDeliverableDeadlinePlan,
  type DeliverableDependency as Dep,
} from '../../api/projects/dependencies';

type Sibling = { id: string; title: string; dueAt: string | null };

const CAUSES: Record<string, string> = {
  client_dependency: 'Pendência do cliente',
  scope: 'Mudança de escopo',
  internal: 'Ajuste da CALI',
  other: 'Outro motivo',
};
const REMOBILIZATION: Record<string, number> = { MC1: 0, MC2: 1, MC3: 2 };
const localDay = (date = new Date()) => format(date, 'yyyy-MM-dd');
const asDay = (value: string) => (value.length === 10 ? value : localDay(new Date(value)));
const show = (value?: string | null) => (value ? asDay(value).split('-').reverse().join('/') : '—');
const gap = (from: string, to: string) =>
  differenceInCalendarDays(new Date(`${to}T12:00:00`), new Date(`${from}T12:00:00`));
const plus = (value: string, days: number) => {
  let date = addDays(new Date(`${value}T12:00:00`), days);
  while (isWeekend(date)) date = addDays(date, 1);
  return localDay(date);
};
const stamp = (value: string) => `${value}T18:00:00-03:00`;

function DependencyButton({
  emphasis = 'secondary',
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  emphasis?: 'secondary' | 'primary' | 'warning';
}) {
  const variant = {
    secondary:
      'tw:h-10 tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:text-sm tw:text-cali-brand',
    primary:
      'tw:h-12.5 tw:rounded-cali-panel tw:border-0 tw:bg-cali-brand tw:px-4.5 tw:text-cali-body tw:text-cali-neutral-surface',
    warning:
      'tw:h-10.5 tw:rounded-cali-compact-control tw:border-0 tw:bg-cali-danger tw:px-4.5 tw:text-cali-body tw:text-cali-neutral-surface',
  }[emphasis];
  return (
    <Button
      {...props}
      type="button"
      variant="unstyled"
      className={`tw:inline-flex tw:flex-none tw:cursor-pointer tw:items-center tw:gap-2 tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-default tw:disabled:opacity-45 ${variant}`}
    />
  );
}

export function DeliverableDependencies({
  deliverableId,
  companyId,
  title,
  dueAt,
  originalDueAt,
  complexity,
  mode,
  siblings = [],
  onNotice,
  onChanged,
}: {
  deliverableId: string;
  companyId: string;
  title: string;
  dueAt: string | null;
  originalDueAt?: string | null;
  complexity?: string | null;
  mode: DependencyMode;
  siblings?: Sibling[];
  onNotice?: (message: string) => void;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ title: '', due: '' });
  const [plan, setPlan] = useState<{ date: string; cause: string; reason: string; shift: string[] } | null>(null);
  const today = localDay();
  const editable = mode !== 'client';
  const fail = (message: string) => onNotice?.(message);

  const dependencies = useDeliverableDependencies(deliverableId, companyId, mode);
  const deps = dependencies.data?.items ?? [];
  const revs = dependencies.data?.history ?? [];
  useEffect(() => {
    setPlan(null);
    setDraft({ title: '', due: '' });
  }, [deliverableId]);

  const late = (dep: Dep) => (dep.status === 'pending' && dep.due_date < today ? gap(dep.due_date, today) : 0);
  const overdue = deps.filter((dep) => late(dep) > 0);
  const worst = Math.max(0, ...overdue.map(late));
  const extra = REMOBILIZATION[complexity || ''] || 0;
  const due = dueAt ? asDay(dueAt) : '';

  async function add() {
    if (!isSupabaseConfigured || busy || !draft.title.trim() || !draft.due) return;
    setBusy(true);
    const { error } = await addDeliverableDependency(
      deliverableId,
      companyId,
      draft.title.trim(),
      draft.due,
      mode === 'staff',
    );
    setBusy(false);
    if (error) {
      fail(error.message || 'Não foi possível registrar a dependência.');
      return;
    }
    setDraft({ title: '', due: '' });
    await dependencies.refetch();
  }
  async function receive(dep: Dep) {
    if (!isSupabaseConfigured || busy) return;
    setBusy(true);
    const { error } = await markDeliverableDependencyReceived(dep.id, mode === 'staff');
    setBusy(false);
    if (error) {
      fail(error.message || 'Não foi possível marcar como recebido.');
      return;
    }
    await dependencies.refetch();
  }
  async function cancel(dep: Dep) {
    if (!isSupabaseConfigured || busy) return;
    setBusy(true);
    const { error } = await cancelDeliverableDependency(dep.id);
    setBusy(false);
    if (error) {
      fail(error.message);
      return;
    }
    await dependencies.refetch();
  }

  function openPlan() {
    const suggested = due ? plus(due, worst + extra) : today;
    setPlan({
      date: worst ? suggested : due || today,
      cause: worst ? 'client_dependency' : 'other',
      reason: worst
        ? `Pendência do cliente com ${worst} ${worst === 1 ? 'dia' : 'dias'} de atraso${extra ? ` + ${extra} ${extra === 1 ? 'dia útil' : 'dias úteis'} de remobilização (${complexity})` : ''}.`
        : '',
      shift: [],
    });
  }
  async function applyPlan() {
    if (!isSupabaseConfigured || !plan || busy || !plan.date || !plan.reason.trim() || plan.date === due) return;
    setBusy(true);
    const moved = due ? gap(due, plan.date) : 0;
    const steps = [
      {
        id: deliverableId,
        from: dueAt,
        to: plan.date,
        reason: plan.reason.trim(),
        keepOriginal: !originalDueAt && Boolean(dueAt),
      },
      ...siblings
        .filter((item) => plan.shift.includes(item.id) && item.dueAt)
        .map((item) => ({
          id: item.id,
          from: item.dueAt,
          to: plus(asDay(item.dueAt!), moved),
          reason: `Reprogramado junto com “${title}”. ${plan.reason.trim()}`,
          keepOriginal: false,
        })),
    ];
    const failure = await writeDeliverableDeadlinePlan(
      companyId,
      plan.cause,
      steps.map((step) => ({ ...step, to: stamp(step.to) })),
    );
    setBusy(false);
    if (failure) {
      fail(failure);
      return;
    }
    setPlan(null);
    fail(
      `Prazo reprogramado para ${show(plan.date)}${steps.length > 1 ? ` e ${steps.length - 1} ${steps.length === 2 ? 'entrega seguinte ajustada' : 'entregas seguintes ajustadas'}` : ''}.`,
    );
    await dependencies.refetch();
    onChanged?.();
  }

  if (mode === 'client' && !deps.length && !revs.length) return null;
  const chip = (dep: Dep) =>
    dep.status === 'received' ? (
      <StatusBadge variant="workflow" tone="green">Recebido {show(dep.received_at)}</StatusBadge>
    ) : late(dep) > 0 ? (
      <StatusBadge variant="workflow" tone="red">
        Em atraso há {late(dep)} {late(dep) === 1 ? 'dia' : 'dias'}
      </StatusBadge>
    ) : (
      <StatusBadge variant="workflow" tone="amber">Pendente</StatusBadge>
    );

  return (
    <section className="v2-deps tw:mt-7 tw:flex tw:flex-col tw:gap-3.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-5.5 tw:py-5">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3.5 tw:[&_h4]:m-0 tw:[&_h4]:text-lg tw:[&_h4]:font-bold tw:[&_h4]:text-cali-ink tw:[&_p]:mt-1 tw:[&_p]:mb-0 tw:[&_p]:text-sm tw:[&_p]:text-cali-muted tw:[&>span]:whitespace-nowrap tw:[&>span]:text-sm tw:[&>span]:font-bold tw:[&>span]:text-cali-warning">
        <div>
          <h4>{mode === 'client' ? 'O que precisamos de você' : 'Dependências do cliente'}</h4>
          <p>
            {mode === 'client'
              ? 'Informações e aprovações que esta entrega aguarda da sua empresa.'
              : 'O que o cliente precisa enviar ou aprovar para esta entrega andar. O cliente vê esta lista.'}
          </p>
        </div>
        {deps.length > 0 && <span>{deps.filter((dep) => dep.status === 'pending').length} em aberto</span>}
      </div>
      {overdue.length > 0 && (
        <div
          className="tw:flex tw:items-center tw:gap-3.5 tw:rounded-cali-panel tw:border tw:border-l-[0.308rem] tw:border-solid tw:border-cali-red-soft tw:border-l-cali-danger tw:bg-cali-red-surface tw:px-4.5 tw:py-3.5 tw:text-cali-red-text tw:max-[37.5rem]:flex-wrap tw:[&>svg]:flex-none tw:[&>div]:min-w-0 tw:[&>div]:flex-1 tw:[&_strong]:block tw:[&_strong]:text-cali-body tw:[&_p]:mt-0.5 tw:[&_p]:mb-0 tw:[&_p]:text-sm/[1.45]"
          role="alert"
        >
          <AlertTriangle size={16} />
          <div>
            <strong>
              {mode === 'client'
                ? `${overdue.length === 1 ? 'Há 1 pendência' : `Há ${overdue.length} pendências`} em atraso`
                : `Pendência do cliente em atraso há ${worst} ${worst === 1 ? 'dia' : 'dias'}`}
            </strong>
            <p>
              {mode === 'client'
                ? 'Envie pela conversa desta entrega. O atraso pode adiar o prazo final.'
                : mode === 'admin'
                  ? 'O prazo desta entrega pode ser impactado. Reprograme se for o caso; nada muda sozinho.'
                  : 'O prazo desta entrega pode ser impactado. Avise a Patrícia para reprogramar, se for o caso.'}
            </p>
          </div>
          {mode === 'admin' && !plan && (
            <DependencyButton emphasis="warning" onClick={openPlan}>
              Reprogramar prazo
            </DependencyButton>
          )}
        </div>
      )}
      {deps.length > 0 && (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
          {deps.map((dep) => (
            <li
              key={dep.id}
              className={`tw:grid tw:items-center tw:gap-4.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:py-3 tw:text-cali-body tw:text-cali-muted tw:first:border-0 tw:[&_strong]:wrap-anywhere tw:[&_strong]:text-base tw:[&_strong]:text-cali-ink tw:[&>.wf-tag]:justify-self-start ${editable ? 'tw:grid-cols-[minmax(0,1fr)_8.462rem_13.077rem_15.385rem]' : 'tw:grid-cols-[minmax(0,1fr)_8.462rem_13.077rem]'} tw:max-[51.25rem]:grid-cols-1`}
            >
              <strong>{dep.title}</strong>
              <span>até {show(dep.due_date)}</span>
              {chip(dep)}
              {editable && dep.status === 'pending' && (
                <span className="tw:inline-flex tw:justify-self-end tw:gap-2.5">
                  <DependencyButton disabled={busy} onClick={() => void receive(dep)}>
                    <Check size={13} /> Recebido
                  </DependencyButton>
                  {mode === 'admin' && (
                    <DependencyButton disabled={busy} onClick={() => void cancel(dep)}>
                      Remover
                    </DependencyButton>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="tw:flex tw:items-center tw:gap-3 tw:max-[51.25rem]:flex-wrap tw:[&_input]:box-border tw:[&_input]:h-12.5 tw:[&_input]:min-w-0 tw:[&_input]:rounded-cali-panel tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-cali-input-line tw:[&_input]:bg-cali-neutral-surface tw:[&_input]:px-3.5 tw:[&_input]:text-cali-body tw:[&_input:first-child]:flex-1 tw:[&_input[type=date]]:w-[12.308rem] tw:[&_input[type=date]]:flex-none">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="O que o cliente precisa enviar ou aprovar"
            aria-label="Dependência do cliente"
            maxLength={200}
          />
          <input
            type="date"
            value={draft.due}
            max={due || undefined}
            onChange={(event) => setDraft({ ...draft, due: event.target.value })}
            aria-label="Enviar até"
          />
          <DependencyButton
            emphasis="primary"
            disabled={busy || !draft.title.trim() || !draft.due}
            onClick={() => void add()}
          >
            <Plus size={14} /> Adicionar
          </DependencyButton>
        </div>
      )}
      {(revs.length > 0 || mode === 'admin') && (
        <div className="tw:flex tw:flex-col tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:pt-4.5">
          <div className="tw:flex tw:items-center tw:justify-between tw:gap-3.5 tw:[&_h5]:m-0 tw:[&_h5]:inline-flex tw:[&_h5]:items-center tw:[&_h5]:gap-2 tw:[&_h5]:text-base tw:[&_h5]:text-cali-ink">
            <h5>
              <CalendarClock size={14} /> Histórico do prazo
            </h5>
            {mode === 'admin' && !plan && <DependencyButton onClick={openPlan}>Revisar prazo</DependencyButton>}
          </div>
          {plan && (
            <div className="tw:grid tw:grid-cols-[13.846rem_minmax(0,1fr)] tw:gap-3.5 tw:max-[51.25rem]:grid-cols-1 tw:[&>label]:flex tw:[&>label]:flex-col tw:[&>label]:gap-1.5 tw:[&>label]:text-cali-detail tw:[&>label]:font-bold tw:[&>label]:tracking-[0.04em] tw:[&>label]:text-cali-muted tw:[&>label]:uppercase tw:[&_:is(input:not([type=checkbox]),select)]:box-border tw:[&_:is(input:not([type=checkbox]),select)]:h-12.5 tw:[&_:is(input:not([type=checkbox]),select)]:min-w-0 tw:[&_:is(input:not([type=checkbox]),select)]:rounded-cali-panel tw:[&_:is(input:not([type=checkbox]),select)]:border tw:[&_:is(input:not([type=checkbox]),select)]:border-solid tw:[&_:is(input:not([type=checkbox]),select)]:border-cali-input-line tw:[&_:is(input:not([type=checkbox]),select)]:bg-cali-neutral-surface tw:[&_:is(input:not([type=checkbox]),select)]:px-3.5 tw:[&_:is(input:not([type=checkbox]),select)]:text-cali-body">
              <label>
                Novo prazo
                <input
                  type="date"
                  value={plan.date}
                  onChange={(event) => setPlan({ ...plan, date: event.target.value })}
                />
              </label>
              <label>
                Motivo
                <select value={plan.cause} onChange={(event) => setPlan({ ...plan, cause: event.target.value })}>
                  {Object.entries(CAUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tw:col-span-full">
                Justificativa (o cliente vê)
                <input
                  value={plan.reason}
                  onChange={(event) => setPlan({ ...plan, reason: event.target.value })}
                  maxLength={1000}
                  placeholder="Explique o motivo da mudança de prazo"
                />
              </label>
              {siblings.filter((item) => item.dueAt).length > 0 && (
                <fieldset className="tw:col-span-full tw:m-0 tw:flex tw:flex-col tw:gap-2 tw:border-0 tw:p-0 tw:[&_legend]:mb-2 tw:[&_legend]:p-0 tw:[&_legend]:text-sm tw:[&_legend]:font-bold tw:[&_legend]:text-cali-muted tw:[&_label]:flex tw:[&_label]:items-center tw:[&_label]:gap-2.5 tw:[&_label]:text-cali-body tw:[&_label]:text-cali-text tw:[&_small]:text-cali-muted">
                  <legend>Mover também, pelos mesmos dias, as entregas seguintes desta frente</legend>
                  {siblings
                    .filter((item) => item.dueAt)
                    .map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={plan.shift.includes(item.id)}
                          onChange={(event) =>
                            setPlan({
                              ...plan,
                              shift: event.target.checked
                                ? [...plan.shift, item.id]
                                : plan.shift.filter((id) => id !== item.id),
                            })
                          }
                        />{' '}
                        {item.title} <small>prazo atual {show(item.dueAt)}</small>
                      </label>
                    ))}
                </fieldset>
              )}
              <span className="tw:col-span-full tw:flex tw:justify-end tw:gap-3">
                <DependencyButton onClick={() => setPlan(null)}>Cancelar</DependencyButton>
                <DependencyButton
                  emphasis="primary"
                  disabled={busy || !plan.date || !plan.reason.trim() || plan.date === due}
                  onClick={() => void applyPlan()}
                >
                  {busy ? 'Gravando…' : 'Confirmar novo prazo'}
                </DependencyButton>
              </span>
            </div>
          )}
          {revs.length > 0 ? (
            <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
              {revs.map((rev) => (
                <li
                  key={rev.id}
                  className="tw:grid tw:grid-cols-[6.923rem_15.385rem_minmax(0,1fr)] tw:gap-x-4.5 tw:gap-y-1 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:py-3 tw:text-cali-body tw:text-cali-muted tw:first:border-0 tw:max-[51.25rem]:grid-cols-1 tw:[&_time]:text-cali-muted tw:[&_strong]:text-cali-ink tw:[&_p]:col-start-2 tw:[&_p]:col-end-[-1] tw:[&_p]:m-0 tw:[&_p]:leading-normal tw:max-[51.25rem]:[&_p]:col-start-auto"
                >
                  <time>{show(rev.created_at)}</time>
                  <strong>
                    {show(rev.previous_due)} → {show(rev.new_due)}
                  </strong>
                  <span>{CAUSES[rev.cause] || 'Outro motivo'}</span>
                  <p>{rev.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            !plan && (
              <p className="tw:m-0 tw:text-cali-body tw:text-cali-muted">
                O prazo desta entrega ainda não foi revisado.
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}
