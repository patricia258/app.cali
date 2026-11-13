import { WorkflowDialog } from '../../../components/ds/WorkflowDialog';
import { TeamDialogOverlay } from './TeamDialogOverlay';
import { TeamDialogEyebrow, TeamDialogFooter, TeamDialogHeader } from './TeamDialogParts';
import { TeamAction } from './TeamAction';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardCheck,
  DoorOpen,
  Plus,
  Trash2,
  UserRoundPlus,
} from 'lucide-react';
import { confirmTeamMonth } from '../../../api/team/directory';
import type { JsonObject } from '../../../domain/json';
import type { Draft, Member, Vacancy } from '../../../domain/team';
type Row = Record<string, string> & { rowId: string };
export type TeamMonthDraft = Pick<
  Draft,
  'employee_code' | 'full_name' | 'admission_date' | 'job_title' | 'department' | 'employment_type' | 'status'
> &
  Partial<Draft>;
type Job = Pick<Vacancy, 'vacancy_code' | 'title' | 'department' | 'opened_on' | 'status' | 'closed_on'>;
const titles = ['Desligamentos', 'Admissões', 'Mudanças', 'Vagas', 'Confirmar'];
const stepIcons = [DoorOpen, UserRoundPlus, ArrowLeftRight, BriefcaseBusiness, ClipboardCheck];
function confirmationDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}
const fields: { key: string; label: string; type?: string }[][] = [
  [
    { key: 'code', label: 'Pessoa' },
    { key: 'date', label: 'Data', type: 'date' },
    { key: 'initiative', label: 'Classificação · DP' },
    { key: 'reason', label: 'Observações' },
    { key: 'notice', label: 'Aviso prévio' },
  ],
  [
    { key: 'code', label: 'Código interno' },
    { key: 'name', label: 'Nome completo' },
    { key: 'date', label: 'Admissão', type: 'date' },
    { key: 'title', label: 'Cargo' },
    { key: 'department', label: 'Departamento' },
  ],
  [
    { key: 'code', label: 'Pessoa' },
    { key: 'title', label: 'Novo cargo' },
    { key: 'department', label: 'Novo departamento' },
    { key: 'manager', label: 'Novo gestor' },
  ],
];
const monthEnd = (month: string) =>
  month + '-' + new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
