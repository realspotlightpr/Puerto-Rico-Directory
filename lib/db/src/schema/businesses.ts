import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessStatusEnum = pgEnum("business_status", ["pending", "approved", "rejected"]);
export const businessSourceEnum = pgEnum("business_source", ["user_submitted", "spotlight_rep"]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
});

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(), // may contain HTML with inline styles (sanitized before display)
  categoryId: integer("category_id").references(() => categoriesTable.id),
  municipality: text("municipality").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  hours: jsonb("hours").$type<Record<string, string>>(),
  socialLinks: jsonb("social_links").$type<{ facebook?: string; instagram?: string; twitter?: string; youtube?: string }>(),
  specialOffer: text("special_offer"),
  status: businessStatusEnum("status").notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  averageRating: real("average_rating").default(0),
  reviewCount: integer("review_count").default(0),
  ownerId: text("owner_id").notNull(),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  ownerContactEmail: text("owner_contact_email"),
  isClaimed: boolean("is_claimed").notNull().default(false),
  source: businessSourceEnum("source").notNull().default("user_submitted"),
  addedByRepId: text("added_by_rep_id"),
  addedByRepName: text("added_by_rep_name"),
  pageViews: integer("page_views").notNull().default(0),
  websiteClicks: integer("website_clicks").notNull().default(0),
  mapsClicks: integer("maps_clicks").notNull().default(0),
  highlevelApiKey: text("highlevel_api_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaItemsTable = pgTable("media_items", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  prompt: text("prompt"),
  size: text("size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true, updatedAt: true, slug: true, averageRating: true, reviewCount: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;

export const insertMediaItemSchema = createInsertSchema(mediaItemsTable).omit({ id: true, createdAt: true });
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type MediaItem = typeof mediaItemsTable.$inferSelect;

export const teamMemberTypeEnum = pgEnum("team_member_type", ["team_member", "affiliate"]);
export const teamMemberStatusEnum = pgEnum("team_member_status", ["active", "inactive"]);

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  type: teamMemberTypeEnum("type").notNull().default("team_member"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  invitedBy: text("invited_by"),
  notes: text("notes"),
  status: teamMemberStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembersTable.$inferSelect;

export const sliderSettingsTable = pgTable("slider_settings", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSliderSettingSchema = createInsertSchema(sliderSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSliderSetting = z.infer<typeof insertSliderSettingSchema>;
export type SliderSetting = typeof sliderSettingsTable.$inferSelect;

// ── Form Config ──────────────────────────────────────────────────────────────
// Stores the custom contact form configuration for each business page
export const formConfigsTable = pgTable("form_configs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().unique().references(() => businessesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Send a Message"),
  submitButtonText: text("submit_button_text").notNull().default("Send Message"),
  // JSON array of field config objects
  fields: jsonb("fields").$type<FormFieldConfig[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FormFieldConfig = {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  options?: string[]; // for select type
};

export const insertFormConfigSchema = createInsertSchema(formConfigsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFormConfig = z.infer<typeof insertFormConfigSchema>;
export type FormConfig = typeof formConfigsTable.$inferSelect;

// ── Form Submissions (Messages Inbox) ────────────────────────────────────────
// Stores inquiries submitted through each business's contact form
export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  // All form fields as submitted (dynamic)
  data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;
