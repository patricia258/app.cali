import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readRecordClosureContext, subscribeRecordClosure } from '../../../../api/records/closure';
import { recordsAvailable } from '../../../../api/records/client';
import { useRecordClosureFeedback } from './useRecordClosureFeedback';
import { useRequestRecordReopen } from './useRequestRecordReopen';
import { useDecideRecordReopen } from './useDecideRecordReopen';

type Selection = {
  protocol: string | null | undefined;
  recordId: string | null | undefined;
  role: 'admin' | 'client';
  actorId: string | null | undefined;
  enabled: boolean;
  workflowStatus?: string | null;
  onRecordChanged?: () => void;
};

type Confirmation = 'feedback' | 'requested' | 'approved' | 'rejected';

export function useRecordClosureExperience({
  protocol, recordId, role, actorId, enabled, workflowStatus, onRecordChanged,
}: Selection) {
  const queryClient = useQueryClient();
  const active = Boolean(recordsAvailable && enabled && actorId && recordId && protocol);
  const selection = active ? recordId ?? '' : '';
  const scope = selection ? JSON.stringify([actorId, role, selection]) : '';
  const key = ['records', 'closure', actorId, role, selection, workflowStatus] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: () => selection ? readRecordClosureContext(selection, role) : null,
    enabled: active,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (current) => {
      const closure = current.state.data?.closure;
      return active && role === 'client' && closure && !closure.answered_at && !closure.closed_unanswered_at ? 60_000 : false;
    },
  });

  const [dismissedFeedback, setDismissedFeedback] = useState('');
  const [dismissedRequest, setDismissedRequest] = useState('');
  const [clientReopen, setClientReopen] = useState('');
  const [confirmation, setConfirmation] = useState<{ id: string; kind: Confirmation } | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['records', 'closure', actorId, role, selection] });
  };
  const { mutateAsync: submitFeedback, isPending: submittingFeedback } = useRecordClosureFeedback(selection, refresh);
  const { mutateAsync: submitReopen, isPending: requestingReopen } = useRequestRecordReopen(selection, refresh);
  const { mutateAsync: submitDecision, isPending: decidingReopen } = useDecideRecordReopen(refresh);

  useEffect(() => {
    if (!selection) {
      setDismissedFeedback('');
      setDismissedRequest('');
      setClientReopen('');
      setConfirmation(null);
      return;
    }
    return subscribeRecordClosure(selection, () => {
      void queryClient.invalidateQueries({ queryKey: ['records', 'closure', actorId, role, selection] });
    });
  }, [actorId, queryClient, role, selection]);

  const ctx = active ? query.data : undefined;
  const pendingReopen = ctx?.reopen ?? null;
  const openClosure = role === 'client' && ctx?.record.workflow_status === 'completed' && ctx.closure && !ctx.closure.answered_at && !ctx.closure.closed_unanswered_at ? ctx.closure : null;
  const recordStatus = ctx?.record.workflow_status;
  const reopenAvailable = recordStatus === 'completed' || recordStatus === 'cancelled' || recordStatus === 'standby';
  const feedbackKey = openClosure ? `${scope}:${openClosure.id}` : '';
  const requestKey = pendingReopen ? `${scope}:${pendingReopen.id}` : '';
  const thanks = scope && confirmation?.id === scope ? confirmation.kind : null;

  return {
    role, ctx, selection, pendingReopen, openClosure, reopenAvailable, thanks,
    adminDecisionOpen: Boolean(role === 'admin' && pendingReopen && dismissedRequest !== requestKey),
    clientFeedbackOpen: Boolean(openClosure && dismissedFeedback !== feedbackKey),
    clientReopenOpen: Boolean(scope && clientReopen === scope),
    submittingFeedback, requestingReopen, decidingReopen,
    dismissFeedback: () => setDismissedFeedback(feedbackKey),
    openFeedback: () => setDismissedFeedback(''),
    dismissAdminDecision: () => setDismissedRequest(requestKey),
    openAdminDecision: () => setDismissedRequest(''),
    openReopen: () => setClientReopen(scope),
    dismissReopen: () => setClientReopen(''),
    dismissThanks: () => setConfirmation(null),
    sendFeedback: async (score: number, comment: string | null) => {
      if (!openClosure) return;
      await submitFeedback({ closureId: openClosure.id, score, comment });
      setDismissedFeedback(feedbackKey);
      setConfirmation({ id: scope, kind: 'feedback' });
    },
    sendReopen: async (reason: string) => {
      await submitReopen(reason);
      setClientReopen('');
      setConfirmation({ id: scope, kind: 'requested' });
      onRecordChanged?.();
    },
    decideReopen: async (decision: 'approved' | 'rejected', note: string | null) => {
      if (!pendingReopen) return;
      await submitDecision({ requestId: pendingReopen.id, decision, note });
      setDismissedRequest(requestKey);
      setConfirmation({ id: scope, kind: decision });
      onRecordChanged?.();
    },
  };
}

export type RecordClosureExperience = ReturnType<typeof useRecordClosureExperience>;
