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
    <footer className="tw:flex tw:justify-between tw:gap-3.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-sand-line tw:bg-cali-surface-soft tw:px-7.5 tw:py-5 tw:max-[45rem]:flex-wrap tw:max-[45rem]:px-3.5">
      <div role="group" aria-label="Situação da conta" className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.5">
        {actions.map(({ label, action }) => (
          <button key={action} type="button" onClick={() => onLifecycle(action)} className="tw:rounded-lg tw:border tw:border-solid tw:border-transparent tw:bg-transparent tw:px-4 tw:py-3 tw:font-semibold tw:text-cali-red-text">
            {label}
          </button>
        ))}
      </div>
      <div className="tw:flex tw:items-center tw:gap-2.5">
        <button type="button" onClick={onCancel} className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3 tw:font-semibold tw:text-cali-brand">
          Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4 tw:py-3 tw:font-semibold tw:text-cali-neutral-surface">
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </footer>
  );
}
