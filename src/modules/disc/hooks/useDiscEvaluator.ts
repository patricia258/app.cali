import { useQuery } from '@tanstack/react-query';
import { readDiscSigner, readEvaluatorCompanyContext, readEvaluatorReference, readEvaluatorResult } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { Style } from '../profileMethod';
import type { ProfileBase, ProfileResultView, ProfileSigner } from '../components/ProfileReports';

export type DiscEvaluatorRow = ProfileResultView & { company_id: string | null; team_member_id: string | null; email: string; report_path: string | null };

export function discEvaluatorKey(actorId: string | undefined, id: string) {
  return ['disc', 'evaluator', actorId, id] as const;
}

export function useDiscEvaluator(id: string, admin: boolean) {
  const { user, role, active } = useWorkspaceAuth();
  return useQuery({
    queryKey: discEvaluatorKey(user?.id, id),
    queryFn: async () => {
      const [base, signer, data] = await Promise.all([
        readEvaluatorReference(), readDiscSigner(), readEvaluatorResult(id),
      ]);
      if (!data) return null;
      const { companies, ...fields } = data;
      const company = Array.isArray(companies) ? companies[0] : companies;
      const row: DiscEvaluatorRow = { ...fields, company_name: company?.display_name || data.company_name };
      const context = row.company_id ? await readEvaluatorCompanyContext(row.company_id) : { styles: [], members: [] };
      return {
        row, base: base as ProfileBase | null, signer: signer as ProfileSigner | null,
        team: context.styles as Array<{ primary_style: Style }>, members: context.members,
      };
    },
    enabled: Boolean(admin && id && user && active && role === 'admin'),
    gcTime: 0,
  });
}

export type DiscEvaluatorData = NonNullable<ReturnType<typeof useDiscEvaluator>['data']>;
