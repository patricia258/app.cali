import { useMutation } from '@tanstack/react-query';
import { uploadRecordAttachment } from '../../../../api/records/conversation';

const allowedTypes = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function useUploadRecordMessageAttachment(companyId: string, recordId: string, actorId?: string) {
  return useMutation({
    gcTime: 0,
    mutationFn: async (file: File) => {
      if (!actorId) throw new Error('Sessão não encontrada.');
      if (!allowedTypes.has(file.type)) throw new Error('Use PDF, imagem, Word, Excel ou PowerPoint.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Cada anexo pode ter até 10 MB.');
      const name = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 90) || 'arquivo';
      const path = `records/${companyId}/${recordId}/${actorId}/${Date.now()}-${crypto.randomUUID()}-${name}`;
      const { error } = await uploadRecordAttachment(path, file);
      if (error) throw new Error(`Não foi possível anexar “${file.name}”.`);
      return path;
    },
  });
}
