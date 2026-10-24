/* Equipe (cliente): aviso com os relatórios de gestão do perfil comportamental liberados para a empresa.
   Fica separado do relatório para não carregar o relatório inteiro na página de Equipe. Some quando não há nenhum. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './gestao-banner.css';

type Item = { id: string; title: string; released_at: string };

export function GestaoBanner() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { if (supabase) void supabase.rpc('profile_gestao_list').then(({ data }) => setItems(Array.isArray(data) ? data as Item[] : [])); }, []);
  if (!items.length) return null;
  return <div className="cgp-banner">{items.map((item) => <Link key={item.id} to={`/cliente/perfil-comportamental/gestao/${item.id}`}>
    <BarChart3 size={18} aria-hidden="true" /><span><b>Relatório de gestão do perfil comportamental</b><small>{item.title} · liberado em {new Intl.DateTimeFormat('pt-BR').format(new Date(item.released_at))}</small></span>
  </Link>)}</div>;
}
