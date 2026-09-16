import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";
import { CONFIG } from "/js/config.js";

const supabase=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function requestParentSession(){
  if(window.parent===window)return Promise.resolve(null);
  return new Promise((resolve)=>{
    let settled=false;
    const finish=(value)=>{if(settled)return;settled=true;window.removeEventListener('message',onMessage);clearTimeout(timer);clearInterval(retry);resolve(value)};
    const onMessage=(event)=>{
      if(event.origin!==window.location.origin)return;
      if(event.data?.type!=='CALI_PORTAL_SESSION')return;
      finish(event.data.session||null);
    };
    const ask=()=>window.parent.postMessage({type:'CALI_PORTAL_SESSION_REQUEST'},window.location.origin);
    const timer=window.setTimeout(()=>finish(null),6000);
    const retry=window.setInterval(ask,350);
    window.addEventListener('message',onMessage);
    ask();
  });
}

export async function requireAdmin(){
  const {data:{session},error}=await supabase.auth.getSession();
  let active=!error&&session?session:null;
  if(!active)active=await requestParentSession();
  if(!active){
    const root=document.getElementById('proposal-root');
    if(root)root.innerHTML='<div class="empty">Não foi possível validar a sessão do Workspace. Feche e abra a proposta novamente.</div>';
    return null;
  }
  if(String(active.user?.email||'').toLowerCase()!==CONFIG.adminEmail){
    const root=document.getElementById('proposal-root');
    if(root)root.innerHTML='<div class="empty">Esta sessão não possui acesso administrativo.</div>';
    return null;
  }
  return active;
}

export function apiHeaders(session,extra={}){return{apikey:CONFIG.supabasePublishableKey,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json",...extra}}

export async function signOut(){
  if(window.parent!==window){window.parent.postMessage({type:'CALI_PORTAL_SIGN_OUT'},window.location.origin);return;}
  await supabase.auth.signOut();
  location.replace('/');
}
