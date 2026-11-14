import { useMutation } from '@tanstack/react-query';
import { requestAccessCode } from '../../../../api/access/codes';
import { isSupabaseConfigured } from '../../../../api/access/session';

export function useRequestAccessCode() {
  return useMutation({
    gcTime: 0,
    mutationFn: async (email: string) => {
      if (!isSupabaseConfigured) throw new Error('O ambiente seguro do Workspace ainda não está conectado.');
      const result = await requestAccessCode(email.trim());
      if (result.error) throw new Error('Não foi possível enviar o código de acesso.');
      sessionStorage.removeItem('cali-preview-role');
    },
  });
}
