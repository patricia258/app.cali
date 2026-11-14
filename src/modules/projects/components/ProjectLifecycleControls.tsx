import { useState, type ReactNode } from 'react';
import type { AdminProjectLifecycle } from '../../../api/projects/lifecycle';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { useAdminProjectLifecycle } from '../hooks/useAdminProjectLifecycle';
import { ProjectActionDialog } from './ProjectActionDialog';
import { ProjectLifecycleBanner } from './ProjectLifecycleBanner';
import { ProjectLifecycleManageDialog } from './ProjectLifecycleManageDialog';
import { ProjectLifecycleResumeDialog } from './ProjectLifecycleResumeDialog';

type Props = {
  projectId: string | null;
  renderHero: (manage: ReactNode) => ReactNode;
  onChanged: () => Promise<void>;
};

export function ProjectLifecycleControls({ projectId, renderHero, onChanged }: Props) {
  const { user } = useWorkspaceAuth();
  const query = useAdminProjectLifecycle(user?.id, projectId);
  const [open, setOpen] = useState(false);
  const [resuming, setResuming] = useState<AdminProjectLifecycle['holds'][number] | null>(null);

  function close() {
    setOpen(false);
    setResuming(null);
  }

  async function onSaved() {
    await Promise.all([query.refetch(), onChanged()]);
    close();
  }

  return <>
    {renderHero(projectId && <button type="button" className="light-button tw:whitespace-nowrap" onClick={() => setOpen(true)}>Gerenciar projeto</button>)}
    {query.data && <ProjectLifecycleBanner context={query.data} onManage={() => setOpen(true)} />}
    {projectId && open && (query.data ? (resuming
      ? <ProjectLifecycleResumeDialog projectId={projectId} hold={resuming} onClose={close} onSaved={onSaved} />
      : <ProjectLifecycleManageDialog context={query.data} onClose={close} onResume={setResuming} onSaved={onSaved} />)
      : <ProjectActionDialog title="Gerenciar projeto" kicker="Controle de execução" cancelLabel="Fechar"
        action={query.isPending ? undefined : 'Tentar novamente'} onClose={close} onSubmit={() => void query.refetch()}>
        {query.isPending ? <p role="status">Carregando o contexto deste projeto…</p> : <p role="alert">Não foi possível carregar o contexto deste projeto.</p>}
      </ProjectActionDialog>)}
  </>;
}
