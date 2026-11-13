import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { readWorkspaceDialog, subscribeWorkspaceDialog } from './workspaceDialogs';

export function WorkspaceActionDialog() {
  const request = useSyncExternalStore(subscribeWorkspaceDialog, readWorkspaceDialog);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!request || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    firstAction.current?.focus();

    const cancel = () => request.complete(false);
    window.addEventListener('popstate', cancel, { once: true });
    return () => {
      window.removeEventListener('popstate', cancel);
      if (dialog.open) dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [request]);

  if (!request) return null;
  return createPortal(<dialog ref={dialogRef} data-workspace-action-dialog aria-label={request.message}
    onCancel={(event) => { event.preventDefault(); request.complete(false); }}
    onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation(); }}
    className="tw:w-[min(33.875rem,calc(100vw-2.5rem))] tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-5 tw:text-cali-text tw:backdrop:bg-[#1a1112]/60">
    <form className="tw:grid tw:gap-4" onSubmit={(event) => { event.preventDefault(); request.complete(true); }}>
      <p className="tw:m-0 tw:whitespace-pre-line">{request.message}</p>
      <footer className="tw:flex tw:justify-end tw:gap-2">
        {!request.acknowledge && <button ref={firstAction} type="button" onClick={() => request.complete(false)}
          className="tw:min-h-cali-control tw:cursor-pointer tw:rounded-cali-control tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-4 tw:font-bold tw:text-inherit">Cancelar</button>}
        <button ref={request.acknowledge ? firstAction : undefined} type="submit"
          className="tw:min-h-cali-control tw:cursor-pointer tw:rounded-cali-control tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4 tw:font-bold tw:text-white">{request.acknowledge ? 'OK' : 'Confirmar'}</button>
      </footer>
    </form>
  </dialog>, document.body);
}
