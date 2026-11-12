import { lazy } from 'react';
import { createRootRoute, createRoute, createRouter, type RouteComponent } from '@tanstack/react-router';
import App from './App';
import type { StaffSection } from '../modules/partner/StaffWorkspace';
import { Navigate } from '../components/navigation/Navigate';

const LandingPage = lazy(() => import('../modules/public/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../modules/access/sign-in/LoginPage').then((m) => ({ default: m.LoginPage })));
const LegalPage = lazy(() => import('../modules/public/legal/LegalPage').then((m) => ({ default: m.LegalPage })));
const PublicFormPage = lazy(() => import('../modules/public/forms/PublicFormPage').then((m) => ({ default: m.PublicFormPage })));
const PreRegistrationPage = lazy(() => import('../modules/public/pre-registration/PreRegistrationPage').then((m) => ({ default: m.PreRegistrationPage })));
const AdminFormsPage = lazy(() => import('../modules/admin/forms/AdminFormsPage').then((m) => ({ default: m.AdminFormsPage })));
const ProfileTestPage = lazy(() => import('../modules/public/disc/ProfileTestPage').then((m) => ({ default: m.ProfileTestPage })));
const ProfileReportPage = lazy(() => import('../modules/public/disc/ProfileReportPage').then((m) => ({ default: m.ProfileReportPage })));
const ProfileEvaluatorPage = lazy(() => import('../modules/disc/ProfileEvaluatorPage').then((m) => ({ default: m.ProfileEvaluatorPage })));
const AdminProfilesPage = lazy(() => import('../modules/admin/disc/AdminProfilesPage').then((m) => ({ default: m.AdminProfilesPage })));
const ProfileCampaignPage = lazy(() => import('../modules/admin/disc/ProfileCampaignPage').then((m) => ({ default: m.ProfileCampaignPage })));
const GestaoPage = lazy(() => import('../modules/disc/GestaoPage').then((m) => ({ default: m.GestaoPage })));
const ProfileOptOutPage = lazy(() => import('../modules/public/disc/ProfileOptOutPage').then((m) => ({ default: m.ProfileOptOutPage })));
const AuthCallbackPage = lazy(() => import('../modules/access/callback/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const GoogleCalendarCallbackPage = lazy(() => import('../modules/access/google-calendar/GoogleCalendarCallbackPage').then((m) => ({ default: m.GoogleCalendarCallbackPage })));

const AdminDashboard = lazy(async () => {
  await import('../modules/admin/overview/styles');
  return import('../modules/admin/overview/AdminDashboard').then((m) => ({ default: m.AdminDashboard }));
});
const AdminClientsPage = lazy(async () => {
  return import('../modules/admin/companies/AdminClientsPage').then((m) => ({ default: m.AdminClientsPage }));
});
const AdminProposalsPage = lazy(async () => {
  // Lista na composição V2: as folhas antigas de propostas só entram no editor e na prévia.
  return import('../modules/admin/proposals/AdminProposalsPage').then((m) => ({ default: m.AdminProposalsPage }));
});
const AdminProposalEditorPage = lazy(async () => {
  await import('../modules/admin/proposals/document-styles');
  return import('../modules/admin/proposals/AdminProposalEditorPage').then((m) => ({ default: m.AdminProposalEditorPage }));
});
const AdminProposalPreviewPage = lazy(async () => {
  await import('../modules/admin/proposals/document-styles');
  return import('../modules/admin/proposals/AdminProposalPreviewPage').then((m) => ({ default: m.AdminProposalPreviewPage }));
});
const AdminProjectsGatePage = lazy(async () => {
  await import('../modules/projects/styles');
  return import('../modules/admin/projects/AdminProjectsGatePage').then((m) => ({ default: m.AdminProjectsGatePage }));
});
const AdminHoursPage = lazy(async () => {
  return import('../modules/hours/AdminHoursPage').then((m) => ({ default: m.AdminHoursPage }));
});
const AdminCalendarPage = lazy(async () => {
  await import('../modules/calendar/styles');
  return import('../modules/calendar/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage }));
});
const AdminDocumentsPage = lazy(async () => {
  // Página na composição V2: as folhas antigas de documentos não são mais carregadas aqui.
  return import('../modules/documents/AdminDocumentsPage').then((m) => ({ default: m.AdminDocumentsPage }));
});
const AdminReportsPage = lazy(async () => {
  await import('../modules/reports/styles');
  return import('../modules/admin/reports/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }));
});
const AdminSatisfactionPage = lazy(async () => {
  await import('../modules/admin/satisfaction/styles');
  return import('../modules/admin/satisfaction/AdminSatisfactionPage').then((m) => ({ default: m.AdminSatisfactionPage }));
});
const AdminPeopleMapPage = lazy(async () => {
  await import('../modules/admin/people-map/styles');
  return import('../modules/admin/people-map/AdminPeopleMapPage').then((m) => ({ default: m.AdminPeopleMapPage }));
});
const AdminPeopleMapReviewPage = lazy(async () => {
  await import('../modules/admin/people-map/styles');
  return import('../modules/admin/people-map/AdminPeopleMapReviewPage').then((m) => ({ default: m.AdminPeopleMapReviewPage }));
});
const AdminPeopleMapReportPage = lazy(async () => {
  await import('../modules/admin/people-map/styles');
  return import('../modules/admin/people-map/AdminPeopleMapReportPage').then((m) => ({ default: m.AdminPeopleMapReportPage }));
});

const AdminRecordsPage = lazy(async () => {
  await import('../modules/records/styles');
  return import('../modules/records/WorkspaceRecordsPage').then((m) => ({ default: m.AdminRecordsPage }));
});
const ClientRecordsPage = lazy(async () => {
  return import('../modules/records/WorkspaceRecordsPage').then((m) => ({ default: m.ClientRecordsPage }));
});
const ClientDashboard = lazy(async () => {
  await import('../modules/client/workspace-experience');
  return import('../modules/client/home/ClientDashboard').then((m) => ({ default: m.ClientDashboard }));
});
const ClientTimelinePage = lazy(async () => {
  await import('../modules/client/workspace-experience');
  return import('../modules/client/timeline/ClientTimelinePage').then((m) => ({ default: m.ClientTimelinePage }));
});
const ClientDeliverablesPage = lazy(async () => {
  return import('../modules/client/deliverables/ClientDeliverablesPage').then((m) => ({ default: m.ClientDeliverablesPage }));
});
const ClientHoursPage = lazy(async () => {
  return import('../modules/client/hours/ClientHoursPage').then((m) => ({ default: m.ClientHoursPage }));
});
const ClientDocumentsPage = lazy(async () => {
  return import('../modules/client/documents/ClientDocumentsPage').then((m) => ({ default: m.ClientDocumentsPage }));
});
// O relatório é lido no próprio documento oficial (papel), que tem folhas de estilo próprias.
const ClientReportsPage = lazy(async () => {
  await import('../modules/reports/styles');
  return import('../modules/client/reports/ClientReportsPage').then((m) => ({ default: m.ClientReportsPage }));
});
const CompanyTeamPage = lazy(() => import('../modules/team/CompanyTeamPage').then((m) => ({ default: m.CompanyTeamPage })));
const ClientFaqPage = lazy(() => import('../modules/client/faq/ClientFaqPage').then((m) => ({ default: m.ClientFaqPage })));
const ClientNoticesPage = lazy(() => import('../modules/notices/NoticesBoard').then((m) => ({ default: m.ClientNoticesPage })));
const AdminAuditPage = lazy(() => import('../modules/admin/audit/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));
const AdminStaffPage = lazy(() => import('../modules/admin/staff/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })));
const StaffWorkspace = lazy(() => import('../modules/partner/StaffWorkspace').then((m) => ({ default: m.StaffWorkspace })));
const AdminNoticesPage = lazy(() => import('../modules/notices/NoticesBoard').then((m) => ({ default: m.AdminNoticesPage })));
const ClientFrontsPage = lazy(() => import('../modules/client/fronts/ClientFrontsPage').then((m) => ({ default: m.ClientFrontsPage })));
const ReportPrintPage = lazy(async () => {
  await import('../modules/reports/print-styles');
  return import('../modules/reports/ReportPrintPage').then((m) => ({ default: m.ReportPrintPage }));
});


const StaffWorkspaceSection = lazy(() => import('../modules/partner/StaffWorkspace').then((m) => ({ default: m.StaffWorkspaceSection })));
const StaffPrint = lazy(() => import('../modules/partner/StaffWorkspace').then((m) => ({ default: m.StaffPrint })));

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
  staffSection('materiais'),
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
  defineRoute('/pre-cadastro/$token', () => <PreRegistrationPage />),
  defineRoute('/perfil/relatorio/$token', () => <ProfileReportPage />),
  defineRoute('/perfil/sair/$token', () => <ProfileOptOutPage />),
  defineRoute('/perfil/$slug', () => <ProfileTestPage />),
  defineRoute('/auth/callback', () => <AuthCallbackPage />),
  defineRoute('/oauth/google/callback', () => <GoogleCalendarCallbackPage />),
  defineRoute('/admin', () => <AdminDashboard />),
  defineRoute('/admin/clientes', () => <AdminClientsPage />),
  defineRoute('/admin/equipe', () => <CompanyTeamPage role="admin" />),
  defineRoute('/admin/propostas', () => <AdminProposalsPage />),
  defineRoute('/admin/propostas/$submissionId/editar', () => <AdminProposalEditorPage />),
  defineRoute('/admin/propostas/proposta/$proposalId', () => <AdminProposalPreviewPage />),
  defineRoute('/admin/projetos', () => <AdminProjectsGatePage />),
  defineRoute('/admin/horas', () => <AdminHoursPage />),
  defineRoute('/admin/calendario', () => <AdminCalendarPage />),
  defineRoute('/admin/registros', () => <AdminRecordsPage />),
  defineRoute('/admin/documentos', () => <AdminDocumentsPage />),
  defineRoute('/admin/relatorios/impressao/$reportId', () => <ReportPrintPage role="admin" />),
  defineRoute('/admin/relatorios', () => <AdminReportsPage />),
  defineRoute('/admin/auditoria', () => <AdminAuditPage />),
  defineRoute('/admin/equipe-cali', () => <AdminStaffPage />),
  defineRoute('/admin/avisos', () => <AdminNoticesPage />),
  defineRoute('/admin/satisfacao', () => <AdminSatisfactionPage />),
  defineRoute('/admin/mapa-de-people', () => <AdminPeopleMapPage />),
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
  defineRoute('/cliente/relatorios/impressao/$reportId', () => <ReportPrintPage role="client" />),
  defineRoute('/cliente/relatorios', () => <ClientReportsPage />),
  staffRoutes,
]);

export const router = createRouter({
  routeTree,
  trailingSlash: 'preserve',
  notFoundMode: 'root',
  disableGlobalCatchBoundary: true,
});
