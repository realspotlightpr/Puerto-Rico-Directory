import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://spotlightpuertorico.com";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function getPublishableKey() {
  try {
    const reference = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
    if (typeof reference === "string") return reference.startsWith("sb_publishable_") ? reference : Deno.env.get(reference) || "";
  } catch { /* fall through to the legacy platform variable */ }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

const roleCopy: Record<string, { label: string; destination: string; intro: string }> = {
  user: { label: "community member", destination: "/welcome", intro: "Save favorites, plan your Puerto Rico days, and share reviews." },
  business_owner: { label: "business owner", destination: "/dashboard", intro: "Manage your listing, photos, reviews, and customer activity." },
  tour_guide: { label: "tour guide", destination: "/guide", intro: "Manage your tours, booking requests, guest messages, and payouts." },
  influencer: { label: "creator", destination: "/influencer", intro: "Access your creator dashboard, links, and Spotlight campaigns." },
  admin: { label: "administrator", destination: "/admin", intro: "Access Spotlight administration and platform tools." },
};

function normalizePhone(value?: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+${digits}`;
}

async function sendLegacyHighLevelOutreach(person: any, loginUrl: string, role: string) {
  const token = Deno.env.get("HIGHLEVEL_API_KEY") || "";
  const locationId = Deno.env.get("HIGHLEVEL_LOCATION_ID") || "";
  if (!token || !locationId) return { email: "skipped: HighLevel not configured", sms: "skipped: HighLevel not configured" };
  const headers = { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" };
  const copy = roleCopy[role] || roleCopy.user;
  const phone = normalizePhone(person.phone);
  const contactResponse = await fetch("https://services.leadconnectorhq.com/contacts/upsert", { method: "POST", headers, body: JSON.stringify({ locationId, firstName: person.firstName || "Spotlight", lastName: person.lastName || "Member", email: person.email, phone, source: "Spotlight admin invite", tags: ["spotlight-invite", `role-${role}`] }) });
  const contactData = await contactResponse.json().catch(() => ({}));
  const contactId = contactData.contact?.id || contactData.id;
  if (!contactResponse.ok || !contactId) throw new Error(contactData.message || "Could not create outreach contact");
  const firstName = person.firstName || "there";
  const results: Record<string, string> = {};
  if (person.email) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="color:#0e7490">Welcome to Spotlight Puerto Rico</h2><p>Hi ${firstName},</p><p>You've been invited as a Spotlight ${copy.label}. ${copy.intro}</p><p><a href="${loginUrl}" style="display:inline-block;background:#0e7490;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">One-click login</a></p><p>This secure link signs you in. On your first visit, Spotlight will help you set a password.</p></div>`;
    const response = await fetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST", headers, body: JSON.stringify({ type: "Email", locationId, contactId, subject: `Your Spotlight ${copy.label} invitation`, html }) });
    results.email = response.ok ? "sent" : "failed";
  }
  if (phone) {
    const message = role === "tour_guide"
      ? `Welcome to Spotlight, ${firstName}! Manage your tours, bookings, messages & payouts here: ${loginUrl} This one-click link signs you in and lets you set your password.`
      : `Welcome to Spotlight, ${firstName}! You've been invited as a ${copy.label}. One-click login: ${loginUrl} You can set your password after signing in.`;
    const response = await fetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST", headers, body: JSON.stringify({ type: "SMS", locationId, contactId, message }) });
    results.sms = response.ok ? "sent" : "failed";
  } else results.sms = "skipped: no phone";
  return results;
}

