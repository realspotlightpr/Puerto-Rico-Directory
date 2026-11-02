import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyTwilioInbound, twiml, verifyTwilioSignature } from "../_shared/twilio.ts";
import { normalizePhone } from "../_shared/messaging.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safePayload(params: URLSearchParams) {
  return {
    messageSid: params.get("MessageSid"),
    messageStatus: params.get("MessageStatus"),
    from: normalizePhone(params.get("From")),
    to: normalizePhone(params.get("To")),
    errorCode: params.get("ErrorCode"),
    optOutType: params.get("OptOutType"),
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const requestKind = new URL(request.url).searchParams.get("kind") === "status" ? "status" : "inbound";
  const signatureUrl = requestKind === "status"
    ? Deno.env.get("TWILIO_STATUS_CALLBACK_URL") || ""
    : Deno.env.get("TWILIO_INBOUND_WEBHOOK_URL") || "";
  if (!supabaseUrl || !serviceRole || !authToken || !signatureUrl) return json({ error: "Webhook environment is incomplete" }, 503);

  const params = new URLSearchParams(await request.text());
  const signature = request.headers.get("X-Twilio-Signature") || "";
  if (!await verifyTwilioSignature(authToken, signatureUrl, params, signature)) return json({ error: "Invalid Twilio signature" }, 403);

  const messageSid = String(params.get("MessageSid") || "").trim();
  if (!messageSid) return json({ error: "MessageSid is required" }, 400);
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const status = String(params.get("MessageStatus") || "").toLowerCase();
  const eventKey = requestKind === "status"
    ? `status:${messageSid}:${status}:${params.get("SequenceNumber") || params.get("ErrorCode") || "0"}`
    : `inbound:${messageSid}`;

  const inserted = await admin.from("crm_provider_events").insert({
    provider: "twilio",
    event_key: eventKey,
    event_type: requestKind === "status" ? "message.status" : "message.inbound",
    provider_message_id: messageSid,
    payload: safePayload(params),
  }).select("id,processed_at").maybeSingle();
  let providerEvent = inserted.data;
  if (inserted.error?.code === "23505") {
    const existing = await admin.from("crm_provider_events").select("id,processed_at").eq("provider", "twilio").eq("event_key", eventKey).maybeSingle();
    providerEvent = existing.data;
    if (providerEvent?.processed_at) return requestKind === "inbound" ? twiml() : json({ ok: true, duplicate: true });
  } else if (inserted.error) return json({ error: inserted.error.message }, 500);
  if (!providerEvent) return json({ error: "Could not record provider event" }, 500);

  try {
    if (requestKind === "status") {
      const messageResult = await admin.from("crm_messages").select("id,status").eq("provider", "twilio").eq("provider_message_id", messageSid).maybeSingle();
      const message = messageResult.data;
      if (message) {
        const delivered = status === "delivered";
        const failed = ["failed", "undelivered", "canceled"].includes(status);
        const nextStatus = delivered ? "delivered" : failed ? "failed" : ["queued", "accepted", "sending", "sent"].includes(status) ? "sent" : message.status;
        await admin.from("crm_messages").update({
          status: nextStatus,
          delivered_at: delivered ? new Date().toISOString() : undefined,
          failed_at: failed ? new Date().toISOString() : undefined,
          error_code: params.get("ErrorCode") || undefined,
          error_detail: params.get("ErrorMessage") || undefined,
        }).eq("id", message.id);
        await admin.from("crm_delivery_attempts").update({
          status: delivered ? "delivered" : failed ? "failed" : "accepted",
          error_code: params.get("ErrorCode") || undefined,
          error_detail: params.get("ErrorMessage") || undefined,
          completed_at: delivered || failed ? new Date().toISOString() : undefined,
        }).eq("message_id", message.id).eq("attempt_number", 1);
        await admin.from("crm_audit_log").insert({ actor_type: "provider_webhook", action: "crm.message.status.updated", entity_type: "crm_message", entity_id: message.id, request_id: eventKey, after_state: { status: nextStatus, providerStatus: status }, metadata: { provider: "twilio" } });
      }
      await admin.from("crm_provider_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", providerEvent.id);
      return json({ ok: true });
    }

    const from = normalizePhone(params.get("From"));
    const to = normalizePhone(params.get("To"));
    if (!from) throw new Error("Inbound sender is invalid");
    let contact = (await admin.from("crm_contacts").select("id").eq("phone_e164", from).is("deleted_at", null).maybeSingle()).data;
    if (!contact) {
      const created = await admin.from("crm_contacts").insert({ source: "system", source_id: `twilio:${from}`, phone_e164: from, attributes: { firstSeenVia: "twilio_inbound" } }).select("id").single();
      if (created.error?.code === "23505") contact = (await admin.from("crm_contacts").select("id").eq("phone_e164", from).is("deleted_at", null).maybeSingle()).data;
      else if (created.error) throw created.error;
      else contact = created.data;
    }
    if (!contact) throw new Error("Could not resolve inbound contact");
    let conversation = (await admin.from("crm_conversations").select("id").eq("contact_id", contact.id).is("business_id", null).eq("status", "open").order("updated_at", { ascending: false }).limit(1).maybeSingle()).data;
    if (!conversation) {
      const created = await admin.from("crm_conversations").insert({ contact_id: contact.id, subject: "SMS conversation", status: "open", last_message_at: new Date().toISOString() }).select("id").single();
      if (created.error) throw created.error;
      conversation = created.data;
    }
    const body = String(params.get("Body") || "");
    const keyword = classifyTwilioInbound(body, params.get("OptOutType"));
    const inboundMessage = await admin.from("crm_messages").insert({ conversation_id: conversation.id, contact_id: contact.id, channel: "sms", direction: "inbound", recipient: to, sender: from, body_text: body, status: "received", provider: "twilio", provider_message_id: messageSid, delivered_at: new Date().toISOString() }).select("id").single();
    if (inboundMessage.error?.code !== "23505" && inboundMessage.error) throw inboundMessage.error;
    await admin.from("crm_conversations").update({ last_message_at: new Date().toISOString(), status: "open" }).eq("id", conversation.id);

    if (keyword === "stop") {
      await admin.from("crm_suppressions").update({ active: false, lifted_at: new Date().toISOString() }).eq("channel", "sms").eq("recipient", from).eq("active", true);
      await admin.from("crm_suppressions").insert({ contact_id: contact.id, channel: "sms", recipient: from, reason: "recipient_stop", source: "twilio_inbound", active: true, evidence: { messageSid, optOutType: params.get("OptOutType") } });
      await admin.from("crm_consents").insert({ contact_id: contact.id, channel: "sms", purpose: "transactional", status: "withdrawn", provenance: "twilio_inbound_stop", policy_version: "2026-11-02", captured_at: new Date().toISOString(), evidence: { messageSid } });
    } else if (keyword === "start") {
      await admin.from("crm_suppressions").update({ active: false, lifted_at: new Date().toISOString(), evidence: { liftedBy: "twilio_inbound_start", messageSid } }).eq("channel", "sms").eq("recipient", from).eq("active", true);
      await admin.from("crm_consents").insert({ contact_id: contact.id, channel: "sms", purpose: "transactional", status: "granted", provenance: "twilio_inbound_start", policy_version: "2026-11-02", captured_at: new Date().toISOString(), evidence: { messageSid } });
    }
    await admin.from("crm_audit_log").insert({ actor_type: "provider_webhook", action: `crm.sms.inbound.${keyword}`, entity_type: "crm_conversation", entity_id: conversation.id, request_id: eventKey, after_state: { messageSid, keyword }, metadata: { provider: "twilio", from, to } });
    await admin.from("crm_provider_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", providerEvent.id);

    const advancedOptOut = Deno.env.get("TWILIO_ADVANCED_OPTOUT_ENABLED") !== "false";
    if (advancedOptOut || keyword === "message") return twiml();
    if (keyword === "stop") return twiml("You are unsubscribed from Spotlight Puerto Rico texts. Reply START to opt back in.");
    if (keyword === "start") return twiml("You are resubscribed to Spotlight Puerto Rico service texts. Reply STOP to opt out.");
    return twiml(Deno.env.get("TWILIO_HELP_MESSAGE") || "Spotlight Puerto Rico help: support@spotlightpuertorico.com. Reply STOP to opt out.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await admin.from("crm_provider_events").update({ processing_error: detail }).eq("id", providerEvent.id);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
