import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
      import('../lib/reportsPdfRuntime'),
      import('../lib/reportsDedupRuntime'),
      import('../lib/reportClientTrackingRuntimeV55'),
      import('../lib/reportWorkflowGovernanceV61'),
      import('../lib/reportToolbarDedupeV18'),
      import('../lib/reportWithdrawalRuntimeV62'),
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
      import('../lib/googleCalendarRuntime'),
      import('../lib/calendarSyncGuard'),
      import('../lib/schedulingRequestsRuntimeV65'),
      import('../lib/schedulingPolicyLoaderV68'),
    ]);
    google.installGoogleCalendarRuntime();
    guard.installCalendarSyncGuard();
    scheduling.installSchedulingRequestsRuntimeV65();
    policy.installSchedulingPolicyLoaderV68();
  });
}

function installRecords() {
  once('records', async () => {
    const [experience, controls, scroll, operations, closure, polish] = await Promise.all([
      import('../lib/recordsExperienceRuntimeV2'),
      import('../lib/recordsMessageControlsRuntime'),
      import('../lib/recordsConversationScrollGuard'),
      import('../lib/recordsOperationsRuntimeV25'),
      import('../lib/recordsClosureExperienceRuntimeV29'),
      import('../lib/recordsClosureFinalPolishV30'),
    ]);
    experience.installRecordsExperienceRuntimeV2();
    controls.installRecordsMessageControlsRuntime();
    scroll.installRecordsConversationScrollGuard();
    operations.installRecordsOperationsRuntimeV25();
    closure.installRecordsClosureExperienceRuntimeV29();
    polish.installRecordsClosureFinalPolishV30();
  });
}

function installProjects() {
  once('projects', async () => {
    const [chat, flicker, planning, deadlines, workflow, rules, portfolio, lifecycle, recalc] = await Promise.all([
      import('../lib/deliverableChatStandardRuntimeV35'),
      import('../lib/deliverableChatFlickerGuardV36'),
      import('../lib/projectsPlanningIntelligenceRuntimeV36'),
      import('../lib/projectsDeadlineAutofillRuntimeV37'),
      import('../lib/projectApprovalWorkflowRuntimeV38'),
      import('../lib/projectApprovalRulesRuntimeV39'),
      import('../lib/projectsClientPortfolioRuntimeV39'),
      import('../lib/projectExecutionLifecycleRuntimeV44'),
      import('../lib/projectLifecycleRecalcUxV45'),
    ]);
    chat.installDeliverableChatStandardRuntimeV35();
    flicker.installDeliverableChatFlickerGuardV36();
    planning.installProjectsPlanningIntelligenceRuntimeV36();
    deadlines.installProjectsDeadlineAutofillRuntimeV37();
    workflow.installProjectApprovalWorkflowRuntimeV38();
    rules.installProjectApprovalRulesRuntimeV39();
    portfolio.installProjectsClientPortfolioRuntimeV39();
    lifecycle.installProjectExecutionLifecycleRuntimeV44();
    recalc.installProjectLifecycleRecalcUxV45();
  });
}

function installDocuments() {
  once('documents', async () => {
    const mod = await import('../lib/documentsIdentityRuntimeV42');
    mod.installDocumentsIdentityRuntimeV42();
  });
}

function installHours() {
  once('hours', async () => {
    const mod = await import('../lib/hoursCompanyLogoRuntimeV41');
    mod.installHoursCompanyLogoRuntimeV41();
  });
}

function installDashboards(pathname: string) {
  if (pathname === '/admin') {
    once('admin-dashboard', async () => {
      const mod = await import('../lib/dashboardSatisfactionRuntimeV29');
      mod.installDashboardSatisfactionRuntimeV29();
    });
  }
  if (pathname === '/cliente') {
    once('client-dashboard', async () => {
      const mod = await import('../lib/clientHomeCompanyIdentityRuntimeV40');
      mod.installClientHomeCompanyIdentityRuntimeV40();
    });
  }
}

function installMap() {
  once('people-map', async () => {
    const [auth, nav] = await Promise.all([
      import('../lib/mapaAuthBridge'),
      import('../lib/mapaReviewNavigation'),
    ]);
    auth.installMapaAuthBridge();
    nav.installMapaReviewNavigation();
  });
}

