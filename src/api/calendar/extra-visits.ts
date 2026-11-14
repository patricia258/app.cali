import { z } from 'zod';
import { supabase } from '../supabase';

export const extraVisitsAvailable = supabase !== null;
const bucket = 'cali-workspace-private';

const availabilityResult = z.object({ state: z.literal('checked'), slots: z.array(z.object({ busy: z.boolean() })) });
const visitResult = z.union([z.string(), z.object({ request_id: z.string().nullish(), id: z.string().nullish() })]);
const expenseResults = z.array(z.object({ protocol: z.string().nullish() }));
const expenseColumns = 'id,request_id,expense_kind,amount_cents,receipt_path,protocol,hours_quantity';

export type CompletedVisit = { id: string; title: string; company_id: string; selected_slot: { startsAt: string } | null };
export type ExtraVisitExpense = { id: string; request_id: string; expense_kind: string; amount_cents: number; receipt_path: string | null; protocol: string | null; hours_quantity: number | null };
type VisitSlot = { startsAt: string; endsAt: string };
type VisitDraft = { title: string; purpose: string; slots: VisitSlot[]; ackName: string; acknowledged: boolean } &
  ({ mode: 'visit'; location: string } | { mode: 'online' });
type ExpenseDraft = { kind: string; amountCents: number; note: string; hoursQuantity: number | null; approvedQuoteNote: string | null; file: File | null };

function requireCalendarClient() {
  if (!supabase) throw new Error('Conexão indisponível. Tente novamente.');
  return supabase;
}

function fileName(file: File) {
  return `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export async function readExtraVisitCompany() {
  const client = requireCalendarClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await client.from('profiles').select('company_id').eq('id', auth.user.id).maybeSingle();
  if (!profile?.company_id) return null;
  const { data: company } = await client.from('companies').select('id,display_name').eq('id', profile.company_id).maybeSingle();
  return company ? { id: company.id, name: company.display_name } : null;
}

export async function readExtraVisitAvailability(slots: VisitSlot[]) {
  const { data, error } = await requireCalendarClient().functions.invoke('workspace-google-calendar-read', {
    body: { action: 'availability', slots },
  });
  const result = availabilityResult.safeParse(data);
  if (error || !result.success) throw error || new Error('Agenda indisponível');
  return result.data.slots.map((slot) => slot.busy);
}

export async function createExtraVisit(draft: VisitDraft) {
  const client = requireCalendarClient();
  const base = { p_title: draft.title, p_purpose: draft.purpose, p_ack_name: draft.ackName, p_acknowledged: draft.acknowledged };
  const result = draft.mode === 'visit'
    ? await client.rpc('create_extra_visit_request_v1', { ...base, p_location: draft.location, p_requested_slots: draft.slots })
    : await client.rpc('client_request_online_extra_v2', { ...base, p_slots: draft.slots });
  const request = visitResult.safeParse(result.data).data;
  const id = typeof request === 'string' ? request : request?.request_id || request?.id;
  return { id, error: result.error };
}

export async function attachExtraVisitFile(companyId: string, requestId: string, file: File) {
  const client = requireCalendarClient();
  const path = `extra-visit-requests/${companyId}/${requestId}/${fileName(file)}`;
  const uploaded = await client.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (uploaded.error) return 'Pedido enviado. O anexo não foi recebido: ' + uploaded.error.message;
  const saved = await client.rpc('attach_extra_visit_request_v1', { p_request_id: requestId, p_path: path, p_name: file.name });
  if (!saved.error) return null;
  await client.storage.from(bucket).remove([path]);
  return 'Pedido enviado. O anexo não foi vinculado: ' + saved.error.message;
}

export async function readExtraVisitExpenses() {
  return await requireCalendarClient().from('extra_visit_expenses').select(expenseColumns)
    .order('created_at', { ascending: false }).limit(100).returns<ExtraVisitExpense[]>();
}

export async function readCompletedExtraVisits() {
  return await Promise.all([
    requireCalendarClient().from('scheduling_requests').select('id,title,company_id,selected_slot')
      .eq('extra_visit', true).eq('status', 'completed').order('created_at', { ascending: false }).limit(50)
      .returns<CompletedVisit[]>(),
    readExtraVisitExpenses(),
  ]);
}

export async function recordExtraVisitExpenses(visit: CompletedVisit, drafts: ExpenseDraft[]) {
  const client = requireCalendarClient();
  const receipts: string[] = [];
  try {
    const items = [];
    for (const { file, ...draft } of drafts) {
      const receiptPath = file ? `extra-visits/${visit.company_id}/${visit.id}/${fileName(file)}` : null;
      if (file && receiptPath) {
        const uploaded = await client.storage.from(bucket).upload(receiptPath, file, { upsert: false, contentType: file.type });
        if (uploaded.error) throw uploaded.error;
        receipts.push(receiptPath);
      }
      items.push({ ...draft, receiptPath });
    }
    const saved = await client.rpc('admin_record_extra_visit_expenses_v2', { p_request_id: visit.id, p_items: items });
    if (saved.error) throw saved.error;
    return (expenseResults.safeParse(saved.data).data ?? []).flatMap((item) => item.protocol ? [item.protocol] : []);
  } catch (error) {
    await Promise.all(receipts.map((path) => client.storage.from(bucket).remove([path])));
    throw error;
  }
}

export async function signExtraVisitReceipt(path: string) {
  return await requireCalendarClient().storage.from(bucket).createSignedUrl(path, 120);
}
