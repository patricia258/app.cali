import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpenText, BriefcaseBusiness, Building2, CalendarDays, Clock3, FileText, FolderKanban, Home, LayoutDashboard, LogOut, Menu, Moon, PieChart, Star, Sun, Target, TimerReset, X, type LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { nextThemeBoundary, resolveWorkspaceTheme, setManualWorkspaceTheme, workspaceThemeEventName, type WorkspaceTheme } from '../lib/workspaceTheme';
import { NotificationCenter } from './WorkspaceChrome';
import { DirectProfileControl } from './DirectProfileControl';
import { GlobalTimerBar } from './GlobalTimerBar';
import { ProjectTimerBridge } from './ProjectTimerBridge';
import { ProjectDeliveryHistoryBridge } from './ProjectDeliveryHistoryBridge';
import { HoursLifecycleBridge } from './HoursLifecycleBridge';
import { OperationalSafetyBridgeV2 } from './OperationalSafetyBridgeV2';

export type Role='admin'|'client';
type NavItem={label:string;icon:LucideIcon;href:string};type CompactMark='lime'|'oak';const compactMarks:CompactMark[]=['lime','oak'];
export const adminNav:NavItem[]=[{label:'Visão geral',icon:LayoutDashboard,href:'/admin'},{label:'Clientes',icon:Building2,href:'/admin/clientes'},{label:'Projetos',icon:FolderKanban,href:'/admin/projetos'},{label:'Horas',icon:TimerReset,href:'/admin/horas'},{label:'Calendário',icon:CalendarDays,href:'/admin/calendario'},{label:'Ocorrências',icon:BookOpenText,href:'/admin/registros'},{label:'Documentos',icon:FileText,href:'/admin/documentos'},{label:'Relatórios',icon:PieChart,href:'/admin/relatorios'},{label:'NPS & satisfação',icon:Star,href:'/admin/satisfacao'}];
export const adminExternalNav:NavItem[]=[{label:'Propostas',icon:BriefcaseBusiness,href:'/admin/propostas'},{label:'Mapa de People',icon:Target,href:'/admin/mapa-de-people'}];
export const clientNav:NavItem[]=[{label:'Início',icon:Home,href:'/cliente'},{label:'Planejamento',icon:CalendarDays,href:'/cliente/cronograma'},{label:'Entregáveis',icon:FolderKanban,href:'/cliente/entregaveis'},{label:'Horas',icon:Clock3,href:'/cliente/horas'},{label:'Ocorrências',icon:BookOpenText,href:'/cliente/registros'},{label:'Documentos',icon:FileText,href:'/cliente/documentos'},{label:'Relatórios',icon:PieChart,href:'/cliente/relatorios'}];
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
    return <Link key={item.href} to={item.href} onClick={event=>{setMobileOpen(false);event.currentTarget.blur();}} className={active?'active':''} data-label={item.label} aria-current={active?'page':undefined}><Icon size={19}/><span className="nav-label">{item.label}</span></Link>;
  }
  return <><button className="mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Abrir menu"><Menu/></button>{mobileOpen&&<button className="sidebar-backdrop" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>}<aside className={`sidebar ${mobileOpen?'mobile-open':''}`} onMouseLeave={()=>{if(!mobileOpen)rotateCompactMark();}}><div className="sidebar-top"><Brand compactVariant={compactMarks[compactMarkIndex]}/><button className="sidebar-close" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"><X/></button></div><nav aria-label={role==='admin'?'Navegação administrativa':'Navegação do cliente'}>{nav.map(renderNavItem)}</nav><div className="sidebar-footer sidebar-footer-profile-only"><DirectProfileControl role={role}/></div></aside></>;
}

function ExternalProductsTopNav(){const location=useLocation();return <div className="external-products-topnav" aria-label="Sistemas externos integrados">{adminExternalNav.map(item=>{const active=location.pathname===item.href||location.pathname.startsWith(`${item.href}/`);const Icon=item.icon;return <Link key={item.href} to={item.href} className={active?'active':''} aria-current={active?'page':undefined} aria-label={item.label} data-tooltip={item.label}><Icon size={19}/><span className="external-product-label">{item.label}</span></Link>;})}</div>;}

function currentWorkspacePage(role:Role,pathname:string){
  const routes=role==='admin'?[...adminNav,...adminExternalNav]:clientNav;
  return routes.find(item=>pathname===item.href||(item.href!==(role==='admin'?'/admin':'/cliente')&&pathname.startsWith(`${item.href}/`)))?.label||(role==='admin'?'Visão geral':'Início');
}

