import { useMutation } from '@tanstack/react-query';
import { uploadPublicFormAttachment } from '../../../../api/forms/public';

export function useUploadPublicFormAttachment() {
  return useMutation({
    gcTime: 0,
    mutationFn: ({ path, file }: { path: string; file: File }) => uploadPublicFormAttachment(path, file),
  });
}
