import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  approvedRecipients, checkedPdf, deliveryAdmin, deliveryPreflight, DeliveryError,
  emailResponse, emailUuid, failureResponse, sendMaterialEmail,
} from "../_shared/material-email.ts";

Deno.serve(async (request: Request) => {
  const preflight = deliveryPreflight(request);
  if (preflight) return preflight;
  try {
    const { db, workspace, user } = await deliveryAdmin(request);
    const input = await request.json().catch(() => ({}));
    const id = emailUuid(input.response_id);
    const requestId = emailUuid(input.request_id);
    const [{ data: record }, { data: state, error: stateError }] = await Promise.all([
      db.from("mapa_respostas").select("id,protocolo,c_nome,c_email,lgpd_aceite").eq("id", id).maybeSingle(),
      workspace.rpc("read_mapa_delivery_state", { p_response_id: id }),
    ]);
    if (!record || !record.lgpd_aceite) throw new DeliveryError(404, "Devolutiva indisponível.");
    const recipients = approvedRecipients([String(record.c_email ?? "")]);
    if (input.recipients !== undefined && (!Array.isArray(input.recipients) || input.recipients.length !== 1
      || String(input.recipients[0]).trim().toLowerCase() !== recipients[0])) {
      throw new DeliveryError(409, "Confira o e-mail informado na resposta do Mapa.");
    }
    const version = state?.revision;
    if (stateError || !Number.isInteger(version) || version !== input.revision) {
      throw new DeliveryError(409, "A revisão da devolutiva mudou. Reabra o envio e confirme a versão atual.");
    }
    const bucket = db.storage.from("cali-mapa-delivery");
    let path: string;
    let content: string;
    if (state.has_pdf) {
      path = String(state.pdf_path ?? "");
      if (!path.startsWith(`${id}/${version}/`)) throw new DeliveryError(409, "O PDF oficial está indisponível.");
      const { data: archived, error } = await bucket.download(path);
      if (error || !archived || archived.size > 8 * 1024 * 1024) throw new DeliveryError(409, "O PDF oficial está indisponível.");
      const bytes = new Uint8Array(await archived.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      content = checkedPdf(btoa(binary)).content;
    } else {
      const pdf = checkedPdf(input.pdf_base64);
      const digest = await crypto.subtle.digest("SHA-256", pdf.bytes);
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      path = `${id}/${version}/${hash}.pdf`;
      const { error: uploadError } = await bucket.upload(path, pdf.bytes, { contentType: "application/pdf", upsert: false });
      if (uploadError && !(await bucket.exists(path)).data) throw new DeliveryError(503, "O PDF não pôde ser arquivado.");
      const { error: registerError } = await workspace.rpc("register_mapa_delivery_pdf", {
        p_response_id: id, p_revision: version, p_path: path,
      });
      if (registerError) throw new DeliveryError(409, "A revisão mudou ou já tem um PDF oficial. Reabra o envio.");
      content = pdf.content;
    }
    const note = String(input.custom_message ?? "").trim().slice(0, 2000);
    const protocol = String(record.protocolo);
    const provider = await sendMaterialEmail(db, {
      kind: "mapa", entityId: id, userId: user.id, requestId, recipients, pdfPath: path, version,
      subject: "Seu relatório do Mapa de People chegou 🎉 | CALI RH",
      text: `Olá, ${String(record.c_nome).split(" ")[0]}!\n\nSegue a devolutiva do Mapa de People da CALI RH.${note ? `\n\n${note}` : ""}`,
      attachment: { filename: `CALI-Mapa-${protocol.replace(/[^A-Z0-9-]/gi, "")}.pdf`, content },
    });
    return emailResponse(request, { ok: true, email_id: provider, to: recipients });
  } catch (error) {
    return failureResponse(request, error);
  }
});
