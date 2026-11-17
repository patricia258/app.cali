import { planForService, type ClientRow, type FormState } from '../../../domain/company';
import { supabase } from '../../supabase';

function meetingDefaults(plan: string) {
  return {
    meeting_sessions_included_per_month: plan === 'partner' ? 1 : 2,
    meeting_cadence_days: plan === 'partner' ? 30 : 14,
    onsite_visits_included_per_month: plan === 'partner' ? 0 : 1,
    fixed_meeting_required: true,
    meeting_mode_policy: plan === 'partner' ? 'online_only' : 'mixed_one_onsite',
  };
}

export async function saveNewCompanyProfile(
  id: string, form: FormState, logo: string | null, value: number, segment: string, branches: string[],
) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const plan = planForService(form.service);
  const meeting = plan === 'partner' || plan === 'full' ? meetingDefaults(plan) : {};
  const result = await supabase.from('companies').update({
    legal_name:form.legalName.trim(),
    logo_url:logo,
    ...(plan ? { service_plan: plan, ...meeting } : {}),
    segment:segment||null,
    decision_maker_title:form.decisionTitle||null,
    start_date:form.startDate||null,
    end_date:form.endDate||null,
    auto_renew:form.autoRenew,
    address_street:form.addressStreet||null,
    address_number:form.addressNumber||null,
    address_neighborhood:form.neighborhood||null,
    address_city:form.city||null,
    address_state:form.state||null,
    has_branches:form.hasBranches,
    branches,
    contract_value:value>0?value:null,
    billing_frequency:form.billingFrequency,
    payment_method:form.paymentMethod,
    billing_day:form.billingDay?Number(form.billingDay):null,
    billing_due_rule:form.billingDueRule,
    billing_lead_days:Number(form.billingLeadDays||3),
    payment_notes:form.notes||null,
    late_fee_percent:Number(form.lateFeePercent || 0),
    daily_interest_percent:Number(form.dailyInterestPercent || 0),
    contract_penalty_enabled:form.penaltyEnabled,
    contract_penalty_text:form.penaltyText||null,
    contract_type:form.contractType||null,
    contract_model:form.contractModel||null,
    payment_term_days:form.paymentTermDays?Number(form.paymentTermDays):null,
    drive_folder_url:form.driveUrl.trim()||null,
    document_notes:form.documentNotes.trim()||null,
    document_owner:form.documentOwner.trim()||null,
    termination_penalty_type:form.terminationPenaltyType,
    termination_penalty_value:Number(form.terminationPenaltyValue || 0),
    termination_payment_days:Number(form.terminationPaymentDays || 0),
    termination_payment_rule:form.terminationPaymentRule,
    status:'active',
  }).eq('id', id);
  if (result.error) throw result.error;
}

export async function saveExistingCompanyProfile(next: ClientRow, previousService: string | undefined) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const plan = planForService(next.service);
  const meeting = previousService !== next.service && (plan === 'partner' || plan === 'full') ? meetingDefaults(plan) : {};
  const logoValue = next.logoUrl;
  const result = await supabase.from('companies').update({
    display_name:next.name,
    legal_name:next.legalName?.trim()||'',
    logo_url:logoValue?.startsWith('blob:')?null:logoValue,
    segment:next.segment||null,
    service_type:next.service||null,
    ...(plan ? { service_plan: plan, ...meeting } : {}),
    monthly_hours_contracted:next.contractedHours||null,
    start_date:next.startDate||null,
    end_date:next.endDate||null,
    auto_renew:Boolean(next.autoRenew),
    address_street:next.addressStreet||null,
    address_number:next.addressNumber||null,
    address_neighborhood:next.neighborhood||null,
    address_city:next.city||null,
    address_state:next.state||null,
    has_branches:Boolean(next.hasBranches),
    branches:next.hasBranches?(next.branches||[]):[],
    contract_value:next.contractValue||null,
    billing_frequency:next.billingFrequency||null,
    payment_method:next.paymentMethod||null,
    billing_day:next.billingDay||null,
    billing_due_rule:next.billingDueRule||'fixed_day',
    billing_lead_days:next.billingLeadDays??3,
    payment_notes:next.financialNote||null,
    late_fee_percent:next.lateFeePercent||0,
    daily_interest_percent:next.dailyInterestPercent||0,
    contract_penalty_enabled:Boolean(next.penaltyEnabled),
    contract_penalty_text:next.penaltyText||null,
    contract_type:next.contractType||null,
    contract_model:next.contractModel||null,
    payment_term_days:next.paymentTermDays??null,
    drive_folder_url:next.driveUrl?.trim()||null,
    document_notes:next.documentNotes?.trim()||null,
    document_owner:next.documentOwner?.trim()||null,
    termination_penalty_type:next.terminationPenaltyType||'none',
    termination_penalty_value:next.terminationPenaltyValue||0,
    termination_payment_days:next.terminationPaymentDays||0,
    termination_payment_rule:next.terminationPaymentRule||'calendar_days',
    automation_enabled:Boolean(next.automationEnabled),
    welcome_email_enabled:Boolean(next.welcomeEmailEnabled),
    due_reminder_enabled:Boolean(next.dueReminderEnabled),
    overdue_email_enabled:Boolean(next.overdueEmailEnabled),
    overdue_email_after_days:next.overdueEmailAfterDays??1,
    extrajudicial_email_enabled:Boolean(next.extrajudicialEmailEnabled),
    extrajudicial_after_days:next.extrajudicialAfterDays??null,
    birthday_email_enabled:Boolean(next.birthdayEmailEnabled),
    termination_email_enabled:Boolean(next.terminationEmailEnabled),
  }).eq('id', next.id);
  if (result.error) throw result.error;
}
