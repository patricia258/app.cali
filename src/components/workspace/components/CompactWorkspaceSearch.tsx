import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../../../hooks/useNavigate';

type Destination = { label: string; href: string };

export function CompactWorkspaceSearch({ destinations, resetKey }: { destinations: Destination[]; resetKey: string }) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState('');
  const wanted = term.trim().toLocaleLowerCase('pt-BR');
  const results = wanted ? destinations.filter((item) => item.label.toLocaleLowerCase('pt-BR').includes(wanted)) : destinations;

  useEffect(() => {
    setSearching(false);
    setTerm('');
  }, [resetKey]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setSearching(true);
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    if (!searching) return;
    function outside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setSearching(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSearching(false);
    }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [searching]);

  const searchStyle = 'global-search tw:flex tw:w-[18.154rem] tw:items-center tw:gap-[0.692rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#eee9e3] tw:bg-[#faf8f5] tw:px-[0.923rem] tw:py-[0.692rem] tw:text-[0.846rem]/[inherit] tw:text-[#9b938e] tw:[@media(max-width:78.125rem)]:w-[13.077rem] tw:[@media(max-width:53.125rem)]:hidden';

  return (
    <div className="tw:relative" ref={root}>
      {searching
        ? <label className={searchStyle}><Search size={15} /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) navigate(results[0].href); }} placeholder="Buscar no Workspace" aria-label="Buscar no Workspace" /></label>
        : <button type="button" className={`${searchStyle} tw:cursor-pointer tw:text-left`} onClick={() => setSearching(true)} aria-label="Buscar no Workspace"><Search size={15} /><span>Buscar no Workspace</span><kbd className="tw:ml-auto tw:rounded-[0.308rem] tw:border tw:border-solid tw:border-[#ebe5df] tw:px-[0.308rem] tw:py-[0.077rem] tw:text-[0.769rem]/[inherit] tw:text-[#b2a8a1]">⌘ K</kbd></button>}
      {searching && <div className="profile-dropdown v2-search-results tw:absolute tw:top-[calc(100%+1.077rem)] tw:z-45 tw:flex tw:min-w-full tw:flex-col tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e9ded6] tw:bg-white tw:px-4 tw:pt-[0.462rem] tw:pb-[0.923rem] tw:shadow-[0_12px_30px_#34202121]" role="listbox" aria-label="Resultados">
        {results.length ? results.map((item) => (
          <button key={item.href} type="button" role="option" aria-selected={false} className="tw:flex tw:items-center tw:justify-between tw:border-0 tw:border-t tw:border-solid tw:border-[#efeae7] tw:bg-transparent tw:px-0 tw:pt-[0.923rem] tw:font-semibold tw:text-cali-brand tw:first:border-t-0" onClick={() => navigate(item.href)}>{item.label} <ChevronRight size={14} /></button>
        )) : <span className="tw:text-[0.769rem]/[inherit] tw:text-[#867c75]">Nenhum módulo encontrado.</span>}
      </div>}
    </div>
  );
}
