import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const output = join(root, "public", "puerto-rico");
const site = "https://spotlightpuertorico.com";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zswvumzbtikzvwgtpprw.supabase.co";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!anonKey) throw new Error("VITE_SUPABASE_ANON_KEY is required to generate SEO pages.");

const roadmap = JSON.parse(await readFile(join(repoRoot, "docs", "seo", "500-page-roadmap.json"), "utf8"));
if (!Array.isArray(roadmap) || roadmap.length !== 500) throw new Error(`Expected exactly 500 roadmap entries; received ${roadmap?.length ?? 0}.`);

const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=${encodeURIComponent("id,name,slug,description,municipality,address,phone,website,status,categories(name,slug)")}&status=eq.approved&order=name.asc&limit=1000`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
});
if (!response.ok) throw new Error(`Business fetch failed: ${response.status} ${await response.text()}`);
const businesses = await response.json();

const categoryAliases = {
  restaurants: ["restaurants"], shopping: ["retail-shopping", "shopping"],
  "cafes-and-bakeries": ["cafes-bakeries", "cafes-and-bakeries"],
  "professional-services": ["professional-services"], automotive: ["automotive"],
  "home-services": ["home-services"], "beauty-and-spa": ["beauty-spa", "beauty-and-spa"],
  "tours-and-experiences": ["tours-experiences", "tours-and-experiences"],
};
const topicGuidance = {
  tourism: { intro: "Use this local planning page to compare places, experiences, and practical options before choosing where to spend your time.", questions: ["What fits the weather and time available?", "Which options require reservations?", "What should be confirmed before traveling?"] },
  food: { intro: "Compare local food options by location, contact details, and the information supplied by each listing.", questions: ["Is the menu and schedule current?", "Are reservations or takeout available?", "Does the location match your route?"] },
  shopping: { intro: "Discover local shops while checking location, product focus, and direct contact information before visiting.", questions: ["What products are available locally?", "Can inventory be confirmed before visiting?", "Is pickup or delivery offered?"] },
  business: { intro: "Find local providers and compare their service area, contact channels, and current listing details.", questions: ["Does the provider serve your municipality?", "Can pricing or availability be confirmed directly?", "Is the listing claimed by its owner?"] },
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const plainText = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const slugify = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const titleCase = value => value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

function listingsFor(page) {
  const topicSlug = new URL(page.url).pathname.split("/").filter(Boolean).at(-1);
  const aliases = categoryAliases[topicSlug] || [];
  return businesses.filter(business => {
    if (plainText(business.municipality).toLowerCase() !== page.municipality.toLowerCase()) return false;
    if (!aliases.length) return true;
    return aliases.includes(slugify(business.categories?.slug || business.categories?.name || ""));
  });
}

await rm(output, { recursive: true, force: true });
const generatedUrls = [];
for (const page of roadmap) {
  const pathname = new URL(page.url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const topicSlug = segments.at(-1);
  const topicLabel = titleCase(topicSlug);
  const listings = listingsFor(page);
  const guidance = topicGuidance[page.pillar] || topicGuidance.business;
  const related = roadmap.filter(candidate => candidate.municipality === page.municipality && candidate.url !== page.url).slice(0, 4);
  const title = `${topicLabel} in ${page.municipality}, Puerto Rico | Spotlight Puerto Rico`;
  const description = `${topicLabel} in ${page.municipality}: compare approved local listings, contact details, practical planning tips, and related Puerto Rico guides.`;
  const directoryUrl = `/directory?municipality=${encodeURIComponent(page.municipality)}`;
  const cards = listings.length
    ? listings.slice(0, 12).map(business => `<article class="listing"><p class="eyebrow">Approved local listing</p><h2><a href="/businesses/${encodeURIComponent(business.slug || String(business.id))}">${escapeHtml(business.name)}</a></h2><p>${escapeHtml(plainText(business.description).slice(0, 220) || `View current details for ${business.name} in ${page.municipality}.`)}</p><ul>${business.address ? `<li>${escapeHtml(business.address)}</li>` : ""}${business.phone ? `<li><a href="tel:${escapeHtml(business.phone)}">${escapeHtml(business.phone)}</a></li>` : ""}${business.website ? `<li><a href="${escapeHtml(business.website)}" rel="nofollow">Official website</a></li>` : ""}</ul></article>`).join("")
    : `<section class="empty"><p class="eyebrow">Local coverage is growing</p><h2>Help build this ${escapeHtml(page.municipality)} guide</h2><p>We have not yet published a matching approved listing for this exact topic. Browse all current ${escapeHtml(page.municipality)} listings or add a local business for editorial review.</p><div class="actions"><a class="button" href="${directoryUrl}">Browse current listings</a><a class="secondary" href="/list-your-business">Add a business</a></div></section>`;
  const faqAnswers = guidance.questions.map((_, index) => index === 0 ? "Start with the current listings and direct contact information on this page, then confirm details with the business or provider." : index === 1 ? "Availability, prices, access, and schedules can change. Contact the listed organization before making a special trip." : `Use the related ${page.municipality} guides below to compare other local categories without repeating the same search.`);
  const faq = guidance.questions.map((question, index) => `<details${index === 0 ? " open" : ""}><summary>${escapeHtml(question)}</summary><p>${escapeHtml(faqAnswers[index])}</p></details>`).join("");
  const relatedLinks = related.map(item => `<a href="${new URL(item.url).pathname}"><span>${escapeHtml(titleCase(new URL(item.url).pathname.split("/").filter(Boolean).at(-1)))}</span><small>${escapeHtml(item.primary_keyword_es)}</small></a>`).join("");
  const itemList = listings.slice(0, 12).map((business, index) => ({ "@type": "ListItem", position: index + 1, url: `${site}/businesses/${encodeURIComponent(business.slug || String(business.id))}`, name: business.name }));
  const graph = [
    { "@type": "Organization", "@id": `${site}/#organization`, name: "Spotlight Puerto Rico", url: `${site}/`, logo: { "@type": "ImageObject", url: `${site}/logo.png`, width: 830, height: 830 } },
    { "@type": "WebSite", "@id": `${site}/#website`, name: "Spotlight Puerto Rico", url: `${site}/`, publisher: { "@id": `${site}/#organization` }, inLanguage: "en" },
    { "@type": "CollectionPage", "@id": `${page.url}#page`, name: title, description, url: page.url, inLanguage: "en", isPartOf: { "@id": `${site}/#website` }, about: { "@type": "Place", name: page.municipality, containedInPlace: { "@type": "AdministrativeArea", name: "Puerto Rico" } }, primaryImageOfPage: { "@type": "ImageObject", url: `${site}/opengraph.jpg`, width: 1200, height: 630 } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Puerto Rico", item: `${site}/` }, { "@type": "ListItem", position: 2, name: page.municipality, item: `${site}${directoryUrl}` }, { "@type": "ListItem", position: 3, name: topicLabel, item: page.url }] },
    { "@type": "FAQPage", mainEntity: guidance.questions.map((question, index) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: faqAnswers[index] } })) },
  ];
  if (itemList.length) graph.push({ "@type": "ItemList", name: `${topicLabel} in ${page.municipality}`, numberOfItems: itemList.length, itemListElement: itemList });
  const schema = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#087665"><link rel="canonical" href="${page.url}"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Spotlight Puerto Rico"><meta property="og:locale" content="en_US"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${page.url}"><meta property="og:image" content="${site}/opengraph.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escapeHtml(`${topicLabel} in ${page.municipality}, Puerto Rico`)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${site}/opengraph.jpg"><script type="application/ld+json">${schema}</script><style>:root{font-family:Inter,system-ui,sans-serif;color:#15352f;background:#f5f8f6}*{box-sizing:border-box}body{margin:0}a{color:#087665}header,footer{padding:20px max(24px,5vw);background:#fff;border-bottom:1px solid #dce7e2}main{max-width:1120px;margin:auto;padding:64px 24px 80px}.crumbs{font-size:.9rem;color:#657871}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;font-weight:800;color:#087665}h1{font:700 clamp(2.7rem,7vw,5.5rem)/.95 Georgia,serif;letter-spacing:-.05em;max-width:900px;margin:18px 0}.lead{font-size:1.12rem;line-height:1.7;max-width:760px;color:#526963}.meta{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0 48px}.meta span{border-bottom:1px solid #a9beb7;padding:7px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.listing,.empty{background:white;border-top:4px solid #087665;padding:26px}.listing h2,.empty h2{font:700 1.55rem/1.15 Georgia,serif}.listing p,.listing li,.empty p{line-height:1.65;color:#526963}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.button,.secondary{padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:800}.button{background:#087665;color:white}.secondary{border:1px solid #9db4ac}.section{margin-top:64px}.section h2{font:700 2rem/1.1 Georgia,serif}.related{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1px;background:#dce7e2}.related a{background:white;padding:20px;text-decoration:none}.related span,.related small{display:block}.related span{font-weight:800}.related small{color:#657871;margin-top:6px}details{border-top:1px solid #cbdad4;padding:16px 0}summary{font-weight:800;cursor:pointer}details p{color:#526963;line-height:1.65}footer{border-top:1px solid #dce7e2;border-bottom:0;color:#657871}</style></head><body><header><a href="/"><strong>Spotlight Puerto Rico</strong></a> · <a href="/directory">Directory</a> · <a href="/list-your-business">List or claim a business</a></header><main><nav class="crumbs"><a href="/">Puerto Rico</a> › <a href="${directoryUrl}">${escapeHtml(page.municipality)}</a> › ${escapeHtml(topicLabel)}</nav><p class="eyebrow">Local guide · Guía local</p><h1>${escapeHtml(topicLabel)} in ${escapeHtml(page.municipality)}</h1><p class="lead">${escapeHtml(guidance.intro)} Explore approved listings, contact information, and related local guides for ${escapeHtml(topicLabel.toLowerCase())} in ${escapeHtml(page.municipality)}.</p><div class="meta"><span>${escapeHtml(page.municipality)}, Puerto Rico</span><span>${listings.length} matching approved listing${listings.length === 1 ? "" : "s"}</span><span>Confirm details directly</span></div><div class="grid">${cards}</div><section class="section"><p class="eyebrow">Plan with confidence</p><h2>Before you go or make contact</h2>${faq}</section><section class="section"><p class="eyebrow">Keep exploring</p><h2>More ${escapeHtml(page.municipality)} guides</h2><div class="related">${relatedLinks}</div></section></main><footer>Spotlight Puerto Rico · Local discovery across all 78 municipalities</footer></body></html>`;
  const file = join(root, "public", ...segments, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  generatedUrls.push(page.url);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${generatedUrls.map(url => `  <url><loc>${url}</loc><changefreq>weekly</changefreq></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(root, "public", "sitemap-seo-pages.xml"), sitemap);
console.log(`Generated ${generatedUrls.length} live SEO pages from the 500-page roadmap and ${businesses.length} approved businesses.`);
