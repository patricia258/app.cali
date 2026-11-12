import './route-loading.css';

export function WorkspaceRouteLoader() {
  return (
    <main className="route-loading cali-route-loading tw:grid tw:place-items-center" aria-live="polite" aria-busy="true">
      <div className="cali-loading-illustrations tw:relative" aria-hidden="true">
        <span className="cali-loading-mark cali-loading-lime tw:absolute tw:inset-0 tw:block" />
        <span className="cali-loading-mark cali-loading-oak tw:absolute tw:inset-0 tw:block" />
      </div>
      <span className="sr-only tw:sr-only">Carregando seu Workspace</span>
    </main>
  );
}
