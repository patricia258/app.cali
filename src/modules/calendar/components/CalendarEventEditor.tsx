import { Checkbox } from '../../../components/ds/Checkbox';
import { Input } from '../../../components/ds/Input';
import { Select } from '../../../components/ds/Select';
import { Textarea } from '../../../components/ds/Textarea';
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

const editorDialogClass = `${dialogSurfaceClass} tw:h-auto! tw:w-[min(42.5rem,100%)]! tw:max-w-180! tw:max-[43.75rem]:w-[calc(100vw-1rem)]!`;
const fieldLabelClass = 'tw:m-0! tw:flex! tw:min-w-0 tw:flex-col tw:gap-1.5! tw:text-cali-micro! tw:font-bold! tw:tracking-[0.02em] tw:text-cali-muted!';
const colorControlClass = 'tw:h-9.5 tw:min-h-10.75 tw:w-full tw:cursor-pointer tw:rounded-md tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:p-1';
const fieldControlClass = 'tw:h-9.5 tw:min-h-0! tw:w-full tw:py-0!';
const checkboxClass = 'tw:m-0! tw:size-4';
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
            {editingEvent?.protocol && <span className="tw:mt-2 tw:inline-flex tw:items-center tw:gap-1.5 tw:text-cali-micro tw:font-bold tw:text-cali-muted">Protocolo {editingEvent.protocol}</span>}
          </div>
          <div className={dialogBodyClass}>
            {eventError && <InlineNotice tone="danger">{eventError}</InlineNotice>}
            <FieldLabel className={fieldLabelClass}>Título<Input variant="compact" className={`${fieldControlClass} tw:text-cali-detail!`} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: reunião mensal de indicadores" /></FieldLabel>
            <div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Cliente<Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Somente CALI</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Tipo<Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.type} onChange={(event) => setEventType(event.target.value as CalendarEventType)}>{(Object.keys(calendarTypeMeta) as CalendarEventType[]).map((type) => <option key={type} value={type}>{calendarTypeMeta[type].label}</option>)}</Select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Data<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Cor<input className={colorControlClass} type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></FieldLabel>
            </div>
            <label className="tw:inline-flex tw:w-max tw:items-center tw:gap-2 tw:text-cali-label! tw:font-semibold! tw:text-cali-text!"><Checkbox className={checkboxClass} checked={form.allDay} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} /><span>Evento de dia inteiro</span></label>
            {!form.allDay && <div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Início<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Término<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Formato<Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as 'remote' | 'in_person' }))}><option value="remote">Remoto</option><option value="in_person">Presencial</option></Select></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Visibilidade<Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as 'internal' | 'client' }))}><option value="client">Compartilhar com cliente</option><option value="internal">Somente CALI</option></Select></FieldLabel>
              {!staff && <FieldLabel className={fieldLabelClass}>Equipe CALI<Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.staffVisible ? 'yes' : 'no'} onChange={(event) => setForm((current) => ({ ...current, staffVisible: event.target.value === 'yes' }))}><option value="yes">Pode ver este evento</option><option value="no">Não mostrar para a equipe</option></Select></FieldLabel>}
            </div>}
            <details className="tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:p-0!" key={editingEvent?.id||'new'} open={editingEvent?true:undefined}>
              <summary className="tw:cursor-pointer tw:px-3.5 tw:py-3 tw:text-cali-label! tw:font-bold! tw:text-cali-brand!">Local, link, convidados e descrição</summary>
              <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-3 tw:px-3.5 tw:pt-0.5 tw:pb-3.5"><div className={formGridClass}>
              <FieldLabel className={fieldLabelClass}>Local / sala<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={form.mode === 'remote' ? 'Google Meet' : 'Endereço ou sala'} /></FieldLabel>
              <FieldLabel className={fieldLabelClass}>Link da reunião<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} value={form.meetingUrl} onChange={(event) => setForm((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="https://meet.google.com/..." /></FieldLabel>
            </div>
            {form.mode === 'remote' && calendarConnection !== 'connected' && <div className="tw:rounded-md tw:bg-cali-gold-surface tw:px-2.5 tw:py-2 tw:text-cali-micro/[1.5] tw:text-cali-warning">Você pode informar um Meet existente agora. Quando o Google Workspace estiver conectado por OAuth, a criação/sincronização de Meet poderá acontecer pela própria agenda.</div>}
            <FieldLabel className={fieldLabelClass}>Convidados por e-mail<Input variant="compact" className={`${fieldControlClass} tw:text-xs!`} value={form.attendeeEmails} onChange={(event) => setForm((current) => ({ ...current, attendeeEmails: event.target.value }))} placeholder="decisor@empresa.com.br, outra@empresa.com.br" /><small className="tw:mt-1 tw:text-cali-micro tw:font-normal tw:text-cali-muted">Separe mais de um e-mail por vírgula.</small></FieldLabel>
            <FieldLabel className={fieldLabelClass}>Descrição<Textarea variant="compact" className="tw:min-h-19 tw:w-full tw:text-xs!" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Contexto, objetivo ou preparação necessária" /></FieldLabel>
              </div>
            </details>
            {!staff && isSupabaseConfigured && <div className="tw:mt-1 tw:grid tw:grid-cols-2 tw:items-end tw:gap-x-3.5 tw:gap-y-3 tw:max-sm:grid-cols-1">
              <label className={fieldLabelClass}>Lembrete
                <Select variant="filter" className={`${fieldControlClass} tw:text-xs!`} value={form.reminderMinutes} onChange={(event) => setForm((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}>
                  <option value={0}>Sem lembrete</option><option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option><option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option><option value={1440}>1 dia antes</option>
                  {![0, 10, 15, 30, 60, 1440].includes(form.reminderMinutes) && <option value={form.reminderMinutes}>{form.reminderMinutes} minutos antes</option>}
                </Select>
              </label>
              <label className="tw:m-0 tw:flex tw:min-h-9.5 tw:items-center tw:gap-2.5 tw:rounded-md tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-2.5 tw:py-2 tw:text-cali-micro/[1.4] tw:text-cali-muted">
                <Checkbox className={checkboxClass} checked={form.autoTranscription}
                  onChange={(event) => setForm((current) => ({ ...current, autoTranscription: event.target.checked }))} />
                <span className="tw:flex tw:flex-col tw:gap-0.5"><strong className="tw:text-cali-label tw:text-cali-text">Transcrição automática no Google Meet</strong>
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
