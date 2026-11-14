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
    <div className="tw:grid tw:gap-[.4615rem] tw:text-[.8462rem] tw:font-bold">
      <span>Frente</span>
      <FrontCatalogField name={name} taken={otherNames} onChange={setName}/>
    </div>
    <label className="tw:grid tw:gap-[.4615rem] tw:text-[.8462rem] tw:font-bold">Objetivo / contexto
      <textarea className="tw:min-h-[6.4615rem] tw:w-full tw:resize-y tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.9231rem] tw:py-[.7692rem] tw:text-[.9231rem] tw:font-normal"
        value={objective} rows={4} onChange={(event) => setObjective(event.target.value)}/>
    </label>
    <p className="tw:m-0 tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-[#fbf7f4] tw:px-[1.0769rem] tw:py-[.9231rem] tw:text-[.8462rem] tw:leading-[1.6]">
      A alteração atualiza também o vínculo nominal dos entregáveis desta frente.
    </p>
  </ProjectActionDialog>;
}
