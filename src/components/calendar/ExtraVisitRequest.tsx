import { Checkbox } from '../ds/Checkbox';
import { Input } from '../ds/Input';
import { Select } from '../ds/Select';
import { Textarea } from '../ds/Textarea';
import { DialogFrame } from '../ds/DialogFrame';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Building2, CalendarPlus, Mic2, Paperclip, UserRound, X } from 'lucide-react';
import { attachExtraVisitFile, createExtraVisit, extraVisitsAvailable, readExtraVisitAvailability, readExtraVisitCompany } from '../../api/calendar/extra-visits';

const FEE = 'R$ 800,00';
type Slot = { date: string; time: string };
type SlotSelection = Slot & { duration?: number };
type MeetingMode = 'visit' | 'online';
const slotKeys = ['preferred', 'alternative'] as const;
const emptySlot = (): Slot => ({ date: '', time: '' });
const weekday = (slot: Slot) => slot.date && slot.time ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(`${slot.date}T${slot.time}:00-03:00`)) : '';

const stepLabel = 'tw:m-0 tw:flex tw:flex-col tw:gap-2 tw:text-cali-label tw:font-semibold tw:text-cali-text tw:workspace-night:text-cali-burgundy-surface';
const detailLabel = `${stepLabel} tw:order-2`;
const fileField = 'tw:h-auto tw:min-h-0 tw:w-full tw:rounded-md tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-2.5 tw:text-cali-label tw:font-normal tw:text-cali-text tw:shadow-none tw:workspace-night:border-cali-neutral-accent tw:workspace-night:bg-cali-burgundy-inverse tw:workspace-night:text-cali-neutral-surface';
const nextAction = 'tw:border-cali-brand! tw:bg-cali-brand! tw:text-cali-neutral-surface!';
const actions = 'tw:sticky tw:bottom-0 tw:mt-3 tw:flex tw:shrink-0 tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-6 tw:pt-3.5 tw:pb-4.5 tw:max-[37.5rem]:flex-wrap tw:max-[37.5rem]:[&>button]:flex-1 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-strong';
const action = 'tw:h-auto tw:min-h-0 tw:cursor-pointer tw:rounded-md tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2.5 tw:text-xs! tw:font-normal! tw:text-cali-brand tw:shadow-none tw:disabled:cursor-not-allowed tw:disabled:opacity-40';
const issue = 'tw:mx-6! tw:mt-2.5! tw:mb-0! tw:rounded-lg tw:bg-cali-danger-surface tw:px-3 tw:py-2.5 tw:text-cali-label tw:text-cali-danger';
const terms = 'tw:px-6 tw:pt-4.5 tw:pb-1 tw:text-xs/[1.6] tw:text-cali-muted tw:workspace-night:text-cali-neutral-soft tw:[&_strong]:text-cali-brand tw:workspace-night:[&_strong]:text-cali-gold';
const termsList = 'tw:my-2 tw:flex tw:list-disc tw:flex-col tw:gap-1.5 tw:pl-4.5';
const choice = 'tw:grid tw:cursor-pointer tw:grid-cols-[auto_1fr] tw:content-center tw:items-center tw:gap-x-3 tw:gap-y-1 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-paper tw:p-4 tw:text-left tw:text-cali-neutral-text tw:shadow-[0_2px_11px_rgb(var(--cali-rgb-burgundy-accent)/0.03137)] tw:transition-[transform,border-color,background-color] tw:duration-250 tw:hover:-translate-y-[0.1875rem] tw:hover:border-cali-gold tw:hover:bg-cali-gold-surface tw:focus-visible:border-cali-gold tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0 tw:workspace-night:border-cali-sand-strong tw:workspace-night:bg-cali-neutral-strong tw:workspace-night:hover:bg-cali-sand-inverse';
const availabilityCard = 'tw:mx-6! tw:mt-2! tw:mb-0! tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-gold-accent tw:bg-cali-gold-soft tw:px-3.5 tw:py-3 tw:text-cali-label/[1.5] tw:text-cali-sand-inverse tw:workspace-night:border-cali-gold-accent tw:workspace-night:bg-cali-sand-inverse tw:workspace-night:text-cali-orange-surface';

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

