import { useMutation } from '@tanstack/react-query';
import { submitRespondentQuestionnaire } from '../../../../api/disc/respondent';
import { useNavigate } from '../../../../hooks/useNavigate';

export function useSubmitRespondentQuestionnaire() {
  const navigate = useNavigate();
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ submission, draftKey }: { submission: Parameters<typeof submitRespondentQuestionnaire>[0]; draftKey: string }) => {
      const receipt = await submitRespondentQuestionnaire(submission);
      if (receipt.token) {
        try { localStorage.removeItem(draftKey); } catch { /* aparelho sem armazenamento */ }
      }
      return receipt;
    },
    onSuccess: ({ token }) => {
      if (token) navigate(`/perfil/relatorio/${token}`, { replace: true });
    },
  });
}
