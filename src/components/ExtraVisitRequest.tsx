import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './extra-visit-request.css';

const FEE = 'R$ 800,00';
type Slot = { date: string; time: string };
const emptySlot = (): Slot => ({ date: '', time: '' });

function validateSlot(slot: Slot): string | null {
  if (!slot.date || !slot.time) return 'Informe duas opções de data e horário.';
  const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
  if (Number.isNaN(start.getTime())) return 'Revise a data e o horário.';
  if (start.getTime() <= Date.now() + 48 * 60 * 60 * 1000) return 'Preciso de pelo menos 48 horas corridas para avaliar. Escolha uma data mais adiante.';
  const weekday = new Date(`${slot.date}T12:00:00-03:00`).getUTCDay();
  if (weekday === 0 || weekday === 6) return 'Escolha um dia de segunda a sexta-feira.';
  if (slot.time < '09:00' || slot.time > '12:00') return 'A visita de até 4 horas deve começar entre 9h e 12h e terminar até as 16h.';
  return null;
}

export function ExtraVisitRequest() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [slots, setSlots] = useState<[Slot, Slot]>([emptySlot(), emptySlot()]);
  const [title, setTitle] = useState('Visita presencial extra');
  const [purpose, setPurpose] = useState('');
  const [address, setAddress] = useState('');
  const [ackName, setAckName] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('extra-visit-open');
    document.documentElement.classList.add('extra-visit-open');
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previousOverflow; document.body.classList.remove('extra-visit-open'); document.documentElement.classList.remove('extra-visit-open'); window.removeEventListener('keydown', close); };
  }, [open]);
  function updateSlot(index: 0 | 1, key: keyof Slot, value: string) { setSlots(current => { const next: [Slot, Slot] = [{ ...current[0] }, { ...current[1] }]; next[index][key] = value; return next; }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length < 2 || address.trim().length < 5) return setError('Informe o assunto e o endereço completo da visita.');
    const issue = validateSlot(slots[0]) || validateSlot(slots[1]);
    if (issue) return setError(issue);
    if (slots[0].date === slots[1].date && slots[0].time === slots[1].time) return setError('Escolha duas opções diferentes.');
    if (!ack || ackName.trim().length < 5) return setError('Digite seu nome completo e confirme sua ciência.');
    if (!supabase) return setError('Conexão indisponível. Tente novamente.');
    setError(''); setSaving(true);
    const requestedSlots = slots.map(slot => {
      const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
      return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString() };
    });
    const { error: submitError } = await supabase.rpc('create_extra_visit_request_v1', {
      p_title: title.trim(), p_purpose: purpose.trim(), p_location: address.trim(),
      p_requested_slots: requestedSlots, p_ack_name: ackName.trim(), p_acknowledged: ack,
    });
    setSaving(false);
    if (submitError) return setError(submitError.message);
    setOpen(false); window.location.assign('/cliente/cronograma');
  }
  return <>
    <button className="extra-visit-top-action" type="button" aria-label="Solicitar visita extra" title="Solicitar visita extra" onClick={() => { setStep(1); setOpen(true); }}><CalendarPlus size={17}/><span>Solicitar visita extra</span></button>
    {open && createPortal(<div className="extra-visit-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="extra-visit-dialog" role="dialog" aria-modal="true" aria-labelledby="extra-visit-heading">
        <header><div><small>VISITA EXTRA · {step === 1 ? 'CONDIÇÕES' : step === 2 ? 'AGENDAMENTO' : 'CIÊNCIA'} · {step} DE 3</small><h2 id="extra-visit-heading">{step === 1 ? 'Que legal que você quer uma visita presencial minha!' : step === 2 ? 'Vamos encontrar uma data?' : 'Só falta confirmar seu pedido.'}</h2></div><button type="button" className="extra-visit-close" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <form onSubmit={submit}>
          {step === 1 ? <><div className="extra-visit-terms"><p>Pra fechar isso, só um resumo rápido antes de você escolher a data:</p><ul>
            <li>Eu analiso sua solicitação em até <strong>48 horas corridas</strong>. Proponha dois horários com essa antecedência.</li>
            <li>A visita extra custa <strong>{FEE} por até 4 horas</strong>. Se precisarmos de mais tempo, envio um orçamento para você aprovar antes de continuar.</li>
            <li>Atendo de segunda a sexta, entre 9h e 16h. Segunda costuma estar fechada; se precisar desse dia, me conte nas observações que eu avalio.</li>
            <li>Deslocamento, estacionamento e alimentação necessária são cobrados à parte com comprovantes. Carro próprio depende de condições combinadas previamente.</li>
            <li>Cancelamento ou ausência sem aviso ou justificativa pode gerar taxa de <strong>20% ({'R$ 160,00'})</strong>, após minha avaliação. Com aviso ou justificativa, não cobro a taxa.</li>
          </ul></div><div className="extra-visit-highlight"><AlertTriangle size={18} aria-hidden="true"/><p>Esse tempo é <strong>100% dedicado à sua empresa</strong>. A cobrança da visita realizada será conciliada no período da visita.</p></div><footer><button type="button" onClick={() => setOpen(false)}>Agora não</button><button type="button" className="extra-visit-next" onClick={() => setStep(2)}>Escolher datas →</button></footer></> : step === 2 ? <>
          <div className="extra-visit-fields"><label>Assunto<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} minLength={2} required/></label><label>Endereço da visita<input value={address} onChange={e => setAddress(e.target.value)} minLength={5} required placeholder="Rua, número, bairro, cidade"/></label><label className="full">Objetivo e observações<textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Conte o que precisa ser tratado. Se precisar de uma segunda-feira, me avise aqui."/></label>
            {slots.map((slot, index) => <div className="extra-visit-slot" key={index}><strong>Opção {index + 1}</strong><div><label>Data<input type="date" value={slot.date} onChange={e => updateSlot(index as 0 | 1, 'date', e.target.value)} required/></label><label>Início<input type="time" min="09:00" max="12:00" step="900" value={slot.time} onChange={e => updateSlot(index as 0 | 1, 'time', e.target.value)} required/></label></div></div>)}
          </div>
          {slots.some(slot => slot.date && new Date(`${slot.date}T12:00:00-03:00`).getUTCDay() === 1) && <p className="extra-visit-monday">Segundas geralmente não têm visita na minha agenda. Se for importante, conte nas observações que eu avalio.</p>}
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(1); }}>Voltar</button><button type="button" className="extra-visit-next" onClick={event => { const form = event.currentTarget.form; if (!form?.reportValidity()) return; const issue = validateSlot(slots[0]) || validateSlot(slots[1]); if (issue) return setError(issue); if (slots[0].date === slots[1].date && slots[0].time === slots[1].time) return setError('Escolha duas opções diferentes.'); setError(''); setStep(3); }}>Revisar pedido →</button></footer></> : <>
          <p className="extra-visit-review">Visita presencial extra<br/>{slots.map(slot => `${slot.date.split('-').reverse().join('/')} às ${slot.time}`).join(' ou ')}</p>
          <div className="extra-visit-consent"><label>Seu nome completo<input autoComplete="name" value={ackName} onChange={e => setAckName(e.target.value)} required/></label><label className="extra-visit-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/><span>Estou ciente do valor da visita de até 4 horas, das despesas comprovadas à parte e do orçamento prévio para horas adicionais. Entendemos que eventualidades podem impedir a visita — se algo acontecer, avise com antecedência e conte o motivo. Sem aviso ou justificativa, aplica-se uma taxa de 20%; com aviso ou motivo justificado, não há cobrança.</span></label></div>
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(2); }}>Voltar</button><button type="submit" disabled={saving || !ack}>{saving ? 'Enviando…' : 'Enviar para análise'}</button></footer></>}
        </form>
      </section>
    </div>, document.body)}
  </>;
}
