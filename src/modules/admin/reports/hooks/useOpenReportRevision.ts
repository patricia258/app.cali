import { useNavigate } from '../../../../hooks/useNavigate';

export function useOpenReportRevision() {
  const navigate = useNavigate();
  return (revisionId: string) => navigate(`/admin/relatorios?${new URLSearchParams({ report: revisionId })}`);
}