function ThemeToggle(){const[theme,setTheme]=useState<WorkspaceTheme>(()=>resolveWorkspaceTheme());useEffect(()=>{const eventName=workspaceThemeEventName();const sync=(event?:Event)=>{const detail=(event as CustomEvent<{theme?:WorkspaceTheme}>|undefined)?.detail?.theme;setTheme(detail==='day'||detail==='night'?detail:resolveWorkspaceTheme());};window.addEventListener(eventName,sync);window.addEventListener('focus',sync);return()=>{window.removeEventListener(eventName,sync);window.removeEventListener('focus',sync);};},[]);const isNight=theme==='night',nextBoundary=nextThemeBoundary(),nextLabel=nextBoundary.getHours()===6?'06:00':'18:00';function toggleTheme(){const next=isNight?'day':'night';setManualWorkspaceTheme(next);setTheme(next);}return <button className={`icon-button workspace-theme-toggle theme-${theme}`} type="button" aria-label={`Tema ${isNight?'noturno':'diurno'}. Alternar tema`} title={`${isNight?'Modo noite':'Modo dia'} · automático às 06:00 e 18:00 · ajuste manual vale até ${nextLabel}`} onClick={toggleTheme}>{isNight?<Moon size={18}/>:<Sun size={18}/>}</button>;}
function watermarkScene(pathname:string){if(pathname==='/admin'||pathname==='/cliente')return'scene-overview';if(pathname.includes('/clientes')||pathname.includes('/documentos')||pathname.includes('/propostas'))return'scene-lime';if(pathname.includes('/projetos')||pathname.includes('/entregaveis')||pathname.includes('/relatorios')||pathname.includes('/satisfacao')||pathname.includes('/mapa-de-people')||pathname.includes('/registros'))return'scene-oak';if(pathname.includes('/horas'))return'scene-lime-soft';if(pathname.includes('/calendario')||pathname.includes('/cronograma'))return'scene-oak-soft';return'scene-overview';}
const WorkspaceFrameContext = createContext(false);

function WorkspaceChrome({role,children}:{role:Role;children:ReactNode}){const navigate=useNavigate(),location=useLocation();const pageLabel=currentWorkspacePage(role,location.pathname);useEffect(()=>{document.body.classList.remove('workspace-modal-open');},[location.pathname]);async function handleLogout(){sessionStorage.removeItem('cali-preview-role');sessionStorage.removeItem('cali:timer-origin');document.body.classList.remove('workspace-modal-open');if(supabase)await supabase.auth.signOut();navigate('/',{replace:true});}return <div className="app-shell"><Sidebar role={role}/><ProjectTimerBridge role={role}/><ProjectDeliveryHistoryBridge role={role}/><HoursLifecycleBridge role={role}/><OperationalSafetyBridgeV2 role={role}/><main className="main"><header className="topbar"><div className="topbar-context"><span className="topbar-context-mark" aria-hidden="true"/><div><small>{role==='admin'?'CALI Workspace':'Área da empresa'}</small><strong>{pageLabel}</strong></div></div><div className="top-actions"><GlobalTimerBar role={role}/>{role==='admin'&&<ExternalProductsTopNav/>}<ThemeToggle/><NotificationCenter role={role}/><button className="icon-button topbar-logout" type="button" aria-label="Sair do Workspace" title="Sair" onClick={handleLogout}><LogOut size={19}/></button></div></header><div className={`workspace-view workspace-brand-scene ${watermarkScene(location.pathname)}`}><div className="workspace-brand-watermarks" aria-hidden="true"><span className="workspace-watermark workspace-watermark-lime"/><span className="workspace-watermark workspace-watermark-oak"/></div><div className="workspace-route-stage" key={location.pathname}>{children}</div></div></main></div>;}

export function WorkspaceFrame({role,children}:{role:Role;children:ReactNode}){return <WorkspaceFrameContext.Provider value={true}><WorkspaceChrome role={role}>{children}</WorkspaceChrome></WorkspaceFrameContext.Provider>;}

export function Shell({role,children}:{role:Role;children:ReactNode}){const persistent=useContext(WorkspaceFrameContext);return persistent?<>{children}</>:<WorkspaceChrome role={role}>{children}</WorkspaceChrome>;}
export function Kpi({label,value,helper}:{label:string;value:string;helper:string}){return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;}
export function Progress({value}:{value:number}){const bounded=Math.max(0,Math.min(100,value));return <div className="progress" aria-label={`${bounded}%`}><span style={{width:`${bounded}%`}}/></div>;}
