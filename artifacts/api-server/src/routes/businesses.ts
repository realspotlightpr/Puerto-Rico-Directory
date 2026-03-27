import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, usersTable, formConfigsTable, formSubmissionsTable } from "@workspace/db/schema";
import { eq, and, ilike, sql, desc, or, ne, isNull } from "drizzle-orm";
import type { FormFieldConfig } from "@workspace/db/schema";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeAndBusinessSubmissionEmail, sendInquiryEmail } from "../lib/email.js";
import crypto from "crypto";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const router: IRouter = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let i = 0;
  while (true) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const existing = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    i++;
  }
}

function buildBusinessResponse(b: any, category?: any, owner?: any) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    categoryId: b.categoryId,
    categoryName: category?.name ?? null,
    municipality: b.municipality,
    address: b.address,
    phone: b.phone,
    email: b.email,
    website: b.website,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
    status: b.status,
    featured: b.featured,
    isClaimed: b.isClaimed,
    averageRating: b.averageRating ?? 0,
    reviewCount: b.reviewCount ?? 0,
    ownerId: b.ownerId,
    ownerName: owner ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.username || "Unknown" : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    hours: b.hours,
    socialLinks: b.socialLinks,
    specialOffer: b.specialOffer ?? null,
    pageViews: b.pageViews ?? 0,
    websiteClicks: b.websiteClicks ?? 0,
    mapsClicks: b.mapsClicks ?? 0,
  };
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}

router.get("/businesses", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const municipality = req.query.municipality as string | undefined;
    const featured = req.query.featured === "true" ? true : undefined;

    const conditions = [eq(businessesTable.status, "approved")];
    if (search) {
      conditions.push(
        or(
          ilike(businessesTable.name, `%${search}%`),
          ilike(businessesTable.description, `%${search}%`)
        )!
      );
    }
    if (municipality) {
      conditions.push(ilike(businessesTable.municipality, municipality));
    }
    if (featured !== undefined) {
      conditions.push(eq(businessesTable.featured, featured));
    }
    if (category) {
      const cat = await db.select().from(categoriesTable).where(
        or(eq(sql`${categoriesTable.id}::text`, category), eq(categoriesTable.slug, category))
      ).limit(1);
      if (cat.length > 0) {
        conditions.push(eq(businessesTable.categoryId, cat[0].id));
      }
    }

    const whereClause = and(...conditions);

    const [total, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessesTable)
        .where(whereClause)
        .then(r => r[0]?.count ?? 0),
      db
        .select()
        .from(businessesTable)
        .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
        .where(whereClause)
        .orderBy(desc(businessesTable.featured), desc(businessesTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const businesses = rows.map(r => buildBusinessResponse(r.businesses, r.categories));

    res.json({
      businesses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

router.get("/businesses/random", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(eq(businessesTable.status, "approved"))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "No businesses found" });
      return;
    }

    res.json(buildBusinessResponse(rows[0].businesses, rows[0].categories));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch random business" });
  }
});

router.get("/businesses/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const numericId = parseInt(param);
    const whereCondition = isNaN(numericId)
      ? eq(businessesTable.slug, param)
      : eq(businessesTable.id, numericId);

    const rows = await db
      .select()
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(whereCondition)
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const b = rows[0];
    const isOwnerOrAdmin = req.isAuthenticated() &&
      (req.user.id === b.businesses.ownerId || req.user.role === "admin");

    if (b.businesses.status !== "approved" && !isOwnerOrAdmin) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    let owner = null;
    try {
      const ownerRow = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, b.businesses.ownerId))
        .limit(1);
      if (ownerRow.length > 0) owner = ownerRow[0];
    } catch { }

    res.json(buildBusinessResponse(b.businesses, b.categories, owner));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch business" });
  }
});

