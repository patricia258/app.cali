import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { previewDiagnosticsEnabled, writePreviewTelemetry } from './previewTelemetry';

type ShiftEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
  sources?: Array<{ node?: Node | null }>;
};

type LongTaskEntry = PerformanceEntry & { duration: number };

function scrubPath(value: string) {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b\d{8,}\b/g, ':n')
    .slice(0, 180);
}

function resourceLabel(name: string) {
  try {
    const url = new URL(name, window.location.origin);
    return `${url.hostname}${scrubPath(url.pathname)}`;
  } catch {
    return scrubPath(name);
  }
}

function describeNode(node?: Node | null) {
  if (!(node instanceof Element)) return 'unknown';
  const tag = node.tagName.toLowerCase();
  const id = node.id ? `#${node.id}` : '';
  const classes = Array.from(node.classList).slice(0, 3).map((name) => `.${name}`).join('');
  return `${tag}${id}${classes}`.slice(0, 180);
}

export function PreviewPerformanceDiagnostics() {
  const location = useLocation();

  useEffect(() => {
    if (!previewDiagnosticsEnabled()) return;

    const route = location.pathname;
    const startedAt = performance.now();
    let finalized = false;
    let cls = 0;
    let shiftCount = 0;
    let maxShift = 0;
    let longTaskCount = 0;
    let longTaskMs = 0;
    const shiftSources = new Map<string, number>();
    const observers: PerformanceObserver[] = [];

    try {
      const shiftObserver = new PerformanceObserver((list) => {
        for (const raw of list.getEntries() as ShiftEntry[]) {
          if (raw.hadRecentInput) continue;
          const value = Number(raw.value || 0);
          cls += value;
          shiftCount += 1;
          maxShift = Math.max(maxShift, value);
          for (const source of raw.sources || []) {
            const key = describeNode(source.node);
            shiftSources.set(key, (shiftSources.get(key) || 0) + 1);
          }
        }
      });
      shiftObserver.observe({ type: 'layout-shift', buffered: false } as PerformanceObserverInit);
      observers.push(shiftObserver);
    } catch {
      // Browser sem suporte a Layout Instability API.
    }

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const raw of list.getEntries() as LongTaskEntry[]) {
          longTaskCount += 1;
          longTaskMs += Number(raw.duration || 0);
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: false } as PerformanceObserverInit);
      observers.push(longTaskObserver);
    } catch {
      // Browser sem suporte a Long Tasks API.
    }

    function collectSlowResources() {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => entry.startTime >= startedAt)
        .map((entry) => entry as PerformanceResourceTiming)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map((entry) => ({
          resource: resourceLabel(entry.name),
          type: entry.initiatorType || 'unknown',
          duration_ms: Math.round(entry.duration),
          transfer_bytes: Number(entry.transferSize || 0),
        }));
    }

    function finalize(reason: 'settled' | 'route_change') {
      if (finalized) return;
      finalized = true;
      const sourceRanking = Array.from(shiftSources.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([selector, count]) => ({ selector, count }));

      void writePreviewTelemetry('preview_perf_diagnostic', {
        route,
        reason,
        elapsed_ms: Math.round(performance.now() - startedAt),
        cls: Number(cls.toFixed(5)),
        shift_count: shiftCount,
        max_shift: Number(maxShift.toFixed(5)),
        shift_sources: sourceRanking,
        long_task_count: longTaskCount,
        long_task_ms: Math.round(longTaskMs),
        resource_count: performance.getEntriesByType('resource').filter((entry) => entry.startTime >= startedAt).length,
        slow_resources: collectSlowResources(),
        dom_nodes: document.getElementsByTagName('*').length,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
    }

    function onWindowError(event: ErrorEvent) {
      void writePreviewTelemetry('preview_runtime_error', {
        route: window.location.pathname,
        name: event.error?.name || 'WindowError',
        message: String(event.error?.message || event.message || '').slice(0, 3000),
        stack: String(event.error?.stack || '').slice(0, 6000),
        source: resourceLabel(event.filename || ''),
        line: event.lineno || null,
        column: event.colno || null,
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      void writePreviewTelemetry('preview_runtime_error', {
        route: window.location.pathname,
        name: reason?.name || 'UnhandledRejection',
        message: String(reason?.message || reason || '').slice(0, 3000),
        stack: String(reason?.stack || '').slice(0, 6000),
      });
    }

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    const settleTimer = window.setTimeout(() => finalize('settled'), 5000);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      for (const observer of observers) observer.disconnect();
      finalize('route_change');
    };
  }, [location.pathname]);

  return null;
}
