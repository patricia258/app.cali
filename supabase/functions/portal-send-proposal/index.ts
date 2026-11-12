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
    const id = emailUuid(input.proposal_id);
    const requestId = emailUuid(input.request_id);
    const { data: proposal } = await db.from("cali_proposals").select("id,submission_id,version,status,pdf_path").eq("id", id).maybeSingle();
    if (!proposal) throw new DeliveryError(404, "Proposta indisponível.");
    if (!["aprovada", "enviada"].includes(proposal.status)) throw new DeliveryError(409, "Aprove a proposta antes do envio.");
    if (input.version !== proposal.version) throw new DeliveryError(409, "A versão da proposta mudou. Reabra a proposta antes de enviar.");
    const { data: submission } = await db.from("cali_submissions").select("contact_email,contact_name,company_name,protocol,archived_at")
      .eq("id", proposal.submission_id).maybeSingle();
    if (!submission || submission.archived_at) throw new DeliveryError(404, "Contato indisponível.");
    const recipients = approvedRecipients([String(submission.contact_email ?? "")]);
    if (input.recipient_email !== undefined && String(input.recipient_email).trim().toLowerCase() !== recipients[0]) {
      throw new DeliveryError(409, "O contato do briefing mudou. Reabra a proposta e confira o destinatário.");
    }
    const name = String(submission.contact_name ?? "").trim().slice(0, 180);
    const company = String(submission.company_name ?? "").trim().slice(0, 180);
    const note = String(input.note ?? "").trim().slice(0, 2000);
    const filename = `CALI-Proposta-${String(submission.protocol).replace(/[^A-Z0-9-]/gi, "")}-v${proposal.version}.pdf`;
    const bucket = db.storage.from("cali-proposals");
    let path = String(proposal.pdf_path || "");
    let content: string;
    if (path) {
      const { data, error } = await bucket.download(path);
      if (error || !data || data.size > 8 * 1024 * 1024) throw new DeliveryError(409, "O PDF oficial está indisponível.");
      const bytes = new Uint8Array(await data.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
      content = checkedPdf(btoa(binary)).content;
    } else {
      const pdf = checkedPdf(input.pdf_base64);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", pdf.bytes));
      const hash = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      path = `${proposal.submission_id}/${proposal.id}/${hash}.pdf`;
      const { error } = await bucket.upload(path, pdf.bytes, { contentType: "application/pdf", upsert: false });
      if (error) {
        const existing = await bucket.exists(path);
        if (!existing.data) throw new DeliveryError(503, "O PDF não pôde ser arquivado.");
      }
      content = pdf.content;
    }
    const provider = await sendMaterialEmail(db, {
      kind: "proposal", entityId: id, userId: user.id, requestId, recipients, pdfPath: path,
      version: proposal.version, subject: `CALI RH · Proposta ${submission.protocol}${company ? ` · ${company}` : ""}`,
      text: `Olá, ${name || "tudo bem?"}\n\nSegue em anexo a proposta da CALI RH.${note ? `\n\n${note}` : ""}`,
      attachment: { filename, content },
    });
    return emailResponse(request, { ok: true, email_id: provider, to: recipients[0] });
  } catch (error) {
    return failureResponse(request, error);
  }
});
