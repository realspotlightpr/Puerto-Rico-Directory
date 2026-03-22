import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, reviewsTable, usersTable, categoriesTable } from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

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
    const [totalB, pendingB, approvedB, totalR, totalU] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.status, "pending")).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.status, "approved")).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).then(r => r[0]?.count ?? 0),
    ]);

    res.json({
      totalBusinesses: totalB,
      pendingBusinesses: pendingB,
      approvedBusinesses: approvedB,
      totalReviews: totalR,
      totalUsers: totalU,
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

export default router;
