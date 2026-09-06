import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function integrationFromState(state:string|null){
  if(!state)return'calendar';
  try{
    const payload=state.split('.')[0];
    const normalized=payload.replace(/-/g,'+').replace(/_/g,'/');
    const pad=normalized.length%4?'='.repeat(4-normalized.length%4):'';
    const parsed=JSON.parse(decodeURIComponent(Array.from(atob(normalized+pad)).map((char)=>`%${char.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
    return parsed?.purpose==='drive'?'drive':'calendar';
  }catch{return'calendar';}
}

export function GoogleCalendarCallbackPage(){
  const integration=integrationFromState(new URLSearchParams(window.location.search).get('state'));
  const label=integration==='drive'?'Google Drive':'Google Calendar';
  const[message,setMessage]=useState(`Conectando seu ${label}...`);
  useEffect(()=>{void finish();},[]);

  async function finish(){
    const params=new URLSearchParams(window.location.search);
    const error=params.get('error');
    const code=params.get('code');
    const state=params.get('state');
    const purpose=integrationFromState(state);
    const integrationLabel=purpose==='drive'?'Google Drive':'Google Calendar';
    if(error){setMessage(`O Google não autorizou a conexão: ${error}`);return;}
    if(!code||!state||!supabase){setMessage(`Retorno do Google incompleto. Volte ao ${purpose==='drive'?'menu Documentos':'Calendário'} e tente novamente.`);return;}

    const functionName=purpose==='drive'?'google-drive-oauth':'google-calendar-oauth';
    const{data,error:invokeError}=await supabase.functions.invoke(functionName,{body:{action:'exchange',code,state}});
    if(invokeError||data?.error){
      setMessage(`Não foi possível concluir a conexão: ${data?.detail||data?.error||invokeError?.message||'erro desconhecido'}`);
      return;
    }

    const{data:userData}=await supabase.auth.getUser();
    const userId=userData.user?.id;
    let role='admin';
    if(userId){
      const{data:profile}=await supabase.from('profiles').select('role').eq('id',userId).maybeSingle();
      if(profile?.role==='client')role='client';
    }

    setMessage(`${integrationLabel} conectado${data?.accountEmail?` · ${data.accountEmail}`:''}. Redirecionando...`);
    window.setTimeout(()=>{
      if(purpose==='drive')window.location.replace('/cliente/documentos?drive=connected');
      else window.location.replace(role==='client'?'/cliente/cronograma?google=connected':'/admin/calendario?google=connected');
    },700);
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#F7F3EE',padding:24,fontFamily:'Inter,Arial,sans-serif',color:'#2B2B2B'}}>
    <section style={{width:'min(560px,100%)',background:'#fff',border:'1px solid #e5d9d2',borderRadius:22,padding:32,boxShadow:'0 22px 70px rgba(55,30,36,.12)'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.16em',color:'#5A1E2D',marginBottom:10}}>CALI WORKSPACE</div>
      <h1 style={{fontSize:28,margin:'0 0 10px'}}>{label}</h1>
      <p style={{fontSize:16,lineHeight:1.55,margin:0,color:'#6c625e'}}>{message}</p>
    </section>
  </main>;
}
