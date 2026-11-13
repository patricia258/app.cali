import { useState } from 'react';
import { useDeleteProjectFront } from '../hooks/useDeleteProjectFront';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  front: { id: string; name: string };
  totalDeliverables: number;
  targets: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function DeleteProjectFrontDialog({ front, totalDeliverables, targets, onClose, onSaved }: Props) {
  const [destination, setDestination] = useState('');
  const mutation = useDeleteProjectFront(front.id, onSaved);
  const hasDeliverables = totalDeliverables > 0;
  const valid = !hasDeliverables || targets.some(({ id }) => id === destination);

  return <ProjectActionDialog title="Excluir frente" kicker="Rascunho" onClose={onClose} pending={mutation.isPending}
    error={mutation.error?.message} action={hasDeliverables ? 'Transferir e excluir' : 'Excluir frente'} disabled={!valid}
    onSubmit={() => { if (valid) mutation.mutate(destination || null); }}>
    <p>Você está excluindo <strong>{front.name}</strong>.</p>
    {hasDeliverables ? <>
      <div className="tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.0769rem] tw:py-[.9231rem]">
        <strong>Esta frente tem {totalDeliverables} {totalDeliverables === 1 ? 'entregável' : 'entregáveis'}.</strong>
        <p>Para excluí-la sem perder trabalho, escolha a frente que receberá todos eles.</p>
      </div>
      <label className="tw:grid tw:gap-[.4615rem] tw:text-[.8462rem] tw:font-bold">Transferir entregáveis para
        <select value={destination} onChange={(event) => setDestination(event.target.value)} required
          className="tw:min-h-[3.2308rem] tw:w-full tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.9231rem] tw:py-[.7692rem] tw:text-[.9231rem] tw:font-normal">
          <option value="">Selecionar frente de destino</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
        </select>
      </label>
      {!targets.length && <p className="tw:text-cali-danger">Crie outra frente antes de excluir esta, pois há entregáveis vinculados.</p>}
    </> : <div className="tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-[#fbf7f4] tw:px-[1.0769rem] tw:py-[.9231rem]">
      <strong>Esta frente está vazia.</strong><p>Ela pode ser excluída agora porque ainda não possui entregáveis.</p>
    </div>}
  </ProjectActionDialog>;
}
