import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import loopback from '../e2e/loopback.cjs';
import fixtures from '../e2e/browser-fixture.cjs';
import data from '../e2e/fixtures.cjs';
import pixels from '../visual/pages/pixels.cjs';

const { serve, denyProxy, defaultChrome, launchBrowser, closeBrowser } = loopback;
const { makeContext } = fixtures;
const { companyId, projectId, tables, user } = data;
const { comparePixels, threshold } = pixels;
const api = 'https://cali-local-qa.supabase.co';
const widths = { desktop: [1440, 960], notebook: [1280, 800], tablet: [768, 1024], mobile: [390, 844] };
const syntheticDate = '2026-10-15T15:00:00Z';

function rows(context, origin, table, json) {
  return context.route(
    (url) => url.origin === api && url.pathname === '/rest/v1/' + table,
    (route) => route.request().method() === 'GET'
      ? route.fulfill({ json, headers: { 'access-control-allow-origin': origin } })
      : route.fallback(),
  );
}

async function assertReachable(locator, label) {
  await locator.waitFor();
  const reachable = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && element.contains(hit);
  });
  assert(reachable, `${label} está recortado ou fora do viewport`);
}

const scenarios = [
  {
    id: 'navigation', role: 'client', path: '/cliente',
    async open({ page }) {
      const sidebar = page.locator('aside.sidebar').first();
      const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
      if (await menu.isVisible()) {
        await menu.click();
        await page.waitForFunction(() => {
          const sidebar = document.querySelector('aside.sidebar.mobile-open');
          return sidebar && sidebar.getBoundingClientRect().left >= -1;
        });
      }
      return sidebar;
    },
  },
  {
    id: 'profile', role: 'admin', path: '/admin',
    async open({ page }) {
      const profile = page.locator('.profile[aria-haspopup="menu"]');
      await assertReachable(profile, 'Menu de perfil');
      await profile.click();
      await page.getByRole('menuitem', { name: /Minha conta|Ver meu perfil/ }).click();
      return page.getByRole('dialog', { name: /Minha conta|Meu perfil/ }).or(page.locator('.profile-modal')).first();
    },
  },
  {
    id: 'bell', role: 'client', path: '/cliente',
    setup: (context, origin) => rows(context, origin, 'notifications', [
      { id: 'qa-unread', title: 'Relatório disponível', body: 'Consulte a revisão no Workspace.', user_id: user.id, created_at: syntheticDate, notification_type: 'report', read_at: null },
      { id: 'qa-read', title: 'Compromisso atualizado', body: 'A agenda recebeu uma alteração.', user_id: user.id, created_at: syntheticDate, notification_type: 'scheduling_request', read_at: syntheticDate },
    ]),
    async open({ page }) {
      await page.getByRole('button', { name: 'Notificações', exact: true }).click();
      const bell = page.getByRole('dialog', { name: 'Notificações', exact: true });
      await bell.getByText('Relatório disponível', { exact: true }).waitFor();
      return bell;
    },
  },
  {
    id: 'hours-edit', role: 'admin', path: '/admin/horas',
    setup: (context, origin) => rows(context, origin, 'hour_entries', [{
      ...tables.hour_entries[0], category: 'Outros', created_at: syntheticDate,
    }]),
    async open({ page }) {
      await page.locator(':is([data-hours-entries], .hours-connect-table) button[data-hour-action="edit"], :is([data-hours-entries], .hours-connect-table) button[aria-label="Editar lançamento"]').first().click();
      return page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Editar lançamento de horas' }) }).or(page.locator('.operational-safety-card')).first();
    },
  },
  {
    id: 'timers-overflow', role: 'admin', path: '/admin',
    setup: (context, origin) => rows(context, origin, 'work_timers', Array.from({ length: 4 }, (_, index) => ({
      id: 'qa-visual-timer-' + index, company_id: index === 0 ? companyId : 'qa-visual-company-' + index,
      project_id: projectId, user_id: user.id, started_at: '2026-10-15T14:30:00Z',
      status: 'active', description: 'Atuação QA ' + (index + 1), paused_seconds: 0,
    }))),
    async open({ page }) {
      const trigger = page.locator('.global-timers-more');
      await assertReachable(trigger, 'Contador de timers');
      await trigger.click();
      const panel = page.locator('.global-timers-popover');
      await panel.waitFor();
      if (await trigger.getAttribute('aria-haspopup') === 'dialog') {
        const direct = await page.locator('.global-timers-primary .global-timer-chip').count();
        const grouped = await panel.locator('.global-timer-chip').count();
        assert.equal(direct + grouped, 4, 'Os quatro timers devem ficar acessíveis');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        const pause = panel.getByRole('button', { name: 'Pausar e registrar esta sessão' }).first();
        await pause.click({ trial: true });
        await page.getByRole('button', { name: 'Notificações', exact: true }).click({ trial: true });
        await page.keyboard.press('Escape');
        await panel.waitFor({ state: 'hidden' });
        assert(await trigger.evaluate((button) => button === document.activeElement), 'Escape deve devolver foco ao contador');
        await page.keyboard.press('Enter');
      }
      return panel;
    },
  },
];

