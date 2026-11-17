import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { recordRespondentProgress } from '../../../../api/disc/respondent';

export function useRecordRespondentProgress(inviteToken: string, answered: number, enabled: boolean) {
  const lastSent = useRef(-1);
  const { mutate } = useMutation({
    gcTime: 0,
    mutationFn: (block: number) => recordRespondentProgress(inviteToken, block),
  });
  useEffect(() => {
    if (!inviteToken || !enabled || answered <= lastSent.current) return;
    lastSent.current = answered;
    mutate(answered);
  }, [answered, enabled, inviteToken, mutate]);
}
