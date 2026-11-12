import { readClientReportHistory, readOfficialTrackedReport, type TrackedReport } from '../../api/reports/tracking';
import { isWorkspaceRoute } from '../routeActivity';

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
function esc(value:unknown){return String(value??'').replace(/[&<>'\"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[char]||char));}
function protocol(){
  const values=Array.from(document.querySelectorAll<HTMLElement>('.reports-v16-identification dd'));
  return values.map((item)=>item.textContent?.trim()||'').find((value)=>/^CALI-RPT-/i.test(value))||'';
}
function ensureStyles(){
  const ensure=(id:string,href:string)=>{
    if(document.getElementById(id))return;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  };
  ensure('report-flow-cleanup-v57','/report-client-reading.css');
  ensure('report-print-completeness-v63','/report-print-completeness.css');
}
function remove(){
  document.querySelector('.report-client-track-v55')?.remove();
  document.querySelector('.report-client-history-trigger-v57')?.remove();
  document.querySelector('.report-client-sent-version-v63')?.remove();
  document.querySelector('.report-client-history-backdrop-v55')?.remove();
}
function debounce(){if(!isWorkspaceRoute('/admin/relatorios', '/cliente/relatorios'))return;window.clearTimeout(timer);timer=window.setTimeout(()=>{if(isWorkspaceRoute('/admin/relatorios', '/cliente/relatorios'))void render();},180);}
function openSentVersion(id:string){
  window.open(`/admin/relatorios/impressao/${encodeURIComponent(id)}`,'_blank','noopener,noreferrer');
}

async function render(){
  if(window.location.pathname!=='/admin/relatorios'){remove();lastProtocol='';return;}
  document.querySelector('.report-client-track-v55')?.remove();
  const nextProtocol=protocol();
  if(!nextProtocol){document.querySelector('.report-client-history-trigger-v57')?.remove();document.querySelector('.report-client-sent-version-v63')?.remove();return;}
  lastProtocol=nextProtocol;
  const report = await readOfficialTrackedReport(nextProtocol);
  if (lastProtocol !== nextProtocol || window.location.pathname !== '/admin/relatorios') return;
  const toolbar=document.querySelector('.reports-v16-toolbar');
  if(!toolbar)return;
  const actionHost=toolbar.querySelector<HTMLElement>(':scope > div:last-child')||toolbar as HTMLElement;
  let historyButton=toolbar.querySelector<HTMLButtonElement>('.report-client-history-trigger-v57');
  let sentButton=toolbar.querySelector<HTMLButtonElement>('.report-client-sent-version-v63');
  if(!report){historyButton?.remove();sentButton?.remove();return;}
  if(!sentButton){
    sentButton=document.createElement('button');
    sentButton.type='button';
    sentButton.className='secondary report-client-sent-version-v63';
    sentButton.textContent='Ver versão enviada';
    actionHost.appendChild(sentButton);
  }
  sentButton.onclick=()=>openSentVersion(report.id);
  if(!historyButton){
    historyButton=document.createElement('button');
    historyButton.type='button';
    historyButton.className='secondary report-client-history-trigger-v57';
    historyButton.textContent='Histórico do cliente';
    actionHost.appendChild(historyButton);
  }
  historyButton.onclick=()=>void openHistory(report);
}

async function openHistory(current: TrackedReport) {
  const history = await readClientReportHistory(current.company_id);
  if (!history || window.location.pathname !== '/admin/relatorios') return;
  const { companyName, consolidated, eventsByReport } = history;

  document.querySelector('.report-client-history-backdrop-v55')?.remove();
  const backdrop=document.createElement('div');
  backdrop.className='modal-backdrop full-screen-modal report-client-history-backdrop-v55';
  const modal=document.createElement('section');
  modal.className='modal-card report-client-history-modal-v55 report-client-history-modal-v57';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
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
            <td><div class="report-history-actions-v63"><button type="button" class="report-history-open-v63" data-history-open="${esc(item.id)}">Ver versão</button><button type="button" class="report-history-expand-v57" data-history-expand="${esc(item.id)}" aria-expanded="false">Detalhes</button></div></td>
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
                ${itemEvents.length?itemEvents.map((event)=>`<div><span>${esc(fmt(event.date))}</span><strong>${esc(event.label)}</strong><b>${esc(event.actor)}</b></div>`).join(''):'<span>Nenhum evento adicional registrado.</span>'}
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.classList.add('workspace-modal-open');

  modal.querySelectorAll<HTMLButtonElement>('[data-history-open]').forEach((button)=>{
    button.addEventListener('click',()=>openSentVersion(button.dataset.historyOpen||''));
  });
  modal.querySelectorAll<HTMLButtonElement>('[data-history-expand]').forEach((button)=>{
    button.addEventListener('click',()=>{
      const id=button.dataset.historyExpand||'';
      const detail=modal.querySelector<HTMLTableRowElement>(`[data-history-detail="${CSS.escape(id)}"]`);
      if(!detail)return;
      const opening=detail.hidden;
      detail.hidden=!opening;
      button.setAttribute('aria-expanded',String(opening));
      button.textContent=opening?'Ocultar detalhes':'Detalhes';
    });
  });
  const close=()=>{backdrop.remove();document.body.classList.remove('workspace-modal-open');};
  modal.querySelector('.modal-close')?.addEventListener('click',close);
  backdrop.addEventListener('click',(event)=>{if(event.target===backdrop)close();});
}

export function installReportClientTrackingRuntime(){
  if(typeof window==='undefined'||observer)return;
  ensureStyles();
  observer=new MutationObserver(debounce);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('popstate',debounce);
  window.addEventListener('focus',debounce);
  window.setInterval(()=>void render(),5000);
  window.setTimeout(()=>void render(),500);
}
