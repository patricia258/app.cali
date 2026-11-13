import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import type { FormEvent } from 'react';
import { WorkspaceFormDialog, WorkspaceFormDialogBody, WorkspaceFormDialogField, WorkspaceFormDialogFields, WorkspaceFormDialogFooter, WorkspaceFormDialogHeader, WorkspaceFormDialogContext } from '../../../components/workspace/components/WorkspaceFormDialog';
import { FrontCatalogField } from './FrontCatalogField';
import type { FrontForm } from '../projectForms';

type Props = {
  project: { company: string; name: string };
  front: FrontForm;
  taken: string[];
  duplicate: boolean;
  staff: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (patch: Partial<FrontForm>) => void;
};

export function CreateProjectFrontDialog({ project, front, taken, duplicate, staff, saving, onClose, onSubmit, onChange }: Props) {
  return <WorkspaceDialogOverlay>
    <WorkspaceFormDialog className="tw:max-w-[49.231rem]!" aria-label="Nova frente" onSubmit={onSubmit}>
      <WorkspaceFormDialogHeader kicker="OPERAÇÃO / PROJETOS" title="Adicionar frente ao cronograma" description="A frente organiza um bloco de trabalho. Dentro dela serão criados os entregáveis e suas subtarefas." onClose={onClose}>
        <WorkspaceFormDialogContext values={[{ label: 'Conta', value: project.company }, { label: 'Projeto / cronograma', value: project.name }]} />
      </WorkspaceFormDialogHeader>
      <WorkspaceFormDialogBody>
        <WorkspaceFormDialogFields>
          <WorkspaceFormDialogField wide>
            <span>Nome da frente</span>
            {staff
              ? <input value={front.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Ex.: Cultura & Clima"/>
              : <><FrontCatalogField name={front.name} taken={taken} onChange={(name) => onChange({ name })}/>
                <small className="tw:mt-[.3846rem] tw:block tw:text-[.7308rem] tw:leading-[1.4] tw:font-medium tw:text-cali-muted">Frentes já usadas neste projeto ficam indisponíveis para evitar duplicidade.</small>
              </>}
          </WorkspaceFormDialogField>
          <WorkspaceFormDialogField wide>
            <span>Objetivo / contexto</span><textarea rows={3} value={front.objective} onChange={(event) => onChange({ objective: event.target.value })}/>
          </WorkspaceFormDialogField>
          {staff && <>
            <WorkspaceFormDialogField><span>Mês inicial</span><input type="number" min={1} value={front.monthStart} onChange={(event) => onChange({ monthStart: Number(event.target.value) })}/></WorkspaceFormDialogField>
            <WorkspaceFormDialogField><span>Mês final</span><input type="number" min={front.monthStart} value={front.monthEnd} onChange={(event) => onChange({ monthEnd: Number(event.target.value) })}/></WorkspaceFormDialogField>
          </>}
        </WorkspaceFormDialogFields>
      </WorkspaceFormDialogBody>
      <WorkspaceFormDialogFooter onCancel={onClose} submitLabel="Adicionar frente" disabled={saving || !front.name.trim() || duplicate} />
    </WorkspaceFormDialog>
  </WorkspaceDialogOverlay>;
}
