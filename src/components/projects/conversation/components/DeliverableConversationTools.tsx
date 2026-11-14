import { useRef, useState } from 'react';

const emojis = ['🙂', '😊', '👍', '🙏', '✨', '✅', '💡', '📌', '📎', '❤️', '👏', '🤝'];
const accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';

function ConversationToolButton({ name, icon, label, disabled, onClick }: {
  name: string;
  icon: string;
  label?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={name} title={name} disabled={disabled} onClick={onClick}
      className="tw:inline-flex tw:min-h-[2.77rem] tw:items-center tw:gap-1.5 tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-[#fffaf7] tw:px-[.54rem] tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:text-[.846rem] tw:font-semibold tw:text-cali-text tw:motion-safe:transition-transform tw:motion-safe:hover:-translate-y-0.5">
      <span aria-hidden="true" className="tw:text-sm">{icon}</span>
      {label && <span aria-hidden="true">{label}</span>}
    </button>
  );
}

export function DeliverableConversationTools({ disabled, onFiles, onLink, onEmoji }: {
  disabled: boolean;
  onFiles: (files: FileList | null) => void;
  onLink: () => void;
  onEmoji: (emoji: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  function closeEmojis() {
    setEmojiOpen(false);
    toggle.current?.focus();
  }

  return (
    <div className="tw:relative tw:flex tw:gap-[.54rem]">
      <ConversationToolButton name="Anexar arquivo" icon="📎" label="Anexar" disabled={disabled} onClick={() => input.current?.click()} />
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(event) => {
        onFiles(event.target.files);
        event.target.value = '';
      }} />
      <ConversationToolButton name="Inserir link" icon="🔗" label="Link" disabled={disabled} onClick={onLink} />
      <button ref={toggle} type="button" aria-label="Abrir emojis" title="Emojis" disabled={disabled} aria-expanded={emojiOpen} onClick={() => setEmojiOpen((current) => !current)}
        className="tw:min-h-[2.77rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-[#fffaf7] tw:px-[.54rem] tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:motion-safe:transition-transform tw:motion-safe:hover:-translate-y-0.5">
        😊
      </button>
      {emojiOpen && !disabled && <div role="group" aria-label="Emojis" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); closeEmojis(); }
      }} className="tw:absolute tw:bottom-full tw:left-0 tw:z-10 tw:flex tw:w-56 tw:flex-wrap tw:gap-1 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-2 tw:shadow-lg">
        {emojis.map((emoji) => <button type="button" key={emoji} className="tw:rounded-md tw:border-0 tw:bg-transparent tw:p-1 tw:hover:bg-(--theme-surface-soft)"
          onClick={() => { setEmojiOpen(false); onEmoji(emoji); }}>{emoji}</button>)}
      </div>}
    </div>
  );
}
