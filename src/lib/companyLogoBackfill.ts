import { observeCompanyIdentityChanges } from '../api/workspace/identity';
import { backfillWorkspaceLogos } from './companyWorkspaceLogo';
import { workspaceMediaSignal } from './workspaceMedia';

export function scheduleCompanyLogoBackfill() {
  const signal = workspaceMediaSignal();
  if (!signal || signal.aborted) return;

  const timers = [2500, 7000].map((delay) => window.setTimeout(() => {
    if (delay === 7000) signal.removeEventListener('abort', cancel);
    void backfillWorkspaceLogos(2, signal);
  }, delay));
  function cancel() {
    for (const timer of timers) window.clearTimeout(timer);
  }
  signal.addEventListener('abort', cancel, { once: true });
}

export function startCompanyLogoBackfill(signal: AbortSignal) {
  if (signal.aborted) return;
  let companyUpdateTimer = 0;

  const stopCompanyUpdates = observeCompanyIdentityChanges(() => {
    if (signal.aborted) return;
    window.clearTimeout(companyUpdateTimer);
    companyUpdateTimer = window.setTimeout(() => void backfillWorkspaceLogos(2, signal), 700);
  });
  void backfillWorkspaceLogos(3, signal);
  window.addEventListener('focus', () => void backfillWorkspaceLogos(2, signal), { signal });

  signal.addEventListener('abort', () => {
    window.clearTimeout(companyUpdateTimer);
    stopCompanyUpdates();
  }, { once: true });
}
