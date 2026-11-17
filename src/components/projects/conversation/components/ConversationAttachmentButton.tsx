import { Button } from '../../../ds/Button';

export function ConversationAttachmentButton({ name, size, detail, onOpen, className, fill = false }: {
  name: string;
  size?: number;
  detail?: string;
  onOpen: () => void;
  className?: string;
  fill?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="unstyled"
      className={`tw:inline-flex tw:max-w-[min(23.08rem,100%)] tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-3.5 tw:py-2.5 tw:text-left tw:text-cali-ink tw:shadow-none ${fill ? 'tw:w-full' : 'tw:w-auto'} ${className ?? ''}`}
      onClick={onOpen}
    >
      <span aria-hidden="true">📎</span>
      <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-px">
        <strong className="tw:block tw:max-w-[17.69rem] tw:truncate tw:text-cali-body">{name}</strong>
        <small className="tw:text-xs tw:text-cali-muted">
          {detail ?? (size ? `${Math.max(1, Math.round(size / 1024))} KB` : 'arquivo')}
        </small>
      </span>
    </Button>
  );
}
