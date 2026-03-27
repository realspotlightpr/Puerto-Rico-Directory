import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { businessesTable, reviewsTable, usersTable, categoriesTable, teamMembersTable, adminImpersonationSessions, sliderSettingsTable } from "@workspace/db/schema";
import { eq, desc, sql, and, or, ilike, gt } from "drizzle-orm";
import { sendWelcomeNewUserEmail, sendPasswordResetEmail } from "../lib/email";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://kfwyvzdeitmidkgkyjwb.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
}) : null;

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}

const router: IRouter = Router();

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

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

router.delete("/admin/businesses/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const existing = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(reviewsTable).where(eq(reviewsTable.businessId, id));
      await tx.delete(businessesTable).where(eq(businessesTable.id, id));
    });

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete business" });
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
      email: u.email,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImage: u.profileImageUrl,
      role: u.role ?? "user",
      emailVerified: u.emailVerified ?? false,
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

router.post("/admin/users/:id/send-password-reset", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = req.params.id;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || !user.email) {
      res.status(404).json({ error: "User not found or has no email" });
      return;
    }

    const tempPassword = generateTempPassword();
    const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || "User";

    // Update Supabase password
    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: {
          ...(user.firstName && { first_name: user.firstName }),
          ...(user.lastName && { last_name: user.lastName }),
        },
      });

      if (updateError) {
        req.log.error({ updateError }, "Failed to update Supabase password");
        res.status(500).json({ error: "Failed to update password in authentication system" });
        return;
      }
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, userName, tempPassword);
    } catch (emailErr) {
      req.log.error({ emailErr }, "Failed to send password reset email");
      // Don't fail the request if email fails
    }

    res.json({
      message: "Password reset email sent successfully",
      email: user.email,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to send password reset" });
  }
});

router.delete("/admin/users/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = req.params.id;

    // Check if user exists in our DB
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent admins from deleting themselves
    if (userId === req.user.id) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    await db.transaction(async (tx) => {
      // 1. Delete impersonation sessions (has FK constraints to usersTable)
      await tx.delete(adminImpersonationSessions)
        .where(
          or(
            eq(adminImpersonationSessions.adminId, userId),
            eq(adminImpersonationSessions.impersonatedUserId, userId)
          )
        );

      // 2. Remove team membership if any
      await tx.delete(teamMembersTable).where(eq(teamMembersTable.userId, userId));

      // 3. Mark businesses as unclaimed (ownerId is notNull, so we can't null it — just unclaim)
      await tx.update(businessesTable)
        .set({ isClaimed: false })
        .where(eq(businessesTable.ownerId, userId));

      // 4. Delete the user from our database
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    // 5. Delete from Supabase Auth (after local DB deletion succeeds)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        req.log.info({ userId }, "User deleted from Supabase Auth");
      } catch (supabaseErr: any) {
        req.log.warn({ userId, error: supabaseErr.message }, "Deleted from local DB but failed to delete from Supabase Auth");
      }
    }

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete user" });
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

const PR_MUNICIPALITIES = [
  "Adjuntas", "Aguada", "Aguadilla", "Aguas Buenas", "Aibonito", "Añasco",
  "Arecibo", "Arroyo", "Barceloneta", "Barranquitas", "Bayamón", "Cabo Rojo",
  "Caguas", "Camuy", "Canóvanas", "Carolina", "Cataño", "Cayey", "Ceiba",
  "Ciales", "Cidra", "Coamo", "Comerío", "Corozal", "Culebra", "Dorado",
  "Fajardo", "Florida", "Guánica", "Guayama", "Guayanilla", "Guaynabo",
  "Gurabo", "Hatillo", "Hormigueros", "Humacao", "Isabela", "Jayuya",
  "Juana Díaz", "Juncos", "Lajas", "Lares", "Las Marías", "Las Piedras",
  "Loíza", "Luquillo", "Manatí", "Maricao", "Maunabo", "Mayagüez", "Moca",
  "Morovis", "Naguabo", "Naranjito", "Orocovis", "Patillas", "Peñuelas",
  "Ponce", "Quebradillas", "Rincón", "Río Grande", "Sabana Grande", "Salinas",
  "San Germán", "San Juan", "San Lorenzo", "San Sebastián", "Santa Isabel",
  "Toa Alta", "Toa Baja", "Trujillo Alto", "Utuado", "Vega Alta", "Vega Baja",
  "Vieques", "Villalba", "Yabucoa", "Yauco",
];

function detectMunicipality(address: string): string {
  const normalized = address.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const m of PR_MUNICIPALITIES) {
    const mn = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(mn)) return m;
  }
  return "San Juan";
}

