type DialogRequest = {
  message: string;
  acknowledge: boolean;
  complete: (accepted: boolean) => void;
};

let current: DialogRequest | null = null;
const listeners = new Set<() => void>();

export function subscribeWorkspaceDialog(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function readWorkspaceDialog() {
  return current;
}

function publish() {
  listeners.forEach((listener) => listener());
}

function openDialog(message: string, acknowledge: boolean): Promise<boolean> {
  if (current) return Promise.resolve(false);
  return new Promise((resolve) => {
    const request: DialogRequest = {
      message,
      acknowledge,
      complete(accepted) {
        if (current !== request) return;
        current = null;
        publish();
        resolve(accepted);
      },
    };
    current = request;
    publish();
  });
}

export function confirmAction(message: string) {
  return openDialog(message, false);
}

export async function showMessage(message: string) {
  await openDialog(message, true);
}
