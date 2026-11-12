import { z } from 'zod';
import { supabase } from '../../supabase';

export const auditTimelineKey = (actorId: string) => ['admin', 'audit', actorId] as const;

const nullableText = z.string().nullish().transform((value) => value ?? null);
const actor = nullableText;
const base = z.object({ id: z.string(), company_id: nullableText, created_at: z.string() });
const protocol = z.object({ id: z.string(), protocol: nullableText });
export const auditSourceLimit = 400;

export async function readAuditTimeline(signal: AbortSignal) {
  const client = supabase;
  if (!client) throw new Error('Conexão indisponível.');

  const failed: string[] = [];
  const get = async <Schema extends z.ZodType>(
    label: string, table: string, columns: string, schema: Schema, order = 'created_at',
  ) => {
    const result = await client.from(table).select(columns).order(order, { ascending: false }).limit(auditSourceLimit).abortSignal(signal);
    const parsed = z.array(schema).safeParse(result.data ?? []);
    if (result.error || !parsed.success) {
      failed.push(label);
      return [];
    }
    return parsed.data;
  };

  const [activity, team, priv, status, lifecycle, reports, people, firms, members, ...protocolSources] = await Promise.all([
    get('atividades', 'activity_log', 'id,company_id,actor_user_id,event_type,entity_type,entity_id,metadata,created_at', base.extend({
      actor_user_id: actor, event_type: z.string(), entity_id: nullableText, metadata: z.record(z.string(), z.unknown()).nullish(),
    })),
    get('equipe', 'team_changes', 'id,company_id,member_id,change_type,actor_user_id,created_at', base.extend({
      actor_user_id: actor, member_id: nullableText, change_type: z.string(),
    })),
    get('dados restritos', 'team_private_audit', 'id,company_id,member_id,actor_user_id,changed_fields,created_at', base.extend({
      actor_user_id: actor, member_id: nullableText, changed_fields: z.array(z.string()).nullish(),
    })),
    get('entregas', 'deliverable_status_history', 'id,company_id,deliverable_id,from_status,to_status,actor_user_id,note,created_at', base.extend({
      actor_user_id: actor, deliverable_id: z.string(), from_status: nullableText, to_status: z.string(), note: nullableText,
    })),
    get('projetos', 'project_lifecycle_events', 'id,company_id,project_id,scope_type,scope_label,action,reason,created_by,created_at', base.extend({
      created_by: actor, project_id: nullableText, scope_type: z.string(), scope_label: nullableText,
      action: z.string(), reason: nullableText,
    })),
    get('leitura de relatórios', 'report_client_events', 'id,company_id,report_id,user_id,event_type,created_at', base.extend({
      user_id: actor, report_id: z.string(), event_type: z.string(),
    })),
    get('pessoas', 'profiles', 'id,full_name', z.object({ id: z.string(), full_name: nullableText }), 'full_name'),
    get('empresas', 'companies', 'id,display_name', z.object({ id: z.string(), display_name: z.string() }), 'display_name'),
    get('equipe (nomes)', 'team_members', 'id,full_name', z.object({ id: z.string(), full_name: z.string() }), 'full_name'),
    ...['account_records', 'deliverables', 'events', 'files', 'reports', 'projects', 'notices'].map((table) => get('protocolos', table, 'id,protocol', protocol, 'id')),
  ]);

  return { activity, team, priv, status, lifecycle, reports, people, firms, members, protocolSources, failed };
}
