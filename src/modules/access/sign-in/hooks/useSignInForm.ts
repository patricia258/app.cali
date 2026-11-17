import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import { useAccessCodeCooldown } from './useAccessCodeCooldown';
import { useRequestAccessCode } from './useRequestAccessCode';
import { useVerifyAccessCode } from './useVerifyAccessCode';

const emailSchema = z.string().refine((email) => email.includes('@') && email.includes('.'));
const codeSchema = z.string().regex(/^\d{6}$/);

export function useSignInForm() {
  const [step, setStep] = useState<'email' | 'code'>('email');
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
  const { secondsRemaining, startCooldown } = useAccessCodeCooldown(email);
  const waitingToResend = secondsRemaining > 0;
  const resendTime = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`;
  const validInput = step === 'email' ? emailSchema.safeParse(email).success : codeSchema.safeParse(code).success;

  async function requestCode(email: string) {
    setError('');
    if (waitingToResend) {
      setStep('code');
      return;
    }
    try {
      await request.mutateAsync(email);
      startCooldown(email);
      setStep('code');
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
      setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar seu acesso.');
    }
  }

  function changeCode(value: string) {
    form.setFieldValue('code', value.replace(/\D/g, '').slice(0, 6));
    setError('');
  }

  function switchToEmail() {
    setStep('email');
    setError('');
    form.setFieldValue('code', '');
  }

  return {
    step,
    email,
    code,
    validInput,
    loading,
    error,
    waitingToResend,
    resendTime,
    setEmail: (value: string) => form.setFieldValue('email', value),
    changeCode,
    switchToEmail,
    resendCode: () => requestCode(email),
    submit: () => form.handleSubmit(),
  };
}
