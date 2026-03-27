import { db, categoriesTable, usersTable, sliderSettingsTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";

const CATEGORIES = [
  { name: "Restaurants & Food", slug: "restaurants-food", icon: "🍽️" },
  { name: "Shopping & Retail", slug: "shopping-retail", icon: "🛍️" },
  { name: "Health & Beauty", slug: "health-beauty", icon: "💆" },
  { name: "Professional Services", slug: "professional-services", icon: "💼" },
  { name: "Entertainment", slug: "entertainment", icon: "🎭" },
  { name: "Hotels & Lodging", slug: "hotels-lodging", icon: "🏨" },
  { name: "Auto Services", slug: "auto-services", icon: "🚗" },
  { name: "Home Services", slug: "home-services", icon: "🏠" },
  { name: "Education", slug: "education", icon: "📚" },
  { name: "Tourism & Recreation", slug: "tourism-recreation", icon: "🏖️" },
  { name: "Religious Organizations", slug: "religious-organizations", icon: "⛪" },
  { name: "Non-Profit & Community", slug: "non-profit-community", icon: "🤝" },
];

async function seedCategories(): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(categoriesTable);
  if (total > 0) return;

  await db.insert(categoriesTable).values(CATEGORIES);
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

async function promoteAdminEmails(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return;

  const result = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(inArray(usersTable.email, emails));

  if ((result as unknown as { rowCount?: number }).rowCount) {
    console.log(`Promoted admin role for: ${emails.join(", ")}`);
  }
}

async function seedSliderSettings(): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(sliderSettingsTable);
  if (total > 0) return;

  const sliders = [
    { imageUrl: "images/hero-crash-boat.png", city: "Aguadilla", region: "West", sortOrder: 0 },
    { imageUrl: "images/hero-surfing.png", city: "Rincon", region: "West", sortOrder: 1 },
  ];

  await db.insert(sliderSettingsTable).values(sliders);
  console.log(`Seeded ${sliders.length} slider settings`);
}

export async function runSeed(): Promise<void> {
  try {
    await seedCategories();
    await promoteAdminEmails();
    await seedSliderSettings();
  } catch (err) {
    console.error("Seed error (non-fatal):", err);
  }
}
