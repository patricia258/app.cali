import { Textarea } from '../../../components/ds/Textarea';
import { useState } from 'react';
import type { AdminProjectLifecycle, ProjectLifecycleScope } from '../../../api/projects/lifecycle';
import { formatProjectDate } from '../../../domain/projects';
import { useChangeProjectLifecycle } from '../hooks/useChangeProjectLifecycle';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  projectId: string;
  hold: AdminProjectLifecycle['holds'][number];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const scopeLabels: Record<ProjectLifecycleScope, string> = { project: 'projeto', front: 'frente', deliverable: 'entregável' };

export function ProjectLifecycleResumeDialog({ projectId, hold, onClose, onSaved }: Props) {
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState('');
  const change = useChangeProjectLifecycle(projectId, onSaved);
  const scope = hold.scope_type as ProjectLifecycleScope;
  const interruptedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(hold.created_at)).replace('.', '');

  function submit() {
    const reason = message.trim();
    if (reason.length < 4) return setValidation('Informe a mensagem de retomada que será registrada e enviada ao cliente.');
    setValidation('');
    change.mutate({ action: 'resume', scope, scopeId: hold.scope_id, reason, resumeDate: null });
  }

  return <ProjectActionDialog title={`Retomar ${scopeLabels[scope]}`} kicker="Retomada e recálculo"
    action="Retomar e recalcular" cancelLabel="Voltar" pending={change.isPending}
    error={validation || change.error?.message} onClose={onClose} onSubmit={submit}>
    <div className="tw:grid tw:gap-1 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4.5 tw:py-3.5 tw:text-sm tw:leading-relaxed tw:text-cali-warning">
      <strong>{hold.scope_label}</strong>
      <span>{hold.reason}</span>
      <small>{hold.resume_date && `Retomada prevista: ${formatProjectDate(hold.resume_date)} · `}interrompido desde {interruptedAt}</small>
    </div>
    <div className="tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4.5 tw:py-3.5 tw:text-sm tw:leading-relaxed tw:text-cali-warning">
      <strong>O que acontece agora?</strong>
      <p className="tw:m-0">Ao retomar, o Workspace contabiliza o período efetivamente interrompido em dias úteis, desloca os prazos ainda afetados por este escopo e recalcula a <strong>Previsão CALI</strong>. A Meta desejada continua como referência.</p>
    </div>
    <label className="tw:grid tw:gap-2 tw:text-sm tw:font-bold">Mensagem de retomada ao cliente
      <Textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={change.isPending}
        placeholder="Ex.: A pendência foi regularizada e retomaremos a execução a partir de hoje."
        className="tw:w-full" />
    </label>
  </ProjectActionDialog>;
}
