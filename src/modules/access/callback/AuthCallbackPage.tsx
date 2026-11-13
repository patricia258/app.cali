import { Navigate } from '../../../components/navigation/Navigate';
import { useAuthCallback } from './hooks/useAuthCallback';

export function AuthCallbackPage() {
  const destination = useAuthCallback();

  if (destination) return <Navigate to={destination} replace />;

  return <main className="route-loading tw:grid tw:min-h-screen tw:place-items-center tw:content-center tw:gap-[14px] tw:bg-[color:var(--ivory,var(--cali-color-canvas))]"><div className="tw:font-cali-heading tw:text-[2.1rem] tw:tracking-[.1em] tw:text-[color:var(--burgundy,var(--cali-color-burgundy))]">CALI</div><p className="tw:text-[.94rem]">Confirmando seu acesso…</p></main>;
}
