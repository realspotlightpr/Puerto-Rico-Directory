import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, businessesTable } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  try {
    const cats = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        icon: categoriesTable.icon,
        businessCount: sql<number>`count(${businessesTable.id})::int`,
      })
      .from(categoriesTable)
      .leftJoin(
        businessesTable,
        sql`${businessesTable.categoryId} = ${categoriesTable.id} AND ${businessesTable.status} = 'approved'`
      )
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.name);

    res.json({ categories: cats });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
