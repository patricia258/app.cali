// Admin clients dialogs: opens create / manage (each tab) / lifecycle and screenshots. Mocked backend, admin role.
process.env.QA_ROLE='admin';
const { chromium } = require('playwright-core');const path=require('node:path');const fs=require('node:fs');const { user, token, readRpcs, tables } = require('./fixtures.cjs');
const out=path.join(__dirname,'shots','adm');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const c=await b.newContext({viewport:{width:+(process.env.W||1440),height:900}});
await c.addInitScript(({user,token})=>{localStorage.setItem('sb-qa-isolated-auth-token',JSON.stringify({access_token:token,refresh_token:'qa',expires_at:4070908800,expires_in:3600,token_type:'bearer',user}));},{user,token});
await c.route('**/*',async route=>{const r=route.request();const u=new URL(r.url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname!=='qa-isolated.invalid')return route.abort();const e=u.pathname.split('/').pop();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'};
if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});if(u.pathname.includes('/auth/'))return route.fulfill({headers:cors,json:u.pathname.endsWith('/user')?user:{access_token:token,user}});if(u.pathname.includes('/functions/'))return route.fulfill({headers:cors,json:{connected:false,jobs:[],events:[]}});
if(u.pathname.includes('/rpc/'))return Object.hasOwn(readRpcs,e)?route.fulfill({headers:cors,json:readRpcs[e]}):route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});
if(!['GET','HEAD'].includes(r.method()))return route.fulfill({status:403,headers:cors,json:{message:'QA blocks writes'}});const rows=tables[e]||[];if(r.method()==='HEAD')return route.fulfill({status:200,body:'',headers:{...cors,'content-range':`0-0/${rows.length}`}});
const single=(r.headers()['accept']||'').includes('vnd.pgrst.object');return route.fulfill({headers:{...cors,'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},json:single?rows[0]??null:rows});});
const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));await p.goto('http://127.0.0.1:5173/admin/clientes');await p.waitForTimeout(2200);
const shot=n=>p.screenshot({path:path.join(out,n+'.png')});
await p.getByRole('button',{name:'Nova conta'}).click();await p.waitForTimeout(400);
for(const[i,t]of ['Dados cadastrais','Decisores e acessos','Contrato','Financeiro','Documentos'].entries()){await p.locator('.ap-registration-tabs button',{hasText:t}).click();await p.waitForTimeout(250);if(i===1){await p.getByRole('button',{name:'Adicionar decisor ou acesso'}).click();await p.waitForTimeout(150);}await shot('novo-'+(i+1));}if(process.env.ONLY==='novo'){await b.close();return;}
await p.getByRole('button',{name:'Fechar cadastro'}).click();await p.locator('.ap-client-data-row').first().click();await p.waitForTimeout(500);
for(const[i,t]of ['Dados cadastrais','Contrato','Frentes','Agenda do contrato','Financeiro','Operação','Comunicações','Histórico'].entries()){await p.locator('.ap-account-tabs button',{hasText:t}).first().click();await p.waitForTimeout(700);await shot('conta-'+(i+1));}
await p.locator('.ap-account-danger button',{hasText:'Encerrar contrato'}).click();await p.waitForTimeout(400);await shot('motivo-encerrar');
await p.locator('.ap-status-confirm footer button').first().click();await p.locator('.ap-client-ops button[title="Bloquear acesso"]').first().click();await p.waitForTimeout(400);await shot('motivo-bloquear');
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
