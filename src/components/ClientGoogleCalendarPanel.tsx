import { useEffect, useState } from 'react';
import { CalendarCheck2, Link2, RefreshCw, Unplug } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Connection = {
  id: string;
  account_email?: string | null;
  status?: string | null;
  sync_enabled?: boolean | null;
  last_sync_at?: string | null;
};

export function ClientGoogleCalendarPanel(){
  const[connection,setConnection]=useState<Connection|null>(null);
  const[companyId,setCompanyId]=useState('');
  const[loading,setLoading]=useState(true);
  const[working,setWorking]=useState(false);
  const[error,setError]=useState('');

  useEffect(()=>{void load();},[]);

  async function load(){
    if(!supabase)return;
    setLoading(true);setError('');
    try{
      const{data:userData,error:userError}=await supabase.auth.getUser();
      if(userError)throw userError;
      const userId=userData.user?.id;
      if(!userId)throw new Error('Sessão do cliente não encontrada.');
      const{data:profile,error:profileError}=await supabase.from('profiles').select('company_id').eq('id',userId).maybeSingle();
      if(profileError)throw profileError;
      const nextCompanyId=profile?.company_id||'';
      setCompanyId(nextCompanyId);
      if(!nextCompanyId){setConnection(null);return;}
      const{data,error:connectionError}=await supabase.from('calendar_connections')
        .select('id,account_email,status,sync_enabled,last_sync_at')
        .eq('user_id',userId)
        .eq('provider','google')
        .eq('company_id',nextCompanyId)
        .eq('status','connected')
        .limit(1)
        .maybeSingle();
      if(connectionError)throw connectionError;
      setConnection((data||null) as Connection|null);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível verificar sua conexão Google.');
    }finally{setLoading(false);}
  }

  async function invoke(body:Record<string,unknown>){
    if(!supabase)throw new Error('Supabase indisponível.');
    const{data,error}=await supabase.functions.invoke('google-calendar-oauth',{body});
    if(error)throw error;
    if(data?.error)throw new Error(data.detail||data.error);
    return data;
  }

  async function connect(){
    if(!companyId)return;
    setWorking(true);setError('');
    try{
      const data=await invoke({action:'authorize',companyId});
      if(!data?.url)throw new Error('O Google não retornou a tela de autorização.');
      window.location.assign(data.url);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível iniciar a conexão.');
      setWorking(false);
    }
  }

  async function disconnect(){
    if(!companyId||!connection)return;
    if(!window.confirm('Desconectar sua agenda Google do CALI Workspace? Os compromissos que já existem no Google não serão apagados.'))return;
    setWorking(true);setError('');
    try{
      await invoke({action:'disconnect',companyId});
      setConnection(null);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível desconectar sua agenda.');
    }finally{setWorking(false);}
  }

  return <section className={`client-google-panel ${connection?'connected':''}`}>
    <div className="client-google-icon"><CalendarCheck2 size={20}/></div>
    <div className="client-google-copy">
      <span>GOOGLE CALENDAR</span>
      <strong>{loading?'Verificando sua agenda…':connection?'Sua agenda está conectada':'Conecte sua agenda pessoal'}</strong>
      <p>{connection
        ? `Conectado a ${connection.account_email||'sua conta Google'}. Compromissos criados por você no Workspace podem usar esta agenda.`
        : 'A conexão é exclusiva da sua conta. A CALI não usa a agenda da Patrícia como substituta da sua.'}</p>
      {error&&<small className="client-google-error">{error}</small>}
    </div>
    <div className="client-google-actions">
      {connection
        ? <><span className="client-google-status"><Link2 size={14}/> Conectado</span><button type="button" onClick={()=>void load()} disabled={working}><RefreshCw size={15}/> Atualizar</button><button type="button" className="disconnect" onClick={()=>void disconnect()} disabled={working}><Unplug size={15}/> Desconectar</button></>
        : <button type="button" className="connect" onClick={()=>void connect()} disabled={working||loading}>{working?'Abrindo Google…':'Conectar Google Calendar'}</button>}
    </div>
  </section>;
}
