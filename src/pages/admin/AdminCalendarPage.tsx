import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Plus, Video, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

type WorkspaceEvent = {
  id: string;
  day: number;
  month: string;
  time: string;
  title: string;
  company: string;
  type: 'Reunião' | 'Prazo' | 'Validação';
  mode: 'Remota' | 'Presencial';
  shared: boolean;
};

const initialEvents: WorkspaceEvent[] = [
  { id: 'e1', day: 31, month: 'AGO', time: '09:30', title: 'Reunião mensal', company: 'Grupo Aurora', type: 'Reunião', mode: 'Remota', shared: true },
  { id: 'e2', day: 3, month: 'SET', time: '14:00', title: 'Validação de indicadores', company: 'Grupo Aurora', type: 'Validação', mode: 'Remota', shared: true },
  { id: 'e3', day: 5, month: 'SET', time: '11:00', title: 'Checkpoint do projeto', company: 'Studio Norte', type: 'Reunião', mode: 'Remota', shared: true },
  { id: 'e4', day: 8, month: 'SET', time: '18:00', title: 'Prazo · Ritual de gestão', company: 'Grupo Aurora', type: 'Prazo', mode: 'Remota', shared: false },
  { id: 'e5', day: 12, month: 'SET', time: '18:00', title: 'Prazo · Matriz de responsabilidades', company: 'Grupo Aurora', type: 'Prazo', mode: 'Remota', shared: false },
];

export function AdminCalendarPage() {
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState('Todos');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('Grupo Aurora');
  const [type, setType] = useState<WorkspaceEvent['type']>('Reunião');
  const [date, setDate] = useState('2026-09-15');
  const [time, setTime] = useState('10:00');
  const [shared, setShared] = useState(true);

  const filtered = useMemo(() => filter === 'Todos' ? events : events.filter((event) => event.company === filter), [events, filter]);

  function createEvent(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    const parsed = new Date(`${date}T12:00:00`);
    const month = parsed.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
    setEvents((current) => [...current, { id: `e-${Date.now()}`, day: parsed.getDate(), month, time, title: title.trim(), company, type, mode: 'Remota', shared }].sort((a, b) => a.day - b.day));
    setOpen(false);
    setTitle('');
  }

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">AGENDA DE EXECUÇÃO</div>
        <div className="page-heading">
          <div><h1>Calendário</h1><p>Reuniões, validações e prazos ligados ao trabalho. O cliente recebe apenas o que realmente faz parte da agenda dele.</p></div>
          <button className="primary" onClick={() => setOpen(true)}><Plus size={18} />Novo evento</button>
        </div>

        <div className="calendar-toolbar">
          <div><button className="secondary">Hoje</button><strong>Agosto · Setembro 2026</strong></div>
          <label>Cliente<select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todos</option><option>Grupo Aurora</option><option>Studio Norte</option></select></label>
        </div>

        <section className="panel calendar-list">
          {filtered.map((event) => (
            <article className="calendar-event-row" key={event.id}>
              <div className={`calendar-date-block ${event.type === 'Prazo' ? 'deadline' : ''}`}><strong>{event.day}</strong><span>{event.month}</span></div>
              <div className="calendar-event-copy"><div><span className="event-type">{event.type}</span>{event.shared && <span className="shared-badge">Cliente vê</span>}</div><strong>{event.title}</strong><p>{event.company}</p></div>
              <div className="calendar-event-meta"><span><Clock3 size={16} />{event.time}</span><span>{event.mode === 'Remota' ? <Video size={16} /> : <MapPin size={16} />}{event.mode}</span></div>
            </article>
          ))}
        </section>
      </section>

      {open && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card" onSubmit={createEvent} role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">NOVO EVENTO</span><h2>Adicionar à agenda</h2><p>Defina se o evento é compartilhado com o cliente. Prazos internos podem ficar visíveis apenas para você.</p>
            <div className="form-grid">
              <label className="stacked-label wide">Título<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: validação do cronograma" /></label>
              <label className="stacked-label">Cliente<select value={company} onChange={(event) => setCompany(event.target.value)}><option>Grupo Aurora</option><option>Novatech</option><option>Studio Norte</option></select></label>
              <label className="stacked-label">Tipo<select value={type} onChange={(event) => setType(event.target.value as WorkspaceEvent['type'])}><option>Reunião</option><option>Validação</option><option>Prazo</option></select></label>
              <label className="stacked-label">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="stacked-label">Horário<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            </div>
            <label className="check-line"><input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} /><span><strong>Compartilhar com o cliente</strong><small>O evento aparecerá na agenda e no cronograma do acesso principal.</small></span></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit">Adicionar evento</button></div>
          </form>
        </div>
      )}
    </Shell>
  );
}
