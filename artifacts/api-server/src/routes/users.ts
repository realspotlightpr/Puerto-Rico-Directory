import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, reviewsTable, businessesTable } from "@workspace/db/schema";
import { eq, desc, avg, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;

    const userRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (userRows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = userRows[0];

    // Fetch all reviews by this user, joined with business info
    const reviewRows = await db
      .select({
        review: reviewsTable,
        business: {
          id: businessesTable.id,
          name: businessesTable.name,
          slug: businessesTable.slug,
          logoUrl: businessesTable.logoUrl,
          municipality: businessesTable.municipality,
        },
      })
      .from(reviewsTable)
      .leftJoin(businessesTable, eq(reviewsTable.businessId, businessesTable.id))
      .where(eq(reviewsTable.userId, id))
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = reviewRows.map(r => ({
      id: r.review.id,
      rating: r.review.rating,
      title: r.review.title,
      body: r.review.body,
      createdAt: r.review.createdAt,
      business: r.business
        ? {
            id: r.business.id,
            name: r.business.name,
            slug: r.business.slug,
            logoUrl: r.business.logoUrl,
            municipality: r.business.municipality,
          }
        : null,
    }));

    const totalReviews = reviews.length;
    const averageRatingGiven =
      totalReviews > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
        : 0;

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImage: user.profileImageUrl,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: {
        totalReviews,
        averageRatingGiven,
      },
      reviews,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// GET /my/profile — own profile (authenticated)
router.get("/my/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const reviewRows = await db
      .select({
        review: reviewsTable,
        business: {
          id: businessesTable.id,
          name: businessesTable.name,
          slug: businessesTable.slug,
          logoUrl: businessesTable.logoUrl,
          municipality: businessesTable.municipality,
        },
      })
      .from(reviewsTable)
      .leftJoin(businessesTable, eq(reviewsTable.businessId, businessesTable.id))
      .where(eq(reviewsTable.userId, req.user.id))
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = reviewRows.map(r => ({
      id: r.review.id,
      rating: r.review.rating,
      title: r.review.title,
      body: r.review.body,
      createdAt: r.review.createdAt,
      business: r.business
        ? {
            id: r.business.id,
            name: r.business.name,
            slug: r.business.slug,
            logoUrl: r.business.logoUrl,
            municipality: r.business.municipality,
          }
        : null,
    }));

    const totalReviews = reviews.length;
    const averageRatingGiven =
      totalReviews > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
        : 0;

    res.json({
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        username: req.user.username,
        profileImage: req.user.profileImageUrl,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
      stats: {
        totalReviews,
        averageRatingGiven,
      },
      reviews,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
