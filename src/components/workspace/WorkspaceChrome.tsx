import { useEffect, useRef, useState } from 'react';
import { AtSign, Bell, CalendarDays, Check, Clock3, FileText, FolderKanban, MessageCircle } from 'lucide-react';
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

function relativeTime(value: string) {
  const date = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

function notificationVisual(type?: string) {
  const value = String(type || '').toLowerCase();
  if (/mention/.test(value)) return { kind: 'mention', icon: <AtSign size={18} /> };
  if (/report|document/.test(value)) return { kind: 'document', icon: <FileText size={18} /> };
  if (/hour|timer|capacity/.test(value)) return { kind: 'hours', icon: <Clock3 size={18} /> };
  if (/calendar|meeting|event/.test(value)) return { kind: 'calendar', icon: <CalendarDays size={18} /> };
  if (/comment|message|record|occurrence|request/.test(value)) return { kind: 'message', icon: <MessageCircle size={18} /> };
  if (/deliverable|project|approval|schedule/.test(value)) return { kind: 'project', icon: <FolderKanban size={18} /> };
  return { kind: 'general', icon: <Bell size={18} /> };
}

export function NotificationCenter({ role }: { role: Role }) {
  const { user } = useWorkspaceAuth();
  const actorId = user?.id;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkspaceNotification[]>(notificationFallback[role]);
  const [recentId, setRecentId] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
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
    <div className="chrome-popover" ref={popoverRef}>
      <button className="icon-button notification-button" aria-label="Notificações" onClick={() => setOpen((current) => !current)}>
        <Bell size={20} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notificações">
          <div className="notification-head"><div className="notification-head-title"><span className="notification-head-mark"><Bell size={18} /></span><div><strong>Notificações</strong><span>{unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</span></div></div>{unread > 0 && <button onClick={markAll}><Check size={15} />Marcar como lidas</button>}</div>
          <div className="notification-list">
            {items.length === 0 ? <div className="notification-empty"><Check size={20} /><strong>Nenhum aviso por aqui.</strong><span>Novidades de projetos, horas, agenda e validações aparecem neste canal.</span></div> : items.map((item) => {
              const visual = notificationVisual(item.notification_type);
              return <button className={`notification-item notification-kind-${visual.kind} ${item.read_at ? '' : 'unread'} ${recentId === item.id ? 'is-arriving' : ''}`} data-notification-id={item.id} data-notification-action-url={notificationUrl(item)} key={item.id} onClick={() => void openNotification(item)}><span className="notification-visual">{visual.icon}</span><div className="notification-copy"><span className="notification-title-row"><strong>{item.title}</strong>{!item.read_at && <i aria-label="Não lida" />}</span>{item.body && <p>{item.body}</p>}<small>{relativeTime(item.created_at)}</small></div></button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
