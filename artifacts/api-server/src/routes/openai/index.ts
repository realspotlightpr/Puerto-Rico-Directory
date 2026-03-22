import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversations,
  messages,
  businessesTable,
  reviewsTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { z } from "zod";

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

// ── POST /openai/generate-image ─────────────────────────────────────────────
router.post("/openai/generate-image", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { prompt, size } = req.body as {
    prompt: string;
    size?: "1024x1024" | "512x512" | "256x256";
  };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  try {
    const buffer = await generateImageBuffer(prompt, size ?? "1024x1024");
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
