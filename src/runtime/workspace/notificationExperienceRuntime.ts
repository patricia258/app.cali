import { observeWorkspaceSession } from '../../api/access/session';
import { observeWorkspaceNotifications } from '../../api/workspace/notifications';

type SoundKind = 'chat' | 'movement';

let installed = false;
let actorId: string | null = null;
let stopNotifications: (() => void) | undefined;
let audioContext: AudioContext | null = null;
let lastSoundAt = 0;

async function unlockAudio() {
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch {
    // O destaque visual permanece disponível mesmo sem áudio.
  }
}

function classifyNotification(type?: string | null): SoundKind {
  const value = String(type || '').toLowerCase();
  if (value.includes('reaction')) return 'movement';
  if (value.includes('message') || value.includes('comment') || value.includes('reply') || value.includes('chat')) return 'chat';
  return 'movement';
}

async function playSound(kind: SoundKind) {
  const nowMs = Date.now();
  if (nowMs - lastSoundAt < 750) return;
  try {
    await unlockAudio();
    if (!audioContext || audioContext.state !== 'running') return;
    lastSoundAt = nowMs;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(audioContext.destination);

    const frequencies = kind === 'chat'
      ? [659.25, 880, 987.77]
      : [523.25, 659.25];
    const step = kind === 'chat' ? 0.085 : 0.13;
    const peak = kind === 'chat' ? 0.12 : 0.09;
    const duration = kind === 'chat' ? 0.48 : 0.42;

    gain.gain.exponentialRampToValueAtTime(peak, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator();
      oscillator.type = kind === 'chat' ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * step);
      oscillator.stop(now + 0.24 + index * step);
    });
  } catch {
    // Navegadores podem bloquear áudio; o sino ainda muda visualmente.
  }
}

function highlightBell(kind: SoundKind) {
  const bell = document.querySelector<HTMLElement>('.notification-button');
  if (!bell) return;
  bell.classList.remove('workspace-notification-arrived', 'workspace-notification-chat', 'workspace-notification-movement');
  void bell.offsetWidth;
  bell.classList.add('workspace-notification-arrived', kind === 'chat' ? 'workspace-notification-chat' : 'workspace-notification-movement');
  window.setTimeout(() => bell.classList.remove('workspace-notification-arrived', 'workspace-notification-chat', 'workspace-notification-movement'), 3400);
}

function notify(kind: SoundKind) {
  highlightBell(kind);
  void playSound(kind);
}

function setNotificationActor(userId: string | null) {
  if (actorId === userId) return;
  stopNotifications?.();
  stopNotifications = undefined;
  actorId = userId;
  if (!userId) return;
  stopNotifications = observeWorkspaceNotifications(userId, 'experience', (item) => {
    if (actorId === userId) notify(classifyNotification(item.notification_type));
  });
}

export function installNotificationExperienceRuntime() {
  if (installed) return;
  installed = true;
  const boot = () => {
    observeWorkspaceSession((session) => setNotificationActor(session?.user.id ?? null));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  const unlock = () => void unlockAudio();
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('cali:workspace-chime', (event: Event) => {
    const custom = event as CustomEvent<{ kind?: SoundKind }>;
    notify(custom.detail?.kind === 'movement' ? 'movement' : 'chat');
  });
}
