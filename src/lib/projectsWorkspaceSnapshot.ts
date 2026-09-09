import { supabase } from './supabase';

export type ProjectsWorkspaceSnapshot = {
  companies: any[];
  projects: any[];
  fronts: any[];
  deliverables: any[];
  tasks: any[];
  hours: any[];
  timers: any[];
};

type CachedSnapshot = {
  snapshot: ProjectsWorkspaceSnapshot;
  savedAt: number;
};

const SNAPSHOT_CACHE_KEY = 'cali-admin-projects-workspace-snapshot-v1';
const SNAPSHOT_CACHE_TTL = 5 * 60 * 1000;
export const projectsSnapshotUpdatedEvent = 'cali:projects-snapshot-updated';

function normalizeSnapshot(value: unknown): ProjectsWorkspaceSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    companies: Array.isArray(raw.companies) ? raw.companies : [],
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    fronts: Array.isArray(raw.fronts) ? raw.fronts : [],
    deliverables: Array.isArray(raw.deliverables) ? raw.deliverables : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    hours: Array.isArray(raw.hours) ? raw.hours : [],
    timers: Array.isArray(raw.timers) ? raw.timers : [],
  };
}

export function readProjectsWorkspaceSnapshot(): ProjectsWorkspaceSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedSnapshot;
    if (!cached?.savedAt || Date.now() - cached.savedAt > SNAPSHOT_CACHE_TTL) {
      window.sessionStorage.removeItem(SNAPSHOT_CACHE_KEY);
      return null;
    }
    return normalizeSnapshot(cached.snapshot);
  } catch {
    return null;
  }
}

export function writeProjectsWorkspaceSnapshot(snapshot: ProjectsWorkspaceSnapshot) {
  try {
    window.sessionStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify({ snapshot, savedAt: Date.now() } satisfies CachedSnapshot));
  } catch {
    // Cache de sessão é apenas uma aceleração; nunca bloqueia o Workspace.
  }
  window.dispatchEvent(new CustomEvent(projectsSnapshotUpdatedEvent));
}

export function clearProjectsWorkspaceSnapshot() {
  try {
    window.sessionStorage.removeItem(SNAPSHOT_CACHE_KEY);
  } catch {
    // Sem efeito funcional se o navegador bloquear storage.
  }
}

export async function fetchProjectsWorkspaceSnapshot() {
  if (!supabase) return { data: null as ProjectsWorkspaceSnapshot | null, error: new Error('Supabase não configurado.') };
  const { data, error } = await supabase.rpc('get_admin_projects_workspace_snapshot');
  if (error) return { data: null as ProjectsWorkspaceSnapshot | null, error };
  const snapshot = normalizeSnapshot(data);
  if (!snapshot) return { data: null as ProjectsWorkspaceSnapshot | null, error: new Error('Snapshot de Projetos inválido.') };
  writeProjectsWorkspaceSnapshot(snapshot);
  return { data: snapshot, error: null };
}
