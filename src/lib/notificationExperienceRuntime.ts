import { supabase } from './supabase';

let installed = false;
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let audioContext: AudioContext | null = null;
let lastChimeAt = 0;

async function unlockAudio() {
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch {
    // O destaque visual permanece disponível mesmo sem áudio.
  }
}

async function chime() {
  const nowMs = Date.now();
  if (nowMs - lastChimeAt < 700) return;
  try {
    await unlockAudio();
    if (!audioContext || audioContext.state !== 'running') return;
    lastChimeAt = nowMs;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    gain.connect(audioContext.destination);
    [659.25, 880, 987.77].forEach((frequency, index) => {
      const osc = audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start(now + index * 0.085);
      osc.stop(now + 0.28 + index * 0.085);
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

function notifyArrival() {
  highlightBell();
  void chime();
}

async function subscribe() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;
  if (channel) await supabase.removeChannel(channel);
  channel = supabase.channel(`workspace-notification-experience-${userId}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'notifications', filter: `user_id=eq.${userId}` }, notifyArrival)
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
  window.addEventListener('cali:workspace-chime', notifyArrival);
}
