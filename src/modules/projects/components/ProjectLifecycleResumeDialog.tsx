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
    <div className="tw:grid tw:gap-1 tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem] tw:text-[.8462rem] tw:leading-relaxed tw:text-[#7a5a2c]">
      <strong>{hold.scope_label}</strong>
      <span>{hold.reason}</span>
      <small>{hold.resume_date && `Retomada prevista: ${formatProjectDate(hold.resume_date)} · `}interrompido desde {interruptedAt}</small>
    </div>
    <div className="tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem] tw:text-[.8462rem] tw:leading-relaxed tw:text-[#7a5a2c]">
      <strong>O que acontece agora?</strong>
      <p className="tw:m-0">Ao retomar, o Workspace contabiliza o período efetivamente interrompido em dias úteis, desloca os prazos ainda afetados por este escopo e recalcula a <strong>Previsão CALI</strong>. A Meta desejada continua como referência.</p>
    </div>
    <label className="tw:grid tw:gap-[.4615rem] tw:text-[.8462rem] tw:font-bold">Mensagem de retomada ao cliente
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={change.isPending}
        placeholder="Ex.: A pendência foi regularizada e retomaremos a execução a partir de hoje."
        className="tw:min-h-[6.46rem] tw:w-full tw:resize-y tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.9231rem] tw:py-[.7692rem] tw:text-[.9231rem] tw:font-normal" />
    </label>
  </ProjectActionDialog>;
}
