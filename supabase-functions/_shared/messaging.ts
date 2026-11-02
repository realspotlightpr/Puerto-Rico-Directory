export type CrmEventType = "contact.upserted" | "user.signed_up" | "listing.submitted" | "listing.approved" | "listing.rejected" | "inquiry.received" | "review.received" | "booking.requested" | "booking.confirmed" | "admin.invitation.requested";
export const CRM_EVENT_TYPES: CrmEventType[] = ["contact.upserted", "user.signed_up", "listing.submitted", "listing.approved", "listing.rejected", "inquiry.received", "review.received", "booking.requested", "booking.confirmed", "admin.invitation.requested"];
export type Delivery = { channel: "email" | "sms"; to: string; subject?: string; text: string; html?: string };
export type MessagingConfig = { resendApiKey?: string; resendFromEmail?: string; twilioAccountSid?: string; twilioAuthToken?: string; twilioMessagingServiceSid?: string; twilioFromNumber?: string; twilioStatusCallbackUrl?: string };
export interface MessagingProvider { readonly name: string; send(delivery: Delivery): Promise<{ id: string }>; }

export function normalizePhone(value: unknown): string | undefined {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

export function buildDeliveries(type: CrmEventType, payload: Record<string, unknown>): Delivery[] {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const phone = normalizePhone(payload.phone);
  const firstName = typeof payload.firstName === "string" && payload.firstName.trim() ? payload.firstName.trim() : "there";
  const businessName = typeof payload.businessName === "string" && payload.businessName.trim() ? payload.businessName.trim() : "your business";
  const serviceName = typeof payload.serviceName === "string" && payload.serviceName.trim() ? payload.serviceName.trim() : "your booking";
  const escapeHtml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const deliveries: Delivery[] = [];
  if (type === "admin.invitation.requested") {
    const loginUrl = String(payload.loginUrl ?? ""); const roleLabel = String(payload.roleLabel ?? "member");
    if (email) deliveries.push({ channel: "email", to: email, subject: `Your Spotlight ${roleLabel} invitation`, text: `Hi ${firstName}, you have been invited to Spotlight Puerto Rico. Sign in: ${loginUrl}`, html: `<p>Hi ${escapeHtml(firstName)},</p><p>You have been invited to Spotlight Puerto Rico as a ${escapeHtml(roleLabel)}.</p><p><a href="${escapeHtml(loginUrl)}">Sign in to Spotlight</a></p>` });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `Welcome to Spotlight, ${firstName}! Sign in to your ${roleLabel} account: ${loginUrl}` });
  }
  if (type === "listing.submitted" && email) deliveries.push({ channel: "email", to: email, subject: "We received your Spotlight listing", text: `Hi ${firstName}, we received ${businessName} and will review it shortly.` });
  if (type === "listing.approved") {
    if (email) deliveries.push({ channel: "email", to: email, subject: `${businessName} is live on Spotlight`, text: `Hi ${firstName}, your Spotlight listing for ${businessName} has been approved.` });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `${businessName} is now live on Spotlight Puerto Rico. Manage your listing: https://spotlightpuertorico.com/dashboard` });
  }
  if (type === "listing.rejected" && email) deliveries.push({ channel: "email", to: email, subject: `Update about ${businessName}`, text: `Hi ${firstName}, your listing needs changes before it can be published. Please contact Spotlight support.` });
  if (type === "inquiry.received") {
    if (email) deliveries.push({ channel: "email", to: email, subject: `New Spotlight inquiry for ${businessName}`, text: String(payload.message ?? "A customer sent a new inquiry through Spotlight.") });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `New customer inquiry for ${businessName}. Open Spotlight to reply: https://spotlightpuertorico.com/dashboard` });
  }
  if (type === "review.received") {
    if (email) deliveries.push({ channel: "email", to: email, subject: `New review for ${businessName}`, text: `${businessName} received a new Spotlight review. Open your dashboard to view it.` });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `${businessName} received a new Spotlight review. View it: https://spotlightpuertorico.com/dashboard` });
  }
  if (type === "booking.requested") {
    if (email) deliveries.push({ channel: "email", to: email, subject: `New booking request — ${serviceName}`, text: `You received a new Spotlight booking request for ${serviceName}. Open your guide dashboard to respond.` });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `New Spotlight booking request for ${serviceName}. Respond: https://spotlightpuertorico.com/guide` });
  }
  if (type === "booking.confirmed") {
    if (email) deliveries.push({ channel: "email", to: email, subject: `Booking confirmed — ${serviceName}`, text: `Your Spotlight booking for ${serviceName} is confirmed.` });
    if (phone) deliveries.push({ channel: "sms", to: phone, text: `Your Spotlight booking for ${serviceName} is confirmed.` });
  }
  return deliveries;
}

export class ResendProvider implements MessagingProvider {
  readonly name = "resend";
  constructor(private readonly config: MessagingConfig, private readonly request: typeof fetch = fetch) {}
  async send(delivery: Delivery): Promise<{ id: string }> {
    if (delivery.channel !== "email") throw new Error("Resend only supports email deliveries");
    if (!this.config.resendApiKey || !this.config.resendFromEmail) throw new Error("Resend is not configured");
    const response = await this.request("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${this.config.resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: this.config.resendFromEmail, to: [delivery.to], subject: delivery.subject ?? "Spotlight Puerto Rico", text: delivery.text, html: delivery.html }) });
    const data = await response.json() as { id?: string; message?: string };
    if (!response.ok || !data.id) throw new Error(data.message || `Resend returned ${response.status}`);
    return { id: data.id };
  }
}

export class TwilioProvider implements MessagingProvider {
  readonly name = "twilio";
  constructor(private readonly config: MessagingConfig, private readonly request: typeof fetch = fetch) {}
  async send(delivery: Delivery): Promise<{ id: string }> {
    if (delivery.channel !== "sms") throw new Error("Twilio only supports SMS deliveries");
    const sid = this.config.twilioAccountSid; const token = this.config.twilioAuthToken;
    if (!sid || !token || (!this.config.twilioMessagingServiceSid && !this.config.twilioFromNumber)) throw new Error("Twilio is not configured");
    const body = new URLSearchParams({ To: delivery.to, Body: delivery.text });
    if (this.config.twilioMessagingServiceSid) body.set("MessagingServiceSid", this.config.twilioMessagingServiceSid); else body.set("From", this.config.twilioFromNumber!);
    if (this.config.twilioStatusCallbackUrl) body.set("StatusCallback", this.config.twilioStatusCallbackUrl);
    const response = await this.request(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    const data = await response.json() as { sid?: string; message?: string };
    if (!response.ok || !data.sid) throw new Error(data.message || `Twilio returned ${response.status}`);
    return { id: data.sid };
  }
}