router.post("/businesses", async (req, res) => {
  try {
    const {
      name, description, categoryId, municipality, address, phone, email,
      website, logoUrl, coverUrl, hours, socialLinks,
      ownerName, ownerPhone, ownerContactEmail,
    } = req.body;

    if (!name || !description || !categoryId || !municipality) {
      res.status(400).json({ error: "Missing required fields: name, description, categoryId, municipality" });
      return;
    }

    let ownerId: string;
    let accountCreated = false;

    if (req.isAuthenticated()) {
      ownerId = req.user.id;

      // Upgrade to business_owner if needed
      await db
        .update(usersTable)
        .set({ role: "business_owner" })
        .where(and(eq(usersTable.id, req.user.id), eq(usersTable.role, "user")));
    } else {
      // Guest submission — email is required
      if (!ownerContactEmail) {
        res.status(400).json({ error: "Email is required for guest submissions" });
        return;
      }

      // Check if a user with this email already exists locally
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, ownerContactEmail))
        .limit(1);

      if (existingUser && existingUser.emailVerified) {
        // Verified account already exists — ask them to log in
        res.status(409).json({
          error: "An account with this email already exists. Please log in to submit your business.",
          code: "ACCOUNT_EXISTS",
        });
        return;
      }

      if (existingUser) {
        // Pre-seeded but not yet verified — reuse this account
        ownerId = existingUser.id;

        // Ensure business_owner role
        await db
          .update(usersTable)
          .set({ role: "business_owner" })
          .where(eq(usersTable.id, ownerId));
      } else {
        // Brand-new guest — create a Supabase account and seed locally.
        // Use the SERVICE ROLE key so we:
        //   1. Don't trigger Supabase's own verification email (avoids duplicate / confusing emails)
        //   2. Can generate a real magic-link to embed in our Brevo email
        const tempPassword = generateTempPassword();

        const supabaseAdmin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const firstName = ownerName ? ownerName.split(" ")[0] : null;
        const lastName = ownerName ? ownerName.split(" ").slice(1).join(" ") || null : null;

        // Create the user without triggering Supabase's own email
        const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
          email: ownerContactEmail,
          password: tempPassword,
          email_confirm: false,         // stays unconfirmed until they click our link
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
          },
        });

        if (supabaseError || !supabaseData.user) {
          req.log.error({ supabaseError }, "Supabase admin.createUser failed");
          res.status(500).json({ error: "Failed to create account. Please try again." });
          return;
        }

        ownerId = supabaseData.user.id;

        // Generate a real Supabase verification magic-link to embed in our email
        const siteUrl = process.env.VITE_PUBLIC_URL || "https://spotlightpuertorico.com";
        let verificationLink: string | null = null;
        try {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email: ownerContactEmail,
            options: { redirectTo: `${siteUrl}/dashboard` },
          });
          if (!linkError && linkData?.properties?.action_link) {
            verificationLink = linkData.properties.action_link;
          }
        } catch (linkErr) {
          req.log.warn({ linkErr }, "Could not generate Supabase magic link (non-fatal)");
        }

        // Pre-seed the local user record with the Supabase UUID
        const username = ownerContactEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 30) || `user_${crypto.randomBytes(4).toString("hex")}`;

        await db
          .insert(usersTable)
          .values({
            id: ownerId,
            email: ownerContactEmail,
            firstName,
            lastName,
            username,
            role: "business_owner",
            emailVerified: false,
          })
          .onConflictDoNothing();

        // Send our single welcome email with credentials + the real verification link
        try {
          await sendWelcomeAndBusinessSubmissionEmail(
            ownerContactEmail,
            firstName ?? ownerContactEmail.split("@")[0],
            name,
            tempPassword,
            verificationLink ?? `${siteUrl}/verify-email`,
          );
        } catch (emailErr) {
          req.log.error({ emailErr }, "Failed to send welcome email (non-fatal)");
        }

        accountCreated = true;
      }
    }

    const slug = await uniqueSlug(name);
    const [created] = await db
      .insert(businessesTable)
      .values({
        name,
        slug,
        description,
        categoryId: parseInt(categoryId),
        municipality,
        address,
        phone,
        email,
        website,
        logoUrl,
        coverUrl,
        hours,
        socialLinks,
        status: "pending",
        featured: false,
        ownerId,
        ownerName: ownerName ?? null,
        ownerPhone: ownerPhone ?? null,
        ownerContactEmail: ownerContactEmail ?? null,
      })
      .returning();

    res.status(201).json({
      ...buildBusinessResponse(created),
      accountCreated,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to submit business listing" });
  }
});

