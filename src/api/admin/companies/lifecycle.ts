import type { JsonObject } from '../../../domain/json';
import type { ClientRow, LifecycleAction } from '../../../domain/company';
import { supabase } from '../../supabase';

const nextStatus: Record<LifecycleAction, ClientRow['status']> = {
  pause: 'paused', block: 'blocked', archive: 'archived', close: 'closed', reactivate: 'active',
};

type TerminationProjection = { dueDate: string | null; penalty: number; remainingBalance: number };

export async function changeCompanyLifecycle(
  client: ClientRow, action: LifecycleAction, reason: string, date: string, projection: TerminationProjection | null,
) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const now=new Date().toISOString(),patch:JsonObject={status:nextStatus[action]};
  if(action==='pause')Object.assign(patch,{paused_at:now,paused_reason:reason});
  if(action==='archive')Object.assign(patch,{archived_at:now});
  if(action==='block')Object.assign(patch,{blocked_at:now,blocked_reason:reason});
  if(action==='reactivate')Object.assign(patch,{paused_at:null,paused_reason:null,blocked_at:null,blocked_reason:null});
  if(action==='close')Object.assign(patch,{closed_at:now,closed_reason:reason,termination_signed_at:date,termination_payment_due_at:projection?.dueDate||null,termination_penalty_amount:projection?.penalty||0,termination_balance_snapshot:projection?.remainingBalance||0});
  const {error:statusError}=await supabase.from('companies').update(patch).eq('id',client.id);if(statusError)throw statusError;
  await supabase.from('activity_log').insert({company_id:client.id,event_type:`account_${action}`,entity_type:'company',entity_id:client.id,metadata:{reason:reason||null,termination_date:action==='close'?date:null,penalty:projection?.penalty||null,due_date:projection?.dueDate||null}});
  if(action==='close'&&client.automationEnabled&&client.terminationEmailEnabled){await supabase.from('communication_outbox').insert({company_id:client.id,template_key:'termination',recipient_email:client.email,recipient_name:client.contact,subject:`CALI RH · encerramento contratual · ${client.name}`,status:'pending',scheduled_for:now,metadata:{termination_date:date,penalty:projection?.penalty||0,due_date:projection?.dueDate||null}});}
}
