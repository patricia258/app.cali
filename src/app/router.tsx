import { lazy } from 'react';
import { createRootRoute, createRoute, createRouter, type RouteComponent } from '@tanstack/react-router';
import App from '../App';
import type { StaffSection } from '../pages/staff/StaffWorkspace';
import { Navigate } from './navigation';

const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LegalPage = lazy(() => import('../legal/LegalPage').then((m) => ({ default: m.LegalPage })));
const PublicFormPage = lazy(() => import('../modules/forms/PublicFormPage').then((m) => ({ default: m.PublicFormPage })));
const AdminFormsPage = lazy(() => import('../modules/forms/AdminFormsPage').then((m) => ({ default: m.AdminFormsPage })));
const ProfileTestPage = lazy(() => import('../modules/disc/ProfileTestPage').then((m) => ({ default: m.ProfileTestPage })));
const ProfileReportPage = lazy(() => import('../modules/disc/ProfileReportPage').then((m) => ({ default: m.ProfileReportPage })));
const ProfileEvaluatorPage = lazy(() => import('../modules/disc/ProfileEvaluatorPage').then((m) => ({ default: m.ProfileEvaluatorPage })));
const AdminProfilesPage = lazy(() => import('../modules/disc/AdminProfilesPage').then((m) => ({ default: m.AdminProfilesPage })));
const ProfileCampaignPage = lazy(() => import('../modules/disc/ProfileCampaignPage').then((m) => ({ default: m.ProfileCampaignPage })));
const GestaoPage = lazy(() => import('../modules/disc/GestaoPage').then((m) => ({ default: m.GestaoPage })));
const ProfileOptOutPage = lazy(() => import('../modules/disc/ProfileOptOutPage').then((m) => ({ default: m.ProfileOptOutPage })));
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const GoogleCalendarCallbackPage = lazy(() => import('../pages/GoogleCalendarCallbackPage').then((m) => ({ default: m.GoogleCalendarCallbackPage })));

