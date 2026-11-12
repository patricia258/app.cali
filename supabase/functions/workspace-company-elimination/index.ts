import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const buckets = new Set(["cali-workspace-private", "workspace-assets", "cali-forms", "cali-profiles"]);

type BatchRow = { bucket: string; path: string };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers, status });
}

function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
}

function safeEqual(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  let different = 0;
  for (let index = 0; index < expected.length; index++) different |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  return different === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Método indisponível." }, 405);
  if (!url || !anonKey || !serviceKey) return json({ error: "Executor indisponível." }, 503);

  const body = await request.json().catch(() => null);
  if (!body || (body.action !== "scheduled" && (typeof body.jobId !== "string" || !uuid.test(body.jobId)))) {
    return json({ error: "Informe a operação de eliminação." }, 400);
  }
  const auth = { persistSession: false, autoRefreshToken: false };
  const worker = createClient(url, serviceKey, { auth, global: { fetch: timedFetch } });
  const db = worker.schema("cali_workspace");

  const scheduled = body.action === "scheduled";
  const jobId = scheduled ? null : body.jobId as string;
  let current: unknown;
  if (scheduled) {
    const hook = request.headers.get("x-workspace-hook") ?? "";
    const { data, error } = await db.from("runtime_secrets").select("secret_value").eq("secret_key", "company_elimination_worker_hook").maybeSingle();
    if (error || !data?.secret_value || data.secret_value.length < 32 || !safeEqual(hook, data.secret_value)) {
      return json({ error: "Acesso não autorizado." }, 401);
    }
  } else {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sessão obrigatória." }, 401);
    const actor = createClient(url, anonKey, {
      auth, global: { headers: { Authorization: authorization }, fetch: timedFetch },
    }).schema("cali_workspace");
    const { data, error } = await actor.rpc("admin_read_company_elimination_job", { p_job: jobId });
    if (error || !data) return json({ error: "Operação indisponível para este acesso." }, 403);
    current = data;
    if (data.state === "completed") return json({ job: data });
  }

  const claim = await db.rpc("claim_company_elimination_job", { p_job: jobId });
  if (claim.error) return json({ error: "Não foi possível reservar a operação." }, 503);
  if (!claim.data) return json({ job: current ?? null }, 202);

  const lease = { p_job: claim.data.jobId, p_lease: claim.data.leaseId };
  try {
    const deadline = Date.now() + 26000;
    do {
      const batch = await db.rpc("company_elimination_batch", lease);
      if (batch.error) throw batch.error;
      const targets = batch.data as BatchRow[];
      if (!targets.length) {
        const finalized = await db.rpc("finalize_company_elimination_job", lease);
        if (finalized.error) throw finalized.error;
        return json({ job: finalized.data });
      }
      const bucket = targets[0].bucket;
      if (!buckets.has(bucket)) throw new Error("storage_scope_invalid");
      const paths = targets.filter((target) => target.bucket === bucket).map((target) => target.path);
      const removed = await worker.storage.from(bucket).remove(paths);
      if (removed.error) throw removed.error;
    } while (Date.now() < deadline);
    const released = await db.rpc("release_company_elimination_lease", { ...lease, p_failed: false });
    if (released.error) throw released.error;
    return json({ job: { jobId: lease.p_job, state: "queued" } }, 202);
  } catch {
    await db.rpc("release_company_elimination_lease", { ...lease, p_failed: true }).catch(() => undefined);
    return json({ job: { jobId: lease.p_job, state: "retry" } }, 202);
  }
});
