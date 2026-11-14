import { useId, useState } from 'react';
import type { AdminProjectLifecycle, ProjectLifecycleScope } from '../../../api/projects/lifecycle';
import { formatProjectDate } from '../../../domain/projects';
import { useChangeProjectLifecycle } from '../hooks/useChangeProjectLifecycle';
import { lifecycleOptions, lifecycleReasons, type LifecycleInterruption } from '../projectLifecycleOptions';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  context: AdminProjectLifecycle;
  onClose: () => void;
  onResume: (hold: AdminProjectLifecycle['holds'][number]) => void;
  onSaved: () => Promise<void>;
};

export function ProjectLifecycleManageDialog({ context, onClose, onResume, onSaved }: Props) {
  const fieldsId = useId();
  const [action, setAction] = useState<LifecycleInterruption>('pause');
  const [scope, setScope] = useState<ProjectLifecycleScope>('project');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [resumeDate, setResumeDate] = useState('');
  const [details, setDetails] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [validation, setValidation] = useState('');
  const change = useChangeProjectLifecycle(context.project.id, onSaved);
  const cancelled = context.project.execution_status === 'cancelled';
  const targets = scope === 'front' ? context.fronts : context.deliverables;

  function changeAction(next: LifecycleInterruption) {
    setAction(next);
    setReason('');
    setConfirmCancel(false);
  }

  function submit() {
    if (scope !== 'project' && !targetId) return setValidation(`Selecione ${scope === 'front' ? 'a frente' : 'o entregável'}.`);
    if (!reason) return setValidation('Selecione o motivo principal.');
    if (details.trim().length < 4) return setValidation('Explique brevemente o contexto para registrar e comunicar ao cliente.');
    if (action === 'cancel' && !confirmCancel) return setValidation('Confirme o cancelamento definitivo antes de continuar.');
    setValidation('');
    change.mutate({ action, scope, scopeId: scope === 'project' ? null : targetId,
      reason: `${reason} — ${details.trim()}`, resumeDate: action === 'cancel' ? null : resumeDate || null });
  }

  return <ProjectActionDialog title="Gerenciar projeto" kicker="Controle de execução"
    action={cancelled ? undefined : 'Aplicar ação'} cancelLabel="Fechar" pending={change.isPending}
    error={validation || change.error?.message} onClose={onClose} onSubmit={submit}>
    {context.holds.length > 0 && <section className="tw:grid tw:gap-2 tw:text-[.8462rem] tw:text-cali-muted">
      <strong>Interrupções ativas</strong>
      {context.holds.map((hold) => <article key={hold.id} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-(--theme-surface-soft) tw:px-[.9231rem] tw:py-[.7692rem]">
        <div className="tw:grid tw:gap-0.5">
          <strong className="tw:text-cali-text">{hold.action === 'pause' ? 'Pausado' : 'Suspenso'} · {hold.scope_label}</strong>
          <small>{hold.reason}{hold.resume_date && ` · previsão ${formatProjectDate(hold.resume_date)}`}</small>
        </div>
        {!cancelled && <button type="button" disabled={change.isPending} onClick={() => onResume(hold)}
          className="tw:min-h-[2.46rem] tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-white tw:px-3 tw:font-bold tw:text-cali-text">Retomar</button>}
      </article>)}
    </section>}
    {cancelled ? <div className="tw:flex tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:px-4 tw:py-3 tw:text-[.8462rem] tw:text-[#9d4b64]">
      <strong>Este projeto foi cancelado.</strong><span>O histórico permanece disponível. O cancelamento não é revertido por esta tela.</span>
    </div> : <fieldset disabled={change.isPending} className="tw:m-0 tw:grid tw:min-w-0 tw:gap-[1.0769rem] tw:border-0 tw:p-0 tw:[&_label]:text-[.8462rem] tw:[&_label]:font-bold tw:[&_:is(select,textarea,input[type=date])]:min-h-[3.23rem] tw:[&_:is(select,textarea,input[type=date])]:w-full tw:[&_:is(select,textarea,input[type=date])]:rounded-[.5385rem] tw:[&_:is(select,textarea,input[type=date])]:border tw:[&_:is(select,textarea,input[type=date])]:border-solid tw:[&_:is(select,textarea,input[type=date])]:border-[#e5d8d0] tw:[&_:is(select,textarea,input[type=date])]:bg-white tw:[&_:is(select,textarea,input[type=date])]:px-[.9231rem] tw:[&_:is(select,textarea,input[type=date])]:py-[.7692rem] tw:[&_:is(select,textarea,input[type=date])]:text-[.9231rem] tw:[&_:is(select,textarea,input[type=date])]:font-normal">
      <div role="radiogroup" aria-label="Ação" className="tw:grid tw:grid-cols-3 tw:gap-3 tw:max-sm:grid-cols-1">
        {(Object.keys(lifecycleOptions) as LifecycleInterruption[]).map((option) => <label key={option}
          className={`tw:flex tw:cursor-pointer tw:flex-col tw:gap-1.5 tw:rounded-lg tw:border tw:border-solid tw:px-[1.0769rem] tw:py-4 tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-accent ${option === action ? 'tw:border-cali-brand tw:bg-[#fdfaf7] tw:shadow-[inset_.231rem_0_#5a1e2d]' : 'tw:border-[#e9ddd4] tw:bg-white'}`}>
          <input type="radio" name={`${fieldsId}-action`} aria-label={lifecycleOptions[option].label} className="tw:sr-only"
            value={option} checked={action === option} onChange={() => changeAction(option)} />
          <strong className="tw:text-[.9231rem]">{lifecycleOptions[option].label}</strong>
          <small className="tw:text-[.7692rem] tw:leading-relaxed tw:font-normal tw:text-cali-muted">{lifecycleOptions[option].description}</small>
        </label>)}
      </div>
      <div className="tw:grid tw:gap-1.5">
        <label htmlFor={`${fieldsId}-scope`}>Escopo</label>
        <select id={`${fieldsId}-scope`} value={scope} onChange={(event) => { setScope(event.target.value as ProjectLifecycleScope); setTargetId(''); }}>
          <option value="project">Projeto inteiro</option><option value="front">Uma frente</option><option value="deliverable">Um entregável</option>
        </select>
      </div>
      {scope !== 'project' && <div className="tw:grid tw:gap-1.5">
        <label htmlFor={`${fieldsId}-target`}>{scope === 'front' ? 'Frente' : 'Entregável'}</label>
        <select id={`${fieldsId}-target`} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          <option value="">{scope === 'front' ? 'Selecionar frente' : 'Selecionar entregável'}</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{'name' in target ? target.name : `${target.title}${target.workstream ? ` · ${target.workstream}` : ''}`}</option>)}
        </select>
      </div>}
      <div className="tw:grid tw:gap-1.5">
        <label htmlFor={`${fieldsId}-reason`}>Motivo principal</label>
        <select id={`${fieldsId}-reason`} value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="">Selecione o motivo principal</option>
          {lifecycleReasons[action].map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      {action !== 'cancel' && <label className="tw:grid tw:gap-1.5">Previsão de retomada (opcional)
        <input type="date" value={resumeDate} onChange={(event) => setResumeDate(event.target.value)} />
      </label>}
      <label className="tw:grid tw:gap-1.5">Justificativa / mensagem ao cliente
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} className="tw:min-h-[6.46rem] tw:resize-y"
          placeholder="Explique o contexto de forma objetiva. Esta mensagem ficará registrada e, se o cronograma já foi compartilhado, será enviada ao cliente." />
      </label>
      <div className="tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem] tw:text-[.8462rem] tw:leading-relaxed tw:text-[#7a5a2c]">
        <strong>Impacto no cronograma</strong>
        <p className="tw:m-0">A pausa ou suspensão não altera o escopo nem a qualidade da entrega. O cronograma fica congelado durante a interrupção. Na retomada, o Workspace contabiliza o período efetivamente interrompido em dias úteis, desloca os prazos afetados e recalcula a <strong>Previsão CALI</strong>. A Meta desejada permanece como referência.</p>
      </div>
      {action === 'cancel' && <label className="tw:flex tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:px-4 tw:py-3 tw:text-[#9d4b64]">
        <input type="checkbox" checked={confirmCancel} onChange={(event) => setConfirmCancel(event.target.checked)} />
        Confirmo que desejo cancelar definitivamente o escopo selecionado.
      </label>}
    </fieldset>}
  </ProjectActionDialog>;
}
