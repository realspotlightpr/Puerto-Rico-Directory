import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "puerto-rico");
const site = "https://spotlightpuertorico.com";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zswvumzbtikzvwgtpprw.supabase.co";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const minimumListings = Number(process.env.SEO_MINIMUM_LISTINGS || 2);

if (!anonKey) throw new Error("VITE_SUPABASE_ANON_KEY is required to generate inventory-backed SEO pages.");

const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=${encodeURIComponent("id,name,slug,description,municipality,address,phone,website,status,categories(name)")}&status=eq.approved&order=name.asc&limit=1000`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
});
if (!response.ok) throw new Error(`Business fetch failed: ${response.status} ${await response.text()}`);
const businesses = await response.json();

const categoryDefinitions = {
  "Restaurants": { slug: "restaurants", label: "Restaurants", labelEs: "Restaurantes" },
  "Cafés & Bakeries": { slug: "cafes-and-bakeries", label: "Cafés and Bakeries", labelEs: "Cafés y panaderías" },
  "Retail & Shopping": { slug: "shopping", label: "Local Shopping", labelEs: "Compras locales" },
  "Professional Services": { slug: "professional-services", label: "Professional Services", labelEs: "Servicios profesionales" },
  "Automotive": { slug: "automotive", label: "Automotive Services", labelEs: "Servicios automotrices" },
  "Home Services": { slug: "home-services", label: "Home Services", labelEs: "Servicios para el hogar" },
  "Beauty & Spa": { slug: "beauty-and-spa", label: "Beauty and Spa", labelEs: "Belleza y spa" },
  "Health & Wellness": { slug: "health-and-wellness", label: "Health and Wellness", labelEs: "Salud y bienestar" },
  "Tours & Experiences": { slug: "tours-and-experiences", label: "Tours and Experiences", labelEs: "Tours y experiencias" },
};

const slugify = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const plainText = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const groups = new Map();

for (const business of businesses) {
  const municipality = plainText(business.municipality);
  const category = categoryDefinitions[business.categories?.name];
  if (!municipality || !category) continue;
  const key = `${municipality}::${category.slug}`;
  if (!groups.has(key)) groups.set(key, { municipality, category, listings: [] });
  groups.get(key).listings.push(business);
}

const eligibleGroups = [...groups.values()]
  .filter(group => group.listings.length >= minimumListings)
  .sort((a, b) => b.listings.length - a.listings.length || a.municipality.localeCompare(b.municipality));

await rm(output, { recursive: true, force: true });
const generatedUrls = [];

for (const group of eligibleGroups) {
  const municipalitySlug = slugify(group.municipality);
  const url = `${site}/puerto-rico/${municipalitySlug}/${group.category.slug}/`;
  const title = `${group.category.label} in ${group.municipality}, Puerto Rico | Spotlight Puerto Rico`;
  const description = `Browse ${group.listings.length} approved ${group.category.label.toLowerCase()} listings in ${group.municipality}, Puerto Rico, with current local contact and business details.`;
  const cards = group.listings.map(business => {
    const detail = plainText(business.description).slice(0, 180) || `${business.name} is an approved local listing in ${group.municipality}.`;
    return `<article><h2><a href="/businesses/${encodeURIComponent(business.slug || String(business.id))}">${escapeHtml(business.name)}</a></h2><p>${escapeHtml(detail)}</p><ul>${business.address ? `<li>${escapeHtml(business.address)}</li>` : ""}${business.phone ? `<li><a href="tel:${escapeHtml(business.phone)}">${escapeHtml(business.phone)}</a></li>` : ""}${business.website ? `<li><a href="${escapeHtml(business.website)}" rel="nofollow">Official website</a></li>` : ""}</ul></article>`;
  }).join("");
  const itemList = group.listings.map((business, index) => ({ "@type": "ListItem", position: index + 1, url: `${site}/businesses/${encodeURIComponent(business.slug || String(business.id))}`, name: business.name }));
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${url}#page`, name: title, description, url, inLanguage: ["en", "es"], isPartOf: { "@type": "WebSite", name: "Spotlight Puerto Rico", url: site } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Puerto Rico", item: `${site}/` },
        { "@type": "ListItem", position: 2, name: group.municipality, item: `${site}/directory?municipality=${encodeURIComponent(group.municipality)}` },
        { "@type": "ListItem", position: 3, name: group.category.label, item: url },
      ] },
      { "@type": "ItemList", name: `${group.category.label} in ${group.municipality}`, numberOfItems: group.listings.length, itemListElement: itemList },
    ],
  }).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${site}/opengraph.jpg"><script type="application/ld+json">${schema}</script><style>:root{font-family:Inter,system-ui,sans-serif;color:#12352f;background:#f7faf8}*{box-sizing:border-box}body{margin:0}header,footer{padding:22px 5vw;background:#fff;border-bottom:1px solid #dce8e3}header a,a{color:#0f766e}main{max-width:1080px;margin:auto;padding:64px 24px}nav{margin-bottom:28px;color:#60766f}h1{font:700 clamp(2.5rem,7vw,5rem)/.98 Georgia,serif;letter-spacing:-.045em;margin:12px 0 20px}p{line-height:1.7;color:#506862}.intro{max-width:760px;font-size:1.1rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin:40px 0}.grid article{background:white;border:1px solid #dce8e3;border-radius:12px;padding:24px}.grid h2{font:700 1.45rem/1.2 Georgia,serif;margin:0 0 10px}.grid ul{padding-left:18px;color:#60766f}.cta{display:inline-block;background:#0f766e;color:white;padding:13px 17px;border-radius:8px;text-decoration:none;font-weight:800}footer{border-top:1px solid #dce8e3;border-bottom:0;color:#60766f}</style></head><body><header><a href="/"><strong>Spotlight Puerto Rico</strong></a> · <a href="/directory">Directory</a></header><main><nav><a href="/">Puerto Rico</a> › ${escapeHtml(group.municipality)} › ${escapeHtml(group.category.label)}</nav><p><strong>Local directory · Directorio local</strong></p><h1>${escapeHtml(group.category.label)} in ${escapeHtml(group.municipality)}</h1><p class="intro">${escapeHtml(description)} Explore ${escapeHtml(group.category.labelEs.toLowerCase())} en ${escapeHtml(group.municipality)} using information supplied by local listings. Confirm hours, availability, prices, and service areas directly with each business.</p><div class="grid">${cards}</div><a class="cta" href="/directory?municipality=${encodeURIComponent(group.municipality)}">Browse all ${escapeHtml(group.municipality)} listings</a></main><footer>Spotlight Puerto Rico · Supporting discovery of local businesses across Puerto Rico</footer></body></html>`;
  const file = join(output, municipalitySlug, group.category.slug, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  generatedUrls.push(url);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${generatedUrls.map(url => `  <url><loc>${url}</loc><changefreq>weekly</changefreq></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(root, "public", "sitemap-seo-pages.xml"), sitemap);
console.log(`Generated ${generatedUrls.length} inventory-backed SEO pages from ${businesses.length} approved businesses (minimum ${minimumListings} matching listings per page).`);
