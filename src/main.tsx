import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initializeWorkspaceTheme, startWorkspaceThemeClock } from './lib/workspaceTheme';
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
import './page3-documents.css';

// Carregamento global do Workspace e das experiências por módulo.
initializeWorkspaceTheme();
startWorkspaceThemeClock();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
