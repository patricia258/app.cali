import { supabase } from './supabase';

let installed=false;
let realtimeChannel:any=null;
let observer:MutationObserver|null=null;
let refreshTimer:number|undefined;
let renderInFlight=false;
let lastRenderKey='';

const style=`
.google-calendar-runtime-actions{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.google-calendar-runtime-button{border:1px solid #d9cdc6;background:#fff;color:#5a1e2d;border-radius:12px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap}
.google-calendar-runtime-button.primary{background:#5a1e2d;border-color:#5a1e2d;color:#fff}
.google-calendar-runtime-button:disabled{opacity:.5;cursor:not-allowed}
.google-calendar-runtime-detail{font-size:12px;color:#7f736d;max-width:280px;text-align:right}
[data-workspace-theme='night'] .google-calendar-runtime-button{background:#281d20;border-color:#5b444b;color:#f5dce3}
[data-workspace-theme='night'] .google-calendar-runtime-button.primary{background:#7a2942;border-color:#7a2942;color:#fff}
[data-workspace-theme='night'] .google-calendar-runtime-detail{color:#bdaeb1}
@media(max-width:760px){.google-calendar-runtime-actions{width:100%;justify-content:flex-start}.google-calendar-runtime-detail{text-align:left}}
`;

function ensureStyle(){if(document.getElementById('google-calendar-runtime-style'))return;const el=document.createElement('style');el.id='google-calendar-runtime-style';el.textContent=style;document.head.appendChild(el)}
function isCalendar(){return window.location.pathname==='/admin/calendario'}
function setCopy(copy:HTMLElement|null,text:string){if(copy&&copy.textContent!==text)copy.textContent=text}
function setHost(host:HTMLElement,html:string,key:string){if(lastRenderKey===key&&host.dataset.googleRenderKey===key)return;host.innerHTML=html;host.dataset.googleRenderKey=key;lastRenderKey=key}
async function getOwnConnection(){
  if(!supabase)return null;
  const{data:userData}=await supabase.auth.getUser();
  const userId=userData.user?.id;if(!userId)return null;
  const{data}=await supabase.from('calendar_connections').select('id,user_id,company_id,account_email,status,sync_enabled,is_primary').eq('user_id',userId).eq('provider','google').is('company_id',null).eq('status','connected').limit(1).maybeSingle();
  return data||null;
}
async function invoke(body:Record<string,unknown>){if(!supabase)throw new Error('Supabase indisponível');const{data,error}=await supabase.functions.invoke('google-calendar-oauth',{body});if(error)throw error;if(data?.error)throw new Error(data.detail||data.error);return data;}

async function renderConnection(){
  if(!isCalendar()||!supabase||renderInFlight)return;
  const strip=document.querySelector<HTMLElement>('.calendar-workspace-strip');if(!strip)return;
  let host=strip.querySelector<HTMLElement>('.google-calendar-runtime-actions');
  if(!host){host=document.createElement('div');host.className='google-calendar-runtime-actions';strip.appendChild(host)}
  if(!host.childElementCount)host.innerHTML='<span class="google-calendar-runtime-detail">Verificando integração...</span>';
  renderInFlight=true;
  try{
    const[config,connection]=await Promise.all([invoke({action:'config'}),getOwnConnection()]);
    const originalStatus=strip.querySelector<HTMLElement>('.calendar-connection-status');if(originalStatus)originalStatus.style.display='none';
    const copy=strip.querySelector<HTMLElement>('div:nth-child(2) p');
    if(!config?.configured){
      setCopy(copy,'A integração está preparada, mas as credenciais Google ainda não estão completas no Supabase.');
      const key=`missing:${Boolean(config?.parts?.clientId)}:${Boolean(config?.parts?.clientSecret)}:${Boolean(config?.parts?.redirectUri)}`;
      setHost(host,`<span class="google-calendar-runtime-detail">Client ID: ${config?.parts?.clientId?'OK':'faltando'} · Secret: ${config?.parts?.clientSecret?'OK':'faltando'} · Redirect: ${config?.parts?.redirectUri?'OK':'faltando'}</span>`,key);
      return;
    }
    if(connection){
      const email=connection.account_email||'Google Calendar';
      setCopy(copy,`Conectado a ${email}. Eventos internos da CALI podem sincronizar com esta conta.`);
      setHost(host,`<span class="google-calendar-runtime-detail">Conectado · ${email}</span><button type="button" class="google-calendar-runtime-button" data-google-calendar-disconnect>Desconectar</button>`,`connected:${email}`);
      return;
    }
    setCopy(copy,'Conecte sua agenda Google. Eventos vinculados a um cliente só sincronizam com a conexão Google daquele cliente — nunca com a sua por fallback.');
    setHost(host,'<button type="button" class="google-calendar-runtime-button primary" data-google-calendar-connect>Conectar Google Calendar</button>','disconnected');
  }catch(error){
    const message=error instanceof Error?error.message:'erro';
    setHost(host,`<span class="google-calendar-runtime-detail">Não foi possível verificar a integração: ${message}</span>`,`error:${message}`);
  }finally{renderInFlight=false}
}

