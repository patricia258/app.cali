import { supabase } from './supabase';

type Track={
  id:string;company_id:string;report_type?:string|null;period_start?:string|null;version?:number|null;
  status:string;sent_at?:string|null;client_open_count?:number|null;client_first_opened_at?:string|null;
  client_last_opened_at?:string|null;client_pdf_count?:number|null;acknowledged_at?:string|null;
  acknowledgement_protocol?:string|null;
};
const eventLabel:Record<string,string>={opened:'Relatório aberto',pdf_opened:'PDF aberto / baixado',acknowledged:'Ciência registrada',drive_saved:'Salvo no Drive'};
let observer:MutationObserver|null=null,timer=0,lastProtocol='';

function fmt(value?:string|null){
  if(!value)return'—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);
}
function month(value?:string|null){
  if(!value)return'—';
  const date=new Date(`${value.slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(date);
}
function typeLabel(value?:string|null){return value==='quarterly'?'Trimestral':'Mensal';}
function esc(value:unknown){return String(value??'').replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]||char));}
function protocol(){
  const values=Array.from(document.querySelectorAll<HTMLElement>('.reports-v16-identification dd'));
  return values.map((item)=>item.textContent?.trim()||'').find((value)=>/^CALI-RPT-/i.test(value))||'';
}
function ensureStyles(){
  if(document.getElementById('report-flow-cleanup-v57'))return;
  const link=document.createElement('link');
  link.id='report-flow-cleanup-v57';link.rel='stylesheet';link.href='/report-flow-cleanup-v57.css';
  document.head.appendChild(link);
}
function remove(){
  document.querySelector('.report-client-track-v55')?.remove();
  document.querySelector('.report-client-history-trigger-v57')?.remove();
  document.querySelector('.report-client-history-backdrop-v55')?.remove();
}
function debounce(){window.clearTimeout(timer);timer=window.setTimeout(()=>void render(),180);}

async function render(){
  if(window.location.pathname!=='/admin/relatorios'||!supabase){remove();lastProtocol='';return;}
  document.querySelector('.report-client-track-v55')?.remove();
  const nextProtocol=protocol();
  if(!nextProtocol){document.querySelector('.report-client-history-trigger-v57')?.remove();return;}
  lastProtocol=nextProtocol;
  const result=await supabase.from('reports')
    .select('id,company_id,report_type,period_start,version,status,sent_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count,acknowledged_at,acknowledgement_protocol')
    .eq('protocol',nextProtocol).maybeSingle();
  if(result.error||!result.data||lastProtocol!==nextProtocol)return;
  const report=result.data as Track;
  const toolbar=document.querySelector('.reports-v16-toolbar');
  if(!toolbar)return;
  const actionHost=toolbar.querySelector<HTMLElement>(':scope > div:last-child')||toolbar as HTMLElement;
  let button=toolbar.querySelector<HTMLButtonElement>('.report-client-history-trigger-v57');
  if(!['sent','published'].includes(report.status)&&!report.sent_at){button?.remove();return;}
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.className='secondary report-client-history-trigger-v57';
    button.textContent='Histórico do cliente';
    actionHost.appendChild(button);
  }
  button.onclick=()=>void openHistory(report);
}

async function openHistory(current:Track){
  if(!supabase)return;
  const[companyResult,reportsResult]=await Promise.all([
    supabase.from('companies').select('display_name').eq('id',current.company_id).maybeSingle(),
    supabase.from('reports')
      .select('id,report_type,period_start,version,status,sent_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count,acknowledged_at,acknowledgement_protocol')
      .eq('company_id',current.company_id).in('status',['sent','published'])
      .order('period_start',{ascending:false}).order('version',{ascending:false})
  ]);
  if(reportsResult.error)return;

  const all=(reportsResult.data||[]) as Track[];
  const consolidated:Track[]=[];
  const seen=new Set<string>();
  for(const item of all){
    const key=`${item.report_type||'monthly'}:${String(item.period_start||'').slice(0,7)}`;
    if(seen.has(key))continue;
    seen.add(key);consolidated.push(item);
  }

  const reportIds=consolidated.map((item)=>item.id);
  const eventsResult=reportIds.length
    ?await supabase.from('report_client_events').select('report_id,event_type,created_at,user_id,metadata').in('report_id',reportIds).order('created_at',{ascending:false})
    :{data:[],error:null} as any;
  if(eventsResult.error)return;
  const events=(eventsResult.data||[]) as any[];
  const ids=Array.from(new Set(events.map((item)=>item.user_id).filter(Boolean)));
  const names=new Map<string,string>();
  if(ids.length){
    const profiles=await supabase.from('profiles').select('id,full_name').in('id',ids);
    for(const item of profiles.data||[])names.set(String((item as any).id),String((item as any).full_name||'Cliente'));
  }
  const eventsByReport=new Map<string,any[]>();
  for(const event of events){
    const id=String(event.report_id);
    eventsByReport.set(id,[...(eventsByReport.get(id)||[]),event]);
  }

  document.querySelector('.report-client-history-backdrop-v55')?.remove();
  const backdrop=document.createElement('div');
  backdrop.className='modal-backdrop full-screen-modal report-client-history-backdrop-v55';
  const modal=document.createElement('section');
  modal.className='modal-card report-client-history-modal-v55 report-client-history-modal-v57';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  const companyName=String((companyResult.data as any)?.display_name||'Cliente');
  modal.innerHTML=`<button class="modal-close" type="button" aria-label="Fechar">×</button>
    <span class="section-kicker">RASTREABILIDADE</span>
    <h2>Histórico do cliente</h2>
    <p>${esc(companyName)}</p>
    <div class="report-client-history-table-wrap-v57">
      <table class="report-client-history-table-v57">
        <thead><tr><th>Referência</th><th>Tipo</th><th>Leitura</th><th>Ciência</th><th></th></tr></thead>
        <tbody>${consolidated.map((item)=>{
          const opens=Number(item.client_open_count||0);
          const itemEvents=eventsByReport.get(item.id)||[];
          return `<tr class="${item.id===current.id?'current':''}">
            <td><strong>${esc(month(item.period_start))}</strong></td>
            <td>${esc(typeLabel(item.report_type))}</td>
            <td>${opens>0?'<span class="history-status-v56 ok">Visualizado</span>':'<span class="history-status-v56 pending">Não visualizado</span>'}</td>
            <td>${item.acknowledged_at?'<span class="history-status-v56 ok">Registrada</span>':'<span class="history-status-v56 pending">Pendente</span>'}</td>
            <td><button type="button" class="report-history-expand-v57" data-history-expand="${esc(item.id)}" aria-expanded="false">Detalhes</button></td>
          </tr>
          <tr class="report-history-detail-row-v57" data-history-detail="${esc(item.id)}" hidden>
            <td colspan="5">
              <div class="report-history-detail-grid-v57">
                <div><span>Versão</span><strong>v${Number(item.version||1)}</strong></div>
                <div><span>Enviado</span><strong>${esc(fmt(item.sent_at))}</strong></div>
                <div><span>Acessos</span><strong>${opens}</strong></div>
                <div><span>Primeiro acesso</span><strong>${esc(fmt(item.client_first_opened_at))}</strong></div>
                <div><span>Último acesso</span><strong>${esc(fmt(item.client_last_opened_at))}</strong></div>
                <div><span>PDF</span><strong>${Number(item.client_pdf_count||0)}</strong></div>
                ${item.acknowledgement_protocol?`<div class="wide"><span>Protocolo da ciência</span><strong>${esc(item.acknowledgement_protocol)}</strong></div>`:''}
              </div>
              <div class="report-history-events-v57">
                ${itemEvents.length?itemEvents.map((event)=>`<div><span>${esc(fmt(event.created_at))}</span><strong>${esc(eventLabel[event.event_type]||event.event_type)}</strong><b>${esc(names.get(String(event.user_id))||'Cliente')}</b></div>`).join(''):'<span>Nenhum evento adicional registrado.</span>'}
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.classList.add('workspace-modal-open');

  modal.querySelectorAll<HTMLButtonElement>('[data-history-expand]').forEach((button)=>{
    button.addEventListener('click',()=>{
      const id=button.dataset.historyExpand||'';
      const detail=modal.querySelector<HTMLTableRowElement>(`[data-history-detail="${CSS.escape(id)}"]`);
      if(!detail)return;
      const opening=detail.hidden;
      detail.hidden=!opening;
      button.setAttribute('aria-expanded',String(opening));
      button.textContent=opening?'Recolher':'Detalhes';
    });
  });
  const close=()=>{backdrop.remove();document.body.classList.remove('workspace-modal-open');};
  modal.querySelector('.modal-close')?.addEventListener('click',close);
  backdrop.addEventListener('click',(event)=>{if(event.target===backdrop)close();});
}

export function installReportClientTrackingRuntimeV55(){
  if(typeof window==='undefined'||observer)return;
  ensureStyles();
  observer=new MutationObserver(debounce);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('popstate',debounce);
  window.addEventListener('focus',debounce);
  window.setInterval(()=>void render(),5000);
  window.setTimeout(()=>void render(),500);
}
