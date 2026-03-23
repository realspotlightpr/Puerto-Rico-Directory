import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, reviewsTable, usersTable, categoriesTable, teamMembersTable, adminImpersonationSessions } from "@workspace/db/schema";
import { eq, desc, sql, and, ilike, gt } from "drizzle-orm";
import { sendWelcomeNewUserEmail } from "../lib/email";

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}

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

router.post("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { email, firstName, lastName, role } = req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }

    const normalizedRole = ["user", "business_owner", "admin"].includes(role ?? "")
      ? (role as "user" | "business_owner" | "admin")
      : "user";

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        role: normalizedRole,
        emailVerified: false,
      })
      .returning();

    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];

    try {
      await sendWelcomeNewUserEmail(email.toLowerCase().trim(), displayName, normalizedRole);
    } catch (emailErr) {
      req.log.warn({ emailErr }, "Failed to send welcome email — user still created");
    }

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/admin/businesses/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, status, featured, isClaimed, slug } = req.body;

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
    if (slug !== undefined) {
      const cleaned = slug.trim().toLowerCase();
      if (!isValidSlug(cleaned)) {
        res.status(400).json({ error: "Invalid slug. Use only lowercase letters, numbers, and hyphens." });
        return;
      }
      const conflict = await db.select({ id: businessesTable.id }).from(businessesTable)
        .where(eq(businessesTable.slug, cleaned)).limit(1);
      if (conflict.length > 0 && conflict[0].id !== id) {
        res.status(409).json({ error: "This URL slug is already taken by another business." });
        return;
      }
      updates.slug = cleaned;
    }

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
    const { firstName, lastName, email, phone, role, emailVerified } = req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (role !== undefined && ["user", "business_owner", "admin"].includes(role)) updates.role = role;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified;

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
      phone: updated.phone,
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

// ── Team Members Management ────────────────────────────────────────────────────

router.get("/admin/team", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const rows = await db
      .select({
        id: teamMembersTable.id,
        userId: teamMembersTable.userId,
        type: teamMembersTable.type,
        permissions: teamMembersTable.permissions,
        invitedBy: teamMembersTable.invitedBy,
        notes: teamMembersTable.notes,
        status: teamMembersTable.status,
        createdAt: teamMembersTable.createdAt,
        updatedAt: teamMembersTable.updatedAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
        userRole: usersTable.role,
      })
      .from(teamMembersTable)
      .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
      .orderBy(desc(teamMembersTable.createdAt));

    const members = rows.map(r => ({
      id: r.id,
      userId: r.userId,
      type: r.type,
      permissions: r.permissions ?? [],
      invitedBy: r.invitedBy,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        username: r.username,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        profileImageUrl: r.profileImageUrl,
        role: r.userRole,
      },
      businessesAdded: 0,
    }));

    const memberIds = members.map(m => m.userId);
    if (memberIds.length > 0) {
      const counts = await db
        .select({ repId: businessesTable.addedByRepId, count: sql<number>`count(*)::int` })
        .from(businessesTable)
        .where(sql`${businessesTable.addedByRepId} = ANY(ARRAY[${sql.raw(memberIds.map(id => `'${id}'`).join(','))}]::text[])`)
        .groupBy(businessesTable.addedByRepId);
      const countMap: Record<string, number> = {};
      for (const c of counts) {
        if (c.repId) countMap[c.repId] = c.count;
      }
      members.forEach(m => { m.businessesAdded = countMap[m.userId] ?? 0; });
    }

    res.json({ members, total: members.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

router.post("/admin/team", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { userId, type = "team_member", permissions = [], notes } = req.body;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, userId)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "User is already a team member" });
      return;
    }

    const [member] = await db.insert(teamMembersTable).values({
      userId,
      type,
      permissions,
      notes: notes ?? null,
      invitedBy: req.user!.id,
      status: "active",
    }).returning();

    res.status(201).json({ ...member, user: user[0] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add team member" });
  }
});

router.patch("/admin/team/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { type, permissions, notes, status } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (type !== undefined) updates.type = type;
    if (permissions !== undefined) updates.permissions = permissions;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(teamMembersTable)
      .set(updates)
      .where(eq(teamMembersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

router.delete("/admin/team/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(teamMembersTable)
      .where(eq(teamMembersTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin Impersonation Routes
// ─────────────────────────────────────────────────────────────────────────────

router.post("/admin/users/:userId/impersonate", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Verify the user exists
    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Create impersonation session (24 hour expiry)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [session] = await db
      .insert(adminImpersonationSessions)
      .values({ adminId, impersonatedUserId: userId, expiresAt })
      .returning();

    res.json({
      sessionId: session.id,
      adminId: session.adminId,
      impersonatedUserId: session.impersonatedUserId,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create impersonation session" });
  }
});

router.post("/admin/impersonate/exit", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    // Verify the session belongs to this admin and delete it
    const [session] = await db
      .select()
      .from(adminImpersonationSessions)
      .where(eq(adminImpersonationSessions.id, sessionId))
      .limit(1);

    if (!session || session.adminId !== req.user.id) {
      res.status(403).json({ error: "Cannot exit this impersonation session" });
      return;
    }

    await db.delete(adminImpersonationSessions).where(eq(adminImpersonationSessions.id, sessionId));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to exit impersonation session" });
  }
});

// Get current impersonation status (if any)
router.get("/admin/impersonate/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const adminId = req.user.id;

    // Find active impersonation session for this admin
    const [session] = await db
      .select()
      .from(adminImpersonationSessions)
      .where(and(eq(adminImpersonationSessions.adminId, adminId), gt(adminImpersonationSessions.expiresAt, new Date())))
      .limit(1);

    if (!session) {
      res.json({ isImpersonating: false });
      return;
    }

    // Get the impersonated user details
    const [impersonatedUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.impersonatedUserId))
      .limit(1);

    res.json({
      isImpersonating: true,
      sessionId: session.id,
      impersonatedUser: impersonatedUser || null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get impersonation status" });
  }
});

export default router;
