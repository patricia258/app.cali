import { supabase } from './supabase';

type EventRow = {
  id: string;
  company_id: string | null;
  protocol?: string | null;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  mode?: string | null;
  location?: string | null;
  meeting_url?: string | null;
  description?: string | null;
  visibility?: string | null;
  source_type?: string | null;
  source_entity_id?: string | null;
  schedule_class?: string | null;
  billing_applies?: boolean | null;
  google_html_link?: string | null;
  sync_status?: string | null;
};

type DeliverableRow = { id:string; title:string; status:string; due_at:string | null };

let installed = false;
let clientView: 'list' | 'calendar' = 'list';
let clientCursor = new Date();
let clientEvents: EventRow[] = [];
let clientDeliverables: DeliverableRow[] = [];
let clickInstalled = false;
let refreshing = false;

const STYLE = `
/* CALI Workspace · pós-confirmação de agenda V69 */
.client-agenda-view-switch{display:flex;align-items:center;gap:3px;padding:3px;border:1px solid var(--theme-line,#e4dcd6);border-radius:10px;background:var(--theme-surface,#fff)}
.client-agenda-view-switch button{min-height:32px;padding:0 11px;border:0;border-radius:7px;background:transparent;color:var(--theme-muted,#746963);font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.client-agenda-view-switch button.active{background:#5A1E2D;color:#fff}
.client-real-timeline-title.v69-title{align-items:center;gap:14px}
.client-real-timeline-title.v69-title>small{margin-left:auto}
.client-calendar-v69{padding:0 22px 22px}
.client-calendar-v69-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0 12px;border-top:1px solid var(--theme-line,#e8dfd9)}
.client-calendar-v69-head strong{font-size:16px;color:var(--theme-text,#2b2b2b)}
.client-calendar-v69-nav{display:flex;align-items:center;gap:6px}
.client-calendar-v69-nav button{width:34px;height:34px;border:1px solid var(--theme-line,#e1d8d2);border-radius:9px;background:var(--theme-surface,#fff);color:var(--theme-accent,#5A1E2D);font:inherit;font-size:17px;cursor:pointer}
.client-calendar-v69-weekdays,.client-calendar-v69-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.client-calendar-v69-weekdays span{padding:8px 5px;text-align:center;font-size:11px;font-weight:850;text-transform:uppercase;color:var(--theme-muted,#776b65);background:var(--theme-surface-muted,#faf7f4);border-bottom:1px solid var(--theme-line,#e8dfd9)}
.client-calendar-v69-day{min-height:116px;padding:8px;border-right:1px solid var(--theme-line,#e8dfd9);border-bottom:1px solid var(--theme-line,#e8dfd9);background:var(--theme-surface-soft,#fffdfa)}
.client-calendar-v69-day:nth-child(7n){border-right:0}.client-calendar-v69-day.outside{opacity:.38;background:var(--theme-surface-muted,#f8f5f2)}
.client-calendar-v69-day.today{box-shadow:inset 0 0 0 1px rgba(90,30,45,.18)}
.client-calendar-v69-day-number{display:block;margin-bottom:6px;font-size:12px;font-weight:850;color:var(--theme-text,#2b2b2b)}
.client-calendar-v69-items{display:grid;gap:4px}
.client-calendar-v69-item{width:100%;display:grid;gap:1px;padding:6px 7px;border:0;border-left:3px solid #B58C52;border-radius:7px;background:color-mix(in srgb,#B58C52 9%,var(--theme-surface,#fff));color:var(--theme-text,#2b2b2b);text-align:left;cursor:pointer}
.client-calendar-v69-item.meeting{border-left-color:#5A1E2D;background:color-mix(in srgb,#5A1E2D 7%,var(--theme-surface,#fff))}
.client-calendar-v69-item strong{font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.client-calendar-v69-item span{font-size:10px;color:var(--theme-muted,#776b65)}
.client-agenda-row.event{cursor:pointer}.client-agenda-row.event:hover{background:color-mix(in srgb,var(--theme-surface,#fff) 94%,#5A1E2D 6%)}
.v69-modal-backdrop{position:fixed;inset:0;z-index:11050;display:grid;place-items:center;padding:20px;background:rgba(22,15,18,.6);backdrop-filter:blur(5px)}
.v69-modal{width:min(680px,95vw);max-height:88vh;overflow:auto;border:1px solid var(--theme-line,#e1d8d2);border-radius:20px;background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);box-shadow:0 28px 75px rgba(0,0,0,.25)}
.v69-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 24px 16px;border-bottom:1px solid var(--theme-line,#e8dfd9)}
.v69-modal-head span{font-size:11px;letter-spacing:.11em;font-weight:900;color:#B58C52;text-transform:uppercase}.v69-modal-head h3{margin:5px 0 4px;font-size:25px;line-height:1.15}.v69-modal-head p{margin:0;font-size:13px;color:var(--theme-muted,#756a65)}
.v69-modal-close{width:36px;height:36px;border:1px solid var(--theme-line,#e1d8d2);border-radius:10px;background:var(--theme-surface-muted,#faf7f4);color:var(--theme-text,#2b2b2b);font-size:20px;cursor:pointer}
.v69-modal-body{display:grid;gap:12px;padding:18px 24px 24px}.v69-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.v69-fact{padding:13px;border:1px solid var(--theme-line,#e8dfd9);border-radius:12px;background:var(--theme-surface-soft,#fffdfa)}.v69-fact span{display:block;margin-bottom:4px;font-size:11px;font-weight:850;color:var(--theme-muted,#756a65)}.v69-fact strong{font-size:14px;line-height:1.35}.v69-modal-actions{display:flex;gap:8px;flex-wrap:wrap}.v69-modal-actions a{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:10px;background:#5A1E2D;color:#fff;text-decoration:none;font-size:12px;font-weight:850}
.v69-admin-outcome{margin:12px 28px 6px;padding:14px 16px;border:1px solid var(--theme-line,#e5ddd7);border-radius:13px;background:var(--theme-surface-soft,#fffdfa)}
.v69-admin-outcome-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.v69-admin-outcome-head strong{font-size:14px}.v69-admin-outcome-head span{font-size:11px;color:var(--theme-muted,#756a65)}
.v69-admin-outcome-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.v69-admin-outcome button{min-height:36px;padding:0 12px;border:1px solid var(--theme-line,#ded5cf);border-radius:9px;background:var(--theme-surface,#fff);color:var(--theme-text,#2b2b2b);font:inherit;font-size:12px;font-weight:800;cursor:pointer}.v69-admin-outcome button.primary{background:#5A1E2D;border-color:#5A1E2D;color:#fff}
.v69-outcome-form{display:grid;gap:9px;margin-top:12px}.v69-outcome-form select,.v69-outcome-form input,.v69-outcome-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--theme-line,#ded5cf);border-radius:9px;background:var(--theme-input,var(--theme-surface,#fff));color:var(--theme-text,#2b2b2b);font:inherit;font-size:13px;padding:9px 10px}.v69-outcome-form textarea{min-height:72px;resize:vertical}.v69-outcome-form label{font-size:12px;font-weight:750;color:var(--theme-muted,#756a65)}
.calendar-detail-company-mark{overflow:hidden!important;background:var(--theme-surface,#fff)!important}.calendar-detail-company-mark img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;padding:4px!important;box-sizing:border-box!important}
.calendar-detail-modal .calendar-detail-facts article span,.calendar-detail-modal .calendar-attendee-list>div,.calendar-detail-modal .calendar-detail-description p{font-size:13px!important;line-height:1.45!important}.calendar-detail-modal .calendar-detail-facts article strong{font-size:13px!important;line-height:1.4!important}.calendar-detail-modal .calendar-attendee-list small{font-size:12px!important}.calendar-detail-modal .calendar-attendee-list b{font-size:11px!important}
html[data-workspace-theme='night'] .client-calendar-v69-day,html[data-workspace-theme='night'] .v69-modal,html[data-workspace-theme='night'] .v69-admin-outcome{background:#241a1e;color:#f2e8ea;border-color:#4b373e}html[data-workspace-theme='night'] .client-calendar-v69-item{background:#30251f}html[data-workspace-theme='night'] .client-calendar-v69-item.meeting{background:#332128}
@media(max-width:760px){.client-real-timeline-title.v69-title{align-items:flex-start;flex-wrap:wrap}.client-real-timeline-title.v69-title>small{margin-left:0}.client-calendar-v69{overflow-x:auto}.client-calendar-v69-weekdays,.client-calendar-v69-grid{min-width:720px}.v69-facts{grid-template-columns:1fr}.v69-modal-backdrop{padding:8px}}
`;

