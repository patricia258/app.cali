/* Equipe (cliente): aviso com os relatórios de gestão do perfil comportamental liberados para a empresa.
   Fica separado do relatório para não carregar o relatório inteiro na página de Equipe. Some quando não há nenhum. */
import { Link } from '../../../components/navigation/Link';
import { BarChart3 } from 'lucide-react';
import { useManagementDiscCatalog } from '../hooks/useManagementDiscCatalog';

export function GestaoBanner() {
  const { data: items = [] } = useManagementDiscCatalog();
  if (!items.length) return null;
  return <div className="tw:mx-0 tw:mt-0 tw:mb-3.5 tw:flex tw:flex-col tw:gap-2">{items.map((item) => <Link
    className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-[#eadfd6] tw:border-l-4 tw:border-l-cali-brand tw:bg-white tw:px-4 tw:py-3.5 tw:text-inherit tw:no-underline tw:hover:bg-[#fbf7f3]"
    key={item.id} to={`/cliente/perfil-comportamental/gestao/${item.id}`}>
    <BarChart3 className="tw:flex-none tw:text-cali-brand" size={18} aria-hidden="true" />
    <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5">
      <b className="tw:[font:700_.875rem_Inter,sans-serif] tw:text-cali-brand">Relatório de gestão do perfil comportamental</b>
      <small className="tw:text-[.75rem] tw:text-[#8c7e74]">{item.title} · liberado em {new Intl.DateTimeFormat('pt-BR').format(new Date(item.released_at))}</small>
    </span>
  </Link>)}</div>;
}
