import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar, foreignKey } from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

// Admin impersonation sessions — tracks when an admin is logged in as another user
export const adminImpersonationSessions = pgTable(
  "admin_impersonation_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    adminId: varchar("admin_id").notNull(),
    impersonatedUserId: varchar("impersonated_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_admin_impersonation_admin_id").on(table.adminId),
    index("idx_admin_impersonation_expires_at").on(table.expiresAt),
    foreignKey({ columns: [table.adminId], foreignColumns: [usersTable.id] }),
    foreignKey({ columns: [table.impersonatedUserId], foreignColumns: [usersTable.id] }),
  ],
);

export type AdminImpersonationSession = typeof adminImpersonationSessions.$inferSelect;