function esc(value: unknown) { return String(value ?? '').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c)); }
function ensureStyle(){ if(document.getElementById('scheduling-post-v69-style')) return; const el=document.createElement('style');el.id='scheduling-post-v69-style';el.textContent=STYLE;document.head.appendChild(el); }
function fmtDay(value:string){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)).replace('.','');}
function fmtTime(value:string){return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value));}
function fmtLong(value:string){return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value));}
function localParts(value:string){const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Sao_Paulo'}).formatToParts(new Date(value)); const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value||0);return {y:get('year'),m:get('month'),d:get('day')};}
function sameMonth(a:Date,b:{y:number;m:number}){return a.getFullYear()===b.y&&a.getMonth()+1===b.m;}

async function loadClientData(){
  if(!supabase||location.pathname!=='/cliente/cronograma') return;
  const {data:user}=await supabase.auth.getUser(); const uid=user.user?.id; if(!uid) return;
  const {data:profile}=await supabase.from('profiles').select('company_id').eq('id',uid).maybeSingle(); const companyId=profile?.company_id; if(!companyId) return;
  const [ev,del]=await Promise.all([
    supabase.from('events').select('id,company_id,protocol,title,starts_at,ends_at,mode,location,meeting_url,description,visibility,source_type,source_entity_id,schedule_class,billing_applies,google_html_link,sync_status').eq('company_id',companyId).eq('visibility','client').is('cancelled_at',null).order('starts_at'),
    supabase.from('deliverables').select('id,title,status,due_at').eq('company_id',companyId).eq('client_visible',true).not('due_at','is',null).neq('status','cancelled').order('due_at')
  ]);
  if(!ev.error) clientEvents=(ev.data||[]) as EventRow[];
  if(!del.error) clientDeliverables=(del.data||[]) as DeliverableRow[];
}

function bindClientRows(){
  document.querySelectorAll<HTMLElement>('.client-agenda-row.event').forEach(row=>{
    const title=row.querySelector<HTMLElement>('.client-agenda-item strong')?.textContent?.trim()||'';
    const day=row.querySelector<HTMLElement>('.client-agenda-date strong')?.textContent?.trim()||'';
    const time=row.querySelector<HTMLElement>('.client-agenda-date span')?.textContent?.trim()||'';
    const event=clientEvents.find(e=>e.title===title&&fmtDay(e.starts_at)===day&&fmtTime(e.starts_at)===time) || clientEvents.find(e=>e.title===title);
    if(event){row.dataset.v69EventId=event.id; const status=row.querySelector<HTMLElement>('.client-agenda-status span'); if(status) status.textContent='Confirmado'; row.setAttribute('role','button'); row.tabIndex=0;}
  });
}

function ensureClientSwitch(){
  const title=document.querySelector<HTMLElement>('.client-real-timeline-title'); const table=document.querySelector<HTMLElement>('.client-agenda-table'); if(!title||!table) return;
  title.classList.add('v69-title');
  let sw=document.getElementById('client-agenda-v69-switch');
  if(!sw){sw=document.createElement('div');sw.id='client-agenda-v69-switch';sw.className='client-agenda-view-switch';sw.innerHTML='<button type="button" data-v69-view="list">Lista</button><button type="button" data-v69-view="calendar">Calendário</button>';title.appendChild(sw);}
  sw.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active',(btn as HTMLElement).dataset.v69View===clientView));
  table.style.display=clientView==='list'?'':'none';
  if(clientView==='calendar') renderClientCalendar(table); else document.getElementById('client-calendar-v69')?.remove();
}

function calendarCells(cursor:Date){const first=new Date(cursor.getFullYear(),cursor.getMonth(),1,12);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});}
function monthLabel(d:Date){return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);}
function renderClientCalendar(table:HTMLElement){
  let root=document.getElementById('client-calendar-v69'); if(!root){root=document.createElement('div');root.id='client-calendar-v69';root.className='client-calendar-v69';table.insertAdjacentElement('afterend',root);}
  const cells=calendarCells(clientCursor); const today=new Date();
  const items=(date:Date)=>{
    const e=clientEvents.filter(x=>{const p=localParts(x.starts_at);return p.y===date.getFullYear()&&p.m===date.getMonth()+1&&p.d===date.getDate();}).map(x=>`<button type="button" class="client-calendar-v69-item meeting" data-v69-open-event="${esc(x.id)}"><strong>${esc(x.title)}</strong><span>${esc(fmtTime(x.starts_at))}${x.mode==='in_person'?' · Presencial':' · Online'}</span></button>`);
    const d=clientDeliverables.filter(x=>x.due_at&&(()=>{const p=localParts(String(x.due_at));return p.y===date.getFullYear()&&p.m===date.getMonth()+1&&p.d===date.getDate();})()).map(x=>`<div class="client-calendar-v69-item"><strong>${esc(x.title)}</strong><span>Prazo · ${esc(x.status.replaceAll('_',' '))}</span></div>`);
    return [...e,...d].join('');
  };
  root.innerHTML=`<div class="client-calendar-v69-head"><strong>${esc(monthLabel(clientCursor))}</strong><div class="client-calendar-v69-nav"><button type="button" data-v69-month="-1">‹</button><button type="button" data-v69-today title="Hoje">•</button><button type="button" data-v69-month="1">›</button></div></div><div class="client-calendar-v69-weekdays">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>`<span>${x}</span>`).join('')}</div><div class="client-calendar-v69-grid">${cells.map(date=>`<div class="client-calendar-v69-day ${date.getMonth()!==clientCursor.getMonth()?'outside':''} ${date.toDateString()===today.toDateString()?'today':''}"><span class="client-calendar-v69-day-number">${date.getDate()}</span><div class="client-calendar-v69-items">${items(date)}</div></div>`).join('')}</div>`;
}

