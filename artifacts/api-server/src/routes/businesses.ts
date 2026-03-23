import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, usersTable } from "@workspace/db/schema";
import { eq, and, ilike, sql, desc, or } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeAndBusinessSubmissionEmail } from "../lib/email.js";
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
        // Brand-new guest — create a Supabase account and seed locally
        const tempPassword = generateTempPassword();

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!,
        );

        const firstName = ownerName ? ownerName.split(" ")[0] : null;
        const lastName = ownerName ? ownerName.split(" ").slice(1).join(" ") || null : null;

        const { data: supabaseData, error: supabaseError } = await supabase.auth.signUp({
          email: ownerContactEmail,
          password: tempPassword,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (supabaseError || !supabaseData.user) {
          req.log.error({ supabaseError }, "Supabase signUp failed");
          res.status(500).json({ error: "Failed to create account. Please try again." });
          return;
        }

        ownerId = supabaseData.user.id;

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

        // Send the combined welcome + credentials email via Brevo
        try {
          await sendWelcomeAndBusinessSubmissionEmail(
            ownerContactEmail,
            firstName ?? ownerContactEmail.split("@")[0],
            name,
            tempPassword,
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

    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, hours, socialLinks, slug } = req.body;

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
