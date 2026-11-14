import { z } from 'zod';
import { supabase } from '../../supabase';
import { readDriveConnection } from './drive';

const optionalText = z.string().nullish().transform((value) => value ?? null);
const documentRow = z.object({
  id: z.string(),
  company_id: z.string(),
  title: z.string(),
  category: optionalText,
  document_kind: optionalText,
  updated_at: z.string(),
  version_label: optionalText,
  protocol: optionalText,
  storage_path: optionalText,
  drive_url: optionalText,
  requires_acknowledgement: z.boolean().nullish(),
  description: optionalText,
  valid_until: optionalText,
  deliverable_id: optionalText,
  task_id: optionalText,
});
const acknowledgement = z.object({ file_id: z.string(), acknowledged_at: optionalText });
const companyBrand = z.object({ display_name: optionalText, logo_url: optionalText });
const task = z.object({ id: z.string(), deliverable_id: z.string(), title: z.string(), status: z.string() });
const deliverable = z.object({ id: z.string(), title: z.string(), protocol: optionalText });
const comment = z.object({
  id: z.string(), body: z.string(), created_at: z.string(), author_user_id: optionalText,
});

const unavailable = 'Serviço indisponível. Tente novamente em instantes.';

export const documentLibraryKey = (actorId: string) => ['client', 'document-library', actorId] as const;

export async function readClientDocumentLibrary(signal: AbortSignal) {
  const client = supabase;
  if (!client) throw new Error(unavailable);
  const [files, acknowledgements, drive] = await Promise.all([
    client.from('files').select('deliverable_id,task_id,id,company_id,title,category,document_kind,version_label,protocol,storage_path,drive_url,requires_acknowledgement,description,updated_at,status,client_visible,valid_until')
      .eq('client_visible', true).eq('status', 'published').order('updated_at', { ascending: false }).abortSignal(signal),
    client.from('document_acknowledgements').select('file_id,acknowledged_at').abortSignal(signal),
    readDriveConnection(),
  ]);
  if (files.error) throw new Error(files.error.message);

  const documents = z.array(documentRow).parse(files.data ?? []);
  const [brandResult, tasks, deliveries] = await Promise.all([
    documents[0]?.company_id
      ? client.from('companies').select('display_name,logo_url').eq('id', documents[0].company_id).abortSignal(signal).maybeSingle()
      : { data: null },
    client.from('deliverable_tasks').select('id,deliverable_id,title,status,sort_order')
      .eq('client_visible', true).order('sort_order').abortSignal(signal),
    client.from('deliverables').select('id,title,protocol').abortSignal(signal),
  ]);
  const brand = companyBrand.safeParse(brandResult.data);
  const deliveryRows = z.array(deliverable).safeParse(deliveries.data ?? []);
  const taskRows = z.array(task).safeParse(tasks.data ?? []);
  const byId = new Map((deliveryRows.data ?? []).map((row) => [row.id, row]));
  const byDelivery = new Map<string, Array<Pick<z.infer<typeof task>, 'id' | 'title' | 'status'>>>();
  for (const row of taskRows.data ?? []) {
    const items = byDelivery.get(row.deliverable_id) ?? [];
    items.push({ id: row.id, title: row.title, status: row.status });
    byDelivery.set(row.deliverable_id, items);
  }

  const folders = [...byDelivery.entries()].flatMap(([id, items]) => {
    const row = byId.get(id);
    return row ? [{ ...row, items }] : [];
  });
  const receipts = z.array(acknowledgement).safeParse(acknowledgements.data ?? []);
  const acknowledged = (receipts.data ?? []).filter((item) => item.acknowledged_at).map((item) => item.file_id);
  return { documents, brand: brand.data ?? null, folders, acknowledged, drive };
}

type FileReference = { id: string; companyId: string };

async function readActor() {
  const { data } = await supabase?.auth.getSession() ?? { data: null };
  return data?.session?.user.id;
}

export async function recordDocumentView(file: FileReference) {
  if (!supabase) return;
  const actor = await readActor();
  if (!actor) return;
  const { data: existing } = await supabase.from('document_acknowledgements').select('id,viewed_at,status')
    .eq('file_id', file.id).eq('user_id', actor).maybeSingle();
  const viewed_at = new Date().toISOString();
  if (!existing?.id) {
    await supabase.from('document_acknowledgements').insert({
      company_id: file.companyId, file_id: file.id, user_id: actor, status: 'viewed', viewed_at,
    });
  } else if (!existing.viewed_at) {
    await supabase.from('document_acknowledgements').update({
      viewed_at, status: existing.status === 'acknowledged' ? 'acknowledged' : 'viewed',
    }).eq('id', existing.id);
  }
}

export async function acknowledgeDocumentVersion(file: FileReference) {
  if (!supabase) throw new Error(unavailable);
  const actor = await readActor();
  if (!actor) return false;
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from('document_acknowledgements').select('id')
    .eq('file_id', file.id).eq('user_id', actor).maybeSingle();
  const fields = { status: 'acknowledged', viewed_at: now, acknowledged_at: now };
  const result = existing?.id
    ? await supabase.from('document_acknowledgements').update(fields).eq('id', existing.id)
    : await supabase.from('document_acknowledgements').insert({
      company_id: file.companyId, file_id: file.id, user_id: actor, ...fields,
    });
  if (result.error) throw new Error(result.error.message);
  return true;
}

export async function readDocumentComments(fileId: string) {
  if (!supabase) throw new Error(unavailable);
  const actor = await readActor();
  const result = await supabase.from('comments').select('id,body,created_at,author_user_id')
    .eq('target_type', 'file').eq('target_id', fileId).order('created_at');
  if (result.error) throw new Error(result.error.message);
  return z.array(comment).parse(result.data ?? []).map((item) => ({
    id: item.id, body: item.body, createdAt: item.created_at, mine: item.author_user_id === actor,
  }));
}

export async function postDocumentComment(file: FileReference, text: string) {
  if (!supabase) throw new Error(unavailable);
  const actor = await readActor();
  if (!actor) return false;
  const result = await supabase.from('comments').insert({
    company_id: file.companyId, target_type: 'file', target_id: file.id, author_user_id: actor, body: text.trim(), client_visible: true,
  });
  if (result.error) throw new Error(result.error.message);
  return true;
}