function openClientEvent(eventId:string){
  const e=clientEvents.find(x=>x.id===eventId); if(!e) return;
  document.getElementById('v69-client-event-modal')?.remove(); const wrap=document.createElement('div');wrap.id='v69-client-event-modal';wrap.className='v69-modal-backdrop';
  const mode=e.mode==='in_person'?'Presencial':'Online'; const place=e.mode==='in_person'?(e.location||'Endereço a confirmar'):'Google Meet';
  wrap.innerHTML=`<section class="v69-modal" role="dialog" aria-modal="true"><div class="v69-modal-head"><div><span>COMPROMISSO CONFIRMADO</span><h3>${esc(e.title)}</h3><p>${esc(e.protocol||'Agenda CALI')}</p></div><button class="v69-modal-close" data-v69-close>×</button></div><div class="v69-modal-body"><div class="v69-facts"><div class="v69-fact"><span>Quando</span><strong>${esc(fmtLong(e.starts_at))}</strong></div><div class="v69-fact"><span>Formato</span><strong>${esc(mode)}</strong></div><div class="v69-fact"><span>${e.mode==='in_person'?'Local':'Acesso'}</span><strong>${esc(place)}</strong></div><div class="v69-fact"><span>Status</span><strong>Confirmado</strong></div></div>${e.description?`<div class="v69-fact"><span>Contexto</span><strong>${esc(e.description)}</strong></div>`:''}<div class="v69-modal-actions">${e.meeting_url?`<a href="${esc(e.meeting_url)}" target="_blank" rel="noreferrer">Abrir Google Meet</a>`:''}${e.google_html_link?`<a href="${esc(e.google_html_link)}" target="_blank" rel="noreferrer">Ver no Google Calendar</a>`:''}</div></div></section>`;
  document.body.appendChild(wrap);
}

