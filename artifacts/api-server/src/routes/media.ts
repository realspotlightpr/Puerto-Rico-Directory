import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mediaItemsTable, businessesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

async function verifyBusinessOwner(businessId: number, userId: string): Promise<boolean> {
  const [biz] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId))
    .limit(1);
  return !!biz && biz.ownerId === userId;
}

// ── GET /media/items?businessId=:id ────────────────────────────────────────
router.get("/media/items", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const businessId = parseInt(req.query.businessId as string);
  if (!businessId) {
    res.status(400).json({ error: "businessId is required" });
    return;
  }

  const isOwner = await verifyBusinessOwner(businessId, req.user.id);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const items = await db
    .select()
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.businessId, businessId))
    .orderBy(desc(mediaItemsTable.createdAt));

  res.json({ items });
});

// ── POST /media/items ───────────────────────────────────────────────────────
const SaveImageSchema = z.object({
  businessId: z.number().int().positive(),
  url: z.string().min(1),
  prompt: z.string().optional(),
  size: z.string().optional(),
});

router.post("/media/items", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SaveImageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { businessId, url, prompt, size } = parsed.data;

  const isOwner = await verifyBusinessOwner(businessId, req.user.id);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [item] = await db
    .insert(mediaItemsTable)
    .values({ businessId, url, prompt, size })
    .returning();

  res.status(201).json(item);
});

// ── DELETE /media/items/:id ─────────────────────────────────────────────────
router.delete("/media/items/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const itemId = parseInt(req.params.id);
  if (!itemId) {
    res.status(400).json({ error: "Invalid item ID" });
    return;
  }

  const [item] = await db
    .select()
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.id, itemId))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const isOwner = await verifyBusinessOwner(item.businessId, req.user.id);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(mediaItemsTable).where(eq(mediaItemsTable.id, itemId));
  res.status(204).end();
});

// ── POST /openai/generate-image-and-save ───────────────────────────────────
// This route generates an image and optionally saves it to the media library

export default router;