export function ExtraVisitRequest({ showTrigger = true }: { showTrigger?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [mode, setMode] = useState<MeetingMode | null>(null);
  const [duration, setDuration] = useState(60);
  // Tabela do papo online (decisão da proprietária em 14/10): 1 hora R$ 200; 1h30 R$ 300.
  const onlinePrice = (minutes: number) => minutes > 60 ? 'R$ 300' : 'R$ 200';
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
  const [requestSent, setRequestSent] = useState(false);
  const submissionPending = useRef(false);
  const [availability, setAvailability] = useState<'idle'|'checking'|'checked'|'unavailable'>('idle');
  const [busySlots, setBusySlots] = useState<boolean[]>([]);
  const [considerBusy, setConsiderBusy] = useState(false);
  const [prefill, setPrefill] = useState<SlotSelection | null>(null);
  const openChooser = useCallback((slot: SlotSelection | null) => {
    if (submissionPending.current) return;
    setPrefill(slot?.date && slot.time ? slot : null);
    setMode(null);
    setStep(0);
    setRequestSent(false);
    setAttachment(null);
    setError('');
    setOpen(true);
  }, []);
  useEffect(() => {
    const openFromSlot = (event: Event) => openChooser((event as CustomEvent<SlotSelection>).detail);
    window.addEventListener('cali:open-papo-request', openFromSlot);
    return () => window.removeEventListener('cali:open-papo-request', openFromSlot);
  }, [openChooser]);
  useEffect(() => {
    if (!open) return;
    const roots = [document.documentElement, document.body];
    const overflow = roots.map(root => root.style.overflow);
    const overscroll = roots.map(root => root.style.overscrollBehavior);
    roots.forEach(root => {
      root.style.overflow = 'hidden';
      root.style.overscrollBehavior = 'none';
    });
    return () => roots.forEach((root, index) => {
      root.style.overflow = overflow[index];
      root.style.overscrollBehavior = overscroll[index];
    });
  }, [open]);
  useEffect(() => {
    if (!open || !extraVisitsAvailable) return;
    let live = true;
    void readExtraVisitCompany().then((next) => { if (live && next) setCompany(next); });
    return () => { live = false; };
  }, [open]);
  const hasMonday = slots.some(slot => slot.date && new Date(`${slot.date}T12:00:00-03:00`).getUTCDay() === 1);
  const address = `${street.trim()}, ${number.trim()} · ${district.trim()} · ${city.trim()} · CEP ${zip.trim()}`;
  function selectMode(next:MeetingMode){setMode(next);setTitle(next==='visit'?'Visita presencial extra':'Reunião online extra');setSlots([prefill || emptySlot(),emptySlot()]);setDuration(next==='online'&&prefill?.duration?[60,90].reduce((closest,option)=>Math.abs(option-prefill.duration!)<Math.abs(closest-prefill.duration!)?option:closest,60):60);setAck(false);setAckName('');setError('');setAvailability('idle');setBusySlots([]);setConsiderBusy(false);setStep(1);}
  function validateDetails() {
    if (!mode) return 'Escolha o formato do encontro.';
    if (title.trim().length < 2) return 'Informe o assunto do encontro.';
    if (mode==='visit' && (!street.trim() || !number.trim() || !district.trim() || !city.trim() || !/^\d{5}-?\d{3}$/.test(zip.trim()))) return 'Preencha o endereço completo, incluindo CEP.';
    if (mode==='visit' && hasMonday && mondayReason.trim().length < 5) return 'Conte por que precisa de uma segunda-feira para eu avaliar a agenda.';
    return validateSlot(slots[0],mode,mode==='visit'?240:duration) || validateSlot(slots[1],mode,mode==='visit'?240:duration) || (slots[0].date === slots[1].date && slots[0].time === slots[1].time ? 'Escolha duas opções diferentes.' : null);
  }
  function updateSlot(index: 0 | 1, key: keyof Slot, value: string) { setAvailability('idle');setBusySlots([]);setConsiderBusy(false);setSlots(current => { const next: [Slot, Slot] = [{ ...current[0] }, { ...current[1] }]; next[index][key] = value; return next; }); }
  async function checkAvailability() {
    if (!extraVisitsAvailable) { setAvailability('unavailable'); return []; }
    setAvailability('checking');
    const proposed = slots.map(slot => { const start = new Date(`${slot.date}T${slot.time}:00-03:00`); return { startsAt: start.toISOString(), endsAt: new Date(start.getTime()+(mode==='visit'?240:duration)*60000).toISOString() }; });
    try {
      const busy = await readExtraVisitAvailability(proposed);
      setBusySlots(busy); setAvailability('checked'); return busy;
    } catch { setAvailability('unavailable'); return []; }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current || requestSent) return;
    const issue = validateDetails();
    if (issue) return setError(issue);
    if (!ack || ackName.trim().length < 5) return setError('Digite seu nome completo e confirme sua ciência.');
    if (!extraVisitsAvailable) return setError('Conexão indisponível. Tente novamente.');
    submissionPending.current = true;
    setSaving(true);
    setError('');
    try {
      const latestBusy = await checkAvailability();
      if (latestBusy.some(Boolean) && !considerBusy) return setError('Há um compromisso em um dos horários. Marque a opção de análise mesmo assim ou escolha outra data.');
      const requestedSlots = slots.map(slot => {
        const start = new Date(`${slot.date}T${slot.time}:00-03:00`);
        return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + (mode==='visit'?240:duration) * 60 * 1000).toISOString() };
      });
      const draft = { title: title.trim(), purpose: purpose.trim(), slots: requestedSlots, ackName: ackName.trim(), acknowledged: ack };
      const { id: requestId, error: submitError } = await createExtraVisit(mode === 'visit' ? {
        ...draft, mode: 'visit', location: address,
        purpose: [draft.purpose, hasMonday ? `Segunda-feira solicitada: ${mondayReason.trim()}` : ''].filter(Boolean).join('\n'),
      } : { ...draft, mode: 'online' });
      if (submitError) return setError(submitError.message);
      setRequestSent(true);
      if (mode === 'visit' && attachment) {
        if (!requestId || !company?.id) return setError('Pedido enviado. Não foi possível vincular o anexo. Avise a CALI, por favor.');
        const attachmentError = await attachExtraVisitFile(company.id, requestId, attachment);
        if (attachmentError) return setError(attachmentError);
      }
      setOpen(false);
      window.location.assign('/cliente/cronograma');
    } finally {
      submissionPending.current = false;
      setSaving(false);
    }
  }
  return <>
    {showTrigger && <button className="tw:relative tw:inline-flex tw:size-10.5 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-gold-accent tw:bg-cali-orange-line tw:p-0 tw:text-cali-burgundy-text tw:shadow-[0_3px_11px_rgb(var(--cali-rgb-burgundy-accent)/0.1216)] tw:transition-colors tw:duration-200 tw:after:pointer-events-none tw:after:absolute tw:after:top-[calc(100%+0.5625rem)] tw:after:right-0 tw:after:z-20 tw:after:w-max tw:after:max-w-[min(16.25rem,85vw)] tw:after:-translate-y-1 tw:after:rounded-lg tw:after:bg-cali-brand tw:after:px-2.5 tw:after:py-2 tw:after:text-xs/[1.2] tw:after:font-bold tw:after:text-cali-neutral-surface tw:after:opacity-0 tw:after:shadow-[0_8px_22px_rgb(var(--cali-rgb-red-inverse)/0.2667)] tw:after:transition-[opacity,transform] tw:after:content-[attr(data-tooltip)] tw:hover:-translate-y-px tw:hover:border-cali-gold-text tw:hover:bg-cali-orange-soft tw:hover:after:translate-y-0 tw:hover:after:opacity-100 tw:focus-visible:after:translate-y-0 tw:focus-visible:after:opacity-100 tw:motion-reduce:transition-none tw:motion-reduce:after:transition-none tw:motion-reduce:hover:translate-y-0 tw:max-[37.5rem]:size-9.5" type="button" aria-label="Agende aqui um papo com a Pati" data-tooltip="Agende aqui um papo com a Pati" onClick={() => openChooser(null)}><CalendarPlus size={21}/><span className="tw:sr-only">Agende aqui um papo com a Pati</span></button>}
    {open && createPortal(<div className="tw:fixed! tw:inset-0! tw:z-12000! tw:grid tw:h-dvh tw:w-screen tw:box-border tw:place-items-center tw:overflow-hidden tw:bg-cali-neutral-inverse/66! tw:p-[clamp(0.5rem,2vh,1.25rem)] tw:backdrop-blur-[0.625rem] tw:backdrop-saturate-80" onMouseDown={event => { if (event.target === event.currentTarget && !submissionPending.current) setOpen(false); }}>
      <DialogFrame className="tw:flex tw:max-h-[calc(100dvh-2.25rem)] tw:w-[min(56.25rem,100%)] tw:flex-col tw:overflow-hidden tw:rounded-xl tw:border-0 tw:bg-cali-neutral-surface tw:p-0 tw:text-xs tw:text-cali-text tw:shadow-[0_25px_70px_rgb(var(--cali-rgb-shadow)/0.2)] tw:max-[37.5rem]:max-h-[calc(100dvh-1rem)] tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-neutral-soft" aria-labelledby="extra-visit-heading">
        <header className="tw:relative tw:isolate tw:flex tw:shrink-0 tw:items-start tw:justify-between tw:gap-4 tw:overflow-hidden tw:bg-[linear-gradient(120deg,var(--cali-color-red-strong)_0%,var(--cali-color-burgundy-text)_62%,var(--cali-color-red-inverse)_100%)] tw:px-6 tw:pt-5 tw:pb-5.5 tw:text-cali-gold-surface tw:max-[37.5rem]:px-4"><div className="tw:relative tw:z-1 tw:flex tw:max-w-[calc(100%-3.75rem)] tw:flex-col tw:gap-1.5"><small className="tw:text-cali-micro tw:font-bold tw:tracking-[0.14em] tw:text-cali-orange-soft">{step===0?'AGENDA COM A PATI':`${mode==='visit'?'VISITA PRESENCIAL':'PAPO ONLINE'} · ${step===1?'CONDIÇÕES':step===2?'AGENDAMENTO':'CONFIRMAÇÃO'} · ${step} DE 3`}</small><h2 className="tw:m-0! tw:font-cali-body! tw:text-[clamp(1.25rem,2.1vw,1.6875rem)]/[1.2]! tw:font-semibold! tw:tracking-tight tw:text-cali-sand-surface!" id="extra-visit-heading">{requestSent && !saving ? 'Pedido enviado' : step===0?'Que tipo de papo você deseja?':step === 1 ? mode==='visit' ? 'Que legal que você quer uma visita presencial minha! Vamos lá?' : 'Vamos marcar um papo online?' : step === 2 ? 'Vamos encontrar uma data?' : 'Tá quase acabando. Vamos confirmar seu pedido?'}</h2></div><button type="button" className="tw:relative tw:z-1 tw:grid tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-cali-neutral-surface/25 tw:bg-cali-neutral-surface/10 tw:p-2 tw:text-cali-neutral-surface! tw:[&>svg]:size-4.5" aria-label="Fechar" disabled={saving} onClick={() => setOpen(false)}><X size={20}/></button>{step <= 1 && <img className="tw:pointer-events-none tw:absolute tw:-bottom-3.5 tw:left-2 tw:h-19.5 tw:w-auto tw:opacity-30" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true"/>}</header>
        <form className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:overflow-y-auto tw:overscroll-contain tw:bg-cali-neutral-surface tw:p-0 tw:workspace-night:bg-cali-burgundy-strong" onSubmit={submit}>
          {step===0 ? <div className="tw:px-6 tw:pt-4.5 tw:pb-5.5"><p className="tw:mt-0! tw:mb-3.5! tw:text-xs/[1.6] tw:text-cali-muted tw:workspace-night:text-cali-neutral-soft">Este espaço é para encontros <strong>além dos agendamentos mensais do seu contrato</strong>. Os encontros incluídos continuam sendo organizados por mim.</p><div className="tw:grid tw:grid-cols-2 tw:gap-3.5 tw:max-[47.5rem]:grid-cols-1"><button type="button" className={choice} onClick={()=>selectMode('visit')}><Building2 className="tw:row-span-2 tw:text-cali-gold" size={27} aria-hidden="true"/><span className="tw:text-cali-detail tw:font-semibold tw:text-cali-brand tw:workspace-night:text-cali-orange-surface">Visita presencial na sede</span><small className="tw:col-start-2 tw:text-cali-label tw:text-cali-sand-text tw:workspace-night:text-cali-sand-line">Quero conversar pessoalmente na minha empresa.</small></button><button type="button" className={choice} onClick={()=>selectMode('online')}><span className="tw:row-span-2 tw:inline-flex tw:items-center tw:gap-0.5 tw:text-cali-gold" aria-hidden="true"><UserRound size={22}/><Mic2 size={16}/></span><span className="tw:text-cali-detail tw:font-semibold tw:text-cali-brand tw:workspace-night:text-cali-orange-surface">Bate-papo online</span><small className="tw:col-start-2 tw:text-cali-label tw:text-cali-sand-text tw:workspace-night:text-cali-sand-line">Quero uma reunião por vídeo.</small></button></div></div> : step === 1 && mode==='visit' ? <><div className={terms}><p><strong>Atenção para as condições:</strong></p><ul className={termsList}>
            <li>Eu analiso sua solicitação em até <strong>48 horas corridas</strong>. Proponha dois horários com essa antecedência.</li>
            <li>A visita extra custa <strong>{FEE} por até 4 horas</strong>. Se precisarmos de mais tempo, envio um orçamento para você aprovar antes de continuar.</li>
            <li>Atendo de segunda a sexta, entre 9h e 16h. Segunda costuma estar fechada; se precisar desse dia, me conte nas observações que eu avalio.</li>
            <li>Deslocamento, estacionamento e alimentação necessária são cobrados à parte com comprovantes. Carro próprio depende de condições combinadas previamente.</li>
            <li>Cancelamento ou ausência sem aviso ou justificativa pode gerar taxa de <strong>20% ({'R$ 160,00'})</strong>, após minha avaliação. Com aviso ou justificativa, não cobro a taxa.</li>
          </ul><p className="tw:mt-2.5! tw:mb-0! tw:font-semibold tw:text-cali-brand tw:workspace-night:text-cali-gold">Vamos prosseguir?</p></div><footer className={actions}><button type="button" className={action} onClick={() => setStep(0)}>Trocar formato</button><button type="button" className={`${action} ${nextAction}`} onClick={() => setStep(2)}>Escolher datas →</button></footer></> : step===1 && mode==='online' ? <><div className={terms}><p><strong>Atenção para as condições:</strong></p><ul className={termsList}><li>Este bate-papo é <strong>adicional aos encontros incluídos no seu contrato</strong>.</li><li>O valor é fixo: <strong>R$ 200 por 1 hora</strong> ou <strong>R$ 300 por 1h30</strong>. Você escolhe a duração no próximo passo.</li><li>Me envie duas opções de horário. Eu confiro minha agenda e confirmo com você. Nada é cobrado só por fazer o pedido.</li><li>Escolha um dia útil entre 9h e 16h, com pelo menos 48 horas de antecedência.</li><li>Se precisar cancelar ou reagendar depois da confirmação, me conte o motivo. Eventual cobrança é avaliada conforme as condições aprovadas para este encontro.</li></ul><p className="tw:mt-2.5! tw:mb-0! tw:font-semibold tw:text-cali-brand tw:workspace-night:text-cali-gold">Vamos prosseguir?</p></div><footer className={actions}><button type="button" className={action} onClick={()=>setStep(0)}>Trocar formato</button><button type="button" className={`${action} ${nextAction}`} onClick={()=>setStep(2)}>Escolher datas →</button></footer></> : step === 2 ? <>
          <div className="tw:grid tw:grid-cols-4 tw:items-end tw:gap-x-4 tw:gap-y-3.5 tw:px-6 tw:pt-4.5 tw:pb-2 tw:max-[47.5rem]:grid-cols-2"><label className={`${stepLabel} tw:order-0 tw:col-span-2`}>Assunto<Input variant="compact" className="tw:w-full" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} minLength={2} required/></label><div className={`tw:order-1 tw:flex tw:flex-col tw:gap-2 tw:self-end tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:pb-2.5 tw:max-[47.5rem]:col-span-full ${mode === 'visit' ? 'tw:col-span-2' : 'tw:col-span-1'}`}><span className="tw:text-cali-micro tw:text-cali-muted">Empresa</span><strong className="tw:text-xs tw:text-cali-text tw:workspace-night:text-cali-neutral-soft">{company?.name || 'Carregando empresa…'}</strong></div>{mode==='visit'&&<><label className={detailLabel}>Rua<Input variant="compact" className="tw:w-full" value={street} onChange={e => setStreet(e.target.value)} required/></label><label className={detailLabel}>Número<Input variant="compact" className="tw:w-full" value={number} onChange={e => setNumber(e.target.value)} required/></label><label className={detailLabel}>Bairro<Input variant="compact" className="tw:w-full" value={district} onChange={e => setDistrict(e.target.value)} required/></label><label className={detailLabel}>Cidade / UF<Input variant="compact" className="tw:w-full" value={city} onChange={e => setCity(e.target.value)} required/></label><label className={detailLabel}>CEP<Input variant="compact" className="tw:w-full" inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e => setZip(e.target.value)} pattern="[0-9]{5}-?[0-9]{3}" required placeholder="00000-000"/></label></>}{mode==='online'&&<label className={`${stepLabel} tw:order-1`}>Duração prevista<Select variant="compact" className="tw:w-full" value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={60}>1 hora · R$ 200</option><option value={90}>1h30 · R$ 300</option></Select></label>}<label className={`${stepLabel} tw:order-4 tw:col-span-full`}>Objetivo e observações<Textarea variant="compact" className="tw:h-14 tw:w-full tw:resize-none!" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="O que você gostaria de conversar comigo?"/></label>{mode==='visit'&&<label className={`${stepLabel} tw:order-3 tw:col-span-3 tw:max-[47.5rem]:col-span-full`}><Paperclip className="tw:hidden" size={16}/> Anexo, se desejar<input className={`${fileField} tw:px-2.5 tw:py-2`} type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0] || null; if (file && (file.size > 10 * 1024 * 1024 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))) { setError('Anexe PDF ou imagem de até 10 MB.'); e.target.value = ''; return; } setAttachment(file); setError(''); }}/></label>}
            {slots.map((slot, index) => <div className="tw:order-5 tw:col-span-2 tw:flex tw:flex-col tw:gap-2 tw:self-stretch tw:rounded-md tw:border tw:border-solid tw:border-cali-line tw:bg-cali-sand-soft tw:p-3 tw:max-[47.5rem]:col-span-full tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-strong" key={slotKeys[index]}><strong className="tw:text-cali-label tw:font-bold tw:text-cali-brand tw:workspace-night:text-cali-gold">Opção {index + 1}</strong><div className="tw:grid tw:grid-cols-2 tw:gap-3"><label className={`${stepLabel} tw:text-cali-micro tw:text-cali-muted`}>Data<Input variant="compact" className="tw:w-full" type="date" value={slot.date} onChange={e => updateSlot(index as 0 | 1, 'date', e.target.value)} required/></label><label className={`${stepLabel} tw:text-cali-micro tw:text-cali-muted`}>Início<Input variant="compact" className="tw:w-full" type="time" min="09:00" max={mode==='visit'?'12:00':'15:30'} step="900" value={slot.time} onChange={e => updateSlot(index as 0 | 1, 'time', e.target.value)} required/></label></div></div>)}
          </div>
          {mode==='visit' && hasMonday && <label className="tw:mx-6 tw:mt-2 tw:grid tw:gap-1.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-orange-line tw:bg-cali-gold-soft tw:px-3 tw:py-2.5 tw:text-cali-label/[1.5] tw:font-bold tw:text-cali-gold-strong tw:workspace-night:border-cali-sand-strong tw:workspace-night:bg-cali-sand-inverse tw:workspace-night:text-cali-gold-line">Por que a segunda-feira é importante?<Textarea variant="compact" className="tw:min-h-13 tw:w-full" value={mondayReason} onChange={e => setMondayReason(e.target.value)} required minLength={5} placeholder="Conte o contexto para eu avaliar uma exceção."/></label>}
          <p className="tw:mx-6! tw:mt-2! tw:mb-0! tw:text-cali-micro/[1.5] tw:text-cali-muted tw:workspace-night:text-cali-neutral-line">{mode==='visit'?'Horários: terça a sexta, início entre 9h e 12h (até 16h). Segunda-feira: mediante avaliação, sem taxa adicional.':'Horários: segunda a sexta, entre 9h e 16h. Envie duas opções para eu avaliar.'}</p>
          {error && <p className={issue} role="alert">{error}</p>}
          <footer className={actions}><button type="button" className={action} onClick={() => { setError(''); setStep(1); }}>Voltar</button><button type="button" className={`${action} ${nextAction}`} onClick={async event => { const form = event.currentTarget.form; if (!form?.reportValidity()) return; const issue = validateDetails(); if (issue) return setError(issue); setError(''); await checkAvailability(); setStep(3); }}>Revisar pedido →</button></footer></> : requestSent && !saving ? <>
          <p className={issue} role="alert">{error || 'Pedido enviado. Não foi possível concluir o anexo. Avise a CALI, por favor.'}</p>
          <footer className={actions}><button type="button" className={action} autoFocus onClick={() => setOpen(false)}>Entendi, fechar</button></footer>
          </> : <>
          <div className="tw:grid tw:gap-1.5 tw:rounded-cali-panel tw:bg-cali-orange-surface tw:px-6 tw:pt-4.5 tw:pb-1 tw:text-xs/[1.6] tw:text-cali-muted tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-neutral-soft"><strong className="tw:text-base tw:text-cali-brand tw:workspace-night:text-cali-gold">{title}</strong><span>{company?.name} · {mode==='online'?'Online':'Presencial'}</span><div className="tw:grid tw:grid-cols-2 tw:gap-2.5 tw:max-[37.5rem]:grid-cols-1">{slots.map((slot,index) => <p className="tw:mt-1.5! tw:mb-0! tw:grid tw:gap-0.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-accent tw:bg-cali-sand-surface tw:p-2.5 tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-text" key={slotKeys[index]}><small className="tw:text-cali-sand-strong tw:workspace-night:text-cali-neutral-line">Opção {index + 1}</small><b className="tw:text-sm tw:capitalize tw:text-cali-brand tw:workspace-night:text-cali-gold">{weekday(slot)}</b></p>)}</div>{mode==='visit' && hasMonday && <small>Segunda-feira: sujeita à confirmação da CALI.</small>}{mode==='online'&&<small>Duração: {duration > 60 ? '1h30' : '1 hora'} · valor {onlinePrice(duration)}.</small>}</div>
          {availability==='checked' && busySlots.some(Boolean) && <div className={availabilityCard} role="status"><strong>Já tenho um compromisso {busySlots.filter(Boolean).length===2?'nos dois horários':'em uma das opções'}.</strong><p className="tw:mt-1! tw:mb-2!">Posso avaliar sua solicitação mesmo assim. Nenhuma data fica confirmada até eu responder.</p><label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-2 tw:font-bold"><Checkbox className="tw:mt-0.5 tw:size-4.5" checked={considerBusy} onChange={event=>setConsiderBusy(event.target.checked)}/><span>Quero que a Pati avalie esses horários mesmo assim.</span></label></div>}
          {availability==='unavailable' && <p className={availabilityCard}>Não consegui consultar minha agenda agora. Você pode enviar as opções; vou conferir antes de confirmar.</p>}
          <div className="tw:mx-6 tw:mt-2.5 tw:flex tw:items-start tw:gap-2 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-orange-line tw:bg-cali-gold-surface tw:p-3.5 tw:text-cali-label tw:text-cali-muted tw:max-[37.5rem]:flex-col tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-burgundy-surface"><label className={`${stepLabel} tw:min-w-40`}>Seu nome completo<Input variant="compact" className="tw:w-full" autoComplete="name" value={ackName} onChange={e => setAckName(e.target.value)} required/></label><label className="tw:mx-6 tw:mt-2.5 tw:flex tw:items-start tw:gap-2 tw:text-cali-label/[1.4]"><Checkbox className="tw:mt-0.5 tw:size-4.5" checked={ack} onChange={e => setAck(e.target.checked)}/><span>{mode==='visit'?'Estou ciente do valor da visita de até 4 horas, das despesas comprovadas à parte e do orçamento prévio para horas adicionais. Entendemos que eventualidades podem impedir a visita — se algo acontecer, avise com antecedência e conte o motivo. Sem aviso ou justificativa, aplica-se uma taxa de 20%; com aviso ou motivo justificado, não há cobrança.':`Entendi que este papo online é adicional ao meu contrato e custa ${onlinePrice(duration)} (${duration > 60 ? '1h30' : '1 hora'}). Enviar este pedido não gera cobrança; o valor vale depois que a CALI confirmar o horário.`}</span></label></div>
          {error && <p className={issue} role="alert">{error}</p>}
          <footer className={actions}><button type="button" className={action} disabled={saving} onClick={() => { setError(''); setStep(2); }}>Voltar</button><button type="submit" className={`${action} ${nextAction}`} disabled={saving || !ack}>{saving ? 'Enviando…' : 'Enviar para análise'}</button></footer></>}
        </form>
      </DialogFrame>
    </div>, document.body)}
  </>;
}
