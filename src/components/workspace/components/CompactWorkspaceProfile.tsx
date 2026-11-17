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

  const menuItem = 'tw:flex tw:items-center tw:justify-between tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-soft tw:bg-transparent tw:px-1 tw:py-3.5 tw:font-semibold tw:text-cali-brand';
  const metaItem = 'tw:flex tw:justify-between tw:gap-2.5 tw:text-xs/[inherit] tw:text-cali-sand-text';
  const metaValue = 'tw:text-right tw:text-cali-neutral-text';
  const avatarStyle = 'tw:grid tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-lg tw:bg-cali-sand-line tw:font-bold tw:text-cali-brand';
  const roleLabel = role === 'admin' ? 'Administradora' : role === 'partner' ? 'Partner · Equipe CALI' : 'Cliente';

  return <div className="tw:relative" ref={root}>
    <DirectProfileControl role={role} partnerHasOccurrences={partnerHasOccurrences} trigger={({ profile, avatar, companyName, openEditor }) => <>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)} className="profile tw:flex tw:items-center tw:gap-2.5 tw:border-0 tw:bg-transparent tw:text-sm/[inherit] tw:text-cali-neutral-text">
        <span className={`avatar small ${avatarStyle} tw:rounded-lg tw:[&>*]:rounded-lg tw:[&_:is(img,video)]:block tw:[&_:is(img,video)]:size-full tw:[&_:is(img,video)]:object-cover tw:size-8.5 tw:text-cali-label/[inherit]`}>{avatar}</span>
        <span className="tw:[@media(max-width:53.125rem)]:hidden">{profile.full_name}</span>
        <ChevronDown size={13} className="tw:[@media(max-width:53.125rem)]:hidden" />
      </button>
      {open && <div className="profile-dropdown v2-profile tw:absolute tw:top-[calc(100%+1.077rem)] tw:right-0 tw:z-45 tw:flex tw:min-w-[20.231rem] tw:flex-col tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-4 tw:shadow-[0_12px_30px_rgb(var(--cali-rgb-red-inverse)/0.1294)]" role="menu">
        <div className="tw:flex tw:items-center tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:px-1 tw:pt-1.5 tw:pb-4.5">
          <span className={`avatar small ${avatarStyle} tw:rounded-lg tw:[&>*]:rounded-lg tw:[&_:is(img,video)]:block tw:[&_:is(img,video)]:size-full tw:[&_:is(img,video)]:object-cover tw:size-11.5 tw:text-xs/[inherit]`}>{avatar}</span>
          <span className="tw:flex tw:flex-col tw:gap-1.5 tw:text-cali-sand-text"><strong className="tw:text-cali-body/[inherit]">{profile.full_name}</strong><small className="tw:text-xs/[inherit] tw:text-cali-sand-text">{profile.job_title || (role === 'admin' ? 'Administradora geral' : role === 'client' ? 'Perfil cliente' : roleLabel)}</small></span>
        </div>
        <div className="tw:flex tw:flex-col tw:gap-3.5 tw:px-1 tw:py-4">
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