async function sendOutreach(person: any, loginUrl: string, role: string, authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = getPublishableKey();
  const fallbackEnabled = Deno.env.get("ENABLE_HIGHLEVEL_FALLBACK") !== "false";
  const copy = roleCopy[role] || roleCopy.user;

  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/crm-event`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "admin.invitation.requested",
          subject: String(person.email),
          idempotencyKey: `admin-invite:${person.email}:${role}:${new Date().toISOString().slice(0, 10)}`,
          payload: {
            email: person.email,
            phone: normalizePhone(person.phone),
            firstName: person.firstName,
            lastName: person.lastName,
            loginUrl,
            role,
            roleLabel: copy.label,
            source: "spotlight-admin-invite",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) throw new Error((data as any).error || `CRM returned ${response.status}`);
      const deliveries = Array.isArray((data as any).results) ? (data as any).results : [];
      return {
        email: person.email ? deliveries.find((item: any) => item.channel === "email")?.status || "processed by Resend" : "skipped: no email",
        sms: normalizePhone(person.phone) ? deliveries.find((item: any) => item.channel === "sms")?.status || "processed by Twilio" : "skipped: no phone",
      };
    } catch (error) {
      console.warn("First-party CRM outreach failed", error);
      if (!fallbackEnabled) throw error;
    }
  } else if (!fallbackEnabled) {
    throw new Error("First-party CRM outreach is not configured");
  }

  return sendLegacyHighLevelOutreach(person, loginUrl, role);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = getPublishableKey();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(url, serviceRole);
    const { data: callerRow } = await admin.from("users").select("role").eq("id", caller.id).maybeSingle();
    if (callerRow?.role !== "admin") return json({ error: "Admin access required" }, 403);
    const body = await req.json();
    if (body.action === "welcome-guides") {
      const { data: profiles, error: profilesError } = await admin.from("guide_profiles").select("user_id, display_name, phone");
      if (profilesError) throw profilesError;
      const ids = (profiles || []).map((profile: any) => profile.user_id).filter(Boolean);
      const { data: users, error: usersError } = ids.length ? await admin.from("users").select("id, email, first_name, last_name, phone").in("id", ids) : { data: [], error: null } as any;
      if (usersError) throw usersError;
      const userMap = new Map((users || []).map((user: any) => [user.id, user]));
      const results: any[] = [];
      for (const profile of profiles || []) {
        const person: any = userMap.get(profile.user_id) || {};
        if (!person.email) { results.push({ userId: profile.user_id, status: "skipped", reason: "no email" }); continue; }
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: person.email, options: { redirectTo: `${SITE}/guide` } });
        if (linkError) { results.push({ userId: profile.user_id, status: "failed", reason: linkError.message }); continue; }
        try {
          const outreach = await sendOutreach({ email: person.email, phone: profile.phone || person.phone, firstName: person.first_name || profile.display_name, lastName: person.last_name }, linkData.properties.action_link, "tour_guide", authHeader);
          results.push({ userId: profile.user_id, status: "processed", outreach });
        } catch (error: any) { results.push({ userId: profile.user_id, status: "failed", reason: error.message }); }
      }
      return json({ success: true, total: results.length, results });
    }
    const role = String(body.role || "user");
    if (!roleCopy[role]) return json({ error: "Unsupported role" }, 400);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return json({ error: "Email is required" }, 400);
    const password = crypto.randomUUID() + "Aa1!";
    let userId = "";
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, phone: normalizePhone(body.phone), phone_confirm: !!normalizePhone(body.phone), user_metadata: { first_name: body.firstName || "", last_name: body.lastName || "", invited_role: role, must_change_password: true } });
    if (createError) {
      const { data: existing } = await admin.from("users").select("id").eq("email", email).maybeSingle();
      if (!existing) throw createError;
      userId = existing.id;
    } else userId = created.user.id;
    await admin.from("users").upsert({ id: userId, email, first_name: body.firstName || null, last_name: body.lastName || null, phone: normalizePhone(body.phone) || null, role }, { onConflict: "id" });
    const destination = roleCopy[role].destination;
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${SITE}${destination}` } });
    if (linkError) throw linkError;
    const loginUrl = linkData.properties.action_link;
    const outreach = await sendOutreach({ email, phone: body.phone, firstName: body.firstName, lastName: body.lastName }, loginUrl, role, authHeader);
    return json({ success: true, userId, role, outreach });
  } catch (error: any) {
    return json({ error: error?.message || "Invite failed" }, 500);
  }
});
