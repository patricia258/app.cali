import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TimerReset, X } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useOpenTimerOrigin } from './hooks/useOpenTimerOrigin';
import { useGlobalTimers, type GlobalTimer } from './hooks/useGlobalTimers';
import { usePauseGlobalTimer } from './hooks/usePauseGlobalTimer';
import { useFinalizeGlobalTimer } from './hooks/useFinalizeGlobalTimer';
import { GlobalTimerChip } from './components/GlobalTimerChip';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';
import type { Role } from '../workspace/WorkspaceShell';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';

type PendingFinalization = { timer: GlobalTimer; target: TimerFinalizationTarget } | null;
function primaryTimerLimit() {
  if (window.innerWidth >= 1400) return 2;
  if (window.innerWidth >= 1024) return 1;
  return 0;
}

export function GlobalTimerBar({role}:{role:Role}){
  const { user } = useWorkspaceAuth();
  const { pathname } = useLocation();
  const openTimerOrigin = useOpenTimerOrigin();
  const { data: timers } = useGlobalTimers(role === 'admin' ? user?.id : undefined);
  const [nowMs, setNowMs] = useState(Date.now);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, setPending] = useState<PendingFinalization>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const pauseTimer = usePauseGlobalTimer();
  const finishTimer = useFinalizeGlobalTimer(() => {
    setPending(null);
    setConfirmStep(1);
  });
  const busyId = pauseTimer.isPending ? pauseTimer.variables : finishTimer.isPending ? finishTimer.variables?.id : undefined;
  const tickClock = Boolean(timers?.length && !pathname.startsWith('/admin/horas'));
  const [primaryLimit, setPrimaryLimit] = useState(primaryTimerLimit);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 16 });
  const moreButton = useRef<HTMLButtonElement>(null);
  const morePanel = useRef<HTMLDivElement>(null);
  const moreCloseButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const panelTitleId = useId();

  const updatePanelPosition = useCallback(() => {
    const trigger = moreButton.current?.getBoundingClientRect();
    if (trigger) setPanelPosition({
      top: trigger.bottom + 8,
      right: Math.max(16, Math.min(window.innerWidth - trigger.right, window.innerWidth - 446)),
    });
  }, []);

  const closePanel = useCallback(() => {
    setMoreOpen(false);
    moreButton.current?.focus();
  }, []);

  useEffect(() => {
    const resize = () => {
      setPrimaryLimit(primaryTimerLimit());
      if (moreOpen) requestAnimationFrame(updatePanelPosition);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [moreOpen, updatePanelPosition]);

  useEffect(() => {
    if (!moreOpen) return;
    moreCloseButton.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !morePanel.current?.contains(event.target) && !moreButton.current?.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', updatePanelPosition);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', updatePanelPosition);
    };
  }, [closePanel, moreOpen, updatePanelPosition]);

  useEffect(() => {
    if (!tickClock) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tickClock]);

  const visibleTimers = pathname.startsWith('/admin/horas') ? [] : timers ?? [];
  function requestStop(timer: GlobalTimer) {
    if (timer.accountRecordId) return;
    setPending({
      timer,
      target: {
        id: timer.taskId || timer.deliverableId || timer.id,
        label: timer.taskName || timer.deliverableName || timer.description || 'esta atuação',
        kind: timer.taskId ? 'task' : 'deliverable',
        clientApproved: timer.deliverableStatus === 'approved',
      },
    });
    setConfirmStep(1);
    setMoreOpen(false);
  }

  function confirmStop() {
    if (pending && !busyId) finishTimer.mutate(pending.timer, {
      onError: (error) => console.error('Falha ao finalizar execução', error),
    });
  }
  const primary = visibleTimers.slice(0, primaryLimit);
  const overflow = visibleTimers.slice(primaryLimit);
  function chipProps(timer: GlobalTimer) {
    return {
      timer,
      nowMs,
      busy: busyId === timer.id,
      onOpen: () => { setMoreOpen(false); openTimerOrigin(timer); },
      onPause: () => {
        if (!busyId) pauseTimer.mutate(timer.id, {
          onError: (error) => console.error('Falha ao pausar e registrar sessão', error),
        });
      },
      onStop: () => requestStop(timer),
    };
  }
  const showMore = moreOpen && overflow.length > 0;

  return <>
    {role === 'admin' && visibleTimers.length > 0 && <div className="global-timers tw:mr-[0.3125rem] tw:flex tw:min-w-0 tw:shrink-0 tw:items-center tw:gap-[0.4375rem] tw:[@media(max-width:47.5rem)]:max-w-[16.1538rem]" aria-label="Timers ativos">
      <span className="global-timers-mark tw:grid tw:size-[2.125rem] tw:flex-none tw:place-items-center tw:rounded-[0.6875rem] tw:bg-[color:color-mix(in_srgb,var(--theme-accent)_11%,var(--theme-surface))] tw:text-cali-accent tw:workspace-compact:hidden tw:[@media(max-width:61.25rem)]:hidden" title={`${visibleTimers.length} timer(s) fora do contexto atual`}><TimerReset size={16}/></span>
      {primary.length > 0 && <div className="global-timers-primary tw:flex tw:min-w-0 tw:items-center tw:gap-[0.4375rem]">{primary.map((timer) => <GlobalTimerChip key={timer.id} {...chipProps(timer)} />)}</div>}
      {overflow.length > 0 && <button
        ref={moreButton}
        className={`global-timers-more tw:inline-flex tw:h-[2.3125rem] tw:min-w-[2.375rem] tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[0.3125rem] tw:rounded-full tw:border tw:border-solid tw:border-cali-line tw:bg-[color:var(--theme-surface-soft)] tw:px-[0.625rem] tw:text-[0.875rem] tw:font-extrabold tw:whitespace-nowrap tw:text-cali-text tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent`}
        type="button"
        aria-label={overflow.length === 1 ? 'Ver mais 1 timer ativo' : `Ver mais ${overflow.length} timers ativos`}
        aria-haspopup="dialog"
        aria-expanded={showMore}
        aria-controls={showMore ? panelId : undefined}
        onClick={() => {
          if (showMore) closePanel();
          else {
            updatePanelPosition();
            setMoreOpen(true);
          }
        }}
      >{primary.length === 0 && <TimerReset size={14}/>}+{overflow.length}</button>}
    </div>}
    {showMore && createPortal(
      <div
        className="global-timers-popover tw:fixed tw:z-1000 tw:w-[min(33.0625rem,calc(100vw-2.4615rem))] tw:overflow-auto tw:rounded-[1.1538rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-[0.75rem] tw:text-cali-text tw:shadow-[0_1.3846rem_4.2308rem_#2b2b2b2b]"
        id={panelId}
        ref={morePanel}
        role="dialog"
        aria-labelledby={panelTitleId}
        style={{ top: panelPosition.top, right: panelPosition.right, maxHeight: `calc(100dvh - ${panelPosition.top + 16}px)` }}
      >
        <header className="tw:flex tw:items-start tw:justify-between tw:gap-[0.9375rem] tw:p-[0.2308rem_0.2308rem_0.6875rem]">
          <div className="tw:grid tw:gap-[0.1538rem]"><strong className="tw:text-[0.9375rem]" id={panelTitleId}>{primary.length > 0 ? 'Outros timers' : 'Timers ativos'}</strong><small className="tw:text-[0.8077rem] tw:text-cali-muted">Empresas diferentes podem rodar em paralelo.</small></div>
          <button className={`tw:grid tw:size-[2.125rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:text-cali-muted tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent`} type="button" ref={moreCloseButton} aria-label="Fechar timers" onClick={closePanel}><X size={16}/></button>
        </header>
        <div className="tw:grid tw:gap-[0.4375rem]">{overflow.map((timer) => <GlobalTimerChip key={timer.id} {...chipProps(timer)} extended />)}</div>
      </div>,
      document.body,
    )}
    <TimerFinalizationDialog target={pending?.target||null} step={confirmStep} busy={Boolean(pending&&busyId===pending.timer.id)} onCancel={()=>{setPending(null);setConfirmStep(1);}} onAdvance={()=>setConfirmStep(2)} onConfirm={()=>void confirmStop()}/>
  </>;
}
