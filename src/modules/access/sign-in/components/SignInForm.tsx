import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { CheckCircle2, KeyRound, LifeBuoy, Mail, MessageCircle, Send } from 'lucide-react';
import { z } from 'zod';
import { accessSupportLink } from '../../../../domain/caliContacts';
import { useRequestAccessCode } from '../hooks/useRequestAccessCode';
import { useVerifyAccessCode } from '../hooks/useVerifyAccessCode';

const emailSchema = z.string().refine((email) => email.includes('@') && email.includes('.'));
const codeSchema = z.string().regex(/^\d{6}$/);

const rise = 'tw:motion-safe:animate-[sign-in-rise_.6s_cubic-bezier(.2,.7,.3,1)_both]';
const field = 'tw:mt-6 tw:grid tw:gap-[0.625rem] tw:text-[.88rem] tw:font-bold tw:text-cali-ink tw:max-[561px]:mt-[18px] tw:[@media(max-width:860px)_and_(max-height:730px)]:mt-3 tw:[@media(max-width:860px)_and_(max-height:730px)]:gap-[5px]';
const caption = 'tw:text-[0.75rem] tw:font-semibold tw:tracking-normal tw:text-[#3e3533] tw:[[data-workspace-theme=night]_&]:text-cali-ink';
const control = 'tw:flex tw:min-h-[3.625rem] tw:items-center tw:gap-[0.8125rem] tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e3d6cc] tw:bg-white tw:px-4 tw:text-[#8c8179] tw:[transition:border-color_.18s_ease,box-shadow_.18s_ease] tw:focus-within:border-cali-brand tw:focus-within:shadow-[0_0_0_0.1875rem_rgba(90,30,45,.1)] tw:[[data-workspace-theme=night]_&]:border-[#ddd2c8] tw:[[data-workspace-theme=night]_&]:bg-cali-paper tw:[@media(max-width:860px)_and_(max-height:730px)]:h-[46px] tw:[@media(max-width:860px)_and_(max-height:730px)]:min-h-[46px]';
const input = 'tw:h-14 tw:w-full tw:min-w-0 tw:rounded-none tw:border-0 tw:bg-transparent tw:p-0 tw:text-cali-ink tw:outline-none tw:placeholder:text-[#9a928c] tw:[[data-workspace-theme=night]_&]:bg-transparent! tw:[[data-workspace-theme=night]_&]:border-0! tw:[[data-workspace-theme=night]_&]:text-cali-ink! tw:[[data-workspace-theme=night]_&]:shadow-none! tw:[[data-workspace-theme=night]_&]:[-webkit-text-fill-color:var(--cali-color-ink)] tw:[[data-workspace-theme=night]_&]:placeholder:[-webkit-text-fill-color:#9a928c] tw:[@media(max-width:860px)_and_(max-height:730px)]:h-[46px] tw:[@media(max-width:860px)_and_(max-height:730px)]:min-h-[46px]';
const secondary = 'tw:min-h-[2.375rem] tw:flex-1 tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e3d6cc] tw:bg-white tw:font-semibold tw:text-[#3e3533] tw:hover:border-cali-brand tw:hover:text-cali-brand';
const helpLink = 'tw:inline-flex tw:min-h-9 tw:flex-1 tw:items-center tw:justify-center tw:gap-[0.375rem] tw:rounded-[0.5625rem] tw:border tw:border-solid tw:font-semibold tw:no-underline';
const message = 'tw:mt-4 tw:flex tw:items-center tw:gap-2 tw:rounded-[0.5625rem] tw:px-[0.875rem] tw:py-3 tw:text-[.85rem]';

