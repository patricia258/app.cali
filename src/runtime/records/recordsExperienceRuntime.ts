import { openPrivateWorkspaceFile } from '../../api/files/workspace';
import { appendWithMentions } from '../../lib/mentionText';
import { readRecordViewerId, recordsAvailable } from '../../api/records/client';
import {
  listRecordMessages, postRecordMessage, readConversationIdentities, removeRecordAttachment,
  subscribeRecordMessages, uploadRecordAttachment,
  type ConversationIdentity as Identity, type ConversationMessageRow as Msg,
} from '../../api/records/conversation';
import { readRecordIdentity } from '../../api/records/workspace';
import { askWorkspaceLink, workspaceChatAlert } from '../../lib/workspaceChatDialogs';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';

type Role = 'admin' | 'client';
type FileToken = { name:string; path:string; mime:string; size:number };

let installed=false, busy=false, debounce=0, activeRecord='';
let observer:MutationObserver|null=null;
let unsubscribeMessages: (() => void) | null = null;
let pending:FileToken[]=[];
const emojis=['🙂','😊','👍','🙏','✨','✅','💡','📌','📎','❤️','👏','🤝'];
const fileToken=/\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const seenRecordMessages=new Map<string,Set<string>>();

function role():Role|null{if(location.pathname.startsWith('/admin/registros'))return'admin';if(location.pathname.startsWith('/cliente/registros'))return'client';return null;}
function initials(v:string){return v.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('')||'C';}
function when(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d).replace('.','');}
function safe(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,90)||'arquivo';}
function setValue(el:HTMLTextAreaElement,v:string){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;setter?.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();}
async function resolvePrivateMedia(raw?:string|null){return resolveWorkspaceMedia(raw);}
async function hydrateIdentity(value:Identity):Promise<Identity>{return{...value,avatar_url:await resolvePrivateMedia(value.avatar_url)};}
function avatar(identity:Identity){const a=document.createElement('span');a.className='records-chat-avatar';if(identity.avatar_url){const x=Number(identity.avatar_position_x??50),y=Number(identity.avatar_position_y??50),zoom=Math.max(1,Number(identity.avatar_zoom??1));a.style.backgroundImage=`url("${identity.avatar_url.replace(/"/g,'\\"')}")`;a.style.backgroundRepeat='no-repeat';a.style.backgroundPosition=`${x}% ${y}%`;a.style.backgroundSize=`${zoom*100}%`;a.dataset.identitySrc=identity.avatar_url;}else a.textContent=initials(identity.full_name);return a;}
function parseBody(body:string){const files:FileToken[]=[];const clean=body.replace(fileToken,(_m,n,p,t,s)=>{try{files.push({name:decodeURIComponent(n),path:decodeURIComponent(p),mime:decodeURIComponent(t),size:Number(s||0)});}catch{files.push({name:n,path:p,mime:t,size:Number(s||0)});}return'';}).trim();return{clean,files};}
function linkify(parent:HTMLElement,text:string){text.split(/(https?:\/\/[^\s]+)/g).forEach(part=>{if(/^https?:\/\//i.test(part)){const a=document.createElement('a');a.href=part;a.target='_blank';a.rel='noopener noreferrer';a.textContent=part;parent.append(a);}else if(part)appendWithMentions(parent,part);});}
async function openFile(file: FileToken) {
  try {
    await openPrivateWorkspaceFile(file.path, file.name);
  } catch {
    workspaceChatAlert('Não foi possível abrir este anexo agora.');
  }
}

async function identities(role: Role, companyId: string) {
  const map = new Map<string, Identity>();
  let admin: Identity = { full_name: 'Patrícia Lima' };
  let client: Identity = { full_name: 'Cliente' };
  const people = await readConversationIdentities(role, companyId);
  const [viewer, participants, staff] = await Promise.all([
    people.viewer ? hydrateIdentity(people.viewer) : null,
    Promise.all(people.participants.map(hydrateIdentity)),
    Promise.all(people.staff.map(hydrateIdentity)),
  ]);
  if (viewer?.id) map.set(viewer.id, viewer);
  if (role === 'admin') {
    admin = viewer ?? admin;
    client = participants[0] ?? client;
    for (const participant of participants) if (participant.id) map.set(participant.id, participant);
  } else {
    client = viewer ?? client;
    admin = participants[0] ?? admin;
  }
  for (const person of staff) if (person.id && !map.has(person.id)) map.set(person.id, person);
  return { map, admin, client };
}
function who(m:Msg,ids:Awaited<ReturnType<typeof identities>>){if(m.author_id&&ids.map.has(m.author_id))return ids.map.get(m.author_id)!;if(m.author_role==='admin')return ids.admin;if(m.author_role==='client')return ids.client;return{full_name:'CALI RH'};}
function pinLatest(history:HTMLElement){window.requestAnimationFrame(()=>{if(document.body.contains(history))history.scrollTop=history.scrollHeight;});window.setTimeout(()=>{if(document.body.contains(history))history.scrollTop=history.scrollHeight;},190);}

async function renderMessages(recordId:string,companyId:string,r:Role){if(!recordsAvailable)return;const history=document.querySelector<HTMLElement>(":is(.records-v13-drawer,[data-v2-operation~=\"records-v13-drawer\"]) :is(.conversation-history,[data-v2-operation~=\"conversation-history\"])");if(!history)return;const[result,ids]=await Promise.all([listRecordMessages(recordId),identities(r,companyId)]);if(result.error||!history.isConnected||recordId!==activeRecord)return;const messages=result.data??[];const signature=JSON.stringify(messages.map(m=>[m.id,m.body,m.created_at,m.edited_at]));if(history.dataset.recordsSignature===signature&&history.querySelector('.records-chat-line,.records-chat-empty')){pinLatest(history);return;}history.dataset.recordsSignature=signature;history.replaceChildren();if(!messages.length){const e=document.createElement('div');e.className='records-chat-empty';e.textContent='A conversa começa aqui.';history.append(e);return;}
  const known=seenRecordMessages.get(recordId),nextKnown=new Set(messages.map(m=>m.id));
  messages.forEach(m=>{const id=who(m,ids),mine=m.author_role===r,line=document.createElement('div');line.className=`conversation-line records-chat-line role-${m.author_role} ${mine?'mine':'other'} ${m.visibility==='internal'?'internal':''} ${known&&!known.has(m.id)?'is-arriving':''}`;line.dataset.messageCreatedAt=m.created_at;const bubble=document.createElement('div');bubble.className='conversation-bubble records-chat-bubble';const head=document.createElement('div');head.className='records-chat-head';const name=document.createElement('strong');name.textContent=m.visibility==='internal'?`${id.full_name} · nota interna`:id.full_name;const time=document.createElement('time');time.textContent=when(m.created_at);head.append(name,time);bubble.append(head);const parsed=parseBody(m.body);if(parsed.clean){const p=document.createElement('p');linkify(p,parsed.clean);bubble.append(p);}if(parsed.files.length){const list=document.createElement('div');list.className='records-chat-attachments';parsed.files.forEach(f=>{const b=document.createElement('button');b.type='button';b.className='records-chat-attachment';const icon=document.createElement('span');icon.textContent='📎';const copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=f.name;small.textContent=f.size?`${Math.max(1,Math.round(f.size/1024))} KB`:'arquivo';copy.append(strong,small);b.append(icon,copy);b.onclick=()=>void openFile(f);list.append(b);});bubble.append(list);}if(mine)line.append(bubble,avatar(id));else line.append(avatar(id),bubble);history.append(line);});seenRecordMessages.set(recordId,nextKnown);if(known)window.requestAnimationFrame(()=>history.scrollTo({top:history.scrollHeight,behavior:'smooth'}));else pinLatest(history);
}

function pendingTray(compose:HTMLElement){const host=compose.querySelector<HTMLElement>('.records-chat-runtime-pending-host');let tray=(host||compose).querySelector<HTMLElement>('.records-chat-pending');if(!tray){tray=document.createElement('div');tray.className='records-chat-pending';(host||compose).append(tray);}const sig=pending.map(x=>x.path).join('|');if(tray.dataset.sig===sig)return;tray.dataset.sig=sig;tray.replaceChildren();pending.forEach((f,i)=>{const chip=document.createElement('span');chip.className='records-chat-pending-chip';const text=document.createElement('span');text.textContent=`📎 ${f.name}`;const x=document.createElement('button');x.type='button';x.textContent='×';x.onclick=async()=>{pending.splice(i,1);await removeRecordAttachment(f.path);pendingTray(compose);};chip.append(text,x);tray!.append(chip);});tray.style.display=pending.length?'flex':'none';}
async function upload(file:File,recordId:string,companyId:string,compose:HTMLElement){if(!recordsAvailable)return;const allowed=new Set(['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);if(!allowed.has(file.type)){workspaceChatAlert('Use PDF, imagem, Word, Excel ou PowerPoint.');return;}if(file.size>10*1024*1024){workspaceChatAlert('Cada anexo pode ter até 10 MB.');return;}if(pending.length>=5){workspaceChatAlert('Você pode enviar até 5 anexos por mensagem.');return;}const uid=await readRecordViewerId();if(!uid)return;const path=`records/${companyId}/${recordId}/${uid}/${Date.now()}-${safe(file.name)}`;const{error}=await uploadRecordAttachment(path,file);if(error){workspaceChatAlert(`Não consegui anexar “${file.name}”.`);return;}pending.push({name:file.name,path,mime:file.type,size:file.size});pendingTray(compose);}
async function send(recordId:string,textarea:HTMLTextAreaElement,button:HTMLButtonElement,compose:HTMLElement){if(!recordsAvailable)return;const text=textarea.value.trim();if(!text&&!pending.length)return;const tokens=pending.map(f=>`[[arquivo|${encodeURIComponent(f.name)}|${encodeURIComponent(f.path)}|${encodeURIComponent(f.mime)}|${f.size}]]`).join('\n');button.disabled=true;try{const res=await postRecordMessage(recordId,[text,tokens].filter(Boolean).join('\n'));if(res.error)throw res.error;pending=[];setValue(textarea,'');pendingTray(compose);window.setTimeout(()=>void enhance(true),80);}catch(e){workspaceChatAlert(e instanceof Error?e.message:'Não foi possível enviar a mensagem.');}finally{button.disabled=false;}}
function composer(recordId:string,companyId:string){const compose=document.querySelector<HTMLElement>(":is(.records-v13-drawer,[data-v2-operation~=\"records-v13-drawer\"]) :is(.conversation-compose,[data-v2-operation~=\"conversation-compose\"])"),textarea=compose?.querySelector<HTMLTextAreaElement>('textarea'),sendBtn=compose?.querySelector<HTMLButtonElement>('button.primary');if(!compose||!textarea||!sendBtn)return;if(!compose.querySelector('.records-chat-tools')){const tools=document.createElement('div');tools.className='records-chat-tools';const attach=document.createElement('button');attach.type='button';attach.textContent='📎';attach.title='Anexar arquivo';attach.setAttribute('aria-label','Anexar arquivo');const input=document.createElement('input');input.type='file';input.multiple=true;input.hidden=true;input.accept='.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';attach.onclick=()=>input.click();input.onchange=async()=>{for(const f of Array.from(input.files||[]))await upload(f,recordId,companyId,compose);input.value='';};const link=document.createElement('button');link.type='button';link.textContent='🔗';link.title='Inserir link';link.setAttribute('aria-label','Inserir link');link.onclick=async()=>{const url=await askWorkspaceLink();if(!url)return;setValue(textarea,`${textarea.value}${textarea.value?' ':''}${url}`);};const emoji=document.createElement('button');emoji.type='button';emoji.textContent='😊';emoji.title='Emojis';emoji.setAttribute('aria-label','Abrir emojis');const picker=document.createElement('div');picker.className='records-chat-emoji-picker';picker.hidden=true;emojis.forEach(e=>{const b=document.createElement('button');b.type='button';b.textContent=e;b.onclick=()=>{setValue(textarea,`${textarea.value}${e}`);picker.hidden=true;};picker.append(b);});emoji.onclick=()=>picker.hidden=!picker.hidden;tools.append(attach,input,link,emoji,picker);const host=compose.querySelector<HTMLElement>('.records-chat-runtime-tools-host');if(host)host.append(tools);else compose.insertBefore(tools,textarea);pendingTray(compose);}if(!sendBtn.dataset.richRecordsBound){sendBtn.dataset.richRecordsBound='1';sendBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void send(recordId,textarea,sendBtn,compose);},true);textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void send(recordId,textarea,sendBtn,compose);}},true);}}
function stopWatchingMessages() {
  unsubscribeMessages?.();
  unsubscribeMessages = null;
  activeRecord = '';
  pending = [];
}

function watchMessages(recordId: string) {
  if (recordId === activeRecord && unsubscribeMessages) return;
  stopWatchingMessages();
  activeRecord = recordId;
  unsubscribeMessages = subscribeRecordMessages(recordId, 'INSERT', () => {
    window.dispatchEvent(new CustomEvent('cali:workspace-chime'));
    window.setTimeout(() => void enhance(true), 80);
  });
}

async function enhance(force = false) {
  if (busy || !recordsAvailable) return;
  const currentRole = role();
  const drawer = document.querySelector<HTMLElement>(":is(.records-v13-drawer,[data-v2-operation~='records-v13-drawer'])");
  const protocol = drawer?.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
  if (!currentRole || !drawer || !protocol.startsWith('CALI-REG-')) {
    stopWatchingMessages();
    return;
  }
  if (!force && drawer.dataset.recordsRich === protocol) return;
  busy = true;
  try {
    const { data: record } = await readRecordIdentity(protocol);
    if (!record?.id || !record.company_id || !drawer.isConnected || role() !== currentRole) return;
    watchMessages(record.id);
    await renderMessages(record.id, record.company_id, currentRole);
    if (!drawer.isConnected || role() !== currentRole) return;
    composer(record.id, record.company_id);
    drawer.querySelectorAll<HTMLButtonElement>('.records-v13-drawer-actions button').forEach((button) => {
      const text = button.textContent?.trim();
      if (text === 'Assumir') button.textContent = 'Assumir atendimento';
      if (text === 'Enriquecer memória') button.textContent = 'Salvar na memória da conta';
    });
    drawer.dataset.recordsRich = protocol;
  } finally {
    busy = false;
  }
}
function schedule(){clearTimeout(debounce);debounce=window.setTimeout(()=>void enhance(),75);}
export function installRecordsExperienceRuntime(){if(installed)return;installed=true;const start=()=>{schedule();observer?.disconnect();observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,subtree:true});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();window.addEventListener('cali-route-change',schedule);window.addEventListener('focus',schedule);window.addEventListener('popstate',schedule);}
