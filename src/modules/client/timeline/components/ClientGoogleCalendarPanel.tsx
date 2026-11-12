import { useEffect, useState } from 'react';
import { CalendarCheck2, Link2, RefreshCw, Unplug } from 'lucide-react';
import { authorizeGoogleCalendar, disconnectGoogleCalendar, readClientGoogleConnection, type GoogleCalendarConnection } from '../../../../api/calendar/connections';

export function ClientGoogleCalendarPanel(){
  const[connection,setConnection]=useState<GoogleCalendarConnection|null>(null);
  const[companyId,setCompanyId]=useState('');
  const[loading,setLoading]=useState(true);
  const[working,setWorking]=useState(false);
  const[error,setError]=useState('');

  useEffect(()=>{void load();},[]);

  async function load(){
    setLoading(true);setError('');
    try{
      const result = await readClientGoogleConnection();
      setCompanyId(result.companyId);
      setConnection(result.connection);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível verificar sua conexão Google.');
    }finally{setLoading(false);}
  }

  async function connect(){
    if(!companyId)return;
    setWorking(true);setError('');
    try{
      window.location.assign(await authorizeGoogleCalendar(companyId));
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
      await disconnectGoogleCalendar(companyId);
      setConnection(null);
    }catch(requestError){
      setError(requestError instanceof Error?requestError.message:'Não foi possível desconectar sua agenda.');
    }finally{setWorking(false);}
  }

  return <section className={`client-google-panel ${connection?'connected':''}`}>
    <div className="client-google-icon"><CalendarCheck2 size={20}/></div>
    <div className="client-google-copy">
      <span>GOOGLE CALENDAR · OPCIONAL</span>
      <strong>{loading?'Verificando sua agenda…':connection?'Sua agenda está conectada':'Sua agenda do Workspace já funciona'}</strong>
      <p>{connection
        ? `Conectado a ${connection.account_email||'sua conta Google'}. Os compromissos publicados pela CALI continuam aparecendo aqui no Workspace e podem também ser acompanhados na sua agenda pessoal.`
        : 'Você não precisa conectar o Google para ver reuniões, prazos ou links de Meet no Workspace. Conecte apenas se quiser integrar esses compromissos à sua agenda pessoal.'}</p>
      {error&&<small className="client-google-error">{error}</small>}
    </div>
    <div className="client-google-actions">
      {connection
        ? <><span className="client-google-status"><Link2 size={14}/> Conectado</span><button type="button" onClick={()=>void load()} disabled={working}><RefreshCw size={15}/> Atualizar</button><button type="button" className="disconnect" onClick={()=>void disconnect()} disabled={working}><Unplug size={15}/> Desconectar</button></>
        : <button type="button" className="connect" onClick={()=>void connect()} disabled={working||loading}>{working?'Abrindo Google…':'Conectar Google Calendar'}</button>}
    </div>
  </section>;
}
