import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..", "..");
const output = join(repoRoot, "docs", "seo", "500-page-roadmap.csv");
const jsonOutput = join(repoRoot, "docs", "seo", "500-page-roadmap.json");

const municipalities = [
  "Adjuntas", "Aguada", "Aguadilla", "Aguas Buenas", "Aibonito", "Añasco", "Arecibo", "Arroyo",
  "Barceloneta", "Barranquitas", "Bayamón", "Cabo Rojo", "Caguas", "Camuy", "Canóvanas", "Carolina",
  "Cataño", "Cayey", "Ceiba", "Ciales", "Cidra", "Coamo", "Comerío", "Corozal", "Culebra", "Dorado",
  "Fajardo", "Florida", "Guánica", "Guayama", "Guayanilla", "Guaynabo", "Gurabo", "Hatillo", "Hormigueros",
  "Humacao", "Isabela", "Jayuya", "Juana Díaz", "Juncos", "Lajas", "Lares", "Las Marías", "Las Piedras",
  "Loíza", "Luquillo", "Manatí", "Maricao", "Maunabo", "Mayagüez", "Moca", "Morovis", "Naguabo", "Naranjito",
  "Orocovis", "Patillas", "Peñuelas", "Ponce", "Quebradillas", "Rincón", "Río Grande", "Sabana Grande",
  "Salinas", "San Germán", "San Juan", "San Lorenzo", "San Sebastián", "Santa Isabel", "Toa Alta", "Toa Baja",
  "Trujillo Alto", "Utuado", "Vega Alta", "Vega Baja", "Vieques", "Villalba", "Yabucoa", "Yauco",
];

const patterns = [
  { slug: "things-to-do", en: "things to do in {m}", es: "qué hacer en {m}", pillar: "tourism", requirement: "3 approved activities or attractions with distinct descriptions" },
  { slug: "restaurants", en: "restaurants in {m}", es: "restaurantes en {m}", pillar: "food", requirement: "2 approved restaurant listings" },
  { slug: "local-businesses", en: "local businesses in {m}", es: "negocios locales en {m}", pillar: "business", requirement: "4 approved listings across at least 2 categories" },
  { slug: "tours-and-experiences", en: "tours in {m} Puerto Rico", es: "tours en {m} Puerto Rico", pillar: "tourism", requirement: "2 approved tours or bookable experiences" },
  { slug: "shopping", en: "shopping in {m} Puerto Rico", es: "dónde comprar en {m} Puerto Rico", pillar: "shopping", requirement: "2 approved retail listings" },
  { slug: "services", en: "services near me in {m}", es: "servicios cerca de mí en {m}", pillar: "business", requirement: "3 approved service listings across at least 2 categories" },
];

const expansionPatterns = [
  { slug: "beaches", en: "beaches near {m}", es: "playas cerca de {m}", pillar: "tourism", requirement: "2 documented beaches with access and safety details" },
  { slug: "family-activities", en: "family things to do in {m}", es: "actividades familiares en {m}", pillar: "tourism", requirement: "3 documented family-suitable activities" },
  { slug: "cafes-and-bakeries", en: "cafes and bakeries in {m}", es: "cafés y panaderías en {m}", pillar: "food", requirement: "2 approved café or bakery listings" },
  { slug: "professional-services", en: "professional services in {m}", es: "servicios profesionales en {m}", pillar: "business", requirement: "2 approved professional-service listings" },
  { slug: "automotive", en: "automotive services in {m}", es: "servicios automotrices en {m}", pillar: "business", requirement: "2 approved automotive listings" },
  { slug: "home-services", en: "home services in {m}", es: "servicios para el hogar en {m}", pillar: "business", requirement: "2 approved home-service listings" },
  { slug: "beauty-and-spa", en: "beauty and spa in {m}", es: "belleza y spa en {m}", pillar: "business", requirement: "2 approved beauty or spa listings" },
];

const slugify = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const candidates = [];

for (const municipality of municipalities) {
  for (const pattern of patterns) candidates.push({ municipality, ...pattern });
}
for (const municipality of municipalities) {
  for (const pattern of expansionPatterns) candidates.push({ municipality, ...pattern });
}

const priorityMunicipalities = new Set(["San Juan", "Carolina", "Bayamón", "Ponce", "Caguas", "Mayagüez", "Arecibo", "Rincón", "Fajardo", "Río Grande", "Vieques", "Culebra", "Dorado", "Cabo Rojo", "Aguadilla", "Luquillo"]);
const rows = candidates
  .sort((a, b) => Number(priorityMunicipalities.has(b.municipality)) - Number(priorityMunicipalities.has(a.municipality)) || a.municipality.localeCompare(b.municipality) || a.slug.localeCompare(b.slug))
  .slice(0, 500)
  .map((page, index) => {
    const municipalitySlug = slugify(page.municipality);
    return {
      id: index + 1,
      priority: index < 75 ? "P1" : index < 250 ? "P2" : "P3",
      municipality: page.municipality,
      pillar: page.pillar,
      primary_keyword_en: page.en.replace("{m}", page.municipality),
      primary_keyword_es: page.es.replace("{m}", page.municipality),
      url: `https://spotlightpuertorico.com/puerto-rico/${municipalitySlug}/${page.slug}/`,
      requirement: page.requirement,
      release_status: "live",
      index_policy: "index",
    };
  });

const headers = Object.keys(rows[0]);
const csv = [headers.join(","), ...rows.map(row => headers.map(header => quote(row[header])).join(","))].join("\n") + "\n";
await mkdir(dirname(output), { recursive: true });
await Promise.all([
  writeFile(output, csv),
  writeFile(jsonOutput, JSON.stringify(rows, null, 2) + "\n"),
]);
console.log(`Wrote ${rows.length} quality-gated SEO page candidates to ${output}`);