async function cleanAdminRequests(){
  if(!supabase||location.pathname!=='/admin/calendario') return;
  const {data}=await supabase.from('scheduling_requests').select('id,status').eq('status','confirmed').limit(100);
  for(const row of data||[]) document.querySelector<HTMLElement>(`[data-admin-request="${row.id}"]`)?.remove();
  const list=document.querySelector<HTMLElement>('#scheduling-v65-admin-host .scheduling-v65-list');
  if(list&&!list.querySelector('.scheduling-v65-request')) list.outerHTML='<div class="scheduling-v65-empty">Nenhuma solicitação de cliente aguardando ação.</div>';
}

function getProtocolFromModal(modal:HTMLElement){const text=modal.querySelector<HTMLElement>('.calendar-protocol-badge')?.textContent||'';return text.match(/CALI-EVT-[0-9-]+/i)?.[0]||'';}
async function decorateAdminModal(){
  if(!supabase||location.pathname!=='/admin/calendario') return;
  const modal=document.querySelector<HTMLElement>('.calendar-detail-modal'); if(!modal||modal.dataset.v69==='1') return;
  const protocol=getProtocolFromModal(modal); if(!protocol) return; const {data:event}=await supabase.from('events').select('id,title,event_type,starts_at,mode,source_type,source_entity_id').eq('protocol',protocol).maybeSingle(); if(!event||event.event_type!=='meeting') return;
  modal.dataset.v69='1';
  const {data:outcome}=await supabase.from('event_outcomes').select('outcome,reason_category,justified,note,transcription_url,transcription_note,marked_at').eq('event_id',event.id).maybeSingle();
  const body=modal.querySelector<HTMLElement>('.calendar-detail-body'); if(!body) return;
  const section=document.createElement('section');section.className='v69-admin-outcome';section.dataset.eventId=event.id;section.dataset.sourceType=event.source_type||'';
  const day=localParts(event.starts_at);const now=new Date();const available=(now.getFullYear()>day.y)||(now.getFullYear()===day.y&&now.getMonth()+1>day.m)||(now.getFullYear()===day.y&&now.getMonth()+1===day.m&&now.getDate()>=day.d);
  const outcomeLabel=outcome?.outcome==='occurred'?'Realizado':outcome?.outcome==='not_occurred'?'Não realizado':'A registrar';
  section.innerHTML=`<div class="v69-admin-outcome-head"><strong>Registro do encontro</strong><span>${esc(outcomeLabel)}</span></div>${outcome?.outcome?`<div class="v69-admin-outcome-actions"><button type="button" data-v69-edit-outcome>Atualizar registro</button></div>`:available?`<div class="v69-admin-outcome-actions"><button type="button" class="primary" data-v69-occurred>Aconteceu</button><button type="button" data-v69-no-show>Não aconteceu</button></div>`:'<div class="v69-admin-outcome-actions"><span style="font-size:12px;color:var(--theme-muted,#756a65)">O registro fica disponível no dia do encontro.</span></div>'}${outcome?.outcome==='occurred'?`<div class="v69-outcome-form"><label>Transcrição / registro da reunião</label><input type="url" data-v69-transcription-url placeholder="https://..." value="${esc(outcome.transcription_url||'')}"><textarea data-v69-transcription-note placeholder="Observação opcional">${esc(outcome.transcription_note||'')}</textarea><button type="button" data-v69-save-transcription>Salvar transcrição</button></div>`:''}`;
  body.appendChild(section);
}

