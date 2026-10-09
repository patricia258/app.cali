import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpenText, BriefcaseBusiness, Building2, CalendarDays, Clock3, FileText, FolderKanban, Home, LayoutDashboard, Layers, LogOut, Menu, Moon, PieChart, Star, Sun, Target, TimerReset, UsersRound, X, type LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspaceAuth } from '../auth/WorkspaceAuthProvider';
import { nextThemeBoundary, resolveWorkspaceTheme, setManualWorkspaceTheme, workspaceThemeEventName, type WorkspaceTheme } from '../lib/workspaceTheme';
import { activeFront, loadContractFronts, planName, type CompanyPlan, type ContractedFront, type Front } from '../lib/contractFronts';
import { NotificationCenter } from './WorkspaceChrome';
import { DirectProfileControl } from './DirectProfileControl';
import { ClientShell } from '../client-v2/ClientShell';
import { GlobalTimerBar } from './GlobalTimerBar';
import { ProjectTimerBridge } from './ProjectTimerBridge';
import { ProjectDeliveryHistoryBridge } from './ProjectDeliveryHistoryBridge';
import { HoursLifecycleBridge } from './HoursLifecycleBridge';
import { OperationalSafetyBridgeV2 } from './OperationalSafetyBridgeV2';
import { ExtraVisitRequest } from './ExtraVisitRequest';
import { ExtraVisitExpenses } from './ExtraVisitExpenses';

export type Role='admin'|'client';
type NavItem={label:string;icon:LucideIcon;href:string};type CompactMark='lime'|'oak';const compactMarks:CompactMark[]=['lime','oak'];
export const adminNav:NavItem[]=[{label:'Visão geral',icon:LayoutDashboard,href:'/admin'},{label:'Clientes',icon:Building2,href:'/admin/clientes'},{label:'Equipe',icon:UsersRound,href:'/admin/equipe'},{label:'Projetos',icon:FolderKanban,href:'/admin/projetos'},{label:'Horas',icon:TimerReset,href:'/admin/horas'},{label:'Calendário',icon:CalendarDays,href:'/admin/calendario'},{label:'Ocorrências',icon:BookOpenText,href:'/admin/registros'},{label:'Documentos',icon:FileText,href:'/admin/documentos'},{label:'Relatórios',icon:PieChart,href:'/admin/relatorios'},{label:'NPS & satisfação',icon:Star,href:'/admin/satisfacao'}];
export const adminExternalNav:NavItem[]=[{label:'Propostas',icon:BriefcaseBusiness,href:'/admin/propostas'},{label:'Mapa de People',icon:Target,href:'/admin/mapa-de-people'}];
export const clientNav:NavItem[]=[{label:'Início',icon:LayoutDashboard,href:'/cliente'},{label:'Equipe',icon:UsersRound,href:'/cliente/equipe'},{label:'Horas',icon:Clock3,href:'/cliente/horas'},{label:'Calendário',icon:CalendarDays,href:'/cliente/cronograma'},{label:'Ocorrências',icon:BookOpenText,href:'/cliente/registros'},{label:'Documentos',icon:FolderKanban,href:'/cliente/documentos'},{label:'Relatórios',icon:PieChart,href:'/cliente/relatorios'},{label:'Projetos e entregáveis',icon:BriefcaseBusiness,href:'/cliente/entregaveis'}];
function CompactBrandMark({variant}:{variant:CompactMark}){return <span className={`brand-compact-art brand-compact-${variant}`} aria-hidden="true"/>;}
export function Brand({dark=false,compactVariant='lime'}:{dark?:boolean;compactVariant?:CompactMark}){return <div className={`brand ${dark?'brand-dark':''}`} aria-label="CALI Workspace"><div className="brand-full"><img src={dark?'https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-bordo.png':'https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-light.png'} alt="Logo CALI RH" decoding="async" fetchPriority="high"/><span>WORKSPACE</span></div><span className={`brand-compact brand-compact-slide variant-${compactVariant}`} title="CALI Workspace"><CompactBrandMark variant={compactVariant}/></span></div>;}
function Sidebar({role}:{role:Role}){
  const location=useLocation(),nav=role==='admin'?adminNav:clientNav;
  const roleRoot=role==='admin'?'/admin':'/cliente';
  const[mobileOpen,setMobileOpen]=useState(false),[compactMarkIndex,setCompactMarkIndex]=useState(0);
  function rotateCompactMark(){setCompactMarkIndex(c=>(c+1)%compactMarks.length);}
  function renderNavItem(item:NavItem){
    const active=location.pathname===item.href||(item.href!==roleRoot&&location.pathname.startsWith(`${item.href}/`));
    const Icon=item.icon;
    return <Link key={item.href} to={item.href} onClick={event=>{setMobileOpen(false);event.currentTarget.blur();}} className={active?'active':''} data-label={item.label} aria-label={item.label} aria-current={active?'page':undefined}><Icon size={19}/><span className="nav-label">{item.label}</span></Link>;
  }
  return <><button className="mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Abrir menu"><Menu/></button>{mobileOpen&&<button className="sidebar-backdrop" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>}<aside className={`sidebar ${mobileOpen?'mobile-open':''}`} onMouseLeave={()=>{if(!mobileOpen)rotateCompactMark();}}><div className="sidebar-top">{role==='client'?<div className="client-v2-brand" aria-label="CALI Workspace">CALI</div>:<Brand compactVariant={compactMarks[compactMarkIndex]}/>}<button className="sidebar-close" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"><X/></button></div><nav aria-label={role==='admin'?'Navegação administrativa':'Navegação do cliente'}>{nav.map(renderNavItem)}</nav>{role==='client'?<div className="client-v2-sidebar-bottom" aria-label="Acesso adicional"><span className="client-v2-sidebar-rule"/><Link to="/cliente/frentes" title="Frentes contratadas" aria-label="Frentes contratadas"><BriefcaseBusiness size={17}/></Link></div>:<div className="sidebar-footer sidebar-footer-profile-only"><DirectProfileControl role={role}/></div>}</aside></>;
}

