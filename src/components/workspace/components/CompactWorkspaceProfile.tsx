import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../../../hooks/useNavigate';
import { DirectProfileControl } from '../DirectProfileControl';
import { WELCOME_OPEN_EVENT } from '../WelcomeTour';

type Role = 'admin' | 'client' | 'partner';

export function CompactWorkspaceProfile({ role, partnerHasOccurrences, resetKey, onLogout }: {
  role: Role;
  partnerHasOccurrences: boolean;
  resetKey: string;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [resetKey]);
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  function act(action: () => void) {
    setOpen(false);
    action();
  }

  const menuItem = 'tw:flex tw:items-center tw:justify-between tw:border-0 tw:border-t tw:border-solid tw:border-[#efeae7] tw:bg-transparent tw:px-[0.308rem] tw:py-[0.923rem] tw:font-semibold tw:text-cali-brand';
  const metaItem = 'tw:flex tw:justify-between tw:gap-[0.615rem] tw:text-[0.769rem]/[inherit] tw:text-[#a09389]';
  const metaValue = 'tw:text-right tw:text-[#574a45]';
  const avatarStyle = 'tw:grid tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[0.538rem] tw:bg-[#eadbd5] tw:font-bold tw:text-cali-brand';
  const roleLabel = role === 'admin' ? 'Administradora' : role === 'partner' ? 'Partner · Equipe CALI' : 'Cliente';

  return <div className="tw:relative" ref={root}>
    <DirectProfileControl role={role} partnerHasOccurrences={partnerHasOccurrences} trigger={({ profile, avatar, companyName, openEditor }) => <>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)} className="profile tw:flex tw:items-center tw:gap-[0.615rem] tw:border-0 tw:bg-transparent tw:text-[0.846rem]/[inherit] tw:text-[#554b47]">
        <span className={`avatar small ${avatarStyle} tw:size-[2.077rem] tw:text-[0.692rem]/[inherit]`}>{avatar}</span>
        <span className="tw:[@media(max-width:53.125rem)]:hidden">{profile.full_name}</span>
        <ChevronDown size={13} className="tw:[@media(max-width:53.125rem)]:hidden" />
      </button>
      {open && <div className="profile-dropdown v2-profile tw:absolute tw:top-[calc(100%+1.077rem)] tw:right-0 tw:z-45 tw:flex tw:min-w-[20.231rem] tw:flex-col tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e9ded6] tw:bg-white tw:p-4 tw:shadow-[0_12px_30px_#34202121]" role="menu">
        <div className="tw:flex tw:items-center tw:gap-[0.846rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#efe6e1] tw:px-[0.308rem] tw:pt-[0.385rem] tw:pb-[1.077rem]">
          <span className={`avatar small ${avatarStyle} tw:size-[2.923rem] tw:text-[0.769rem]/[inherit]`}>{avatar}</span>
          <span className="tw:flex tw:flex-col tw:gap-[0.385rem] tw:text-[#867c75]"><strong className="tw:text-[0.923rem]/[inherit]">{profile.full_name}</strong><small className="tw:text-[0.769rem]/[inherit] tw:text-[#93867d]">{profile.job_title || (role === 'admin' ? 'Administradora geral' : role === 'client' ? 'Perfil cliente' : roleLabel)}</small></span>
        </div>
        <div className="tw:flex tw:flex-col tw:gap-[0.846rem] tw:px-[0.308rem] tw:py-4">
          {companyName && <span className={metaItem}>Empresa <b className={metaValue}>{companyName}</b></span>}
          <span className={metaItem}>Acesso <b className={metaValue}>{roleLabel}</b></span>
        </div>
        <button type="button" className={menuItem} role="menuitem" onClick={() => act(openEditor)}>Minha conta <ChevronRight size={14} /></button>
        {role !== 'admin' && <button type="button" className={menuItem} role="menuitem" onClick={() => act(() => window.dispatchEvent(new Event(WELCOME_OPEN_EVENT)))}>Rever apresentação <ChevronRight size={14} /></button>}
        {role === 'client' && <button type="button" className={menuItem} role="menuitem" onClick={() => act(() => navigate('/cliente/ajuda'))}>Dúvidas frequentes <ChevronRight size={14} /></button>}
        <button type="button" className={menuItem} role="menuitem" onClick={() => act(onLogout)}>Sair <ArrowRight size={14} /></button>
      </div>}
    </>} />
  </div>;
}
