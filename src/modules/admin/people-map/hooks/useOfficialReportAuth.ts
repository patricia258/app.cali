import { useEffect, type RefObject } from 'react';
import { readWorkspaceSession } from '../../../../api/access/session';

export const officialReportOrigin = 'https://mapa.calirh.com';

type ReportWindow = { iframe: RefObject<HTMLIFrameElement>; popup?: never }
  | { popup: RefObject<WeakSet<Window>>; iframe?: never };

export function useOfficialReportAuth({ iframe, popup }: ReportWindow) {
  useEffect(() => {
    let active = true;
    const isReport = (source: Window) => iframe?.current?.contentWindow === source || popup?.current?.has(source);

    async function respond(event: MessageEvent) {
      if (event.origin !== officialReportOrigin || !event.source) return;
      const report = event.source as Window;
      if (!isReport(report)) return;
      if (event.data?.type !== 'CALI_MAPA_AUTH_REQUEST') return;

      const session = await readWorkspaceSession().catch(() => null);
      if (!active || !isReport(report) || !session?.access_token) return;
      report.postMessage({ type: 'CALI_MAPA_AUTH_RESPONSE', access_token: session.access_token }, officialReportOrigin);
    }

    window.addEventListener('message', respond);
    return () => {
      active = false;
      window.removeEventListener('message', respond);
    };
  }, [iframe, popup]);
}
