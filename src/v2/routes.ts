/* Rotas que usam a interface V2 do cliente. O papel de impressão de relatório é um documento
   oficial com geometria própria e fica fora. */
export function usesClientV2(pathname: string) {
  return (pathname === '/cliente' || pathname.startsWith('/cliente/')) && !pathname.includes('/relatorios/impressao/');
}
