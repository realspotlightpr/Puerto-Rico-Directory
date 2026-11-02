import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ResendProvider, TwilioProvider } from "../_shared/messaging.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function getPublishableKey() {
  try {
    const reference = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
    if (typeof reference === "string") return reference.startsWith("sb_publishable_") ? reference : Deno.env.get(reference) || "";
  } catch { /* fall through to the legacy platform variable */ }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = getPublishableKey();
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !serviceRole) return json({ error: "Function environment is incomplete" }, 503);
  const authHeader = request.headers.get("Authorization") || "";
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userRow } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (userRow?.role !== "admin") return json({ error: "Admin access required" }, 403);

  const input = await request.json().catch(() => ({}));
  if (input.action === "communications") {
    const offset = Math.max(0, Number(input.offset) || 0);
    let query = admin.from("crm_messages").select("id,channel,status,recipient,subject,provider,error_code,error_detail,created_at,sent_at,contact:crm_contacts(first_name,last_name,email,phone_e164),event:crm_events(event_type)", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + 49);
    if (["email", "sms"].includes(input.channel)) query = query.eq("channel", input.channel);
    if (["queued", "sending", "sent", "delivered", "failed", "skipped", "received"].includes(input.status)) query = query.eq("status", input.status);
    const { data, count, error } = await query;
    if (error) return json({ error: error.message }, 500);
    const logs = (data || []).map((row: any) => ({ id: row.id, channel: row.channel, status: row.status, recipient_name: [row.contact?.first_name, row.contact?.last_name].filter(Boolean).join(" ") || null, recipient_email: row.contact?.email || (row.channel === "email" ? row.recipient : null), recipient_phone: row.contact?.phone_e164 || (row.channel === "sms" ? row.recipient : null), event: row.event?.event_type || "manual", source: row.provider || "first-party", error_code: row.error_code, error_detail: row.error_detail, created_at: row.created_at, sent_at: row.sent_at }));
    return json({ logs, total: count || 0, source: "first-party" });
  }

  if (input.action === "contacts") {
    const offset = Math.max(0, Number(input.offset) || 0);
    const search = String(input.search || "").trim().toLowerCase();
    const { data, error } = await admin.from("crm_contacts").select("id,first_name,last_name,email,phone_e164,source,preferred_locale,created_at,updated_at", { count: "exact" }).is("deleted_at", null).order("updated_at", { ascending: false }).range(offset, offset + 199);
    if (error) return json({ error: error.message }, 500);
    const matching = search ? (data || []).filter((contact: any) => [contact.first_name, contact.last_name, contact.email, contact.phone_e164].some(value => String(value || "").toLowerCase().includes(search))) : (data || []);
    return json({ contacts: matching.slice(0, 50), total: matching.length, source: "first-party" });
  }

  if (input.action === "status") {
    const [events, messages, migrations, webhookErrors, suppressions] = await Promise.all([
      admin.from("crm_events").select("status"),
      admin.from("crm_messages").select("status"),
      admin.from("crm_migration_batches").select("id,status,source_counts,imported_counts,reconciliation,started_at,completed_at,error").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("crm_provider_events").select("id", { count: "exact", head: true }).is("processed_at", null).not("processing_error", "is", null),
      admin.from("crm_suppressions").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    const count = (rows: any[] | null, status: string) => (rows || []).filter(row => row.status === status).length;
    return json({ events: { pending: count(events.data, "pending"), failed: count(events.data, "failed"), deadLetter: count(events.data, "dead_letter") }, messages: { failed: count(messages.data, "failed"), sending: count(messages.data, "sending"), received: count(messages.data, "received") }, providerWebhooks: { failed: webhookErrors.count || 0 }, suppressions: { active: suppressions.count || 0 }, migration: migrations.data || null });
  }

  if (input.action === "retry-message") {
    if (Deno.env.get("CRM_MESSAGING_ENABLED") !== "true") return json({ error: "First-party messaging is not enabled" }, 503);
    const messageId = String(input.messageId || "");
    const messageResult = await admin.from("crm_messages").select("id,contact_id,channel,direction,recipient,subject,body_text,body_html,status,provider,provider_message_id").eq("id", messageId).maybeSingle();
    const message = messageResult.data;
    if (!message || message.direction !== "outbound" || message.status !== "failed") return json({ error: "Only failed outbound messages can be retried" }, 409);
    if (message.provider_message_id) return json({ error: "Provider already accepted this message; reconcile its callback before retrying" }, 409);
    const suppression = await admin.from("crm_suppressions").select("id").eq("channel", message.channel).eq("recipient", message.recipient).eq("active", true).maybeSingle();
    if (suppression.data) return json({ error: "Recipient is suppressed" }, 409);
    if (message.channel === "sms") {
      const consent = await admin.from("crm_consents").select("status").eq("contact_id", message.contact_id).eq("channel", "sms").eq("purpose", "transactional").order("captured_at", { ascending: false }).limit(1).maybeSingle();
      if (consent.data?.status !== "granted") return json({ error: "Active transactional SMS consent is required" }, 409);
    }
    const attempts = await admin.from("crm_delivery_attempts").select("attempt_number").eq("message_id", message.id).order("attempt_number", { ascending: false }).limit(1);
    const attemptNumber = Number(attempts.data?.[0]?.attempt_number || 0) + 1;
    if (attemptNumber > 3) return json({ error: "Maximum retry count reached" }, 409);
    const config = { resendApiKey: Deno.env.get("RESEND_API_KEY") || "", resendFromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "", twilioAccountSid: Deno.env.get("TWILIO_ACCOUNT_SID") || "", twilioAuthToken: Deno.env.get("TWILIO_AUTH_TOKEN") || "", twilioMessagingServiceSid: Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "", twilioFromNumber: Deno.env.get("TWILIO_FROM_NUMBER") || "", twilioStatusCallbackUrl: Deno.env.get("TWILIO_STATUS_CALLBACK_URL") || "" };
    const provider = message.channel === "email" ? new ResendProvider(config) : new TwilioProvider(config);
    await admin.from("crm_delivery_attempts").insert({ message_id: message.id, attempt_number: attemptNumber, provider: provider.name, status: "started" });
    await admin.from("crm_messages").update({ status: "sending", error_code: null, error_detail: null, failed_at: null }).eq("id", message.id);
    try {
      const sent = await provider.send({ channel: message.channel, to: message.recipient, subject: message.subject || undefined, text: message.body_text, html: message.body_html || undefined });
      await admin.from("crm_messages").update({ status: "sent", provider: provider.name, provider_message_id: sent.id, sent_at: new Date().toISOString() }).eq("id", message.id);
      await admin.from("crm_delivery_attempts").update({ status: "accepted", provider_response: { id: sent.id } }).eq("message_id", message.id).eq("attempt_number", attemptNumber);
      await admin.from("crm_audit_log").insert({ actor_user_id: user.id, actor_type: "admin", action: "crm.message.retried", entity_type: "crm_message", entity_id: message.id, after_state: { attemptNumber, providerMessageId: sent.id }, metadata: { provider: provider.name } });
      return json({ success: true, messageId: message.id, attemptNumber });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await admin.from("crm_messages").update({ status: "failed", error_detail: detail, failed_at: new Date().toISOString() }).eq("id", message.id);
      await admin.from("crm_delivery_attempts").update({ status: "failed", error_detail: detail, completed_at: new Date().toISOString() }).eq("message_id", message.id).eq("attempt_number", attemptNumber);
      return json({ error: "Retry failed" }, 502);
    }
  }
  return json({ error: "Unsupported action" }, 400);
});
