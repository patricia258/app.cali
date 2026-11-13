import './route-loading.css';

export function WorkspaceRouteLoader() {
  return (
    <main
      className="route-loading tw:fixed tw:inset-0 tw:z-[2147483700] tw:grid tw:h-dvh tw:min-h-dvh tw:w-screen tw:place-items-center tw:content-center tw:overflow-hidden tw:bg-cali-day-canvas tw:workspace-night:bg-cali-canvas tw:compact-content:relative tw:compact-content:inset-auto tw:compact-content:z-auto tw:compact-content:h-auto tw:compact-content:min-h-[calc(100dvh-140px)] tw:compact-content:w-auto tw:compact-content:bg-transparent"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="tw:relative tw:size-[clamp(92px,10vw,126px)] tw:workspace-compact:size-(--cali-loader-size)" aria-hidden="true">
        <span data-loader-mark="lime" className="tw:absolute tw:inset-0 tw:block tw:bg-cali-brand tw:opacity-0 tw:mask-[url('/brand/cali-lime-mark.svg')] tw:mask-contain tw:mask-center tw:mask-no-repeat tw:animate-[cali-loading-lime_var(--cali-loader-cycle)_ease-in-out_infinite] tw:motion-reduce:[animation-duration:4s] tw:workspace-compact:animate-[v2-loading-lime_var(--cali-loader-cycle)_ease-in-out_infinite] tw:workspace-night:bg-[#f1dbe1] tw:drop-shadow-[0_12px_22px_#5a1e2d14] tw:workspace-night:drop-shadow-[0_12px_24px_#0000002e] tw:workspace-compact:drop-shadow-none" />
        <span data-loader-mark="oak" className="tw:absolute tw:inset-0 tw:block tw:bg-cali-brand tw:opacity-0 tw:mask-[url('/brand/cali-oak-mark.svg')] tw:mask-contain tw:mask-center tw:mask-no-repeat tw:animate-[cali-loading-oak_var(--cali-loader-cycle)_ease-in-out_infinite] tw:motion-reduce:[animation-duration:4s] tw:workspace-compact:bg-cali-gold tw:workspace-compact:animate-[v2-loading-oak_var(--cali-loader-cycle)_ease-in-out_infinite] tw:workspace-night:bg-[#f1dbe1] tw:drop-shadow-[0_12px_22px_#5a1e2d14] tw:workspace-night:drop-shadow-[0_12px_24px_#0000002e] tw:workspace-compact:drop-shadow-none" />
      </div>
      <span className="tw:sr-only">Carregando seu Workspace</span>
    </main>
  );
}