router.put("/businesses/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(businessesTable).where(eq(businessesTable.id, id)).limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const b = existing[0];
    if (b.ownerId !== req.user.id && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, hours, socialLinks, slug, specialOffer } = req.body;

    if (specialOffer !== undefined && specialOffer !== null && typeof specialOffer === "string" && specialOffer.length > 160) {
      res.status(400).json({ error: "Special offer must be 160 characters or fewer" });
      return;
    }

    let resolvedSlug = b.slug;
    if (slug !== undefined && slug !== b.slug) {
      const cleaned = slug.trim().toLowerCase();
      if (!isValidSlug(cleaned)) {
        res.status(400).json({ error: "Invalid slug. Use only lowercase letters, numbers, and hyphens (e.g. my-business-name)." });
        return;
      }
      const conflict = await db.select({ id: businessesTable.id }).from(businessesTable)
        .where(eq(businessesTable.slug, cleaned)).limit(1);
      if (conflict.length > 0 && conflict[0].id !== id) {
        res.status(409).json({ error: "This URL is already taken. Please choose a different one." });
        return;
      }
      resolvedSlug = cleaned;
    }

    const [updated] = await db.update(businessesTable)
      .set({
        name: name ?? b.name,
        slug: resolvedSlug,
        description: description ?? b.description,
        categoryId: categoryId ? parseInt(categoryId) : b.categoryId,
        municipality: municipality ?? b.municipality,
        address: address ?? b.address,
        phone: phone ?? b.phone,
        email: email ?? b.email,
        website: website ?? b.website,
        logoUrl: logoUrl ?? b.logoUrl,
        coverUrl: coverUrl ?? b.coverUrl,
        hours: hours ?? b.hours,
        socialLinks: socialLinks ?? b.socialLinks,
        specialOffer: specialOffer !== undefined ? (specialOffer || null) : b.specialOffer,
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, id))
      .returning();

    res.json(buildBusinessResponse(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update business" });
  }
});

router.delete("/businesses/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    await db.delete(businessesTable).where(eq(businessesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete business" });
  }
});

router.post("/businesses/:id/claim", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const businessId = parseInt(req.params.id);

    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId))
      .limit(1);

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    if (business.isClaimed) {
      res.status(400).json({ error: "This business has already been claimed" });
      return;
    }

    // Update the business to be claimed by this user
    const [updated] = await db
      .update(businessesTable)
      .set({ 
        isClaimed: true, 
        ownerId: req.user.id,
        ownerName: req.user.firstName && req.user.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user.username,
      })
      .where(eq(businessesTable.id, businessId))
      .returning();

    // Upgrade user to business_owner role if needed
    await db
      .update(usersTable)
      .set({ role: "business_owner" })
      .where(and(eq(usersTable.id, req.user.id), eq(usersTable.role, "user")));

    // Build response with category info
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, updated.categoryId || 0))
      .limit(1);

    res.json(buildBusinessResponse(updated, category));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim business" });
  }
});

