/* Sinal de presença do cronômetro. Enquanto a pessoa mexe no Workspace, avisa o banco a cada 2 minutos que ela está ali
   (função touch_my_timers). Se o sinal parar por 30 minutos — aba fechada, computador dormindo, pessoa ausente — o banco
   pausa o cronômetro sozinho, contando só até o último sinal (rotina close_stale_timers, migração 20261014090000). */
import { hoursAvailable } from '../../api/hours/client';
import { touchActiveTimers } from '../../api/hours/timers';
import { TIMER_EVENT } from '../../lib/timerSemantics';

let started = false;
let lastActivity = Date.now();

export function startTimerPresence() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const mark = () => { lastActivity = Date.now(); };
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((name) => window.addEventListener(name, mark, { passive: true, capture: true }));
  const beat = () => {
    if (!hoursAvailable || document.visibilityState !== 'visible') return;
    if (Date.now() - lastActivity > 5 * 60 * 1000) return; // sem mexer há mais de 5 min: não renova a presença
    void touchActiveTimers().catch(() => undefined);
  };
  window.setTimeout(beat, 4000);
  window.setInterval(beat, 2 * 60 * 1000);
  window.addEventListener(TIMER_EVENT, () => window.setTimeout(beat, 1500));
}