const AdminDashboard = lazy(async () => {
  await import('../styles/routes/overview');
  return import('../pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }));
});
const AdminClientsPageV3 = lazy(async () => {
  return import('../pages/admin/AdminClientsPageV3').then((m) => ({ default: m.AdminClientsPageV3 }));
});
const AdminProposalsPageV2 = lazy(async () => {
  // Lista na composição V2: as folhas antigas de propostas só entram no editor e na prévia.
  return import('../pages/admin/AdminProposalsPageV2').then((m) => ({ default: m.AdminProposalsPageV2 }));
});
const AdminProposalEditorPageV3 = lazy(async () => {
  await import('../styles/routes/proposals');
  return import('../pages/admin/AdminProposalEditorPageV3').then((m) => ({ default: m.AdminProposalEditorPageV3 }));
});
const AdminProposalPreviewPageV3 = lazy(async () => {
  await import('../styles/routes/proposals');
  return import('../pages/admin/AdminProposalPreviewPageV3').then((m) => ({ default: m.AdminProposalPreviewPageV3 }));
});
const AdminProjectsGatePage = lazy(async () => {
  await import('../styles/routes/projects');
  return import('../pages/admin/AdminProjectsGatePage').then((m) => ({ default: m.AdminProjectsGatePage }));
});
const AdminHoursPageV3 = lazy(async () => {
  return import('../pages/admin/AdminHoursPageV3').then((m) => ({ default: m.AdminHoursPageV3 }));
});
const AdminCalendarPage = lazy(async () => {
  await import('../styles/routes/calendar');
  return import('../pages/admin/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage }));
});
const AdminDocumentsPageV4 = lazy(async () => {
  // Página na composição V2: as folhas antigas de documentos não são mais carregadas aqui.
  return import('../pages/admin/AdminDocumentsPageV4').then((m) => ({ default: m.AdminDocumentsPageV4 }));
});
const AdminReportsPageV17 = lazy(async () => {
  await import('../styles/routes/reports');
  return import('../pages/admin/AdminReportsPageV17').then((m) => ({ default: m.AdminReportsPageV17 }));
});
const AdminSatisfactionPage = lazy(async () => {
  await import('../styles/routes/satisfaction');
  return import('../pages/admin/AdminSatisfactionPage').then((m) => ({ default: m.AdminSatisfactionPage }));
});
const AdminPeopleMapPageV2 = lazy(async () => {
  await import('../styles/routes/peopleMap');
  return import('../pages/admin/AdminPeopleMapPageV2').then((m) => ({ default: m.AdminPeopleMapPageV2 }));
});
const AdminPeopleMapReviewPage = lazy(async () => {
  await import('../styles/routes/peopleMap');
  return import('../pages/admin/AdminPeopleMapReviewPage').then((m) => ({ default: m.AdminPeopleMapReviewPage }));
});
const AdminPeopleMapReportPage = lazy(async () => {
  await import('../styles/routes/peopleMap');
  return import('../pages/admin/AdminPeopleMapReportPage').then((m) => ({ default: m.AdminPeopleMapReportPage }));
});

const AdminRecordsPage = lazy(async () => {
  await import('../styles/routes/records');
  return import('../pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.AdminRecordsPage }));
});
const ClientRecordsPage = lazy(async () => {
  await import('../styles/routes/clientModules');
  return import('../pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.ClientRecordsPage }));
});
const ClientDashboard = lazy(async () => {
  await import('../styles/routes/clientExperience');
  return import('../pages/client/ClientDashboard').then((m) => ({ default: m.ClientDashboard }));
});
const ClientTimelinePage = lazy(async () => {
  await import('../styles/routes/clientExperience');
  return import('../pages/client/ClientTimelinePage').then((m) => ({ default: m.ClientTimelinePage }));
});
const ClientDeliverablesPage = lazy(async () => {
  await import('../styles/routes/clientModules');
  return import('../pages/client/ClientDeliverablesPage').then((m) => ({ default: m.ClientDeliverablesPage }));
});
const ClientHoursPage = lazy(async () => {
  await import('../styles/routes/clientModules');
  return import('../pages/client/ClientHoursPage').then((m) => ({ default: m.ClientHoursPage }));
});
const ClientDocumentsPage = lazy(async () => {
  await import('../styles/routes/clientModules');
  return import('../pages/client/ClientDocumentsPage').then((m) => ({ default: m.ClientDocumentsPage }));
});
// O relatório é lido no próprio documento oficial (papel), que tem folhas de estilo próprias.
const ClientReportsPageV5 = lazy(async () => {
  await import('../styles/routes/reports');
  return import('../pages/client/ClientReportsPageV5').then((m) => ({ default: m.ClientReportsPageV5 }));
});
const CompanyTeamPage = lazy(() => import('../pages/team/CompanyTeamPage').then((m) => ({ default: m.CompanyTeamPage })));
const ClientFaqPage = lazy(() => import('../pages/client/ClientFaqPage').then((m) => ({ default: m.ClientFaqPage })));
const ClientNoticesPage = lazy(() => import('../pages/notices/NoticesBoard').then((m) => ({ default: m.ClientNoticesPage })));
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));
const AdminStaffPage = lazy(() => import('../pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })));
const StaffWorkspace = lazy(() => import('../pages/staff/StaffWorkspace').then((m) => ({ default: m.StaffWorkspace })));
const AdminNoticesPage = lazy(() => import('../pages/notices/NoticesBoard').then((m) => ({ default: m.AdminNoticesPage })));
const ClientFrontsPage = lazy(() => import('../pages/client/ClientFrontsPage').then((m) => ({ default: m.ClientFrontsPage })));
const ReportPrintPageV17 = lazy(async () => {
  await import('../styles/routes/reports');
  return import('../pages/reports/ReportPrintPageV17').then((m) => ({ default: m.ReportPrintPageV17 }));
});


const StaffWorkspaceSection = lazy(() => import('../pages/staff/StaffWorkspace').then((m) => ({ default: m.StaffWorkspaceSection })));
const StaffPrint = lazy(() => import('../pages/staff/StaffWorkspace').then((m) => ({ default: m.StaffPrint })));

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => <Navigate to="/" replace />,
});

function defineRoute<const Path extends string>(path: Path, component: RouteComponent) {
  return createRoute({ getParentRoute: () => rootRoute, path, component });
}

const staffRoute = defineRoute('/equipe', StaffWorkspace);

function staffSection<const Path extends StaffSection>(path: Path) {
  return createRoute({
    getParentRoute: () => staffRoute,
    path,
    component: () => <StaffWorkspaceSection section={path} />,
  });
}

const staffRoutes = staffRoute.addChildren([
  staffSection('/'),
  staffSection('ocorrencias'),
  staffSection('calendario'),
  staffSection('horas'),
  staffSection('documentos'),
  staffSection('pessoas'),
  staffSection('relatorios'),
  staffSection('projetos'),
  staffSection('avisos'),
  staffSection('aprovacoes'),
  createRoute({
    getParentRoute: () => staffRoute,
    path: 'relatorios/impressao/$reportId',
    component: StaffPrint,
  }),
  createRoute({
    getParentRoute: () => staffRoute,
    path: '$',
    component: () => <Navigate to="/equipe" replace />,
  }),
]);

const routeTree = rootRoute.addChildren([
  defineRoute('/', () => <LandingPage />),
  defineRoute('/login', () => <LoginPage />),
  defineRoute('/privacidade', () => <LegalPage kind="privacy" />),
  defineRoute('/termos', () => <LegalPage kind="terms" />),
  defineRoute('/politica-do-site', () => <LegalPage kind="site" />),
  defineRoute('/f/$slug', () => <PublicFormPage />),
  defineRoute('/perfil/relatorio/$token', () => <ProfileReportPage />),
  defineRoute('/perfil/sair/$token', () => <ProfileOptOutPage />),
  defineRoute('/perfil/$slug', () => <ProfileTestPage />),
  defineRoute('/auth/callback', () => <AuthCallbackPage />),
  defineRoute('/oauth/google/callback', () => <GoogleCalendarCallbackPage />),
  defineRoute('/admin', () => <AdminDashboard />),
  defineRoute('/admin/clientes', () => <AdminClientsPageV3 />),
  defineRoute('/admin/equipe', () => <CompanyTeamPage role="admin" />),
  defineRoute('/admin/propostas', () => <AdminProposalsPageV2 />),
  defineRoute('/admin/propostas/$submissionId/editar', () => <AdminProposalEditorPageV3 />),
  defineRoute('/admin/propostas/proposta/$proposalId', () => <AdminProposalPreviewPageV3 />),
  defineRoute('/admin/projetos', () => <AdminProjectsGatePage />),
  defineRoute('/admin/horas', () => <AdminHoursPageV3 />),
  defineRoute('/admin/calendario', () => <AdminCalendarPage />),
  defineRoute('/admin/registros', () => <AdminRecordsPage />),
  defineRoute('/admin/documentos', () => <AdminDocumentsPageV4 />),
  defineRoute('/admin/relatorios/impressao/$reportId', () => <ReportPrintPageV17 role="admin" />),
  defineRoute('/admin/relatorios', () => <AdminReportsPageV17 />),
  defineRoute('/admin/auditoria', () => <AdminAuditPage />),
  defineRoute('/admin/equipe-cali', () => <AdminStaffPage />),
  defineRoute('/admin/avisos', () => <AdminNoticesPage />),
  defineRoute('/admin/satisfacao', () => <AdminSatisfactionPage />),
  defineRoute('/admin/mapa-de-people', () => <AdminPeopleMapPageV2 />),
  defineRoute('/admin/formularios', () => <AdminFormsPage />),
  defineRoute('/admin/perfil-comportamental', () => <AdminProfilesPage />),
  defineRoute('/admin/perfil-comportamental/gestao/$linkId', () => <GestaoPage role="admin" />),
  defineRoute('/admin/perfil-comportamental/convites/$linkId', () => <ProfileCampaignPage />),
  defineRoute('/admin/perfil-comportamental/$id', () => <ProfileEvaluatorPage role="admin" />),
  defineRoute('/cliente/perfil-comportamental/gestao/$linkId', () => <GestaoPage role="client" />),
  defineRoute('/cliente/perfil-comportamental/$id', () => <ProfileEvaluatorPage role="client" />),
  defineRoute('/admin/mapa-de-people/revisao', () => <AdminPeopleMapReviewPage />),
  defineRoute('/admin/mapa-de-people/relatorio/$id', () => <AdminPeopleMapReportPage />),
  defineRoute('/cliente', () => <ClientDashboard />),
  defineRoute('/cliente/cronograma', () => <ClientTimelinePage />),
  defineRoute('/cliente/equipe', () => <CompanyTeamPage role="client" />),
  defineRoute('/cliente/avisos', () => <ClientNoticesPage />),
  defineRoute('/cliente/ajuda', () => <ClientFaqPage />),
  defineRoute('/cliente/frentes', () => <ClientFrontsPage />),
  defineRoute('/cliente/entregaveis', () => <ClientDeliverablesPage />),
  defineRoute('/cliente/horas', () => <ClientHoursPage />),
  defineRoute('/cliente/registros', () => <ClientRecordsPage />),
  defineRoute('/cliente/documentos', () => <ClientDocumentsPage />),
  defineRoute('/cliente/relatorios/impressao/$reportId', () => <ReportPrintPageV17 role="client" />),
  defineRoute('/cliente/relatorios', () => <ClientReportsPageV5 />),
  staffRoutes,
]);

export const router = createRouter({
  routeTree,
  trailingSlash: 'preserve',
  notFoundMode: 'root',
  disableGlobalCatchBoundary: true,
});
