import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, Pencil, ShieldAlert, Trash2, X } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { hoursAvailable } from '../../api/hours/client';
import { deleteAuditedHourEntry, editAuditedHourEntry, readAuditableHours, type AuditRow, type HourAuditEntry } from '../../api/hours/audit';
import styles from './operational-safety.css?inline';

type Role='admin'|'client';
type ProjectAction={button:HTMLButtonElement;kind:'project'|'deliverable'}|null;
type HourAction={kind:'edit'|'delete';entry:HourAuditEntry}|null;
type EditDraft={workDate:string;minutes:string;description:string;category:string;clientVisible:boolean};

const categories=['Entregáveis','Reuniões e alinhamentos','Análise e consultoria','Documentação','Comunicação e follow-up','Treinamentos / encontros','Outros'];
const pencilSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
const trashSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';


function currentMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthBounds(value:string){const[y,m]=value.split('-').map(Number);const start=`${y}-${String(m).padStart(2,'0')}-01`;const n=new Date(y,m,1);const next=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;return{start,next}}
function snapshot(row:AuditRow){return row.event_type==='hours_entry_deleted'?row.metadata?.deleted_entry:row.metadata?.after}
function formatMinutes(value:any){const n=Math.max(0,Number(value||0));const h=Math.floor(n/60),m=n%60;return h?`${h}h${m?` ${m}min`:''}`:`${m}min`}

