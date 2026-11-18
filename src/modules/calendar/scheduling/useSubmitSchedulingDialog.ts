import { useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '../../../lib/errorMessage';

export function useSubmitSchedulingDialog(
  onSubmit: (form: FormData) => Promise<void>,
  onClose: () => void,
) {
  const pending = useRef(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    pending.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure, 'Não foi possível concluir a ação.'));
    } finally {
      pending.current = false;
      setPending(false);
    }
  }

  return { submit, isPending, error };
}
