export const peopleMapKeys = {
  delivery: (actorId: string | undefined, recordId?: string | null) => ['people-map', 'delivery', actorId ?? null, recordId ?? null] as const,
  sendReport: (actorId: string | undefined) => ['people-map', 'send-report', actorId ?? null] as const,
};
