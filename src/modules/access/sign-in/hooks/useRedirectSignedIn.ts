import { useEffect } from 'react';
import { homeOf } from '../../../../auth/workspaceAuthContext';
import { readExistingWorkspaceRole } from '../../../../api/access/session';
import { useNavigate } from '../../../../hooks/useNavigate';

export function useRedirectSignedIn() {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    void readExistingWorkspaceRole().then((role) => {
      if (active && role) navigate(homeOf(role), { replace: true });
    }, () => undefined);
    return () => { active = false; };
  }, [navigate]);
}
