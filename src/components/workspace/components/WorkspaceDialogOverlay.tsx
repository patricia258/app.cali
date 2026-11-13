import type { ComponentPropsWithoutRef } from 'react';
import './workspace-dialog-motion.css';

type WorkspaceDialogOverlayProps = ComponentPropsWithoutRef<'div'> & {
  alignment?: 'center' | 'drawer';
  aboveDialog?: boolean;
};

export function WorkspaceDialogOverlay({
  alignment = 'center',
  aboveDialog,
  className = '',
  ...props
}: WorkspaceDialogOverlayProps) {
  return (
    <div
      {...props}
      className={`tw:fixed tw:inset-0 tw:grid tw:bg-[#171017a8] tw:backdrop-blur-[.308rem] tw:motion-safe:animate-[workspace-dialog-fade_.22s_ease-out_backwards] ${alignment === 'drawer'
        ? 'tw:items-stretch tw:justify-end'
        : 'tw:place-items-center tw:p-[1.385rem] tw:max-[43.125rem]:p-[.538rem] tw:motion-safe:[&>*]:animate-[workspace-dialog-enter_.34s_cubic-bezier(.2,.7,.2,1)_backwards]'} ${aboveDialog ? 'tw:z-990' : 'tw:z-980'} ${className}`}
    />
  );
}
