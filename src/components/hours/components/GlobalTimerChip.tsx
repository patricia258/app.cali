import { Pause, Square } from 'lucide-react';
import type { GlobalTimer } from '../hooks/useGlobalTimers';

const focusStyle = 'tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent';
const timerControl = 'global-timer-control tw:grid tw:size-[2rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border-0 tw:bg-[color:var(--theme-surface-soft)] tw:p-0 tw:disabled:cursor-wait tw:disabled:opacity-45 tw:[@media(max-width:47.5rem)]:size-[1.875rem]';
const compactControl = 'tw:workspace-compact:size-[2.3125rem] tw:workspace-compact:rounded-[0.5625rem] tw:workspace-compact:border tw:workspace-compact:border-solid';

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
    ? 'global-timer-chip-expanded tw:h-[3.375rem] tw:w-full'
    : 'tw:h-[2.9375rem] tw:workspace-compact:inline-flex tw:workspace-compact:h-[3.0625rem] tw:workspace-compact:gap-[0.625rem] tw:workspace-compact:rounded-[0.6875rem] tw:workspace-compact:border-cali-success tw:workspace-compact:bg-cali-success tw:workspace-compact:p-[0.3846rem_0.4375rem_0.3846rem_0.3846rem] tw:workspace-compact:text-white tw:workspace-compact:shadow-[0_0.4375rem_1.3846rem_#35644833]';
  const originLayout = extended ? 'tw:flex-1' : 'tw:workspace-compact:inline-flex tw:workspace-compact:leading-none tw:workspace-compact:text-white';
  const copyLayout = extended
    ? 'tw:flex-auto tw:[@media(max-width:61.25rem)]:hidden'
    : 'tw:max-w-[6.1538rem] tw:[@media(max-width:61.25rem)]:hidden tw:workspace-compact:inline-flex tw:workspace-compact:items-center tw:workspace-compact:leading-none tw:workspace-compact:text-white';
  const logoLayout = extended
    ? 'tw:[@media(max-width:47.5rem)]:hidden'
    : 'tw:workspace-compact:size-[2.3125rem] tw:workspace-compact:min-h-[2.3125rem] tw:workspace-compact:min-w-[2.3125rem] tw:workspace-compact:rounded-[0.5625rem] tw:workspace-compact:bg-white tw:[@media(max-width:47.5rem)]:hidden';
  return <article className={`global-timer-chip tw:flex tw:min-w-0 tw:items-center tw:gap-[0.3846rem] tw:overflow-hidden tw:rounded-[0.9375rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-[0.2308rem_0.3846rem_0.2308rem_0.3125rem] tw:shadow-[0_0.3846rem_1.3846rem_#2b2b2b0d] tw:[@media(max-width:61.25rem)]:pl-[0.2308rem] ${chipLayout}`}>
    <button className={`global-timer-origin tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-[0.4375rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-cali-text ${originLayout} ${extended ? focusStyle : ''}`} type="button" onClick={onOpen} title="Abrir origem do timer">
      <span className={`global-timer-logo tw:grid tw:size-[2.25rem] tw:min-h-[2.25rem] tw:min-w-[2.25rem] tw:flex-none tw:place-items-center tw:overflow-hidden tw:rounded-[0.6875rem] tw:bg-[color:var(--theme-surface-soft)] tw:text-[0.6875rem] tw:font-extrabold tw:text-cali-accent ${logoLayout}`}>
        {timer.companyLogo
          ? <img className="tw:block tw:size-full tw:max-h-full tw:max-w-full tw:bg-white tw:object-cover" src={timer.companyLogo} alt="" width={29} height={29} decoding="async" />
          : initials(timer.companyName)}
      </span>
      <span className={`global-timer-copy tw:grid tw:min-w-0 ${copyLayout}`}>
        <strong className="tw:truncate tw:text-[0.8077rem] tw:leading-[1.1]" title={workLabel || timer.description || ''}>
          {workLabel || (timer.description || '').split(' · ').pop() || timer.projectName || 'Atuação CALI'}
        </strong>
        {extended && <small className="tw:truncate tw:text-[0.75rem] tw:text-cali-muted">{timer.companyName}</small>}
      </span>
    </button>
    <span className={`global-timer-clock tw:font-[ui-monospace,SFMono-Regular,Menlo,monospace] tw:text-[0.875rem] tw:font-extrabold tw:tracking-[.01em] tw:whitespace-nowrap tw:text-[#47775f] tw:[@media(max-width:61.25rem)]:text-[0.875rem] ${extended ? '' : 'tw:workspace-compact:inline-flex tw:workspace-compact:items-center tw:workspace-compact:text-[1.0000rem] tw:workspace-compact:leading-none tw:workspace-compact:font-bold tw:workspace-compact:text-white'}`}>{timerLabel(timerSeconds(timer, nowMs))}</span>
    <button className={`${timerControl} tw:text-cali-text ${extended ? focusStyle : `${compactControl} tw:workspace-compact:border-[#ffffff55] tw:workspace-compact:bg-[#ffffff1f] tw:workspace-compact:text-white`}`} type="button" disabled={busy} onClick={onPause}
      aria-label="Pausar e registrar esta sessão" title="Pausar: registra esta sessão e remove o timer">
      <Pause size={14}/>
    </button>
    {!timer.accountRecordId && <button className={`${timerControl} stop tw:text-[#8d3345] ${extended ? focusStyle : `${compactControl} tw:workspace-compact:border-white tw:workspace-compact:bg-white tw:workspace-compact:text-[#24523a]`}`} type="button" disabled={busy}
      onClick={onStop} aria-label="Finalizar trabalho definitivamente" title="Stop: finalizar trabalho definitivamente">
      <Square size={13}/>
    </button>}
  </article>;
}
