import { Pause, Square } from 'lucide-react';
import type { GlobalTimer } from '../hooks/useGlobalTimers';

const focusStyle = 'tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent';
const timerControl = 'global-timer-control tw:grid tw:size-8 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border-0 tw:bg-[color:var(--theme-surface-soft)] tw:p-0 tw:disabled:cursor-wait tw:disabled:opacity-45 tw:[@media(max-width:47.5rem)]:size-7.5';
const compactControl = 'tw:workspace-compact:size-9 tw:workspace-compact:rounded-lg tw:workspace-compact:border tw:workspace-compact:border-solid';

function timerSeconds(timer:GlobalTimer,nowMs:number){return Math.max(0,Math.floor((nowMs-new Date(timer.startedAt).getTime())/1000)-Number(timer.pausedSeconds||0));}
function timerLabel(seconds:number){const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();}

export function GlobalTimerChip({ timer, nowMs, extended = false, busy, onOpen, onPause, onStop }: {
timer: GlobalTimer;
nowMs: number;
extended?: boolean;
busy: boolean;
onOpen: () => void;
onPause: () => void;
onStop: () => void;
}) {
  const workLabel = timer.recordTitle || timer.taskName || timer.deliverableName;
  const chipLayout = extended
    ? 'global-timer-chip-expanded tw:h-13.5 tw:w-full'
    : 'tw:h-12 tw:workspace-compact:inline-flex tw:workspace-compact:h-12 tw:workspace-compact:gap-2.5 tw:workspace-compact:rounded-cali-panel tw:workspace-compact:border-cali-success tw:workspace-compact:bg-cali-success tw:workspace-compact:p-[0.3846rem_0.4375rem_0.3846rem_0.3846rem] tw:workspace-compact:text-cali-neutral-surface tw:workspace-compact:shadow-[0_0.4375rem_1.3846rem_rgb(var(--cali-rgb-green-text)/0.2)]';
  const originLayout = extended ? 'tw:flex-1' : 'tw:workspace-compact:inline-flex tw:workspace-compact:leading-none tw:workspace-compact:text-cali-neutral-surface';
  const copyLayout = extended
    ? 'tw:flex-auto tw:[@media(max-width:61.25rem)]:hidden'
    : 'tw:max-w-[6.1538rem] tw:[@media(max-width:61.25rem)]:hidden tw:workspace-compact:inline-flex tw:workspace-compact:items-center tw:workspace-compact:leading-none tw:workspace-compact:text-cali-neutral-surface';
  const logoLayout = extended
    ? 'tw:[@media(max-width:47.5rem)]:hidden'
    : 'tw:workspace-compact:size-9 tw:workspace-compact:min-h-[2.3125rem] tw:workspace-compact:min-w-[2.3125rem] tw:workspace-compact:rounded-lg tw:workspace-compact:bg-cali-neutral-surface tw:[@media(max-width:47.5rem)]:hidden';
  return <article className={`global-timer-chip tw:flex tw:min-w-0 tw:items-center tw:gap-1.5 tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-[0.2308rem_0.3846rem_0.2308rem_0.3125rem] tw:shadow-[0_0.3846rem_1.3846rem_rgb(var(--cali-rgb-neutral-strong)/0.05098)] tw:[@media(max-width:61.25rem)]:pl-1 ${chipLayout}`}>
    <button className={`global-timer-origin tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-2 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-cali-text ${originLayout} ${extended ? focusStyle : ''}`} type="button" onClick={onOpen} title="Abrir origem do timer">
      <span className={`global-timer-logo tw:grid tw:size-9 tw:min-h-9 tw:min-w-9 tw:flex-none tw:place-items-center tw:overflow-hidden tw:rounded-cali-panel tw:bg-[color:var(--theme-surface-soft)] tw:text-cali-label tw:font-extrabold tw:text-cali-accent ${logoLayout}`}>
        {timer.companyLogo
          ? <img className="tw:block tw:size-full tw:max-h-full tw:max-w-full tw:bg-cali-neutral-surface tw:object-cover" src={timer.companyLogo} alt="" width={29} height={29} decoding="async" />
          : initials(timer.companyName)}
      </span>
      <span className={`global-timer-copy tw:grid tw:min-w-0 ${copyLayout}`}>
        <strong className="tw:truncate tw:text-cali-detail tw:leading-[1.1]" title={workLabel || timer.description || ''}>
          {workLabel || (timer.description || '').split(' · ').pop() || timer.projectName || 'Atuação CALI'}
        </strong>
        {extended && <small className="tw:truncate tw:text-xs tw:text-cali-muted">{timer.companyName}</small>}
      </span>
    </button>
    <span className={`global-timer-clock tw:font-[ui-monospace,SFMono-Regular,Menlo,monospace] tw:text-sm tw:font-extrabold tw:tracking-[.01em] tw:whitespace-nowrap tw:text-cali-green-accent tw:[@media(max-width:61.25rem)]:text-sm ${extended ? '' : 'tw:workspace-compact:inline-flex tw:workspace-compact:items-center tw:workspace-compact:text-base tw:workspace-compact:leading-none tw:workspace-compact:font-bold tw:workspace-compact:text-cali-neutral-surface'}`}>{timerLabel(timerSeconds(timer, nowMs))}</span>
    <button className={`${timerControl} tw:text-cali-text ${extended ? focusStyle : `${compactControl} tw:workspace-compact:border-cali-neutral-surface/33 tw:workspace-compact:bg-cali-neutral-surface/12 tw:workspace-compact:text-cali-neutral-surface`}`} type="button" disabled={busy} onClick={onPause}
      aria-label="Pausar e registrar esta sessão" title="Pausar: registra esta sessão e remove o timer">
      <Pause size={14}/>
    </button>
    {!timer.accountRecordId && <button className={`${timerControl} stop tw:text-cali-red-text ${extended ? focusStyle : `${compactControl} tw:workspace-compact:border-cali-neutral-surface tw:workspace-compact:bg-cali-neutral-surface tw:workspace-compact:text-cali-green-strong`}`} type="button" disabled={busy}
      onClick={onStop} aria-label="Finalizar trabalho definitivamente" title="Stop: finalizar trabalho definitivamente">
      <Square size={13}/>
    </button>}
  </article>;
}
