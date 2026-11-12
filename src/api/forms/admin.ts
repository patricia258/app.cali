import { z } from 'zod';
import { supabase } from '../supabase';
import { formContentColumns, formContentSchema } from './contracts';

const formColumns = `${formContentColumns},company_id,audience,stages,created_at,updated_at`;
const responseColumns = 'id,answers,respondent_name,respondent_email,submitted_at,confirmation_sent_at,contacted_at,admin_note,stage,owner';

const formRecord = formContentSchema.extend({
  company_id: z.string().nullish().transform((value) => value ?? null),
  audience: z.enum(['cali', 'client']).nullish().transform((value) => value ?? 'cali'),
  stages: z.array(z.string()).nullish(),
  created_at: z.string().optional(),
  updated_at: z.string(),
}).transform((row) => ({ ...row, created_at: row.created_at ?? row.updated_at }));

const responseRow = z.object({
  id: z.string(),
  answers: z.record(z.string(), z.unknown()),
  respondent_name: z.string().nullable(),
  respondent_email: z.string().nullable(),
  submitted_at: z.string(),
  confirmation_sent_at: z.string().nullable(),
  contacted_at: z.string().nullable(),
  admin_note: z.string().nullable(),
  stage: z.string().nullish().transform((value) => value ?? null),
  owner: z.string().nullish().transform((value) => value ?? null),
});
const trashRow = z.object({
  id: z.string(),
  kind: z.enum(['form', 'responses']),
  form_title: z.string(),
  responses: z.array(z.unknown()),
  deleted_at: z.string(),
});
const formCount = z.object({
  form_id: z.string(), responses: z.coerce.number(), last_response: z.string().nullable(),
});
const companyRow = z.object({ id: z.string(), display_name: z.string(), status: z.string() });

export type FormResponse = z.infer<typeof responseRow>;
export type FormTrashEntry = z.infer<typeof trashRow>;

function parseRows<Schema extends z.ZodType>(schema: Schema, data: unknown) {
  const parsed = z.array(schema).safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
}

function parseSingle<Schema extends z.ZodType>(
  schema: Schema, result: { data: unknown; error: { message: string } | null },
) {
  if (result.error) return { data: null, error: result.error };
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) return { data: null, error: { message: 'O Workspace retornou dados inválidos.' } };
  return { data: parsed.data, error: null };
}

const unavailable = { message: 'Conexão indisponível.' };

export async function readFormCatalog() {
  if (!supabase) throw new Error(unavailable.message);
  const [list, counts, companyRows, trashRows] = await Promise.all([
    supabase.from('forms').select(formColumns).order('updated_at', { ascending: false }),
    supabase.rpc('admin_form_overview'),
    supabase.from('companies').select('id,display_name,status').order('display_name'),
    supabase.from('forms_trash').select('id,kind,form_title,responses,deleted_at').is('restored_at', null).order('deleted_at', { ascending: false }),
  ]);

  if (list.error) throw list.error;
  return {
    forms: z.array(formRecord).parse(list.data ?? []),
    overview: Object.fromEntries(parseRows(formCount, counts.data).map((row) => [row.form_id, { responses: row.responses, last: row.last_response }])),
    companies: parseRows(companyRow, companyRows.data).filter((row) => row.status !== 'archived').map((row) => ({ id: row.id, name: row.display_name })),
    trash: parseRows(trashRow, trashRows.data),
  };
}

type FormWrite = Pick<z.input<typeof formRecord>, 'title' | 'slug' | 'questions'> &
  Partial<Omit<z.input<typeof formRecord>, 'id' | 'created_at' | 'title' | 'slug' | 'questions'>>;

export async function createForm(input: FormWrite) {
  if (!supabase) return { data: null, error: unavailable };
  return parseSingle(formRecord, await supabase.from('forms').insert(input).select(formColumns).single());
}

export async function saveForm(id: string, input: FormWrite) {
  if (!supabase) return { data: null, error: unavailable };
  return parseSingle(formRecord, await supabase.from('forms').update(input).eq('id', id).select(formColumns).single());
}

export async function deleteForm(id: string) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('forms').delete().eq('id', id);
}

export async function restoreFormTrash(id: string) {
  if (!supabase) return { error: unavailable };
  return await supabase.schema('public').rpc('cali_forms_trash_restore', { p_id: id });
}

export async function readFormResponses(formId: string) {
  if (!supabase) return { data: null, error: unavailable };
  const result = await supabase.from('form_responses').select(responseColumns)
    .eq('form_id', formId).order('submitted_at', { ascending: false }).limit(5000);
  return parseSingle(z.array(responseRow), result);
}

export async function updateFormResponseTracking(
  id: string, fields: Partial<Pick<FormResponse, 'stage' | 'owner' | 'contacted_at' | 'admin_note'>>,
) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('form_responses').update(fields).eq('id', id);
}

export async function saveFormResponseAnswers(
  id: string, fields: Pick<FormResponse, 'answers' | 'respondent_name' | 'respondent_email'>,
) {
  if (!supabase) return { data: null, error: unavailable };
  const result = await supabase.from('form_responses').update(fields).eq('id', id).select(responseColumns).single();
  return parseSingle(responseRow, result);
}

export async function deleteFormResponses(ids: string[]) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('form_responses').delete().in('id', ids);
}

export async function openFormAttachment(path: string) {
  if (!supabase) return { data: null };
  return await supabase.storage.from('cali-forms').createSignedUrl(path, 600);
}

export async function signFormExportAttachments(paths: string[]) {
  if (!supabase || !paths.length) return {};
  const signed = await supabase.storage.from('cali-forms').createSignedUrls(paths, 30 * 86400);
  const links: Record<string, string> = {};
  for (const item of signed.data ?? []) {
    if (item.path && item.signedUrl) links[item.path] = item.signedUrl;
  }
  return links;
}

export async function uploadAdminFormAttachment(path: string, file: File) {
  if (!supabase) return { error: unavailable };
  return await supabase.storage.from('cali-forms').upload(path, file, { contentType: file.type || undefined, upsert: false });
}
