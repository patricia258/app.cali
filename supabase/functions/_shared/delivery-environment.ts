const productionProject = "https://kqtbfeeqbcllwvlkbrkq.supabase.co";
const productionOrigin = "https://app.calirh.com";
const project = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const mode = Deno.env.get("CALI_DELIVERY_MODE");
const production = mode === "production" && project === productionProject;
const destinations = new Set((Deno.env.get("CALI_TEST_EMAIL_RECIPIENTS") ?? "")
  .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));

export const deliveryAppOrigin = production ? productionOrigin : Deno.env.get("CALI_DELIVERY_APP_ORIGIN") ?? "";
const isolated = mode === "isolated" && project !== productionProject
  && /^https:\/\/[a-z0-9][a-z0-9.-]*$/.test(deliveryAppOrigin)
  && deliveryAppOrigin !== productionOrigin;
const local = mode === "isolated" && project === "http://ingress:56431" && deliveryAppOrigin === "http://127.0.0.1:56430";

export function emailDestinationsAllowed(recipients: string[]) {
  return recipients.length > 0 && recipients.every((raw) => {
    const email = raw.trim().toLowerCase();
    return production || (local && /^[^@\s]+@example[.]test$/.test(email)) || (isolated && destinations.has(email));
  });
}
