import { SignInBrand } from './components/SignInBrand';
import { SignInForm } from './components/SignInForm';
import { SignInFooter } from './components/SignInFooter';
import { useRedirectSignedIn } from './hooks/useRedirectSignedIn';
import './sign-in-motion.css';

export function LoginPage() {
  useRedirectSignedIn();

  return <main className="login-v2 tw:grid tw:h-dvh tw:min-h-[39.375rem] tw:grid-cols-[minmax(27.5rem,1fr)_minmax(32.5rem,1.04fr)] tw:grid-rows-[minmax(0,1fr)_auto] tw:overflow-hidden tw:bg-cali-day-canvas tw:font-[Inter,system-ui,-apple-system,sans-serif] tw:text-cali-ink tw:[color-scheme:light] tw:max-[1081px]:grid-cols-[minmax(390px,.92fr)_minmax(470px,1.08fr)] tw:max-[861px]:h-auto tw:max-[861px]:min-h-dvh tw:max-[861px]:grid-cols-1 tw:max-[861px]:grid-rows-[auto_1fr_auto] tw:max-[861px]:overflow-visible">
    <SignInBrand />
    <SignInForm />
    <SignInFooter />
  </main>;
}
