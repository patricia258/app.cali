import { supabase } from './supabase';

let installed = false;
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let audioContext: AudioContext | null = null;

async function unlockAudio() {
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch {
    // O destaque visual permanece disponível mesmo sem áudio.
  }
}

async function chime() {
  if (document.hidden) return;
  try {
    await unlockAudio();
    if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    gain.connect(audioContext.destination);
    [659.25, 880].forEach((frequency, index) => {
      const osc = audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start(now + index * 0.075);
      osc.stop(now + 0.24 + index * 0.075);
    });
  } catch {
    // Navegadores podem bloquear áudio; o sino ainda muda visualmente.
  }
}

function highlightBell() {
  const bell = document.querySelector<HTMLElement>('.notification-button');
  if (!bell) return;
  bell.classList.remove('workspace-notification-arrived');
  void bell.offsetWidth;
  bell.classList.add('workspace-notification-arrived');
  window.setTimeout(() => bell.classList.remove('workspace-notification-arrived'), 3400);
}

async function subscribe() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;
  if (channel) await supabase.removeChannel(channel);
  channel = supabase.channel(`workspace-notification-experience-${userId}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
      highlightBell();
      void chime();
    })
    .subscribe();
}

export function installNotificationExperienceRuntime() {
  if (installed) return;
  installed = true;
  const boot = () => void subscribe();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  const unlock = () => void unlockAudio();
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('focus', () => { if (!channel) void subscribe(); });
}
