export type MeetingClassification = 'contractual' | 'extra' | 'other';

export function CalendarMeetingClassification({ value, onChange }: {
  value: MeetingClassification;
  onChange: (value: MeetingClassification) => void;
}) {
  return (
    <div className="tw:mt-3.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-[var(--theme-surface-soft,#faf7f5)] tw:p-4">
      <label htmlFor="calendar-meeting-classification" className="tw:mb-1.5 tw:block tw:text-lg/[inherit] tw:font-bold tw:text-cali-text">
        Agenda contratual
      </label>
      <p className="tw:mb-3 tw:text-base/[1.5] tw:text-cali-muted">
        Para Partner e Full, use “Encontro contratual” nos encontros fixos previamente agendados pela CALI. O Workspace controla a quantidade mensal e classifica excedentes como adicionais.
      </p>
      <select id="calendar-meeting-classification" value={value} onChange={(event) => onChange(event.target.value as MeetingClassification)}
        className="tw:min-h-12 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-3 tw:text-lg/[inherit] tw:text-cali-text"
      >
        <option value="contractual">Encontro contratual</option>
        <option value="extra">Encontro adicional · cobrável</option>
        <option value="other">Não conta na agenda contratual</option>
      </select>
    </div>
  );
}
