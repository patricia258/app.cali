import { X } from 'lucide-react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { isSupabaseConfigured } from '../../../api/access/session';
import { Button } from '../../../components/ds/Button';
import { DialogForm } from '../../../components/ds/DialogForm';
import { FieldLabel } from '../../../components/ds/FieldLabel';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { calendarTypeMeta, type CalendarEventType, type WorkspaceCalendarEvent } from '../../../domain/calendar';
import type { CompanyOption } from '../adminCalendarData';
import type { CreateEventForm } from '../calendarEventForm';
import { CalendarMeetingClassification, type MeetingClassification } from './CalendarMeetingClassification';
import { dialogBackdropClass, dialogBodyClass, dialogButtonClass, dialogCloseClass, dialogFooterClass, dialogHeaderClass, dialogKickerClass, dialogSurfaceClass, dialogTitleClass } from './calendarDialogStyles';

type Props = {
  editingEvent: WorkspaceCalendarEvent | null;
  form: CreateEventForm;
  setForm: Dispatch<SetStateAction<CreateEventForm>>;
  companies: CompanyOption[];
  staff?: boolean;
  calendarConnection: 'connected' | 'not_connected';
  classification: MeetingClassification;
  setClassification: (value: MeetingClassification) => void;
  setEventType: (type: CalendarEventType) => void;
  eventError: string;
  saving: boolean;
  closeEditor: () => void;
  saveEvent: (event: FormEvent) => void;
};

const editorDialogClass = `${dialogSurfaceClass} tw:h-auto! tw:w-[min(42.5rem,100%)]! tw:max-w-[45rem]! tw:max-[43.75rem]:w-[calc(100vw-1rem)]!`;
const fieldLabelClass = 'tw:m-0! tw:flex! tw:min-w-0 tw:flex-col tw:gap-1.5! tw:text-[0.625rem]! tw:font-bold! tw:tracking-[0.02em] tw:text-[#67574c]!';
const fieldBaseClass = 'tw:w-full tw:rounded-md! tw:border! tw:border-solid! tw:border-[#e5d8d0]! tw:bg-white! tw:text-xs! tw:font-normal! tw:text-[#322f2c]! tw:shadow-none! tw:focus:border-cali-brand! tw:focus:outline-none';
const fieldControlClass = `${fieldBaseClass} tw:h-[2.375rem]! tw:min-h-0! tw:px-2.5! tw:py-0!`;
const checkboxClass = 'tw:m-0! tw:size-4 tw:shrink-0 tw:accent-cali-brand';
const formGridClass = 'tw:grid tw:grid-cols-2 tw:gap-x-3.5 tw:gap-y-3 tw:max-sm:grid-cols-1';

