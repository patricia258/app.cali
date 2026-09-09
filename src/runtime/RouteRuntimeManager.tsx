import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const installed = new Set<string>();
const warmed = new Set<string>();

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

function warmOnce(key: string, task: () => Promise<unknown>) {
  if (warmed.has(key) || installed.has(key)) return;
  warmed.add(key);
  void task().catch(() => warmed.delete(key));
}

function warmProjectGate() {
  warmOnce('data-admin-projects-gate', async () => {
    const { supabase } = await import('../lib/supabase');
    if (!supabase) return;
    const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    if (error) return;
    try {
      window.localStorage.setItem('cali-admin-projects-gate-v1', JSON.stringify({
        ready: (count || 0) > 0,
        savedAt: Date.now(),
      }));
    } catch {
      // Aquecimento oportunista; nunca interfere na navegação.
    }
  });
}

function warmPageForPath(pathname: string) {
  if (pathname === '/admin') warmOnce('page-admin-dashboard', () => import('../pages/admin/AdminDashboard'));
  if (pathname === '/admin/clientes') warmOnce('page-admin-clients', () => import('../pages/admin/AdminClientsPageV3'));
  if (pathname === '/admin/propostas') warmOnce('page-admin-proposals', () => import('../pages/admin/AdminProposalsPageV2'));
  if (pathname.startsWith('/admin/propostas/') && pathname.endsWith('/editar')) warmOnce('page-admin-proposal-editor', () => import('../pages/admin/AdminProposalEditorPageV3'));
  if (pathname.startsWith('/admin/propostas/proposta/')) warmOnce('page-admin-proposal-preview', () => import('../pages/admin/AdminProposalPreviewPageV3'));
  if (pathname === '/admin/projetos') {
    warmOnce('page-admin-projects', () => Promise.all([
      import('../pages/admin/AdminProjectsGatePage'),
      import('../pages/admin/AdminProjectsPageV3'),
    ]));
    warmProjectGate();
  }
  if (pathname === '/admin/horas') warmOnce('page-admin-hours', () => import('../pages/admin/AdminHoursPageV3'));
  if (pathname === '/admin/calendario') warmOnce('page-admin-calendar', () => import('../pages/admin/AdminCalendarPage'));
  if (pathname === '/admin/registros') warmOnce('page-records', () => import('../pages/records/WorkspaceRecordsPage'));
  if (pathname === '/admin/documentos') warmOnce('page-admin-documents', () => import('../pages/admin/AdminDocumentsPageV4'));
  if (pathname === '/admin/relatorios') warmOnce('page-admin-reports', () => import('../pages/admin/AdminReportsPageV17'));
  if (pathname.startsWith('/admin/relatorios/impressao/')) warmOnce('page-report-print', () => import('../pages/reports/ReportPrintPageV17'));
  if (pathname === '/admin/satisfacao') warmOnce('page-admin-satisfaction', () => import('../pages/admin/AdminSatisfactionPage'));
  if (pathname === '/admin/mapa-de-people') warmOnce('page-admin-people-map', () => import('../pages/admin/AdminPeopleMapPageV2'));
  if (pathname === '/admin/mapa-de-people/revisao') warmOnce('page-admin-people-map-review', () => import('../pages/admin/AdminPeopleMapReviewPage'));
  if (pathname.startsWith('/admin/mapa-de-people/relatorio/')) warmOnce('page-admin-people-map-report', () => import('../pages/admin/AdminPeopleMapReportPage'));

  if (pathname === '/cliente') warmOnce('page-client-dashboard', () => import('../pages/client/ClientDashboard'));
  if (pathname === '/cliente/cronograma') warmOnce('page-client-timeline', () => import('../pages/client/ClientTimelinePage'));
  if (pathname === '/cliente/entregaveis') warmOnce('page-client-deliverables', () => import('../pages/client/ClientDeliverablesPage'));
  if (pathname === '/cliente/horas') warmOnce('page-client-hours', () => import('../pages/client/ClientHoursPage'));
  if (pathname === '/cliente/registros') warmOnce('page-records', () => import('../pages/records/WorkspaceRecordsPage'));
  if (pathname === '/cliente/documentos') warmOnce('page-client-documents', () => import('../pages/client/ClientDocumentsPage'));
  if (pathname === '/cliente/relatorios') warmOnce('page-client-reports', () => import('../pages/client/ClientReportsPageV5'));
  if (pathname.startsWith('/cliente/relatorios/impressao/')) warmOnce('page-report-print', () => import('../pages/reports/ReportPrintPageV17'));
}

