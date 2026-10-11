// Deliverable dialog: four tabs, official (5173, mocked backend) vs approved V2 (5174). Element screenshots of .dv-modal.
const { chromium } = require('playwright-core');const path=require('node:path');const fs=require('node:fs');const { user, token, readRpcs, tables } = require('./fixtures.cjs');
const out=process.env.OUT||path.join(__dirname,'shots','dv');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const c=await b.newContext({viewport:{width:+(process.env.W||1440),height:+(process.env.H||900)}});
await c.addInitScript(({user,token})=>{if(location.port!=='5173')return;localStorage.setItem('sb-qa-isolated-auth-token',JSON.stringify({access_token:token,refresh_token:'qa',expires_at:4070908800,expires_in:3600,token_type:'bearer',user}));},{user,token});
await c.route('**/*',async route=>{const r=route.request();const u=new URL(r.url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname!=='qa-isolated.invalid')return route.abort();const e=u.pathname.split('/').pop();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'};
if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});if(u.pathname.includes('/auth/'))return route.fulfill({headers:cors,json:u.pathname.endsWith('/user')?user:{access_token:token,user}});if(u.pathname.includes('/functions/'))return route.fulfill({headers:cors,json:{connected:false,jobs:[],events:[]}});
if(u.pathname.includes('/rpc/'))return Object.hasOwn(readRpcs,e)?route.fulfill({headers:cors,json:readRpcs[e]}):route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});
if(!['GET','HEAD'].includes(r.method()))return route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});let rows=tables[e]||[];const proto=u.searchParams.get('protocol');if(proto)rows=rows.filter(x=>'eq.'+x.protocol===proto);if(r.method()==='HEAD')return route.fulfill({status:200,body:'',headers:{...cors,'content-type':'application/json','content-range':`0-0/${rows.length}`}});
const single=(r.headers()['accept']||'').includes('vnd.pgrst.object');return route.fulfill({headers:{...cors,'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},json:single?rows[0]??null:rows});});
const tabs=['Visão geral','Etapas','Conversas','Histórico'];const info={};
const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));await p.goto('http://127.0.0.1:5173/cliente/entregaveis');await p.waitForTimeout(1500);
await p.getByRole('tab',{name:'Entregáveis'}).click();await p.waitForTimeout(400);await p.getByText('Entrega QA C').first().click();await p.waitForTimeout(900);
for(const[i,t]of tabs.entries()){await p.locator('.dv-modal nav button',{hasText:t}).click();await p.waitForTimeout(t==='Conversas'?1500:400);await p.screenshot({path:path.join(out,`${i+1}-oficial.png`)});
info[t]=await p.evaluate(process.env.EVAL||'(()=>{const m=document.querySelector(".dv-modal").getBoundingClientRect();return{w:m.width,h:m.height,x:m.x,y:m.y}})()');}
const v=await c.newPage();await v.goto('http://127.0.0.1:5174');await v.getByRole('button',{name:'Projetos',exact:true}).click();await v.waitForTimeout(500);
await v.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Entreg/.test(x.textContent.trim()));if(b)b.click()});await v.waitForTimeout(400);await v.locator('.dv-row,.dv-title').first().click();await v.waitForTimeout(600);
for(const[i,t]of tabs.entries()){await v.locator('.dv-modal nav button',{hasText:t}).click();await v.waitForTimeout(400);await v.screenshot({path:path.join(out,`${i+1}-v2.png`)});
info['v2 '+t]=await v.evaluate(process.env.EVAL||'(()=>{const m=document.querySelector(".dv-modal").getBoundingClientRect();return{w:m.width,h:m.height,x:m.x,y:m.y}})()');}
console.log(JSON.stringify(info));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
