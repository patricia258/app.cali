import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";
import { CONFIG } from "/js/config.js";
const supabase=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export async function requireAdmin(){const{data:{session},error}=await supabase.auth.getSession();if(error||!session){location.replace("/");return null}if(String(session.user?.email||"").toLowerCase()!==CONFIG.adminEmail){location.replace("/");return null}return session}
export function apiHeaders(session,extra={}){return{apikey:CONFIG.supabasePublishableKey,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json",...extra}}
export async function signOut(){await supabase.auth.signOut();location.replace("/")}
