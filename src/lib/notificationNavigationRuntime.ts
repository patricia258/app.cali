import { supabase } from './supabase';

let installed = false;
let navigating = false;

async function resolveNotificationByIndex(index: number) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;
  const { data } = await supabase
    .from('notifications')
    .select('id,action_url,created_at')
    .eq('user_id', sessionData.session.user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data || [])[index] || null;
}

export function installNotificationNavigationRuntime() {
  if (installed) return;
  installed = true;

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const item = target?.closest<HTMLButtonElement>('.notification-list .notification-item');
    if (!item || navigating) return;
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.notification-list .notification-item'));
    const index = items.indexOf(item);
    if (index < 0) return;

    window.setTimeout(async () => {
      const notification = await resolveNotificationByIndex(index);
      const url = String(notification?.action_url || '').trim();
      if (!url || !url.startsWith('/')) return;
      navigating = true;
      window.location.assign(url);
    }, 80);
  }, true);
}
