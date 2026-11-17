export function MeetingRecordAction({ primary, type = 'button', children, ...props }: {
  primary?: boolean;
  type?: 'button' | 'submit';
  children: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return <button {...props} type={type} data-primary={Boolean(primary)}
    className="tw:justify-self-start tw:rounded-lg tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[1.2] tw:font-bold tw:text-cali-brand tw:data-[primary=true]:border-cali-brand tw:data-[primary=true]:bg-cali-brand tw:data-[primary=true]:text-cali-neutral-surface tw:disabled:opacity-50"
  >{children}</button>;
}