async function capture({ browser, origin, scenario, size, theme, output, build }) {
  const [width, height] = widths[size];
  const { context } = await makeContext(browser, origin, scenario.role, { viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(4500);
  const file = join(output, `${build}-${scenario.id}-${size}-${theme}.png`);
  try {
    await scenario.setup?.(context, origin);
    await page.clock.setFixedTime(new Date(syntheticDate));
    await page.goto(origin + scenario.path, { waitUntil: 'domcontentloaded' });
    await page.locator('.topbar').first().waitFor();
    const target = await scenario.open({ page, size });
    await target.waitFor();
    if (theme === 'night') {
      await page.evaluate(() => {
        document.documentElement.dataset.workspaceTheme = 'night';
        document.documentElement.style.colorScheme = 'dark';
        document.body.dataset.workspaceTheme = 'night';
      });
    }
    const geometry = await target.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const centered = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height),
        hit: Boolean(centered && element.contains(centered)),
        viewportFit: box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1,
        overflow: document.documentElement.scrollWidth - innerWidth,
        background: style.backgroundColor, color: style.color,
        timerChips: element.querySelectorAll('.global-timer-chip').length,
      };
    });
    const png = await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', scale: 'css' });
    return { file, geometry, errors, png };
  } catch (error) {
    await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', scale: 'css' }).catch(() => {});
    return { file, failure: String(error.message).replaceAll(origin, 'ORIGIN').split('\n').slice(0, 8).join('\n'), errors };
  } finally {
    await context.close();
  }
}

const { values } = parseArgs({ options: {
  reference: { type: 'string' }, before: { type: 'string' }, candidate: { type: 'string' },
  output: { type: 'string' }, case: { type: 'string', multiple: true },
  chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
} });
assert(values.reference && values.candidate && values.output, 'Informe --reference, --candidate e --output.');
const selected = scenarios.filter((scenario) => !values.case || values.case.includes(scenario.id));
assert(selected.length, 'Nenhum cenário selecionado.');
const builds = [['reference', values.reference], ['before', values.before], ['candidate', values.candidate]]
  .filter(([, path]) => path);
await mkdir(values.output, { recursive: true });
const proxy = await denyProxy();
const servers = [];
let browser;
try {
  for (const [, path] of builds) servers.push(await serve(path));
  const report = [];
  for (const scenario of selected) {
    browser = await launchBrowser(values.chrome, proxy);
    for (const size of Object.keys(widths)) {
      for (const theme of scenario.id === 'bell' || scenario.id === 'navigation' ? ['day', 'night'] : ['day']) {
        const captures = [];
        for (let index = 0; index < builds.length; index++) {
          const [build] = builds[index];
          captures.push(await capture({ browser, origin: servers[index].origin, scenario, size, theme, output: values.output, build }));
        }
        const candidate = captures.at(-1);
        const views = Object.fromEntries(await Promise.all(captures.map(async ({ png, ...capture }, index) => {
          const build = builds[index][0];
          if (build === 'candidate' || !png || !candidate.png) return [build, capture];
          const { overlay, ...diff } = comparePixels(png, candidate.png);
          if (!overlay) return [build, { ...capture, pixelsVersusCandidate: diff }];
          const diffFile = join(values.output, `diff-${build}-${scenario.id}-${size}-${theme}.png`);
          await writeFile(diffFile, overlay);
          return [build, { ...capture, pixelsVersusCandidate: { ...diff, file: diffFile } }];
        })));
        report.push({ scenario: scenario.id, size, theme, views });
      }
    }
    await closeBrowser(browser);
    browser = undefined;
    await writeFile(join(values.output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ states: report.length, builds: builds.map(([name]) => name), pixelThreshold: threshold, output: values.output }));
  if (report.some(({ scenario, views }) => views.candidate.failure || views.candidate.errors.length
    || (['timers-overflow', 'navigation', 'bell'].includes(scenario) && (
      !views.candidate.geometry?.hit || !views.candidate.geometry?.viewportFit
    )))) process.exitCode = 1;
} finally {
  servers.forEach((server) => server.close());
  proxy.close();
  await closeBrowser(browser);
}
