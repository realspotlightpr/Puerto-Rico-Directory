import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../types/auth";

export type { AuthUser };

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL environment variable is required");

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

async function upsertUserFromJWT(payload: JWTPayload): Promise<AuthUser> {
  const id = payload.sub as string;
  const email = (payload.email as string | undefined) ?? null;
  const meta = (payload.user_metadata as Record<string, unknown> | undefined) ?? {};

  const firstName = ((meta.first_name ?? meta.given_name ?? (typeof meta.name === "string" ? meta.name.split(" ")[0] : null)) as string | null) ?? null;
  const lastName = (meta.last_name ?? meta.family_name ?? null) as string | null;
  const username = (meta.user_name ?? meta.preferred_username ?? meta.username ?? null) as string | null;
  const profileImageUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null;

  // Supabase sets email_confirmed_at when the user verifies their email
  const emailConfirmedAt = payload.email_confirmed_at as string | undefined;
  const emailVerified = !!emailConfirmedAt;

  // Check if a pre-seeded record exists with this email but a different ID
  if (email) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing && existing.id !== id) {
      const [updated] = await db
        .update(usersTable)
        .set({ id, firstName, lastName, username, profileImageUrl, emailVerified, updatedAt: new Date() })
        .where(eq(usersTable.email, email))
        .returning();

      // If newly verified, claim all their businesses
      if (emailVerified && !existing.emailVerified) {
        await claimBusinessesForOwner(id);
      }
      return updated as AuthUser;
    }
  }

  // Normal upsert by Supabase UUID — never overwrite an existing role
  const [existingById] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  const [user] = await db
    .insert(usersTable)
    .values({ id, email, firstName, lastName, username, profileImageUrl, role: "user", emailVerified })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email,
        firstName,
        lastName,
        username,
        profileImageUrl,
        emailVerified,
        updatedAt: new Date(),
      },
    })
    .returning();

  // If this is the first time we're seeing them as email-verified, claim their businesses
  if (emailVerified && existingById && !existingById.emailVerified) {
    await claimBusinessesForOwner(id);
  } else if (emailVerified && !existingById) {
    // Brand new verified user — claim any pre-existing businesses
    await claimBusinessesForOwner(id);
  }

  return user as AuthUser;
}

async function claimBusinessesForOwner(ownerId: string): Promise<void> {
  try {
    await db
      .update(businessesTable)
      .set({ isClaimed: true })
      .where(eq(businessesTable.ownerId, ownerId));
  } catch {
    // Non-critical — don't fail auth if this update fails
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
    });
    req.user = await upsertUserFromJWT(payload);
  } catch {
    // Invalid or expired token — treat as unauthenticated
  }

  next();
}
