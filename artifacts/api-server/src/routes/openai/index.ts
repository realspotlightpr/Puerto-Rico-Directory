import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversations,
  messages,
  businessesTable,
  reviewsTable,
  mediaItemsTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { z } from "zod";
import { ObjectStorageService } from "../../lib/objectStorage";

const router: IRouter = Router();

// ── Build the business-aware system prompt ──────────────────────────────────
async function buildBusinessSystemPrompt(businessId: number): Promise<string> {
  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId))
    .limit(1);

  if (!biz) {
    return "You are a helpful business assistant.";
  }

  // Fetch recent reviews for context
  const recentReviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, businessId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(10);

  const reviewSummary =
    recentReviews.length > 0
      ? recentReviews
          .map(
            (r) =>
              `- [${r.rating}/5] ${r.title ?? ""}: "${r.body ?? "No content"}"`
          )
          .join("\n")
      : "No reviews yet.";

  const avgRating =
    recentReviews.length > 0
      ? (
          recentReviews.reduce((s, r) => s + r.rating, 0) /
          recentReviews.length
        ).toFixed(1)
      : "N/A";

  const hoursJson = biz.hours
    ? JSON.stringify(biz.hours, null, 2)
    : "Not specified";
  const socialJson =
    biz.facebook || biz.instagram || biz.twitter
      ? JSON.stringify(
          {
            facebook: biz.facebook,
            instagram: biz.instagram,
            twitter: biz.twitter,
          },
          null,
          2
        )
      : "None set";

  return `You are an expert AI business assistant for "${biz.name}" — a business located in Puerto Rico.

You know everything about this business and help the owner manage, grow, and understand it.
You can answer questions, give marketing advice, analyze reviews, suggest improvements, help write content, and generate images on request.

## Business Details
- **Name**: ${biz.name}
- **Description**: ${biz.description ?? "Not provided"}
- **Municipality**: ${biz.municipality ?? "Puerto Rico"}
- **Address**: ${biz.address ?? "Not provided"}
- **Phone**: ${biz.phone ?? "Not provided"}
- **Email**: ${biz.email ?? "Not provided"}
- **Website**: ${biz.website ?? "Not provided"}
- **Status**: ${biz.status}

## Operating Hours
${hoursJson}

## Social Media
${socialJson}

## Review Summary (last 10)
- Average Rating: ${avgRating}/5
${reviewSummary}

## Instructions
- Be specific to this business. Reference its actual name, location, and details in your answers.
- When the owner asks to generate an image, tell them to click the image icon or type "generate image of [description]".
- Be concise, actionable, and friendly. You're a trusted advisor who knows the business inside and out.
- For marketing suggestions, always tailor them to Puerto Rico's culture and market.
- If asked about things unrelated to the business, politely steer back to how it applies to "${biz.name}".`;
}

// ── GET /openai/conversations?businessId=:businessId ────────────────────────
router.get("/openai/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const businessId = parseInt(req.query.businessId as string);
  if (!businessId) {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, req.user.id))
      .orderBy(desc(conversations.createdAt));
    res.json(rows);
    return;
  }
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, businessId),
        eq(conversations.userId, req.user.id)
      )
    )
    .orderBy(desc(conversations.createdAt));
  res.json(rows);
});

// ── POST /openai/conversations ──────────────────────────────────────────────
router.post("/openai/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { title, businessId } = req.body;
  const [row] = await db
    .insert(conversations)
    .values({
      title: title ?? "New conversation",
      businessId: businessId ?? null,
      userId: req.user.id,
    })
    .returning();
  res.status(201).json(row);
});

// ── GET /openai/conversations/:id ───────────────────────────────────────────
router.get("/openai/conversations/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, req.user.id))
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.json({ ...conv, messages: msgs });
});

// ── DELETE /openai/conversations/:id ────────────────────────────────────────
router.delete("/openai/conversations/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, req.user.id))
    );
  res.status(204).end();
});

// ── GET /openai/conversations/:id/messages ───────────────────────────────────
router.get("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

// ── POST /openai/conversations/:id/messages (SSE streaming) ─────────────────
router.post("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  // Fetch the conversation (verify ownership)
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, req.user.id))
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content,
  });

  // Fetch history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  // Build system prompt with business context
  const systemPrompt = conv.businessId
    ? await buildBusinessSystemPrompt(conv.businessId)
    : "You are a helpful assistant for a business owner on Spotlight Puerto Rico.";

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "AI error occurred" })}\n\n`);
  }

  res.end();
});

// ── POST /openai/generate-about-html ────────────────────────────────────────
router.post("/openai/generate-about-html", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const schema = z.object({
    businessId: z.number().int().positive(),
    brief: z.string().min(1).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "businessId (number) and brief (string) are required" });
    return;
  }
  const { businessId, brief } = parsed.data;

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId))
    .limit(1);

  if (!biz) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (biz.ownerId !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const systemPrompt = `You are an expert HTML designer for business about-section pages. 
Your task is to produce a single, self-contained HTML snippet for a business's "About" section.

