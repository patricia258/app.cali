/* Synthetic browser regression checks. All backend calls are intercepted locally.
   Never uses real credentials, sends messages, or writes to the official database.
   Requires Playwright in the execution environment and a running Vite server. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = process.env.CALI_QA_URL || 'http://127.0.0.1:5173';
const referenceOrigin = process.env.CALI_QA_REFERENCE_URL;
assert.equal(new URL(origin).hostname, '127.0.0.1', 'Synthetic checks must run on loopback');
const out = process.env.CALI_QA_OUTPUT || '/tmp/cali-v2-qa';
fs.mkdirSync(out, { recursive: true });
const companyId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';
const now = '2026-10-09T12:00:00Z';
const company = { id: companyId, display_name: 'Empresa QA fictícia', legal_name: 'Empresa QA', service_plan: 'partner', service_type: 'CALI Partner', status: 'active', monthly_hours_contracted: 20, show_hours_to_client: true, start_date: '2026-06-01', end_date: '2027-02-01', logo_url: null, logo_workspace_url: null };
const project = { id: projectId, company_id: companyId, name: 'Projeto QA fictício', status: 'active', planning_status: 'approved', start_date: '2026-06-01', target_end_date: '2027-02-01', client_visible: true, contract_hours: 160 };
const deliveries = [{ id: '44444444-4444-4444-8444-444444444444', company_id: companyId, project_id: projectId, title: 'Entrega QA fictícia', status: 'client_review', client_visible: true, workstream: 'Governança', due_at: '2026-10-20T12:00:00Z', roadmap_month_start: 1, roadmap_month_end: 2, description: 'Descrição de teste', protocol: 'CALI-DEL-20261009-001' }];
const fixtures = {
  companies: [company], projects: [project], deliverables: deliveries,
  profiles: [], project_workstreams: [], deliverable_tasks: [],
  hour_entries: [{ id: 'qa-hour', company_id: companyId, project_id: projectId, deliverable_id: deliveries[0].id, work_date: '2026-10-08', minutes: 90, description: 'Atividade QA fictícia', category: 'Consultoria', source_type: 'manual', started_at: '2026-10-08T12:00:00Z', ended_at: '2026-10-08T13:30:00Z', client_visible: true }],
  events: [{ id: 'qa-event', company_id: companyId, title: 'Encontro QA fictício', starts_at: '2026-10-20T12:00:00Z', ends_at: '2026-10-20T13:00:00Z', event_type: 'meeting', mode: 'online', visibility: 'client', status: 'confirmed', cancelled_at: null }],
  files: [{ id: 'qa-file', company_id: companyId, title: 'Documento QA fictício', document_kind: 'Entregável', category: 'other', status: 'published', client_visible: true, updated_at: now, version_label: '1', protocol: 'QA-DOC-001', requires_acknowledgement: true }],
  reports: [{ id: 'qa-report', company_id: companyId, title: 'Leitura QA fictícia', status: 'published', report_type: 'monthly', period_start: '2026-09-01', period_end: '2026-09-30', reference_month: '2026-09-01', version: 1, protocol: 'QA-REL-001', executive_summary: 'Resumo fictício para teste', source_snapshot: {}, published_at: now }],
  account_records: [{ id: 'qa-record', company_id: companyId, title: 'Solicitação QA fictícia', summary: 'Contexto fictício', record_type: 'request', workflow_status: 'open', visibility: 'client', protocol: 'CALI-REG-20261009-001', occurred_at: now, created_at: now, updated_at: now }],
  team_members: [{ id: 'qa-person', company_id: companyId, employee_code: 'QA01', full_name: 'Pessoa QA fictícia', job_title: 'Analista', department: 'Operações', admission_date: '2025-01-01', status: 'active', employment_type: 'clt', avatar_style: 'neutral', is_leader: false }],
  team_months: [{ reference_month: '2026-10-01', confirmed_at: now, revision: 1 }],
  team_month_snapshots: [{ reference_month: '2026-10-01', member_id: 'qa-person', status: 'active', department: 'Operações', job_title: 'Analista', admission_date: '2025-01-01' }],
  team_month_reviews: [{ reference_month: '2026-09-01' }],
};
const summary = { visible: true, contractedHours: 20, consumedMinutes: 90, remainingMinutes: 1110, overMinutes: 0, usagePercent: 7.5 };
const readRpcs = {
  get_client_hours_summary: summary,
  client_meeting_records_v1: [],
  get_client_home_work_metrics: { ratings: { average: 4.5, count: 2 }, work: { total: 1, completed: 0, notStarted: 0, inProgress: 0, internalReview: 0, withClient: 1 } },
  get_client_account_contact: [{ full_name: 'Consultora QA', job_title: 'People Advisory' }],
};
const results = [];
const comparisons = [];
const interactions = [];
const referencePages = { '/cliente': 'Visão Geral', '/cliente/cronograma': 'Calendário', '/cliente/equipe': 'Equipe', '/cliente/entregaveis': 'Projetos', '/cliente/horas': 'Horas', '/cliente/registros': 'Ocorrências', '/cliente/documentos': 'Documentos', '/cliente/relatorios': 'Relatórios' };
const geometry = () => Object.fromEntries(['.sidebar','.topbar','.page-head','.wf-head'].map(selector => {
  const element = document.querySelector(selector);
  if (!element) return [selector, null];
  const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
  return [selector, { x:rect.x, y:rect.y, width:rect.width, height:rect.height, font:css.fontFamily, background:css.backgroundImage, padding:css.padding, children:[...element.children].map(child=>({tag:child.tagName,class:child.className,height:child.getBoundingClientRect().height,lineHeight:getComputedStyle(child).lineHeight,margin:getComputedStyle(child).margin,font:getComputedStyle(child).font,children:[...child.children].map(c=>({tag:c.tagName,cls:c.className,height:c.getBoundingClientRect().height,font:getComputedStyle(c).font,margin:getComputedStyle(c).margin,padding:getComputedStyle(c).padding,lineHeight:getComputedStyle(c).lineHeight}))})) }];
}));
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.CALI_QA_CHROMIUM ? { executablePath: process.env.CALI_QA_CHROMIUM, args: ['--disable-webgl', '--no-zygote'] } : {}) });
  for (const role of (process.env.CALI_QA_INCLUDE_ADMIN === '1' ? ['client', 'admin'] : ['client'])) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: now };
    fixtures.profiles = [{ ...user, full_name: 'Pessoa QA', company_id: companyId, role, active: true }];
    const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: userId, exp: 4070908800, role: 'authenticated' })}.qa`;
    await context.addInitScript(({ user, token, role }) => {
      localStorage.setItem('sb-kqtbfeeqbcllwvlkbrkq-auth-token', JSON.stringify({ access_token: token, refresh_token: 'qa', expires_at: 4070908800, expires_in: 3600, token_type: 'bearer', user }));
      localStorage.setItem('cali-workspace-theme-override-v1', JSON.stringify({ theme:'day', until:4070908800000 }));
      // Exercise the official authenticated hooks; no preview/demo bypass.
    }, { user, token, role });
    const intercepted = [];
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === '127.0.0.1' || url.origin === origin) return route.continue();
      if (!url.hostname.endsWith('.supabase.co')) return route.abort();
      const endpoint = url.pathname.split('/').pop();
      intercepted.push({ endpoint, method: request.method(), body: request.postDataJSON() });
      if (url.pathname.includes('/auth/')) return route.fulfill({ json: url.pathname.endsWith('/user') ? user : { access_token: token, user } });
      if (url.pathname.includes('/functions/')) return route.fulfill({ json: { connected: false, jobs: [], events: [] } });
      if (url.pathname.includes('/rpc/')) return Object.hasOwn(readRpcs, endpoint)
        ? route.fulfill({ json: readRpcs[endpoint] })
        : route.fulfill({ status:403, json:{ message:'QA blocks writes' } });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fulfill({ status: 403, json: { message: 'QA blocks writes' } });
      const rows = fixtures[endpoint] || [];
      const single = request.headers()['accept']?.includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? rows[0] ?? null : rows, headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const referencePage = referenceOrigin && role === 'client' ? await context.newPage() : null;
    if (referencePage) await referencePage.goto(referenceOrigin);
    const routes = role === 'client'
      ? ['/cliente','/cliente/cronograma','/cliente/equipe','/cliente/entregaveis','/cliente/horas','/cliente/registros','/cliente/documentos','/cliente/relatorios','/cliente/frentes']
      : ['/admin','/admin/clientes','/admin/equipe','/admin/projetos','/admin/horas','/admin/calendario','/admin/registros','/admin/documentos','/admin/relatorios','/admin/satisfacao','/admin/propostas','/admin/mapa-de-people'];
    for (const route of routes.filter(route=>!process.env.CALI_QA_ROUTE || route===process.env.CALI_QA_ROUTE)) {
      await page.goto(origin + route);
      await page.locator('.app-shell[data-visual-system="v2"]').waitFor({timeout:10000}).catch(async error=>{console.log(JSON.stringify({url:page.url(),body:await page.locator('body').innerText(),errors,requests:intercepted.slice(-10)}));await page.screenshot({path:path.join(out,'setup-error.png')});throw error;});
      await page.waitForTimeout(900);
      for (const width of [1440, 1280, 1024, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(80);
        const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, topbar: getComputedStyle(document.querySelector('.topbar')).backgroundColor, shell: getComputedStyle(document.querySelector('.app-shell')).backgroundColor }));
        results.push({ role, route, width, ...layout, geometry:await page.evaluate(geometry), errors: [...errors] });
        await page.screenshot({ path: path.join(out, `${role}-${route.split('/').pop()}-${width}.png`), fullPage: true, animations: 'disabled' });
        if (referencePage && referencePages[route]) {
          await referencePage.setViewportSize({width,height:1000});
          if (width < 850) await referencePage.getByRole('button',{name:'Menu',exact:true}).click();
          await referencePage.getByRole('button',{name:referencePages[route],exact:true}).click();
          await referencePage.mouse.move(width-20,500);
          await referencePage.screenshot({path:path.join(out,`reference-${route.split('/').pop()}-${width}.png`),fullPage:true,animations:'disabled'});
          comparisons.push({route,width,reference:await referencePage.evaluate(geometry),integration:await page.evaluate(geometry),data:'Reference uses approved fixtures; integration uses isolated QA fixtures. Data-dependent heights and content are not pixel-equivalent.'});
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => document.documentElement.dataset.workspaceTheme = 'night');
      await page.screenshot({ path: path.join(out, `${role}-${route.split('/').pop()}-night.png`), fullPage: true, animations: 'disabled' });
      await page.evaluate(() => document.documentElement.dataset.workspaceTheme = 'day');
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    fs.writeFileSync(path.join(out,'comparisons.json'),JSON.stringify(comparisons,null,2));
    if (role === 'client' && !process.env.CALI_QA_ROUTE) {
      await page.goto(origin+'/cliente/cronograma');
      await page.getByRole('button',{name:'Mês',exact:true}).click();
      const cells=await page.locator('.wf-month-grid .wf-cal-day').count();
      assert(cells===35||cells===42,'Calendar renders complete month weeks');
      await page.locator('.wf-month-grid .wf-event').filter({hasText:'Encontro QA fictício'}).click();
      await page.getByRole('dialog').waitFor();
      interactions.push('Calendar: original event opens from the V2 month view');
      await page.screenshot({path:path.join(out,'client-calendar-month-details.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/cliente/documentos');
      await page.getByRole('button',{name:'Comentar',exact:true}).click();
      await page.getByLabel('Comentário',{exact:true}).fill('Comentário QA sem persistência');
      await page.getByRole('button',{name:'Enviar comentário',exact:true}).click();
      await page.getByText('QA blocks writes',{exact:true}).waitFor();
      assert(intercepted.some(r=>r.endpoint==='comments' && r.method==='POST' && r.body?.body==='Comentário QA sem persistência' && r.body?.company_id===companyId));
      interactions.push('Document comment: real company-bound insert attempted; mocked failure surfaced without production writes');
      await page.screenshot({path:path.join(out,'client-document-comment-error.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/cliente/entregaveis');
      await page.getByRole('tab',{name:'Entregáveis',exact:true}).click();
      await page.getByRole('button',{name:'Abrir Entrega QA fictícia',exact:true}).click();
      await page.getByRole('button',{name:/^Conversa/}).click();
      await page.locator('button[title="Anexar arquivo"]').waitFor();
      assert(await page.locator('button[title="Inserir link"]').isVisible());
      assert(await page.locator('button[title="Emojis"]').isVisible());
      interactions.push('Deliverable conversation: migrated DOM hooks attach real upload/link/emoji tools');
      await page.screenshot({path:path.join(out,'client-deliverable-conversation.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/cliente/registros');
      await page.getByRole('button',{name:'Abrir Solicitação QA fictícia',exact:true}).click();
      await page.getByRole('dialog',{name:'Solicitação QA fictícia',exact:true}).waitFor();
      interactions.push('Occurrence: persisted record opens the migrated drawer');
      await page.screenshot({path:path.join(out,'client-record-drawer.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/cliente/equipe');
      await page.getByRole('button',{name:'Adicionar pessoa',exact:true}).click();
      await page.getByRole('dialog').waitFor();
      interactions.push('Team: original multi-step person form remains reachable');
      await page.setViewportSize({width:390,height:1000});
      await page.screenshot({path:path.join(out,'client-team-add-mobile.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/cliente');
      await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
      await page.screenshot({path:path.join(out,'client-mobile-navigation-open.png'),fullPage:true,animations:'disabled'});
      await page.getByRole('link',{name:'Documentos',exact:true}).click();
      await page.waitForURL(origin+'/cliente/documentos');
      assert(!(await page.locator('.sidebar').getAttribute('class')).includes('mobile-open'));
      interactions.push('Mobile navigation: selecting a route closes the menu');
      await page.setViewportSize({width:1440,height:1000});
      await page.getByRole('link',{name:'Equipe',exact:true}).hover();
      await page.screenshot({path:path.join(out,'client-sidebar-hover.png'),fullPage:true,animations:'disabled'});
      await page.getByRole('link',{name:'Equipe',exact:true}).press('Tab');
      await page.screenshot({path:path.join(out,'client-sidebar-focus.png'),fullPage:true,animations:'disabled'});
      await page.goto(origin+'/admin');
      await page.waitForURL(origin+'/cliente');
      interactions.push('Authorization: authenticated client is redirected away from admin routes');
    }
    fs.writeFileSync(path.join(out, `${role}-requests.json`), JSON.stringify(intercepted, null, 2));
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(out, 'comparisons.json'), JSON.stringify(comparisons,null,2));
  fs.writeFileSync(path.join(out, 'interactions.json'), JSON.stringify(interactions,null,2));
  const errors = [...new Set(results.flatMap(row => row.errors))];
  const overflow = results.filter(row => row.scroll > row.width + 2);
  console.log(JSON.stringify({ views: results.length, runtimeErrors: errors, overflow: overflow.map(({ route, width, scroll }) => ({ route, width, scroll })), output: out }, null, 2));
  assert.equal(errors.length, 0, 'Runtime errors in synthetic browser checks');
  assert.equal(overflow.length, 0, 'Unintentional page overflow');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async()=>{if(browser)await browser.close()});
