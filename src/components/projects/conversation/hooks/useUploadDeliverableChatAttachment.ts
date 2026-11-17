import { useMutation } from '@tanstack/react-query';
import { uploadDeliverableAttachment } from '../../../../api/projects/conversation';

const allowedTypes = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function deliverableChatAttachmentError(file: File) {
  if (!allowedTypes.has(file.type)) return 'Use PDF, imagem, Word, Excel ou PowerPoint.';
  if (file.size > 10 * 1024 * 1024) return 'Cada anexo pode ter até 10 MB.';
  return '';
}

export function useUploadDeliverableChatAttachment(companyId: string, deliverableId: string, actorId: string | undefined) {
  return useMutation({
    gcTime: 0,
    mutationFn: async (file: File) => {
      if (!actorId) throw new Error('Sessão indisponível. Entre novamente para enviar a mensagem.');
      const invalid = deliverableChatAttachmentError(file);
      if (invalid) throw new Error(invalid);
      const name = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
      const path = `deliverable-chat/${companyId}/${deliverableId}/${actorId}/${crypto.randomUUID()}-${name}`;
      const { error } = await uploadDeliverableAttachment(path, file, file.type);
      if (error) throw new Error(`Não consegui anexar “${file.name}”.`);
      return path;
    },
  });
}
