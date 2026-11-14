import {
  readAdminSchedulingRequests,
  readClientSchedulingCompany,
  readClientSchedulingRequests,
  readSchedulingRequestDetails,
} from '../../../api/calendar/requests';

export type SchedulingSlot = { startsAt: string; endsAt: string };

export type SchedulingRequest = {
  id: string;
  company_id: string;
  requested_by: string;
  request_mode: 'remote' | 'in_person';
  title: string;
  purpose?: string | null;
  location?: string | null;
  requested_slots?: SchedulingSlot[] | null;
  admin_proposed_slots?: SchedulingSlot[] | null;
  selected_slot?: SchedulingSlot | null;
  status: string;
  billable_extra?: boolean | null;
  extra_visit?: boolean;
  extra_visit_cancellation_fee_cents?: number | null;
  extra_visit_change_reason?: string | null;
  extra_visit_change_kind?: string | null;
  extra_visit_previous_slot?: SchedulingSlot | null;
  extra_visit_change_was_confirmed?: boolean | null;
  online_extra_requested?: boolean | null;
  online_extra_quote_cents?: number | null;
  online_extra_quote_accepted_at?: string | null;
  billing_notice?: string | null;
  billing_acknowledged_at?: string | null;
  urgency_fee_applies?: boolean | null;
  admin_note?: string | null;
  client_note?: string | null;
  confirmed_event_id?: string | null;
};

type Company = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
  onsite_visits_included_per_month?: number | null;
};
export type RequestAttachment = { request_id: string; storage_path: string; file_name: string };

export function awaitsAdmin(request: SchedulingRequest) {
  return request.status === 'submitted' || request.status === 'reschedule_review';
}

export async function loadClientRequests() {
  const companyId = await readClientSchedulingCompany();
  if (!companyId) throw new Error('Empresa não vinculada ao acesso.');
  const [company, requests] = await readClientSchedulingRequests(companyId);
  if (company.error) throw company.error;
  if (requests.error) throw requests.error;
  if (!company.data) throw new Error('Empresa indisponível.');
  return { company: company.data as Company, requests: (requests.data ?? []) as SchedulingRequest[] };
}

export async function loadAdminRequests() {
  const [companies, result] = await readAdminSchedulingRequests();
  if (companies.error) throw companies.error;
  if (result.error) throw result.error;
  const requests = (result.data ?? []) as SchedulingRequest[];
  const active = requests.filter((request) => awaitsAdmin(request) || request.status === 'client_review');
  const details = active.length ? await readSchedulingRequestDetails(
    [...new Set(active.map((request) => request.requested_by))],
    active.map((request) => request.id),
  ) : null;
  const names: Record<string, string | null> = Object.fromEntries(
    (details?.[0].data ?? []).map((person) => [person.id, person.full_name]),
  );
  return {
    companies: (companies.data ?? []) as Company[],
    requests,
    active,
    names,
    attachments: (details?.[1].data ?? []) as RequestAttachment[],
  };
}

const timeZone = 'America/Sao_Paulo';
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone });
const currency = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatSlot(slot: SchedulingSlot) {
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt || slot.startsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'Horário não definido';
  return `${dateFormat.format(start).replaceAll('.', '')} · ${timeFormat.format(start)}–${timeFormat.format(end)}`;
}

export function formatPrice(cents: number) {
  return `R$ ${currency.format(cents / 100)}`;
}

export function slotMinutes(slot: SchedulingSlot | undefined) {
  return slot ? Math.round((Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60_000) : 0;
}

export function readSlots(form: FormData, duration: number): SchedulingSlot[] {
  return [1, 2].flatMap((position) => {
    const date = form.get(`date${position}`);
    const time = form.get(`time${position}`);
    if (!date && !time) return [];
    if (!date || !time) throw new Error('Informe a data e o horário de cada opção.');
    const start = new Date(`${date}T${time}:00-03:00`);
    return [{ startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 60_000).toISOString() }];
  });
}

export function minSlotDate(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString().slice(0, 10);
}

const usageMonth = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone });
const countedVisits = new Set(['confirmed', 'completed', 'not_occurred', 'reschedule_review']);

export function requiresAcknowledgement(request: SchedulingRequest, context: Awaited<ReturnType<typeof loadClientRequests>>) {
  if (request.billing_acknowledged_at) return false;
  if (request.extra_visit || request.billable_extra || request.urgency_fee_applies) return true;
  if (request.request_mode !== 'in_person' || (request.confirmed_event_id && request.billable_extra === false)) return false;

  return (request.admin_proposed_slots ?? []).some((slot) => {
    const start = new Date(slot.startsAt);
    if (!Number.isFinite(start.getTime())) return false;
    const month = usageMonth.format(start);
    const used = context.requests.filter((item) => {
      if (item.id === request.id || item.request_mode !== 'in_person' || item.billable_extra || !countedVisits.has(item.status)) return false;
      const selectedStart = new Date(item.selected_slot?.startsAt ?? '');
      return Number.isFinite(selectedStart.getTime()) && usageMonth.format(selectedStart) === month;
    }).length;
    return used >= Number(context.company.onsite_visits_included_per_month ?? 0);
  });
}
