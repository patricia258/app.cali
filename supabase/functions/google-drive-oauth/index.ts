import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json',
};
const encoder=new TextEncoder(),decoder=new TextDecoder();
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:corsHeaders})}
function env(name:string){return(Deno.env.get(name)||'').trim()}
function base64url(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function base64urlText(text:string){return base64url(encoder.encode(text))}
function fromBase64url(value:string){const normalized=value.replace(/-/g,'+').replace(/_/g,'/');const pad=normalized.length%4?'='.repeat(4-normalized.length%4):'';const binary=atob(normalized+pad);return new Uint8Array([...binary].map(c=>c.charCodeAt(0)))}
async function signState(payload:string,secret:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))))}
async function safeEqual(a:string,b:string){const aa=encoder.encode(a),bb=encoder.encode(b);if(aa.length!==bb.length)return false;let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0}
function credentialKey(userId:string,companyId:string){return`${userId}:${companyId}`}
function mimeFrom(value:string|null|undefined,name:string){const raw=String(value||'').trim();if(raw.includes('/'))return raw;const ext=(name.split('.').pop()||raw).toLowerCase();const map:Record<string,string>={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',csv:'text/csv'};return map[ext]||'application/octet-stream'}
function extensionForMime(mime:string){const map:Record<string,string>={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx','application/vnd.openxmlformats-officedocument.presentationml.presentation':'.pptx','text/plain':'.txt','text/csv':'.csv'};return map[mime]||''}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);

  const clientId=env('GOOGLE_CLIENT_ID'),clientSecret=env('GOOGLE_CLIENT_SECRET'),redirectUri=env('GOOGLE_REDIRECT_URI');
  const supabaseUrl=env('SUPABASE_URL'),anonKey=env('SUPABASE_ANON_KEY'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const configured=Boolean(clientId&&clientSecret&&redirectUri);
  let body:any={};try{body=await req.json()}catch{body={}}
  const action=String(body?.action||'status');
  if(action==='config')return json({configured,parts:{clientId:Boolean(clientId),clientSecret:Boolean(clientSecret),redirectUri:Boolean(redirectUri)}});
  if(!configured)return json({error:'google_oauth_not_configured'},503);

  const authHeader=req.headers.get('Authorization')||'';
  if(!authHeader)return json({error:'missing_authorization'},401);
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
  const{data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user)return json({error:'invalid_session'},401);
  const user=userData.user;
  const serviceRoot=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const db=serviceRoot.schema('cali_workspace');
  const{data:profile,error:profileError}=await db.from('profiles').select('id,role,company_id,active').eq('id',user.id).maybeSingle();
  if(profileError||!profile?.active)return json({error:'profile_not_available'},403);
  if(profile.role!=='client'||!profile.company_id)return json({error:'client_drive_only'},403);
  const companyId=String(profile.company_id);

  async function makeState(){const obj={purpose:'drive',user_id:user.id,company_id:companyId,exp:Math.floor(Date.now()/1000)+600,nonce:crypto.randomUUID()};const payload=base64urlText(JSON.stringify(obj));return`${payload}.${await signState(payload,clientSecret)}`}
  async function verifyState(state:string){const[payload,signature]=String(state||'').split('.');if(!payload||!signature)throw new Error('invalid_oauth_state');const expected=await signState(payload,clientSecret);if(!(await safeEqual(signature,expected)))throw new Error('invalid_oauth_state');const parsed=JSON.parse(decoder.decode(fromBase64url(payload)));if(parsed.purpose!=='drive'||parsed.user_id!==user.id||parsed.company_id!==companyId||Number(parsed.exp||0)<Math.floor(Date.now()/1000))throw new Error('expired_oauth_state');return parsed}
  async function connection(){const{data}=await db.from('drive_connections').select('*').eq('owner_type','client').eq('company_id',companyId).eq('status','connected').order('updated_at',{ascending:false}).limit(1).maybeSingle();return data||null}
  async function credential(conn:any){const key=String(conn?.credential_key||'');if(!key)throw new Error('google_drive_credential_missing');const{data,error}=await db.from('google_calendar_credentials').select('*').eq('credential_key',key).maybeSingle();if(error||!data)throw new Error('google_drive_credential_missing');return data}
  async function validAccessToken(conn:any){const cred=await credential(conn);const expiry=cred.expires_at?new Date(cred.expires_at).getTime():0;if(cred.access_token&&expiry>Date.now()+60000)return String(cred.access_token);if(!cred.refresh_token)throw new Error('google_refresh_token_missing');const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:cred.refresh_token,grant_type:'refresh_token'})});const data=await response.json();if(!response.ok||!data.access_token)throw new Error(`google_refresh_failed:${data.error||response.status}`);const expiresAt=new Date(Date.now()+Number(data.expires_in||3600)*1000).toISOString();await db.from('google_calendar_credentials').update({access_token:data.access_token,token_type:data.token_type||cred.token_type,scope:data.scope||cred.scope,expires_at:expiresAt,updated_at:new Date().toISOString()}).eq('credential_key',cred.credential_key);return String(data.access_token)}
  async function ensureRootFolder(conn:any,token:string){if(conn.root_folder_id){const check=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(conn.root_folder_id)}?fields=id,name,trashed`,{headers:{Authorization:`Bearer ${token}`}});if(check.ok){const row=await check.json();if(row?.id&&!row?.trashed)return String(row.id)}}const create=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name:'CALI Workspace',mimeType:'application/vnd.google-apps.folder'})});const row=await create.json();if(!create.ok||!row?.id)throw new Error(`google_drive_folder_failed:${row?.error?.message||create.status}`);await db.from('drive_connections').update({root_folder_id:row.id,root_folder_name:'CALI Workspace',updated_at:new Date().toISOString()}).eq('id',conn.id);return String(row.id)}
  async function uploadFile(token:string,folderId:string,name:string,mime:string,bytes:ArrayBuffer){const boundary=`cali-${crypto.randomUUID()}`;const metadata=JSON.stringify({name,parents:[folderId]});const bodyBlob=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,new Uint8Array(bytes),`\r\n--${boundary}--`],{type:`multipart/related; boundary=${boundary}`});const response=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body:bodyBlob});const row=await response.json();if(!response.ok||!row?.id)throw new Error(`google_drive_upload_failed:${row?.error?.message||response.status}`);return row}

  try{
    if(action==='authorize'){
      const state=await makeState();
      const params=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid email https://www.googleapis.com/auth/drive.file',access_type:'offline',include_granted_scopes:'true',prompt:'consent',state});
      return json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`});
    }
    if(action==='exchange'){
      const code=String(body?.code||''),state=String(body?.state||'');if(!code||!state)return json({error:'missing_code_or_state'},400);await verifyState(state);
      const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirectUri,grant_type:'authorization_code'})});
      const td=await tokenResponse.json();if(!tokenResponse.ok||!td.access_token)return json({error:'google_token_exchange_failed',detail:td.error_description||td.error||tokenResponse.status},400);
      const uiResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${td.access_token}`}}),ui=await uiResponse.json();if(!uiResponse.ok||!ui.email)return json({error:'google_userinfo_failed'},400);
      const key=credentialKey(user.id,companyId);const{data:existingCredential}=await db.from('google_calendar_credentials').select('refresh_token').eq('credential_key',key).maybeSingle();const refreshToken=td.refresh_token||existingCredential?.refresh_token||null;if(!refreshToken)return json({error:'google_refresh_token_missing',detail:'Revogue o acesso anterior do CALI Workspace na conta Google e conecte novamente.'},400);
      const expiresAt=new Date(Date.now()+Number(td.expires_in||3600)*1000).toISOString();
      await db.from('google_calendar_credentials').upsert({credential_key:key,user_id:user.id,company_id:companyId,account_email:ui.email,provider_account_id:ui.sub||null,access_token:td.access_token,refresh_token:refreshToken,token_type:td.token_type||'Bearer',scope:td.scope||'',expires_at:expiresAt,updated_at:new Date().toISOString()},{onConflict:'credential_key'});
      const{data:existing}=await db.from('drive_connections').select('id').eq('owner_type','client').eq('company_id',companyId).order('updated_at',{ascending:false}).limit(1).maybeSingle();
      const payload={company_id:companyId,owner_type:'client',account_email:ui.email,google_account_id:ui.sub||null,credential_key:key,status:'connected',connected_by:user.id,updated_at:new Date().toISOString()};
      if(existing?.id)await db.from('drive_connections').update(payload).eq('id',existing.id);else await db.from('drive_connections').insert(payload);
      return json({ok:true,purpose:'drive',accountEmail:ui.email});
    }
    if(action==='status'){
      const conn=await connection();
      const{data:jobs}=await db.from('file_sync_jobs').select('file_id,status,external_url,updated_at').eq('company_id',companyId).order('updated_at',{ascending:false}).limit(100);
      return json({connected:Boolean(conn),connection:conn?{id:conn.id,accountEmail:conn.account_email,rootFolderName:conn.root_folder_name,status:conn.status}:null,jobs:jobs||[]});
    }
    if(action==='copy_file'){
      const fileId=String(body?.fileId||'');if(!fileId)return json({error:'missing_file_id'},400);
      const{data:file,error:fileError}=await db.from('files').select('id,company_id,title,storage_path,drive_url,file_type,original_filename,status,client_visible').eq('id',fileId).maybeSingle();
      if(fileError||!file||String(file.company_id)!==companyId||file.status!=='published'||!file.client_visible)return json({error:'file_not_available'},404);
      if(!file.storage_path)return json({error:'workspace_file_required',detail:'Este arquivo está vinculado por link externo e não pode ser copiado automaticamente.'},409);
      const conn=await connection();if(!conn)return json({error:'drive_not_connected'},409);
      const{data:already}=await db.from('file_sync_jobs').select('id,status,external_url').eq('file_id',fileId).eq('connection_id',conn.id).eq('status','synced').order('updated_at',{ascending:false}).limit(1).maybeSingle();
      if(already?.id)return json({status:'synced',url:already.external_url});
      const{data:job}=await db.from('file_sync_jobs').insert({file_id:fileId,company_id:companyId,connection_id:conn.id,status:'processing',requested_by:user.id,attempts:1}).select('id').single();
      try{
        const token=await validAccessToken(conn);const folderId=await ensureRootFolder(conn,token);
        const{data:download,error:downloadError}=await serviceRoot.storage.from('cali-workspace-private').download(String(file.storage_path));if(downloadError||!download)throw new Error(`workspace_download_failed:${downloadError?.message||'arquivo indisponível'}`);
        const mime=mimeFrom(file.file_type,file.original_filename||'');let name=String(file.original_filename||file.title||'Documento CALI').trim();if(!name.includes('.')&&extensionForMime(mime))name+=extensionForMime(mime);
        const uploaded=await uploadFile(token,folderId,name,mime,await download.arrayBuffer());const url=uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`;
        if(job?.id)await db.from('file_sync_jobs').update({status:'synced',target_folder_id:folderId,external_file_id:uploaded.id,external_url:url,error_message:null,updated_at:new Date().toISOString()}).eq('id',job.id);
        await db.from('drive_connections').update({last_sync_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',conn.id);
        return json({status:'synced',url,fileName:uploaded.name});
      }catch(error){if(job?.id)await db.from('file_sync_jobs').update({status:'error',error_message:error instanceof Error?error.message:'unknown_error',updated_at:new Date().toISOString()}).eq('id',job.id);throw error}
    }
    if(action==='disconnect'){
      const conn=await connection();if(conn)await db.from('drive_connections').update({status:'revoked',updated_at:new Date().toISOString()}).eq('id',conn.id);return json({ok:true});
    }
    return json({error:'unknown_action'},400);
  }catch(error){console.error('google-drive-oauth',error);return json({error:error instanceof Error?error.message:'unknown_error'},500)}
});
