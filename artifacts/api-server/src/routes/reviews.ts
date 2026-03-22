import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable, businessesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/businesses/:id/reviews", async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const rows = await db
      .select({
        review: reviewsTable,
        user: {
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          username: usersTable.username,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.businessId, businessId))
      .orderBy(desc(reviewsTable.createdAt));

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
      createdAt: r.review.createdAt,
    }));

    res.json({ reviews, total: reviews.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/businesses/:id/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const businessId = parseInt(req.params.id);
    const { rating, title, body } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5" });
      return;
    }

    const business = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId))
      .limit(1);

    if (business.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const [review] = await db.insert(reviewsTable).values({
      businessId,
      userId: req.user.id,
      rating: parseInt(rating),
      title,
      body,
    }).returning();

    const avgResult = await db
      .select({
        avg: sql<number>`avg(${reviewsTable.rating})::numeric(3,2)`,
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

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id))
      .limit(1);

    const u = user[0];
    res.status(201).json({
      id: review.id,
      businessId: review.businessId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      authorName: u
        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "Anonymous"
        : "Anonymous",
      authorImage: u?.profileImageUrl ?? null,
      createdAt: review.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
