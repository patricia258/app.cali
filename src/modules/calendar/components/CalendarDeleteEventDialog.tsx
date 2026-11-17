import { Textarea } from '../../../components/ds/Textarea';
import { useState } from 'react';
import { useDeleteGoogleCalendarEvent } from '../hooks/useDeleteGoogleCalendarEvent';
import { SchedulingDialog } from '../scheduling/SchedulingDialog';

export function CalendarDeleteEventDialog({ eventId, onClose, onDeleted }: {
  eventId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [reason, setReason] = useState('');
  const { mutateAsync } = useDeleteGoogleCalendarEvent();
  return (
    <SchedulingDialog title="Excluir este evento?" section="AGENDA · EXCLUIR EVENTO"
      submitLabel="Excluir definitivamente" cancelLabel="Voltar" tone="danger" submitDisabled={reason.trim().length < 3}
      onClose={onClose} onSubmit={async () => {
        await mutateAsync({ eventId, reason: reason.trim() });
        onDeleted();
      }}
    >
      <p>O evento será removido do Workspace e do Google Agenda. Os convidados recebem a atualização do Google quando aplicável.</p>
      <p>Uma cópia completa fica preservada na auditoria.</p>
      <label className="tw:mt-3 tw:grid tw:gap-2">Motivo da exclusão
        <Textarea variant="compact" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus required minLength={3}
          placeholder="Registre o motivo" className="tw:min-h-20 tw:w-full" />
      </label>
    </SchedulingDialog>
  );
}
