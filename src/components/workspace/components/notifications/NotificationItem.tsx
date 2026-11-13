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
        tw:rounded-[0.9375rem] tw:border tw:border-solid tw:p-[0.8125rem] tw:text-left tw:text-cali-text
        tw:[transition:transform_.18s_ease,background_.18s_ease,border-color_.18s_ease,box-shadow_.18s_ease]
        tw:hover:-translate-y-px tw:hover:border-[color-mix(in_srgb,#5a1e2d_10%,var(--theme-line))]
        tw:hover:bg-[color-mix(in_srgb,#5a1e2d_4%,var(--theme-surface))] tw:hover:shadow-[0_0.5rem_1.375rem_#311e240f]
        tw:motion-reduce:transition-none tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:grid-cols-[2.5rem_minmax(0,1fr)] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:p-3
        tw:workspace-compact:flex tw:workspace-compact:items-center tw:workspace-compact:gap-[0.846rem] tw:workspace-compact:rounded-none
        tw:workspace-compact:border-0 tw:workspace-compact:border-b tw:workspace-compact:border-[#f1eae5] tw:workspace-compact:p-[1.154rem]
        tw:workspace-compact:text-[#514542] tw:workspace-compact:transition-none
        tw:workspace-compact:hover:translate-y-0 tw:workspace-compact:hover:border-[#f1eae5]
        tw:workspace-compact:hover:bg-[#faf6f3] tw:workspace-compact:hover:shadow-none
        ${item.read_at
          ? 'tw:border-transparent tw:bg-transparent tw:workspace-compact:bg-white'
          : 'tw:border-[color-mix(in_srgb,#b58c52_21%,var(--theme-line))] tw:bg-[linear-gradient(115deg,color-mix(in_srgb,#e7c66f_10%,var(--theme-surface)),color-mix(in_srgb,#5a1e2d_3%,var(--theme-surface)))] tw:workspace-compact:bg-[#fffaf5] tw:workspace-compact:bg-none'}
        ${mention ? 'tw:workspace-compact:border-l-[0.308rem] tw:workspace-compact:border-l-[#d9a514] tw:workspace-compact:bg-[#fff8e6]!' : ''}
        ${arriving ? 'tw:motion-safe:animate-message-arrive tw:workspace-compact:motion-safe:animate-none' : ''}`}
    >
      <span className={`tw:grid tw:size-[2.625rem] tw:place-items-center tw:rounded-[0.8125rem] tw:border tw:border-solid
        tw:border-[color-mix(in_srgb,#5a1e2d_11%,var(--theme-line))] tw:bg-cali-surface tw:text-cali-brand tw:workspace-night:text-[#e6bd73]
        tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:size-[2.375rem] tw:[:where(html[data-workspace-surface=admin-documents]_*)]:[@media(max-width:40rem)]:rounded-xl tw:workspace-compact:block
        tw:workspace-compact:size-auto tw:workspace-compact:rounded-none tw:workspace-compact:border-0 tw:workspace-compact:bg-transparent
        tw:workspace-compact:text-[#998a81] ${mention ? 'tw:workspace-compact:bg-[#d9a514]! tw:workspace-compact:text-white!' : ''}`}>
        <NotificationIcon type={item.notification_type} mention={mention} />
      </span>
      <span className="tw:min-w-0">
        <span className="tw:flex tw:items-start tw:justify-between tw:gap-2.5 tw:workspace-compact:inline tw:workspace-compact:text-[#998a81]">
          <strong className="tw:block tw:text-[0.82rem]/[1.35] tw:workspace-compact:text-[0.846rem]/[inherit]">{item.title}</strong>
          {!item.read_at && <i aria-label="Não lida" className="tw:mt-[0.3125rem] tw:size-[0.4375rem] tw:shrink-0 tw:rounded-full
            tw:bg-cali-brand tw:shadow-[0_0_0_0.25rem_#5a1e2d14] tw:workspace-night:bg-[#e6bd73]
            tw:workspace-night:shadow-[0_0_0_0.25rem_#e6bd731a] tw:workspace-compact:invisible" />}
        </span>
        {item.body && <span className="tw:mt-1 tw:block tw:text-[0.74rem]/[1.45] tw:text-cali-muted tw:workspace-compact:m-0
          tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:text-[#998a81]">{item.body}</span>}
        <time dateTime={item.created_at} className="tw:mt-[0.4375rem] tw:block tw:text-[0.65rem]/[inherit] tw:text-[#9a918b]
          tw:workspace-compact:m-0 tw:workspace-compact:inline tw:workspace-compact:text-[0.769rem]/[inherit]
          tw:workspace-compact:text-[#998a81]">{relativeTime(item.created_at)}</time>
      </span>
    </button>
  );
}
