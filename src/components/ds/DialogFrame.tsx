import type { ComponentPropsWithoutRef } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { dialogFieldStyles } from './dialogFieldStyles';

type DialogFrameProps = ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'aside' | 'div';
  role?: 'dialog' | 'alertdialog';
};

export function DialogFrame({ as: Element = 'section', role = 'dialog', tabIndex = -1, className, onKeyDown, ...props }: DialogFrameProps) {
  const { ref, handleKeyDown } = useDialogFocus();

  return <Element
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
