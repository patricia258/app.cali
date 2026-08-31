import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initializeWorkspaceTheme, startWorkspaceThemeClock } from './lib/workspaceTheme';
import { installMapaAuthBridge } from './lib/mapaAuthBridge';
import { installMapaReviewNavigation } from './lib/mapaReviewNavigation';
import { startIdentityMediaRuntime } from './lib/identityMediaRuntime';
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
import './page2-client-management.css';
import './page2-account-tabs.css';
import './page2-client-management-v3.css';
import './modal-standard-v2.css';
import './documents-v2.css';
import './page4-calendar.css';
import './page5-projects.css';
import './page5-projects-flow-v2.css';
import './modal-system-v3.css';
import './client-modal-drive-note.css';
import './workspace-typography-connect.css';
import './page5-projects-polish-v3.css';
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
import './documents-v3.css';
import './client-documents-v3.css';
import './documents-flow-v4.css';
import './reports-admin-v2.css';
import './reports-v3.css';
import './reports-v4.css';
import './reports-v5.css';
import './reports-v6.css';
import './app-error-boundary.css';

// Carregamento global do Workspace e das experiências por módulo.
// O Mapa administrativo usa RPCs públicas seguras; o backend foi sincronizado em 30/08/2026.
initializeWorkspaceTheme();
startWorkspaceThemeClock();
installMapaAuthBridge();
installMapaReviewNavigation();
startIdentityMediaRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);
