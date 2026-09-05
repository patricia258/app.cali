import { loadCompanyLogoRegistry } from './companyWorkspaceLogo';

let installed=false,timer=0,loading=false;
let registry=new Map<string,{raw:string;resolved:string;id:string}>();
function key(value=''){return value.trim().toLocaleLowerCase('pt-BR');}
async function refresh(){if(loading||!location.pathname.startsWith('/cliente'))return;loading=true;try{const data=await loadCompanyLogoRegistry();registry=data.byName;decorate();}finally{loading=false;}}
function decorate(){if(!location.pathname.startsWith('/cliente'))return;const card=document.querySelector<HTMLElement>('.client-home-v3 .contract-card');if(!card)return;const name=card.querySelector<HTMLElement>('.contract-main small')?.textContent?.trim()||'';const entry=registry.get(key(name));if(!entry?.resolved)return;const frame=card.querySelector<HTMLElement>('.contract-icon');if(!frame||frame.dataset.companyIdentityV40===entry.resolved)return;frame.dataset.companyIdentityV40=entry.resolved;frame.classList.add('workspace-company-logo-tile-v39','client-contract-logo-v40');frame.replaceChildren();const image=document.createElement('img');image.src=entry.resolved;image.alt='';frame.append(image);}
function schedule(){window.clearTimeout(timer);timer=window.setTimeout(()=>{decorate();if(!registry.size)void refresh();},100);}
export function installClientHomeCompanyIdentityRuntimeV40(){if(installed||typeof window==='undefined')return;installed=true;void refresh();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',()=>void refresh());window.addEventListener('popstate',schedule);}
