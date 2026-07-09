/**
 * Supabase API handler
 * ---------------------
 * Routes the app's generated API-client calls (which target the Express
 * `/api/...` server) directly to Supabase instead. The Express backend is not
 * deployed; this makes the app fully serverless on top of Supabase + RLS.
 *
 * Registered via `setApiHandler` (see main.tsx). Every call that the generated
 * client would have sent through `customFetch` is intercepted here. We match on
 * method + path, run the equivalent Supabase query, and return data shaped to
 * match the OpenAPI types the components already expect (camelCase).
 *
 * Endpoints that genuinely require a server (OpenAI assistant/image, object
 * storage uploads, HighLevel social posting, team/affiliate features) throw a
 * clear "coming soon" error so those isolated UI panels show an error state
 * instead of silently failing.
 */
import { supabase } from "@/lib/supabase";
import { setApiHandler, type ApiHandlerRequest } from "@workspace/api-client-react";

// ── helpers ────────────────────────────────────────────────────────────────

class NotImplementedError extends Error {
  status = 501;
  constructor(feature: string) {
    super(`${feature} isn't available yet. This feature requires the backend service, which is coming soon.`);
    this.name = "NotImplementedError";
  }
}

class AuthRequiredError extends Error {
  status = 401;
  constructor(msg = "You need to be signed in to do that.") {
    super(msg);
    this.name = "AuthRequiredError";
  }
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AuthRequiredError();
  return data.user.id;
}

async function syncHighLevel(biz: any): Promise<void> {
  try {
    await supabase.functions.invoke("highlevel", { body: { action: "sync-business", business: biz } });
  } catch (e) {
    console.warn("HighLevel sync failed", e);
  }
}

async function notifyHighLevel(event: string, biz: any): Promise<void> {
  try {
    await supabase.functions.invoke("highlevel", { body: { action: "notify", event, business: biz } });
  } catch (e) {
    console.warn("HighLevel notify failed", e);
  }
}

function bizFromRow(row: any): any {
  return { name: row?.name, ownerName: row?.owner_name, ownerContactEmail: row?.owner_contact_email, ownerPhone: row?.owner_phone };
}

function mapTeamMember(row: any, user?: any, businessesAdded?: number): any {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    permissions: row.permissions ?? [],
    invitedBy: row.invited_by ?? null,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: user ? {
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      email: user.email ?? null,
      profileImageUrl: user.profile_image_url ?? null,
      role: user.role ?? null,
    } : undefined,
    businessesAdded: businessesAdded ?? 0,
  };
}

