import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, reviewsTable, usersTable, categoriesTable } from "@workspace/db/schema";
import { eq, desc, sql, and, ilike } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/admin/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const [totalB, pendingB, approvedB, totalR, totalU, avgRatingResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.status, "pending")).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.status, "approved")).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).then(r => r[0]?.count ?? 0),
      db.select({ avg: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::numeric(3,2)` }).from(reviewsTable).then(r => r[0]?.avg ?? 0),
    ]);

    res.json({
      totalBusinesses: totalB,
      pendingBusinesses: pendingB,
      approvedBusinesses: approvedB,
      totalReviews: totalR,
      totalUsers: totalU,
      avgRating: parseFloat(String(avgRatingResult)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/businesses", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const status = req.query.status as string || "all";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const conditions = status !== "all" && ["pending", "approved", "rejected"].includes(status)
      ? [eq(businessesTable.status, status as "pending" | "approved" | "rejected")]
      : [];

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(whereClause).then(r => r[0]?.count ?? 0),
      db
        .select()
        .from(businessesTable)
        .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
        .where(whereClause)
        .orderBy(desc(businessesTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const businesses = rows.map(r => ({
      id: r.businesses.id,
      name: r.businesses.name,
      slug: r.businesses.slug,
      description: r.businesses.description,
      categoryId: r.businesses.categoryId,
      categoryName: r.categories?.name ?? null,
      municipality: r.businesses.municipality,
      address: r.businesses.address,
      phone: r.businesses.phone,
      email: r.businesses.email,
      website: r.businesses.website,
      logoUrl: r.businesses.logoUrl,
      coverUrl: r.businesses.coverUrl,
      status: r.businesses.status,
      featured: r.businesses.featured,
      averageRating: r.businesses.averageRating ?? 0,
      reviewCount: r.businesses.reviewCount ?? 0,
      ownerId: r.businesses.ownerId,
      ownerName: r.businesses.ownerName ?? null,
      ownerPhone: r.businesses.ownerPhone ?? null,
      ownerContactEmail: r.businesses.ownerContactEmail ?? null,
      createdAt: r.businesses.createdAt,
      updatedAt: r.businesses.updatedAt,
    }));

    res.json({ businesses, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

router.post("/admin/businesses/:id/approve", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(businessesTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

router.post("/admin/businesses/:id/reject", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(businessesTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

router.post("/admin/businesses/:id/feature", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(businessesTable).where(eq(businessesTable.id, id)).limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [updated] = await db.update(businessesTable)
      .set({ featured: !existing[0].featured, updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

router.get("/admin/reviews", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        review: reviewsTable,
        user: {
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          username: usersTable.username,
          profileImageUrl: usersTable.profileImageUrl,
        },
        business: {
          name: businessesTable.name,
          id: businessesTable.id,
        },
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .leftJoin(businessesTable, eq(reviewsTable.businessId, businessesTable.id))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const reviews = rows.map(r => ({
      id: r.review.id,
      businessId: r.review.businessId,
      userId: r.review.userId,
      rating: r.review.rating,
      title: r.review.title,
      body: r.review.body,
      authorName: r.user
        ? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.username || "Anonymous"
        : "Anonymous",
      authorImage: r.user?.profileImageUrl ?? null,
      businessName: r.business?.name ?? null,
      createdAt: r.review.createdAt,
    }));

    res.json({ reviews, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.delete("/admin/reviews/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const reviewRow = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);

    if (reviewRow.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));

    const businessId = reviewRow[0].businessId;
    const avgResult = await db
      .select({
        avg: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::numeric(3,2)`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.businessId, businessId));

    await db.update(businessesTable)
      .set({
        averageRating: parseFloat(String(avgResult[0]?.avg ?? 0)),
        reviewCount: avgResult[0]?.cnt ?? 0,
      })
      .where(eq(businessesTable.id, businessId));

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

