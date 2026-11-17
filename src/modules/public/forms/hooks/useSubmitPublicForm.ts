import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { submitPublicForm } from '../../../../api/forms/public';
import { formSubmissionKey } from '../../../forms/formModel';

export function useSubmitPublicForm() {
  const submissionIds = useRef(new Map<string, string>());
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ form, answers }: { form: Parameters<typeof submitPublicForm>[0]; answers: Parameters<typeof submitPublicForm>[1] }) => {
      const key = await formSubmissionKey(form.id, answers);
      let requestId = submissionIds.current.get(key);
      try { requestId ||= sessionStorage.getItem(key) || undefined; } catch { /* retry em memória */ }
      requestId ||= crypto.randomUUID();
      submissionIds.current.set(key, requestId);
      try { sessionStorage.setItem(key, requestId); } catch { /* retry em memória */ }
      await submitPublicForm(form, answers, requestId);
      submissionIds.current.delete(key);
      try { sessionStorage.removeItem(key); } catch { /* storage indisponível */ }
    },
  });
}