// Inquiry endpoint — sends a message to the business owner and stores in inbox
router.post("/businesses/:id/inquiry", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) {
      res.status(400).json({ error: "Invalid business ID" });
      return;
    }

    const body = req.body as Record<string, string>;
    const name: string = body.name ?? "";
    const email: string = body.email ?? "";
    const message: string = body.message ?? "";

    if (!name || !email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }

    if (name.trim().length < 1 || name.length > 200) {
      res.status(400).json({ error: "name must be between 1 and 200 characters" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId))
      .limit(1);

    if (!business || business.status !== "approved") {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    // Build data payload — all non-empty fields from the body except name/email
    const dataPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string" && v.trim().length > 0) dataPayload[k] = v.trim();
    }

    // Store submission in inbox
    await db.insert(formSubmissionsTable).values({
      businessId,
      senderName: name.trim(),
      senderEmail: email.trim(),
      data: dataPayload,
    });

    // Also send email notification if business has a contact email
    const recipientEmail = business.ownerContactEmail || business.email;
    if (recipientEmail && message) {
      try {
        await sendInquiryEmail(recipientEmail, business.name, name, email, message);
      } catch (emailErr) {
        req.log.warn(emailErr, "Email notification failed but submission stored");
      }
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to send inquiry" });
  }
});

// ── Public: Get form config for a business ────────────────────────────────────
const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { id: "name",    label: "Your Name",    type: "text",     placeholder: "Jane Doe",                required: true,  enabled: true },
  { id: "email",   label: "Email Address", type: "email",   placeholder: "you@example.com",         required: true,  enabled: true },
  { id: "phone",   label: "Phone Number", type: "tel",      placeholder: "(787) 555-0123",           required: false, enabled: false },
  { id: "message", label: "Message",      type: "textarea", placeholder: "How can we help you?",     required: true,  enabled: true },
];

router.get("/businesses/:id/form-config", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) { res.status(400).json({ error: "Invalid business ID" }); return; }

    const [config] = await db.select().from(formConfigsTable).where(eq(formConfigsTable.businessId, businessId)).limit(1);

    res.json({
      title: config?.title ?? "Send a Message",
      submitButtonText: config?.submitButtonText ?? "Send Message",
      fields: config?.fields?.length ? config.fields : DEFAULT_FORM_FIELDS,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch form config" });
  }
});

