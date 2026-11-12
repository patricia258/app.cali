import { DialogFrame } from '../../../components/ds/DialogFrame';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, X } from 'lucide-react';
import { decideAgendaChange, observeAdminAgendaChanges, readAdminAgendaChanges, type AgendaChangeRequest as Request } from '../../../api/calendar/changes';
import './agenda-change-inbox.css';

const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value));

export function AgendaChangeInbox({onDecision}:{onDecision:()=>void}) {
  const [rows,setRows]=useState<Request[]>([]),[titles,setTitles]=useState<Record<string,string>>({}),[companyNames,setCompanies]=useState<Record<string,string>>({});
  const [active,setActive]=useState<Request|null>(null),[index,setIndex]=useState(0),[note,setNote]=useState(''),[approve,setApprove]=useState(true),[slot,setSlot]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load() {
    const next = await readAdminAgendaChanges();
    setRows(next.requests);
    setTitles(next.titles);
    setCompanies(next.companies);
  }
  useEffect(() => {
    void load();
    return observeAdminAgendaChanges(() => void load());
  }, []);
  const [syncWarning,setSyncWarning] = useState('');

  async function decide(event: FormEvent) {
    event.preventDefault();
    if (!active || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await decideAgendaChange(active.id, approve, note, slot);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSyncWarning(result.sync === 'pending'
        ? 'Decisão salva no Workspace. A sincronização com o Google ficou pendente.'
        : result.sync === 'disconnected' ? 'Decisão salva no Workspace. Conecte a agenda do Google para sincronizar.' : '');
      setActive(null);
      setNote('');
      await load();
      onDecision();
    } finally {
      setBusy(false);
    }
  }
  const pending=rows.filter(row=>row.status==='pending');
  return <div className="agenda-change-inbox"><button type="button" className="agenda-change-trigger" disabled={!pending.length} title={pending.length ? `${pending.length} pedido(s) aguardando análise` : 'Nenhum pedido pendente'} onClick={()=>{setActive(pending[index%pending.length]);setNote('');setApprove(true);setSlot(0);setError('')}}><CalendarClock size={17}/> Alterações de reuniões {pending.length>0&&<b>{pending.length}</b>}</button>
  {pending.length>1&&<span className="agenda-change-navigation"><button type="button" onClick={()=>setIndex((index-1+pending.length)%pending.length)}>‹</button><small>{index%pending.length+1}/{pending.length}</small><button type="button" onClick={()=>setIndex((index+1)%pending.length)}>›</button></span>}
  {syncWarning && <p role="status" className="tw:text-cali-caption tw:text-cali-text">{syncWarning}</p>}
  {active&&createPortal(<div className="client-agenda-detail-backdrop agenda-change-admin-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)setActive(null)}}><DialogFrame className="agenda-change-admin-modal" aria-labelledby="agenda-admin-change-title"><header><div><small>PEDIDO DO CLIENTE</small><h2 id="agenda-admin-change-title">{active.action==='cancel'?'Cancelar reunião':'Reagendar reunião'}</h2></div><button type="button" disabled={busy} onClick={()=>setActive(null)} aria-label="Fechar"><X size={18}/></button></header><form onSubmit={decide}><strong>{companyNames[active.company_id]} · {titles[active.event_id]}</strong><p>Original: {date(active.original_starts_at)}</p><p>Motivo do cliente: {active.reason}</p>{active.action==='reschedule'&&<div className="agenda-change-slot-options">{active.slots.map((option,i)=><label key={option.startsAt}><input type="radio" name="option" checked={slot===i} onChange={()=>setSlot(i)}/>{date(option.startsAt)}</label>)}</div>}<div className="agenda-change-slot-options"><label><input type="radio" name="decision" checked={approve} onChange={()=>setApprove(true)}/>Confirmar pedido</label><label><input type="radio" name="decision" checked={!approve} onChange={()=>setApprove(false)}/>Recusar pedido</label></div><label className="agenda-change-note">Resposta ao cliente<textarea minLength={5} required value={note} onChange={event=>setNote(event.target.value)} placeholder="Explique sua decisão e eventual condição de cobrança."/></label>{error&&<p role="alert">{error}</p>}<div className="agenda-change-actions"><button type="button" disabled={busy} onClick={()=>setActive(null)}>Voltar</button><button type="submit" disabled={busy}>{busy?'Salvando…':'Enviar resposta'}</button></div></form></DialogFrame></div>,document.body)}</div>;
}
