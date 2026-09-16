export type WorkspaceTheme = 'day' | 'night';

type ThemeOverride = {
  theme: WorkspaceTheme;
  until: number;
};

const THEME_OVERRIDE_KEY = 'cali-workspace-theme-override-v1';
const THEME_EVENT = 'cali-workspace-theme-change';
let clockId: number | null = null;

export function scheduledWorkspaceTheme(date = new Date()): WorkspaceTheme {
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? 'night' : 'day';
}

export function nextThemeBoundary(date = new Date()) {
  const next = new Date(date);
  const hour = date.getHours();

  if (hour < 6) {
    next.setHours(6, 0, 0, 0);
  } else if (hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }

  return next;
}

function readThemeOverride(now = Date.now()): ThemeOverride | null {
  try {
    const raw = window.localStorage.getItem(THEME_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemeOverride>;
    if ((parsed.theme !== 'day' && parsed.theme !== 'night') || typeof parsed.until !== 'number') {
      window.localStorage.removeItem(THEME_OVERRIDE_KEY);
      return null;
    }
    if (parsed.until <= now) {
      window.localStorage.removeItem(THEME_OVERRIDE_KEY);
      return null;
    }
    return parsed as ThemeOverride;
  } catch {
    return null;
  }
}

export function resolveWorkspaceTheme(date = new Date()): WorkspaceTheme {
  if (typeof window === 'undefined') return scheduledWorkspaceTheme(date);
  return readThemeOverride(date.getTime())?.theme ?? scheduledWorkspaceTheme(date);
}

export function applyWorkspaceTheme(theme: WorkspaceTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.workspaceTheme = theme;
  document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
  if (document.body) document.body.dataset.workspaceTheme = theme;

  const themeColor = theme === 'night' ? '#171215' : '#faf8f5';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = themeColor;

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
}

export function setManualWorkspaceTheme(theme: WorkspaceTheme, date = new Date()) {
  const until = nextThemeBoundary(date).getTime();
  try {
    window.localStorage.setItem(THEME_OVERRIDE_KEY, JSON.stringify({ theme, until } satisfies ThemeOverride));
  } catch {
    // The theme still changes for the current session if storage is unavailable.
  }
  applyWorkspaceTheme(theme);
  return until;
}

export function initializeWorkspaceTheme() {
  const theme = resolveWorkspaceTheme();
  applyWorkspaceTheme(theme);
  return theme;
}

export function startWorkspaceThemeClock() {
  if (typeof window === 'undefined' || clockId !== null) return () => {};

  const sync = () => {
    const next = resolveWorkspaceTheme();
    if (document.documentElement.dataset.workspaceTheme !== next) applyWorkspaceTheme(next);
  };

  clockId = window.setInterval(sync, 30_000);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('focus', sync);

  return () => {
    if (clockId !== null) window.clearInterval(clockId);
    clockId = null;
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('focus', sync);
  };
}

export function workspaceThemeEventName() {
  return THEME_EVENT;
}
