/* As áreas Cliente e Partner usam a moldura compacta. As rotas Admin de edição,
   visualização e impressão de documentos podem usar a composição de documentos. */
const migratedAdminRoutes = new Set(['/admin', '/admin/clientes', '/admin/equipe', '/admin/projetos', '/admin/horas', '/admin/calendario', '/admin/registros', '/admin/documentos', '/admin/satisfacao', '/admin/propostas', '/admin/mapa-de-people', '/admin/formularios', '/admin/perfil-comportamental', '/admin/relatorios', '/admin/avisos', '/admin/auditoria', '/admin/equipe-cali']);
/* A prévia do rascunho usa a composição de documentos que gera o PDF.
   Quando existe um PDF arquivado, o visualizador usa a moldura compacta. */
const runtimeV2Paths = new Set<string>();
const normalize = (pathname: string) => pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
export const RUNTIME_V2_EVENT = 'cali:v2-routes-changed';
export function markRuntimeV2(pathname: string) {
  const path = normalize(pathname);
  if (runtimeV2Paths.has(path)) return;
  runtimeV2Paths.add(path);
  // A moldura do Workspace é persistente: avisa para ela se redesenhar com o layout V2.
  window.dispatchEvent(new CustomEvent(RUNTIME_V2_EVENT));
}
const migratedAdminPrefixes: string[] = ['/admin/perfil-comportamental/'];
export function usesV2(pathname: string) {
  const path = normalize(pathname);
  return path === '/cliente' || path.startsWith('/cliente/') || path === '/equipe' || path.startsWith('/equipe/') || migratedAdminRoutes.has(path) || migratedAdminPrefixes.some((prefix) => path.startsWith(prefix)) || runtimeV2Paths.has(path);
}
