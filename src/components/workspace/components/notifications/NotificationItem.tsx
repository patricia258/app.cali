import { AtSign, Bell, CalendarDays, Clock3, FileText, FolderKanban, MessageCircle } from 'lucide-react';
import type { WorkspaceNotification } from '../../../../api/workspace/notifications';

function NotificationIcon({ type, mention }: { type?: string; mention: boolean }) {
  const value = String(type || '').toLowerCase();
  if (mention) return <AtSign size={18} />;
  if (/report|document/.test(value)) return <FileText size={18} />;
  if (/hour|timer|capacity/.test(value)) return <Clock3 size={18} />;
  if (/calendar|meeting|event/.test(value)) return <CalendarDays size={18} />;
  if (/comment|message|record|occurrence|request/.test(value)) return <MessageCircle size={18} />;
  if (/deliverable|project|approval|schedule/.test(value)) return <FolderKanban size={18} />;
  return <Bell size={18} />;
}

function relativeTime(value: string) {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)}d`;
}

export function NotificationItem({ item, url, arriving, onOpen }: {
  item: WorkspaceNotification;
  url: string;
  arriving: boolean;
  onOpen: () => void;
}) {
  const mention = /mention/i.test(item.notification_type || '');
  return (
    <button
      type="button"
      data-notification-id={item.id}
      data-notification-action-url={url}
      onClick={onOpen}
      className={`tw:relative tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2.75rem_minmax(0,1fr)] tw:items-start tw:gap-3
        tw:rounded-2xl tw:border tw:border-solid tw:p-3 tw:text-left tw:text-cali-text
        tw:[transition:transform_.18s_ease,background_.18s_ease,border-color_.18s_ease,box-shadow_.18s_ease]
        tw:hover:-translate-y-px tw:hover:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_10%,var(--theme-line))]
        tw:hover:bg-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_4%,var(--theme-surface))] tw:hover:shadow-[0_0.5rem_1.375rem_rgb(var(--cali-rgb-red-inverse)/0.05882)]
        tw:motion-reduce:transition-none tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:grid-cols-[2.5rem_minmax(0,1fr)] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-3
        tw:workspace-compact:flex tw:workspace-compact:items-center tw:workspace-compact:gap-3.5 tw:workspace-compact:rounded-none
        tw:workspace-compact:border-0 tw:workspace-compact:border-b tw:workspace-compact:border-cali-neutral-soft tw:workspace-compact:p-4.5
        tw:workspace-compact:text-cali-muted tw:workspace-compact:transition-none
        tw:workspace-compact:hover:translate-y-0 tw:workspace-compact:hover:border-cali-neutral-soft
        tw:workspace-compact:hover:bg-cali-surface-soft tw:workspace-compact:hover:shadow-none
        ${item.read_at
          ? 'tw:border-transparent tw:bg-transparent tw:workspace-compact:bg-cali-neutral-surface'
          : 'tw:border-[color-mix(in_srgb,var(--cali-color-gold-accent)_21%,var(--theme-line))] tw:bg-[linear-gradient(115deg,color-mix(in_srgb,var(--cali-color-orange-line)_10%,var(--theme-surface)),color-mix(in_srgb,var(--cali-color-burgundy-accent)_3%,var(--theme-surface)))] tw:workspace-compact:bg-cali-sand-surface tw:workspace-compact:bg-none'}
        ${mention ? 'tw:workspace-compact:border-l-[0.308rem] tw:workspace-compact:border-l-cali-gold tw:workspace-compact:bg-cali-warning-surface!' : ''}
        ${arriving ? 'tw:motion-safe:animate-message-arrive tw:workspace-compact:motion-safe:animate-none' : ''}`}
    >
      <span className={`tw:grid tw:size-10.5 tw:place-items-center tw:rounded-xl tw:border tw:border-solid
        tw:border-[color-mix(in_srgb,var(--cali-color-burgundy-accent)_11%,var(--theme-line))] tw:bg-cali-surface tw:text-cali-brand tw:workspace-night:text-cali-orange-line
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:size-9.5 tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:rounded-xl tw:workspace-compact:block
        tw:workspace-compact:size-auto tw:workspace-compact:rounded-none tw:workspace-compact:border-0 tw:workspace-compact:bg-transparent
        tw:workspace-compact:text-cali-muted ${mention ? 'tw:workspace-compact:bg-cali-gold! tw:workspace-compact:text-cali-neutral-surface!' : ''}`}>
        <NotificationIcon type={item.notification_type} mention={mention} />
      </span>
      <span className="tw:min-w-0">
        <span className="tw:flex tw:items-start tw:justify-between tw:gap-2.5 tw:workspace-compact:inline tw:workspace-compact:text-cali-muted">
          <strong className="tw:block tw:text-cali-detail/[1.35] tw:workspace-compact:text-sm/[inherit]">{item.title}</strong>
          {!item.read_at && <i aria-label="Não lida" className="tw:mt-1 tw:size-2 tw:shrink-0 tw:rounded-full
            tw:bg-cali-brand tw:shadow-[0_0_0_0.25rem_rgb(var(--cali-rgb-burgundy-accent)/0.07843)] tw:workspace-night:bg-cali-orange-line
            tw:workspace-night:shadow-[0_0_0_0.25rem_rgb(var(--cali-rgb-orange-line)/0.102)] tw:workspace-compact:invisible" />}
        </span>
        {item.body && <span className="tw:mt-1 tw:block tw:text-xs/[1.45] tw:text-cali-muted tw:workspace-compact:m-0
          tw:workspace-compact:text-xs/[inherit] tw:workspace-compact:text-cali-muted">{item.body}</span>}
        <time dateTime={item.created_at} className="tw:mt-2 tw:block tw:text-cali-micro/[inherit] tw:text-cali-sand-text
          tw:workspace-compact:m-0 tw:workspace-compact:inline tw:workspace-compact:text-xs/[inherit]
          tw:workspace-compact:text-cali-muted">{relativeTime(item.created_at)}</time>
      </span>
    </button>
  );
}
