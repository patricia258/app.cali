import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordMeetingOutcome, saveMeetingTranscription, uploadMeetingTranscription } from '../../../api/calendar/meetings';

type Change =
  | { type: 'outcome'; occurred: boolean; reason: string | null; justified: boolean; note: string }
  | { type: 'transcription'; url: string; note: string }
  | { type: 'attachment'; file: File };

export function useSaveCalendarMeetingRecord(meeting: { id: string; company_id: string; source_type?: string | null }, protocol: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: Change) => {
      switch (change.type) {
        case 'outcome': {
          const { error } = await recordMeetingOutcome(meeting.id, meeting.source_type === 'scheduling_request', change.occurred, change.reason, change.justified, change.note);
          if (error) throw error;
          return 'Registro atualizado.';
        }
        case 'transcription': {
          const { error } = await saveMeetingTranscription(meeting.id, change.url, change.note);
          if (error) throw error;
          return 'Salvo';
        }
        case 'attachment': {
          const { file } = change;
          if (file.size > 10 * 1024 * 1024 || !['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
            throw new Error('Envie PDF, DOCX ou TXT de até 10 MB.');
          }
          const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `meeting-transcripts/${meeting.company_id}/${meeting.id}/${crypto.randomUUID()}-${filename}`;
          await uploadMeetingTranscription(meeting.id, path, file);
          return 'Anexo disponível ao cliente';
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar', 'meeting-record', protocol] });
      window.dispatchEvent(new Event('cali-calendar-record-updated'));
    },
  });
}
