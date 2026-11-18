import { supabase } from '../supabase';

export type WorkspaceNotification = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  notification_type?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  action_url?: string | null;
};

const notificationFields = 'id,title,body,created_at,read_at,notification_type,entity_type,entity_id,action_url';
let subscriptionId = 0;

export async function listWorkspaceNotifications(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('notifications').select(notificationFields)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return data as WorkspaceNotification[] | null;
}

export function observeWorkspaceNotifications(
  userId: string,
  consumer: 'menu' | 'experience',
  listener: (item: WorkspaceNotification) => void,
) {
  const client = supabase;
  if (!client) return () => {};
  const prefix = consumer === 'menu' ? 'workspace-notifications' : 'workspace-notification-experience';
  const channel = client.channel(`${prefix}-${userId}-${++subscriptionId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'cali_workspace', table: 'notifications', filter: `user_id=eq.${userId}`,
    }, ({ new: row }) => listener(row as WorkspaceNotification))
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function markWorkspaceNotificationRead(id: string) {
  await supabase?.rpc('mark_notification_read', { p_notification_id: id });
}

export async function markAllWorkspaceNotificationsRead() {
  await supabase?.rpc('mark_all_notifications_read');
}
