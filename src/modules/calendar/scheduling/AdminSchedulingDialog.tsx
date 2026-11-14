import { runSchedulingCommand } from '../../../api/calendar/requests';
import { SchedulingDialog } from './SchedulingDialog';
import { SchedulingFields, SchedulingNoteField, SlotFields } from './SchedulingFields';
import { minSlotDate, readSlots, slotMinutes, type SchedulingRequest } from './schedulingRequests';

export type AdminSchedulingSelection = {
  kind: 'quote' | 'counter' | 'decline' | 'fee';
  request: SchedulingRequest;
};

export function AdminSchedulingDialog({ selection, onClose, onSaved }: {
  selection: AdminSchedulingSelection;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { kind, request } = selection;
  const requestedMinutes = slotMinutes(request.requested_slots?.[0]);

  if (kind === 'quote') {
    const longMeeting = requestedMinutes > 60;
    return (
      <SchedulingDialog title="Orçamento da reunião online extra" section="CONDIÇÕES PARA O CLIENTE"
        submitLabel="Enviar orçamento" cancelLabel="Voltar" onClose={onClose}
        onSubmit={async (form) => {
          await runSchedulingCommand('admin_quote_online_extra_v1', {
            p_request_id: request.id,
            p_amount_cents: Math.round(Number(form.get('amount')) * 100),
            p_note: String(form.get('note') ?? ''),
          });
          onSaved('Orçamento enviado para aceite do cliente.');
        }}
      >
        <label className="tw:mb-4 tw:flex tw:flex-col tw:gap-2">
          <span className="tw:text-[0.6875rem] tw:font-black tw:text-cali-muted tw:uppercase">Valor em reais (tabela: 1 hora R$ 200 · 1h30 R$ 300)</span>
          <input name="amount" type="number" min="1" step="0.01" defaultValue={longMeeting ? 300 : 200} required
            className="tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-input tw:px-3.5 tw:py-3 tw:text-cali-text"
          />
        </label>
        <SchedulingNoteField label="Condições e escopo" required minLength={5} placeholder="Explique a duração e o que está incluído."
          initialValue={`Papo online de ${longMeeting ? '1h30' : '1 hora'}, conforme a tabela da CALI.`}
        />
      </SchedulingDialog>
    );
  }

  if (kind === 'fee') {
    return (
      <SchedulingDialog title="Condição da alteração" section="DECISÃO DA CALI" submitLabel="Enviar decisão" cancelLabel="Voltar" onClose={onClose}
        onSubmit={async (form) => {
          await runSchedulingCommand('admin_decide_extra_visit_change_v2', {
            p_request_id: request.id, p_charge: form.get('charge') === 'true', p_note: String(form.get('note') ?? ''),
          });
          onSaved('Decisão registrada e cliente notificado.');
        }}
      >
        <p>Motivo do cliente: {request.extra_visit_change_reason}</p>
        <fieldset className="tw:my-4 tw:flex tw:flex-wrap tw:gap-2.5 tw:border-0 tw:p-0">
          <legend className="tw:sr-only">Taxa de alteração</legend>
          <label className="
            tw:flex tw:items-center tw:gap-2.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line
            tw:bg-cali-surface tw:px-3.5 tw:py-3.5 tw:text-sm/[inherit] tw:font-extrabold
          ">
            <input type="radio" name="charge" value="false" defaultChecked className="tw:accent-cali-brand" /> Não cobrar
          </label>
          {request.extra_visit_change_was_confirmed ? (
            <label className="
              tw:flex tw:items-center tw:gap-2.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line
              tw:bg-cali-surface tw:px-3.5 tw:py-3.5 tw:text-sm/[inherit] tw:font-extrabold
            ">
              <input type="radio" name="charge" value="true" className="tw:accent-cali-brand" /> Cobrar R$ 160,00
            </label>
          ) : <p>Pedido alterado antes da confirmação: sem taxa.</p>}
        </fieldset>
        <SchedulingNoteField label="Motivo da decisão" required minLength={5} placeholder="Registre o aviso, a antecedência e a sua avaliação." />
      </SchedulingDialog>
    );
  }

  if (kind === 'decline') {
    return (
      <SchedulingDialog title="Recusar solicitação" section="ANÁLISE DE AGENDA" submitLabel="Registrar resposta" tone="danger" onClose={onClose}
        onSubmit={async (form) => {
          await runSchedulingCommand('admin_respond_scheduling_request_v1', {
            p_request_id: request.id, p_proposed_slots: [], p_note: String(form.get('note') ?? ''), p_decline: true,
          });
          onSaved('Resposta registrada.');
        }}
      >
        <SchedulingNoteField label="Motivo" required placeholder="Explique de forma objetiva por que esta solicitação será recusada." />
      </SchedulingDialog>
    );
  }

  const duration = request.extra_visit ? 240 : [30, 45, 60, 90, 120].includes(requestedMinutes) ? requestedMinutes : 60;
  const minDate = minSlotDate(24);
  return (
    <SchedulingDialog title="Sugerir outros horários" section="ANÁLISE DE AGENDA" submitLabel="Enviar opções" onClose={onClose}
      onSubmit={async (form) => {
        const minutes = Number(form.get('duration'));
        const slots = readSlots(form, minutes);
        if (request.extra_visit && (minutes !== 240 || slots.length !== 2)) throw new Error('Envie duas opções de 4 horas para a visita extra.');
        if (slots.length === 0) throw new Error('Informe ao menos um horário.');
        await runSchedulingCommand('admin_respond_scheduling_request_v1', {
          p_request_id: request.id, p_proposed_slots: slots, p_note: String(form.get('note') ?? ''), p_decline: false,
        });
        onSaved('Novos horários enviados ao cliente.');
      }}
    >
      <SchedulingFields>
        <label className="tw:col-span-full tw:flex tw:flex-col tw:gap-2">
          <span className="tw:text-[0.6875rem] tw:font-black tw:text-cali-muted tw:uppercase">Duração</span>
          <select name="duration" defaultValue={duration} className="tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-input tw:px-3.5 tw:py-3 tw:text-cali-text">
            {request.extra_visit ? <option value={240}>4 horas</option> : (
              <>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas</option>
              </>
            )}
          </select>
        </label>
        <SlotFields position={1} minDate={minDate} required />
        <SlotFields position={2} minDate={minDate} required={Boolean(request.extra_visit)} />
        <SchedulingNoteField label="Mensagem para o cliente" placeholder="Ex.: as opções enviadas conflitam com a agenda. Consigo nestes horários." />
      </SchedulingFields>
    </SchedulingDialog>
  );
}
