import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:cors})}
function env(name:string){return (Deno.env.get(name)||'').trim()}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const auth=req.headers.get('Authorization')||'';
  if(!auth)return json({error:'missing_authorization'},401);
  let body:any={}; try{body=await req.json()}catch{body={}}
  const eventId=String(body?.eventId||''); if(!eventId)return json({error:'missing_event_id'},400);
  const supabaseUrl=env('SUPABASE_URL'),anonKey=env('SUPABASE_ANON_KEY'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const clientId=env('GOOGLE_CLIENT_ID'),clientSecret=env('GOOGLE_CLIENT_SECRET');
  if(!clientId||!clientSecret)return json({error:'google_not_configured'},503);
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:auth}}});
  const{data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user)return json({error:'invalid_session'},401);
  const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}}).schema('cali_workspace');
  const{data:profile}=await service.from('profiles').select('id,role,company_id,active').eq('id',userData.user.id).maybeSingle();
  if(!profile?.active)return json({error:'profile_not_available'},403);
  const{data:event,error:eventError}=await service.from('events').select('*').eq('id',eventId).maybeSingle();
  if(eventError||!event)return json({error:'event_not_found'},404);
  if(event.source_type!=='scheduling_request')return json({error:'not_scheduling_event'},400);
  if(profile.role!=='admin'&&event.company_id!==profile.company_id)return json({error:'event_access_denied'},403);
  const{data:admins}=await service.from('profiles').select('id').eq('role','admin').eq('active',true);
  const adminIds=(admins||[]).map((row:any)=>row.id);
  if(!adminIds.length)return json({status:'admin_not_found'});
  const{data:connection}=await service.from('calendar_connections').select('*').eq('provider','google').eq('status','connected').eq('sync_enabled',true).eq('is_primary',true).is('company_id',null).in('user_id',adminIds).order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(!connection){await service.from('events').update({sync_status:'local'}).eq('id',event.id);return json({status:'admin_google_not_connected'});}
  const key=String(connection.credential_key||`${connection.user_id}:self`);
  const{data:credential}=await service.from('google_calendar_credentials').select('*').eq('credential_key',key).maybeSingle();
  if(!credential)return json({error:'google_credential_not_found'},500);
  let token=String(credential.access_token||'');
  const expiry=credential.expires_at?new Date(credential.expires_at).getTime():0;
  if(!token||expiry<=Date.now()+60000){
    if(!credential.refresh_token)return json({error:'google_refresh_token_missing'},500);
    const refresh=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:credential.refresh_token,grant_type:'refresh_token'})});
    const td=await refresh.json();
    if(!refresh.ok||!td.access_token)return json({error:'google_refresh_failed',detail:td.error_description||td.error||refresh.status},500);
    token=String(td.access_token);
    await service.from('google_calendar_credentials').update({access_token:token,expires_at:new Date(Date.now()+Number(td.expires_in||3600)*1000).toISOString(),updated_at:new Date().toISOString()}).eq('credential_key',key);
  }
  const{data:attendees}=await service.from('event_attendees').select('email').eq('event_id',event.id);
  const emails=[...new Set((attendees||[]).map((row:any)=>String(row.email||'').trim().toLowerCase()).filter(Boolean))];
  const tz=event.timezone||'America/Sao_Paulo';
  const googleBody:any={summary:event.title,description:event.description||undefined,location:event.location||undefined,attendees:emails.map((email:string)=>({email})),reminders:{useDefault:false,overrides:Number(event.reminder_minutes)>0?[{method:'popup',minutes:Number(event.reminder_minutes)}]:[]},extendedProperties:{private:{caliWorkspaceEventId:event.id,caliProtocol:event.protocol||'',caliSchedulingRequestId:event.source_entity_id||''}},start:{dateTime:event.starts_at,timeZone:tz},end:{dateTime:event.ends_at||event.starts_at,timeZone:tz}};
  if(event.mode==='remote'&&!event.meeting_url)googleBody.conferenceData={createRequest:{requestId:`cali-schedule-${event.id}-${Date.now()}`,conferenceSolutionKey:{type:'hangoutsMeet'}}};
  const calendarId=connection.calendar_id||'primary',base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,existing=event.google_event_id?String(event.google_event_id):'';
  const url=existing?`${base}/${encodeURIComponent(existing)}?sendUpdates=all&conferenceDataVersion=1`:`${base}?sendUpdates=all&conferenceDataVersion=1`;
  const response=await fetch(url,{method:existing?'PATCH':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(googleBody)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){await service.from('events').update({sync_status:'error'}).eq('id',event.id);return json({error:'google_calendar_sync_failed',detail:result?.error?.message||response.status},500);}
  await service.from('events').update({google_calendar_id:calendarId,google_event_id:result.id||existing,google_html_link:result.htmlLink||event.google_html_link||null,meeting_url:result.hangoutLink||event.meeting_url||null,sync_status:'synced',updated_at:new Date().toISOString()}).eq('id',event.id);
  await service.from('calendar_connections').update({last_sync_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',connection.id);
  return json({status:'synced',googleEventId:result.id||existing,googleHtmlLink:result.htmlLink||null,meetingUrl:result.hangoutLink||event.meeting_url||null,organizer:connection.account_email||null});
});
