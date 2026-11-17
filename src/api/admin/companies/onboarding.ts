import { z } from 'zod';
import { preRegistrationFieldsSchema } from '../../public/pre-registration';
import { supabase } from '../../supabase';

const contractSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  date: z.string().nullable(),
  version: z.string(),
  available: z.boolean(),
});

const onboardingSchema = z.object({
  registration: z.object({
    expiresAt: z.string(),
    submittedAt: z.string().nullable(),
    fields: preRegistrationFieldsSchema.nullable(),
  }).nullable(),
  supportPartnerId: z.uuid().nullable(),
  partners: z.array(z.object({ id: z.uuid(), name: z.string() })),
  contract: contractSchema.nullable(),
  reviewVersion: z.string(),
  pendingContacts: z.array(z.object({ id: z.uuid(), name: z.string(), email: z.string() })),
  pendingAccesses: z.number().int().nonnegative(),
  activeAccesses: z.number().int().nonnegative(),
  releasedAt: z.string().nullable(),
});

export type CompanyOnboarding = z.infer<typeof onboardingSchema>;

export type AccessDraft = {
  id?: string;
  name: string;
  email: string;
  job?: string;
  phone?: string;
  whatsapp?: string;
  birthday?: string | null;
  primary_contact: boolean;
  requested: boolean;
  access_role: 'primary' | 'decision_maker' | 'additional';
};

function database() {
  if (!supabase) throw new Error('Acesso ao Workspace indisponível.');
  return supabase;
}

export async function createCompanyDraft(requestId: string, name: string, hours: number | null, service: string) {
  const result = await database().rpc('create_company_draft', {
    p_request: requestId, p_company: name, p_hours: hours, p_service: service || null,
  });
  if (result.error) throw new Error(result.error.message);
  return z.uuid().parse(result.data);
}

export async function saveCompanyAccessDraft(companyId: string, people: AccessDraft[], removedIds: string[]) {
  const result = await database().rpc('save_company_access_draft', {
    p_company: companyId, p_people: people, p_removed: removedIds,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function readCompanyOnboarding(companyId: string, signal?: AbortSignal) {
  const request = database().rpc('read_company_onboarding', { p_company: companyId });
  const result = await (signal ? request.abortSignal(signal) : request);
  if (result.error) throw new Error(result.error.message);
  return onboardingSchema.parse(result.data);
}

export async function issueCompanyPreRegistration(companyId: string, token: string) {
  const result = await database().rpc('issue_company_pre_registration', { p_company: companyId, p_token: token });
  if (result.error) throw new Error(result.error.message);
  return z.string().parse(result.data);
}

export async function setCompanySupportPartner(companyId: string, partnerId: string | null) {
  const result = await database().rpc('set_company_support_partner', { p_company: companyId, p_partner: partnerId });
  if (result.error) throw new Error(result.error.message);
}

export async function releaseCompanyAccess(
  companyId: string,
  requestId: string,
  contract: z.infer<typeof contractSchema>,
  reviewVersion: string,
  confirmed: boolean,
) {
  const result = await database().rpc('release_company_access', {
    p_company: companyId, p_request: requestId, p_contract: contract.id,
    p_contract_version: contract.version, p_review_version: reviewVersion, p_signed_and_adhesion: confirmed,
  });
  if (result.error) throw new Error(result.error.message);
  return z.object({ releasedAt: z.string(), accessCount: z.number().int().min(1).max(4) }).parse(result.data);
}