function warmRuntimeForPath(pathname: string) {
  warmPageForPath(pathname);

  if (pathname.includes('/relatorios')) {
    warmOnce('reports', () => Promise.all([
      import('../lib/reportsPdfRuntime'),
      import('../lib/reportsDedupRuntime'),
      import('../lib/reportClientTrackingRuntimeV55'),
      import('../lib/reportWorkflowGovernanceV61'),
      import('../lib/reportToolbarDedupeV18'),
      import('../lib/reportWithdrawalRuntimeV62'),
    ]));
  }

  if (pathname === '/admin/calendario' || pathname === '/cliente/cronograma') {
    warmOnce('calendar', () => Promise.all([
      import('../lib/googleCalendarRuntime'),
      import('../lib/calendarSyncGuard'),
      import('../lib/schedulingRequestsRuntimeV65'),
      import('../lib/schedulingPolicyLoaderV68'),
    ]));
  }

  if (pathname.includes('/registros')) {
    warmOnce('records', () => Promise.all([
      import('../lib/recordsExperienceRuntimeV2'),
      import('../lib/recordsMessageControlsRuntime'),
      import('../lib/recordsConversationScrollGuard'),
      import('../lib/recordsOperationsRuntimeV25'),
      import('../lib/recordsClosureExperienceRuntimeV29'),
      import('../lib/recordsClosureFinalPolishV30'),
    ]));
  }

  if (pathname === '/admin/projetos' || pathname === '/cliente/entregaveis') {
    warmOnce('projects', () => Promise.all([
      import('../lib/deliverableChatStandardRuntimeV35'),
      import('../lib/deliverableChatFlickerGuardV36'),
      import('../lib/projectsPlanningIntelligenceRuntimeV36'),
      import('../lib/projectsDeadlineAutofillRuntimeV37'),
      import('../lib/projectApprovalWorkflowRuntimeV38'),
      import('../lib/projectApprovalRulesRuntimeV39'),
      import('../lib/projectsClientPortfolioRuntimeV39'),
      import('../lib/projectExecutionLifecycleRuntimeV44'),
      import('../lib/projectLifecycleRecalcUxV45'),
    ]));
  }

  if (pathname.includes('/documentos')) {
    warmOnce('documents', () => import('../lib/documentsIdentityRuntimeV42'));
  }

  if (pathname.includes('/horas')) {
    warmOnce('hours', () => import('../lib/hoursCompanyLogoRuntimeV41'));
  }

  if (pathname.includes('/mapa-de-people')) {
    warmOnce('people-map', () => Promise.all([
      import('../lib/mapaAuthBridge'),
      import('../lib/mapaReviewNavigation'),
    ]));
  }

  if (pathname === '/admin') {
    warmOnce('admin-dashboard', () => import('../lib/dashboardSatisfactionRuntimeV29'));
  }

  if (pathname === '/cliente') {
    warmOnce('client-dashboard', () => import('../lib/clientHomeCompanyIdentityRuntimeV40'));
  }
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

  useEffect(() => {
    function warmFromTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/cliente')) return;
      warmRuntimeForPath(url.pathname);
    }

    const onPointerOver = (event: PointerEvent) => warmFromTarget(event.target);
    const onPointerDown = (event: PointerEvent) => warmFromTarget(event.target);
    const onFocusIn = (event: FocusEvent) => warmFromTarget(event.target);

    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return null;
}
