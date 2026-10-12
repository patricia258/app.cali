import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/* Depois de uma publicação, uma aba que já estava aberta pede arquivos da versão anterior, que não existem mais.
   Nesse caso o Workspace recarrega sozinho uma vez e a pessoa segue na versão nova, sem ver a tela de erro. */
const RELOAD_KEY = 'cali:auto-reload-at';
const staleVersion = (error: unknown) => /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(String((error as Error)?.message || error));
export function reloadOnceForNewVersion() {
  try { const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); if (Date.now() - last < 20_000) return false; sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { return false; }
  window.location.reload(); return true;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (staleVersion(error) && reloadOnceForNewVersion()) return;
    console.error('CALI Workspace · erro de renderização', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="workspace-fatal-fallback" role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f3ee', fontFamily: 'Inter,system-ui,sans-serif', color: '#322f2c' }}>
        <section style={{ width: 'min(440px,100%)', background: '#fff', border: '1px solid #e9dfd8', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 18px 60px #28172414' }}>
          <span style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 800, color: '#af8f72' }}>CALI WORKSPACE</span>
          <h1 style={{ margin: 0, fontSize: 19, lineHeight: 1.3 }}>O Workspace foi atualizado.</h1>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#655a55' }}>Nada do que você fez foi perdido. Clique em recarregar para continuar na versão mais recente.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ alignSelf: 'flex-start', marginTop: 6, padding: '11px 16px', borderRadius: 7, border: '1px solid #5a1e2d', background: '#5a1e2d', color: '#fff', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Recarregar Workspace</button>
        </section>
      </main>
    );
  }
}
