import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/my/businesses", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(eq(businessesTable.ownerId, req.user.id))
      .orderBy(desc(businessesTable.createdAt));

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
      ownerName: null,
      createdAt: r.businesses.createdAt,
      updatedAt: r.businesses.updatedAt,
    }));

    res.json({
      businesses,
      total: businesses.length,
      page: 1,
      limit: businesses.length,
      totalPages: 1,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

export default router;