async function connect(){const button=document.querySelector<HTMLButtonElement>('[data-google-calendar-connect]');if(button){button.disabled=true;button.textContent='Abrindo Google...'}try{const data=await invoke({action:'authorize',companyId:null});if(!data?.url)throw new Error('URL de autorização não recebida');window.location.assign(data.url)}catch(error){alert(`Não foi possível iniciar a conexão com o Google Calendar.\n\n${error instanceof Error?error.message:'Erro desconhecido'}`);if(button){button.disabled=false;button.textContent='Conectar Google Calendar'}}}
async function disconnect(){if(!confirm('Desconectar este Google Calendar do CALI Workspace? Os eventos já criados no Google não serão apagados automaticamente.'))return;try{await invoke({action:'disconnect',companyId:null});lastRenderKey='';await renderConnection()}catch(error){alert(`Não foi possível desconectar.\n\n${error instanceof Error?error.message:'Erro desconhecido'}`)}}

function installRealtime(){
  if(!supabase||realtimeChannel||!isCalendar())return;
  realtimeChannel=supabase.channel('cali-google-calendar-sync').on('postgres_changes',{event:'*',schema:'cali_workspace',table:'events'},async(payload:any)=>{
    const row=payload?.new||{};if(!row?.id)return;
    try{
      if(row.cancelled_at&&row.sync_status!=='cancelled_google')await invoke({action:'cancel_event',eventId:row.id});
      else if(!row.cancelled_at&&['pending','error'].includes(String(row.sync_status||'')))await invoke({action:'sync_event',eventId:row.id});
    }catch(error){console.error('Falha ao sincronizar evento com Google Calendar',error)}
  }).subscribe();
}
function uninstallRealtime(){if(realtimeChannel&&supabase){void supabase.removeChannel(realtimeChannel);realtimeChannel=null}}
function refresh(){if(isCalendar()){ensureStyle();void renderConnection();installRealtime()}else{lastRenderKey='';uninstallRealtime()}}

export function installGoogleCalendarRuntime(){
  if(installed)return;installed=true;ensureStyle();
  document.addEventListener('click',(event)=>{const target=event.target as HTMLElement|null;if(target?.closest('[data-google-calendar-connect]')){event.preventDefault();void connect()}if(target?.closest('[data-google-calendar-disconnect]')){event.preventDefault();void disconnect()}},true);
  observer=new MutationObserver((mutations)=>{
    const onlyRuntimeChanges=mutations.every((mutation)=>{
      const target=mutation.target instanceof Element?mutation.target:mutation.target.parentElement;
      return Boolean(target?.closest('.google-calendar-runtime-actions'));
    });
    if(onlyRuntimeChanges)return;
    if(refreshTimer)window.clearTimeout(refreshTimer);
    refreshTimer=window.setTimeout(refresh,180);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',refresh);window.setInterval(refresh,5000);refresh();
}
