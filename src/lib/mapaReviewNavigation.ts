export function installMapaReviewNavigation(){
  if(typeof document==='undefined') return;
  document.addEventListener('click',(event)=>{
    const target=event.target as HTMLElement|null;
    const button=target?.closest?.('.people-map-open') as HTMLElement|null;
    if(!button) return;
    const row=button.closest('tr');
    const protocol=row?.querySelector('code')?.textContent?.trim();
    if(!protocol) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(`/admin/mapa-de-people/revisao?protocolo=${encodeURIComponent(protocol)}`);
  },true);
}
