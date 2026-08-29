import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './modules.css';
import './ux-v2.css';
import './runtime.css';
import './page1.css';
import './page1-hotfix.css';
import './page1-pass2.css';
import './page1-rules.css';
import './workspace-invariants.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);