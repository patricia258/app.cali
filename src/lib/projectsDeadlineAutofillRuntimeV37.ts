let installed=false;
let pageObserver:MutationObserver|null=null;

function isPage(){return location.pathname.startsWith('/admin/projetos');}

function scan(){
  if(!isPage())return;
  document.querySelectorAll<HTMLElement>('.planning-deliverable-modal-v36').forEach(modal=>{
    const deadline=Array.from(modal.querySelectorAll<HTMLLabelElement>('label')).find(label=>/^deadline/i.test((label.textContent||'').trim()))?.querySelector<HTMLInputElement>('input[type="date"]');
    const card=modal.querySelector<HTMLElement>('.deadline-intelligence-v36');
    const apply=card?.querySelector<HTMLButtonElement>('button');
    if(!deadline||!card||!apply||deadline.value||deadline.dataset.caliForecastAutofill==='1')return;
    deadline.dataset.caliForecastAutofill='1';
    apply.click();
  });
}

function bindPage(){
  pageObserver?.disconnect();
  pageObserver=null;
  if(!isPage())return;
  const root=document.querySelector<HTMLElement>('.projects-flow-page');
  if(!root)return;
  scan();
  pageObserver=new MutationObserver((mutations)=>{
    if(!mutations.some((mutation)=>Array.from(mutation.addedNodes).some((node)=>node instanceof Element&&(node.matches('.planning-deliverable-modal-v36,.deadline-intelligence-v36')||Boolean(node.querySelector?.('.planning-deliverable-modal-v36,.deadline-intelligence-v36'))))))return;
    scan();
  });
  pageObserver.observe(root,{childList:true,subtree:true});
}

export function installProjectsDeadlineAutofillRuntimeV37(){
  if(installed||typeof window==='undefined')return;
  installed=true;
  bindPage();
  window.addEventListener('popstate',bindPage);
}
