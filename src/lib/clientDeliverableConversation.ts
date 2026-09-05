import { supabase } from './supabase';

export type ClientDeliverableMessage = {
  id: string;
  deliverableId: string;
  body: string;
  sourceActor: 'admin' | 'client' | 'system';
  createdAt: string;
};

export async function loadClientDeliverableConversation(deliverableId: string): Promise<ClientDeliverableMessage[]> {
  if (!supabase || !deliverableId) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('id,target_id,body,source_actor,created_at')
    .eq('target_type', 'deliverable')
    .eq('target_id', deliverableId)
    .eq('client_visible', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    deliverableId: row.target_id,
    body: row.body,
    sourceActor: (row.source_actor || 'admin') as ClientDeliverableMessage['sourceActor'],
    createdAt: row.created_at,
  }));
}

export async function sendClientDeliverableMessage(deliverableId: string, body: string) {
  if (!supabase) throw new Error('Workspace indisponível.');
  const message = body.trim();
  if (!message) throw new Error('Escreva uma mensagem.');
  const { data, error } = await supabase.rpc('client_submit_deliverable_comment', {
    p_deliverable_id: deliverableId,
    p_body: message,
  });
  if (error) throw error;
  return data as string;
}

export function subscribeClientDeliverableConversation(deliverableId: string, onChange: () => void) {
  if (!supabase || !deliverableId) return () => undefined;
  const channel = supabase
    .channel(`client-deliverable-conversation-${deliverableId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'cali_workspace',
      table: 'comments',
      filter: `target_id=eq.${deliverableId}`,
    }, onChange)
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