export function OperationalSafetyBridgeV2({role}:{role:Role}){
 const location=useLocation();const[projectAction,setProjectAction]=useState<ProjectAction>(null);const[hourEntries,setHourEntries]=useState<HourAuditEntry[]>([]);const[hourAction,setHourAction]=useState<HourAction>(null);const[editDraft,setEditDraft]=useState<EditDraft>({workDate:'',minutes:'',description:'',category:'Outros',clientVisible:false});const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[auditRows,setAuditRows]=useState<AuditRow[]>([]);const[auditOpen,setAuditOpen]=useState(false);

 useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/projetos'))return;const handler=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;const button=target?.closest<HTMLButtonElement>('button');if(!button||!button.textContent?.includes('Enviar ao cliente'))return;const kind=button.closest('.project-hero-buttons')?'project':button.closest('.deliverable-actions-right-v2')?'deliverable':null;if(!kind)return;if(button.dataset.caliSafetyConfirmed==='1'){delete button.dataset.caliSafetyConfirmed;return;}event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setProjectAction({button,kind});};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true);},[role,location.pathname]);

 const loadHours = useCallback(async () => {
   if (role !== 'admin' || !hoursAvailable || !location.pathname.startsWith('/admin/horas')) return;
   const period = document.querySelector<HTMLInputElement>('.hours-connect-period input[type="month"]')?.value || currentMonth();
   const { start, next } = monthBounds(period);
   const { entries, audit } = await readAuditableHours(start, next);
   if (entries) setHourEntries(entries);
   if (audit) setAuditRows(audit);
 }, [role, location.pathname]);
 useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/horas')){setHourEntries([]);return;}void loadHours();const onChange=(event:Event)=>{const el=event.target as HTMLElement|null;if(el?.matches('.hours-connect-period input[type="month"],.hours-connect-filters select'))window.setTimeout(()=>void loadHours(),50)};document.addEventListener('change',onChange);return()=>document.removeEventListener('change',onChange);},[role,location.pathname,loadHours]);

 useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/horas'))return;const entriesById=new Map(hourEntries.map(entry=>[entry.id,entry]));const apply=()=>{const table=document.querySelector<HTMLTableElement>('.hours-connect-table');if(!table)return;const head=table.querySelector('thead tr');if(head&&!head.querySelector('.hours-audit-actions-head')){const th=document.createElement('th');th.className='hours-audit-actions-head';th.textContent='Ações';head.appendChild(th)}const rows=Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody>tr[data-hour-entry-id]'));rows.forEach((row)=>{let td=row.querySelector<HTMLTableCellElement>('.hours-audit-actions');if(!td){td=document.createElement('td');td.className='hours-audit-actions';row.appendChild(td)}const entry=entriesById.get(row.dataset.hourEntryId||'');if(!entry){if(td.dataset.entryId){td.innerHTML='';delete td.dataset.entryId}return;}if(td.dataset.entryId!==entry.id){td.dataset.entryId=entry.id;td.innerHTML=`<button type="button" class="hours-audit-action" data-hour-action="edit" data-entry-id="${entry.id}" title="Editar lançamento" aria-label="Editar lançamento">${pencilSvg}</button><button type="button" class="hours-audit-action danger" data-hour-action="delete" data-entry-id="${entry.id}" title="Excluir lançamento" aria-label="Excluir lançamento">${trashSvg}</button>`;}});table.querySelectorAll<HTMLTableCellElement>('tr.hours-connect-detail td[colspan]').forEach(td=>{if(td.colSpan!==9)td.colSpan=9});const extractHead=document.querySelector<HTMLElement>('.hours-v13-extract-head');if(extractHead&&!extractHead.querySelector('[data-hours-audit-open]')){const button=document.createElement('button');button.type='button';button.className='secondary hours-audit-open';button.dataset.hoursAuditOpen='1';button.textContent='Auditoria';extractHead.appendChild(button)}};apply();const observer=new MutationObserver(()=>window.requestAnimationFrame(apply));observer.observe(document.body,{childList:true,subtree:true});const click=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;if(target?.closest('[data-hours-audit-open]')){event.preventDefault();event.stopPropagation();setAuditOpen(true);return;}const button=target?.closest<HTMLButtonElement>('[data-hour-action]');if(!button)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const entry=entriesById.get(button.dataset.entryId||'');if(!entry)return;const kind=button.dataset.hourAction as 'edit'|'delete';setReason('');setError('');setHourAction({kind,entry});setEditDraft({workDate:entry.workDate,minutes:String(entry.minutes),description:entry.description,category:entry.category,clientVisible:entry.clientVisible});};document.addEventListener('click',click,true);return()=>{observer.disconnect();document.removeEventListener('click',click,true)};},[role,location.pathname,hourEntries]);

 const auditView=useMemo(()=>auditRows.map(row=>({row,snap:snapshot(row)})),[auditRows]);
 function confirmProject(){if(!projectAction)return;const button=projectAction.button;button.dataset.caliSafetyConfirmed='1';setProjectAction(null);window.setTimeout(()=>button.click(),0)}
 async function saveHourAction() {
   if (!hourAction || !hoursAvailable || busy) return;
   const explanation = reason.trim();
   if (explanation.length < 3) {
     setError('Informe a justificativa.');
     return;
   }
   setBusy(true);
   setError('');
   try {
     if (hourAction.kind === 'delete') {
       const result = await deleteAuditedHourEntry(hourAction.entry.id, explanation);
       if (result.error) throw result.error;
     } else {
       const minutes = Math.round(Number(editDraft.minutes));
       if (!minutes || minutes < 1) {
         setError('Informe uma duração válida.');
         return;
       }
       const result = await editAuditedHourEntry({
         id: hourAction.entry.id,
         workDate: editDraft.workDate,
         minutes,
         description: editDraft.description.trim(),
         category: editDraft.category,
         clientVisible: editDraft.clientVisible,
       }, explanation);
       if (result.error) throw result.error;
     }
     setHourAction(null);
     setReason('');
     await loadHours();
     window.setTimeout(() => window.location.reload(), 120);
   } catch (error) {
     setError(error instanceof Error ? error.message : 'Não foi possível concluir a alteração.');
   } finally {
     setBusy(false);
   }
 }
 if(role!=='admin')return null;
 return <><style>{styles}</style>
 {projectAction&&<DialogFrame aria-label="Confirmar envio" className="operational-safety-overlay" as="div"><section className="operational-safety-card"><header className="operational-safety-head"><div><ShieldAlert size={21}/></div><div><h2>{projectAction.kind==='project'?'Enviar cronograma ao cliente?':'Enviar entregável para validação?'}</h2><p>{projectAction.kind==='project'?'Esta ação altera o projeto para “Aguardando cliente”.':'Esta ação altera o entregável de “Em andamento” para “Aguardando cliente” e registra a mudança no histórico.'}</p></div><button className="operational-safety-close" onClick={()=>setProjectAction(null)}><X size={19}/></button></header><div className="operational-safety-body"><div className="operational-safety-note"><AlertTriangle size={15}/> Este comando <strong>não dispara e-mail nem anexa arquivo automaticamente</strong>. Ele apenas muda a etapa/status dentro do Workspace. Confirme somente se é isso que você deseja fazer agora.</div></div><footer className="operational-safety-foot"><Button variant="secondary" onClick={()=>setProjectAction(null)}>Cancelar</Button><Button variant="primary" onClick={confirmProject}>Sim, enviar para validação</Button></footer></section></DialogFrame>}
 {hourAction&&<DialogFrame aria-label="Confirmar alteração de horas" className="operational-safety-overlay" as="div"><section className="operational-safety-card"><header className="operational-safety-head"><div>{hourAction.kind==='delete'?<Trash2 size={21}/>:<Pencil size={21}/>}</div><div><h2>{hourAction.kind==='delete'?'Excluir lançamento de horas':'Editar lançamento de horas'}</h2><p>{hourAction.kind==='delete'?'O lançamento sairá do extrato, mas ficará preservado integralmente na Auditoria.':'A versão anterior e a nova versão ficarão registradas na Auditoria.'}</p></div><button className="operational-safety-close" onClick={()=>setHourAction(null)}><X size={19}/></button></header><div className="operational-safety-body">{hourAction.kind==='edit'&&<><div className="operational-safety-grid"><label>Data<input type="date" value={editDraft.workDate} onChange={e=>setEditDraft(c=>({...c,workDate:e.target.value}))}/></label><label>Duração (minutos)<input type="number" min="1" max="1440" value={editDraft.minutes} onChange={e=>setEditDraft(c=>({...c,minutes:e.target.value}))}/></label></div><label>Descrição<textarea value={editDraft.description} onChange={e=>setEditDraft(c=>({...c,description:e.target.value}))}/></label><label>Natureza<select value={editDraft.category} onChange={e=>setEditDraft(c=>({...c,category:e.target.value}))}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label className="operational-safety-check"><input type="checkbox" checked={editDraft.clientVisible} onChange={e=>setEditDraft(c=>({...c,clientVisible:e.target.checked}))}/>Compartilhável no extrato do cliente</label></>}<label>{hourAction.kind==='delete'?'Por que você está excluindo?':'Justificativa da edição'}<textarea autoFocus value={reason} onChange={e=>setReason(e.target.value)} placeholder={hourAction.kind==='delete'?'Ex.: teste de timer':'Explique o motivo da correção'}/></label>{error&&<div className="operational-safety-note">{error}</div>}</div><footer className="operational-safety-foot"><Button variant="secondary" onClick={()=>setHourAction(null)}>Cancelar</Button><button className={hourAction.kind==='delete'?'danger':'primary'} disabled={busy||reason.trim().length<3} onClick={()=>void saveHourAction()}>{busy?'Salvando…':hourAction.kind==='delete'?'Excluir e registrar':'Salvar correção'}</button></footer></section></DialogFrame>}
 {auditOpen&&<DialogFrame aria-label="Auditoria de horas" className="operational-safety-overlay" as="div"><section className="operational-safety-card"><header className="operational-safety-head"><div><History size={21}/></div><div><h2>Auditoria de horas</h2><p>Edições e exclusões ficam preservadas com justificativa, usuário e data/hora.</p></div><button className="operational-safety-close" onClick={()=>setAuditOpen(false)}><X size={19}/></button></header><div className="operational-safety-body"><div className="operational-audit-list">{auditView.length===0?<p>Nenhuma edição ou exclusão registrada.</p>:auditView.map(({row,snap})=><article className="operational-audit-row" key={row.id}><header><strong>{row.event_type==='hours_entry_deleted'?'Lançamento excluído':'Lançamento editado'}</strong><small>{new Date(row.created_at).toLocaleString('pt-BR')}</small></header><p>{snap?.description||'Lançamento de horas'} · {formatMinutes(snap?.minutes)}</p><em>Justificativa: {row.metadata?.reason||'—'}</em></article>)}</div></div><footer className="operational-safety-foot"><Button variant="primary" onClick={()=>setAuditOpen(false)}>Fechar</Button></footer></section></DialogFrame>}
 </>;
}