export function CalendarEventEditor(props: Props) {
  const { editingEvent, form, setForm, companies, staff, calendarConnection, classification, setClassification, setEventType, eventError, saving, closeEditor, saveEvent } = props;
  return (
    <div className={dialogBackdropClass}>
        <DialogForm aria-label={editingEvent ? 'Atualizar compromisso' : 'Adicionar ao calendário'} className={editorDialogClass} onSubmit={saveEvent}>
          <Button type="button" variant="close" className={dialogCloseClass} onClick={closeEditor} aria-label="Fechar"><X size={20} /></Button>
          <div className={`${dialogHeaderClass} tw:flex-col tw:items-start tw:gap-1.5`}>
            <span className={dialogKickerClass}>{editingEvent ? 'EDITAR / REMARCAR' : 'NOVO EVENTO'}</span>
            <h2 className={`${dialogTitleClass} tw:m-0!`}>{editingEvent ? 'Atualizar compromisso' : 'Adicionar ao calendário'}</h2>
            {editingEvent?.protocol && <span className="tw:mt-2 tw:inline-flex tw:items-center tw:gap-1.5 tw:text-[0.5625rem] tw:font-bold tw:text-cali-muted">Protocolo {editingEvent.protocol}</span>}
          </div>
          <div className={dialogBodyClass}>
            {eventError && <InlineNotice tone="danger">{eventError}</InlineNotice>}
            <FieldLabel className={fieldLabelClass}>Título<input className={`${fieldControlClass} tw:text-[0.8rem]!`} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: reunião mensal de indicadores" /></FieldLabel>
            <div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Cliente<select className={fieldControlClass} value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Somente CALI</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Tipo<select className={fieldControlClass} value={form.type} onChange={(event) => setEventType(event.target.value as CalendarEventType)}>{(Object.keys(calendarTypeMeta) as CalendarEventType[]).map((type) => <option key={type} value={type}>{calendarTypeMeta[type].label}</option>)}</select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Data<input className={fieldControlClass} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Cor<input className={`${fieldBaseClass} tw:h-[2.375rem]! tw:min-h-[2.6875rem]! tw:cursor-pointer tw:p-1!`} type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></FieldLabel>
            </div>
            <label className="tw:inline-flex tw:w-max tw:items-center tw:gap-2 tw:text-[0.6875rem]! tw:font-semibold! tw:text-[#322f2c]!"><input className={checkboxClass} type="checkbox" checked={form.allDay} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} /><span>Evento de dia inteiro</span></label>
            {!form.allDay && <div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Início<input className={fieldControlClass} type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Término<input className={fieldControlClass} type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Formato<select className={fieldControlClass} value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as 'remote' | 'in_person' }))}><option value="remote">Remoto</option><option value="in_person">Presencial</option></select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Visibilidade<select className={fieldControlClass} value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as 'internal' | 'client' }))}><option value="client">Compartilhar com cliente</option><option value="internal">Somente CALI</option></select></FieldLabel>
              {!staff && <FieldLabel className={fieldLabelClass}>Equipe CALI<select className={fieldControlClass} value={form.staffVisible ? 'yes' : 'no'} onChange={(event) => setForm((current) => ({ ...current, staffVisible: event.target.value === 'yes' }))}><option value="yes">Pode ver este evento</option><option value="no">Não mostrar para a equipe</option></select></FieldLabel>}
            </div>}
            <details className="tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:p-0!" key={editingEvent?.id||'new'} open={editingEvent?true:undefined}>
              <summary className="tw:cursor-pointer tw:px-3.5 tw:py-3 tw:text-[0.6875rem]! tw:font-bold! tw:text-cali-brand!">Local, link, convidados e descrição</summary>
              <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-3 tw:px-3.5 tw:pt-0.5 tw:pb-3.5"><div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Local / sala<input className={fieldControlClass} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={form.mode === 'remote' ? 'Google Meet' : 'Endereço ou sala'} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Link da reunião<input className={fieldControlClass} value={form.meetingUrl} onChange={(event) => setForm((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="https://meet.google.com/..." /></FieldLabel>
            </div>
            {form.mode === 'remote' && calendarConnection !== 'connected' && <div className="tw:rounded-md tw:bg-[#fbf4ea] tw:px-2.5 tw:py-2 tw:text-[0.625rem]/[1.5] tw:text-[#8a5a2b]">Você pode informar um Meet existente agora. Quando o Google Workspace estiver conectado por OAuth, a criação/sincronização de Meet poderá acontecer pela própria agenda.</div>}
            <FieldLabel className={fieldLabelClass}>Convidados por e-mail<input className={fieldControlClass} value={form.attendeeEmails} onChange={(event) => setForm((current) => ({ ...current, attendeeEmails: event.target.value }))} placeholder="decisor@empresa.com.br, outra@empresa.com.br" /><small className="tw:mt-1 tw:text-[0.625rem] tw:font-normal tw:text-[#9a8c83]">Separe mais de um e-mail por vírgula.</small></FieldLabel>
            <FieldLabel className={fieldLabelClass}>Descrição<textarea className={`${fieldBaseClass} tw:min-h-19 tw:resize-y tw:px-2.5! tw:py-2.5!`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Contexto, objetivo ou preparação necessária" /></FieldLabel>
              </div>
            </details>
            {!staff && isSupabaseConfigured && <div className="tw:mt-1 tw:grid tw:grid-cols-2 tw:items-end tw:gap-x-3.5 tw:gap-y-3 tw:max-sm:grid-cols-1">
              <label className={fieldLabelClass}>Lembrete
                <select className={fieldControlClass} value={form.reminderMinutes} onChange={(event) => setForm((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}>
                  <option value={0}>Sem lembrete</option><option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option><option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option><option value={1440}>1 dia antes</option>
                  {![0, 10, 15, 30, 60, 1440].includes(form.reminderMinutes) && <option value={form.reminderMinutes}>{form.reminderMinutes} minutos antes</option>}
                </select>
              </label>
              <label className="tw:m-0 tw:flex tw:min-h-[2.375rem] tw:items-center tw:gap-2.5 tw:rounded-md tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-2.5 tw:py-2 tw:text-[0.625rem]/[1.4] tw:text-[#857870]">
                <input className={checkboxClass} type="checkbox" checked={form.autoTranscription}
                  onChange={(event) => setForm((current) => ({ ...current, autoTranscription: event.target.checked }))} />
                <span className="tw:flex tw:flex-col tw:gap-0.5"><strong className="tw:text-[0.6875rem] tw:text-[#322f2c]">Transcrição automática no Google Meet</strong>
                  <small>Quando o evento remoto tiver Meet, o Google inicia a transcrição se a conta permitir.</small></span>
              </label>
            </div>}
            {!staff && isSupabaseConfigured && <CalendarMeetingClassification value={classification} onChange={setClassification} />}
          </div>
          <div className={`${dialogFooterClass} tw:justify-end`}><Button type="button" variant="secondary" className={dialogButtonClass} onClick={closeEditor}>Cancelar</Button><Button variant="primary" className={dialogButtonClass} disabled={saving || !form.title.trim()} type="submit">{saving ? 'Salvando…' : staff ? 'Enviar para aprovação da Patricia' : editingEvent ? 'Salvar alterações' : 'Adicionar evento'}</Button></div>
        </DialogForm>
      </div>
  );
}
