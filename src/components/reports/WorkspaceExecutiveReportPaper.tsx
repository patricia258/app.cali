import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { ExecutiveReportPaper, type ExecutiveReportPaperProps } from './ExecutiveReportPaper';

import { useReportPaperIdentity } from './hooks/useReportPaperIdentity';
import { useReportVisitCosts } from './hooks/useReportVisitCosts';
import { useReportAgendaSnapshot } from './hooks/useReportAgendaSnapshot';

export function WorkspaceExecutiveReportPaper({ pinnedCompanyLogo, ...props }: ExecutiveReportPaperProps & { pinnedCompanyLogo?: boolean }) {
  const { user } = useWorkspaceAuth();
  const { protocol } = props;
  const { data: canonical } = useReportPaperIdentity(user?.id, protocol);
  const { data: visitCosts } = useReportVisitCosts(user?.id, protocol, canonical);
  const { data: agenda } = useReportAgendaSnapshot(user?.id, protocol);
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
    company={{ ...props.company, logoUrl: pinnedCompanyLogo ? props.company.logoUrl : canonical?.logoUrl || props.company.logoUrl }}
    visitCosts={visitCosts}
    agenda={agenda}
  />;
}