// ── Dashboard: Get form config (owner) ────────────────────────────────────────
router.get("/dashboard/businesses/:id/form-config", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) { res.status(400).json({ error: "Invalid business ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
    if (!business) { res.status(404).json({ error: "Business not found" }); return; }
    if (business.ownerId !== req.user.id && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const [config] = await db.select().from(formConfigsTable).where(eq(formConfigsTable.businessId, businessId)).limit(1);
    res.json({
      title: config?.title ?? "Send a Message",
      submitButtonText: config?.submitButtonText ?? "Send Message",
      fields: config?.fields?.length ? config.fields : DEFAULT_FORM_FIELDS,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch form config" });
  }
});

// ── Dashboard: Update form config (owner) ────────────────────────────────────
router.put("/dashboard/businesses/:id/form-config", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) { res.status(400).json({ error: "Invalid business ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
    if (!business) { res.status(404).json({ error: "Business not found" }); return; }
    if (business.ownerId !== req.user.id && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const { title, submitButtonText, fields } = req.body as { title?: string; submitButtonText?: string; fields?: FormFieldConfig[] };

    const [existing] = await db.select({ id: formConfigsTable.id }).from(formConfigsTable).where(eq(formConfigsTable.businessId, businessId)).limit(1);

    if (existing) {
      await db.update(formConfigsTable).set({
        title: title ?? "Send a Message",
        submitButtonText: submitButtonText ?? "Send Message",
        fields: fields ?? DEFAULT_FORM_FIELDS,
        updatedAt: new Date(),
      }).where(eq(formConfigsTable.businessId, businessId));
    } else {
      await db.insert(formConfigsTable).values({
        businessId,
        title: title ?? "Send a Message",
        submitButtonText: submitButtonText ?? "Send Message",
        fields: fields ?? DEFAULT_FORM_FIELDS,
      });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update form config" });
  }
});

// ── Dashboard: Get messages inbox (owner) ────────────────────────────────────
router.get("/dashboard/businesses/:id/messages", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) { res.status(400).json({ error: "Invalid business ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
    if (!business) { res.status(404).json({ error: "Business not found" }); return; }
    if (business.ownerId !== req.user.id && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const messages = await db
      .select()
      .from(formSubmissionsTable)
      .where(and(eq(formSubmissionsTable.businessId, businessId), eq(formSubmissionsTable.isArchived, false)))
      .orderBy(desc(formSubmissionsTable.createdAt));

    const unreadCount = messages.filter(m => !m.isRead).length;
    res.json({ messages, unreadCount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ── Dashboard: Mark message as read ────────────────────────────────────────
router.patch("/dashboard/businesses/:id/messages/:msgId/read", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const msgId = parseInt(req.params.msgId);
    if (isNaN(businessId) || isNaN(msgId)) { res.status(400).json({ error: "Invalid ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
    if (!business || (business.ownerId !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.update(formSubmissionsTable)
      .set({ isRead: true })
      .where(and(eq(formSubmissionsTable.id, msgId), eq(formSubmissionsTable.businessId, businessId)));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

// ── Dashboard: Archive (delete) a message ────────────────────────────────────
router.delete("/dashboard/businesses/:id/messages/:msgId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const msgId = parseInt(req.params.msgId);
    if (isNaN(businessId) || isNaN(msgId)) { res.status(400).json({ error: "Invalid ID" }); return; }
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
    if (!business || (business.ownerId !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.delete(formSubmissionsTable)
      .where(and(eq(formSubmissionsTable.id, msgId), eq(formSubmissionsTable.businessId, businessId)));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// Similar businesses (same category or municipality)
router.get("/businesses/:id/similar", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const limit = Math.min(8, parseInt(req.query.limit as string) || 4);

    const [current] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId))
      .limit(1);

    if (!current) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    // Try same category first — use a type-safe accumulator, filled by either query
    const queryBase = () =>
      db
        .select()
        .from(businessesTable)
        .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id));

    type SimilarRow = Awaited<ReturnType<typeof queryBase>>[number];
    let rows: SimilarRow[] = [];
    if (current.categoryId) {
      rows = await db
        .select()
        .from(businessesTable)
        .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
        .where(
          and(
            eq(businessesTable.status, "approved"),
            eq(businessesTable.categoryId, current.categoryId),
            ne(businessesTable.id, businessId)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(limit);
    }

    // Fall back to same municipality if category returned no results
    if (rows.length === 0) {
      rows = await db
        .select()
        .from(businessesTable)
        .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
        .where(
          and(
            eq(businessesTable.status, "approved"),
            eq(businessesTable.municipality, current.municipality),
            ne(businessesTable.id, businessId)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(limit);
    }

    res.json({
      businesses: rows.map(r => buildBusinessResponse(r.businesses, r.categories)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch similar businesses" });
  }
});

// Analytics tracking endpoints
router.post("/businesses/:id/track-page-view", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const [updated] = await db
      .update(businessesTable)
      .set({ pageViews: sql`${businessesTable.pageViews} + 1` })
      .where(eq(businessesTable.id, businessId))
      .returning();
    res.json({ pageViews: updated.pageViews });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to track page view" });
  }
});

router.post("/businesses/:id/track-website-click", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const [updated] = await db
      .update(businessesTable)
      .set({ websiteClicks: sql`${businessesTable.websiteClicks} + 1` })
      .where(eq(businessesTable.id, businessId))
      .returning();
    res.json({ websiteClicks: updated.websiteClicks });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to track website click" });
  }
});

router.post("/businesses/:id/track-maps-click", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const [updated] = await db
      .update(businessesTable)
      .set({ mapsClicks: sql`${businessesTable.mapsClicks} + 1` })
      .where(eq(businessesTable.id, businessId))
      .returning();
    res.json({ mapsClicks: updated.mapsClicks });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to track maps click" });
  }
});

export default router;
