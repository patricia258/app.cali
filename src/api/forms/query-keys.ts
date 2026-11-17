export const formsKeys = {
  publicForm: (slug: string, preview: boolean, actorId?: string) =>
    ['forms', 'public-form', preview ? actorId ?? null : null, slug, preview] as const,
};
