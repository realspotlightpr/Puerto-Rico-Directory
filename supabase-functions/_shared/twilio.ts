const encoder = new TextEncoder();

export type TwilioInboundKeyword = "stop" | "start" | "help" | "message";

export function classifyTwilioInbound(body: unknown, optOutType?: unknown): TwilioInboundKeyword {
  const providerType = String(optOutType ?? "").trim().toLowerCase();
  if (["stop", "start", "help"].includes(providerType)) return providerType as TwilioInboundKeyword;
  const keyword = String(body ?? "").trim().toUpperCase().split(/\s+/)[0] || "";
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) return "stop";
  if (["START", "UNSTOP", "YES"].includes(keyword)) return "start";
  if (["HELP", "INFO"].includes(keyword)) return "help";
  return "message";
}

export function twilioSignaturePayload(url: string, params: URLSearchParams): string {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of params.entries()) grouped.set(key, [...(grouped.get(key) || []), value]);
  let payload = url;
  for (const key of [...grouped.keys()].sort()) {
    for (const value of grouped.get(key) || []) payload += key + value;
  }
  return payload;
}

export async function computeTwilioSignature(authToken: string, url: string, params: URLSearchParams): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(twilioSignaturePayload(url, params)));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index++) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

export async function verifyTwilioSignature(authToken: string, url: string, params: URLSearchParams, provided: string): Promise<boolean> {
  if (!authToken || !url || !provided) return false;
  const expected = await computeTwilioSignature(authToken, url, params);
  return constantTimeEqual(expected, provided);
}

export function twiml(message?: string): Response {
  const escaped = String(message ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const xml = message ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>` : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(xml, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
