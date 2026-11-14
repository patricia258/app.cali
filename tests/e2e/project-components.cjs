'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, projectId, tables } = require('./fixtures.cjs');

const delivery = tables.deliverables.find((row) => row.title === 'Entrega QA C');
const host = 'https://cali-local-qa.supabase.co';
const where = (url, table) => url.origin === host && url.pathname === '/rest/v1/' + table;
const query = '?deliverable=' + delivery.id + '&project=' + projectId;

function reply(route, origin, rows) {
  const headers = { 'access-control-allow-origin': origin };
  return rows === undefined ? route.fulfill({ status: 204, headers }) : route.fulfill({ json: rows, headers });
}

async function openDelivery(page, origin, route = '/admin/projetos') {
  await page.goto(origin + route + query);
  const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
  await dialog.waitFor();
  return dialog;
}

browserSuite([
  {
    id: 'admin-deliverable-conversation-keeps-channel-and-draft-on-retry',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const rows = [...tables.comments];
      const writes = [];
      await context.route((url) => where(url, 'comments'), (route) => {
        const request = route.request();
        if (request.method() === 'GET') {
          const search = new URL(request.url()).searchParams;
          return reply(route, origin, rows.filter((item) => (!search.get('target_id') || search.get('target_id') === `eq.${item.target_id}`)
            && (!search.get('client_visible') || search.get('client_visible') === `eq.${item.client_visible}`)));
        }
        if (request.method() !== 'POST') return route.fallback();
        const item = request.postDataJSON();
        writes.push(item);
        if (writes.length === 1) return route.fulfill({ status: 409, json: { message: 'Falha de envio QA' }, headers: { 'access-control-allow-origin': origin } });
        rows.push({ ...item, id: 'qa-private-deliverable', created_at: '2026-11-12T15:00:00Z' });
        return reply(route, origin);
      });

      const dialog = await openDelivery(page, origin);
      await dialog.getByRole('button', { name: /^Conversas/ }).click();
      await dialog.getByText(tables.comments[0].body, { exact: true }).waitFor();
      const field = dialog.getByRole('textbox', { name: 'Mensagem', exact: true });
      await field.fill('Rascunho público QA');
      await dialog.getByRole('button', { name: 'Interno', exact: true }).click();
      await dialog.getByText('Nenhuma nota interna neste entregável.').waitFor();
      assert.equal(await field.inputValue(), '');
      await field.fill('Anotação privada QA');
      const send = dialog.getByRole('button', { name: 'Enviar', exact: true });
      await send.click();
      await dialog.getByRole('alert').getByText('Falha de envio QA').waitFor();
      assert.equal(await field.inputValue(), 'Anotação privada QA');
      await send.click();
      await dialog.getByText('Anotação privada QA', { exact: true }).waitFor();
      assert.deepEqual(writes.map(({ target_id, company_id, client_visible, body }) => [target_id, company_id, client_visible, body]),
        Array.from({ length: 2 }, () => [delivery.id, companyId, false, 'Anotação privada QA']));
      await dialog.getByRole('button', { name: 'Cliente', exact: true }).click();
      await dialog.getByText(tables.comments[0].body, { exact: true }).waitFor();
      assert.equal(await dialog.getByText('Anotação privada QA', { exact: true }).count(), 0);
      assert.equal(await field.inputValue(), 'Rascunho público QA');
      await snapshot('conversa-do-entregavel');
    },
  },
  {
    id: 'client-schedule-review-direct-entry-adjustment-and-approval',
    role: 'client',
    async run({ context, page, origin, snapshot }) {
      const project = { ...tables.projects[0], planning_status: 'client_review', roadmap_end_date: '2027-02-01' };
      const second = { ...project, id: '33333334-3333-4333-8333-333333333333', name: 'Projeto já aprovado', planning_status: 'approved' };
      const items = [
        { ...delivery, project_id: projectId, title: 'Entrega de origem QA', complexity: 'MC2', client_visible: true },
        { ...delivery, id: '44444447-4444-4444-8444-444444444447', project_id: projectId, title: 'Entrega incompatível QA', complexity: 'MC1', client_visible: true },
        { ...delivery, id: '44444448-4444-4444-8444-444444444448', project_id: projectId, title: 'Entrega de destino QA', complexity: 'MC2', client_visible: true },
      ];
      const review = { id: 'e5110000-0000-4000-8000-000000000003', project_id: projectId, request_number: 1, status: 'pending', requested_at: '2026-11-12T16:00:00Z' };
      const adjustments = [];
      const approvals = [];
      const reviewReads = [];
      let documentLoads = 0;
      page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads++; });

      await context.route((url) => where(url, 'projects'), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        const id = new URL(request.url()).searchParams.get('id');
        const projects = [project, second].filter((item) => !id || id === `eq.${item.id}`);
        return reply(route, origin, request.headers().accept?.includes('vnd.pgrst.object') ? projects[0] ?? null : projects);
      });
      await context.route((url) => where(url, 'deliverables'), (route) => {
        const id = new URL(route.request().url()).searchParams.get('project_id');
        return reply(route, origin, items.filter((item) => !id || id === `eq.${item.project_id}`));
      });
      await context.route((url) => where(url, 'project_review_requests'), (route) => {
        const id = new URL(route.request().url()).searchParams.get('project_id');
        reviewReads.push(id);
        return reply(route, origin, id === `eq.${projectId}` ? [review] : []);
      });
      await context.route((url) => where(url, 'rpc/client_request_project_schedule_adjustment_v39'), (route) => {
        adjustments.push(route.request().postDataJSON());
        if (adjustments.length === 1) {
          return route.fulfill({ status: 409, json: { message: 'Falha simulada no pedido.' }, headers: { 'access-control-allow-origin': origin } });
        }
        project.planning_status = 'adjustment_requested';
        Object.assign(review, { status: 'adjustment_requested', response_note: 'Trocar a ordem para a reunião QA.', requested_changes: {
          targetLabel: items[0].title, actionLabel: 'Trocar prioridade', swapTargetLabel: items[2].title,
        } });
        return reply(route, origin, null);
      });
      await context.route((url) => where(url, 'rpc/client_approve_project_schedule'), (route) => {
        approvals.push(route.request().postDataJSON());
        project.planning_status = 'approved';
        review.status = 'approved';
        return reply(route, origin, null);
      });

      await page.goto(origin + '/cliente/entregaveis?project=' + projectId);
      const heading = page.getByRole('heading', { name: 'Revise e confirme o cronograma', exact: true });
      const approve = page.getByRole('button', { name: 'Aprovar cronograma', exact: true });
      await heading.waitFor();
      await snapshot('revisao-direta');
      const projectPicker = page.getByRole('combobox', { name: 'Projeto', exact: true });
      await projectPicker.selectOption(second.id);
      await heading.waitFor({ state: 'hidden' });
      await projectPicker.selectOption(projectId);
      await heading.waitFor();
      const adjust = page.getByRole('button', { name: 'Solicitar ajuste', exact: true });
      await adjust.click();
      const dialog = page.getByRole('dialog', { name: 'Solicitar ajuste no cronograma', exact: true });
      await dialog.getByLabel('O que você quer ajustar?').selectOption('deliverable');
      await dialog.getByLabel('Entregável', { exact: true }).selectOption(items[0].id);
      await dialog.getByLabel('O que você quer mudar neste entregável?').selectOption('swap_order');
      const swap = dialog.getByLabel('Trocar a prioridade com');
      const reason = dialog.getByRole('textbox', { name: 'Explique o ajuste' });
      await reason.fill('  Trocar a ordem para a reunião QA.  ');
      await swap.selectOption(items[1].id);
      await dialog.getByText(/Só é possível trocar a prioridade/).waitFor();
      const send = dialog.getByRole('button', { name: 'Enviar pedido', exact: true });
      if (await send.isEnabled()) await send.click();
      assert.deepEqual(adjustments, []);
      await swap.selectOption(items[2].id);
      await send.click();
      await dialog.getByText('Falha simulada no pedido.', { exact: true }).waitFor();
      assert.equal((await reason.inputValue()).trim(), 'Trocar a ordem para a reunião QA.');
      await send.click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByText('A CALI está analisando sua solicitação', { exact: true }).waitFor();
      assert.equal(await approve.count(), 0);
      assert.deepEqual(adjustments, Array(2).fill({ p_project_id: projectId, p_target_type: 'deliverable', p_target_id: items[0].id,
        p_reason: 'Trocar a ordem para a reunião QA.', p_priority: null, p_action: 'swap_order', p_requested_date: null, p_swap_target_id: items[2].id }));
      assert.equal(documentLoads, 1);

      project.planning_status = 'client_review';
      review.status = 'pending';
      review.request_number = 2;
      await page.reload();
      await approve.click();
      const approval = page.getByRole('dialog', { name: 'Aprovar cronograma', exact: true });
      await approval.getByRole('button', { name: 'Voltar', exact: true }).click();
      await approval.waitFor({ state: 'hidden' });
      assert.deepEqual(approvals, []);
      await approve.click();
      await approval.getByRole('button', { name: 'Aprovar cronograma', exact: true }).click();
      await approval.waitFor({ state: 'hidden' });
      await heading.waitFor({ state: 'hidden' });
      assert.deepEqual(approvals, [{ p_project_id: projectId }]);
      assert.equal(documentLoads, 2);
      assert.ok(reviewReads.length && reviewReads.every((id) => id === `eq.${projectId}` || id === `eq.${second.id}`));
    },
  },
  {
    id: 'admin-project-kanban-moves-by-id-and-keeps-approval-locked',
    role: 'admin',
    async run({ context, page, origin }) {
      const moved = { ...delivery, status: 'not_started' };
      const approved = { ...tables.deliverables.find((item) => item.id !== moved.id), status: 'approved' };
      const writes = [];
      await context.route((url) => where(url, 'deliverables'), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        const id = new URL(request.url()).searchParams.get('id');
        const rows = [moved, approved].filter((item) => !id || id === `eq.${item.id}`);
        return reply(route, origin, request.headers().accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows);
      });
      await context.route((url) => where(url, 'rpc/change_deliverable_review_status_v2'), (route) => {
        const payload = route.request().postDataJSON();
        writes.push(payload);
        moved.status = payload.p_status;
        return reply(route, origin, null);
      });
      await page.goto(origin + '/admin/projetos?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      await page.getByRole('button', { name: 'Kanban', exact: true }).click();
      const inProgress = page.locator('[data-project-kanban-column="in_progress"]');
      const first = page.locator('[data-project-kanban-column="not_started"]').getByRole('button', { name: new RegExp(moved.title) });
      const locked = page.locator('[data-project-kanban-column="approved"]').getByRole('button', { name: new RegExp(approved.title) });
      assert.equal(await locked.getAttribute('draggable'), 'false');
      await first.dragTo(inProgress);
      await inProgress.getByRole('button', { name: new RegExp(moved.title) }).waitFor();
      assert.deepEqual(writes, [{ p_deliverable_id: moved.id, p_status: 'in_progress', p_note: null, p_review_revision: moved.review_revision }]);
      assert.equal(await page.getByRole('dialog').count(), 0);
    },
  },
  {
    id: 'client-project-lifecycle-follows-the-selected-project',
    role: 'client',
    async run({ context, page, origin }) {
      const paused = { ...tables.projects[0], execution_status: 'paused', lifecycle_reason: 'Projeto interrompido em QA.' };
      const normal = { ...tables.projects[0], id: '33333334-3333-4333-8333-333333333333', name: 'Projeto sem interrupções QA', execution_status: 'normal' };
      const eventReads = [];
      await context.route((url) => where(url, 'projects'), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        const id = new URL(request.url()).searchParams.get('id');
        const projects = [paused, normal].filter((item) => !id || id === `eq.${item.id}`);
        return reply(route, origin, request.headers().accept?.includes('vnd.pgrst.object') ? projects[0] ?? null : projects);
      });
      await context.route((url) => where(url, 'project_lifecycle_events'), (route) => {
        const params = new URL(route.request().url()).searchParams;
        assert.equal(params.get('company_id'), `eq.${companyId}`);
        assert.equal(params.get('client_visible'), 'eq.true');
        eventReads.push(params.get('project_id'));
        return reply(route, origin, []);
      });
      await page.goto(origin + '/cliente/entregaveis?project=' + projectId);
      const banner = page.getByRole('region', { name: 'Atualização do projeto' });
      await banner.getByText('Projeto pausado pela CALI', { exact: true }).waitFor();
      await banner.getByText(/Projeto interrompido em QA/).waitFor();
      const projects = page.getByRole('combobox', { name: 'Projeto', exact: true });
      await projects.selectOption(normal.id);
      await banner.waitFor({ state: 'hidden' });
      await projects.selectOption(projectId);
      await banner.waitFor();
      assert.deepEqual(new Set(eventReads), new Set([`eq.${projectId}`, `eq.${normal.id}`]));
    },
  },
  {
    id: 'admin-project-lifecycle-pause-and-resume-by-selected-project',
    role: 'admin',
    async run({ context, page, origin }) {
      const project = { ...tables.projects[0], protocol: 'CALI-PRJ-QA-0001' };
      const hold = {
        id: 'e5110000-0000-4000-8000-000000000009', project_id: projectId, company_id: companyId,
        scope_type: 'project', scope_id: null, scope_label: project.name, action: 'pause',
        reason: 'Aguardando validação QA.', resume_date: '2026-12-10', created_at: '2026-11-12T16:00:00Z', resolved_at: null,
      };
      let events = [];
      const writes = [];
      let documentLoads = 0;
      page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads++; });
      await context.route((url) => where(url, 'projects'), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        return reply(route, origin, request.headers().accept?.includes('vnd.pgrst.object') ? project : [project]);
      });
      await context.route((url) => where(url, 'project_lifecycle_events'), (route) => {
        assert.equal(new URL(route.request().url()).searchParams.get('project_id'), `eq.${projectId}`);
        return reply(route, origin, events);
      });
      await context.route((url) => where(url, 'rpc/admin_set_project_lifecycle_v44'), (route) => {
        const payload = route.request().postDataJSON();
        writes.push(payload);
        if (writes.length === 1) return route.fulfill({ status: 409, json: { message: 'Falha simulada na pausa.' }, headers: { 'access-control-allow-origin': origin } });
        const paused = payload.p_action === 'pause';
        Object.assign(project, { execution_status: paused ? 'paused' : 'normal', lifecycle_reason: paused ? hold.reason : null, lifecycle_resume_date: paused ? hold.resume_date : null });
        events = paused ? [hold] : [];
        return reply(route, origin, null);
      });
      await page.goto(origin + '/admin/projetos?project=' + projectId);
      await page.getByRole('button', { name: 'Gerenciar projeto', exact: true }).click();
      const manager = page.getByRole('dialog', { name: 'Gerenciar projeto', exact: true });
      await manager.getByLabel('Motivo principal', { exact: true }).selectOption({ label: 'Outro motivo' });
      const details = manager.getByRole('textbox', { name: 'Justificativa / mensagem ao cliente' });
      await details.fill(' Aguardando validação QA. ');
      await manager.getByLabel('Previsão de retomada (opcional)', { exact: true }).fill(hold.resume_date);
      const apply = manager.getByRole('button', { name: 'Aplicar ação', exact: true });
      await apply.click();
      await manager.getByRole('alert').filter({ hasText: 'Falha simulada na pausa.' }).waitFor();
      assert.match(await details.inputValue(), /Aguardando validação QA/);
      await apply.click();
      await manager.waitFor({ state: 'hidden' });
      const banner = page.getByRole('region', { name: 'Controle de execução' });
      await banner.getByText('Projeto pausado', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Gerenciar projeto', exact: true }).click();
      await manager.getByRole('button', { name: 'Retomar', exact: true }).click();
      const resume = page.getByRole('dialog', { name: 'Retomar projeto', exact: true });
      await resume.getByRole('textbox', { name: 'Mensagem de retomada ao cliente' }).fill(' Validação concluída. ');
      await resume.getByRole('button', { name: 'Retomar e recalcular', exact: true }).click();
      await resume.waitFor({ state: 'hidden' });
      await banner.waitFor({ state: 'hidden' });
      const pause = { p_project_id: projectId, p_action: 'pause', p_scope_type: 'project', p_scope_id: null,
        p_reason: 'Outro motivo — Aguardando validação QA.', p_resume_date: hold.resume_date };
      assert.deepEqual(writes, [pause, pause, { ...pause, p_action: 'resume', p_reason: 'Validação concluída.', p_resume_date: null }]);
      assert.equal(documentLoads, 1);
    },
  },
  {
    id: 'staff-project-deep-link-highlights-requested-task',
    role: 'partner',
    async run({ page, origin }) {
      const task = tables.deliverable_tasks.find((row) => row.deliverable_id === delivery.id && row.status !== 'cancelled');
      assert(task, 'A fixture precisa ter uma subtarefa no entregável');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + '/equipe/projetos' + query + '&view=overview&task=' + task.id);
      const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
      await dialog.waitFor();
      const tabs = dialog.getByRole('navigation', { name: 'Detalhes da entrega' });
      await tabs.getByRole('button', { name: /^Subtarefas/, pressed: true }).waitFor();
      const status = dialog.getByRole('combobox', { name: 'Status de ' + delivery.title, exact: true });
      await status.waitFor();
      const statusStyle = await status.evaluate((element) => {
        const control = getComputedStyle(element);
        return {
          background: control.backgroundColor,
          badgeBackground: getComputedStyle(element.parentElement).backgroundColor,
          color: control.color,
          label: element.selectedOptions[0]?.textContent,
        };
      });
      assert.equal(statusStyle.background, 'rgba(0, 0, 0, 0)');
      assert.equal(statusStyle.badgeBackground, 'rgb(217, 138, 43)');
      assert.equal(statusStyle.color, 'rgb(255, 255, 255)');
      assert.match(statusStyle.label || '', /Aguardando cliente/);
      assert.equal(await tabs.getByRole('button').count(), 5);
      assert.ok(await tabs.evaluate((element) => element.scrollWidth <= element.clientWidth));
      const highlighted = dialog.locator('article[data-highlighted=true]');
      const title = highlighted.getByText(task.title, { exact: true });
      await title.waitFor();
      assert.ok(await title.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 60 && bounds.right <= document.documentElement.clientWidth;
      }));
      assert.equal(await dialog.getByRole('heading', { name: 'Sobre esta entrega' }).count(), 0);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('tab', { name: 'Entregáveis', exact: true, selected: true }).waitFor();
    },
  },
  {
    id: 'global-timer-opens-project-task-by-id',
    role: 'admin',
    async run({ context, page, origin }) {
      const task = tables.deliverable_tasks.find((row) => row.deliverable_id === delivery.id && row.status !== 'cancelled');
      assert(task);
      const timer = {
        id: 'e7110000-0000-4000-8000-000000000001', company_id: companyId, project_id: projectId,
        deliverable_id: delivery.id, task_id: task.id, started_at: '2026-11-12T12:00:00Z', status: 'active', paused_seconds: 0,
      };
      await context.route((url) => where(url, 'work_timers'), (route) => reply(route, origin, [timer]));
      await page.goto(origin + '/admin');
      const open = page.getByTitle('Abrir origem do timer', { exact: true });
      const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
      const highlighted = dialog.locator('article[data-highlighted=true]');
      await open.click();
      await highlighted.getByText(task.title, { exact: true }).waitFor();
      const link = new URL(page.url());
      assert.equal(link.pathname, '/admin/projetos');
      assert.equal(link.searchParams.get('project'), projectId);
      assert.equal(link.searchParams.get('deliverable'), delivery.id);
      assert.equal(link.searchParams.get('task'), task.id);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await open.click();
      await highlighted.getByText(task.title, { exact: true }).waitFor();
    },
  },
  {
    id: 'admin-schedule-review-decision-and-reminder',
    role: 'admin',
    async run({ context, page, origin }) {
      const project = { ...tables.projects[0], planning_status: 'adjustment_requested' };
      const review = {
        id: 'e5110000-0000-4000-8000-000000000001', project_id: projectId, request_number: 1,
        status: 'adjustment_requested', response_note: 'Antecipar para a reunião QA.', requested_at: '2026-11-12T16:00:00Z',
        response_due_at: '2026-11-16T16:00:00Z', requested_changes: { targetLabel: 'Marco QA', actionLabel: 'Alterar a data' },
      };
      const decisions = [];
      const reminders = [];
      await context.route((url) => where(url, 'projects'), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        return reply(route, origin, request.headers().accept?.includes('vnd.pgrst.object') ? project : [project]);
      });
      await context.route((url) => where(url, 'project_review_requests'), (route) => {
        assert.equal(new URL(route.request().url()).searchParams.get('project_id'), 'eq.' + projectId);
        return reply(route, origin, [review]);
      });
      await context.route((url) => where(url, 'rpc/admin_resolve_project_schedule_adjustment'), (route) => {
        decisions.push(route.request().postDataJSON());
        if (decisions.length === 1) {
          return route.fulfill({ status: 409, json: { message: 'Falha simulada na decisão.' }, headers: { 'access-control-allow-origin': origin } });
        }
        project.planning_status = 'client_review';
        review.status = 'pending';
        review.request_number = 2;
        return reply(route, origin, null);
      });
      await context.route((url) => where(url, 'rpc/notify_workspace_movement'), (route) => {
        reminders.push(route.request().postDataJSON());
        return reply(route, origin, null);
      });

      await page.goto(origin + '/admin/projetos?project=' + projectId);
      await page.getByText('AJUSTE SOLICITADO · 1/2', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Acolher solicitação', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Acolher pedido de ajuste', exact: true });
      const submit = dialog.getByRole('button', { name: 'Enviar decisão', exact: true });
      assert.equal(await submit.isDisabled(), true);
      await dialog.getByRole('textbox', { name: 'Justificativa da decisão' }).fill('  Alteração aprovada em QA.  ');
      await submit.click();
      await dialog.getByRole('alert').filter({ hasText: 'Falha simulada na decisão.' }).waitFor();
      await submit.click();
      await dialog.waitFor({ state: 'hidden' });
      const decision = { p_review_id: review.id, p_accept: true, p_justification: 'Alteração aprovada em QA.' };
      assert.deepEqual(decisions, [decision, decision]);
      await page.getByRole('button', { name: 'Lembrar cliente', exact: true }).click();
      const reminder = page.getByRole('dialog', { name: 'Enviar lembrete ao cliente', exact: true });
      await reminder.getByRole('button', { name: 'Enviar lembrete', exact: true }).click();
      await reminder.waitFor({ state: 'hidden' });
      await page.getByText('Lembrete enviado ao cliente.', { exact: true }).waitFor();
      assert.equal(reminders.length, 1);
      assert.equal(reminders[0].p_entity_id, projectId);
      assert.equal(reminders[0].p_company_id, companyId);
      assert.equal(reminders[0].p_email_required, true);
    },
  },
  {
    id: 'project-internal-note-lifecycle-and-client-scope',
    role: 'admin',
    async run({ context, page, origin, snapshot, openActor }) {
      const noteId = 'e5110000-0000-4000-8000-000000000001';
      let note;
      const operations = [];
      await context.route((url) => where(url, 'note_entries'), (route) => {
        const request = route.request();
        const params = new URL(request.url()).searchParams;
        if (request.method() === 'GET') {
          assert.equal(params.get('deliverable_id'), 'eq.' + delivery.id);
          assert.equal(params.get('task_id'), 'is.null');
          return reply(route, origin, note ? [note] : []);
        }
        if (request.method() === 'POST') {
          const data = request.postDataJSON();
          assert.equal(data.deliverable_id, delivery.id);
          assert.equal(data.company_id, companyId);
          assert.equal(data.task_id, null);
          operations.push(['add', data.body]);
          note = { ...data, id: noteId, created_at: '2026-11-12T16:00:00Z' };
          return reply(route, origin);
        }
        if (request.method() === 'PATCH') {
          assert.equal(params.get('id'), 'eq.' + noteId);
          const { body } = request.postDataJSON();
          operations.push(['edit', body]);
          note.body = body;
          return reply(route, origin);
        }
        if (request.method() === 'DELETE') {
          assert.equal(params.get('id'), 'eq.' + noteId);
          operations.push(['delete', note.body]);
          note = undefined;
          return reply(route, origin);
        }
        return route.fallback();
      });

      const dialog = await openDelivery(page, origin);
      await dialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      const notes = dialog.getByRole('region', { name: 'Notas internas', exact: true });
      await notes.getByText('Nenhuma nota gravada ainda.').waitFor();
      const create = notes.getByRole('textbox', { name: 'Nova nota interna' });
      const add = notes.getByRole('button', { name: 'Adicionar nota' });
      assert.equal(await add.isDisabled(), true);
      await create.fill('  Nota sintética interna.  ');
      await add.click();
      await notes.getByText('Nota sintética interna.', { exact: true }).waitFor();
      await notes.getByRole('button', { name: 'Editar nota' }).press('Enter');
      const edit = notes.getByRole('textbox', { name: 'Editar nota interna' });
      assert.equal(await edit.evaluate((element) => element === document.activeElement), true);
      await edit.fill('Nota revisada de QA.');
      await notes.getByRole('button', { name: 'Salvar' }).click();
      await notes.getByText('Nota revisada de QA.', { exact: true }).waitFor();
      await snapshot('admin-nota-interna', notes);

      const client = await openActor('client');
      const privateReads = [];
      await client.context.route((url) => where(url, 'note_entries'), (route) => {
        privateReads.push(route.request().method());
        return route.fallback();
      });
      const clientDialog = await openDelivery(client.page, origin, '/cliente/entregaveis');
      await clientDialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      await clientDialog.getByRole('heading', { name: 'Sobre esta entrega' }).waitFor();
      assert.deepEqual(privateReads, []);
      assert.equal(await clientDialog.getByText('Nota revisada de QA.').count(), 0);

      await notes.getByRole('button', { name: 'Excluir nota' }).click();
      await notes.getByRole('button', { name: 'Manter' }).click();
      assert.deepEqual(operations, [['add', 'Nota sintética interna.'], ['edit', 'Nota revisada de QA.']]);
      await notes.getByRole('button', { name: 'Excluir nota' }).click();
      await notes.getByRole('button', { name: 'Excluir', exact: true }).click();
      await notes.getByText('Nenhuma nota gravada ainda.').waitFor();
      assert.deepEqual(operations.at(-1), ['delete', 'Nota revisada de QA.']);
    },
  },
  {
    id: 'project-deliverable-file-release-rename-and-suspend',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const id = 'e5220000-0000-4000-8000-000000000001';
      const path = companyId + '/entregaveis/qa.pdf';
      const token = '[[arquivo|' + encodeURIComponent('Rascunho QA.pdf') + '|' + encodeURIComponent(path) + '|application%2Fpdf|2048]]';
      const file = { id, storage_path: path, status: 'draft', title: 'Título inicial QA' };
      const writes = [];
      let releaseRename;
      const renameGate = new Promise((resolve) => { releaseRename = resolve; });
      await context.route((url) => where(url, 'comments') && url.searchParams.get('select') === 'body,created_at', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return reply(route, origin, [{ body: token, created_at: '2026-11-12T16:00:00Z' }]);
      });
      await context.route((url) => where(url, 'files'), async (route) => {
        const request = route.request();
        const params = new URL(request.url()).searchParams;
        if (request.method() === 'GET' && params.get('select') === 'id,storage_path,status,title') {
          assert.equal(params.get('deliverable_id'), 'eq.' + delivery.id);
          return reply(route, origin, [file]);
        }
        if (request.method() === 'PATCH') {
          assert.equal(params.get('id'), 'eq.' + id);
          const data = request.postDataJSON();
          writes.push(data);
          if ('title' in data) await renameGate;
          Object.assign(file, data);
          return reply(route, origin);
        }
        return route.fallback();
      });
      const dialog = await openDelivery(page, origin);
      await dialog.getByRole('button', { name: 'Arquivos', exact: true }).click();
      const files = dialog.getByRole('region', { name: 'Pasta do entregável' });
      await files.getByText('Aguardando liberação da Patricia').waitFor();
      await files.getByRole('button', { name: 'Liberar para o cliente', exact: true }).click();
      await files.getByText('Liberado ao cliente').waitFor();
      assert.equal(writes[0].status, 'published');
      assert.equal(writes[0].client_visible, true);
      await files.getByRole('button', { name: 'Renomear', exact: true }).click();
      const name = files.getByRole('textbox', { name: 'Nome do documento para o cliente' });
      await name.fill('Rascunho cancelado');
      await name.press('Escape');
      await name.waitFor({ state: 'detached' });
      await dialog.waitFor();
      assert.equal(await files.getByRole('button', { name: 'Renomear', exact: true }).evaluate((element) => element === document.activeElement), true);
      assert.equal(writes.length, 1);
      await files.getByRole('button', { name: 'Renomear', exact: true }).click();
      await name.fill('  PDF de QA aprovado  ');
      await name.press('Enter');
      await files.getByRole('button', { name: 'Salvando nome' }).waitFor();
      assert.equal(await name.isDisabled(), true);
      await name.dispatchEvent('keydown', { key: 'Enter', bubbles: true });
      releaseRename();
      await files.getByText('O cliente vê como: PDF de QA aprovado').waitFor();
      await snapshot('arquivo-liberado', files);
      await files.getByRole('button', { name: 'Suspender', exact: true }).click();
      await files.getByText('Suspenso', { exact: true }).waitFor();
      assert.deepEqual(writes.slice(1), [{ title: 'PDF de QA aprovado' }, { status: 'archived', client_visible: false }]);
    },
  },
  {
    id: 'client-deliverable-list-keeps-title-and-deadline-visible-on-mobile',
    role: 'client',
    async run({ page, origin, snapshot }) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + '/cliente/entregaveis?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();

      const openDelivery = page.getByRole('button', { name: 'Abrir ' + delivery.title, exact: true });
      const row = openDelivery.locator('..');
      const title = openDelivery.getByText(delivery.title, { exact: true });
      const status = row.getByText('Aguardando você', { exact: true });
      const due = row.getByText(/20 de out de 2026/);
      await title.waitFor();
      await status.waitFor();
      await due.waitFor();

      const [rowBounds, titleBounds, statusBounds, dueBounds] = await Promise.all([
        row.boundingBox(), title.boundingBox(), status.boundingBox(), due.boundingBox(),
      ]);
      assert.ok(rowBounds && titleBounds && statusBounds && dueBounds);
      for (const bounds of [titleBounds, statusBounds, dueBounds]) {
        assert.ok(bounds.x >= rowBounds.x && bounds.x + bounds.width <= rowBounds.x + rowBounds.width);
        assert.ok(bounds.x + bounds.width <= 390);
      }
      assert.ok(titleBounds.y + titleBounds.height <= statusBounds.y);
      await snapshot('entregaveis-em-390px', row);

      await openDelivery.press('Enter');
      await page.getByRole('dialog', { name: delivery.title, exact: true }).waitFor();
    },
  },
  {
    id: 'client-subtask-keyboard-and-message-retry',
    role: 'client',
    async run({ context, page, origin, snapshot }) {
      const task = tables.deliverable_tasks.find((row) => row.title === 'Validação do cliente QA');
      const messages = [];
      const writes = [];
      await context.route((url) => where(url, 'task_messages'), (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const params = new URL(route.request().url()).searchParams;
        assert.equal(params.get('task_id'), 'eq.' + task.id);
        assert.equal(params.get('client_visible'), 'eq.true');
        return reply(route, origin, messages);
      });
      await context.route((url) => where(url, 'rpc/client_post_task_message'), (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        const data = route.request().postDataJSON();
        writes.push(data);
        const headers = { 'access-control-allow-origin': origin };
        if (writes.length === 1) return route.fulfill({ status: 503, json: { message: 'Mensagem temporariamente indisponível.' }, headers });
        messages.push({ id: 'qa-task-message', author_role: 'client', body: data.p_body, created_at: '2026-11-12T16:00:00Z' });
        return route.fulfill({ json: null, headers });
      });
      await page.goto(origin + '/cliente/entregaveis?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      const row = page.getByRole('button', { name: /Validação do cliente QA/ });
      await row.press('Space');
      const subtask = page.getByRole('dialog', { name: 'Subtarefa Validação do cliente QA' });
      await subtask.waitFor();
      const field = subtask.getByRole('textbox', { name: 'Mensagem para a CALI' });
      await field.fill('Mensagem sintética de QA.');
      await field.dispatchEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true });
      await field.press('Shift+Enter');
      assert.deepEqual(writes, []);
      await field.press('Enter');
      await subtask.getByRole('alert').filter({ hasText: 'Mensagem temporariamente indisponível.' }).waitFor();
      assert.equal((await field.inputValue()).trim(), 'Mensagem sintética de QA.');
      await subtask.getByRole('button', { name: 'Enviar', exact: true }).waitFor();
      await field.press('Enter');
      await subtask.getByRole('log', { name: 'Mensagens da subtarefa' }).getByText('Mensagem sintética de QA.', { exact: true }).waitFor();
      assert.equal(await field.inputValue(), '');
      assert.equal(await subtask.getByRole('alert').count(), 0);
      assert.deepEqual(writes, Array(2).fill({ p_task_id: task.id, p_body: 'Mensagem sintética de QA.' }));
      await snapshot('conversa-da-subtarefa', subtask);
      await page.keyboard.press('Escape');
      await subtask.waitFor({ state: 'detached' });
      assert.equal(await row.evaluate((element) => element === document.activeElement), true);
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
