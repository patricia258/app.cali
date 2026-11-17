import { useQuery } from '@tanstack/react-query';
import { discKeys } from '../../../api/disc/query-keys';
import { z } from 'zod';
import { STYLES } from '../profileMethod';
import { readMemberDiscHistory } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

const scores = z.object({ natural: z.record(z.enum(STYLES), z.object({ pct: z.number() })) });
const row = z.object({
  id: z.string(),
  created_at: z.string(),
  primary_style: z.enum(STYLES),
  secondary_style: z.enum(STYLES),
  mixed: z.boolean(),
  scores,
});

export function useMemberDiscHistory(memberId: string, admin: boolean) {
  const { user, active, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: discKeys.memberHistory(user?.id, memberId),
    queryFn: async ({ signal }) => (await readMemberDiscHistory(memberId, signal)).flatMap((item) => {
      const result = row.safeParse(item);
      return result.success ? [result.data] : [];
    }),
    enabled: Boolean(admin && memberId && user && active && role === 'admin'),
    gcTime: 0,
  });
}
