/* Rotas que usam a interface V2: todas as do cliente (incluindo a impressão do relatório, cujo papel
   traz as próprias folhas de estilo) e as da administradora já migradas. A administradora entra
   página a página — acrescente a rota aqui somente quando a página estiver na composição V2. */
const migratedAdminRoutes = new Set(['/admin', '/admin/clientes', '/admin/equipe', '/admin/projetos', '/admin/horas', '/admin/calendario', '/admin/registros', '/admin/documentos', '/admin/satisfacao', '/admin/propostas', '/admin/mapa-de-people', '/admin/relatorios', '/admin/avisos', '/admin/auditoria', '/admin/equipe-cali']);
/* Páginas que só sabem em tempo de execução se usam a moldura V2. Ex.: a rota da proposta serve tanto o PDF
   oficial arquivado (moldura V2) quanto a prévia do rascunho, que continua nas folhas antigas porque é dela
   que sai o PDF — medido em 2026-10-11: trocar a moldura mudava títulos e espaçamentos do documento. */
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
const migratedAdminPrefixes: string[] = [];
export function usesV2(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return path === '/cliente' || path.startsWith('/cliente/') || path === '/equipe' || path.startsWith('/equipe/') || migratedAdminRoutes.has(path) || migratedAdminPrefixes.some((prefix) => path.startsWith(prefix)) || runtimeV2Paths.has(path);
}
