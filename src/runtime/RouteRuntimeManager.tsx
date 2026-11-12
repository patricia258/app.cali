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
      import('./reports/reportClientTrackingRuntimeV55'),
      import('./reports/reportWorkflowGovernanceV61'),
      import('./reports/reportToolbarDedupeV18'),
      import('./reports/reportWithdrawalRuntimeV62'),
    ]);
    pdf.installReportsPdfRuntime();
    dedup.installReportsDedupRuntime();
    tracking.installReportClientTrackingRuntimeV55();
    governance.installReportWorkflowGovernanceV61();
    toolbar.installReportToolbarDedupeV18();
    withdrawal.installReportWithdrawalRuntimeV62();
  });
}

function installCalendar() {
  once('calendar', async () => {
    const [google, guard, scheduling, policy] = await Promise.all([
      import('./calendar/googleCalendarRuntime'),
      import('./calendar/calendarSyncGuard'),
      import('./calendar/schedulingRequestsRuntimeV65'),
      import('./calendar/schedulingPolicyLoaderV68'),
    ]);
    google.installGoogleCalendarRuntime();
    guard.installCalendarSyncGuard();
    scheduling.installSchedulingRequestsRuntimeV65();
    policy.installSchedulingPolicyLoaderV68();
  });
}

function installRecords() {
  once('records', async () => {
    const [experience, controls, scroll, operations, closure] = await Promise.all([
      import('./records/recordsExperienceRuntimeV2'),
      import('./records/recordsMessageControlsRuntime'),
      import('./records/recordsConversationScrollGuard'),
      import('./records/recordsOperationsRuntimeV25'),
      import('./records/recordsClosureExperienceRuntimeV29'),
    ]);
    experience.installRecordsExperienceRuntimeV2();
    controls.installRecordsMessageControlsRuntime();
    scroll.installRecordsConversationScrollGuard();
    operations.installRecordsOperationsRuntimeV25();
    closure.installRecordsClosureExperienceRuntimeV29();
  });
}

function installProjects() {
  once('projects', async () => {
    const [chat, planning, deadlines, workflow, rules, portfolio, lifecycle, recalc] = await Promise.all([
      import('./projects/deliverableChatStandardRuntimeV35'),
      import('./projects/projectsPlanningIntelligenceRuntimeV36'),
      import('./projects/projectsDeadlineAutofillRuntimeV37'),
      import('./projects/projectApprovalWorkflowRuntimeV38'),
      import('./projects/projectApprovalRulesRuntimeV39'),
      import('./projects/projectsClientPortfolioRuntimeV39'),
      import('./projects/projectExecutionLifecycleRuntimeV44'),
      import('./projects/projectLifecycleRecalcUxV45'),
    ]);
    chat.installDeliverableChatStandardRuntimeV35();
    planning.installProjectsPlanningIntelligenceRuntimeV36();
    deadlines.installProjectsDeadlineAutofillRuntimeV37();
    workflow.installProjectApprovalWorkflowRuntimeV38();
    rules.installProjectApprovalRulesRuntimeV39();
    portfolio.installProjectsClientPortfolioRuntimeV39();
    lifecycle.installProjectExecutionLifecycleRuntimeV44();
    recalc.installProjectLifecycleRecalcUxV45();
  });
}

function installHours() {
  once('hours', async () => {
    const mod = await import('./hours/hoursCompanyLogoRuntimeV41');
    mod.installHoursCompanyLogoRuntimeV41();
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
