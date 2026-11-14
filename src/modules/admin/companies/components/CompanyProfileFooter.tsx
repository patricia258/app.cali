import type { ClientRow, LifecycleAction } from '../../../../domain/company';

type CompanyProfileFooterProps = {
  status: ClientRow['status'];
  onLifecycle: (action: LifecycleAction) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
};

export function CompanyProfileFooter({ status, onLifecycle, onCancel, onSave, saving }: CompanyProfileFooterProps) {
  const accessActions: Array<{ label: string; action: LifecycleAction }> = status === 'paused' || status === 'blocked'
    ? [{ label: 'Reativar', action: 'reactivate' }]
    : [{ label: 'Pausar', action: 'pause' }, { label: 'Bloquear', action: 'block' }];
  const actions: Array<{ label: string; action: LifecycleAction }> = [
    ...accessActions,
    { label: 'Arquivar', action: 'archive' },
    { label: 'Encerrar contrato', action: 'close' },
  ];

  return (
    <footer className="tw:flex tw:justify-between tw:gap-[.923rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eaded6] tw:bg-[#faf6f2] tw:px-[1.846rem] tw:py-[1.231rem] tw:max-[45rem]:flex-wrap tw:max-[45rem]:px-[.923rem]">
      <div role="group" aria-label="Situação da conta" className="tw:flex tw:flex-wrap tw:items-center tw:gap-[.615rem]">
        {actions.map(({ label, action }) => (
          <button key={action} type="button" onClick={() => onLifecycle(action)} className="tw:rounded-[.538rem] tw:border tw:border-solid tw:border-transparent tw:bg-transparent tw:px-[1rem] tw:py-[.769rem] tw:font-semibold tw:text-[#9d5452]">
            {label}
          </button>
        ))}
      </div>
      <div className="tw:flex tw:items-center tw:gap-[.615rem]">
        <button type="button" onClick={onCancel} className="tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[1rem] tw:py-[.769rem] tw:font-semibold tw:text-cali-brand">
          Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="tw:rounded-[.538rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1rem] tw:py-[.769rem] tw:font-semibold tw:text-white">
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </footer>
  );
}
