import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhone, TwilioProvider } from "../_shared/messaging.ts";

const SITE = "https://spotlightpuertorico.com";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const generic = () => json({ ok: true, message: "If that number is registered, a login link is on its way by text." });

async function keyedHash(value: string, key: string) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", material, new TextEncoder().encode(value)));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Deno.env.get("CRM_MESSAGING_ENABLED") !== "true") return json({ error: "Text login is temporarily unavailable. Please use email sign-in." }, 503);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRole) return json({ error: "Text login is temporarily unavailable. Please use email sign-in." }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const phone = normalizePhone(input.phone);
  if (!phone) return json({ error: "Please enter a valid phone number." }, 400);

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = (request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
  const phoneHash = await keyedHash(`phone:${phone}`, serviceRole);
  const ipHash = await keyedHash(`ip:${ip}`, serviceRole);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const recent = await admin.from("crm_events").select("subject_id,payload").eq("event_type", "phone.login.requested").gte("created_at", since).limit(100);
  const phoneRequests = (recent.data || []).filter((event: any) => event.subject_id === phoneHash).length;
  const ipRequests = (recent.data || []).filter((event: any) => event.payload?.ipHash === ipHash).length;
  if (phoneRequests >= 3 || ipRequests >= 10) return json({ error: "Too many text-login requests. Please wait 15 minutes or use email sign-in." }, 429);

  const eventId = crypto.randomUUID();
  const requestId = `phone-login:${crypto.randomUUID()}`;
  await admin.from("crm_events").insert({ id: eventId, idempotency_key: requestId, event_type: "phone.login.requested", subject_type: "phone_hash", subject_id: phoneHash, payload: { ipHash }, status: "processing", attempt_count: 1, locked_at: new Date().toISOString(), locked_by: "phone-login" });

  try {
    const users = await admin.from("users").select("id,email,phone,first_name,last_name").not("phone", "is", null);
    const user = (users.data || []).find((candidate: any) => normalizePhone(candidate.phone) === phone);
    if (!user?.email) {
      await admin.from("crm_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", eventId);
      await admin.from("crm_audit_log").insert({ actor_type: "system", action: "crm.phone_login.account_not_found", entity_type: "crm_event", entity_id: eventId, request_id: requestId, metadata: { phoneHash, ipHash } });
      return generic();
    }

    let contact = (await admin.from("crm_contacts").select("id").eq("auth_user_id", user.id).is("deleted_at", null).maybeSingle()).data;
    if (!contact) contact = (await admin.from("crm_contacts").select("id").eq("phone_e164", phone).is("deleted_at", null).maybeSingle()).data;
    if (!contact) {
      const created = await admin.from("crm_contacts").insert({ source: "spotlight", source_id: `auth:${user.id}`, auth_user_id: user.id, first_name: user.first_name, last_name: user.last_name, email: String(user.email).toLowerCase(), phone_e164: phone, attributes: { signup_via: "legacy" } }).select("id").single();
      if (created.error) throw created.error;
      contact = created.data;
    }
    const suppression = await admin.from("crm_suppressions").select("id").eq("channel", "sms").eq("recipient", phone).eq("active", true).maybeSingle();
    if (suppression.data) {
      await admin.from("crm_events").update({ status: "processed", processed_at: new Date().toISOString(), last_error: "recipient suppressed" }).eq("id", eventId);
      await admin.from("crm_audit_log").insert({ actor_type: "system", action: "crm.phone_login.suppressed", entity_type: "crm_contact", entity_id: contact.id, request_id: requestId, metadata: { phoneHash } });
      return json({ error: "Text login is unavailable for this number. Please use email sign-in or reply START to the Spotlight number." }, 409);
    }

    const linkResult = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email, options: { redirectTo: `${SITE}/` } });
    if (linkResult.error || !linkResult.data?.properties?.action_link) throw linkResult.error || new Error("Could not create login link");
    const delivery = { channel: "sms" as const, to: phone, text: `Your Spotlight Puerto Rico login link (tap to sign in): ${linkResult.data.properties.action_link}` };
    const messageId = crypto.randomUUID();
    await admin.from("crm_messages").insert({ id: messageId, contact_id: contact.id, event_id: eventId, channel: "sms", direction: "outbound", recipient: phone, body_text: delivery.text, status: "sending", provider: "twilio" });
    await admin.from("crm_delivery_attempts").insert({ message_id: messageId, attempt_number: 1, provider: "twilio", status: "started" });

    const provider = new TwilioProvider({
      twilioAccountSid: Deno.env.get("TWILIO_ACCOUNT_SID") || "",
      twilioAuthToken: Deno.env.get("TWILIO_AUTH_TOKEN") || "",
      twilioMessagingServiceSid: Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "",
      twilioFromNumber: Deno.env.get("TWILIO_FROM_NUMBER") || "",
      twilioStatusCallbackUrl: Deno.env.get("TWILIO_STATUS_CALLBACK_URL") || "",
    });
    const sent = await provider.send(delivery);
    await admin.from("crm_messages").update({ status: "sent", provider_message_id: sent.id, sent_at: new Date().toISOString() }).eq("id", messageId);
    await admin.from("crm_delivery_attempts").update({ status: "accepted", provider_response: { id: sent.id } }).eq("message_id", messageId).eq("attempt_number", 1);
    await admin.from("crm_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", eventId);
    await admin.from("crm_audit_log").insert({ actor_type: "system", action: "crm.phone_login.sent", entity_type: "crm_message", entity_id: messageId, request_id: requestId, after_state: { providerMessageId: sent.id }, metadata: { phoneHash, ipHash } });
    return generic();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await admin.from("crm_events").update({ status: "failed", last_error: detail }).eq("id", eventId);
    await admin.from("crm_audit_log").insert({ actor_type: "system", action: "crm.phone_login.failed", entity_type: "crm_event", entity_id: eventId, request_id: requestId, metadata: { phoneHash, ipHash, error: detail } });
    return json({ error: "Text login is temporarily unavailable. Please use email sign-in." }, 503);
  }
});
