import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Paperclip, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './extra-visit-request.css';

const FEE = 'R$ 800,00';
type Slot = { date: string; time: string };
const emptySlot = (): Slot => ({ date: '', time: '' });
const weekday = (slot: Slot) => slot.date && slot.time ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(`${slot.date}T${slot.time}:00-03:00`)) : '';

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
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [mondayReason, setMondayReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
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
  useEffect(() => { if (!open || !supabase) return; let live = true; (async () => { const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return; const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', auth.user.id).maybeSingle(); if (!profile?.company_id) return; const { data: companyData } = await supabase.from('companies').select('id,display_name').eq('id', profile.company_id).maybeSingle(); if (live && companyData) setCompany({ id: companyData.id, name: companyData.display_name }); })(); return () => { live = false; }; }, [open]);
  const hasMonday = slots.some(slot => slot.date && new Date(`${slot.date}T12:00:00-03:00`).getUTCDay() === 1);
  const address = `${street.trim()}, ${number.trim()} · ${district.trim()} · ${city.trim()} · CEP ${zip.trim()}`;
  function validateDetails() {
    if (title.trim().length < 2 || !street.trim() || !number.trim() || !district.trim() || !city.trim() || !/^\d{5}-?\d{3}$/.test(zip.trim())) return 'Preencha o assunto e o endereço completo, incluindo CEP.';
    if (hasMonday && mondayReason.trim().length < 5) return 'Conte por que precisa de uma segunda-feira para eu avaliar a agenda.';
    return validateSlot(slots[0]) || validateSlot(slots[1]) || (slots[0].date === slots[1].date && slots[0].time === slots[1].time ? 'Escolha duas opções diferentes.' : null);
  }
  function updateSlot(index: 0 | 1, key: keyof Slot, value: string) { setSlots(current => { const next: [Slot, Slot] = [{ ...current[0] }, { ...current[1] }]; next[index][key] = value; return next; }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateDetails();
    if (issue) return setError(issue);
    if (!ack || ackName.trim().length < 5) return setError('Digite seu nome completo e confirme sua ciência.');
    if (!supabase) return setError('Conexão indisponível. Tente novamente.');
    setError(''); setSaving(true);
    const requestedSlots = slots.map(slot => {
      const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
      return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString() };
    });
    const { data: requestData, error: submitError } = await supabase.rpc('create_extra_visit_request_v1', {
      p_title: title.trim(), p_purpose: [purpose.trim(), hasMonday ? `Segunda-feira solicitada: ${mondayReason.trim()}` : ''].filter(Boolean).join('\n'), p_location: address.trim(),
      p_requested_slots: requestedSlots, p_ack_name: ackName.trim(), p_acknowledged: ack,
    });
    if (submitError) { setSaving(false); return setError(submitError.message); }
    if (attachment) {
      const requestId = typeof requestData === 'string' ? requestData : requestData?.request_id || requestData?.id;
      if (!requestId || !company?.id) { setSaving(false); return setError('Pedido enviado. Não foi possível vincular o anexo. Avise a CALI, por favor.'); }
      const path = `extra-visit-requests/${company.id}/${requestId}/${crypto.randomUUID()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploaded = await supabase.storage.from('cali-workspace-private').upload(path, attachment, { upsert: false, contentType: attachment.type });
      if (uploaded.error) { setSaving(false); return setError('Pedido enviado. O anexo não foi recebido: ' + uploaded.error.message); }
      const saved = await supabase.rpc('attach_extra_visit_request_v1', { p_request_id: requestId, p_path: path, p_name: attachment.name });
      if (saved.error) { await supabase.storage.from('cali-workspace-private').remove([path]); setSaving(false); return setError('Pedido enviado. O anexo não foi vinculado: ' + saved.error.message); }
    }
    setSaving(false);
    setOpen(false); window.location.assign('/cliente/cronograma');
  }
  return <>
    <button className="extra-visit-top-action" type="button" aria-label="Solicitar visita extra" title="Solicitar visita extra" onClick={() => { setStep(1); setOpen(true); }}><CalendarPlus size={17}/><span>Solicitar visita extra</span></button>
    {open && createPortal(<div className="extra-visit-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="extra-visit-dialog" role="dialog" aria-modal="true" aria-labelledby="extra-visit-heading">
        <header><div className="extra-visit-heading-copy"><small>VISITA EXTRA · {step === 1 ? 'CONDIÇÕES' : step === 2 ? 'AGENDAMENTO' : 'CIÊNCIA'} · {step} DE 3</small><h2 id="extra-visit-heading">{step === 1 ? 'Que legal que você quer uma visita presencial minha! Vamos lá?' : step === 2 ? 'Vamos encontrar uma data?' : 'Tá quase acabando. Vamos confirmar seu pedido?'}</h2></div><button type="button" className="extra-visit-close" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button>{step === 1 && <img className="extra-visit-leaf" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true"/>}</header>
        <form onSubmit={submit}>
          {step === 1 ? <><div className="extra-visit-terms"><p><strong>Atenção para as condições:</strong></p><ul>
            <li>Eu analiso sua solicitação em até <strong>48 horas corridas</strong>. Proponha dois horários com essa antecedência.</li>
            <li>A visita extra custa <strong>{FEE} por até 4 horas</strong>. Se precisarmos de mais tempo, envio um orçamento para você aprovar antes de continuar.</li>
            <li>Atendo de segunda a sexta, entre 9h e 16h. Segunda costuma estar fechada; se precisar desse dia, me conte nas observações que eu avalio.</li>
            <li>Deslocamento, estacionamento e alimentação necessária são cobrados à parte com comprovantes. Carro próprio depende de condições combinadas previamente.</li>
            <li>Cancelamento ou ausência sem aviso ou justificativa pode gerar taxa de <strong>20% ({'R$ 160,00'})</strong>, após minha avaliação. Com aviso ou justificativa, não cobro a taxa.</li>
          </ul><p className="extra-visit-go">Vamos prosseguir?</p></div><footer><button type="button" onClick={() => setOpen(false)}>Agora não</button><button type="button" className="extra-visit-next" onClick={() => setStep(2)}>Escolher datas →</button></footer></> : step === 2 ? <>
          <div className="extra-visit-fields"><label>Assunto<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} minLength={2} required/></label><div className="extra-visit-company"><span>Empresa</span><strong>{company?.name || 'Carregando empresa…'}</strong></div><label>Rua<input value={street} onChange={e => setStreet(e.target.value)} required/></label><label>Número<input value={number} onChange={e => setNumber(e.target.value)} required/></label><label>Bairro<input value={district} onChange={e => setDistrict(e.target.value)} required/></label><label>Cidade / UF<input value={city} onChange={e => setCity(e.target.value)} required/></label><label className="full">CEP<input inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e => setZip(e.target.value)} pattern="[0-9]{5}-?[0-9]{3}" required placeholder="00000-000"/></label><label className="full">Objetivo e observações<textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="O que precisa ser tratado nesta visita?"/></label><label className="full extra-visit-attachment"><Paperclip size={16}/> Anexo, se desejar<input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0] || null; if (file && (file.size > 10 * 1024 * 1024 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))) { setError('Anexe PDF ou imagem de até 10 MB.'); e.target.value = ''; return; } setAttachment(file); setError(''); }}/></label>
            {slots.map((slot, index) => <div className="extra-visit-slot" key={index}><strong>Opção {index + 1}</strong><div><label>Data<input type="date" value={slot.date} onChange={e => updateSlot(index as 0 | 1, 'date', e.target.value)} required/></label><label>Início<input type="time" min="09:00" max="12:00" step="900" value={slot.time} onChange={e => updateSlot(index as 0 | 1, 'time', e.target.value)} required/></label></div></div>)}
          </div>
          {hasMonday && <label className="extra-visit-monday">Por que a segunda-feira é importante?<textarea value={mondayReason} onChange={e => setMondayReason(e.target.value)} required minLength={5} placeholder="Conte o contexto para eu avaliar uma exceção."/></label>}
          <p className="extra-visit-hours">Horários: terça a sexta, início entre 9h e 12h (até 16h). Segunda-feira: mediante avaliação, sem taxa adicional.</p>
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(1); }}>Voltar</button><button type="button" className="extra-visit-next" onClick={event => { const form = event.currentTarget.form; if (!form?.reportValidity()) return; const issue = validateDetails(); if (issue) return setError(issue); setError(''); setStep(3); }}>Revisar pedido →</button></footer></> : <>
          <div className="extra-visit-review"><strong>{title}</strong><span>{company?.name}</span><div>{slots.map((slot,index) => <p key={index}><small>Opção {index + 1}</small><b>{weekday(slot)}</b></p>)}</div>{hasMonday && <small>Segunda-feira: sujeita à confirmação da CALI.</small>}</div>
          <div className="extra-visit-consent"><label>Seu nome completo<input autoComplete="name" value={ackName} onChange={e => setAckName(e.target.value)} required/></label><label className="extra-visit-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/><span>Estou ciente do valor da visita de até 4 horas, das despesas comprovadas à parte e do orçamento prévio para horas adicionais. Entendemos que eventualidades podem impedir a visita — se algo acontecer, avise com antecedência e conte o motivo. Sem aviso ou justificativa, aplica-se uma taxa de 20%; com aviso ou motivo justificado, não há cobrança.</span></label></div>
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(2); }}>Voltar</button><button type="submit" disabled={saving || !ack}>{saving ? 'Enviando…' : 'Enviar para análise'}</button></footer></>}
        </form>
      </section>
    </div>, document.body)}
  </>;
}
