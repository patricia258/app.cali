import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../../../hooks/useNavigate';

type Destination = { label: string; href: string };

export function CompactWorkspaceSearch({ admin, destinations, resetKey }: { admin: boolean; destinations: Destination[]; resetKey: string }) {
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

  const searchStyle = 'global-search tw:flex tw:w-[18.154rem] tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-neutral-soft tw:bg-cali-surface-soft tw:px-3.5 tw:py-3 tw:text-sm/[inherit] tw:text-cali-sand-text tw:[@media(max-width:78.125rem)]:w-[13.077rem] tw:[@media(max-width:53.125rem)]:hidden';

  return (
    <div className="tw:relative" ref={root}>
      {searching
        ? <label className={searchStyle}><Search size={15} /><input className="tw:w-full tw:min-w-0 tw:border-0 tw:bg-transparent tw:p-0 tw:text-cali-text tw:outline-none" autoFocus value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) navigate(results[0].href); }} placeholder="Buscar no Workspace" aria-label="Buscar no Workspace" /></label>
        : <button type="button" className={`${searchStyle} tw:cursor-pointer tw:text-left ${admin ? 'tw:[@media(max-width:37.5rem)]:size-11 tw:[@media(max-width:37.5rem)]:justify-center tw:[@media(max-width:37.5rem)]:p-0 tw:[@media(max-width:37.5rem)]:[&>:is(span,kbd)]:hidden' : ''}`} onClick={() => setSearching(true)} aria-label="Buscar no Workspace"><Search size={15} /><span>Buscar no Workspace</span><kbd className="tw:ml-auto tw:rounded-sm tw:border tw:border-solid tw:border-cali-sand-line tw:px-1 tw:py-0.5 tw:text-xs/[inherit] tw:text-cali-sand-accent">⌘ K</kbd></button>}
      {searching && <div className="profile-dropdown v2-search-results tw:absolute tw:top-[calc(100%+1.077rem)] tw:left-0 tw:z-45 tw:flex tw:min-w-full tw:flex-col tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:pt-2 tw:pb-3.5 tw:shadow-[0_0.923rem_2.308rem_rgb(var(--cali-rgb-red-inverse)/0.1294)] tw:[@media(max-width:47.5rem)]:right-0 tw:[@media(max-width:47.5rem)]:left-auto tw:[@media(max-width:47.5rem)]:w-[min(20rem,calc(100vw-1.846rem))] tw:[@media(max-width:47.5rem)]:min-w-0" role="listbox" aria-label="Resultados">
        {results.length ? results.map((item) => (
          <button key={item.href} type="button" role="option" aria-selected={false} className="tw:flex tw:items-center tw:justify-between tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-soft tw:bg-transparent tw:px-0 tw:pt-3.5 tw:font-semibold tw:text-cali-brand tw:first:border-t-0" onClick={() => navigate(item.href)}>{item.label} <ChevronRight size={14} /></button>
        )) : <span className="tw:text-xs/[inherit] tw:text-cali-sand-text">Nenhum módulo encontrado.</span>}
      </div>}
    </div>
  );
}
