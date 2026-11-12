import { openPrivateWorkspaceFile } from '../../api/files/workspace';
import { appendWithMentions } from '../../lib/mentionText';
import { isSupabaseConfigured } from '../../api/access/session';
import {
  postAdminDeliverableComment, postClientDeliverableComment, readDeliverableConversation,
  readDeliverableConversationIdentities, readDeliverableConversationIdentity, readProjectViewerId,
  removeDeliverableAttachment, subscribeDeliverableConversation, uploadDeliverableAttachment,
} from '../../api/projects/conversation';
import { askWorkspaceLink, workspaceChatAlert } from '../../lib/workspaceChatDialogs';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';

type Role='admin'|'client';
type Identity={id?:string|null;full_name:string;role?:string|null;avatar_url?:string|null;avatar_position_x?:number|null;avatar_position_y?:number|null;avatar_zoom?:number|null};
type Message={id:string;company_id:string;target_id:string;author_user_id?:string|null;body:string;client_visible:boolean;source_actor?:'admin'|'client'|'system'|null;created_at:string};
type FileToken={name:string;path:string;mime:string;size:number};
type Context={id:string;company_id:string;project_id?:string|null;protocol?:string|null};

let installed=false,busy=false,timer=0,activeId='';
let unsubscribeConversation: (() => void) | null = null;
let pending:FileToken[]=[];
const seenComments=new Map<string,Set<string>>();
const emojiList=['🙂','😊','👍','🙏','✨','✅','💡','📌','📎','❤️','👏','🤝'];
const tokenRx=/\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;

