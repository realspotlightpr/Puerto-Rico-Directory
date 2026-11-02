import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDeliveries, CRM_EVENT_TYPES, normalizePhone, ResendProvider, TwilioProvider, type CrmEventType } from "../_shared/messaging.ts";

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = getPublishableKey();
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRole) return json({ error: "Supabase function environment is incomplete" }, 503);

  const authorization = request.headers.get("Authorization") || "";
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null) as Record<string, any> | null;
  if (!body || !CRM_EVENT_TYPES.includes(body.type) || typeof body.subject !== "string" || !body.payload || typeof body.payload !== "object") return json({ error: "Invalid CRM event" }, 400);
  const type = body.type as CrmEventType;
  if (type !== "contact.upserted" && Deno.env.get("CRM_MESSAGING_ENABLED") !== "true") return json({ error: "First-party messaging is not enabled" }, 503);

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const payload = body.payload as Record<string, any>;
  const { data: callerProfile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = callerProfile?.role === "admin";
  if (["listing.approved", "listing.rejected", "booking.requested", "booking.confirmed", "admin.invitation.requested"].includes(type) && !isAdmin) return json({ error: "Admin access required" }, 403);

  const businessId = Number(payload.businessId);
  const hasBusinessId = Number.isInteger(businessId) && businessId > 0;
  let business: Record<string, any> | null = null;
  if (hasBusinessId) {
    const result = await admin.from("businesses").select("id,name,owner_id,owner_name,owner_contact_email,owner_phone,email,phone,status,archived_at").eq("id", businessId).maybeSingle();
    if (result.error) return json({ error: result.error.message }, 500);
    business = result.data;
    if (!business || business.archived_at) return json({ error: "Business not found" }, 404);
  }
  if (["listing.submitted", "listing.approved", "listing.rejected", "inquiry.received", "review.received"].includes(type) && !business) return json({ error: "A valid business is required" }, 400);
  if (["contact.upserted", "listing.submitted"].includes(type) && !isAdmin && (!business || String(business.owner_id || "") !== user.id)) return json({ error: "Business owner access required" }, 403);
  if (type === "contact.upserted" && !business && !isAdmin) return json({ error: "A valid business is required" }, 400);
  if (type === "inquiry.received" && business?.status !== "approved") return json({ error: "Business is not available for inquiries" }, 409);
  if (type === "review.received" && business?.status !== "approved") return json({ error: "Business is not available for reviews" }, 409);
  if (business) {
    payload.businessId = business.id;
    payload.businessName = business.name;
    payload.firstName = business.owner_name || payload.firstName;
    payload.email = business.owner_contact_email || business.email || null;
    payload.phone = business.owner_phone || business.phone || null;
  }

  const idempotencyKey = String(body.idempotencyKey || crypto.randomUUID());
  const eventId = crypto.randomUUID();
  const { data: event, error: eventError } = await admin.from("crm_events").upsert({ id: eventId, idempotency_key: idempotencyKey, event_type: type, subject_type: String(body.subjectType || "contact"), subject_id: body.subject, actor_user_id: user.id, payload: body.payload, status: "processing", attempt_count: 1, locked_at: new Date().toISOString(), locked_by: "crm-event" }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select("id").maybeSingle();
  if (eventError) return json({ error: eventError.message }, 500);
  if (!event) return json({ accepted: true, duplicate: true }, 202);

  const email = typeof payload.email === "string" && payload.email.trim() ? payload.email.trim().toLowerCase() : null;
  const phone = normalizePhone(payload.phone) || null;
  let contact: { id: string } | null = null;
  if (email) ({ data: contact } = await admin.from("crm_contacts").select("id").eq("email", email).is("deleted_at", null).maybeSingle());
  if (!contact && phone) ({ data: contact } = await admin.from("crm_contacts").select("id").eq("phone_e164", phone).is("deleted_at", null).maybeSingle());
  if (!contact && (email || phone)) {
    const source = ["spotlight", "highlevel_import", "admin", "business_owner", "system"].includes(payload.source) ? payload.source : "spotlight";
    const result = await admin.from("crm_contacts").insert({ source, source_id: payload.sourceId || null, auth_user_id: payload.authUserId || null, first_name: payload.firstName || null, last_name: payload.lastName || null, email, phone_e164: phone, attributes: payload.attributes || {} }).select("id").single();
    if (result.error) return json({ error: result.error.message }, 500);
    contact = result.data;
  } else if (contact) {
    await admin.from("crm_contacts").update({ first_name: payload.firstName || undefined, last_name: payload.lastName || undefined, email: email || undefined, phone_e164: phone || undefined }).eq("id", contact.id);
  }
  if (contact && hasBusinessId) await admin.from("crm_contact_businesses").upsert({ contact_id: contact.id, business_id: businessId, relationship: payload.relationship || "lead", is_primary: !!payload.isPrimary }, { onConflict: "contact_id,business_id,relationship" });

  const config = { resendApiKey: Deno.env.get("RESEND_API_KEY") || "", resendFromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "", twilioAccountSid: Deno.env.get("TWILIO_ACCOUNT_SID") || "", twilioAuthToken: Deno.env.get("TWILIO_AUTH_TOKEN") || "", twilioMessagingServiceSid: Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "", twilioFromNumber: Deno.env.get("TWILIO_FROM_NUMBER") || "", twilioStatusCallbackUrl: Deno.env.get("TWILIO_STATUS_CALLBACK_URL") || "" };
  const results: Array<{ channel: string; status: string; id?: string; error?: string }> = [];
  for (const delivery of buildDeliveries(type, payload)) {
    if (!contact) { results.push({ channel: delivery.channel, status: "skipped", error: "No CRM contact" }); continue; }
    const provider = delivery.channel === "email" ? new ResendProvider(config) : new TwilioProvider(config);
    const messageId = crypto.randomUUID();
    const suppression = await admin.from("crm_suppressions").select("id,reason").eq("channel", delivery.channel).eq("recipient", delivery.to).eq("active", true).maybeSingle();
    let skipReason = suppression.data ? `Suppressed: ${suppression.data.reason}` : "";
    if (!skipReason && delivery.channel === "sms") {
      const consent = await admin.from("crm_consents").select("status").eq("contact_id", contact.id).eq("channel", "sms").eq("purpose", "transactional").order("captured_at", { ascending: false }).limit(1).maybeSingle();
      if (consent.data?.status !== "granted") skipReason = "No active transactional SMS consent";
    }
    if (skipReason) {
      await admin.from("crm_messages").insert({ id: messageId, contact_id: contact.id, business_id: hasBusinessId ? businessId : null, event_id: event.id, channel: delivery.channel, direction: "outbound", recipient: delivery.to, subject: delivery.subject || null, body_text: delivery.text, body_html: delivery.html || null, status: "skipped", provider: provider.name, error_detail: skipReason });
      await admin.from("crm_delivery_attempts").insert({ message_id: messageId, attempt_number: 1, provider: provider.name, status: "suppressed", error_detail: skipReason, completed_at: new Date().toISOString() });
      results.push({ channel: delivery.channel, status: "skipped", error: skipReason });
      continue;
    }
    await admin.from("crm_messages").insert({ id: messageId, contact_id: contact.id, business_id: hasBusinessId ? businessId : null, event_id: event.id, channel: delivery.channel, direction: "outbound", recipient: delivery.to, subject: delivery.subject || null, body_text: delivery.text, body_html: delivery.html || null, status: "sending", provider: provider.name });
    try {
      const sent = await provider.send(delivery);
      await admin.from("crm_messages").update({ status: "sent", provider_message_id: sent.id, sent_at: new Date().toISOString() }).eq("id", messageId);
      await admin.from("crm_delivery_attempts").insert({ message_id: messageId, attempt_number: 1, provider: provider.name, status: "accepted", provider_response: { id: sent.id }, completed_at: new Date().toISOString() });
      results.push({ channel: delivery.channel, status: "sent", id: sent.id });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await admin.from("crm_messages").update({ status: "failed", error_detail: detail, failed_at: new Date().toISOString() }).eq("id", messageId);
      await admin.from("crm_delivery_attempts").insert({ message_id: messageId, attempt_number: 1, provider: provider.name, status: "failed", error_detail: detail, completed_at: new Date().toISOString() });
      results.push({ channel: delivery.channel, status: "failed", error: detail });
    }
  }

  const failed = results.some(result => result.status === "failed");
  await admin.from("crm_events").update({ status: failed ? "failed" : "processed", last_error: failed ? "One or more deliveries failed" : null, processed_at: new Date().toISOString() }).eq("id", event.id);
  await admin.from("crm_audit_log").insert({ actor_user_id: user.id, actor_type: "user", action: "crm.event.processed", entity_type: "crm_event", entity_id: event.id, request_id: idempotencyKey, after_state: { type, results }, metadata: { source: "crm-event" } });
  return json({ accepted: true, duplicate: false, eventId: event.id, results }, failed ? 207 : 202);
});