router.get("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const [total, users] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).then(r => r[0]?.count ?? 0),
      db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
    ]);

    const userList = users.map(u => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImage: u.profileImageUrl,
      role: u.role ?? "user",
      createdAt: u.createdAt,
    }));

    res.json({ users: userList, total });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/admin/businesses/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, status, featured, isClaimed } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (municipality !== undefined) updates.municipality = municipality;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (website !== undefined) updates.website = website;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    if (status !== undefined && ["pending", "approved", "rejected"].includes(status)) updates.status = status;
    if (featured !== undefined) updates.featured = featured;
    if (isClaimed !== undefined) updates.isClaimed = isClaimed;

    const [updated] = await db.update(businessesTable)
      .set(updates)
      .where(eq(businessesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const categoryRow = updated.categoryId
      ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId)).limit(1)
      : [];

    res.json({
      ...updated,
      categoryName: categoryRow[0]?.name ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update business" });
  }
});

router.patch("/admin/users/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = req.params.id;
    const { firstName, lastName, role } = req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (role !== undefined && ["user", "business_owner", "admin"].includes(role)) updates.role = role;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated.id,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      profileImage: updated.profileImageUrl,
      role: updated.role ?? "user",
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.put("/admin/users/:id/role", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!["user", "business_owner", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const [updated] = await db.update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated.id,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      profileImage: updated.profileImageUrl,
      role: updated.role ?? "user",
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ── Leads (Spotlight Rep Scouted Businesses) ──────────────────────────────────

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

router.get("/admin/leads", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { search } = req.query as { search?: string };

    const rows = await db.select({
      id: businessesTable.id,
      name: businessesTable.name,
      slug: businessesTable.slug,
      description: businessesTable.description,
      categoryId: businessesTable.categoryId,
      categoryName: categoriesTable.name,
      municipality: businessesTable.municipality,
      address: businessesTable.address,
      phone: businessesTable.phone,
      email: businessesTable.email,
      website: businessesTable.website,
      logoUrl: businessesTable.logoUrl,
      coverUrl: businessesTable.coverUrl,
      status: businessesTable.status,
      featured: businessesTable.featured,
      isClaimed: businessesTable.isClaimed,
      source: businessesTable.source,
      addedByRepId: businessesTable.addedByRepId,
      addedByRepName: businessesTable.addedByRepName,
      createdAt: businessesTable.createdAt,
      updatedAt: businessesTable.updatedAt,
    })
    .from(businessesTable)
    .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
    .where(
      search
        ? and(eq(businessesTable.source, "spotlight_rep"), ilike(businessesTable.name, `%${search}%`))
        : eq(businessesTable.source, "spotlight_rep")
    )
    .orderBy(desc(businessesTable.createdAt));

    res.json({ leads: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.post("/admin/leads", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl } = req.body;

    if (!name || !description || !municipality) {
      res.status(400).json({ error: "name, description, and municipality are required" });
      return;
    }

    const repId = req.user!.id;
    const repName = `${req.user!.firstName ?? ""} ${req.user!.lastName ?? ""}`.trim() || req.user!.username;

    let slug = generateSlug(name);
    // Ensure slug is unique
    const existing = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.slug, slug));
    if (existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

    const [lead] = await db.insert(businessesTable).values({
      name,
      slug,
      description,
      categoryId: categoryId ?? null,
      municipality,
      address: address ?? null,
      phone: phone ?? null,
      email: email ?? null,
      website: website ?? null,
      logoUrl: logoUrl ?? null,
      coverUrl: coverUrl ?? null,
      status: "approved",
      isClaimed: false,
      source: "spotlight_rep",
      addedByRepId: repId,
      addedByRepName: repName,
      ownerId: "__spotlight_rep__",
      ownerName: repName,
    }).returning();

    res.status(201).json(lead);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.patch("/admin/leads/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, status } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (municipality !== undefined) updates.municipality = municipality;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (website !== undefined) updates.website = website;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    if (status !== undefined && ["pending", "approved", "rejected"].includes(status)) updates.status = status;

    const [updated] = await db.update(businessesTable)
      .set(updates)
      .where(and(eq(businessesTable.id, id), eq(businessesTable.source, "spotlight_rep")))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.delete("/admin/leads/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);

    const [deleted] = await db.delete(businessesTable)
      .where(and(eq(businessesTable.id, id), eq(businessesTable.source, "spotlight_rep")))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
