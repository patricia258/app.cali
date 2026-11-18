export const publicKeys = {
  preRegistration: (token: string) => ['public', 'company-pre-registration', null, token] as const,
};
