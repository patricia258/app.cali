import { supabase } from './supabase';

let installed=false;
let realtimeChannel:any=null;
let observer:MutationObserver|null=null;
let refreshTimer:number|undefined;

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
async function getOwnConnection(){
  if(!supabase)return null;
  const{data:userData}=await supabase.auth.getUser();
  const userId=userData.user?.id;if(!userId)return null;
  const{data}=await supabase.from('calendar_connections').select('id,user_id,company_id,account_email,status,sync_enabled,is_primary').eq('user_id',userId).eq('provider','google').is('company_id',null).eq('status','connected').limit(1).maybeSingle();
  return data||null;
}
async function invoke(body:Record<string,unknown>){if(!supabase)throw new Error('Supabase indisponível');const{data,error}=await supabase.functions.invoke('google-calendar-oauth',{body});if(error)throw error;if(data?.error)throw new Error(data.detail||data.error);return data;}

async function renderConnection(){
  if(!isCalendar()||!supabase)return;
  const strip=document.querySelector<HTMLElement>('.calendar-workspace-strip');if(!strip)return;
  let host=strip.querySelector<HTMLElement>('.google-calendar-runtime-actions');
  if(!host){host=document.createElement('div');host.className='google-calendar-runtime-actions';strip.appendChild(host)}
  host.innerHTML='<span class="google-calendar-runtime-detail">Verificando integração...</span>';
  try{
    const[config,connection]=await Promise.all([invoke({action:'config'}),getOwnConnection()]);
    const originalStatus=strip.querySelector<HTMLElement>('.calendar-connection-status');if(originalStatus)originalStatus.style.display='none';
    const copy=strip.querySelector<HTMLElement>('div:nth-child(2) p');
    if(!config?.configured){
      if(copy)copy.textContent='A integração está preparada, mas as credenciais Google ainda não estão completas no Supabase.';
      host.innerHTML=`<span class="google-calendar-runtime-detail">Client ID: ${config?.parts?.clientId?'OK':'faltando'} · Secret: ${config?.parts?.clientSecret?'OK':'faltando'} · Redirect: ${config?.parts?.redirectUri?'OK':'faltando'}</span>`;
      return;
    }
    if(connection){
      if(copy)copy.textContent=`Conectado a ${connection.account_email||'Google Calendar'}. Eventos internos da CALI podem sincronizar com esta conta.`;
      host.innerHTML=`<span class="google-calendar-runtime-detail">Conectado · ${connection.account_email||'Google'}</span><button type="button" class="google-calendar-runtime-button" data-google-calendar-disconnect>Desconectar</button>`;
      return;
    }
    if(copy)copy.textContent='Conecte sua agenda Google. Eventos vinculados a um cliente só sincronizam com a conexão Google daquele cliente — nunca com a sua por fallback.';
    host.innerHTML='<button type="button" class="google-calendar-runtime-button primary" data-google-calendar-connect>Conectar Google Calendar</button>';
  }catch(error){host.innerHTML=`<span class="google-calendar-runtime-detail">Não foi possível verificar a integração: ${error instanceof Error?error.message:'erro'}</span>`}
}

async function connect(){const button=document.querySelector<HTMLButtonElement>('[data-google-calendar-connect]');if(button){button.disabled=true;button.textContent='Abrindo Google...'}try{const data=await invoke({action:'authorize',companyId:null});if(!data?.url)throw new Error('URL de autorização não recebida');window.location.assign(data.url)}catch(error){alert(`Não foi possível iniciar a conexão com o Google Calendar.\n\n${error instanceof Error?error.message:'Erro desconhecido'}`);if(button){button.disabled=false;button.textContent='Conectar Google Calendar'}}}
async function disconnect(){if(!confirm('Desconectar este Google Calendar do CALI Workspace? Os eventos já criados no Google não serão apagados automaticamente.'))return;try{await invoke({action:'disconnect',companyId:null});await renderConnection()}catch(error){alert(`Não foi possível desconectar.\n\n${error instanceof Error?error.message:'Erro desconhecido'}`)}}

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
function refresh(){if(isCalendar()){ensureStyle();void renderConnection();installRealtime()}else uninstallRealtime()}

export function installGoogleCalendarRuntime(){
  if(installed)return;installed=true;ensureStyle();
  document.addEventListener('click',(event)=>{const target=event.target as HTMLElement|null;if(target?.closest('[data-google-calendar-connect]')){event.preventDefault();void connect()}if(target?.closest('[data-google-calendar-disconnect]')){event.preventDefault();void disconnect()}},true);
  observer=new MutationObserver(()=>{if(refreshTimer)window.clearTimeout(refreshTimer);refreshTimer=window.setTimeout(refresh,80)});observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',refresh);window.setInterval(refresh,4000);refresh();
}
