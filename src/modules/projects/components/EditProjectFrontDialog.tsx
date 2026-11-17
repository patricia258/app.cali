import { Textarea } from '../../../components/ds/Textarea';
import { useState } from 'react';
import { FrontCatalogField, normalizeFrontName } from './FrontCatalogField';
import { useRenameProjectFront } from '../hooks/useRenameProjectFront';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  front: { id: string; name: string; objective: string };
  otherNames: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function EditProjectFrontDialog({ front, otherNames, onClose, onSaved }: Props) {
  const [name, setName] = useState(front.name);
  const [objective, setObjective] = useState(front.objective);
  const mutation = useRenameProjectFront(front.id, onSaved);
  const duplicate = otherNames.some((value) => normalizeFrontName(value) === normalizeFrontName(name));
  const valid = name.trim().length >= 2 && !duplicate;

  return <ProjectActionDialog title="Editar frente" kicker="Rascunho" onClose={onClose} pending={mutation.isPending}
    error={mutation.error?.message} action="Salvar frente" disabled={!valid}
    onSubmit={() => { if (valid) mutation.mutate({ name, objective }); }}>
    <div className="tw:grid tw:gap-2 tw:text-sm tw:font-bold">
      <span>Frente</span>
      <FrontCatalogField name={name} taken={otherNames} onChange={setName}/>
    </div>
    <label className="tw:grid tw:gap-2 tw:text-sm tw:font-bold">Objetivo / contexto
      <Textarea className="tw:w-full"
        value={objective} rows={4} onChange={(event) => setObjective(event.target.value)}/>
    </label>
    <p className="tw:m-0 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-4.5 tw:py-3.5 tw:text-sm tw:leading-[1.6]">
      A alteração atualiza também o vínculo nominal dos entregáveis desta frente.
    </p>
  </ProjectActionDialog>;
}
