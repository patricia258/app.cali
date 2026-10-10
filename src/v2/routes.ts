/* Rotas que usam a interface V2 do cliente — todas, incluindo a página de impressão do relatório, cujo
   documento (papel) traz as próprias folhas de estilo. */
export function usesClientV2(pathname: string) {
  return pathname === '/cliente' || pathname.startsWith('/cliente/');
}
