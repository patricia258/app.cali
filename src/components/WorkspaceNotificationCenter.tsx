import { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from './WorkspaceShell';

type NotificationItem={id:string;title:string;body:string|null;created_at:string;read_at:string|null;notification_type?:string};
type CacheEntry={items:NotificationItem[];at:number};
const cache:Partial<Record<Role,CacheEntry>>={};
const CACHE_TTL=60_000;
const fallback:Record<Role,NotificationItem[]>={
  admin:[
    {id:'demo-1',title:'Entregável pronto para sua revisão',body:'Grupo Aurora · Estrutura de indicadores de People',created_at:new Date().toISOString(),read_at:null,notification_type:'deliverable'},
    {id:'demo-2',title:'Horas próximas do limite contratado',body:'Novatech atingiu 82% do ciclo atual.',created_at:new Date(Date.now()-3600000).toISOString(),read_at:null,notification_type:'hours'},
    {id:'demo-3',title:'Novo comentário do cliente',body:'Studio Norte solicitou um ajuste no ritual de gestão.',created_at:new Date(Date.now()-86400000).toISOString(),read_at:new Date().toISOString(),notification_type:'comment'},
  ],
  client:[
    {id:'demo-c1',title:'Você tem uma entrega para validar',body:'Estrutura de indicadores de People · prazo em 2 dias.',created_at:new Date().toISOString(),read_at:null,notification_type:'deliverable'},
    {id:'demo-c2',title:'Novo relatório publicado',body:'Relatório executivo de agosto está disponível.',created_at:new Date(Date.now()-7200000).toISOString(),read_at:null,notification_type:'report'},
  ],
};

function relativeTime(value:string){const date=new Date(value).getTime(),diff=Math.max(0,Date.now()-date),mins=Math.floor(diff/60000);if(mins<1)return'agora';if(mins<60)return`há ${mins} min`;const hours=Math.floor(mins/60);if(hours<24)return`há ${hours}h`;return`há ${Math.floor(hours/24)}d`;}
function persist(role:Role,items:NotificationItem[]){cache[role]={items,at:Date.now()};}

export function WorkspaceNotificationCenter({role}:{role:Role}){
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<NotificationItem[]>(()=>cache[role]?.items||fallback[role]);
  const popoverRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let mounted=true;
    let channel:ReturnType<NonNullable<typeof supabase>['channel']>|null=null;
    async function load(){
      if(!isSupabaseConfigured||!supabase)return;
      const{data:sessionData}=await supabase.auth.getSession();
      const user=sessionData.session?.user;if(!user||!mounted)return;
      const current=cache[role];
      if(!current||Date.now()-current.at>CACHE_TTL){
        const{data}=await supabase.from('notifications').select('id,title,body,created_at,read_at,notification_type').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);
        if(mounted&&data){const next=data as NotificationItem[];setItems(next);persist(role,next);}
      }else if(mounted){setItems(current.items);}
      channel=supabase.channel(`workspace-notifications-${user.id}-${role}`).on('postgres_changes',{event:'INSERT',schema:'cali_workspace',table:'notifications',filter:`user_id=eq.${user.id}`},(payload)=>{
        if(!mounted)return;
        setItems((currentItems)=>{const incoming=payload.new as NotificationItem;if(currentItems.some(item=>item.id===incoming.id))return currentItems;const next=[incoming,...currentItems].slice(0,20);persist(role,next);return next;});
      }).subscribe();
    }
    void load();
    return()=>{mounted=false;if(channel&&supabase)supabase.removeChannel(channel);};
  },[role]);

  useEffect(()=>{function closeOutside(event:MouseEvent){if(popoverRef.current&&!popoverRef.current.contains(event.target as Node))setOpen(false);}document.addEventListener('mousedown',closeOutside);return()=>document.removeEventListener('mousedown',closeOutside);},[]);

  const unread=items.filter(item=>!item.read_at).length;
  async function markRead(item:NotificationItem){setItems(current=>{const next=current.map(notification=>notification.id===item.id?{...notification,read_at:notification.read_at||new Date().toISOString()}:notification);persist(role,next);return next;});if(!item.id.startsWith('demo-')&&supabase)await supabase.rpc('mark_notification_read',{p_notification_id:item.id});}
  async function markAll(){setItems(current=>{const next=current.map(item=>({...item,read_at:item.read_at||new Date().toISOString()}));persist(role,next);return next;});if(supabase)await supabase.rpc('mark_all_notifications_read');}

  return <div className="chrome-popover" ref={popoverRef}>
    <button className="icon-button notification-button" aria-label="Notificações" onClick={()=>setOpen(current=>!current)}><Bell size={20}/>{unread>0&&<span className="notification-count">{unread>9?'9+':unread}</span>}</button>
    {open&&<div className="notification-panel" role="dialog" aria-label="Notificações">
      <div className="notification-head"><div><strong>Notificações</strong><span>{unread?`${unread} não lida${unread>1?'s':''}`:'Tudo em dia'}</span></div>{unread>0&&<button onClick={markAll}>Marcar todas</button>}</div>
      <div className="notification-list">{items.length===0?<div className="notification-empty"><Check size={20}/><strong>Nenhum aviso por aqui.</strong><span>Novidades de projetos, horas, agenda e validações aparecem neste canal.</span></div>:items.map(item=><button className={`notification-item ${item.read_at?'':'unread'}`} key={item.id} onClick={()=>markRead(item)}><span className="notification-indicator"/><div><strong>{item.title}</strong>{item.body&&<p>{item.body}</p>}<small>{relativeTime(item.created_at)}</small></div></button>)}</div>
    </div>}
  </div>;
}
