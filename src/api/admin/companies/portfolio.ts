import { addMonths, format, startOfMonth } from 'date-fns';
import { supabase } from '../../supabase';
import type { JsonValue } from '../../../domain/json';
import type { ClientRow, TerminationPaymentRule, TerminationPenaltyType } from '../../../domain/company';

type PortfolioCompany = {
  id: string;
  display_name: string;
  created_at: string;
  status: ClientRow['status'] | null;
  branches: JsonValue;
  termination_penalty_type: TerminationPenaltyType | null;
  termination_payment_rule: TerminationPaymentRule | null;
} & Record<
  'legal_name' | 'logo_url' | 'logo_workspace_url' | 'closed_at' | 'data_eliminated_at' | 'decision_maker_title'
  | 'service_type' | 'service_plan' | 'segment' | 'drive_folder_url' | 'start_date' | 'end_date'
  | 'address_street' | 'address_number' | 'address_neighborhood' | 'address_city' | 'address_state'
  | 'billing_frequency' | 'payment_method' | 'billing_status' | 'billing_due_rule' | 'payment_notes'
  | 'contract_penalty_text' | 'termination_signed_at' | 'termination_payment_due_at'
  | 'contract_type' | 'contract_model' | 'document_notes' | 'document_owner', string | null
> & Record<
  'monthly_hours_contracted' | 'contract_value' | 'billing_day' | 'billing_lead_days' | 'late_fee_percent'
  | 'daily_interest_percent' | 'termination_penalty_value' | 'termination_payment_days'
  | 'overdue_email_after_days' | 'extrajudicial_after_days' | 'termination_penalty_amount'
  | 'termination_balance_snapshot' | 'payment_term_days', number | null
> & Record<
  'auto_renew' | 'has_branches' | 'contract_penalty_enabled' | 'automation_enabled' | 'welcome_email_enabled'
  | 'due_reminder_enabled' | 'overdue_email_enabled' | 'extrajudicial_email_enabled'
  | 'birthday_email_enabled' | 'termination_email_enabled', boolean | null
>;

type PortfolioInvite = {
  id: string;
  company_id: string;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthday: string | null;
  access_role: string | null;
  active: boolean;
  is_primary: boolean;
  platform_access: boolean | null;
};

type PortfolioProfile = {
  id: string;
  company_id: string | null;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  active: boolean;
  role: 'client';
};

export async function readCompanyPortfolio(now = new Date()) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const first = startOfMonth(now);
  const start = format(first, 'yyyy-MM-dd');
  const next = format(addMonths(first, 1), 'yyyy-MM-dd');
  const [companiesResult,invitesResult,profilesResult,hoursResult,npsResult,projectsResult,documentsResult,historyResult] = await Promise.all([
    supabase.from('companies').select('id,display_name,legal_name,logo_url,logo_workspace_url,status,created_at,closed_at,data_eliminated_at,monthly_hours_contracted,decision_maker_title,service_type,service_plan,segment,drive_folder_url,start_date,end_date,auto_renew,address_street,address_number,address_neighborhood,address_city,address_state,has_branches,branches,contract_value,billing_frequency,payment_method,billing_status,billing_day,billing_due_rule,billing_lead_days,payment_notes,late_fee_percent,daily_interest_percent,contract_penalty_enabled,contract_penalty_text,termination_penalty_type,termination_penalty_value,termination_payment_days,termination_payment_rule,automation_enabled,welcome_email_enabled,due_reminder_enabled,overdue_email_enabled,overdue_email_after_days,extrajudicial_email_enabled,extrajudicial_after_days,birthday_email_enabled,termination_email_enabled,termination_signed_at,termination_payment_due_at,termination_penalty_amount,termination_balance_snapshot,contract_type,contract_model,payment_term_days,document_notes,document_owner').order('created_at',{ascending:false}).overrideTypes<PortfolioCompany[], { merge: false }>(),
    supabase.from('client_invites').select('*').overrideTypes<PortfolioInvite[], { merge: false }>(),
    supabase.from('profiles').select('id,company_id,email,full_name,job_title,phone,whatsapp,is_primary,active,role').eq('role','client').overrideTypes<PortfolioProfile[], { merge: false }>(),
    supabase.from('hour_entries').select('company_id,minutes').gte('work_date',start).lt('work_date',next).overrideTypes<Array<{ company_id: string; minutes: number }>, { merge: false }>(),
    supabase.from('nps_responses').select('company_id,score').overrideTypes<Array<{ company_id: string; score: number }>, { merge: false }>(),
    supabase.from('projects').select('id,company_id,name,status').order('updated_at',{ascending:false}).overrideTypes<Array<{ id: string; company_id: string; name: string; status: string }>, { merge: false }>(),
    supabase.from('account_documents').select('company_id,title,document_date,document_type').order('created_at',{ascending:false}).overrideTypes<Array<{ company_id: string; title: string; document_date: string | null; document_type: string }>, { merge: false }>(),
    supabase.from('activity_log').select('id,company_id,event_type,metadata,created_at').order('created_at',{ascending:false}).limit(120).overrideTypes<Array<{ id: number; company_id: string | null; event_type: string; metadata: JsonValue; created_at: string }>, { merge: false }>(),
  ]);
  if (companiesResult.error) throw new Error(companiesResult.error.message);
  return {
    companies: companiesResult.data ?? [],
    invites: invitesResult.data ?? [],
    profiles: profilesResult.data ?? [],
    hourRows: hoursResult.data ?? [],
    npsRows: npsResult.data ?? [],
    projectRows: projectsResult.data ?? [],
    documentRows: documentsResult.data ?? [],
    historyRows: historyResult.data ?? [],
  };
}
