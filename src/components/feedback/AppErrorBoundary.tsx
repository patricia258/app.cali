import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/* Depois de uma publicação, uma aba que já estava aberta pede arquivos da versão anterior, que não existem mais.
   Nesse caso o Workspace recarrega sozinho uma vez e a pessoa segue na versão nova, sem ver a tela de erro. */
const RELOAD_KEY = 'cali:auto-reload-at';
const staleVersion = (error: Error) => /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(error.message);
export function reloadOnceForNewVersion() {
  try { const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); if (Date.now() - last < 20_000) return false; sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { return false; }
  window.location.replace(window.location.href); return true;
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
      <main className="workspace-fatal-fallback tw:grid tw:min-h-dvh tw:place-items-center tw:bg-cali-day-canvas tw:p-6 tw:font-[Inter,system-ui,sans-serif] tw:text-[#322f2c]" role="alert">
        <section className="tw:flex tw:w-full tw:max-w-110 tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-[#e9dfd8] tw:bg-white tw:p-7 tw:shadow-[0_18px_60px_#28172414]">
          <span className="tw:mb-3 tw:block tw:text-[10px] tw:leading-[inherit] tw:font-extrabold tw:tracking-[1.4px] tw:text-[#af8f72]">CALI WORKSPACE</span>
          <h1 className="tw:m-0 tw:text-[19px] tw:leading-[1.3]">O Workspace foi atualizado.</h1>
          <p className="tw:m-0 tw:text-[13px] tw:leading-[1.6] tw:text-[#655a55]">Nada do que você fez foi perdido. Clique em recarregar para continuar na versão mais recente.</p>
          <button type="button" className="tw:mt-1.5 tw:min-h-11 tw:cursor-pointer tw:self-start tw:rounded-[7px] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4 tw:py-[11px] tw:text-[12px] tw:leading-[inherit] tw:font-bold tw:text-white" onClick={() => window.location.assign(window.location.href)}>Recarregar Workspace</button>
        </section>
      </main>
    );
  }
}
