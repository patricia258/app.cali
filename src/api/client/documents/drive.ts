import { z } from 'zod';
import { supabase } from '../../supabase';

const providerError = z.object({ error: z.string().optional(), detail: z.string().optional() });
const connectionSchema = z.object({
  id: z.string(),
  accountEmail: z.string().nullish(),
  rootFolderName: z.string().nullish(),
  status: z.string(),
});
const jobStatus = z.enum(['pending', 'processing', 'synced', 'error']);
const statusSchema = z.object({
  connected: z.boolean(),
  connection: connectionSchema.nullish(),
  jobs: z.array(z.object({ file_id: z.string(), status: jobStatus, external_url: z.string().nullish() })).optional(),
});
const authorizeSchema = z.object({ url: z.string().min(1) });
const copySchema = z.object({
  url: z.string().nullish(), copied: z.number().optional(), failed: z.number().optional(),
});

export type DriveConnection = z.infer<typeof connectionSchema>;
export type DriveSyncState = { status: z.infer<typeof jobStatus>; url?: string | null };

type Command = { action: 'status' | 'authorize' } |
  { action: 'copy_file'; fileId: string } |
  { action: 'copy_folder'; deliverableId: string };

async function invokeDrive<Schema extends z.ZodType>(body: Command, schema: Schema) {
  if (!supabase) return { data: null, error: 'Serviço indisponível. Tente novamente em instantes.', detail: null };
  const result = await supabase.functions.invoke('google-drive-oauth', { body });
  const reported = providerError.safeParse(result.data);
  if (result.error || (reported.success && reported.data.error)) {
    return {
      data: null,
      error: reported.data?.error || result.error?.message || null,
      detail: reported.data?.detail || null,
    };
  }
  const data = schema.safeParse(result.data);
  return data.success
    ? { data: data.data, error: null, detail: null }
    : { data: null, error: 'O Google Drive retornou dados inválidos.', detail: null };
}

export async function readDriveConnection() {
  const { data } = await invokeDrive({ action: 'status' }, statusSchema);
  const jobs: Record<string, DriveSyncState> = {};
  for (const job of data?.jobs ?? []) {
    jobs[job.file_id] ??= { status: job.status, url: job.external_url };
  }
  return { connection: data?.connected ? data.connection ?? null : null, jobs };
}

export function authorizeDriveConnection() {
  return invokeDrive({ action: 'authorize' }, authorizeSchema);
}

export function copyFileToDrive(fileId: string) {
  return invokeDrive({ action: 'copy_file', fileId }, copySchema);
}

export function copyFolderToDrive(deliverableId: string) {
  return invokeDrive({ action: 'copy_folder', deliverableId }, copySchema);
}