async function warmAdminRuntimeChunks() {
  await Promise.all([
    import('../lib/reportsPdfRuntime'),
    import('../lib/reportsDedupRuntime'),
    import('../lib/reportClientTrackingRuntimeV55'),
    import('../lib/reportWorkflowGovernanceV61'),
    import('../lib/reportToolbarDedupeV18'),
    import('../lib/reportWithdrawalRuntimeV62'),
    import('../lib/googleCalendarRuntime'),
    import('../lib/calendarSyncGuard'),
    import('../lib/schedulingRequestsRuntimeV65'),
    import('../lib/schedulingPolicyLoaderV68'),
    import('../lib/recordsExperienceRuntimeV2'),
    import('../lib/recordsMessageControlsRuntime'),
    import('../lib/recordsConversationScrollGuard'),
    import('../lib/recordsOperationsRuntimeV25'),
    import('../lib/recordsClosureExperienceRuntimeV29'),
    import('../lib/recordsClosureFinalPolishV30'),
    import('../lib/deliverableChatStandardRuntimeV35'),
    import('../lib/deliverableChatFlickerGuardV36'),
    import('../lib/projectsPlanningIntelligenceRuntimeV36'),
    import('../lib/projectsDeadlineAutofillRuntimeV37'),
    import('../lib/projectApprovalWorkflowRuntimeV38'),
    import('../lib/projectApprovalRulesRuntimeV39'),
    import('../lib/projectsClientPortfolioRuntimeV39'),
    import('../lib/projectExecutionLifecycleRuntimeV44'),
    import('../lib/projectLifecycleRecalcUxV45'),
    import('../lib/documentsIdentityRuntimeV42'),
    import('../lib/hoursCompanyLogoRuntimeV41'),
    import('../lib/dashboardSatisfactionRuntimeV29'),
    import('../lib/mapaAuthBridge'),
    import('../lib/mapaReviewNavigation'),
  ]);
}

async function warmClientRuntimeChunks() {
  await Promise.all([
    import('../lib/reportsPdfRuntime'),
    import('../lib/reportsDedupRuntime'),
    import('../lib/reportClientTrackingRuntimeV55'),
    import('../lib/reportWorkflowGovernanceV61'),
    import('../lib/reportToolbarDedupeV18'),
    import('../lib/reportWithdrawalRuntimeV62'),
    import('../lib/googleCalendarRuntime'),
    import('../lib/calendarSyncGuard'),
    import('../lib/schedulingRequestsRuntimeV65'),
    import('../lib/schedulingPolicyLoaderV68'),
    import('../lib/recordsExperienceRuntimeV2'),
    import('../lib/recordsMessageControlsRuntime'),
    import('../lib/recordsConversationScrollGuard'),
    import('../lib/recordsOperationsRuntimeV25'),
    import('../lib/recordsClosureExperienceRuntimeV29'),
    import('../lib/recordsClosureFinalPolishV30'),
    import('../lib/deliverableChatStandardRuntimeV35'),
    import('../lib/deliverableChatFlickerGuardV36'),
    import('../lib/projectsPlanningIntelligenceRuntimeV36'),
    import('../lib/projectsDeadlineAutofillRuntimeV37'),
    import('../lib/projectApprovalWorkflowRuntimeV38'),
    import('../lib/projectApprovalRulesRuntimeV39'),
    import('../lib/projectsClientPortfolioRuntimeV39'),
    import('../lib/projectExecutionLifecycleRuntimeV44'),
    import('../lib/projectLifecycleRecalcUxV45'),
    import('../lib/documentsIdentityRuntimeV42'),
    import('../lib/hoursCompanyLogoRuntimeV41'),
    import('../lib/clientHomeCompanyIdentityRuntimeV40'),
  ]);
}

function scheduleRuntimeWarmup(pathname: string) {
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/cliente')) return () => {};

  const run = () => {
    const warmup = pathname.startsWith('/admin') ? warmAdminRuntimeChunks : warmClientRuntimeChunks;
    void warmup().catch(() => {
      // Warmup é oportunista: nunca deve bloquear nem alterar a experiência atual.
    });
  };

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(run, { timeout: 5000 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(run, 3000);
  return () => window.clearTimeout(timer);
}

export function RouteRuntimeManager() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (pathname.includes('/relatorios')) installReports();
    if (pathname === '/admin/calendario' || pathname === '/cliente/cronograma') installCalendar();
    if (pathname.includes('/registros')) installRecords();
    if (pathname === '/admin/projetos' || pathname === '/cliente/entregaveis') installProjects();
    if (pathname.includes('/documentos')) installDocuments();
    if (pathname.includes('/horas')) installHours();
    if (pathname.includes('/mapa-de-people')) installMap();
    installDashboards(pathname);
  }, [pathname]);

  useEffect(() => scheduleRuntimeWarmup(pathname), [pathname]);

  return null;
}
