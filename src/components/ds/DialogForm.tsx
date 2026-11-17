import type { ComponentPropsWithoutRef } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { dialogFieldStyles } from './dialogFieldStyles';

type DialogFormProps = ComponentPropsWithoutRef<'form'> & {
  role?: 'dialog' | 'alertdialog';
};

export function DialogForm({ role = 'dialog', tabIndex = -1, className, onKeyDown, ...props }: DialogFormProps) {
  const { ref, handleKeyDown } = useDialogFocus();

  return <form
    {...props}
    className={role === 'dialog' ? `${dialogFieldStyles} ${className ?? ''}` : className}
    ref={(element) => { ref.current = element; }}
    role={role}
    aria-modal="true"
    tabIndex={tabIndex}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      handleKeyDown(event);
    }}
  />;
}