STRICT RULES — you must follow all of them:
1. Output ONLY the raw HTML. No markdown, no code fences, no explanations.
2. Use ONLY inline styles (style="..."). No <style> tags, no class references, no external resources.
3. Do NOT include <html>, <head>, <body>, or <script> tags.
4. Do NOT reference external URLs (no src, no href pointing to external resources).
5. Keep the snippet concise — suitable for an about section (not a full page).
6. The design should look polished, modern, and professional.
7. Use safe HTML tags only: div, p, h1-h4, span, ul, ol, li, strong, em, br, section, article.`;

  const userPrompt = `Business name: "${biz.name}"
Business category: "${biz.categoryId}"
Municipality: "${biz.municipality}"
Current description: "${biz.description || "Not provided"}"

Design brief from the owner: "${brief}"

Create a visually appealing, self-contained HTML about-section snippet with inline styles only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const html = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ html });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

// ── POST /openai/generate-image ─────────────────────────────────────────────
router.post("/openai/generate-image", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { prompt, size, businessId, saveToLibrary } = req.body as {
    prompt: string;
    size?: "1024x1024" | "1792x1024" | "1024x1792" | "512x512" | "256x256";
    businessId?: number;
    saveToLibrary?: boolean;
  };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  try {
    const buffer = await generateImageBuffer(prompt, size ?? "1024x1024");
    const b64 = buffer.toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;

    let savedItemId: number | undefined;

    if (saveToLibrary && businessId) {
      const [biz] = await db
        .select({ ownerId: businessesTable.ownerId })
        .from(businessesTable)
        .where(eq(businessesTable.id, businessId))
        .limit(1);

      if (biz && biz.ownerId === req.user.id) {
        const [saved] = await db
          .insert(mediaItemsTable)
          .values({ businessId, url: dataUrl, prompt, size: size ?? "1024x1024" })
          .returning();
        savedItemId = saved.id;
      }
    }

    res.json({ b64_json: b64, savedItemId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ── POST /openai/generate-business-image ────────────────────────────────────
// Generates an AI logo or cover photo for a business and saves it to storage.
router.post("/openai/generate-business-image", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const schema = z.object({
    businessId: z.number().int().positive(),
    type: z.enum(["logo", "cover"]),
    style: z.string().max(200).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "businessId, type (logo|cover) are required" });
    return;
  }

  const { businessId, type, style } = parsed.data;

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId))
    .limit(1);

  if (!biz) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (biz.ownerId !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const category = biz.categoryId ? `Category #${biz.categoryId}` : "local business";
  const location = biz.municipality ?? "Puerto Rico";
  const styleNote = style ? ` Style: ${style}.` : "";

  let prompt: string;
  let size: "1024x1024" | "1792x1024";

  if (type === "logo") {
    size = "1024x1024";
    prompt = `Create a professional, modern business logo for "${biz.name}", a ${category} located in ${location}, Puerto Rico. The logo should be clean, memorable, and work on a white background. Include the business name or an iconic symbol that represents the business.${styleNote} No text other than the business name. High quality vector-like illustration style.`;
  } else {
    size = "1792x1024";
    prompt = `Create a stunning, wide-format cover photo / hero banner for "${biz.name}", a ${category} in ${location}, Puerto Rico. The image should be vibrant, professional, and evoke the spirit of the business and Puerto Rican culture. Landscape orientation, cinematic composition, no text overlays.${styleNote}`;
  }

  try {
    const buffer = await generateImageBuffer(prompt, size);
    const storageService = new ObjectStorageService();
    const objectPath = await storageService.uploadBuffer(buffer, "image/png");
    const baseStorageUrl = `/api/storage${objectPath}`;
    res.json({ url: baseStorageUrl, objectPath });
  } catch (err) {
    req.log.error(err, "generate-business-image error");
    res.status(500).json({ error: "Image generation failed. Please try again." });
  }
});

// ── POST /openai/enhance-logo ───────────────────────────────────────────────
// Takes an uploaded logo image and enhances it with white background + 1:1 ratio
router.post("/openai/enhance-logo", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { imageUrl, businessId } = req.body as {
    imageUrl: string;
    businessId?: number;
  };

  if (!imageUrl?.trim()) {
    res.status(400).json({ error: "Image URL is required" });
    return;
  }

  try {
    // Use GPT-4V to analyze the logo and generate enhancement prompt
    const analysisPrompt = `You are a logo design expert. Analyze this logo image and create a detailed description of what the logo looks like, its colors, style, and key elements. Then suggest how to enhance it with a white background (keeping the logo style clean and professional) and ensure it's in a perfect 1:1 square format.

Based on your analysis, generate a DALL-E prompt that would create an enhanced version of this logo with:
- Pure white background
- 1:1 square aspect ratio
- Professional appearance
- Similar style and brand elements to the original

Return ONLY the DALL-E prompt, nothing else.`;

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: analysisPrompt,
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const enhancePrompt = visionResponse.choices[0]?.message?.content?.toString() || "";

    if (!enhancePrompt) {
      res.status(500).json({ error: "Failed to analyze logo" });
      return;
    }

    // Generate enhanced logo using DALL-E
    const buffer = await generateImageBuffer(enhancePrompt, "1024x1024");
    const b64 = buffer.toString("base64");

    res.json({ b64_json: b64, prompt: enhancePrompt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Logo enhancement failed" });
  }
});

export default router;
