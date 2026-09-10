import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CALI Workspace · erro de renderização', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="workspace-fatal-fallback" role="alert">
        <section>
          <span>CALI WORKSPACE</span>
          <h1>Não foi possível concluir esta navegação.</h1>
          <p>A página não foi perdida. Recarregue o Workspace para retomar a sessão.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar Workspace</button>
        </section>
      </main>
    );
  }
}
