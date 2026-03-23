import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, businessesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

async function upsertUserFromJWT(payload: JWTPayload): Promise<AuthUser> {
  const id = payload.sub as string;
  const email = (payload.email as string | undefined) ?? null;
  const meta = (payload.user_metadata as Record<string, unknown> | undefined) ?? {};

  const firstName = ((meta.first_name ?? meta.given_name ?? (typeof meta.name === "string" ? meta.name.split(" ")[0] : null)) as string | null) ?? null;
  const lastName = (meta.last_name ?? meta.family_name ?? null) as string | null;
  const username = (meta.user_name ?? meta.preferred_username ?? meta.username ?? null) as string | null;
  const profileImageUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null;

  // Supabase sets email_confirmed_at OR user_metadata.email_verified
  const emailConfirmedAt = payload.email_confirmed_at as string | undefined;
  const metaEmailVerified = meta.email_verified === true;
  const emailVerified = !!emailConfirmedAt || metaEmailVerified;

  // Check if a pre-seeded record exists with this email but a different ID
  if (email) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing && existing.id !== id) {
      const isConfiguredAdminMerge = ADMIN_EMAILS.has(email.toLowerCase());
      const [updated] = await db
        .update(usersTable)
        .set({
          id,
          firstName,
          lastName,
          username,
          profileImageUrl,
          emailVerified,
          role: isConfiguredAdminMerge ? "admin" : existing.role,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.email, email))
        .returning();

      // If newly verified, claim all their businesses
      if (emailVerified && !existing.emailVerified) {
        await claimBusinessesForOwner(id);
      }
      return updated as AuthUser;
    }
  }

  // Determine the correct role — always admin if in the ADMIN_EMAILS env list
  const isConfiguredAdmin = email ? ADMIN_EMAILS.has(email.toLowerCase()) : false;
  const initialRole = isConfiguredAdmin ? "admin" : "user";

  // Normal upsert by Supabase UUID
  // - Never overwrite an existing non-admin role (preserved via conflict exclusion)
  // - Admin emails always get/keep admin role
  const [existingById] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  const [user] = await db
    .insert(usersTable)
    .values({ id, email, firstName, lastName, username, profileImageUrl, role: initialRole, emailVerified })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email,
        firstName,
        lastName,
        username,
        profileImageUrl,
        emailVerified: sql`${usersTable.emailVerified} OR ${emailVerified}`,
        // Always promote configured admins; otherwise keep existing role
        role: isConfiguredAdmin ? sql`'admin'` : usersTable.role,
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
