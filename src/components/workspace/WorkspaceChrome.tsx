import { useEffect, useId, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { readWorkspaceSession } from '../../api/access/session';
import {
  listWorkspaceNotifications,
  markAllWorkspaceNotificationsRead,
  markWorkspaceNotificationRead,
  observeWorkspaceNotifications,
  type WorkspaceNotification,
} from '../../api/workspace/notifications';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import type { Role } from './WorkspaceShell';
import { NotificationItem } from './components/notifications/NotificationItem';
import { EmptyNotifications, NotificationPanel } from './components/notifications/NotificationPanel';
import './components/notifications/notification-motion.css';

const notificationRouteParameters = new Map([
  ['deliverable', 'deliverable'],
  ['project', 'project'],
  ['scheduling_request', 'request'],
  ['file', 'documento'],
  ['report', 'report'],
]);

const notificationFallback: Record<Role, WorkspaceNotification[]> = {
  admin: [
    { id: 'demo-1', title: 'Entregável pronto para sua revisão', body: 'Grupo Aurora · Estrutura de indicadores de People', created_at: new Date().toISOString(), read_at: null, notification_type: 'deliverable' },
    { id: 'demo-2', title: 'Horas próximas do limite contratado', body: 'Novatech atingiu 82% do ciclo atual.', created_at: new Date(Date.now() - 3600000).toISOString(), read_at: null, notification_type: 'hours' },
    { id: 'demo-3', title: 'Novo comentário do cliente', body: 'Studio Norte solicitou um ajuste no ritual de gestão.', created_at: new Date(Date.now() - 86400000).toISOString(), read_at: new Date().toISOString(), notification_type: 'comment' },
  ],
  client: [
    { id: 'demo-c1', title: 'Você tem uma entrega para validar', body: 'Estrutura de indicadores de People · prazo em 2 dias.', created_at: new Date().toISOString(), read_at: null, notification_type: 'deliverable' },
    { id: 'demo-c2', title: 'Novo relatório publicado', body: 'Relatório executivo de agosto está disponível.', created_at: new Date(Date.now() - 7200000).toISOString(), read_at: null, notification_type: 'report' },
  ],
};

export function NotificationCenter({ role }: { role: Role }) {
  const panelId = useId();
  const { user } = useWorkspaceAuth();
  const actorId = user?.id;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkspaceNotification[]>(notificationFallback[role]);
  const [recentId, setRecentId] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const arrivalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    setItems(notificationFallback[role]);
    setRecentId('');
    async function load() {
      if (!actorId) return;
      const session = await readWorkspaceSession();
      if (!mounted || session?.user.id !== actorId) return;
      const data = await listWorkspaceNotifications(actorId);
      if (!mounted) return;
      if (data) setItems(data);
      unsubscribe = observeWorkspaceNotifications(actorId, 'menu', (next) => {
        if (!mounted) return;
        setItems((current) => [next, ...current].slice(0, 20));
        setRecentId(next.id);
        if (arrivalTimerRef.current) window.clearTimeout(arrivalTimerRef.current);
        arrivalTimerRef.current = window.setTimeout(() => setRecentId(''), 1400);
      });
    }
    void load();
    return () => {
      mounted = false;
      if (arrivalTimerRef.current) window.clearTimeout(arrivalTimerRef.current);
      unsubscribe?.();
    };
  }, [actorId, role]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const unread = items.filter((item) => !item.read_at).length;
  function notificationUrl(item: WorkspaceNotification) {
    const url = String(item.action_url || '').trim();
    if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return '';
    const destination = new URL(url, window.location.origin);
    if (destination.origin !== window.location.origin) return '';
    const parameter = notificationRouteParameters.get(item.entity_type || '');
    if (!parameter || !item.entity_id || destination.searchParams.has(parameter)) return url;
    destination.searchParams.set(parameter, item.entity_id);
    return destination.pathname + destination.search + destination.hash;
  }
  async function openNotification(item: WorkspaceNotification) {
    await markRead(item);
    const url = notificationUrl(item);
    if (url) window.location.assign(url);
  }
  async function markRead(item: WorkspaceNotification) {
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, read_at: notification.read_at || new Date().toISOString() } : notification));
    if (!item.id.startsWith('demo-')) await markWorkspaceNotificationRead(item.id);
  }
  async function markAll() {
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    await markAllWorkspaceNotificationsRead();
  }

  return (
    <div
      ref={popoverRef}
      className="tw:relative tw:workspace-compact:[@media(max-width:53.75rem)]:static"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notificações"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`tw:relative tw:grid tw:size-10 tw:cursor-pointer tw:place-items-center tw:rounded-xl
          tw:border tw:border-solid tw:p-0 tw:shadow-[0_0.25rem_0.875rem_#331e230e]
          tw:[transition:background_.18s_ease,border-color_.18s_ease,color_.18s_ease,box-shadow_.18s_ease,transform_.18s_ease]
          tw:hover:-translate-y-px tw:motion-reduce:transition-none tw:workspace-compact:inline-flex
          tw:workspace-compact:size-auto tw:workspace-compact:items-center tw:workspace-compact:justify-center
          tw:workspace-compact:rounded-none tw:workspace-compact:border-0 tw:workspace-compact:p-[0.385rem] tw:workspace-compact:shadow-none
          tw:workspace-compact:hover:translate-y-0 tw:workspace-compact:[&>svg]:size-[1.308rem]
          ${unread
            ? 'tw:border-[color-mix(in_srgb,var(--cali-color-gold)_42%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-gold)_11%,var(--theme-surface))] tw:text-cali-brand tw:[&>svg]:stroke-[2.25] tw:workspace-night:border-[#b58c5261] tw:workspace-night:bg-[#b58c5224] tw:workspace-night:text-[#e4bb70] tw:workspace-compact:bg-[#f6edf0] tw:workspace-compact:text-cali-brand tw:workspace-compact:shadow-[0_0_0_0.231rem_#5a1e2d14]! tw:workspace-compact:[&>svg]:origin-[50%_10%] tw:workspace-compact:[&>svg]:motion-safe:animate-[notification-bell-ring_2.8s_ease-in-out_infinite]'
            : 'tw:border-[#5a1e2d1a] tw:bg-white/80 tw:text-cali-text tw:workspace-night:border-cali-line tw:workspace-night:bg-[#241b1f] tw:workspace-compact:bg-transparent tw:workspace-compact:text-[#5d5350]'}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="tw:absolute tw:-top-[0.4375rem] tw:-right-[0.4375rem] tw:grid tw:h-[1.3125rem]
            tw:min-w-[1.3125rem] tw:place-items-center tw:rounded-full tw:border-2 tw:border-solid tw:border-[var(--ivory)]
            tw:bg-cali-brand tw:px-[0.3125rem] tw:text-[0.68rem]/none tw:font-extrabold tw:text-white
            tw:shadow-[0_0.25rem_0.75rem_#5a1e2d2e] tw:workspace-compact:-top-[0.462rem] tw:workspace-compact:-right-[0.462rem]
            tw:workspace-compact:h-[1.462rem] tw:workspace-compact:min-w-[1.462rem] tw:workspace-compact:border-white
            tw:workspace-compact:bg-[#b7495d] tw:workspace-compact:px-[0.385rem] tw:workspace-compact:text-[0.769rem]/none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel id={panelId} unread={unread} onMarkAll={() => void markAll()}>
          {items.length === 0 ? <EmptyNotifications /> : items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              url={notificationUrl(item)}
              arriving={recentId === item.id}
              onOpen={() => void openNotification(item)}
            />
          ))}
        </NotificationPanel>
      )}
    </div>
  );
}
