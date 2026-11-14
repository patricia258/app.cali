import { MeetingRecordAction } from './MeetingRecordAction';
import { recordForm, recordInput } from './meetingRecordStyles';

export function CalendarMeetingTranscription({ url, note, busy, onSave, onUpload }: {
  url: string;
  note: string;
  busy: boolean;
  onSave: (url: string, note: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <>
      <form className={recordForm} onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        onSave(String(fields.get('url') || ''), String(fields.get('note') || ''));
      }}>
        <label className="tw:grid tw:gap-1">Transcrição / registro da reunião
          <input name="url" type="url" defaultValue={url} placeholder="https://..." className={recordInput} />
        </label>
        <textarea name="note" aria-label="Observação da transcrição" defaultValue={note} placeholder="Observação opcional" className={`${recordInput} tw:min-h-23`} />
        <MeetingRecordAction type="submit" disabled={busy}>Salvar transcrição</MeetingRecordAction>
      </form>
      <form className="tw:grid tw:gap-2.5 tw:text-sm/[inherit] tw:font-semibold" onSubmit={(event) => {
        event.preventDefault();
        const file = new FormData(event.currentTarget).get('attachment');
        if (file instanceof File && file.name) onUpload(file);
      }}>
        <label className="tw:grid tw:gap-1">Ou anexar arquivo (PDF, DOCX ou TXT · até 10 MB)
          <input required type="file" name="attachment" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="tw:w-full tw:py-2.5 tw:text-sm/[inherit]" />
        </label>
        <MeetingRecordAction type="submit" disabled={busy}>Enviar anexo</MeetingRecordAction>
      </form>
    </>
  );
}