function extractMunicipality(address?: string): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/\b(PR|Puerto Rico)\b|\d{5}/i.test(parts[i]) && i - 1 >= 0) {
        return parts[i - 1];
      }
    }
    return parts[parts.length - 2];
  }
  return "";
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "business"}-${suffix}`;
}

// snake_case business row (optionally with joined category) → camelCase Business/BusinessDetail
function mapBusiness(row: any): any {
  if (!row) return row;
  const categoryName =
    row.categoryName ??
    (row.categories ? row.categories.name : undefined) ??
    undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    categoryId: row.category_id ?? undefined,
    categoryName,
    municipality: row.municipality ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    status: row.status,
    featured: !!row.featured,
    averageRating: row.average_rating ?? 0,
    reviewCount: row.review_count ?? 0,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner_name ?? undefined,
    ownerContactEmail: row.owner_contact_email ?? undefined,
    ownerPhone: row.owner_phone ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // detail-only fields
    hours: row.hours ?? undefined,
    socialLinks: row.social_links ?? undefined,
    specialOffer: row.special_offer ?? null,
    isClaimed: !!row.is_claimed,
    pageViews: row.page_views ?? 0,
    websiteClicks: row.website_clicks ?? 0,
    mapsClicks: row.maps_clicks ?? 0,
  };
}

function mapCategory(row: any): any {
  return { id: row.id, name: row.name, slug: row.slug, icon: row.icon ?? undefined };
}

function mapReview(row: any): any {
  const u = row.users ?? undefined;
  const authorName =
    row.authorName ??
    (u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username : undefined) ??
    undefined;
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title ?? undefined,
    body: row.body ?? undefined,
    authorName: authorName || "Anonymous",
    authorImage: u?.profile_image_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapUser(row: any): any {
  return {
    id: row.id,
    username: row.username ?? (typeof row.email === "string" && row.email ? row.email.split("@")[0] : undefined) ?? "user",
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    emailVerified: row.email_verified ?? undefined,
    profileImage: row.profile_image_url ?? undefined,
    role: row.role ?? "user",
    createdAt: row.created_at,
  };
}

function mapSubmission(row: any): any {
  return {
    id: row.id,
    businessId: row.business_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    data: row.data ?? {},
    isRead: !!row.is_read,
    isArchived: !!row.is_archived,
    createdAt: row.created_at,
  };
}

async function categoryIdFromSlug(slug?: string): Promise<number | undefined> {
  if (!slug || slug === "all") return undefined;
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  return data?.id;
}

const BUSINESS_SELECT = "*, categories(name)";
const REVIEW_SELECT = "*, users(first_name,last_name,username,profile_image_url)";

function throwSb(error: { message: string; code?: string } | null) {
  if (error) {
    const e = new Error(error.message) as Error & { status?: number };
    e.status = error.code === "42501" ? 403 : 400;
    throw e;
  }
}

// ── router ───────────────────────────────────────────────────────────────────

async function handle(req: ApiHandlerRequest): Promise<unknown> {
  const { method, path, query, body } = req;
  const seg = path.replace(/^\/api\//, "").split("/"); // e.g. ["businesses","12","reviews"]
  const top = seg[0];

  // ---- auth ----
  if (path === "/api/auth/user" && method === "GET") {
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return { isAuthenticated: false };
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", au.user.id)
      .maybeSingle();
    const u = profile
      ? mapUser(profile)
      : { id: au.user.id, role: "user", createdAt: new Date().toISOString() };
    return { isAuthenticated: true, user: u };
  }

  if (path === "/api/healthz") return { status: "ok" };

  // ---- categories ----
  if (path === "/api/categories" && method === "GET") {
    const { data, error } = await supabase.from("categories").select("*").order("id");
    throwSb(error);
    return { categories: (data ?? []).map(mapCategory) };
  }

  // ---- businesses collection ----
  if (top === "businesses") {
    const id = seg[1];
    const sub = seg[2];

    // GET /api/businesses (list/search)
    if (!id && method === "GET") {
      const page = Number(query.page ?? 1) || 1;
      const limit = Number(query.limit ?? 20) || 20;
      const from = (page - 1) * limit;
      let q = supabase
        .from("businesses")
        .select(BUSINESS_SELECT, { count: "exact" })
        .eq("status", "approved");
      if (query.featured === "true" || query.featured === true) q = q.eq("featured", true);
      if (query.municipality && query.municipality !== "all")
        q = q.eq("municipality", String(query.municipality));
      const catId = await categoryIdFromSlug(query.category as string | undefined);
      if (catId) q = q.eq("category_id", catId);
      if (query.search) {
        const s = String(query.search).replace(/[%,]/g, " ").trim();
        if (s) q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
      }
      q = q.order("featured", { ascending: false }).order("created_at", { ascending: false }).range(from, from + limit - 1);
      const { data, count, error } = await q;
      throwSb(error);
      const total = count ?? 0;
      return {
        businesses: (data ?? []).map(mapBusiness),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    // POST /api/businesses (create — owner)
    if (!id && method === "POST") {
      const uid = await requireUserId();
      const b = (body ?? {}) as any;
      // Admins' own listings go live immediately; everyone else is pending review.
      const { data: me } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
      const isAdminSubmitter = me?.role === "admin";
      const insert = {
        name: b.name,
        slug: slugify(b.name ?? "business"),
        description: b.description ?? "",
        category_id: b.categoryId ?? null,
        municipality: b.municipality,
        address: b.address ?? null,
        phone: b.phone ?? null,
        email: b.email ?? null,
        website: b.website ?? null,
        logo_url: b.logoUrl ?? null,
        cover_url: b.coverUrl ?? null,
        hours: b.hours ?? null,
        social_links: b.socialLinks ?? null,
        owner_id: uid,
        is_claimed: true,
        source: "user_submitted",
        status: isAdminSubmitter ? "approved" : "pending",
      };
      const { data, error } = await supabase.from("businesses").insert(insert).select(BUSINESS_SELECT).single();
      throwSb(error);
      await syncHighLevel({ ...b, source: "user_submitted" });
      void notifyHighLevel("listing_submitted", { ...b, source: "user_submitted" });
      return mapBusiness(data);
    }

    if (id && !sub) {
      // GET /api/businesses/:id
      if (method === "GET") {
        const numeric = /^\d+$/.test(id);
        let q = supabase.from("businesses").select(BUSINESS_SELECT);
        q = numeric ? q.eq("id", Number(id)) : q.eq("slug", id);
        const { data, error } = await q.maybeSingle();
        throwSb(error);
        if (!data) {
          const e = new Error("Business not found") as Error & { status?: number };
          e.status = 404;
          throw e;
        }
        return mapBusiness(data);
      }
      // PUT /api/businesses/:id (owner update)
      if (method === "PUT" || method === "PATCH") {
        await requireUserId();
        const b = (body ?? {}) as any;
        const upd: any = {};
        const m: Record<string, string> = {
          name: "name", description: "description", municipality: "municipality",
          address: "address", phone: "phone", email: "email", website: "website",
          logoUrl: "logo_url", coverUrl: "cover_url", categoryId: "category_id",
          hours: "hours", socialLinks: "social_links", specialOffer: "special_offer", slug: "slug",
        };
        for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) upd[col] = b[k];
        const { data, error } = await supabase
          .from("businesses").update(upd).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error);
        return mapBusiness(data);
      }
    }

    // GET /api/businesses/:id/reviews ; POST same
    if (id && sub === "reviews") {
      if (method === "GET") {
        const { data, error } = await supabase
          .from("reviews").select(REVIEW_SELECT).eq("business_id", Number(id))
          .order("created_at", { ascending: false });
        throwSb(error);
        const reviews = (data ?? []).map(mapReview);
        return { reviews, total: reviews.length };
      }
      if (method === "POST") {
        const uid = await requireUserId();
        const b = (body ?? {}) as any;
        const { data, error } = await supabase
          .from("reviews")
          .insert({ business_id: Number(id), user_id: uid, rating: b.rating, title: b.title ?? null, body: b.body ?? null })
          .select(REVIEW_SELECT).single();
        throwSb(error);
        return mapReview(data);
      }
    }

    // GET /api/businesses/:id/similar
    if (id && sub === "similar" && method === "GET") {
      const { data: base } = await supabase.from("businesses").select("category_id").eq("id", Number(id)).maybeSingle();
      let q = supabase.from("businesses").select(BUSINESS_SELECT).eq("status", "approved").neq("id", Number(id)).limit(6);
      if (base?.category_id) q = q.eq("category_id", base.category_id);
      const { data, error } = await q;
      throwSb(error);
      return { businesses: (data ?? []).map(mapBusiness) };
    }

    // POST /api/businesses/:id/claim
    if (id && sub === "claim" && method === "POST") {
      await requireUserId();
      const { data, error } = await supabase.rpc("claim_business", { bid: Number(id) });
      throwSb(error);
      return mapBusiness(Array.isArray(data) ? data[0] : data);
    }

    // POST /api/businesses/:id/inquiry  (public contact form)
    if (id && sub === "inquiry" && method === "POST") {
      const b = (body ?? {}) as any;
      const { name, email, ...rest } = b;
      const { error } = await supabase.from("form_submissions").insert({
        business_id: Number(id),
        sender_name: name,
        sender_email: email,
        data: rest ?? {},
      });
      throwSb(error);
      const { data: inqBiz } = await supabase.from("businesses").select("name, owner_name, owner_contact_email, owner_phone").eq("id", Number(id)).maybeSingle();
      void notifyHighLevel("new_inquiry", { ...bizFromRow(inqBiz), inquiryFrom: name, inquiryMessage: (rest as any)?.message });
      return { success: true };
    }

    // GET /api/businesses/:id/form-config (public)
    if (id && sub === "form-config" && method === "GET") {
      const { data } = await supabase.from("form_configs").select("*").eq("business_id", Number(id)).maybeSingle();
      if (!data) {
        return {
          title: "Send a Message",
          submitButtonText: "Send Message",
          fields: [
            { id: "name", label: "Your Name", type: "text", required: true, enabled: true },
            { id: "email", label: "Your Email", type: "email", required: true, enabled: true },
            { id: "message", label: "Message", type: "textarea", required: true, enabled: true },
          ],
        };
      }
      return { title: data.title, submitButtonText: data.submit_button_text, fields: data.fields ?? [] };
    }
  }

  // ---- my businesses ----
  if (path === "/api/my/businesses" && method === "GET") {
    const uid = await requireUserId();
    const { data, error } = await supabase
      .from("businesses").select(BUSINESS_SELECT).eq("owner_id", uid).order("created_at", { ascending: false });
    throwSb(error);
    const businesses = (data ?? []).map(mapBusiness);
    return { businesses, total: businesses.length, page: 1, limit: businesses.length || 1, totalPages: 1 };
  }

  // ---- dashboard messages / form-config (owner) ----
  if (top === "dashboard" && seg[1] === "businesses") {
    const bid = Number(seg[2]);
    // GET messages
    if (seg[3] === "messages" && !seg[4] && method === "GET") {
      const { data, error } = await supabase
        .from("form_submissions").select("*").eq("business_id", bid).order("created_at", { ascending: false });
      throwSb(error);
      const messages = (data ?? []).map(mapSubmission);
      return { messages, unreadCount: messages.filter((m: any) => !m.isRead).length };
    }
    // PATCH mark read
    if (seg[3] === "messages" && seg[5] === "read" && method === "PATCH") {
      const { error } = await supabase.from("form_submissions").update({ is_read: true }).eq("id", Number(seg[4]));
      throwSb(error);
      return { success: true };
    }
    // DELETE message
    if (seg[3] === "messages" && seg[4] && method === "DELETE") {
      const { error } = await supabase.from("form_submissions").delete().eq("id", Number(seg[4]));
      throwSb(error);
      return { success: true };
    }
    // GET/PUT form-config
    if (seg[3] === "form-config") {
      if (method === "GET") {
        const { data } = await supabase.from("form_configs").select("*").eq("business_id", bid).maybeSingle();
        if (!data) return { title: "Send a Message", submitButtonText: "Send Message", fields: [] };
        return { title: data.title, submitButtonText: data.submit_button_text, fields: data.fields ?? [] };
      }
      if (method === "PUT" || method === "PATCH") {
        const b = (body ?? {}) as any;
        const row: any = { business_id: bid };
        if (b.title !== undefined) row.title = b.title;
        if (b.submitButtonText !== undefined) row.submit_button_text = b.submitButtonText;
        if (b.fields !== undefined) row.fields = b.fields;
        const { data, error } = await supabase
          .from("form_configs").upsert(row, { onConflict: "business_id" }).select("*").single();
        throwSb(error);
        return { title: data.title, submitButtonText: data.submit_button_text, fields: data.fields ?? [] };
      }
    }
  }

  // ---- admin ----
  if (top === "admin") {
    // stats
    if (path === "/api/admin/stats" && method === "GET") {
      const counts = async (build: (q: any) => any) => {
        const { count } = await build(supabase.from("businesses").select("id", { count: "exact", head: true }));
        return count ?? 0;
      };
      const totalBusinesses = await counts((q) => q);
      const pendingBusinesses = await counts((q) => q.eq("status", "pending"));
      const approvedBusinesses = await counts((q) => q.eq("status", "approved"));
      const { count: totalReviews } = await supabase.from("reviews").select("id", { count: "exact", head: true });
      const { count: totalUsers } = await supabase.from("users").select("id", { count: "exact", head: true });
      const { data: ratings } = await supabase.from("businesses").select("average_rating").gt("review_count", 0);
      const avgRating = ratings && ratings.length
        ? ratings.reduce((s: number, r: any) => s + (r.average_rating ?? 0), 0) / ratings.length
        : 0;
      return {
        totalBusinesses, pendingBusinesses, approvedBusinesses,
        totalReviews: totalReviews ?? 0, totalUsers: totalUsers ?? 0, avgRating,
      };
    }

    // businesses list (all statuses)
    if (seg[1] === "businesses") {
      const id = seg[2];
      const action = seg[3];
      if (!id && method === "GET") {
        const page = Number(query.page ?? 1) || 1;
        const limit = Number(query.limit ?? 20) || 20;
        const from = (page - 1) * limit;
        let q = supabase.from("businesses").select(BUSINESS_SELECT, { count: "exact" });
        if (query.status && query.status !== "all") q = q.eq("status", String(query.status));
        q = q.order("created_at", { ascending: false }).range(from, from + limit - 1);
        const { data, count, error } = await q;
        throwSb(error);
        const total = count ?? 0;
        return { businesses: (data ?? []).map(mapBusiness), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
      }
      if (id && action === "approve" && method === "POST") {
        const { data, error } = await supabase.from("businesses").update({ status: "approved" }).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error);
        void notifyHighLevel("listing_approved", bizFromRow(data));
        return mapBusiness(data);
      }
      if (id && action === "reject" && method === "POST") {
        const { data, error } = await supabase.from("businesses").update({ status: "rejected" }).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error);
        void notifyHighLevel("listing_rejected", bizFromRow(data));
        return mapBusiness(data);
      }
      if (id && action === "feature" && method === "POST") {
        const { data: cur } = await supabase.from("businesses").select("featured").eq("id", Number(id)).maybeSingle();
        const { data, error } = await supabase.from("businesses").update({ featured: !cur?.featured }).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error); return mapBusiness(data);
      }
      if (id && !action && (method === "PATCH" || method === "PUT")) {
        const b = (body ?? {}) as any;
        const upd: any = {};
        const m: Record<string, string> = {
          name: "name", description: "description", municipality: "municipality", address: "address",
          phone: "phone", email: "email", website: "website", logoUrl: "logo_url", coverUrl: "cover_url",
          categoryId: "category_id", status: "status", featured: "featured", isClaimed: "is_claimed",
        };
        for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) upd[col] = b[k];
        const { data, error } = await supabase.from("businesses").update(upd).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error); return mapBusiness(data);
      }
      if (id && !action && method === "DELETE") {
        const { error } = await supabase.from("businesses").delete().eq("id", Number(id));
        throwSb(error); return { success: true };
      }
    }

    // reviews
    if (seg[1] === "reviews") {
      const id = seg[2];
      if (!id && method === "GET") {
        const page = Number(query.page ?? 1) || 1;
        const limit = Number(query.limit ?? 50) || 50;
        const from = (page - 1) * limit;
        const { data, count, error } = await supabase
          .from("reviews").select(REVIEW_SELECT, { count: "exact" }).order("created_at", { ascending: false }).range(from, from + limit - 1);
        throwSb(error);
        return { reviews: (data ?? []).map(mapReview), total: count ?? 0 };
      }
      if (id && method === "DELETE") {
        const { error } = await supabase.from("reviews").delete().eq("id", Number(id));
        throwSb(error); return { success: true };
      }
    }

    // users
    if (seg[1] === "users") {
      const id = seg[2];
      const action = seg[3];
      if (!id && method === "GET") {
        const page = Number(query.page ?? 1) || 1;
        const limit = Number(query.limit ?? 50) || 50;
        const from = (page - 1) * limit;
        const { data, count, error } = await supabase
          .from("users").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + limit - 1);
        throwSb(error);
        return { users: (data ?? []).map(mapUser), total: count ?? 0 };
      }
      if (id && action === "role" && (method === "PATCH" || method === "PUT")) {
        const b = (body ?? {}) as any;
        const { data, error } = await supabase.from("users").update({ role: b.role }).eq("id", id).select("*").single();
        throwSb(error); return mapUser(data);
      }
      if (id && !action && (method === "PATCH" || method === "PUT")) {
        const b = (body ?? {}) as any;
        const upd: any = {};
        if (b.firstName !== undefined) upd.first_name = b.firstName;
        if (b.lastName !== undefined) upd.last_name = b.lastName;
        if (b.role !== undefined) upd.role = b.role;
        const { data, error } = await supabase.from("users").update(upd).eq("id", id).select("*").single();
        throwSb(error); return mapUser(data);
      }
      if (method === "POST") throw new NotImplementedError("Creating users from the admin panel");
      if (id && !action && method === "DELETE") throw new NotImplementedError("Deleting auth users from the admin panel");
    }

    // leads (unclaimed listings added by reps) = businesses with source 'spotlight_rep'
    if (seg[1] === "leads") {
      const id = seg[2];
      const mapLead = (row: any) => ({ ...mapBusiness(row), source: "spotlight_rep", addedByRepId: row.added_by_rep_id ?? null, addedByRepName: row.added_by_rep_name ?? null });
      // POST /api/admin/leads/import — bulk import scraped records as unclaimed listings
      if (id === "import" && method === "POST") {
        const uid = await requireUserId();
        const records: any[] = Array.isArray((body as any)?.records) ? (body as any).records : [];
        const { data: cats } = await supabase.from("categories").select("id, name, slug");
        const catList = (cats ?? []) as { id: number; name: string; slug: string }[];
        const matchCategory = (c?: string): number | null => {
          if (!c) return null;
          const q = c.toLowerCase().trim();
          const hit =
            catList.find((x) => x.name.toLowerCase() === q || x.slug.toLowerCase() === q) ||
            catList.find((x) => q.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(q));
          return hit ? hit.id : null;
        };
        const { data: existing } = await supabase.from("businesses").select("name");
        const seen = new Set((existing ?? []).map((b: any) => String(b.name).trim().toLowerCase()));
        let imported = 0;
        let skipped = 0;
        const duplicates: string[] = [];
        const rows: any[] = [];
        for (const r of records) {
          const name = String(r?.title ?? r?.name ?? "").trim();
          if (!name) { skipped++; continue; }
          const key = name.toLowerCase();
          if (seen.has(key)) { duplicates.push(name); skipped++; continue; }
          seen.add(key);
          const email = Array.isArray(r?.email) ? (r.email[0] ?? null) : (r?.email ?? null);
          rows.push({
            name,
            slug: slugify(name),
            description: String(r?.description ?? ""),
            category_id: matchCategory(r?.category),
            municipality: extractMunicipality(r?.address),
            address: r?.address ?? null,
            phone: r?.phone ?? null,
            email,
            website: r?.website ? String(r.website) : null,
            cover_url: r?.thumbnail ?? null,
            owner_id: null,
            source: "spotlight_rep",
            is_claimed: false,
            status: "approved",
            added_by_rep_id: uid,
            review_count: typeof r?.review_count === "number" ? r.review_count : 0,
            average_rating: typeof r?.review_rating === "number" ? r.review_rating : 0,
          });
          imported++;
        }
        if (rows.length) {
          const { error } = await supabase.from("businesses").insert(rows);
          throwSb(error);
          for (const row of rows) {
            void syncHighLevel({ name: row.name, email: row.email, phone: row.phone, municipality: row.municipality, address: row.address, source: "spotlight_rep" });
          }
        }
        return { imported, skipped, duplicates };
      }
      if (id === "gmb-import" && method === "POST") {
        await requireUserId();
        const { data: fnData, error: fnErr } = await supabase.functions.invoke("places", {
          body: { action: "import", url: (body as any)?.url },
        });
        if (fnErr) throw new Error(fnErr.message || "GMB import failed");
        if ((fnData as any)?.error) throw new Error((fnData as any).error);
        return fnData;
      }
      if (!id && method === "GET") {
        const { data, error } = await supabase.from("businesses").select(BUSINESS_SELECT).eq("source", "spotlight_rep").order("created_at", { ascending: false });
        throwSb(error);
        return { leads: (data ?? []).map(mapLead), total: (data ?? []).length };
      }
      if (!id && method === "POST") {
        const uid = await requireUserId();
        const b = (body ?? {}) as any;
        const insert = {
          name: b.name, slug: slugify(b.name ?? "business"), description: b.description ?? "",
          category_id: b.categoryId ?? null, municipality: b.municipality, address: b.address ?? null,
          phone: b.phone ?? null, email: b.email ?? null, website: b.website ?? null,
          logo_url: b.logoUrl ?? null, cover_url: b.coverUrl ?? null,
          source: "spotlight_rep", is_claimed: false, status: "approved", added_by_rep_id: uid,
        };
        const { data, error } = await supabase.from("businesses").insert(insert).select(BUSINESS_SELECT).single();
        throwSb(error);
        await syncHighLevel({ ...b, source: "spotlight_rep" });
        return mapLead(data);
      }
      if (id && (method === "PATCH" || method === "PUT")) {
        const b = (body ?? {}) as any;
        const upd: any = {};
        const m: Record<string, string> = { name: "name", description: "description", municipality: "municipality", address: "address", phone: "phone", email: "email", website: "website", logoUrl: "logo_url", coverUrl: "cover_url", categoryId: "category_id", status: "status" };
        for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) upd[col] = b[k];
        const { data, error } = await supabase.from("businesses").update(upd).eq("id", Number(id)).select(BUSINESS_SELECT).single();
        throwSb(error); return mapLead(data);
      }
      if (id && method === "DELETE") {
        const { error } = await supabase.from("businesses").delete().eq("id", Number(id));
        throwSb(error); return { success: true };
      }
    }

    // team management — deferred
    if (seg[1] === "team") {
      const tid = seg[2];
      if (!tid && method === "GET") {
        const { data: members, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
        throwSb(error);
        const list = (members ?? []) as any[];
        const userIds = list.map((m) => m.user_id);
        const { data: users } = userIds.length ? await supabase.from("users").select("*").in("id", userIds) : { data: [] as any[] };
        const umap: Record<string, any> = {};
        (users ?? []).forEach((u: any) => { umap[u.id] = u; });
        const { data: biz } = userIds.length ? await supabase.from("businesses").select("added_by_rep_id").in("added_by_rep_id", userIds) : { data: [] as any[] };
        const counts: Record<string, number> = {};
        (biz ?? []).forEach((x: any) => { if (x.added_by_rep_id) counts[x.added_by_rep_id] = (counts[x.added_by_rep_id] || 0) + 1; });
        return { members: list.map((m) => mapTeamMember(m, umap[m.user_id], counts[m.user_id] || 0)), total: list.length };
      }
      if (!tid && method === "POST") {
        const uid = await requireUserId();
        const b = (body ?? {}) as any;
        const { data, error } = await supabase.from("team_members").insert({
          user_id: b.userId, type: b.type ?? "team_member", permissions: b.permissions ?? [], notes: b.notes ?? null, invited_by: uid, status: "active",
        }).select("*").single();
        throwSb(error);
        const { data: u } = await supabase.from("users").select("*").eq("id", data.user_id).maybeSingle();
        return mapTeamMember(data, u, 0);
      }
      if (tid && (method === "PATCH" || method === "PUT")) {
        const b = (body ?? {}) as any;
        const upd: any = {};
        if (b.type !== undefined) upd.type = b.type;
        if (b.permissions !== undefined) upd.permissions = b.permissions;
        if (b.notes !== undefined) upd.notes = b.notes;
        if (b.status !== undefined) upd.status = b.status;
        const { data, error } = await supabase.from("team_members").update(upd).eq("id", Number(tid)).select("*").single();
        throwSb(error);
        const { data: u } = await supabase.from("users").select("*").eq("id", data.user_id).maybeSingle();
        return mapTeamMember(data, u, 0);
      }
      if (tid && method === "DELETE") {
        const { error } = await supabase.from("team_members").delete().eq("id", Number(tid));
        throwSb(error);
        return { success: true };
      }
    }
  }

  // ---- server-only features (deferred) ----
  if (top === "openai") throw new NotImplementedError("The AI assistant and image generator");
  if (top === "storage") throw new NotImplementedError("Image uploads");
  if (top === "team") {
    const uid = await requireUserId();
    const sub = seg[1];
    if (sub === "me" && method === "GET") {
      const { data } = await supabase.from("team_members").select("*").eq("user_id", uid).maybeSingle();
      if (!data) { const e = new Error("You are not a team member") as Error & { status?: number }; e.status = 403; throw e; }
      const { data: u } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
      return mapTeamMember(data, u, 0);
    }
    if (sub === "stats" && method === "GET") {
      const { data: member } = await supabase.from("team_members").select("*").eq("user_id", uid).maybeSingle();
      const { data: biz } = await supabase.from("businesses").select("status, is_claimed").eq("added_by_rep_id", uid);
      const list = (biz ?? []) as any[];
      return {
        totalAdded: list.length,
        approved: list.filter((b) => b.status === "approved").length,
        pending: list.filter((b) => b.status === "pending").length,
        claimed: list.filter((b) => b.is_claimed).length,
        unclaimed: list.filter((b) => !b.is_claimed).length,
        permissions: member?.permissions ?? [],
        type: member?.type ?? "team_member",
      };
    }
    if (sub === "my-submissions" && method === "GET") {
      const { data, error } = await supabase.from("businesses").select(BUSINESS_SELECT).eq("added_by_rep_id", uid).order("created_at", { ascending: false });
      throwSb(error);
      return { businesses: (data ?? []).map(mapBusiness), total: (data ?? []).length };
    }
    if (sub === "pending-reviews" && method === "GET") {
      const { data, error } = await supabase.from("businesses").select(BUSINESS_SELECT).eq("status", "pending").order("created_at", { ascending: false });
      throwSb(error);
      return { businesses: (data ?? []).map(mapBusiness), total: (data ?? []).length };
    }
    if (sub === "businesses") {
      const tbId = seg[2];
      const tbAction = seg[3];
      if (!tbId && method === "POST") {
        const b = (body ?? {}) as any;
        const insert = {
          name: b.name, slug: slugify(b.name ?? "business"), description: b.description ?? "",
          category_id: b.categoryId ?? null, municipality: b.municipality, address: b.address ?? null,
          phone: b.phone ?? null, email: b.email ?? null, website: b.website ?? null,
          logo_url: b.logoUrl ?? null, cover_url: b.coverUrl ?? null,
          source: "spotlight_rep", is_claimed: false, status: "approved", added_by_rep_id: uid,
        };
        const { data, error } = await supabase.from("businesses").insert(insert).select(BUSINESS_SELECT).single();
        throwSb(error);
        await syncHighLevel({ ...b, source: "spotlight_rep" });
        return mapBusiness(data);
      }
      if (tbId && tbAction === "approve" && method === "POST") {
        const { data, error } = await supabase.from("businesses").update({ status: "approved" }).eq("id", Number(tbId)).select(BUSINESS_SELECT).single();
        throwSb(error);
        void notifyHighLevel("listing_approved", bizFromRow(data));
        return mapBusiness(data);
      }
      if (tbId && tbAction === "reject" && method === "POST") {
        const { data, error } = await supabase.from("businesses").update({ status: "rejected" }).eq("id", Number(tbId)).select(BUSINESS_SELECT).single();
        throwSb(error);
        void notifyHighLevel("listing_rejected", bizFromRow(data));
        return mapBusiness(data);
      }
      if (tbId && tbAction === "verify" && method === "POST") {
        const { data, error } = await supabase.from("businesses").update({ status: "approved" }).eq("id", Number(tbId)).select(BUSINESS_SELECT).single();
        throwSb(error);
        return mapBusiness(data);
      }
    }
  }

  const err = new Error(`No Supabase route for ${method} ${path}`) as Error & { status?: number };
  err.status = 404;
  throw err;
}

setApiHandler(handle);

export {};
