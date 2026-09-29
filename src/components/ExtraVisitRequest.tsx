import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Paperclip, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './extra-visit-request.css';

const FEE = 'R$ 800,00';
type Slot = { date: string; time: string };
type MeetingMode = 'visit' | 'online';
const emptySlot = (): Slot => ({ date: '', time: '' });
const weekday = (slot: Slot) => slot.date && slot.time ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(`${slot.date}T${slot.time}:00-03:00`)) : '';

function validateSlot(slot: Slot, mode: MeetingMode, minutes: number): string | null {
  if (!slot.date || !slot.time) return 'Informe duas opções de data e horário.';
  const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
  if (Number.isNaN(start.getTime())) return 'Revise a data e o horário.';
  if (start.getTime() <= Date.now() + 48 * 60 * 60 * 1000) return 'Preciso de pelo menos 48 horas corridas para avaliar. Escolha uma data mais adiante.';
  const weekday = new Date(`${slot.date}T12:00:00-03:00`).getUTCDay();
  if (weekday === 0 || weekday === 6) return 'Escolha um dia de segunda a sexta-feira.';
  if (slot.time < '09:00' || Number(slot.time.slice(0,2))*60+Number(slot.time.slice(3,5))+minutes>16*60) return mode==='visit' ? 'A visita de até 4 horas deve começar entre 9h e 12h e terminar até as 16h.' : 'Escolha um horário que termine até as 16h.';
  return null;
}