function role():Role|null{if(location.pathname.startsWith('/admin/projetos'))return'admin';if(location.pathname.startsWith('/cliente/entregaveis'))return'client';return null;}
function initials(v:string){return v.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('')||'C';}
function when(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d).replace('.','');}
function safe(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,90)||'arquivo';}
function setValue(el:HTMLTextAreaElement,v:string){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;setter?.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();}
async function media(raw?:string|null){return resolveWorkspaceMedia(raw);}
async function hydrate(v:Identity):Promise<Identity>{return{...v,avatar_url:await media(v.avatar_url)};}
function avatar(v:Identity){const el=document.createElement('span');el.className='workspace-chat-avatar';if(v.avatar_url){const x=Number(v.avatar_position_x??50),y=Number(v.avatar_position_y??50),z=Math.max(1,Number(v.avatar_zoom??1));el.classList.add('profile-canonical-v47');el.style.setProperty('--profile-image',`url("${v.avatar_url.replace(/"/g,'\\\"')}")`);el.style.setProperty('--profile-position',`${x}% ${y}%`);el.style.setProperty('--profile-zoom',String(z));}else el.textContent=initials(v.full_name);el.title=v.full_name;return el;}
function parseBody(body:string){const files:FileToken[]=[];const clean=body.replace(tokenRx,(_m,n,p,t,s)=>{try{files.push({name:decodeURIComponent(n),path:decodeURIComponent(p),mime:decodeURIComponent(t),size:Number(s||0)});}catch{files.push({name:n,path:p,mime:t,size:Number(s||0)});}return'';}).trim();return{clean,files};}
function linkify(el:HTMLElement,text:string){text.split(/(https?:\/\/[^\s]+)/g).forEach(part=>{if(/^https?:\/\//i.test(part)){const a=document.createElement('a');a.href=part;a.target='_blank';a.rel='noopener noreferrer';a.textContent=part;el.append(a);}else if(part)appendWithMentions(el,part);});}
async function openFile(f: FileToken) {
  try {
    await openPrivateWorkspaceFile(f.path, f.name);
  } catch {
    workspaceChatAlert('Não foi possível abrir este anexo agora.');
  }
}

async function identitySet(role: Role, companyId: string) {
  const map = new Map<string, Identity>();
  let admin: Identity = { full_name: 'Patrícia Lima' };
  let client: Identity = { full_name: 'Cliente' };
  const people = await readDeliverableConversationIdentities(role, companyId);
  const [viewer, staff, clients, contact] = await Promise.all([
    people.viewer ? hydrate(people.viewer as Identity) : null,
    Promise.all((people.staff as Identity[]).map(hydrate)),
    Promise.all((people.clients as Identity[]).map(hydrate)),
    people.contact ? hydrate(people.contact as Identity) : null,
  ]);
  if (viewer?.id) map.set(viewer.id, viewer);
  for (const person of staff) if (person.id && !map.has(person.id)) map.set(person.id, person);
  if (role === 'admin' || viewer?.role === 'admin') {
    if (viewer) admin = viewer;
    for (const person of clients) {
      if (person.id) map.set(person.id, person);
      if (client.full_name === 'Cliente') client = person;
    }
  }
  if (role === 'client' && viewer?.role === 'client') {
    client = viewer;
    if (contact) admin = contact;
  }
  return { map, admin, client };
}
function who(m:Message,ids:Awaited<ReturnType<typeof identitySet>>){if(m.author_user_id&&ids.map.has(m.author_user_id))return ids.map.get(m.author_user_id)!;if(m.source_actor==='client')return ids.client;if(m.source_actor==='system')return{full_name:'CALI Workspace'};return ids.admin;}
function visibleChannel(r:Role){if(r==='client')return true;const b=document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) .conversation-channels-v2 button.active");return!b||/cliente/i.test(b.textContent||'');}


async function render(context:Context,r:Role){if(!isSupabaseConfigured)return;const list=document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) :is(.conversation-list-v2,[data-v2-operation~=\"conversation-list-v2\"])");if(!list)return;const visible=visibleChannel(r);const[comments,ids]=await Promise.all([readDeliverableConversation(context.id, visible),identitySet(r,context.company_id)]);if(comments.error||!list.isConnected||context.id!==activeId)return;const messages=(comments.data||[])as Message[];const signature=`${visible}:${messages.map(m=>`${m.id}:${m.body}:${m.created_at}`).join('|')}`;if(list.dataset.workspaceChatSignature===signature&&list.querySelector('.workspace-chat-line,.workspace-chat-empty'))return;list.dataset.workspaceChatSignature=signature;list.classList.add('workspace-chat-list');list.replaceChildren();if(!messages.length){const empty=document.createElement('div');empty.className='workspace-chat-empty';empty.textContent=visible?'A conversa começa aqui.':'Nenhuma nota interna neste entregável.';list.append(empty);return;}
  const channelKey=`${context.id}:${visible?'client':'internal'}`,known=seenComments.get(channelKey),nextKnown=new Set(messages.map(m=>m.id));
  messages.forEach(m=>{const id=who(m,ids),actor=m.source_actor||'admin',mine=actor===r,line=document.createElement('div');line.className=`workspace-chat-line role-${actor} ${mine?'mine':'other'} ${visible?'':'internal'} ${known&&!known.has(m.id)?'is-arriving':''}`;line.dataset.commentId=m.id;const bubble=document.createElement('div');bubble.className='workspace-chat-bubble';const head=document.createElement('div');head.className='workspace-chat-head';const name=document.createElement('strong');name.textContent=visible?id.full_name:`${id.full_name} · nota interna`;const time=document.createElement('time');time.textContent=when(m.created_at);head.append(name,time);bubble.append(head);const parsed=parseBody(m.body);if(parsed.clean){const p=document.createElement('p');linkify(p,parsed.clean);bubble.append(p);}if(parsed.files.length){const files=document.createElement('div');files.className='workspace-chat-attachments';parsed.files.forEach(f=>{const b=document.createElement('button');b.type='button';b.className='workspace-chat-attachment';const icon=document.createElement('span');icon.textContent='📎';const copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=f.name;small.textContent=f.size?`${Math.max(1,Math.round(f.size/1024))} KB`:'arquivo';copy.append(strong,small);b.append(icon,copy);b.onclick=()=>void openFile(f);files.append(b);});bubble.append(files);}if(mine)line.append(bubble,avatar(id));else line.append(avatar(id),bubble);list.append(line);});seenComments.set(channelKey,nextKnown);requestAnimationFrame(()=>{list.scrollTo({top:list.scrollHeight,behavior:known?'smooth':'auto'});});}

function tray(compose:HTMLElement){const host=compose.querySelector<HTMLElement>('.workspace-chat-runtime-pending-host');let t=(host||compose).querySelector<HTMLElement>('.workspace-chat-pending');if(!t){t=document.createElement('div');t.className='workspace-chat-pending';(host||compose).append(t);}t.replaceChildren();pending.forEach((f,i)=>{const chip=document.createElement('span');chip.className='workspace-chat-pending-chip';const text=document.createElement('span');text.textContent=`📎 ${f.name}`;const x=document.createElement('button');x.type='button';x.textContent='×';x.onclick=async()=>{pending.splice(i,1);await removeDeliverableAttachment(f.path);tray(compose);};chip.append(text,x);t!.append(chip);});t.style.display=pending.length?'flex':'none';}
async function upload(file:File,context:Context,compose:HTMLElement){if(!isSupabaseConfigured)return;const allowed=new Set(['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);if(!allowed.has(file.type)){workspaceChatAlert('Use PDF, imagem, Word, Excel ou PowerPoint.');return;}if(file.size>10*1024*1024){workspaceChatAlert('Cada anexo pode ter até 10 MB.');return;}if(pending.length>=5){workspaceChatAlert('Você pode enviar até 5 anexos por mensagem.');return;}const uid=await readProjectViewerId();if(!uid)return;const path=`deliverable-chat/${context.company_id}/${context.id}/${uid}/${Date.now()}-${safe(file.name)}`;const{error}=await uploadDeliverableAttachment(path,file,file.type);if(error){workspaceChatAlert(`Não consegui anexar “${file.name}”.`);return;}pending.push({name:file.name,path,mime:file.type,size:file.size});tray(compose);}
async function send(context:Context,r:Role,textarea:HTMLTextAreaElement,button:HTMLButtonElement,compose:HTMLElement){if(!isSupabaseConfigured)return;const text=textarea.value.trim();if(!text&&!pending.length)return;const tokens=pending.map(f=>`[[arquivo|${encodeURIComponent(f.name)}|${encodeURIComponent(f.path)}|${encodeURIComponent(f.mime)}|${f.size}]]`).join('\n');const body=[text,tokens].filter(Boolean).join('\n');button.disabled=true;try{if(r==='client'){const res=await postClientDeliverableComment(context.id,body);if(res.error)throw res.error;}else{const userId=await readProjectViewerId();const res=await postAdminDeliverableComment(context.company_id, context.id, userId || null, body, visibleChannel(r), 'admin');if(res.error)throw res.error;}pending=[];setValue(textarea,'');tray(compose);setTimeout(schedule,70);}catch(e){workspaceChatAlert(e instanceof Error?e.message:'Não foi possível enviar a mensagem.');}finally{button.disabled=false;}}
function composer(context:Context,r:Role){const pane=document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) :is(.conversation-pane-v2,[data-v2-operation~=\"conversation-pane-v2\"])"),compose=pane?.querySelector<HTMLElement>(":is(.conversation-composer-v2,[data-v2-operation~=\"conversation-composer-v2\"])"),textarea=compose?.querySelector<HTMLTextAreaElement>('textarea'),sendButton=compose?.querySelector<HTMLButtonElement>('button.primary');if(!compose||!textarea||!sendButton)return;compose.classList.add('workspace-chat-compose');if(!compose.querySelector('.workspace-chat-tools')){const tools=document.createElement('div');tools.className='workspace-chat-tools';const attach=document.createElement('button');attach.type='button';attach.textContent='📎';attach.title='Anexar arquivo';const input=document.createElement('input');input.type='file';input.multiple=true;input.hidden=true;input.accept='.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';attach.onclick=()=>input.click();input.onchange=async()=>{for(const f of Array.from(input.files||[]))await upload(f,context,compose);input.value='';};const link=document.createElement('button');link.type='button';link.textContent='🔗';link.title='Inserir link';link.onclick=async()=>{const url=await askWorkspaceLink();if(!url)return;setValue(textarea,`${textarea.value}${textarea.value?' ':''}${url}`);};const emoji=document.createElement('button');emoji.type='button';emoji.textContent='😊';emoji.title='Emojis';const picker=document.createElement('div');picker.className='workspace-chat-emoji-picker';picker.hidden=true;emojiList.forEach(e=>{const b=document.createElement('button');b.type='button';b.textContent=e;b.onclick=()=>{setValue(textarea,`${textarea.value}${e}`);picker.hidden=true;};picker.append(b);});emoji.onclick=()=>picker.hidden=!picker.hidden;tools.append(attach,input,link,emoji,picker);const host=compose.querySelector<HTMLElement>('.workspace-chat-runtime-tools-host');if(host)host.append(tools);else compose.insertBefore(tools,textarea);tray(compose);if(r==='admin')compose.querySelectorAll<HTMLButtonElement>('.secondary').forEach(b=>{if(/anexar/i.test(b.textContent||''))b.style.display='none';});}
  compose.querySelectorAll<HTMLButtonElement>('.conversation-channels-v2 button').forEach(button=>{if(button.dataset.workspaceChannelBound)return;button.dataset.workspaceChannelBound='1';button.addEventListener('click',()=>window.setTimeout(schedule,0));});
  if(!sendButton.dataset.workspaceChatBound){sendButton.dataset.workspaceChatBound='1';sendButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void send(context,r,textarea,sendButton,compose);},true);textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void send(context,r,textarea,sendButton,compose);}},true);}}

function stopWatchingConversation() {
  unsubscribeConversation?.();
  unsubscribeConversation = null;
  activeId = '';
  pending = [];
}

function watchConversation(context: Context) {
  if (context.id === activeId && unsubscribeConversation) return;
  stopWatchingConversation();
  activeId = context.id;
  unsubscribeConversation = subscribeDeliverableConversation(context.id, () => {
    window.dispatchEvent(new CustomEvent('cali:workspace-chime'));
    setTimeout(schedule, 70);
  });
}
async function enhance(){if(busy||!isSupabaseConfigured)return;const r=role();if(!r){stopWatchingConversation();return;}const modal=document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"])");if(!modal){stopWatchingConversation();return;}if(r==='client')modal.querySelector<HTMLElement>(":is(.deliverable-workspace-header-v2,[data-v2-operation~=\"deliverable-workspace-header-v2\"]) .status-chip-v3")?.remove();const protocol=modal.querySelector<HTMLElement>(":is(.deliverable-title-v2,[data-v2-operation~=\"deliverable-title-v2\"]) .section-kicker")?.textContent?.trim()||'';if(!protocol.startsWith('CALI-DEL-'))return;busy=true;try{const context=await readDeliverableConversationIdentity(protocol) as Context|null;if(!context?.id||!context.company_id||!modal.isConnected)return;watchConversation(context);const pane=modal.querySelector<HTMLElement>(":is(.conversation-pane-v2,[data-v2-operation~=\"conversation-pane-v2\"])");if(pane){pane.classList.add('workspace-chat-standard');await render(context,r);if(modal.isConnected)composer(context,r);}}finally{busy=false;}}
function schedule(){clearTimeout(timer);timer=window.setTimeout(()=>void enhance(),65);}
export function installDeliverableChatStandardRuntime(){if(installed||typeof window==='undefined')return;installed=true;schedule();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('cali-route-change',schedule);window.addEventListener('focus',schedule);window.addEventListener('popstate',schedule);}
