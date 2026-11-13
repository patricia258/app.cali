import { runSchedulingCommand } from '../../../api/calendar/requests';
import { SchedulingDialog } from './SchedulingDialog';
import { SchedulingFields, SchedulingNoteField, SlotFields } from './SchedulingFields';
import { formatPrice, minSlotDate, readSlots, type SchedulingRequest } from './schedulingRequests';

export type ClientSchedulingSelection = { kind: 'extra-options' | 'options' | 'quote'; request: SchedulingRequest };

export function ClientSchedulingDialog({ selection, onClose, onSaved }: {
  selection: ClientSchedulingSelection;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  async function submit(form: FormData) {
    const { request, kind } = selection;
    const note = String(form.get('note') ?? '');
    if (kind === 'quote') {
      await runSchedulingCommand('client_accept_online_extra_quote_v1', { p_request_id: request.id });
      onSaved('Orçamento aceito. A CALI poderá confirmar o horário.');
    } else if (kind === 'extra-options') {
      const slots = readSlots(form, 240);
      if (slots.length !== 2) throw new Error('Informe duas opções completas.');
      await runSchedulingCommand('client_counter_extra_visit_v1', { p_request_id: request.id, p_slots: slots, p_note: note });
      onSaved('Novas opções enviadas. Vai dar certo 🙂');
    } else {
      await runSchedulingCommand('client_request_new_scheduling_options_v1', { p_request_id: request.id, p_note: note });
      onSaved('Pedido enviado. Vamos encontrar uma data juntos.');
    }
    window.dispatchEvent(new Event('cali-calendar-record-updated'));
  }

  if (selection.kind === 'quote') {
    return (
      <SchedulingDialog title="Aceitar orçamento" section="REUNIÃO ONLINE EXTRA" submitLabel="Aceitar orçamento"
        onClose={onClose} onSubmit={submit}>
        <p>Aceitar o orçamento de {formatPrice(selection.request.online_extra_quote_cents ?? 0)} para esta reunião online extra?</p>
      </SchedulingDialog>
    );
  }

  if (selection.kind === 'extra-options') {
    return (
      <SchedulingDialog title="Outras opções para sua visita" section="VAMOS AJUSTAR A AGENDA" submitLabel="Enviar opções" cancelLabel="Voltar"
        onClose={onClose} onSubmit={submit}>
        <p className="tw:mb-3.5">Opa, não encaixou desta vez 🙂 Escolha duas novas opções de 4 horas. Eu avalio e te respondo.</p>
        <SchedulingFields>
          <SlotFields position={1} minDate={minSlotDate(48)} required visit />
          <SlotFields position={2} minDate={minSlotDate(48)} required visit />
          <SchedulingNoteField label="Observação" placeholder="Conte o que precisamos considerar." />
        </SchedulingFields>
      </SchedulingDialog>
    );
  }

  return (
    <SchedulingDialog title="Pedir outras opções" section="AGENDA" submitLabel="Confirmar"
      onClose={onClose} onSubmit={submit}>
      <SchedulingNoteField label="Se quiser, diga por que os horários não funcionam ou indique uma preferência." />
    </SchedulingDialog>
  );
}
