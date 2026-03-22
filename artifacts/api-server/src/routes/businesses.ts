import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, usersTable } from "@workspace/db/schema";
import { eq, and, ilike, sql, desc, or } from "drizzle-orm";

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

router.get("/businesses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const rows = await db
      .select()
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(eq(businessesTable.id, id))
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, hours, socialLinks } = req.body;

    if (!name || !description || !categoryId || !municipality) {
      res.status(400).json({ error: "Missing required fields: name, description, categoryId, municipality" });
      return;
    }

    const slug = await uniqueSlug(name);
    const [created] = await db.insert(businessesTable).values({
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
      ownerId: req.user.id,
    }).returning();

    res.status(201).json(buildBusinessResponse(created));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create business" });
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

    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl, hours, socialLinks } = req.body;
    const [updated] = await db.update(businessesTable)
      .set({
        name: name ?? b.name,
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

export default router;
