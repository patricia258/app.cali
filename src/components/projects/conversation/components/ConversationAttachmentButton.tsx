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
      className={`tw:inline-flex tw:max-w-[min(23.08rem,100%)] tw:cursor-pointer tw:items-center tw:gap-[.69rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-[#fffaf7] tw:px-[.92rem] tw:py-[.62rem] tw:text-left tw:text-cali-ink tw:shadow-none ${fill ? 'tw:w-full' : 'tw:w-auto'} ${className ?? ''}`}
      onClick={onOpen}
    >
      <span aria-hidden="true">📎</span>
      <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-px">
        <strong className="tw:block tw:max-w-[17.69rem] tw:truncate tw:text-[.92rem]">{name}</strong>
        <small className="tw:text-[.77rem] tw:text-[#8a7c74]">
          {detail ?? (size ? `${Math.max(1, Math.round(size / 1024))} KB` : 'arquivo')}
        </small>
      </span>
    </Button>
  );
}
