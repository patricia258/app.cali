export function DeliverableConversationChannel({ visible, disabled, onChange }: {
  visible: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div role="group" aria-label="Canal da conversa" className="tw:flex tw:w-fit tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-cali-surface tw:workspace-night:border-cali-line">
      {[{ label: 'Cliente', value: true }, { label: 'Interno', value: false }].map(({ label, value }) => (
        <button
          key={label}
          type="button"
          aria-pressed={visible === value}
          disabled={disabled}
          onClick={() => onChange(value)}
          className="tw:min-h-[2.15rem] tw:rounded-[.54rem] tw:border-0 tw:bg-cali-surface tw:px-[.77rem] tw:text-[.77rem] tw:text-cali-muted tw:aria-pressed:bg-cali-brand tw:aria-pressed:text-white"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
