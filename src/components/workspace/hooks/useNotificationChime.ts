import { useEffect, useRef } from 'react';
import { observeWorkspaceNotifications } from '../../../api/workspace/notifications';

type SoundKind = 'chat' | 'movement';

function classifyNotification(type?: string | null): SoundKind {
  const value = String(type || '').toLowerCase();
  if (value.includes('reaction')) return 'movement';
  if (value.includes('message') || value.includes('comment') || value.includes('reply') || value.includes('chat')) return 'chat';
  return 'movement';
}

function playSound(context: AudioContext, kind: SoundKind) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.connect(context.destination);

  const frequencies = kind === 'chat' ? [659.25, 880, 987.77] : [523.25, 659.25];
  const step = kind === 'chat' ? 0.085 : 0.13;
  const peak = kind === 'chat' ? 0.12 : 0.09;
  const duration = kind === 'chat' ? 0.48 : 0.42;

  gain.gain.exponentialRampToValueAtTime(peak, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = kind === 'chat' ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(now + index * step);
    oscillator.stop(now + 0.24 + index * step);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      if (index === frequencies.length - 1) gain.disconnect();
    }, { once: true });
  });
}

export function useNotificationChime(actorId: string | null) {
  const play = useRef<(kind: SoundKind) => void>();

  useEffect(() => {
    let context: AudioContext | undefined;
    let active = true;
    let lastSoundAt = 0;
    const unlockAudio = async () => {
      try {
        context ||= new AudioContext();
        if (context.state === 'suspended') await context.resume();
      } catch {
        // O sino continua disponível quando o navegador bloqueia áudio.
      }
    };
    const unlock = () => { void unlockAudio(); };
    play.current = async (kind) => {
      if (Date.now() - lastSoundAt < 750) return;
      await unlockAudio();
      if (!active || context?.state !== 'running' || Date.now() - lastSoundAt < 750) return;
      lastSoundAt = Date.now();
      try {
        playSound(context, kind);
      } catch {
        // O contexto pode ter sido interrompido pelo navegador.
      }
    };
    const chime = (event: Event) => {
      const custom = event as CustomEvent<{ kind?: SoundKind }>;
      play.current?.(custom.detail?.kind === 'movement' ? 'movement' : 'chat');
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('cali:workspace-chime', chime);

    return () => {
      active = false;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('cali:workspace-chime', chime);
      play.current = undefined;
      void context?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!actorId) return;
    let active = true;
    const unsubscribe = observeWorkspaceNotifications(actorId, 'experience', (item) => {
      if (active) play.current?.(classifyNotification(item.notification_type));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [actorId]);
}
