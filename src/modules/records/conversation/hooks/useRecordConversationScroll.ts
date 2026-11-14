import { useLayoutEffect, useRef } from 'react';

export function useRecordConversationScroll(lastMessageId?: string) {
  const historyRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);

  function onScroll() {
    const history = historyRef.current;
    if (history) followLatest.current = history.scrollHeight - history.scrollTop - history.clientHeight <= 36;
  }

  function followSentMessage() {
    followLatest.current = true;
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }

  useLayoutEffect(() => {
    if (followLatest.current) followSentMessage();
  }, [lastMessageId]);

  return { historyRef, onScroll, followSentMessage };
}
