import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, teamMembersTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router: IRouter = Router();

const VALID_PERMISSIONS = ["verify", "approve", "add_businesses"] as const;
type Permission = typeof VALID_PERMISSIONS[number];

async function getTeamMember(userId: string) {
  const rows = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.userId, userId), eq(teamMembersTable.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

function hasPermission(member: { permissions: string[] | null }, perm: Permission): boolean {
  return (member.permissions ?? []).includes(perm);
}

function requireTeamMember(req: any, res: any, perm?: Permission): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

router.get("/team/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member) {
      res.status(403).json({ error: "Not a team member" });
      return;
    }
    res.json(member);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch team status" });
  }
});

router.get("/team/my-submissions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member) {
      res.status(403).json({ error: "Not a team member" });
      return;
    }

    const rows = await db
      .select({
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
        averageRating: businessesTable.averageRating,
        reviewCount: businessesTable.reviewCount,
        addedByRepId: businessesTable.addedByRepId,
        addedByRepName: businessesTable.addedByRepName,
        createdAt: businessesTable.createdAt,
        updatedAt: businessesTable.updatedAt,
      })
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(eq(businessesTable.addedByRepId, req.user!.id))
      .orderBy(desc(businessesTable.createdAt));

    res.json({ businesses: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.get("/team/pending-reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member || !hasPermission(member, "approve")) {
      res.status(403).json({ error: "Permission denied" });
      return;
    }

    const rows = await db
      .select({
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
        status: businessesTable.status,
        source: businessesTable.source,
        addedByRepId: businessesTable.addedByRepId,
        addedByRepName: businessesTable.addedByRepName,
        createdAt: businessesTable.createdAt,
      })
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .where(eq(businessesTable.status, "pending"))
      .orderBy(desc(businessesTable.createdAt));

    res.json({ businesses: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pending reviews" });
  }
});

router.get("/team/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member) {
      res.status(403).json({ error: "Not a team member" });
      return;
    }

    const repId = req.user!.id;

    const [total, approved, pending, claimed] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.addedByRepId, repId)).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(and(eq(businessesTable.addedByRepId, repId), eq(businessesTable.status, "approved"))).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(and(eq(businessesTable.addedByRepId, repId), eq(businessesTable.status, "pending"))).then(r => r[0]?.count ?? 0),
      db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(and(eq(businessesTable.addedByRepId, repId), eq(businessesTable.isClaimed, true))).then(r => r[0]?.count ?? 0),
    ]);

    res.json({
      totalAdded: total,
      approved,
      pending,
      claimed,
      unclaimed: total - claimed,
      permissions: member.permissions ?? [],
      type: member.type,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/team/businesses", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member || !hasPermission(member, "add_businesses")) {
      res.status(403).json({ error: "Permission denied: add_businesses required" });
      return;
    }

    const { name, description, categoryId, municipality, address, phone, email, website, logoUrl, coverUrl } = req.body;

    if (!name || !description || !municipality) {
      res.status(400).json({ error: "name, description, and municipality are required" });
      return;
    }

    const repId = req.user!.id;
    const repName = `${req.user!.firstName ?? ""} ${req.user!.lastName ?? ""}`.trim() || req.user!.username;

    let slug = generateSlug(name);
    const existing = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.slug, slug));
    if (existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

    const [business] = await db.insert(businessesTable).values({
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

    res.status(201).json(business);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add business" });
  }
});

router.post("/team/businesses/:id/approve", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member || !hasPermission(member, "approve")) {
      res.status(403).json({ error: "Permission denied: approve required" });
      return;
    }

    const id = parseInt(req.params.id);
    const [updated] = await db.update(businessesTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve business" });
  }
});

router.post("/team/businesses/:id/reject", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member || !hasPermission(member, "approve")) {
      res.status(403).json({ error: "Permission denied: approve required" });
      return;
    }

    const id = parseInt(req.params.id);
    const [updated] = await db.update(businessesTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reject business" });
  }
});

router.post("/team/businesses/:id/verify", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const member = await getTeamMember(req.user!.id);
    if (!member || !hasPermission(member, "verify")) {
      res.status(403).json({ error: "Permission denied: verify required" });
      return;
    }

    const id = parseInt(req.params.id);
    const existing = await db.select().from(businessesTable).where(eq(businessesTable.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const [updated] = await db.update(businessesTable)
      .set({ featured: !existing[0].featured, updatedAt: new Date() })
      .where(eq(businessesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to verify business" });
  }
});

export default router;
