import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import type { FormEvent } from 'react';
import { format, addDays } from 'date-fns';
import { WorkspaceFormDialog, WorkspaceFormDialogBody, WorkspaceFormDialogField, WorkspaceFormDialogFields, WorkspaceFormDialogFooter, WorkspaceFormDialogHeader, WorkspaceFormDialogContext, WorkspaceFormDialogCheck } from '../../../components/workspace/components/WorkspaceFormDialog';
import { complexityMeta, complexityRange, formatProjectDate, type MaterialComplexity } from '../../../domain/projects';
import type { DeliverableForm } from '../projectForms';
import { ComplexityLegend } from './ComplexityLegend';

type Props = {
  project: { company: string; name: string };
  fronts: { id: string; name: string }[];
  deliverable: DeliverableForm;
  editing: boolean;
  reviewed: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (patch: Partial<DeliverableForm>) => void;
};

const complexities = Object.keys(complexityMeta) as MaterialComplexity[];

export function DeliverableEditorDialog({ project, fronts, deliverable, editing, reviewed, saving, onClose, onSubmit, onChange }: Props) {
  const { minDays, maxDays } = complexityMeta[deliverable.complexity];
  const today = new Date();
  const first = format(addDays(today, minDays), 'yyyy-MM-dd');
  const last = format(addDays(today, maxDays), 'yyyy-MM-dd');
  const outside = Boolean(deliverable.dueDate) && (deliverable.dueDate < first || deliverable.dueDate > last);

  return <WorkspaceDialogOverlay>
    <WorkspaceFormDialog aria-label="Entregável" onSubmit={onSubmit}>
      <WorkspaceFormDialogHeader kicker="OPERAÇÃO / PROJETOS" title={editing ? 'Atualizar entregável' : 'Criar entregável'} description="O entregável pertence a uma frente e pode ser desdobrado em quantas subtarefas forem necessárias." onClose={onClose}>
        <WorkspaceFormDialogContext values={[{ label: 'Conta', value: project.company }, { label: 'Projeto / cronograma', value: project.name }]} />
      </WorkspaceFormDialogHeader>
      <WorkspaceFormDialogBody>
        <WorkspaceFormDialogFields>
          <WorkspaceFormDialogField><span>Título</span><input value={deliverable.title} onChange={(event) => onChange({ title: event.target.value })}/></WorkspaceFormDialogField>
          <WorkspaceFormDialogField>
            <span>Frente</span>
            <select value={deliverable.frontId} onChange={(event) => onChange({ frontId: event.target.value })}>
              <option value="">Selecionar frente</option>
              {fronts.map((front) => <option key={front.id} value={front.id}>{front.name}</option>)}
            </select>
          </WorkspaceFormDialogField>
          <WorkspaceFormDialogField>
            <span>Complexidade</span>
            <select value={deliverable.complexity} onChange={(event) => onChange({ complexity: event.target.value as MaterialComplexity })}>
              {complexities.map((code) => <option key={code} value={code}>{complexityMeta[code].label}</option>)}
            </select>
          </WorkspaceFormDialogField>
          <WorkspaceFormDialogField>
            <span>Prazo</span><input type="date" value={deliverable.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })}/>
            <small className={`tw:mt-[.462rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[.615rem] tw:text-[.846rem] ${outside ? 'tw:font-bold tw:text-[#8a5a12]' : 'tw:font-medium tw:text-[#6b5f58]'}`}>
              {outside
                ? `Fora da faixa estimada para ${deliverable.complexity} (${formatProjectDate(first)} a ${formatProjectDate(last)}). Ajuste manual permitido.`
                : `Faixa estimada para ${deliverable.complexity}: ${formatProjectDate(first)} a ${formatProjectDate(last)} (${complexityRange(deliverable.complexity)}).`}
              {!deliverable.dueDate && <button type="button" className="tw:h-[2rem] tw:cursor-pointer tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[.77rem] tw:text-[.846rem] tw:font-bold tw:text-cali-brand" onClick={() => onChange({ dueDate: last })}>Usar {formatProjectDate(last)}</button>}
            </small>
          </WorkspaceFormDialogField>
          <WorkspaceFormDialogField wide><span>Descrição / resultado esperado</span><textarea rows={3} value={deliverable.description} onChange={(event) => onChange({ description: event.target.value })}/></WorkspaceFormDialogField>
          <WorkspaceFormDialogCheck><input type="checkbox" checked={deliverable.clientVisible} disabled={reviewed} onChange={(event) => onChange({ clientVisible: event.target.checked })}/> {reviewed ? 'Visibilidade definida ao liberar a revisão' : 'Visível para o cliente'}</WorkspaceFormDialogCheck>
          <WorkspaceFormDialogCheck><input type="checkbox" checked={deliverable.isDocument} onChange={(event) => onChange({ isDocument: event.target.checked })}/> Entrega documental</WorkspaceFormDialogCheck>
        </WorkspaceFormDialogFields>
        <div className="tw:mt-[1.231rem] tw:mb-[1.385rem]"><ComplexityLegend current={deliverable.complexity}/></div>
      </WorkspaceFormDialogBody>
      <WorkspaceFormDialogFooter onCancel={onClose} submitLabel={saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar entregável'} disabled={saving || !deliverable.title.trim() || !deliverable.frontId} />
    </WorkspaceFormDialog>
  </WorkspaceDialogOverlay>;
}