export function TeamMonthWizard({
  companyId,
  month,
  members,
  vacancies,
  serialize,
  onClose,
  onSaved,
}: {
  companyId: string;
  month: string;
  members: Member[];
  vacancies: Vacancy[];
  serialize: (draft: TeamMonthDraft) => JsonObject;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [stage, setStage] = useState(0),
    [rows, setRows] = useState<Row[][]>([[], [], []]),
    [jobs, setJobs] = useState<Job[]>(
      vacancies
        .filter((v) => v.status === 'open' && v.opened_on <= monthEnd(month))
        .map((v) => ({
          vacancy_code: v.vacancy_code,
          title: v.title,
          department: v.department,
          opened_on: v.opened_on,
          status: v.status,
          closed_on: v.closed_on,
        })),
    ),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const max = [monthEnd(month), new Date().toISOString().slice(0, 10)].sort()[0];
  const lastAdvance = useRef(0);
  const update = (i: number, key: string, value: string) =>
    setRows((all) =>
      all.map((list, s) => (s === stage ? list.map((r, j) => (j === i ? { ...r, [key]: value } : r)) : list)),
    );
  const updateJob = (i: number, key: keyof Job, value: string) =>
    setJobs((list) =>
      list.map((v, j) =>
        j === i ? { ...v, [key]: value, ...(key === 'status' && value === 'open' ? { closed_on: null } : {}) } : v,
      ),
    );
  function next() {
    setError('');
    if (
      stage < 2 &&
      rows[stage].some((r) =>
        fields[stage].some(
          (f) => !(stage === 1 && f.key === 'code') && !(stage === 0 && f.key === 'reason') && !r[f.key],
        ),
      )
    )
      return setError('Complete os dados ou remova a linha vazia.');
    if (stage === 2 && rows[2].some((r) => !r.code || (!r.title && !r.department && !r.manager)))
      return setError('Informe a pessoa e pelo menos uma mudança.');
    if (stage === 3 && jobs.some((j) => !j.title || !j.opened_on || (j.status !== 'open' && !j.closed_on)))
      return setError('Complete as vagas antes de avançar.');
    lastAdvance.current = Date.now();
    setStage(stage + 1);
  }
  async function save() {
    if (saving || Date.now() - lastAdvance.current < 450) return;
    setSaving(true);
    setError('');
    try {
      const byCode = new Map<string, TeamMonthDraft>(
          members.map((member) => [member.employee_code, { ...member }]),
        ),
        touched = new Set<string>();
      for (const r of rows[0]) {
        const m = byCode.get(r.code);
        if (!m) throw Error('Pessoa não encontrada.');
        Object.assign(m, {
          status: 'terminated',
          termination_date: r.date,
          termination_initiative: (r.initiative || '').split(':')[0],
          termination_reason: r.initiative?.includes(':')
            ? `[eSocial:${r.initiative.split(':')[1]}] ${r.reason || ''}`.trim()
            : r.reason,
          notice_type: r.notice,
        });
        touched.add(r.code);
      }
      for (const r of rows[2]) {
        const m = byCode.get(r.code);
        if (!m) throw Error('Pessoa não encontrada.');
        if (r.title) m.job_title = r.title;
        if (r.department) m.department = r.department;
        if (r.manager) m.manager_code = r.manager;
        touched.add(r.code);
      }
      for (const r of rows[1]) {
        const code = r.code?.trim() || `CALI-${crypto.randomUUID().toUpperCase()}`;
        if (byCode.has(code)) throw Error('O código da admissão já existe.');
        byCode.set(code, {
          employee_code: code,
          full_name: r.name,
          admission_date: r.date,
          job_title: r.title,
          department: r.department,
          is_leader: false,
          employment_type: 'clt',
          status: 'active',
        });
        touched.add(code);
      }
      const people = [...touched].map((code) => {
        const person = byCode.get(code);
        if (!person) throw Error('Pessoa não encontrada.');
        return serialize({
          ...person,
          salary: '',
          gender: '',
          gender_detail: '',
          has_children: '',
          optional_data_declared: false,
        });
      });
      await confirmTeamMonth(companyId, month + '-01', people, jobs, {
        departures: rows[0].length,
        admissions: rows[1].length,
        changes: rows[2].length,
        vacancies: jobs.length,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar o mês.');
    } finally {
      setSaving(false);
    }
  }
  return createPortal(
    <TeamDialogOverlay onClose={onClose}>
      <WorkflowDialog create
        className="tw:flex tw:max-h-[calc(100dvh-2.25rem)] tw:w-full! tw:max-w-[42.5rem] tw:flex-col tw:overflow-hidden tw:p-0!"
        aria-label="Atualização mensal"
      >
        <TeamDialogHeader onClose={onClose}>
          <TeamDialogEyebrow>EQUIPE · {month}</TeamDialogEyebrow>
          <h2>O que mudou neste mês?</h2>
        </TeamDialogHeader>
        <div className="tw:px-[1.5625rem] tw:pt-4.5 tw:pb-5 tw:min-h-0 tw:overflow-y-auto tw:overscroll-contain">
          <div className="tw:mb-3.5 tw:flex tw:gap-3">
            {titles.map((t, i) => (
              <span
                key={t}
                className={`tw:grid tw:size-8 tw:place-items-center tw:rounded-[0.4375rem] tw:text-[0.6875rem] tw:font-bold ${i === stage ? 'tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:bg-[var(--v2-surface-f4ede6,#f4ede6)] tw:text-[var(--v2-text-a78a72,#a78a72)]'}`}
                title={t}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <div className="tw:flex tw:gap-5 tw:text-xs tw:leading-relaxed tw:text-[var(--v2-text-8c7462,#8c7462)] tw:[&_h3]:text-lg tw:[&_h3]:text-cali-brand tw:mt-4 tw:mb-3.5 tw:min-h-[6.625rem] tw:items-start tw:justify-between tw:max-[37.5rem]:min-h-0 tw:[&_h3]:mt-0 tw:[&_h3]:mb-2.5 tw:[&_p]:m-0 tw:[&_p]:max-w-[56ch] tw:[&_p]:text-[0.88rem]/[1.55] tw:[&_p_strong]:font-extrabold">
            <div>
              <h3>{titles[stage]}</h3>
              <p>
                {
                  [
                    <>
                      Se houve algum desligamento, clique em <strong>Adicionar desligamento</strong>. Se não houve,
                      avance.
                    </>,
                    <>
                      Se alguém entrou na equipe, clique em <strong>Adicionar admissão</strong>. Você também pode
                      cadastrar pela ficha durante o mês.
                    </>,
                    <>
                      Registre <strong>promoções, trocas de área ou de gestor</strong>. Se não houve mudanças,
                      avance.
                    </>,
                    <>
                      Acompanhe as <strong>vagas abertas, preenchidas ou canceladas</strong>. As vagas em andamento
                      seguem para o mês seguinte.
                    </>,
                    <>
                      Confira as informações antes de <strong>confirmar o mês</strong>. Nenhum dado será salvo até
                      você concluir esta etapa.
                    </>,
                  ][stage]
                }
              </p>
            </div>
            <span
              className="tw:ml-auto tw:shrink-0 tw:text-cali-gold tw:grid tw:size-[5.3125rem] tw:place-items-center tw:rounded-[1.125rem] tw:max-[37.5rem]:size-[3.625rem] tw:max-[37.5rem]:rounded-xl tw:max-[37.5rem]:[&_svg]:size-[1.9375rem]"
              aria-hidden="true"
            >
              {(() => {
                const Icon = stepIcons[stage];
                return <Icon size={48} strokeWidth={1.3} />;
              })()}
            </span>
          </div>
          {stage < 3 && (
            <>
              {rows[stage].map((r, i) => (
                <div
                  className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.25 tw:border-b tw:border-solid tw:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:py-3.5 tw:[&>:is(input,select)]:min-w-30 tw:[&>:is(input,select)]:flex-1 tw:[&>:is(input,select)]:text-[0.6875rem] tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:[&_button]:bg-cali-surface tw:[&_button]:text-cali-brand tw:my-2.5 tw:rounded-[0.8125rem] tw:[&_label]:text-[0.7rem] tw:[&_input]:h-[2.625rem] tw:[&_input]:rounded-[0.625rem] tw:[&_input]:px-3 tw:[&_select]:h-[2.625rem] tw:[&_select]:rounded-[0.625rem] tw:[&_select]:px-3 tw:[&_button]:grid tw:[&_button]:size-[2.375rem] tw:[&_button]:place-items-center"
                  key={r.rowId}
                >
                  {fields[stage].map((f) =>
                    f.key === 'code' && stage !== 1 ? (
                      <select
                        key={f.key}
                        aria-label={f.label}
                        value={r.code || ''}
                        onChange={(e) => {
                          update(i, 'code', e.target.value);
                          update(i, 'initiative', '');
                        }}
                      >
                        <option value="">Selecione a pessoa</option>
                        {members
                          .filter((m) => m.status !== 'terminated')
                          .map((m) => (
                            <option key={m.id} value={m.employee_code}>
                              {m.full_name}
                            </option>
                          ))}
                      </select>
                    ) : f.key === 'initiative' ? (
                      <select
                        key={f.key}
                        aria-label={f.label}
                        value={r.initiative || ''}
                        onChange={(e) => update(i, 'initiative', e.target.value)}
                      >
                        <option value="">Classificação do desligamento</option>
                        {members.find((m) => m.employee_code === r.code)?.employment_type === 'clt' ? (
                          <>
                            <option value="company:01">01 · Com justa causa, por iniciativa do empregador</option>
                            <option value="company:02">02 · Sem justa causa, por iniciativa do empregador</option>
                            <option value="company:03">03 · Antecipada do contrato a termo, empregador</option>
                            <option value="employee:04">04 · Antecipada do contrato a termo, empregado</option>
                            <option value="contract_end:06">06 · Término do contrato a termo</option>
                            <option value="employee:07">07 · Por iniciativa do empregado</option>
                            <option value="other:17">17 · Rescisão indireta</option>
                            <option value="other:33">33 · Acordo entre as partes</option>
                          </>
                        ) : (
                          <>
                            <option value="employee">Por iniciativa do contratado</option>
                            <option value="company">Por iniciativa da empresa</option>
                            <option value="contract_end">Término do contrato</option>
                            <option value="other">Outra forma de encerramento</option>
                          </>
                        )}
                      </select>
                    ) : f.key === 'notice' ? (
                      <select
                        key={f.key}
                        aria-label={f.label}
                        value={r.notice || ''}
                        onChange={(e) => update(i, 'notice', e.target.value)}
                      >
                        <option value="">Aviso prévio</option>
                        <option value="worked">Trabalhado</option>
                        <option value="indemnified">Indenizado</option>
                        <option value="waived">Dispensado</option>
                        <option value="not_applicable">Não se aplica</option>
                      </select>
                    ) : (
                      <input
                        key={f.key}
                        aria-label={f.label}
                        placeholder={f.key === 'code' && stage === 1 ? 'Código interno (opcional)' : f.label}
                        type={f.type || 'text'}
                        max={f.type === 'date' ? max : undefined}
                        value={r[f.key] || ''}
                        onChange={(e) => update(i, f.key, e.target.value)}
                      />
                    ),
                  )}
                  <button
                    aria-label="Remover linha"
                    onClick={() =>
                      setRows((all) => all.map((list, s) => (s === stage ? list.filter((_, j) => j !== i) : list)))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                className="tw:rounded-[0.4375rem] tw:border tw:border-solid tw:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:bg-cali-surface tw:p-2.5 tw:text-[0.6875rem] tw:text-cali-brand tw:mt-1.5 tw:inline-flex tw:min-h-10 tw:items-center tw:gap-1.5 tw:font-bold"
                onClick={() => {
                  const rowId = crypto.randomUUID();
                  setRows((all) => all.map((list, s) => (s === stage ? [...list, { rowId }] : list)));
                }}
              >
                <Plus size={16} /> Adicionar {['desligamento', 'admissão', 'mudança'][stage]}
              </button>
            </>
          )}
          {stage === 3 && (
            <>
              {jobs.map((v, i) => (
                <div
                  className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.25 tw:border-b tw:border-solid tw:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:py-3.5 tw:[&>:is(input,select)]:min-w-30 tw:[&>:is(input,select)]:flex-1 tw:[&>:is(input,select)]:text-[0.6875rem] tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:[&_button]:bg-cali-surface tw:[&_button]:text-cali-brand tw:my-2.5 tw:rounded-[0.8125rem] tw:[&_label]:text-[0.7rem] tw:[&_input]:h-[2.625rem] tw:[&_input]:rounded-[0.625rem] tw:[&_input]:px-3 tw:[&_select]:h-[2.625rem] tw:[&_select]:rounded-[0.625rem] tw:[&_select]:px-3 tw:[&_button]:grid tw:[&_button]:size-[2.375rem] tw:[&_button]:place-items-center"
                  key={v.vacancy_code}
                >
                  <input
                    aria-label="Nome da vaga"
                    placeholder="Nome da vaga"
                    value={v.title}
                    onChange={(e) => updateJob(i, 'title', e.target.value)}
                  />
                  <input
                    aria-label="Departamento"
                    placeholder="Departamento"
                    value={v.department || ''}
                    onChange={(e) => updateJob(i, 'department', e.target.value)}
                  />
                  <label>
                    Aberta em
                    <input
                      type="date"
                      max={max}
                      value={v.opened_on}
                      readOnly={vacancies.some((old) => old.vacancy_code === v.vacancy_code)}
                      onChange={(e) => updateJob(i, 'opened_on', e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Situação"
                    value={v.status}
                    onChange={(e) => updateJob(i, 'status', e.target.value)}
                  >
                    <option value="open">Em andamento</option>
                    <option value="filled">Preenchida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  {v.status !== 'open' && (
                    <label>
                      Encerrada em
                      <input
                        type="date"
                        min={v.opened_on}
                        max={max}
                        value={v.closed_on || ''}
                        onChange={(e) => updateJob(i, 'closed_on', e.target.value)}
                      />
                    </label>
                  )}
                  {!vacancies.some((old) => old.vacancy_code === v.vacancy_code) && (
                    <button aria-label="Remover vaga" onClick={() => setJobs(jobs.filter((_, j) => j !== i))}>
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              ))}
              <button
                className="tw:rounded-[0.4375rem] tw:border tw:border-solid tw:border-[var(--v2-line-e5d6c9,#e5d6c9)] tw:bg-cali-surface tw:p-2.5 tw:text-[0.6875rem] tw:text-cali-brand tw:mt-1.5 tw:inline-flex tw:min-h-10 tw:items-center tw:gap-1.5 tw:font-bold"
                onClick={() =>
                  setJobs([
                    ...jobs,
                    {
                      vacancy_code: crypto.randomUUID(),
                      title: '',
                      department: '',
                      opened_on: '',
                      status: 'open',
                      closed_on: null,
                    },
                  ])
                }
              >
                <Plus size={16} /> Adicionar vaga
              </button>
            </>
          )}
          {stage === 4 && (
            <div className="tw:flex tw:flex-wrap tw:gap-2.5 tw:[&_p]:w-full tw:[&_p]:text-[0.83rem] tw:[&_p:first-child]:mb-1.75 tw:[&_p:first-child]:flex tw:[&_p:first-child]:flex-wrap tw:[&_p:first-child]:items-center tw:[&_p:first-child]:gap-1.25 tw:[&_p_svg]:mr-1 tw:[&_p_svg]:text-cali-gold tw:[&>div]:min-w-30 tw:[&>div]:rounded-xl tw:[&>div]:p-3.25 tw:[&_strong]:block tw:[&_strong]:font-cali-body tw:[&_strong]:text-[1.45rem] tw:[&_strong]:font-extrabold tw:[&_span]:text-[0.74rem]">
              <p>
                <CalendarDays size={17} /> Confirmação em <strong>{confirmationDate()}</strong> · Referência:{' '}
                <strong>
                  {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
                  )}
                </strong>
                .
              </p>
              <p>Pessoas não mencionadas nesta revisão continuam na equipe.</p>
              {['desligamentos', 'contratações', 'mudanças', 'vagas acompanhadas'].map((label, position) => (
                <div key={label}>
                  <strong>{rows[position]?.length ?? jobs.length}</strong>
                  <span>{label}</span>
                </div>
              ))}
              <ul className="tw:mt-1.75 tw:mb-0 tw:flex-[1_0_100%] tw:list-none tw:p-0 tw:empty:hidden tw:[&_li]:px-0.5 tw:[&_li]:py-2 tw:[&_li]:text-[0.79rem]">
                {rows[0].map((r) => (
                  <li key={r.rowId}>
                    <b>Saída:</b> {members.find((m) => m.employee_code === r.code)?.full_name || r.code} ·{' '}
                    {r.date?.split('-').reverse().join('/')}
                  </li>
                ))}
                {rows[1].map((r) => (
                  <li key={r.rowId}>
                    <b>Entrada:</b> {r.name} · {r.date?.split('-').reverse().join('/')}
                  </li>
                ))}
                {rows[2].map((r) => (
                  <li key={r.rowId}>
                    <b>Mudança:</b> {members.find((m) => m.employee_code === r.code)?.full_name || r.code}
                  </li>
                ))}
                {jobs.map((j) => (
                  <li key={j.vacancy_code}>
                    <b>Vaga:</b> {j.title} ·{' '}
                    {j.status === 'open' ? 'Em andamento' : j.status === 'filled' ? 'Preenchida' : 'Cancelada'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <TeamDialogFooter>
          {error && (
            <span
              className="tw:mx-[1.5625rem] tw:basis-full tw:rounded-lg tw:bg-[#fbecee] tw:px-3.25 tw:py-2.75 tw:text-[0.6875rem] tw:text-[#b05165] tw:workspace-night:text-[#ffb7b7]"
              role="alert"
            >
              {error}
            </span>
          )}
          {stage > 0 && (
            <TeamAction
              appearance="secondary"
              onClick={() => {
                setError('');
                setStage(stage - 1);
              }}
            >
              <ArrowLeft size={16} /> Voltar
            </TeamAction>
          )}
          {stage < 4 ? (
            <TeamAction onClick={next}>
              Continuar <ArrowRight size={16} />
            </TeamAction>
          ) : (
            <TeamAction disabled={saving} onClick={() => void save()}>
              <Check size={16} /> {saving ? 'Salvando…' : 'Confirmar mês'}
            </TeamAction>
          )}
        </TeamDialogFooter>
      </WorkflowDialog>
    </TeamDialogOverlay>,
    document.body,
  );
}
