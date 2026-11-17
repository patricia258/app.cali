import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { useClientProjectLifecycle } from '../hooks/useClientProjectLifecycle';
import { scheduleReviewDate } from '../scheduleReviewDate';

const lifecycleTitles: Record<string, string> = {
  paused: 'Projeto pausado pela CALI',
  suspended: 'Projeto suspenso pela CALI',
  cancelled: 'Projeto cancelado',
};

export function ClientProjectLifecycleBanner({ companyId, projectId }: { companyId: string; projectId: string | null }) {
  const { user } = useWorkspaceAuth();
  const query = useClientProjectLifecycle(user?.id, companyId, projectId);

  if (query.isError) return <InlineNotice role="alert">
    Não foi possível consultar a situação de execução do projeto.{' '}
    <button type="button" onClick={() => void query.refetch()} className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-current tw:underline">Tentar novamente</button>
  </InlineNotice>;
  if (!query.data) return null;
  const { project, holds } = query.data;
  const state = project.execution_status || 'normal';
  if (state === 'normal' && !holds.length) return null;

  const hold = holds.find((item) => item.scope_type === 'project') ?? holds[0];
  const partialTitle = holds.length === 1
    ? `${hold?.scope_type === 'front' ? 'Frente' : 'Entregável'} temporariamente interrompido`
    : `${holds.length} itens do cronograma estão interrompidos`;
  const title = lifecycleTitles[state] ?? partialTitle;
  const reason = project.lifecycle_reason || hold?.reason || 'Existe uma atualização operacional neste cronograma.';
  const resume = project.lifecycle_resume_date || hold?.resume_date;

  return <section aria-label="Atualização do projeto" className="tw:mt-3 tw:mb-4 tw:grid tw:gap-1 tw:rounded-xl tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-5 tw:py-4 tw:text-cali-sand-strong tw:workspace-night:border-cali-gold-text tw:workspace-night:bg-cali-sand-inverse tw:workspace-night:text-cali-gold-soft">
    <span className="tw:text-cali-label tw:font-bold tw:tracking-[.11em] tw:text-cali-warning tw:uppercase tw:workspace-night:text-cali-gold-line">Atualização do projeto</span>
    <strong className="tw:text-base tw:text-cali-text">{title}</strong>
    <p className="tw:m-0 tw:text-sm tw:leading-[1.5]">{reason}{resume && ` · previsão de retomada ${scheduleReviewDate(resume)}`}. A qualidade e o escopo permanecem preservados. O prazo será recalculado na retomada conforme o período efetivamente interrompido.</p>
  </section>;
}
