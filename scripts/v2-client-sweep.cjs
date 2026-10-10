// Client sweep: every route, tab and dialog at three widths. Flags unstyled controls, touching cards,
// round photo frames, horizontal overflow and runtime errors.
const { chromium } = require('playwright-core');const { user, token, readRpcs, tables } = require(process.env.CALI_QA_FIXTURES || './v2-qa-fixtures.cjs');
const click=t=>`(()=>{const e=[...document.querySelectorAll('button,a,[role=tab]')].find(b=>(b.getAttribute('aria-label')||b.textContent||'').trim().includes(${JSON.stringify(t)}));e?.click();return !!e})()`;
const steps=[
 ['Visão Geral','/cliente',null],['Visão Geral · canal Pati','/cliente',click('Fale com a Pati')],
 ['Equipe · Diretório','/cliente/equipe',null],['Equipe · Estrutura','/cliente/equipe?aba=estrutura',"document.querySelector('.v2-org-node')?.click()"],['Equipe · Movimentações','/cliente/equipe?aba=movimentacoes',null],['Equipe · Indicadores','/cliente/equipe?aba=indicadores',null],
 ['Equipe · cadastro','/cliente/equipe',click('Adicionar pessoa')],['Equipe · planilha','/cliente/equipe',click('via planilha')],['Equipe · ficha','/cliente/equipe',"document.querySelector('.v2-team-table tbody tr button')?.click()"],['Equipe · atualização mensal','/cliente/equipe',"[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Atualizar'))?.click()"],
 ['Horas','/cliente/horas',null],['Calendário · semana','/cliente/cronograma',null],['Calendário · mês','/cliente/cronograma',click('Mês')],['Calendário · lista','/cliente/cronograma',click('Lista')],['Calendário · histórico','/cliente/cronograma',click('Histórico de reuniões')],['Calendário · agendar','/cliente/cronograma',click('Solicitar agendamento')],
 ['Ocorrências','/cliente/registros',null],['Ocorrências · nova','/cliente/registros',click('Nova ocorrência')],['Ocorrências · conversa','/cliente/registros',"[...document.querySelectorAll('.wf-record-row')].find(r=>r.textContent.includes('Solicitação QA'))?.click()"],
 ['Documentos · capas','/cliente/documentos',null],['Documentos · lista','/cliente/documentos',click('Lista')],['Documentos · ficha','/cliente/documentos',"document.querySelector('.wf-doc-art')?.click()"],['Documentos · comentar','/cliente/documentos',click('Comentar')],
 ['Relatórios · convite','/cliente/relatorios',null],['Relatórios · leitura','/cliente/relatorios',"document.querySelector('.v2-report-invite button')?.click()"],['Relatórios · lista','/cliente/relatorios',click('Todos os relatórios')],
 ['Projetos · visão','/cliente/entregaveis',null],['Projetos · cronograma','/cliente/entregaveis',click('Cronograma')],['Projetos · entregáveis','/cliente/entregaveis',click('Entregáveis')],
 ['Frentes','/cliente/frentes',"document.querySelector('.v2-fronts-faq-card')?.setAttribute('open','')"],['Avisos','/cliente/avisos',null],
 ['Topbar · busca','/cliente/horas',"document.querySelector('button.global-search')?.click()"],['Topbar · notificações','/cliente/horas',"document.querySelector('.notification-button')?.click()"],['Topbar · conta','/cliente/horas',"document.querySelector('.profile')?.click()"],['Topbar · meu perfil','/cliente/horas',"document.querySelector('.profile').click(); setTimeout(()=>{[...document.querySelectorAll('.v2-profile button')].find(b=>b.textContent.includes('Ver meu perfil'))?.click()},200)"],
];
const audit=()=>{const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.bottom>0&&r.top<innerHeight*6};
 const name=e=>(e.tagName.toLowerCase()+'.'+String(e.className.baseVal??e.className).trim().split(/\s+/).slice(0,2).join('.')+' «'+(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,22)+'»');
 const scope=document.querySelector('.app')?document:document;const out={};
 const btn=[...scope.querySelectorAll('button')].filter(vis).filter(b=>{const s=getComputedStyle(b);return (s.backgroundColor==='rgb(239, 239, 239)'||s.borderTopStyle==='outset')&&!b.closest('.reports-v16-document')});
 if(btn.length)out.botoesSemEstilo=[...new Set(btn.map(name))].slice(0,6);
 const inp=[...scope.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([hidden]),select,textarea')].filter(vis).filter(i=>{const s=getComputedStyle(i);return s.borderTopStyle==='inset'||(s.borderTopWidth==='2px'&&s.borderTopStyle!=='solid')});
 if(inp.length)out.camposSemEstilo=[...new Set(inp.map(name))].slice(0,6);
 const round=[...scope.querySelectorAll('img,.avatar,.profile-avatar,.records-chat-avatar,.ch-team-avatar,.enh-picture')].filter(vis).filter(e=>{const r=e.getBoundingClientRect();const br=parseFloat(getComputedStyle(e).borderTopLeftRadius)||0;return r.width>=20&&r.width<=140&&Math.abs(r.width-r.height)<3&&br>=r.width/2-1&&!e.closest('.reports-v16-document')});
 if(round.length)out.moldurasRedondas=[...new Set(round.map(name))].slice(0,5);
 const cardSel='.ch-surface,.panel,.ie-chart,.ie-insight,.wf-doc-cover,.v2-fronts-card,.v2-fronts-faq-card,.wf-records,.wf-controls,.hours-context,.hours-ledger,.wf-calendar,.wf-report-side,.v2-report-stage,.ch-contract,.ch-bulletin,.ch-team-panel,.metric-strip,.data-grid,.dv-project,.v4-project-summary,.v4-project-editorial,.v4-project-action,.v2-org,.v2-org-explore,.context-strip,.toolbar,.v2-hours-notice,.v2-team-action-strip';
 const cards=[...scope.querySelectorAll(cardSel)].filter(vis).filter(e=>!e.closest('[role=dialog]'));const touching=[];
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(a.contains(b)||b.contains(a))continue;const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();const hOverlap=Math.min(A.right,B.right)-Math.max(A.left,B.left);const vOverlap=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);const vGap=Math.max(A.top,B.top)-Math.min(A.bottom,B.bottom);const hGap=Math.max(A.left,B.left)-Math.min(A.right,B.right);
  if((hOverlap>40&&vGap>=-1&&vGap<6)||(vOverlap>40&&hGap>=-1&&hGap<6)||(hOverlap>20&&vOverlap>20))touching.push(name(a).slice(0,34)+' × '+name(b).slice(0,34)+' ('+Math.round(hOverlap>40?vGap:hGap)+'px)');}
 if(touching.length)out.cartoesColados=[...new Set(touching)].slice(0,6);
 const of=document.documentElement.scrollWidth-innerWidth;if(of>1)out.estouroLargura=of;
 const dlg=[...document.querySelectorAll('[role=dialog]')].filter(vis).map(d=>{const r=d.getBoundingClientRect();return (r.top<-1||r.left<-1||r.right>innerWidth+1||r.bottom>innerHeight+1)?name(d)+' fora da tela '+[Math.round(r.top),Math.round(r.bottom),innerHeight].join('/'):null}).filter(Boolean);
 if(dlg.length)out.dialogoForaDaTela=dlg;
 return out;};
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});let issues=0,checked=0;
 for(const width of (process.env.WIDTHS||'1440,1024,390').split(',').map(Number)){
  const c=await b.newContext({viewport:{width,height:900}});
  await c.addInitScript(({user,token})=>{localStorage.setItem('sb-qa-isolated-auth-token',JSON.stringify({access_token:token,refresh_token:'qa',expires_at:4070908800,expires_in:3600,token_type:'bearer',user}));},{user,token});
  await c.route('**/*',async route=>{const r=route.request();const u=new URL(r.url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname!=='qa-isolated.invalid')return route.abort();const e=u.pathname.split('/').pop();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'};
   if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});if(u.pathname.includes('/auth/'))return route.fulfill({headers:cors,json:u.pathname.endsWith('/user')?user:{access_token:token,user}});if(u.pathname.includes('/functions/'))return route.fulfill({headers:cors,json:{connected:false,jobs:[],events:[]}});
   if(u.pathname.includes('/rpc/'))return Object.hasOwn(readRpcs,e)?route.fulfill({headers:cors,json:readRpcs[e]}):route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});
   if(!['GET','HEAD'].includes(r.method()))return route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});const rows=tables[e]||[];if(r.method()==='HEAD')return route.fulfill({status:200,body:'',headers:{...cors,'content-type':'application/json','content-range':`0-0/${rows.length}`}});
   const single=(r.headers()['accept']||'').includes('vnd.pgrst.object');return route.fulfill({headers:{...cors,'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},json:single?rows[0]??null:rows});});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  for(const [label,url,pre] of steps){errs.length=0;await p.goto('http://127.0.0.1:5173'+url);await p.waitForTimeout(500);await p.waitForFunction(()=>!document.querySelector('.data-loading,.spin'),null,{timeout:12000}).catch(()=>{});await p.waitForTimeout(500);
   if(pre){if(width<850&&pre.includes('.profile')){}await p.evaluate(pre).catch(()=>{});await p.waitForTimeout(label.includes('conversa')?2600:900);}
   const res=await p.evaluate(audit);if(errs.length)res.erros=[...new Set(errs)];checked++;
   if(Object.keys(res).length){issues++;console.log(`[${width}] ${label}: ${JSON.stringify(res)}`);}}
  await c.close();}
 console.log(`verificações: ${checked} · com apontamento: ${issues}`);await b.close();})();