function outcomeForm(section:HTMLElement,kind:'occurred'|'not_occurred'){
  section.querySelector('.v69-outcome-form')?.remove(); const form=document.createElement('div');form.className='v69-outcome-form';
  if(kind==='occurred') form.innerHTML='<label>Confirmar realização</label><textarea data-v69-note placeholder="Observação opcional sobre o encontro"></textarea><button type="button" class="primary" data-v69-submit-occurred>Confirmar que aconteceu</button>';
  else form.innerHTML='<label>Motivo</label><select data-v69-reason><option value="client">Cliente</option><option value="cali">CALI</option><option value="external">Fator externo</option><option value="health">Saúde</option><option value="travel_vacation">Viagem ou férias</option><option value="other">Outro</option></select><label><input type="checkbox" data-v69-justified> Houve justificativa</label><textarea data-v69-note placeholder="Justificativa / contexto"></textarea><button type="button" class="primary" data-v69-submit-no-show>Registrar não ocorrência</button>';
  section.appendChild(form);
}

async function submitOutcome(section:HTMLElement,occurred:boolean){
  if(!supabase) return;const eventId=section.dataset.eventId||'';const source=section.dataset.sourceType||'';const note=(section.querySelector<HTMLTextAreaElement>('[data-v69-note]')?.value||'').trim();const reason=section.querySelector<HTMLSelectElement>('[data-v69-reason]')?.value||null;const justified=Boolean(section.querySelector<HTMLInputElement>('[data-v69-justified]')?.checked);
  const fn=source==='scheduling_request'?'admin_mark_scheduling_event_outcome_v1':'admin_mark_calendar_event_outcome_v66'; const args=source==='scheduling_request'?{p_event_id:eventId,p_outcome:occurred?'occurred':'not_occurred',p_reason_category:reason,p_justified:justified,p_note:note,p_convert_to_virtual:false}:{p_event_id:eventId,p_outcome:occurred?'occurred':'not_occurred',p_reason_category:reason,p_justified:justified,p_note:note};
  const {error}=await supabase.rpc(fn,args); if(error){alert(error.message);return;} section.removeAttribute('data-v69'); const modal=section.closest<HTMLElement>('.calendar-detail-modal'); section.remove(); if(modal) modal.dataset.v69='0'; await decorateAdminModal(); await cleanAdminRequests();
}

