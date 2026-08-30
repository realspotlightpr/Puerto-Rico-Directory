export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "twitter" | "youtube";

export function socialPlatformForUrl(value?: string | null): SocialPlatform | null {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    if (host === "facebook.com" || host.endsWith(".facebook.com")) return "facebook";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (["x.com", "twitter.com"].includes(host) || host.endsWith(".twitter.com")) return "twitter";
    if (host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";
    return null;
  } catch { return null; }
}

export function isStandaloneWebsite(value?: string | null): value is string {
  if (!value || socialPlatformForUrl(value)) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
