import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { WorkspaceAuthProvider } from './auth/WorkspaceAuthProvider';
import { RouteRuntimeManager } from './runtime/RouteRuntimeManager';
import { initializeWorkspaceTheme, startWorkspaceThemeClock } from './lib/workspaceTheme';
import { startIdentityMediaRuntime } from './lib/identityMediaRuntime';
import { installNotificationExperienceRuntime } from './lib/notificationExperienceRuntime';
import { installCompanyWorkspaceIdentityRuntimeV39 } from './lib/companyWorkspaceIdentityRuntimeV39';
import { applyVisualSystem } from './client-v2/visualSystem';

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return <AppErrorBoundary>{children}</AppErrorBoundary>;
}

initializeWorkspaceTheme();
startWorkspaceThemeClock();
window.setTimeout(() => {
  startIdentityMediaRuntime();
  installCompanyWorkspaceIdentityRuntimeV39();
}, 900);
installNotificationExperienceRuntime();

void applyVisualSystem(window.location.pathname).finally(() => ReactDOM.createRoot(document.getElementById('root')!).render(
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
));

// deploy final: atalhos contextuais e documento PDF fixo