async function saveTranscription(section:HTMLElement){if(!supabase)return;const eventId=section.dataset.eventId||'';const url=section.querySelector<HTMLInputElement>('[data-v69-transcription-url]')?.value||'';const note=section.querySelector<HTMLTextAreaElement>('[data-v69-transcription-note]')?.value||'';const {error}=await supabase.rpc('admin_save_event_transcription_v69',{p_event_id:eventId,p_url:url,p_note:note});if(error){alert(error.message);return;} const btn=section.querySelector<HTMLButtonElement>('[data-v69-save-transcription]');if(btn){btn.textContent='Salvo';setTimeout(()=>btn.textContent='Salvar transcrição',1200);}}

export async function refreshSchedulingPostConfirmationV69(){
  ensureStyle(); if(refreshing) return; refreshing=true;
  try{
    if(location.pathname==='/cliente/cronograma'){await loadClientData();bindClientRows();ensureClientSwitch();}
    if(location.pathname==='/admin/calendario'){await cleanAdminRequests();await decorateAdminModal();}
  }finally{refreshing=false;}
}

function onClick(event:MouseEvent){
  const target=event.target as HTMLElement;
  if(target.closest('[data-v69-close]')){target.closest('.v69-modal-backdrop')?.remove();return;}
  const view=target.closest<HTMLElement>('[data-v69-view]');if(view){clientView=view.dataset.v69View==='calendar'?'calendar':'list';ensureClientSwitch();return;}
  const month=target.closest<HTMLElement>('[data-v69-month]');if(month){clientCursor=new Date(clientCursor.getFullYear(),clientCursor.getMonth()+Number(month.dataset.v69Month||0),1,12);const table=document.querySelector<HTMLElement>('.client-agenda-table');if(table)renderClientCalendar(table);return;}
  if(target.closest('[data-v69-today]')){clientCursor=new Date();const table=document.querySelector<HTMLElement>('.client-agenda-table');if(table)renderClientCalendar(table);return;}
  const open=target.closest<HTMLElement>('[data-v69-open-event]');if(open){openClientEvent(open.dataset.v69OpenEvent||'');return;}
  const row=target.closest<HTMLElement>('.client-agenda-row.event');if(row?.dataset.v69EventId){openClientEvent(row.dataset.v69EventId);return;}
  const section=target.closest<HTMLElement>('.v69-admin-outcome');if(section){if(target.closest('[data-v69-occurred]'))outcomeForm(section,'occurred');if(target.closest('[data-v69-no-show]'))outcomeForm(section,'not_occurred');if(target.closest('[data-v69-submit-occurred]'))void submitOutcome(section,true);if(target.closest('[data-v69-submit-no-show]'))void submitOutcome(section,false);if(target.closest('[data-v69-save-transcription]'))void saveTranscription(section);return;}
  if(location.pathname==='/admin/calendario') window.setTimeout(()=>void decorateAdminModal(),120);
}

export function installSchedulingPostConfirmationV69(){
  if(installed) return; installed=true; ensureStyle();
  if(!clickInstalled){clickInstalled=true;document.addEventListener('click',onClick,true);document.addEventListener('keydown',(e)=>{const t=e.target as HTMLElement;if((e.key==='Enter'||e.key===' ')&&t.matches('.client-agenda-row.event[data-v69-event-id]')){e.preventDefault();openClientEvent(t.dataset.v69EventId||'');}});}
  window.setTimeout(()=>void refreshSchedulingPostConfirmationV69(),380);
}
