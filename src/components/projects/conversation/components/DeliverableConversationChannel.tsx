export function DeliverableConversationChannel({ visible, disabled, onChange }: {
  visible: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div role="group" aria-label="Canal da conversa" className="tw:flex tw:w-fit tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:workspace-night:border-cali-line">
      {[{ label: 'Cliente', value: true }, { label: 'Interno', value: false }].map(({ label, value }) => (
        <button
          key={label}
          type="button"
          aria-pressed={visible === value}
          disabled={disabled}
          onClick={() => onChange(value)}
          className="tw:min-h-[2.15rem] tw:rounded-lg tw:border-0 tw:bg-cali-surface tw:px-3 tw:text-xs tw:text-cali-muted tw:aria-pressed:bg-cali-brand tw:aria-pressed:text-cali-neutral-surface"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
