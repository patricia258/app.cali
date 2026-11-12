// Admin projects: tabs and dialogs screenshots (mocked backend, admin role).
process.env.QA_ROLE='admin';
const { chromium } = require('playwright-core');const path=require('node:path');const fs=require('node:fs');const { user, token, readRpcs, tables } = require('./fixtures.cjs');
const out=path.join(__dirname,'shots','adm');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const c=await b.newContext({viewport:{width:1440,height:900}});
await c.addInitScript(({user,token})=>{localStorage.setItem('sb-qa-isolated-auth-token',JSON.stringify({access_token:token,refresh_token:'qa',expires_at:4070908800,expires_in:3600,token_type:'bearer',user}));},{user,token});
await c.route('**/*',async route=>{const r=route.request();const u=new URL(r.url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname!=='qa-isolated.invalid')return route.abort();const e=u.pathname.split('/').pop();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'};
if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});if(u.pathname.includes('/auth/'))return route.fulfill({headers:cors,json:u.pathname.endsWith('/user')?user:{access_token:token,user}});if(u.pathname.includes('/functions/'))return route.fulfill({headers:cors,json:{connected:false,jobs:[],events:[]}});
if(u.pathname.includes('/rpc/'))return Object.hasOwn(readRpcs,e)?route.fulfill({headers:cors,json:readRpcs[e]}):route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});
if(!['GET','HEAD'].includes(r.method()))return route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});let rows=tables[e]||[];const proto=u.searchParams.get('protocol');if(proto)rows=rows.filter(x=>'eq.'+x.protocol===proto);if(r.method()==='HEAD')return route.fulfill({status:200,body:'',headers:{...cors,'content-range':`0-0/${rows.length}`}});
const single=(r.headers()['accept']||'').includes('vnd.pgrst.object');return route.fulfill({headers:{...cors,'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},json:single?rows[0]??null:rows});});
const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));await p.goto('http://127.0.0.1:5173/admin/projetos');await p.waitForTimeout(2500);
const shot=(n,full)=>p.screenshot({path:path.join(out,'proj-'+n+'.png'),fullPage:!!full});
await shot('cronograma',true);
await p.locator('.ap-project-tabs button',{hasText:'Entregáveis'}).click();await p.waitForTimeout(900);await p.locator('.front-collapse-trigger-v46').first().click().catch(()=>{});await p.waitForTimeout(400);await shot('lista',true);
await p.locator('.front-deliverable-open-v3').first().click();await p.waitForTimeout(900);await shot('dlg-1');
for(const[i,t]of ['Etapas','Conversas','Histórico'].entries()){await p.locator('.deliverable-tabs-v2 button',{hasText:t}).click();await p.waitForTimeout(t==='Conversas'?1500:400);await shot('dlg-'+(i+2));}
console.log(JSON.stringify(await p.evaluate(()=>({chat:document.querySelectorAll('.workspace-chat-line').length,tools:!!document.querySelector('.workspace-chat-tools'),hero:[...document.querySelectorAll('.project-hero-buttons button')].map(b=>b.textContent.trim()),strip:getComputedStyle(document.querySelector('.project-client-strip-v39')||document.body).display}))));
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
