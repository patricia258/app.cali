'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { projectId, tables } = require('./fixtures.cjs');

const secondProject = {
  ...tables.projects[0],
  id: '33333334-3333-4333-8333-333333333333',
  protocol: 'CALI-PRJ-QA-0002',
  name: 'Segundo projeto QA',
};
const direct = '/admin/projetos?deliverable=44444443-4444-4444-8444-444444444444&project=' + projectId;
const fixtureOrigin = 'https://cali-local-qa.supabase.co';

browserSuite([
  {
    id: 'project-history-refresh-is-scoped-to-project-and-period',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const reads = [];
      await page.clock.install({ time: new Date('2026-11-12T12:30:00Z') });
      await context.route(
        (url) => url.origin === fixtureOrigin && url.pathname === '/rest/v1/projects',
        (route) => {
          const request = route.request();
          if (request.method() !== 'GET') return route.fallback();
          const protocol = new URL(request.url()).searchParams.get('protocol');
          const projects = [...tables.projects, secondProject].filter(
            (project) => !protocol || protocol === 'eq.' + project.protocol,
          );
          const single = request.headers().accept?.includes('vnd.pgrst.object');
          return route.fulfill({
            headers: { 'access-control-allow-origin': origin },
            json: single ? projects[0] : projects,
          });
        },
      );
      await context.route(
        (url) => url.origin === fixtureOrigin && url.pathname === '/rest/v1/deliverable_delivery_performance',
        (route) => {
          const request = route.request();
          if (request.method() !== 'GET') return route.fallback();
          const project = new URL(request.url()).searchParams.get('project_id').slice(3);
          reads.push(project);
          return route.fulfill({
            headers: { 'access-control-allow-origin': origin },
            json: [
              {
                project_id: project,
                deliverable_id: 'qa-history',
                protocol: 'CALI-DEL-QA-HISTORY',
                title: project === projectId ? 'Entrega histórica QA A' : 'Entrega histórica QA B',
                status: 'approved',
                approved_at: '2026-11-10T12:00:00Z',
                completion_at: '2026-11-10T12:00:00Z',
                delivery_timing: 'on_time',
                start_timing: 'unknown',
                total_minutes: 30,
              },
            ],
          });
        },
      );
      await page.goto(origin + direct);
      const modal = page.getByRole('dialog', { name: 'Entrega QA C', exact: true });
      await modal.getByRole('button', { name: 'Visão geral', exact: true }).click();
      await modal.getByRole('heading', { name: 'Sobre esta entrega', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
      await page.getByRole('tab', { name: 'Histórico', exact: true }).click();
      await page.getByText('Entrega histórica QA A', { exact: true }).waitFor();
      await page.evaluate(() => {
        const root = document.querySelector('#root');
        for (let index = 0; index < 8; index++) root.classList.toggle('qa-unrelated-ui-mutation');
      });
      await page.clock.runFor(400);
      assert.deepEqual(reads, [projectId], 'Mutações da interface não devem reconsultar performance');

      await page.getByRole('combobox', { name: 'Projeto', exact: true }).selectOption(secondProject.id);
      const history = page.getByRole('tab', { name: 'Histórico', exact: true });
      if (!((await history.getAttribute('aria-selected')) === 'true')) await history.click();
      await page.getByText('Entrega histórica QA B', { exact: true }).waitFor();
      assert.deepEqual(reads, [projectId, secondProject.id]);
      await page.getByText('Entrega histórica QA A', { exact: true }).waitFor({ state: 'hidden' });
      const periodic = page.waitForResponse(
        (response) =>
          new URL(response.url()).searchParams.get('project_id') === 'eq.' + secondProject.id &&
          response.url().includes('/deliverable_delivery_performance'),
      );
      await page.clock.fastForward(10_050);
      await periodic;
      assert.deepEqual(reads, [projectId, secondProject.id, secondProject.id]);
      await snapshot('projeto-ativo');
      return { reads: reads.length, unrelatedReads: 0, periodicRefresh: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