function ExternalProductsTopNav(){const location=useLocation();return <div className="external-products-topnav" aria-label="Sistemas externos integrados">{adminExternalNav.map(item=>{const active=location.pathname===item.href||location.pathname.startsWith(`${item.href}/`);const Icon=item.icon;return <Link key={item.href} to={item.href} className={active?'active':''} aria-current={active?'page':undefined} aria-label={item.label} data-tooltip={item.label}><Icon size={19}/><span className="external-product-label">{item.label}</span></Link>;})}</div>;}

function currentWorkspacePage(role:Role,pathname:string){
  if(role==='client'&&pathname==='/cliente/frentes')return'Frentes';
  const routes=role==='admin'?[...adminNav,...adminExternalNav]:clientNav;
  return routes.find(item=>pathname===item.href||(item.href!==(role==='admin'?'/admin':'/cliente')&&pathname.startsWith(`${item.href}/`)))?.label||(role==='admin'?'Visão geral':'Início');
}

function ThemeToggle(){const[theme,setTheme]=useState<WorkspaceTheme>(()=>resolveWorkspaceTheme());useEffect(()=>{const eventName=workspaceThemeEventName();const sync=(event?:Event)=>{const detail=(event as CustomEvent<{theme?:WorkspaceTheme}>|undefined)?.detail?.theme;setTheme(detail==='day'||detail==='night'?detail:resolveWorkspaceTheme());};window.addEventListener(eventName,sync);window.addEventListener('focus',sync);return()=>{window.removeEventListener(eventName,sync);window.removeEventListener('focus',sync);};},[]);const isNight=theme==='night',nextBoundary=nextThemeBoundary(),nextLabel=nextBoundary.getHours()===6?'06:00':'18:00';function toggleTheme(){const next=isNight?'day':'night';setManualWorkspaceTheme(next);setTheme(next);}return <button className={`icon-button workspace-theme-toggle theme-${theme}`} type="button" aria-label={`Tema ${isNight?'noturno':'diurno'}. Alternar tema`} title={`${isNight?'Modo noite':'Modo dia'} · automático às 06:00 e 18:00 · ajuste manual vale até ${nextLabel}`} onClick={toggleTheme}>{isNight?<Moon size={18}/>:<Sun size={18}/>}</button>;}
function ClientReportsTopShortcut(){
  const { user }=useWorkspaceAuth();
  const [count,setCount]=useState<number|null>(null);
  const location=useLocation();
  useEffect(()=>{
    if(!supabase||!user?.id)return;
    const client=supabase;
    const userId=user.id;
    let alive=true;
    let channel:ReturnType<typeof client.channel>|null=null;
    async function start(){
      const profile=await client.from('profiles').select('company_id').eq('id',userId).maybeSingle();
      const companyId=profile.data?.company_id;
      if(!alive||profile.error||!companyId)return;
      async function refresh(){
        const result=await client.from('reports').select('id',{count:'exact',head:true}).eq('company_id',companyId).in('status',['sent','published']);
        if(alive)setCount(result.error?null:result.count);
      }
      void refresh();
      const onFocus=()=>{if(document.visibilityState==='visible')void refresh();};
      window.addEventListener('focus',onFocus);
      document.addEventListener('visibilitychange',onFocus);
      channel=client.channel(`client-report-shortcut:${companyId}`).on('postgres_changes',{event:'*',schema:'cali_workspace',table:'reports',filter:`company_id=eq.${companyId}`},()=>void refresh()).subscribe();
      cleanup=()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);if(channel)void client.removeChannel(channel);};
    }
    let cleanup=()=>{};
    void start();
    return()=>{alive=false;cleanup();};
  },[user?.id]);
  const label=count===1?'Relatórios · 1 disponível':count&&count>1?`Relatórios · ${count} disponíveis`:'Relatórios';
  return <Link to="/cliente/relatorios" className={`client-reports-top-shortcut${location.pathname.startsWith('/cliente/relatorios')?' active':''}`} aria-label={label} aria-current={location.pathname.startsWith('/cliente/relatorios')?'page':undefined} data-tooltip="Relatórios" title={label}><FileText size={20} strokeWidth={1.8}/>{count!=null&&count>0&&<span className="client-reports-top-count">{count}</span>}</Link>;
}
function ClientFrontsTopWidgets(){
  const { user }=useWorkspaceAuth();
  const location=useLocation();
  const [company,setCompany]=useState<CompanyPlan|null>(null);
  const [contracted,setContracted]=useState<{item:ContractedFront;front?:Front}[]>([]);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!supabase||!user?.id)return;
    const client=supabase;
    const userId=user.id;
    let alive=true;
    async function load(){
      const profile=await client.from('profiles').select('company_id').eq('id',userId).maybeSingle();
      const companyId=profile.data?.company_id;
      if(!alive||profile.error||!companyId)return;
      const info=await client.from('companies').select('id,display_name,service_plan,service_type').eq('id',companyId).maybeSingle();
      if(!alive||info.error||!info.data)return;
      const companyRow=info.data as CompanyPlan;
      setCompany(companyRow);
      if(companyRow.service_plan==='partner'||companyRow.service_plan==='full'){
        const result=await loadContractFronts(companyId);
        if(!alive)return;
        setContracted(result.contracts.filter(activeFront).map(item=>({item,front:result.catalog.find(front=>front.code===item.front_code)})));
      }
    }
    void load();
    return()=>{alive=false;};
  },[user?.id]);
  useEffect(()=>{if(!open)return;document.body.classList.add('workspace-modal-open');const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};window.addEventListener('keydown',onKeyDown);return()=>{document.body.classList.remove('workspace-modal-open');window.removeEventListener('keydown',onKeyDown);};},[open]);
  const plan=company?.service_plan||null;
  const label=plan?`Frentes · ${planName[plan]}`:'Frentes';
  const frontsActive=location.pathname==='/cliente/frentes';
  return <>
    <Link to="/cliente/frentes" className={`fronts-top-shortcut${frontsActive?' active':''}`} aria-label={label} aria-current={frontsActive?'page':undefined} data-tooltip={label} title={label}><BriefcaseBusiness size={19}/><span>Frentes</span></Link>
    {contracted.length>0&&<button type="button" className="fronts-extra-badge" onClick={()=>setOpen(true)} aria-label={`${contracted.length} frente${contracted.length===1?'':'s'} contratada${contracted.length===1?'':'s'} à parte`} data-tooltip="Contratadas à parte" title="Contratadas à parte"><Layers size={18}/><span className="fronts-extra-count">{contracted.length}</span></button>}
    {open&&createPortal(<div className="modal-backdrop full-screen-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}><section className="modal-card fronts-extra-modal" role="dialog" aria-modal="true" aria-labelledby="fronts-extra-title"><button type="button" className="modal-close" onClick={()=>setOpen(false)} aria-label="Fechar"><X size={19}/></button><span className="section-kicker">CONTRATADAS À PARTE</span><h2 id="fronts-extra-title">Frentes adicionais do seu pacote</h2><div className="fronts-extra-list">{contracted.map(({item,front})=><article key={item.id}><strong>{front?.title||item.front_code}</strong><p>{item.scope_label||front?.description}</p></article>)}</div></section></div>,document.body)}
  </>;
}
function watermarkScene(pathname:string){if(pathname==='/admin'||pathname==='/cliente')return'scene-overview';if(pathname.includes('/clientes')||pathname.includes('/documentos')||pathname.includes('/propostas'))return'scene-lime';if(pathname.includes('/projetos')||pathname.includes('/entregaveis')||pathname.includes('/relatorios')||pathname.includes('/satisfacao')||pathname.includes('/mapa-de-people')||pathname.includes('/registros'))return'scene-oak';if(pathname.includes('/horas'))return'scene-lime-soft';if(pathname.includes('/calendario')||pathname.includes('/cronograma'))return'scene-oak-soft';return'scene-overview';}
const WorkspaceFrameContext = createContext(false);

function WorkspaceChrome({role,children}:{role:Role;children:ReactNode}){const navigate=useNavigate(),location=useLocation();const pageLabel=currentWorkspacePage(role,location.pathname);useEffect(()=>{document.body.classList.remove('workspace-modal-open');},[location.pathname]);async function handleLogout(){sessionStorage.removeItem('cali-preview-role');sessionStorage.removeItem('cali:timer-origin');document.body.classList.remove('workspace-modal-open');if(supabase)await supabase.auth.signOut();navigate('/',{replace:true});}if(role==='client')return <ClientShell scheduling={<ExtraVisitRequest/>} notifications={<NotificationCenter role={role}/>} accountLinks={<><ClientFrontsTopWidgets/><ClientReportsTopShortcut/></>} themeToggle={<ThemeToggle/>} bridges={<><ProjectTimerBridge role={role}/><ProjectDeliveryHistoryBridge role={role}/><HoursLifecycleBridge role={role}/><OperationalSafetyBridgeV2 role={role}/></>} onLogout={handleLogout}>{children}</ClientShell>;return <div className="app-shell" data-visual-system="v2" data-workspace-role={role}><Sidebar role={role}/><ProjectTimerBridge role={role}/><ProjectDeliveryHistoryBridge role={role}/><HoursLifecycleBridge role={role}/><OperationalSafetyBridgeV2 role={role}/><main className="main"><header className="topbar"><div className="topbar-context"><span className="topbar-context-mark" aria-hidden="true"/><div><small>{role==='admin'?'CALI Workspace':'Área da empresa'}</small><strong>{pageLabel}</strong></div></div><div className="top-actions"><GlobalTimerBar role={role}/>{role==='admin'&&location.pathname==='/admin/clientes'&&<ExtraVisitExpenses/>}{role==='admin'&&<ExternalProductsTopNav/>}<ThemeToggle/><NotificationCenter role={role}/><button className="icon-button topbar-logout" type="button" aria-label="Sair do Workspace" title="Sair" onClick={handleLogout}><LogOut size={19}/></button></div></header><div className={`workspace-view workspace-brand-scene ${watermarkScene(location.pathname)}`}><div className="workspace-brand-watermarks" aria-hidden="true"><span className="workspace-watermark workspace-watermark-lime"/><span className="workspace-watermark workspace-watermark-oak"/></div>{children}</div></main></div>;}

export function WorkspaceFrame({role,children}:{role:Role;children:ReactNode}){return <WorkspaceFrameContext.Provider value={true}><WorkspaceChrome role={role}>{children}</WorkspaceChrome></WorkspaceFrameContext.Provider>;}

export function Shell({role,children}:{role:Role;children:ReactNode}){const persistent=useContext(WorkspaceFrameContext);return persistent?<>{children}</>:<WorkspaceChrome role={role}>{children}</WorkspaceChrome>;}
export function Kpi({label,value,helper}:{label:string;value:string;helper:string}){return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;}
export function Progress({value}:{value:number}){const bounded=Math.max(0,Math.min(100,value));return <div className="progress" aria-label={`${bounded}%`}><span style={{width:`${bounded}%`}}/></div>;}
