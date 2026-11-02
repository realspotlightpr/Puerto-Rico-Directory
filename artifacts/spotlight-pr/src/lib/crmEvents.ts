import { supabase } from "@/lib/supabase";

export type CrmEventType =
  | "contact.upserted"
  | "user.signed_up"
  | "listing.submitted"
  | "listing.approved"
  | "listing.rejected"
  | "inquiry.received"
  | "review.received"
  | "booking.requested"
  | "booking.confirmed";

export type DeliveryResult = { ok: boolean; detail?: string; backend?: "crm" | "highlevel" };

type LegacyRequest = { action: "sync-business" | "notify"; event?: string; business: Record<string, unknown> };

function failure(error: unknown, data: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (error) return String(error);
  const payload = data as { error?: unknown } | null;
  return payload?.error ? String(payload.error) : undefined;
}

export async function publishCrmEvent(type: CrmEventType, subject: string, payload: Record<string, unknown>, legacy?: LegacyRequest): Promise<DeliveryResult> {
  try {
    const { data, error } = await supabase.functions.invoke("crm-event", {
      body: { type, subject, payload, idempotencyKey: crypto.randomUUID(), occurredAt: new Date().toISOString() },
    });
    const detail = failure(error, data);
    if (detail) throw new Error(detail);
    return { ok: true, backend: "crm" };
  } catch (crmError) {
    const fallbackEnabled = import.meta.env.VITE_ENABLE_HIGHLEVEL_FALLBACK !== "false";
    if (!fallbackEnabled || !legacy) {
      console.warn("CRM event delivery failed", crmError);
      return { ok: false, detail: crmError instanceof Error ? crmError.message : String(crmError) };
    }

    try {
      const { data, error } = await supabase.functions.invoke("highlevel", { body: legacy });
      const detail = failure(error, data);
      if (detail) throw new Error(detail);
      return { ok: true, backend: "highlevel" };
    } catch (legacyError) {
      console.warn("CRM and legacy HighLevel delivery failed", { crmError, legacyError });
      return { ok: false, detail: legacyError instanceof Error ? legacyError.message : String(legacyError) };
    }
  }
}
