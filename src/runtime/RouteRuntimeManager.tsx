import { useEffect } from 'react';
import { useLocation } from '../hooks/useLocation';
import { activateRoute } from './routeActivity';

const installed = new Set<string>();

function once(key: string, task: () => Promise<void>) {
  if (installed.has(key)) return;
  installed.add(key);
  void task().catch((error) => {
    installed.delete(key);
    console.error(`[runtime:${key}]`, error);
  });
}

function installReports() {
  once('reports', async () => {
    const [pdf, dedup, tracking, governance, toolbar, withdrawal] = await Promise.all([
      import('./reports/reportsPdfRuntime'),
      import('./reports/reportsDedupRuntime'),
      import('./reports/reportClientTrackingRuntime'),
      import('./reports/reportWorkflowGovernance'),
      import('./reports/reportToolbarDedupe'),
      import('./reports/reportWithdrawalRuntime'),
    ]);
    pdf.installReportsPdfRuntime();
    dedup.installReportsDedupRuntime();
    tracking.installReportClientTrackingRuntime();
    governance.installReportWorkflowGovernance();
    toolbar.installReportToolbarDedupe();
    withdrawal.installReportWithdrawalRuntime();
  });
}

function installCalendar() {
  once('calendar', async () => {
    const [google, guard, scheduling, policy] = await Promise.all([
      import('./calendar/googleCalendarRuntime'),
      import('./calendar/calendarSyncGuard'),
      import('./calendar/schedulingRequestsRuntime'),
      import('./calendar/schedulingPolicyLoader'),
    ]);
    google.installGoogleCalendarRuntime();
    guard.installCalendarSyncGuard();
    scheduling.installSchedulingRequestsRuntime();
    policy.installSchedulingPolicyLoader();
  });
}

function installRecords() {
  once('records', async () => {
    const [experience, controls, scroll, operations, closure] = await Promise.all([
      import('./records/recordsExperienceRuntime'),
      import('./records/recordsMessageControlsRuntime'),
      import('./records/recordsConversationScrollGuard'),
      import('./records/recordsOperationsRuntime'),
      import('./records/recordsClosureExperienceRuntime'),
    ]);
    experience.installRecordsExperienceRuntime();
    controls.installRecordsMessageControlsRuntime();
    scroll.installRecordsConversationScrollGuard();
    operations.installRecordsOperationsRuntime();
    closure.installRecordsClosureExperienceRuntime();
  });
}

function installProjects() {
  once('projects', async () => {
    const [chat, planning, deadlines, workflow, rules, portfolio, lifecycle, recalc] = await Promise.all([
      import('./projects/deliverableChatStandardRuntime'),
      import('./projects/projectsPlanningIntelligenceRuntime'),
      import('./projects/projectsDeadlineAutofillRuntime'),
      import('./projects/projectApprovalWorkflowRuntime'),
      import('./projects/projectApprovalRulesRuntime'),
      import('./projects/projectsClientPortfolioRuntime'),
      import('./projects/projectExecutionLifecycleRuntime'),
      import('./projects/projectLifecycleRecalculation'),
    ]);
    chat.installDeliverableChatStandardRuntime();
    planning.installProjectsPlanningIntelligenceRuntime();
    deadlines.installProjectsDeadlineAutofillRuntime();
    workflow.installProjectApprovalWorkflowRuntime();
    rules.installProjectApprovalRulesRuntime();
    portfolio.installProjectsClientPortfolioRuntime();
    lifecycle.installProjectExecutionLifecycleRuntime();
    recalc.installProjectLifecycleRecalculation();
  });
}

function installHours() {
  once('hours', async () => {
    const mod = await import('./hours/hoursCompanyLogoRuntime');
    mod.installHoursCompanyLogoRuntime();
  });
}

function installMap() {
  once('people-map', async () => {
    const auth = await import('./people-map/authBridge');
    auth.installMapaAuthBridge();
  });
}

export function RouteRuntimeManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    activateRoute(pathname);
    const timer = window.setTimeout(() => {
      if (pathname.includes('/relatorios')) installReports();
      if (pathname === '/admin/calendario' || pathname === '/cliente/cronograma') installCalendar();
      if (pathname.includes('/registros')) installRecords();
      if (pathname === '/admin/projetos' || pathname === '/cliente/entregaveis') installProjects();
      if (pathname.includes('/horas')) installHours();
      if (pathname.includes('/mapa-de-people')) installMap();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      activateRoute('');
    };
  }, [pathname]);

  return null;
}
