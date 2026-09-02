import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function GoogleCalendarCallbackPage(){
  const[message,setMessage]=useState('Conectando seu Google Calendar...');
  useEffect(()=>{void finish();},[]);
  async function finish(){
    const params=new URLSearchParams(window.location.search);
    const error=params.get('error');
    const code=params.get('code');
    const state=params.get('state');
    if(error){setMessage(`O Google não autorizou a conexão: ${error}`);return;}
    if(!code||!state||!supabase){setMessage('Retorno do Google incompleto. Volte ao Calendário e tente novamente.');return;}
    const{data,error:invokeError}=await supabase.functions.invoke('google-calendar-oauth',{body:{action:'exchange',code,state}});
    if(invokeError||data?.error){setMessage(`Não foi possível concluir a conexão: ${data?.detail||data?.error||invokeError?.message||'erro desconhecido'}`);return;}
    setMessage(`Google Calendar conectado${data?.accountEmail?` · ${data.accountEmail}`:''}. Redirecionando...`);
    window.setTimeout(()=>window.location.replace('/admin/calendario?google=connected'),700);
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#F7F3EE',padding:24,fontFamily:'Inter,Arial,sans-serif',color:'#2B2B2B'}}><section style={{width:'min(560px,100%)',background:'#fff',border:'1px solid #e5d9d2',borderRadius:22,padding:32,boxShadow:'0 22px 70px rgba(55,30,36,.12)'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:'.16em',color:'#5A1E2D',marginBottom:10}}>CALI WORKSPACE</div><h1 style={{fontSize:28,margin:'0 0 10px'}}>Google Calendar</h1><p style={{fontSize:16,lineHeight:1.55,margin:0,color:'#6c625e'}}>{message}</p></section></main>;
}
