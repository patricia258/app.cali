import { skipToken, useQuery } from '@tanstack/react-query';
import { readReportPaperIdentity, readReportVisitCosts } from '../../api/reports/paper';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { ExecutiveReportPaper, type ExecutiveReportPaperProps } from './ExecutiveReportPaper';

export function WorkspaceExecutiveReportPaper(props: ExecutiveReportPaperProps) {
  const { user } = useWorkspaceAuth();
  const { protocol } = props;
  const active = Boolean(user?.id && protocol && protocol !== '—');
  const identity = useQuery({
    queryKey: ['reports', 'paper-identity', user?.id, protocol],
    queryFn: active ? ({ signal }) => readReportPaperIdentity(protocol, signal) : skipToken,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const canonical = identity.data;
  const visits = useQuery({
    queryKey: ['reports', 'paper-visits', user?.id, protocol, canonical?.approvedAt],
    queryFn: canonical ? ({ signal }) => readReportVisitCosts(canonical, signal) : skipToken,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const signatures = canonical ? {
    approvalIdentity: canonical.approvalIdentity,
    acknowledgementIdentity: canonical.acknowledgementIdentity,
    approvedAt: canonical.approvedAt,
    acknowledgedAt: canonical.acknowledgedAt,
    acknowledgementProtocol: canonical.acknowledgementProtocol,
  } : {};

  return <ExecutiveReportPaper
    {...props}
    {...signatures}
    company={{ ...props.company, logoUrl: canonical?.logoUrl || props.company.logoUrl }}
    visitCosts={visits.data}
  />;
}
