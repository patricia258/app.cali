import STYLE from './scheduling-post-confirmation.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import {
  readClientScheduledWork, readMeetingByProtocol, readMeetingOutcome,
  recordMeetingOutcome, saveMeetingTranscription, uploadMeetingTranscription,
} from '../../api/calendar/meetings';
import { readClientSchedulingCompany, readConfirmedSchedulingRequests } from '../../api/calendar/requests';

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

function esc(value: unknown) { return String(value ?? '').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c)); }
function ensureStyle(){ if(document.getElementById('scheduling-post-v69-style')) return; const el=document.createElement('style');el.id='scheduling-post-v69-style';el.textContent=STYLE;document.head.appendChild(el); }
function fmtDay(value:string){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)).replace('.','');}
function fmtTime(value:string){return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value));}
function fmtLong(value:string){return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value));}
function localParts(value:string){const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Sao_Paulo'}).formatToParts(new Date(value)); const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value||0);return {y:get('year'),m:get('month'),d:get('day')};}
function sameMonth(a:Date,b:{y:number;m:number}){return a.getFullYear()===b.y&&a.getMonth()+1===b.m;}

async function loadClientData(){
  if(!isSupabaseConfigured||location.pathname!=='/cliente/cronograma') return;
  const companyId = await readClientSchedulingCompany().catch(() => '');
  if (!companyId) return;
  const [ev, del] = await readClientScheduledWork(companyId);
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
  window.dispatchEvent(new CustomEvent('cali:open-agenda-event',{detail:{eventId}}));
}

async function cleanAdminRequests(){
  if(!isSupabaseConfigured||location.pathname!=='/admin/calendario') return;
  const {data}=await readConfirmedSchedulingRequests();
  for(const row of data||[]) document.querySelector<HTMLElement>(`[data-admin-request="${row.id}"]`)?.remove();
  const list=document.querySelector<HTMLElement>('#scheduling-v65-admin-host .scheduling-v65-list');
  if(list&&!list.querySelector('.scheduling-v65-request')) list.outerHTML='<div class="scheduling-v65-empty">Nenhuma solicitação de cliente aguardando ação.</div>';
}

function getProtocolFromModal(modal:HTMLElement){const text=modal.querySelector<HTMLElement>('.calendar-protocol-badge')?.textContent||'';return text.match(/CALI-EVT-[0-9-]+/i)?.[0]||'';}
async function decorateAdminModal(){
  if(!isSupabaseConfigured||location.pathname!=='/admin/calendario') return;
  const modal=document.querySelector<HTMLElement>('.calendar-detail-modal'); if(!modal||modal.dataset.v69==='1') return;
  const protocol=getProtocolFromModal(modal); if(!protocol) return; const {data:event}=await readMeetingByProtocol(protocol); if(!event||event.event_type!=='meeting') return;
  modal.dataset.v69='1';
  const {data:outcome}=await readMeetingOutcome(event.id);
  const body=modal.querySelector<HTMLElement>('.calendar-detail-body'); if(!body) return;
  const section=document.createElement('section');section.className='v69-admin-outcome';section.dataset.eventId=event.id;section.dataset.sourceType=event.source_type||'';
  const day=localParts(event.starts_at);const now=new Date();const available=(now.getFullYear()>day.y)||(now.getFullYear()===day.y&&now.getMonth()+1>day.m)||(now.getFullYear()===day.y&&now.getMonth()+1===day.m&&now.getDate()>=day.d);
  const outcomeLabel=outcome?.outcome==='occurred'?'Realizado':outcome?.outcome==='not_occurred'?'Não realizado':'A registrar';
  section.dataset.companyId=event.company_id;
  section.innerHTML=`<div class="v69-admin-outcome-head"><strong>Registro do encontro</strong><span>${esc(outcomeLabel)}</span></div>${outcome?.outcome?`<div class="v69-admin-outcome-actions"><button type="button" data-v69-edit-outcome>Atualizar registro</button></div>`:available?`<div class="v69-admin-outcome-actions"><button type="button" class="primary" data-v69-occurred>Aconteceu</button><button type="button" data-v69-no-show>Não aconteceu</button></div>`:'<div class="v69-admin-outcome-actions"><span style="font-size:12px;color:var(--theme-muted,#756a65)">O registro fica disponível no dia do encontro.</span></div>'}${outcome?.outcome==='occurred'?`<div class="v69-outcome-form"><label>Transcrição / registro da reunião</label><input type="url" data-v69-transcription-url placeholder="https://..." value="${esc(outcome.transcription_url||'')}"><textarea data-v69-transcription-note placeholder="Observação opcional">${esc(outcome.transcription_note||'')}</textarea><button type="button" data-v69-save-transcription>Salvar transcrição</button><label>Ou anexar arquivo (PDF, DOCX ou TXT · até 10 MB)</label><input type="file" data-v69-transcription-file accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><button type="button" data-v69-upload-transcription>Enviar anexo</button></div>`:''}`;
  body.appendChild(section);
}

function outcomeForm(section:HTMLElement,kind:'occurred'|'not_occurred'){
  section.querySelector('.v69-outcome-form')?.remove(); const form=document.createElement('div');form.className='v69-outcome-form';
  if(kind==='occurred') form.innerHTML='<label>Confirmar realização</label><textarea data-v69-note placeholder="Observação opcional sobre o encontro"></textarea><button type="button" class="primary" data-v69-submit-occurred>Confirmar que aconteceu</button>';
  else form.innerHTML='<label>Motivo</label><select data-v69-reason><option value="client">Cliente</option><option value="cali">CALI</option><option value="external">Fator externo</option><option value="health">Saúde</option><option value="travel_vacation">Viagem ou férias</option><option value="other">Outro</option></select><label><input type="checkbox" data-v69-justified> Houve justificativa</label><textarea data-v69-note placeholder="Justificativa / contexto"></textarea><button type="button" class="primary" data-v69-submit-no-show>Registrar não ocorrência</button>';
  section.appendChild(form);
}

async function submitOutcome(section:HTMLElement,occurred:boolean){
  if(!isSupabaseConfigured) return;const eventId=section.dataset.eventId||'';const source=section.dataset.sourceType||'';const note=(section.querySelector<HTMLTextAreaElement>('[data-v69-note]')?.value||'').trim();const reason=section.querySelector<HTMLSelectElement>('[data-v69-reason]')?.value||null;const justified=Boolean(section.querySelector<HTMLInputElement>('[data-v69-justified]')?.checked);
  const { error } = await recordMeetingOutcome(eventId, source === 'scheduling_request', occurred, reason, justified, note); if(error){alert(error.message);return;} window.dispatchEvent(new Event('cali-calendar-record-updated')); section.removeAttribute('data-v69'); const modal=section.closest<HTMLElement>('.calendar-detail-modal'); section.remove(); if(modal) modal.dataset.v69='0'; await decorateAdminModal(); await cleanAdminRequests();
}

async function saveTranscription(section:HTMLElement){if(!isSupabaseConfigured)return;const eventId=section.dataset.eventId||'';const url=section.querySelector<HTMLInputElement>('[data-v69-transcription-url]')?.value||'';const note=section.querySelector<HTMLTextAreaElement>('[data-v69-transcription-note]')?.value||'';const {error}=await saveMeetingTranscription(eventId,url,note);if(error){alert(error.message);return;} window.dispatchEvent(new Event('cali-calendar-record-updated')); const btn=section.querySelector<HTMLButtonElement>('[data-v69-save-transcription]');if(btn){btn.textContent='Salvo';setTimeout(()=>btn.textContent='Salvar transcrição',1200);}}
async function uploadTranscription(section:HTMLElement){if(!isSupabaseConfigured)return;const file=section.querySelector<HTMLInputElement>('[data-v69-transcription-file]')?.files?.[0],eventId=section.dataset.eventId||'',companyId=section.dataset.companyId||'';if(!file)return;if(file.size>10*1024*1024||!['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)){alert('Envie PDF, DOCX ou TXT de até 10 MB.');return;}const path=`meeting-transcripts/${companyId}/${eventId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const button=section.querySelector<HTMLButtonElement>('[data-v69-upload-transcription]');if(button)button.disabled=true;try{await uploadMeetingTranscription(eventId,path,file);if(button)button.textContent='Anexo disponível ao cliente';}catch(error){alert(error instanceof Error?error.message:'Não foi possível anexar.');if(button)button.disabled=false;}}

export async function refreshSchedulingPostConfirmation(){
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
  const row=target.closest<HTMLElement>('.client-agenda-row.event');if(!target.closest('.client-agenda-open') && row?.dataset.v69EventId){openClientEvent(row.dataset.v69EventId);return;}
  const section=target.closest<HTMLElement>('.v69-admin-outcome');if(section){if(target.closest('[data-v69-occurred]'))outcomeForm(section,'occurred');if(target.closest('[data-v69-no-show]'))outcomeForm(section,'not_occurred');if(target.closest('[data-v69-submit-occurred]'))void submitOutcome(section,true);if(target.closest('[data-v69-submit-no-show]'))void submitOutcome(section,false);if(target.closest('[data-v69-save-transcription]'))void saveTranscription(section);if(target.closest('[data-v69-upload-transcription]'))void uploadTranscription(section);return;}
  if(location.pathname==='/admin/calendario') window.setTimeout(()=>void decorateAdminModal(),120);
  if(location.pathname==='/cliente/cronograma') window.setTimeout(()=>void refreshSchedulingPostConfirmation(),500);
}

export function installSchedulingPostConfirmation(){
  if(installed) return; installed=true; ensureStyle();
  if(!clickInstalled){clickInstalled=true;document.addEventListener('click',onClick,true);document.addEventListener('keydown',(e)=>{const t=e.target as HTMLElement;if((e.key==='Enter'||e.key===' ')&&t.matches('.client-agenda-row.event[data-v69-event-id]')){e.preventDefault();openClientEvent(t.dataset.v69EventId||'');}});}
  window.setTimeout(()=>void refreshSchedulingPostConfirmation(),380);
}
