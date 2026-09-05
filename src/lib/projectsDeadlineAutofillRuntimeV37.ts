let installed=false;

function scan(){
  if(!location.pathname.startsWith('/admin/projetos'))return;
  document.querySelectorAll<HTMLElement>('.planning-deliverable-modal-v36').forEach(modal=>{
    const deadline=Array.from(modal.querySelectorAll<HTMLLabelElement>('label')).find(label=>/^deadline/i.test((label.textContent||'').trim()))?.querySelector<HTMLInputElement>('input[type="date"]');
    const card=modal.querySelector<HTMLElement>('.deadline-intelligence-v36');
    const apply=card?.querySelector<HTMLButtonElement>('button');
    if(!deadline||!card||!apply||deadline.value||deadline.dataset.caliForecastAutofill==='1')return;
    deadline.dataset.caliForecastAutofill='1';
    apply.click();
  });
}

export function installProjectsDeadlineAutofillRuntimeV37(){
  if(installed||typeof window==='undefined')return;
  installed=true;
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
}
