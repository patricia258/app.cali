import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './api/query-client';
import { router } from './app/router';
import { AppErrorBoundary, reloadOnceForNewVersion } from './components/feedback/AppErrorBoundary';
import { WorkspaceAuthProvider } from './auth/WorkspaceAuthProvider';
import './styles/tailwind.css';

// Arquivo de uma versão anterior que não existe mais (aba aberta durante uma publicação): recarrega uma vez.
window.addEventListener('vite:preloadError', (event) => { if (reloadOnceForNewVersion()) event.preventDefault(); });
import { initializeWorkspaceTheme, startWorkspaceThemeClock } from './lib/workspaceTheme';
import { startIdentityMediaRuntime } from './lib/identityMediaRuntime';
import { installNotificationExperienceRuntime } from './lib/notificationExperienceRuntime';
import { installMentionRuntime } from './lib/mentionRuntime';
import { installCompanyWorkspaceIdentityRuntimeV39 } from './lib/companyWorkspaceIdentityRuntimeV39';
import { applyVisualSystem } from './v2/visualSystem';

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
installMentionRuntime();

void applyVisualSystem(window.location.pathname).finally(() => ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouteErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WorkspaceAuthProvider>
          <RouterProvider router={router} />
        </WorkspaceAuthProvider>
      </QueryClientProvider>
    </RouteErrorBoundary>
  </React.StrictMode>,
));

// deploy final: atalhos contextuais e documento PDF fixo