export function ExtraVisitRequest() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [mode, setMode] = useState<MeetingMode | null>(null);
  const [duration, setDuration] = useState(60);
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
  const [availability, setAvailability] = useState<'idle'|'checking'|'checked'|'unavailable'>('idle');
  const [busySlots, setBusySlots] = useState<boolean[]>([]);
  const [considerBusy, setConsiderBusy] = useState(false);
  useEffect(()=>{const openChooser=()=>{setMode(null);setStep(0);setOpen(true)};window.addEventListener('cali:open-papo-request',openChooser);return()=>window.removeEventListener('cali:open-papo-request',openChooser)},[]);
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
  function selectMode(next:MeetingMode){setMode(next);setTitle(next==='visit'?'Visita presencial extra':'Reunião online extra');setSlots([emptySlot(),emptySlot()]);setDuration(60);setAck(false);setAckName('');setError('');setAvailability('idle');setBusySlots([]);setConsiderBusy(false);setStep(1);}
  function validateDetails() {
    if (!mode) return 'Escolha o formato do encontro.';
    if (title.trim().length < 2) return 'Informe o assunto do encontro.';
    if (mode==='visit' && (!street.trim() || !number.trim() || !district.trim() || !city.trim() || !/^\d{5}-?\d{3}$/.test(zip.trim()))) return 'Preencha o endereço completo, incluindo CEP.';
    if (mode==='visit' && hasMonday && mondayReason.trim().length < 5) return 'Conte por que precisa de uma segunda-feira para eu avaliar a agenda.';
    return validateSlot(slots[0],mode,mode==='visit'?240:duration) || validateSlot(slots[1],mode,mode==='visit'?240:duration) || (slots[0].date === slots[1].date && slots[0].time === slots[1].time ? 'Escolha duas opções diferentes.' : null);
  }
  function updateSlot(index: 0 | 1, key: keyof Slot, value: string) { setAvailability('idle');setBusySlots([]);setConsiderBusy(false);setSlots(current => { const next: [Slot, Slot] = [{ ...current[0] }, { ...current[1] }]; next[index][key] = value; return next; }); }
  async function checkAvailability() {
    if (!supabase) { setAvailability('unavailable'); return []; }
    setAvailability('checking');
    const proposed = slots.map(slot => { const start = new Date(`${slot.date}T${slot.time}:00-03:00`); return { startsAt: start.toISOString(), endsAt: new Date(start.getTime()+(mode==='visit'?240:duration)*60000).toISOString() }; });
    try {
      const { data, error } = await supabase.functions.invoke('workspace-google-calendar-read', { body: { action: 'availability', slots: proposed } });
      if (error || data?.state !== 'checked' || !Array.isArray(data.slots)) throw error || new Error('Agenda indisponível');
      const busy = data.slots.map((item: { busy: boolean }) => Boolean(item.busy));
      setBusySlots(busy); setAvailability('checked'); return busy;
    } catch { setAvailability('unavailable'); return []; }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateDetails();
    if (issue) return setError(issue);
    if (!ack || ackName.trim().length < 5) return setError('Digite seu nome completo e confirme sua ciência.');
    if (!supabase) return setError('Conexão indisponível. Tente novamente.');
    const latestBusy = await checkAvailability();
    if (latestBusy.some(Boolean) && !considerBusy) return setError('Há um compromisso em um dos horários. Marque a opção de análise mesmo assim ou escolha outra data.');
    setError(''); setSaving(true);
    const requestedSlots = slots.map(slot => {
      const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
      return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + (mode==='visit'?240:duration) * 60 * 1000).toISOString() };
    });
    const { data: requestData, error: submitError } = mode==='visit'
      ? await supabase.rpc('create_extra_visit_request_v1', {p_title:title.trim(),p_purpose:[purpose.trim(),hasMonday?`Segunda-feira solicitada: ${mondayReason.trim()}`:''].filter(Boolean).join('\n'),p_location:address.trim(),p_requested_slots:requestedSlots,p_ack_name:ackName.trim(),p_acknowledged:ack})
      : await supabase.rpc('client_request_online_extra_v2',{p_title:title.trim(),p_purpose:purpose.trim(),p_slots:requestedSlots,p_ack_name:ackName.trim(),p_acknowledged:ack});
    if (submitError) { setSaving(false); return setError(submitError.message); }
    if (mode==='visit' && attachment) {
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
    <button className="extra-visit-top-action" type="button" aria-label="Agende aqui um papo com a Pati" title="Agende aqui um papo com a Pati" onClick={() => { setMode(null); setStep(0); setOpen(true); }}><CalendarPlus size={17}/><span>Agende aqui um papo com a Pati</span></button>
    {open && createPortal(<div className="extra-visit-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="extra-visit-dialog" role="dialog" aria-modal="true" aria-labelledby="extra-visit-heading">
        <header><div className="extra-visit-heading-copy"><small>{step===0?'AGENDA COM A PATI':`${mode==='visit'?'VISITA PRESENCIAL':'PAPO ONLINE'} · ${step===1?'CONDIÇÕES':step===2?'AGENDAMENTO':'CONFIRMAÇÃO'} · ${step} DE 3`}</small><h2 id="extra-visit-heading">{step===0?'Que tipo de papo você deseja?':step === 1 ? mode==='visit' ? 'Que legal que você quer uma visita presencial minha! Vamos lá?' : 'Vamos marcar um papo online?' : step === 2 ? 'Vamos encontrar uma data?' : 'Tá quase acabando. Vamos confirmar seu pedido?'}</h2></div><button type="button" className="extra-visit-close" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20}/></button>{step <= 1 && <img className="extra-visit-leaf" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true"/>}</header>
        <form onSubmit={submit}>
          {step===0 ? <div className="extra-visit-choice"><p>Este espaço é para encontros <strong>além dos agendamentos mensais do seu contrato</strong>. Os encontros incluídos continuam sendo organizados por mim.</p><div><button type="button" onClick={()=>selectMode('visit')}><span>Visita presencial na sede</span><small>Quero conversar pessoalmente na minha empresa.</small></button><button type="button" onClick={()=>selectMode('online')}><span>Bate-papo online</span><small>Quero uma reunião por vídeo.</small></button></div></div> : step === 1 && mode==='visit' ? <><div className="extra-visit-terms"><p><strong>Atenção para as condições:</strong></p><ul>
            <li>Eu analiso sua solicitação em até <strong>48 horas corridas</strong>. Proponha dois horários com essa antecedência.</li>
            <li>A visita extra custa <strong>{FEE} por até 4 horas</strong>. Se precisarmos de mais tempo, envio um orçamento para você aprovar antes de continuar.</li>
            <li>Atendo de segunda a sexta, entre 9h e 16h. Segunda costuma estar fechada; se precisar desse dia, me conte nas observações que eu avalio.</li>
            <li>Deslocamento, estacionamento e alimentação necessária são cobrados à parte com comprovantes. Carro próprio depende de condições combinadas previamente.</li>
            <li>Cancelamento ou ausência sem aviso ou justificativa pode gerar taxa de <strong>20% ({'R$ 160,00'})</strong>, após minha avaliação. Com aviso ou justificativa, não cobro a taxa.</li>
          </ul><p className="extra-visit-go">Vamos prosseguir?</p></div><footer><button type="button" onClick={() => setStep(0)}>Trocar formato</button><button type="button" className="extra-visit-next" onClick={() => setStep(2)}>Escolher datas →</button></footer></> : step===1 && mode==='online' ? <><div className="extra-visit-terms"><p><strong>Atenção para as condições:</strong></p><ul><li>Este bate-papo é <strong>adicional aos encontros incluídos no seu contrato</strong>.</li><li>Me envie duas opções de horário. Eu analiso sua agenda e te mando um <strong>orçamento com valor e condições</strong> para você aprovar antes de confirmar. Nada é cobrado só por fazer o pedido.</li><li>Escolha um dia útil entre 9h e 16h, com pelo menos 48 horas de antecedência.</li><li>Se precisar cancelar ou reagendar depois da confirmação, me conte o motivo. Eventual cobrança é avaliada conforme as condições aprovadas para este encontro.</li></ul><p className="extra-visit-go">Vamos prosseguir?</p></div><footer><button type="button" onClick={()=>setStep(0)}>Trocar formato</button><button type="button" className="extra-visit-next" onClick={()=>setStep(2)}>Escolher datas →</button></footer></> : step === 2 ? <>
          <div className="extra-visit-fields"><label>Assunto<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} minLength={2} required/></label><div className="extra-visit-company"><span>Empresa</span><strong>{company?.name || 'Carregando empresa…'}</strong></div>{mode==='visit'&&<><label>Rua<input value={street} onChange={e => setStreet(e.target.value)} required/></label><label>Número<input value={number} onChange={e => setNumber(e.target.value)} required/></label><label>Bairro<input value={district} onChange={e => setDistrict(e.target.value)} required/></label><label>Cidade / UF<input value={city} onChange={e => setCity(e.target.value)} required/></label><label className="full">CEP<input inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e => setZip(e.target.value)} pattern="[0-9]{5}-?[0-9]{3}" required placeholder="00000-000"/></label></>}{mode==='online'&&<label>Duração prevista<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={30}>30 minutos</option><option value={45}>45 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option></select></label>}<label className="full">Objetivo e observações<textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="O que você gostaria de conversar comigo?"/></label>{mode==='visit'&&<label className="full extra-visit-attachment"><Paperclip size={16}/> Anexo, se desejar<input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0] || null; if (file && (file.size > 10 * 1024 * 1024 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))) { setError('Anexe PDF ou imagem de até 10 MB.'); e.target.value = ''; return; } setAttachment(file); setError(''); }}/></label>}
            {slots.map((slot, index) => <div className="extra-visit-slot" key={index}><strong>Opção {index + 1}</strong><div><label>Data<input type="date" value={slot.date} onChange={e => updateSlot(index as 0 | 1, 'date', e.target.value)} required/></label><label>Início<input type="time" min="09:00" max={mode==='visit'?'12:00':'15:30'} step="900" value={slot.time} onChange={e => updateSlot(index as 0 | 1, 'time', e.target.value)} required/></label></div></div>)}
          </div>
          {mode==='visit' && hasMonday && <label className="extra-visit-monday">Por que a segunda-feira é importante?<textarea value={mondayReason} onChange={e => setMondayReason(e.target.value)} required minLength={5} placeholder="Conte o contexto para eu avaliar uma exceção."/></label>}
          <p className="extra-visit-hours">{mode==='visit'?'Horários: terça a sexta, início entre 9h e 12h (até 16h). Segunda-feira: mediante avaliação, sem taxa adicional.':'Horários: segunda a sexta, entre 9h e 16h. Envie duas opções para eu avaliar.'}</p>
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(1); }}>Voltar</button><button type="button" className="extra-visit-next" onClick={async event => { const form = event.currentTarget.form; if (!form?.reportValidity()) return; const issue = validateDetails(); if (issue) return setError(issue); setError(''); await checkAvailability(); setStep(3); }}>Revisar pedido →</button></footer></> : <>
          <div className="extra-visit-review"><strong>{title}</strong><span>{company?.name} · {mode==='online'?'Online':'Presencial'}</span><div>{slots.map((slot,index) => <p key={index}><small>Opção {index + 1}</small><b>{weekday(slot)}</b></p>)}</div>{mode==='visit' && hasMonday && <small>Segunda-feira: sujeita à confirmação da CALI.</small>}{mode==='online'&&<small>Duração prevista: {duration} minutos. Valor sujeito a orçamento e aceite.</small>}</div>
          {availability==='checked' && busySlots.some(Boolean) && <div className="extra-visit-availability" role="status"><strong>Já tenho um compromisso {busySlots.filter(Boolean).length===2?'nos dois horários':'em uma das opções'}.</strong><p>Posso avaliar sua solicitação mesmo assim. Nenhuma data fica confirmada até eu responder.</p><label><input type="checkbox" checked={considerBusy} onChange={event=>setConsiderBusy(event.target.checked)}/><span>Quero que a Pati avalie esses horários mesmo assim.</span></label></div>}
          {availability==='unavailable' && <p className="extra-visit-availability">Não consegui consultar minha agenda agora. Você pode enviar as opções; vou conferir antes de confirmar.</p>}
          <div className="extra-visit-consent"><label>Seu nome completo<input autoComplete="name" value={ackName} onChange={e => setAckName(e.target.value)} required/></label><label className="extra-visit-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/><span>{mode==='visit'?'Estou ciente do valor da visita de até 4 horas, das despesas comprovadas à parte e do orçamento prévio para horas adicionais. Entendemos que eventualidades podem impedir a visita — se algo acontecer, avise com antecedência e conte o motivo. Sem aviso ou justificativa, aplica-se uma taxa de 20%; com aviso ou motivo justificado, não há cobrança.':'Entendi que este papo online é adicional ao meu contrato. Vou receber o orçamento para aprovar antes da confirmação; enviar este pedido não gera cobrança.'}</span></label></div>
          {error && <p className="extra-visit-error" role="alert">{error}</p>}
          <footer><button type="button" onClick={() => { setError(''); setStep(2); }}>Voltar</button><button type="submit" disabled={saving || !ack}>{saving ? 'Enviando…' : 'Enviar para análise'}</button></footer></>}
        </form>
      </section>
    </div>, document.body)}
  </>;
}
