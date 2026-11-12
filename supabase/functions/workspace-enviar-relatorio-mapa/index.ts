import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  approvedRecipients, checkedPdf, deliveryAdmin, deliveryPreflight, DeliveryError,
  emailResponse, emailUuid, failureResponse, sendMaterialEmail,
} from "../_shared/material-email.ts";

Deno.serve(async (request: Request) => {
  const preflight = deliveryPreflight(request);
  if (preflight) return preflight;
  try {
    const { db, user } = await deliveryAdmin(request);
    const input = await request.json().catch(() => ({}));
    const id = emailUuid(input.response_id);
    const requestId = emailUuid(input.request_id);
    const { data: record } = await db.from("mapa_respostas").select("id,protocolo,c_nome,c_email,lgpd_aceite").eq("id", id).maybeSingle();
    if (!record || !record.lgpd_aceite) throw new DeliveryError(404, "Devolutiva indisponível.");
    const recipients = approvedRecipients(Array.isArray(input.recipients) && input.recipients.length ? input.recipients.map(String) : [record.c_email]);
    const { content } = checkedPdf(input.pdf_base64);
    const note = String(input.custom_message ?? "").trim().slice(0, 2000);
    const protocol = String(record.protocolo);
    const provider = await sendMaterialEmail(db, {
      kind: "mapa", entityId: id, userId: user.id, requestId, recipients,
      subject: "Seu relatório do Mapa de People chegou 🎉 | CALI RH",
      text: `Olá, ${String(record.c_nome).split(" ")[0]}!\n\nSegue a devolutiva do Mapa de People da CALI RH.${note ? `\n\n${note}` : ""}`,
      attachment: { filename: `CALI-Mapa-${protocol.replace(/[^A-Z0-9-]/gi, "")}.pdf`, content },
    });
    return emailResponse(request, { ok: true, email_id: provider, to: recipients });
  } catch (error) {
    return failureResponse(request, error);
  }
});
