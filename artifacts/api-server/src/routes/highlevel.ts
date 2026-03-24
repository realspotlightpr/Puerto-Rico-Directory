import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

async function getBusinessWithOwnerCheck(businessId: number, userId: string) {
  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId))
    .limit(1);
  if (!biz || biz.ownerId !== userId) return null;
  return biz;
}

const HIGHLEVEL_BASE = "https://rest.gohighlevel.com/v1";

// ── GET /highlevel/posts?businessId=:id ─────────────────────────────────────
router.get("/highlevel/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const businessId = parseInt(req.query.businessId as string);
  if (!businessId) {
    res.status(400).json({ error: "businessId is required" });
    return;
  }

  const biz = await getBusinessWithOwnerCheck(businessId, req.user.id);
  if (!biz) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!biz.highlevelApiKey) {
    res.status(422).json({ error: "HighLevel API key not configured" });
    return;
  }

  try {
    const hlRes = await fetch(`${HIGHLEVEL_BASE}/social-media-posting/`, {
      headers: {
        Authorization: `Bearer ${biz.highlevelApiKey}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
    });

    if (!hlRes.ok) {
      const errText = await hlRes.text();
      res.status(hlRes.status).json({ error: `HighLevel error: ${errText}` });
      return;
    }

    const data = await hlRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to connect to HighLevel" });
  }
});

// ── POST /highlevel/posts ───────────────────────────────────────────────────
const CreatePostSchema = z.object({
  businessId: z.number().int().positive(),
  text: z.string().min(1),
  scheduledAt: z.string().optional(),
  imageUrl: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

router.post("/highlevel/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { businessId, text, scheduledAt, imageUrl, platforms } = parsed.data;

  const biz = await getBusinessWithOwnerCheck(businessId, req.user.id);
  if (!biz) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!biz.highlevelApiKey) {
    res.status(422).json({ error: "HighLevel API key not configured" });
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      post: text,
      platforms: platforms ?? [],
    };
    if (scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }
    if (imageUrl) {
      payload.images = [imageUrl];
    }

    const hlRes = await fetch(`${HIGHLEVEL_BASE}/social-media-posting/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${biz.highlevelApiKey}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(payload),
    });

    if (!hlRes.ok) {
      const errText = await hlRes.text();
      res.status(hlRes.status).json({ error: `HighLevel error: ${errText}` });
      return;
    }

    const data = await hlRes.json();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to connect to HighLevel" });
  }
});

// ── GET /highlevel/status?businessId=:id ─────────────────────────────────────
router.get("/highlevel/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const businessId = parseInt(req.query.businessId as string);
  if (!businessId) {
    res.status(400).json({ error: "businessId is required" });
    return;
  }

  const biz = await getBusinessWithOwnerCheck(businessId, req.user.id);
  if (!biz) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({ hasApiKey: !!biz.highlevelApiKey });
});

// ── PUT /highlevel/api-key ──────────────────────────────────────────────────
const UpdateApiKeySchema = z.object({
  businessId: z.number().int().positive(),
  apiKey: z.string(),
});

router.put("/highlevel/api-key", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { businessId, apiKey } = parsed.data;

  const biz = await getBusinessWithOwnerCheck(businessId, req.user.id);
  if (!biz) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(businessesTable)
    .set({ highlevelApiKey: apiKey || null })
    .where(eq(businessesTable.id, businessId));

  res.json({ success: true });
});

export default router;