export function SignInForm() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [sent, setSent] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState('');
  const request = useRequestAccessCode();
  const verify = useVerifyAccessCode();
  const loading = request.isPending || verify.isPending;
  const form = useForm({
    defaultValues: { email: '', code: '' },
    onSubmit: async ({ value }) => {
      if (step === 'email') {
        await requestCode(value.email);
      } else {
        await verifyCode(value.email, value.code);
      }
    },
  });
  const { email, code } = useStore(form.store, (state) => state.values);
  const validInput = step === 'email' ? emailSchema.safeParse(email).success : codeSchema.safeParse(code).success;

  async function requestCode(email: string) {
    setError('');
    setSent(false);
    try {
      await request.mutateAsync(email);
      setStep('code');
      setSent(true);
      form.setFieldValue('code', '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o código de acesso.');
    }
  }

  async function verifyCode(email: string, code: string) {
    setError('');
    try {
      const result = await verify.mutateAsync({ email, code });
      if (result.blocked) {
        form.setFieldValue('code', '');
        setError(result.message);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Código inválido ou expirado.');
    }
  }

  return <section className="tw:grid tw:min-h-0 tw:place-items-center tw:bg-cali-day-canvas tw:bg-[linear-gradient(rgba(90,30,45,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(90,30,45,.035)_1px,transparent_1px)] tw:bg-size-[1.75rem_1.75rem] tw:[[data-workspace-theme=night]_&]:[background:radial-gradient(circle_at_48%_48%,rgba(183,169,154,.10),transparent_30%),#f7f3ee] tw:p-[clamp(1.25rem,3.2vw,3rem)] tw:max-[1081px]:px-12 tw:max-[861px]:items-start tw:max-[861px]:px-4 tw:max-[861px]:pt-[18px] tw:max-[861px]:pb-6">
        <form className={`${rise} tw:w-full tw:max-w-[35.9375rem] tw:rounded-2xl tw:border tw:border-solid tw:border-[#e8ddd4] tw:bg-white tw:[[data-workspace-theme=night]_&]:border-cali-brand/9 tw:[[data-workspace-theme=night]_&]:bg-cali-paper/94 tw:p-[clamp(1.75rem,3.1vw,2.875rem)] tw:shadow-[0_1.125rem_2.5rem_rgba(61,35,42,.08)] tw:[animation-delay:.18s] tw:max-[861px]:mt-[-14px] tw:max-[861px]:max-w-none tw:max-[861px]:px-5 tw:max-[861px]:py-[22px]`} onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}>
          <div className="tw:mx-0 tw:mt-0 tw:mb-[0.875rem] tw:flex tw:gap-[0.375rem]" aria-hidden="true"><span className="tw:h-1 tw:flex-1 tw:rounded-full tw:bg-cali-brand" /><span className={`tw:h-1 tw:flex-1 tw:rounded-full ${step === 'code' ? 'tw:bg-cali-brand' : 'tw:bg-[#eee3dc]'}`} /></div>
          <span className="tw:mb-5 tw:block tw:text-[0.65625rem] tw:font-bold tw:tracking-[.14em] tw:text-cali-gold tw:[[data-workspace-theme=night]_&]:text-cali-brand tw:max-[561px]:mb-[11px]">{step === 'email' ? 'ACESSO SEGURO · ETAPA 1 DE 2' : 'ACESSO SEGURO · ETAPA 2 DE 2'}</span>
          <h2 className="tw:m-0 tw:font-[Inter,system-ui,sans-serif] tw:text-[clamp(1.6rem,2.4vw,2rem)] tw:leading-[1.12] tw:font-bold tw:tracking-[-.025em] tw:text-[#2b2024]! tw:[[data-workspace-theme=night]_&]:text-cali-ink! tw:max-[861px]:text-[1.55rem]">{step === 'email' ? 'Entre no seu Workspace.' : 'Digite seu código.'}</h2>
          <p className="tw:mt-[1.125rem] tw:text-[0.875rem] tw:leading-[1.55] tw:text-[#82786f] tw:[[data-workspace-theme=night]_&]:text-[#746d68] tw:max-[561px]:mt-3 tw:[@media(max-width:860px)_and_(max-height:730px)]:mt-2">
            {step === 'email'
              ? 'Informe o e-mail cadastrado. Você receberá um código numérico de uso único, sem senha para memorizar.'
              : <>Se <strong>{email}</strong> estiver cadastrado, enviamos um código de 6 dígitos. Ele expira em 10 minutos e pode ser usado uma única vez.</>}
          </p>

          {step === 'email' ? (
            <label className={field}>
              <span className={caption}>E-mail</span>
              <div className={control}>
                <Mail size={18} aria-hidden="true" />
                <input className={input} value={email} onChange={(event) => form.setFieldValue('email', event.target.value)} placeholder="voce@empresa.com.br" type="email" autoComplete="email" />
              </div>
            </label>
          ) : (
            <label className={field}>
              <span className={caption}>Código de acesso</span>
              <div className={control}>
                <KeyRound size={18} aria-hidden="true" />
                <input
                  value={code}
                  onChange={(event) => form.setFieldValue('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  className={`${input} tw:font-extrabold tw:tracking-[.28em]`}
                />
              </div>
            </label>
          )}

          <button disabled={!validInput || loading} className="tw:mt-5 tw:inline-flex tw:min-h-[3.75rem] tw:w-full tw:items-center tw:justify-center tw:gap-[0.625rem] tw:rounded-[0.5625rem] tw:border-0 tw:bg-cali-brand tw:[[data-workspace-theme=night]_&]:bg-[linear-gradient(135deg,#6d2133,#5a1e2d_56%,#431520)] tw:px-1.5 tw:py-px tw:font-semibold tw:tracking-normal tw:text-cali-paper tw:[transition:transform_.16s_ease,box-shadow_.16s_ease,opacity_.16s_ease] tw:enabled:hover:-translate-y-px tw:disabled:cursor-not-allowed tw:disabled:bg-[#b9a2a8] tw:disabled:opacity-[.48] tw:[[data-workspace-theme=night]_&]:disabled:bg-none tw:[@media(max-width:860px)_and_(max-height:730px)]:mt-3 tw:[@media(max-width:860px)_and_(max-height:730px)]:min-h-[47px]" type="submit">
            {step === 'email' ? <Send size={18} /> : <KeyRound size={18} />}
            {loading ? 'Aguarde…' : step === 'email' ? 'Enviar código de acesso' : 'Entrar no Workspace'}
          </button>

          {step === 'code' && (
            <div className="tw:mt-3 tw:flex tw:gap-2 tw:border-0 tw:p-0">
              <button type="button" disabled={loading} className={secondary} onClick={() => { setStep('email'); setError(''); setSent(false); form.setFieldValue('code', ''); }}>Trocar e-mail</button>
              <button type="button" disabled={loading} className={secondary} onClick={() => void requestCode(email)}>Reenviar código</button>
            </div>
          )}

          {sent && step === 'code' && (
            <div className={`${message} tw:bg-[#e8f1eb] tw:text-[#356448]`}><CheckCircle2 size={18} />O código costuma chegar em até 1 minuto. Não chegou? Veja o spam ou toque em “Não consigo acessar”.</div>
          )}
          {error && <div className={`${message} tw:bg-[#f4e7e5] tw:text-[#7b2638]`}>{error}</div>}

          <button type="button" className="tw:mx-auto tw:mt-[0.875rem] tw:mb-0 tw:inline-flex tw:items-center tw:gap-[0.375rem] tw:self-center tw:border-0 tw:bg-transparent tw:px-[0.375rem] tw:py-1 tw:font-semibold tw:text-cali-brand tw:hover:underline" aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>
            <LifeBuoy size={15} aria-hidden="true" />Não consigo acessar
          </button>
          {helpOpen && <div className="tw:mt-[0.625rem] tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#ecdcc0] tw:bg-[#fdf7ec] tw:px-4 tw:py-[0.875rem] tw:text-[0.78125rem] tw:leading-[1.5] tw:text-[#3e3533] tw:motion-safe:animate-[sign-in-rise_.35s_ease_both]" role="region" aria-label="Ajuda para acessar">
            <ol className="tw:mx-0 tw:mt-0 tw:mb-2 tw:grid tw:gap-1 tw:pl-[1.125rem]">
              <li>Confira se o e-mail é o mesmo cadastrado pela sua empresa no Workspace.</li>
              <li>Procure o código na caixa de spam ou promoções. O remetente é <strong>APP CALI RH</strong> (workspace@calirh.com).</li>
              <li>O código vale 10 minutos. Para pedir outro, aguarde 2 minutos.</li>
            </ol>
            <p className="tw:mx-0 tw:mt-0 tw:mb-[0.625rem] tw:text-[0.78125rem] tw:leading-[1.5] tw:text-[#82786f]">Por segurança, o Workspace não informa se um e-mail está ou não cadastrado. Se continuar sem acesso, fale com a CALI:</p>
            <div className="tw:flex tw:gap-2">
              <a className={`${helpLink} tw:border-cali-brand tw:bg-cali-brand tw:text-white`} href={`https://wa.me/5541987791933?text=${encodeURIComponent(`Olá, Patrícia. Não consigo acessar o CALI Workspace${email.trim() ? ` com o e-mail ${email.trim()}` : ''}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
              <a className={`${helpLink} tw:border-[#e3d6cc] tw:bg-white tw:text-cali-brand`} href={accessSupportLink(`Não consigo acessar o CALI Workspace${email.trim() ? ` com o e-mail ${email.trim()}` : ''}.`)}><Mail size={15} aria-hidden="true" />E-mail</a>
            </div>
          </div>}
        </form>
      </section>;
}
