import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { WorkspaceAuthProvider } from './auth/WorkspaceAuthProvider';
import { RouteRuntimeManager } from './runtime/RouteRuntimeManager';
import { initializeWorkspaceTheme, startWorkspaceThemeClock } from './lib/workspaceTheme';
import { startIdentityMediaRuntime } from './lib/identityMediaRuntime';
import { installNotificationExperienceRuntime } from './lib/notificationExperienceRuntime';
import { installCompanyWorkspaceIdentityRuntimeV39 } from './lib/companyWorkspaceIdentityRuntimeV39';
import './styles.css';
import './modules.css';
import './ux-v2.css';
import './runtime.css';
import './page1.css';
import './page1-hotfix.css';
import './page1-pass2.css';
import './page1-rules.css';
import './workspace-invariants.css';
import './dashboard-scroll-fix.css';
import './brand-experience.css';
import './brand-experience-v2.css';
import './menu-brand-final.css';
import './theme-system.css';
import './loading-brand-standard.css';
import './page2-client-management.css';
import './page2-account-tabs.css';
import './page2-client-management-v3.css';
import './modal-standard-v2.css';
import './modal-system-v3.css';
import './workspace-typography-connect.css';
import './sidebar-brand-artwork.css';
import './sidebar-capacity-v2.css';
import './login-home-v2.css';
import './people-map-admin.css';
import './people-map-admin-v2.css';
import './people-map-review.css';
import './people-map-report-fidelity.css';
import './login-theme-isolation.css';
import './workspace-polish-2026-08-30.css';
import './sidebar-closed-profile-fix.css';
import './sidebar-open-night-profile-fix.css';
import './profile-avatar-polish.css';
import './identity-media.css';
import './portal-admin-migration.css';
import './portal-proposal-editor.css';
import './portal-proposal-preview.css';
import './portal-proposals-hotfix.css';
import './portal-proposals-flow-fix.css';
import './portal-proposals-drawer-fix-v2.css';
import './portal-proposal-legacy-host.css';
import './app-error-boundary.css';
import './notification-experience-v2.css';
import './loading-illustrations-final.css';
import './chat-night-standard-v42.css';
import './workspace-theme-polish-v52.css';
import './critical-fixes-v53.css';
import './workspace-system-v61.css';

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <AppErrorBoundary key={location.key}>{children}</AppErrorBoundary>;
}

initializeWorkspaceTheme();
startWorkspaceThemeClock();
window.setTimeout(() => {
  startIdentityMediaRuntime();
  installCompanyWorkspaceIdentityRuntimeV39();
}, 900);
installNotificationExperienceRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteErrorBoundary>
        <WorkspaceAuthProvider>
          <RouteRuntimeManager />
          <App />
        </WorkspaceAuthProvider>
      </RouteErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);

// deploy final: atalhos contextuais e documento PDF fixo
