/* Rotas que usam a interface V2: todas as do cliente (incluindo a impressão do relatório, cujo papel
   traz as próprias folhas de estilo) e as da administradora já migradas. A administradora entra
   página a página — acrescente a rota aqui somente quando a página estiver na composição V2. */
const migratedAdminRoutes = new Set(['/admin', '/admin/clientes']);
export function usesV2(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return path === '/cliente' || path.startsWith('/cliente/') || migratedAdminRoutes.has(path);
}