router.post("/admin/leads/import", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: "records array is required and must not be empty" });
      return;
    }

    const repId = req.user!.id;
    const repName = `${req.user!.firstName ?? ""} ${req.user!.lastName ?? ""}`.trim() || req.user!.username || "Admin";

    let imported = 0;
    let skipped = 0;
    const skippedNames: string[] = [];

    const limitedRecords = records.slice(0, 500);

    for (const record of limitedRecords) {
      const name = (record.title || record.name || "").trim();
      if (!name) { skipped++; continue; }

      const address = (record.address || "").trim();
      const municipality = detectMunicipality(address);

      const rawEmail = record.email;
      const email = Array.isArray(rawEmail)
        ? (rawEmail[0] || null)
        : (typeof rawEmail === "string" ? rawEmail || null : null);

      const description = (record.description || "").trim() ||
        `${name} is a business located in ${municipality}, Puerto Rico.`;

      const website = record.website || null;
      const phone = record.phone || null;
      const logoUrl = record.thumbnail || null;

      const existing = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .where(eq(businessesTable.name, name))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        skippedNames.push(name);
        continue;
      }

      let slug = generateSlug(name);
      const existingSlug = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .where(eq(businessesTable.slug, slug))
        .limit(1);
      if (existingSlug.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

      try {
        await db.insert(businessesTable).values({
          name,
          slug,
          description,
          municipality,
          address: address || null,
          phone,
          email,
          website,
          logoUrl,
          status: "approved",
          isClaimed: false,
          source: "spotlight_rep",
          addedByRepId: repId,
          addedByRepName: repName,
          ownerId: "__spotlight_rep__",
          ownerName: repName,
        });
        imported++;
      } catch {
        skipped++;
        skippedNames.push(name);
      }
    }

    res.json({
      imported,
      skipped,
      duplicates: skippedNames.slice(0, 20),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to import leads" });
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

// ── GMB (Google My Business) Import ───────────────────────────────────────────

/**
 * Extract a Google Place ID or search query from various GMB URL formats:
 * - maps.google.com/maps?place_id=...
 * - www.google.com/maps/place/<business-name>/<coords>
 * - maps.app.goo.gl/... (short links with place_id in params or data attribute)
 */
async function resolvePlaceId(urlInput: string): Promise<string | null> {
  const trimmed = urlInput.trim();
  
  try {
    // Normalize to full URL if it's just a path
    let urlStr = trimmed;
    if (!urlStr.includes("://")) {
      urlStr = "https://" + urlStr;
    }
    
    const u = new URL(urlStr);

    // Try direct place_id parameter first
    if (u.searchParams.get("place_id")) {
      return u.searchParams.get("place_id");
    }

    // Try cid parameter (sometimes used instead of place_id)
    if (u.searchParams.get("cid")) {
      return u.searchParams.get("cid");
    }

    // Try to extract business name from /maps/place/<name>/<coords>
    // URL format: https://www.google.com/maps/place/Restaurant+Name/@lat,lng,z/data=...
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch) {
      const encoded = placeMatch[1];
      const decoded = decodeURIComponent(encoded)
        .replace(/\+/g, " ")
        .replace(/%20/g, " ")
        .trim();
      if (decoded.length > 2) {
        return `text:${decoded}`;
      }
    }

    // If this is a short link (goo.gl or maps.app.goo.gl), we'd need to follow redirects
    // For now, try treating the whole URL as a search query
    if (trimmed.length > 5) {
      return `text:${trimmed}`;
    }
  } catch {
    // Invalid URL format — try as plain text search
    if (trimmed.length > 2) {
      return `text:${trimmed}`;
    }
  }
  return null;
}

router.post("/admin/leads/gmb-import", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Google Maps API key not configured" });
    return;
  }

  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    // Puerto Rico center lat/lng and radius for biased search
    const PR_LAT = 18.2208;
    const PR_LNG = -66.5901;
    const PR_RADIUS = 120000; // 120km covers whole island

    let lastGoogleStatus = "UNKNOWN";

    // Search strictly within Puerto Rico (120km radius from PR center)
    async function textSearch(query: string): Promise<string | null> {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " Puerto Rico")}&location=${PR_LAT},${PR_LNG}&radius=${PR_RADIUS}&key=${apiKey}`;
      const r = await fetch(searchUrl);
      const d = await r.json() as any;
      lastGoogleStatus = d.status;
      req.log.info({ status: d.status, count: d.results?.length, query }, "GMB text search (Puerto Rico only)");

      // Validate results are actually in Puerto Rico
      const prResult = (d.results ?? []).find((result: any) => {
        const addr: string = result.formatted_address ?? result.vicinity ?? "";
        return addr.includes("Puerto Rico") || addr.includes(", PR ");
      });

      return prResult?.place_id ?? null;
    }

    // ── 1. Resolve place ID ──────────────────────────────────────────────────
    let placeId: string | null = null;
    const resolved = await resolvePlaceId(url);
    req.log.info({ resolved, url }, "GMB resolvePlaceId result");

    if (resolved && resolved.startsWith("text:")) {
      placeId = await textSearch(resolved.slice(5));
    } else if (resolved) {
      placeId = resolved;
    }

    // If still no place_id, try text search with the raw URL
    if (!placeId) {
      placeId = await textSearch(url);
    }

    if (!placeId) {
      const hint = lastGoogleStatus === "REQUEST_DENIED"
        ? "Google Places API access was denied. Make sure the Places API is enabled for your API key in Google Cloud Console."
        : lastGoogleStatus === "ZERO_RESULTS" || lastGoogleStatus === "OK"
          ? "No Puerto Rico business was found for that link. Make sure the business is listed on Google Maps in Puerto Rico, then paste the link from the Google Maps 'Share' button."
          : `No Puerto Rico business found (Google status: ${lastGoogleStatus}). Paste a direct Google Maps link for a Puerto Rico business.`;
      res.status(422).json({ error: hint });
      return;
    }

    // ── 2. Fetch Place Details ────────────────────────────────────────────────
    const fields = [
      "place_id", "name", "formatted_address", "international_phone_number",
      "website", "business_status", "editorial_summary",
      "opening_hours", "photos", "url",
      "rating", "user_ratings_total",
      "types", "vicinity",
      // social media / other data not directly available via basic Places API
    ].join(",");

    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${encodeURIComponent(fields)}&key=${apiKey}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json() as any;

    if (detailData.status !== "OK") {
      res.status(422).json({ error: `Google Places API error: ${detailData.status}` });
      return;
    }

    const place = detailData.result;

    // ── Puerto Rico validation ─────────────────────────────────────────────
    const placeAddress: string = place.formatted_address ?? place.vicinity ?? "";
    const isInPuertoRico = placeAddress.includes("Puerto Rico") || placeAddress.includes(", PR ");
    if (!isInPuertoRico) {
      res.status(422).json({ error: "Only Puerto Rico businesses can be imported. The business found at that link does not appear to be located in Puerto Rico." });
      return;
    }

    // ── 3. Resolve photo URLs (top 3) ────────────────────────────────────────
    const photoRefs: string[] = (place.photos ?? []).slice(0, 3).map((p: any) => p.photo_reference);
    const photoUrls = photoRefs.map(
      ref => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${ref}&key=${apiKey}`
    );

    // First photo as logo, second as cover if available
    const logoUrl = photoUrls[0] ?? null;
    const coverUrl = photoUrls[1] ?? null;
    const extraPhotos = photoUrls.slice(2);

    // ── 4. Detect municipality ─────────────────────────────────────────────
    const address = place.formatted_address ?? place.vicinity ?? "";
    const municipality = detectMunicipality(address);

    // ── 5. Build description ───────────────────────────────────────────────
    const description = place.editorial_summary?.overview
      ?? `${place.name} is located at ${address}.`;

    // ── 6. Parse hours ────────────────────────────────────────────────────
    let hours: Record<string, string> | null = null;
    if (place.opening_hours?.weekday_text) {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      hours = {};
      for (const line of place.opening_hours.weekday_text as string[]) {
        for (const day of days) {
          if (line.startsWith(day)) {
            const timepart = line.slice(day.length + 2).trim();
            hours[day.slice(0, 3)] = timepart;
          }
        }
      }
    }

    // ── 7. Respond with preview payload ──────────────────────────────────
    res.json({
      placeId,
      name: place.name ?? "",
      address,
      municipality,
      phone: place.international_phone_number ?? null,
      website: place.website ?? null,
      description,
      logoUrl,
      coverUrl,
      extraPhotos,
      hours,
      mapsUrl: place.url ?? url,
      rating: place.rating ?? null,
      reviewCount: place.user_ratings_total ?? null,
      types: place.types ?? [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch business data from Google Maps" });
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
// Slider Settings Routes (public read, admin write)

router.get("/slider-settings", async (req, res) => {
  try {
    const settings = await db
      .select()
      .from(sliderSettingsTable)
      .orderBy(sliderSettingsTable.sortOrder);
    res.json({ sliders: settings });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch slider settings" });
  }
});

router.get("/admin/slider-settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const settings = await db
      .select()
      .from(sliderSettingsTable)
      .orderBy(sliderSettingsTable.sortOrder);
    res.json({ sliders: settings });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch slider settings" });
  }
});

router.post("/admin/slider-settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { imageUrl, city, region, sortOrder } = req.body;

    if (!imageUrl || !city || !region) {
      res.status(400).json({ error: "imageUrl, city, and region are required" });
      return;
    }

    const [created] = await db
      .insert(sliderSettingsTable)
      .values({ imageUrl, city, region, sortOrder: sortOrder ?? 0 })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create slider setting" });
  }
});

router.patch("/admin/slider-settings/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);
    const { imageUrl, city, region, sortOrder } = req.body;

    const updateData: Record<string, any> = {};
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (city) updateData.city = city;
    if (region) updateData.region = region;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(sliderSettingsTable)
      .set(updateData)
      .where(eq(sliderSettingsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Slider setting not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update slider setting" });
  }
});

router.delete("/admin/slider-settings/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);

    const [deleted] = await db
      .delete(sliderSettingsTable)
      .where(eq(sliderSettingsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Slider setting not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete slider setting" });
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
