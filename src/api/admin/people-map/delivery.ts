import { supabase } from '../../supabase';

export async function loadMapaDeliveryState(responseId: string) {
  if (!supabase) throw new Error('Envio indisponível.');
  const { data, error } = await supabase.rpc('read_mapa_delivery_state', { p_response_id: responseId });
  if (error || !Number.isInteger(data?.revision)) throw new Error('Não foi possível consultar a revisão da devolutiva.');
  return { revision: data.revision as number, hasPdf: data.has_pdf === true };
}
