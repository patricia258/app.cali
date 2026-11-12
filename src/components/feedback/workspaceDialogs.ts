import './workspace-dialog.css';

type DialogOptions = { initialValue?: string; acknowledge?: boolean };

function openDialog(message: string, { initialValue, acknowledge = false }: DialogOptions = {}): Promise<string | null> {
  if (document.querySelector('.workspace-action-dialog[open]')) return Promise.resolve(null);

  const dialog = document.createElement('dialog');
  dialog.className = 'workspace-action-dialog';
  dialog.setAttribute('aria-label', message);
  const form = document.createElement('form');
  const description = document.createElement('p');
  description.textContent = message;
  form.append(description);

  const input = initialValue === undefined ? null : document.createElement('textarea');
  if (input) {
    input.setAttribute('aria-label', message);
    input.value = initialValue ?? '';
    input.autofocus = true;
    form.append(input);
  }

  const actions = document.createElement('footer');
  if (!acknowledge) {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancelar';
    cancel.autofocus = !input;
    cancel.addEventListener('click', () => dialog.close());
    actions.append(cancel);
  }
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = acknowledge ? 'OK' : 'Confirmar';
  actions.append(submit);
  form.append(actions);
  dialog.append(form);

  return new Promise((resolve) => {
    let result: string | null = null;
    const previous = document.activeElement;
    const close = () => dialog.close();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      result = input?.value ?? '';
      close();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    dialog.addEventListener('close', () => {
      window.removeEventListener('popstate', close);
      dialog.remove();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
      resolve(result);
    }, { once: true });
    window.addEventListener('popstate', close, { once: true });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export async function confirmAction(message: string) {
  return (await openDialog(message)) !== null;
}

export function promptText(message: string, initialValue = '') {
  return openDialog(message, { initialValue });
}

export async function showMessage(message: string) {
  await openDialog(message, { acknowledge: true });
}
