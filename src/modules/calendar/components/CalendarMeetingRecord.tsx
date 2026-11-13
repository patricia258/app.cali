import { useState } from 'react';
import { errorMessage } from '../../../lib/errorMessage';
import { useCalendarMeetingRecord } from '../hooks/useCalendarMeetingRecord';
import { useSaveCalendarMeetingRecord } from '../hooks/useSaveCalendarMeetingRecord';
import { MeetingRecordAction } from './MeetingRecordAction';
import { recordForm, recordInput } from './meetingRecordStyles';
import { CalendarMeetingTranscription } from './CalendarMeetingTranscription';

const reasons = {
  client: 'Cliente',
  cali: 'CALI',
  external: 'Fator externo',
  health: 'Saúde',
  travel_vacation: 'Viagem ou férias',
  other: 'Outro',
};

const reasonLabels: Record<string, string> = reasons;
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

export function CalendarMeetingRecord({ protocol }: { protocol: string }) {
  const { data } = useCalendarMeetingRecord(protocol);
  return data && <MeetingRecordFields key={data.meeting.id} {...data} protocol={protocol} />;
}

type RecordData = NonNullable<ReturnType<typeof useCalendarMeetingRecord>['data']>;

function MeetingRecordFields({ meeting, outcome, protocol }: RecordData & { protocol: string }) {
  const [editing, setEditing] = useState<'occurred' | 'not_occurred' | null>(null);
  const mutation = useSaveCalendarMeetingRecord(meeting, protocol);
  const available = date.format(new Date()) >= date.format(new Date(meeting.starts_at));
  const status = outcome?.outcome === 'occurred' ? 'Realizado' : outcome?.outcome === 'not_occurred' ? 'Não realizado' : 'A registrar';
  const classification = meeting.schedule_class === 'contractual'
    ? `Contratual${meeting.contract_session_number ? ` · encontro ${meeting.contract_session_number}` : ''}`
    : meeting.schedule_class === 'extra' ? 'Adicional · cobrável' : 'Fora da agenda contratual';

  function edit(kind: 'occurred' | 'not_occurred') {
    mutation.reset();
    setEditing(kind);
  }

  return (
    <>
      <section className="tw:my-3.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-[var(--theme-surface-soft,#faf7f5)] tw:px-4 tw:py-3.5 tw:text-base/[1.45] tw:text-cali-muted">
        <strong className="tw:text-cali-text">Agenda contratual · {classification}</strong><br />
        {meeting.mode === 'in_person' ? 'Presencial' : 'Online'}
        {meeting.billing_applies && ` · ${meeting.billing_reason || 'Condição adicional'}`}
        {outcome && <><br /><b>Resultado:</b> {status}
          {outcome.outcome === 'not_occurred' && ` · ${reasonLabels[outcome.reason_category || ''] || 'Não informado'}`}
          {outcome.note && ` · ${outcome.note}`}
        </>}
      </section>
      <section className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-4.5 tw:py-4 tw:text-[#67574c]">
        <header className="tw:flex tw:items-center tw:justify-between tw:gap-3">
          <strong className="tw:text-sm/[inherit] tw:font-bold tw:text-[#322f2c]">Registro do encontro</strong>
          <span className="tw:rounded-md tw:bg-[#f6f0eb] tw:px-2.5 tw:py-1 tw:text-xs/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-[#857870]">{status}</span>
        </header>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.5">
          {outcome ? (
            <MeetingRecordAction onClick={() => edit(outcome.outcome === 'occurred' ? 'occurred' : 'not_occurred')}>Atualizar registro</MeetingRecordAction>
          ) : available ? (
            <>
              <MeetingRecordAction primary onClick={() => edit('occurred')}>Aconteceu</MeetingRecordAction>
              <MeetingRecordAction onClick={() => edit('not_occurred')}>Não aconteceu</MeetingRecordAction>
            </>
          ) : <span className="tw:text-sm/[inherit] tw:text-[#857870]">O registro fica disponível no dia do encontro.</span>}
        </div>
        {editing && (
          <form key={editing} className={recordForm} onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            mutation.mutate({
              type: 'outcome',
              occurred: editing === 'occurred',
              reason: editing === 'not_occurred' ? String(fields.get('reason') || '') : null,
              justified: fields.get('justified') === 'on',
              note: String(fields.get('note') || '').trim(),
            }, { onSuccess: () => setEditing(null) });
          }}>
            {editing === 'occurred' ? <strong>Confirmar realização</strong> : (
              <>
                <label className="tw:grid tw:gap-1">Motivo
                  <select name="reason" defaultValue={outcome?.reason_category ?? 'client'} className={recordInput}>
                    {Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label><input type="checkbox" name="justified" defaultChecked={Boolean(outcome?.justified)} /> Houve justificativa</label>
              </>
            )}
            <textarea name="note" aria-label="Observação do encontro" defaultValue={outcome?.note ?? ''} className={`${recordInput} tw:min-h-23`} placeholder={editing === 'occurred' ? 'Observação opcional sobre o encontro' : 'Justificativa / contexto'} />
            <MeetingRecordAction primary type="submit" disabled={mutation.isPending}>{editing === 'occurred' ? 'Confirmar que aconteceu' : 'Registrar não ocorrência'}</MeetingRecordAction>
          </form>
        )}
        {!editing && outcome?.outcome === 'occurred' && <CalendarMeetingTranscription
          key={JSON.stringify([outcome.transcription_url, outcome.transcription_note])}
          url={outcome.transcription_url ?? ''}
          note={outcome.transcription_note ?? ''}
          busy={mutation.isPending}
          onSave={(url, note) => mutation.mutate({ type: 'transcription', url, note })}
          onUpload={(file) => mutation.mutate({ type: 'attachment', file })}
        />}
        {mutation.error && <p role="alert" className="tw:text-cali-danger">{errorMessage(mutation.error, 'Não foi possível salvar o registro.')}</p>}
        {mutation.data && <span role="status" className="tw:text-sm/[inherit] tw:text-cali-muted">{mutation.data}</span>}
      </section>
    </>
  );
}
