import { z } from 'zod';

import { supabase } from '../../supabase';

export async function loadMapaDeliveryState(responseId: string) {
  if (!supabase) throw new Error('Envio indisponível.');
  const { data, error } = await supabase.rpc('read_mapa_delivery_state', { p_response_id: responseId });
  if (error || !Number.isSafeInteger(data?.revision) || data.revision < 1) {
    throw new Error('Não foi possível consultar a revisão da devolutiva.');
  }
  return { revision: data.revision as number, hasPdf: data.has_pdf === true };
}

type MapaDelivery = {
  responseId: string;
  revision: number;
  pdfBase64?: string;
  requestId: string;
  recipient: string;
  customMessage?: string | null;
};

const mapaDeliveryReceipt = z.object({
  ok: z.literal(true),
  email_id: z.string().min(1),
  to: z.union([z.string(), z.array(z.string())]).nullish(),
});

export async function sendMapaReport(delivery: MapaDelivery) {
  if (!supabase) throw new Error('Envio indisponível.');
  const result = await supabase.functions.invoke('workspace-enviar-relatorio-mapa', {
    body: {
      response_id: delivery.responseId,
      revision: delivery.revision,
      pdf_base64: delivery.pdfBase64,
      request_id: delivery.requestId,
      recipients: [delivery.recipient],
      custom_message: delivery.customMessage,
    },
  });
  const receipt = mapaDeliveryReceipt.safeParse(result.data);
  if (result.error || !receipt.success) throw new Error(result.data?.error || result.error?.message || 'Falha ao enviar.');
  return receipt.data;
}
