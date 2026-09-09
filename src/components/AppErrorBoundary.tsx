import { Component, type ErrorInfo, type ReactNode } from 'react';
import { writePreviewTelemetry } from '../runtime/previewTelemetry';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CALI Workspace · erro de renderização', error, info);
    void writePreviewTelemetry('preview_render_error', {
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      name: error.name || 'Error',
      message: String(error.message || '').slice(0, 3000),
      stack: String(error.stack || '').slice(0, 6000),
      component_stack: String(info.componentStack || '').slice(0, 6000),
    });
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
