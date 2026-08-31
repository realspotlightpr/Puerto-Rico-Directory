import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const dist=join(root,"dist","public");
const output=join(dist,"businesses");
const site="https://spotlightpuertorico.com";
const supabaseUrl=process.env.VITE_SUPABASE_URL||"https://zswvumzbtikzvwgtpprw.supabase.co";
const anonKey=process.env.VITE_SUPABASE_ANON_KEY;
if(!anonKey)throw new Error("VITE_SUPABASE_ANON_KEY is required to generate business SEO pages.");

const fields="id,name,slug,description,municipality,address,phone,email,website,logo_url,cover_url,social_links,latitude,longitude,updated_at,status,is_claimed,average_rating,review_count,categories(name)";
const response=await fetch(`${supabaseUrl}/rest/v1/businesses?select=${encodeURIComponent(fields)}&status=eq.approved&order=name.asc&limit=1000`,{headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`}});
if(!response.ok)throw new Error(`Business fetch failed: ${response.status} ${await response.text()}`);
const businesses=await response.json();
const appShell=await readFile(join(dist,"index.html"),"utf8");

const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const plainText=value=>String(value??"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const schemaType=category=>/restaurant|food|cafe|bakery/i.test(category||"")?"Restaurant":/hotel|lodging/i.test(category||"")?"LodgingBusiness":"LocalBusiness";
const cleanShell=appShell
  .replace(/\s*<title>[\s\S]*?<\/title>/i,"")
  .replace(/\s*<meta name="description"[^>]*>/gi,"")
  .replace(/\s*<meta name="robots"[^>]*>/gi,"")
  .replace(/\s*<link rel="canonical"[^>]*>/gi,"")
  .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi,"")
  .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi,"")
  .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,"");

for(const business of businesses){
  const slug=business.slug||String(business.id),category=business.categories?.name||"Local Business",municipality=business.municipality||"Puerto Rico";
  const description=plainText(business.description)||`${business.name} is a ${category.toLowerCase()} listed in ${municipality}, Puerto Rico. View current contact, location, reviews, and listing details on Spotlight Puerto Rico.`;
  const title=`${business.name} in ${municipality}, Puerto Rico | Spotlight Puerto Rico`,canonical=`${site}/businesses/${encodeURIComponent(slug)}`,image=business.cover_url||business.logo_url||`${site}/opengraph.jpg`;
  const sameAs=[business.website,...Object.values(business.social_links||{})].filter(value=>typeof value==="string"&&/^https?:\/\//i.test(value));
  const localBusiness={"@type":schemaType(category),"@id":`${canonical}#business`,name:business.name,description,url:canonical,image,logo:business.logo_url||undefined,address:{"@type":"PostalAddress",streetAddress:business.address||undefined,addressLocality:business.municipality||undefined,addressRegion:"PR",addressCountry:"US"},telephone:business.phone||undefined,email:business.email||undefined,sameAs:sameAs.length?[...new Set(sameAs)]:undefined};
  if(Number.isFinite(Number(business.latitude))&&Number.isFinite(Number(business.longitude)))localBusiness.geo={"@type":"GeoCoordinates",latitude:Number(business.latitude),longitude:Number(business.longitude)};
  if(Number(business.average_rating)>0&&Number(business.review_count)>0)localBusiness.aggregateRating={"@type":"AggregateRating",ratingValue:Number(business.average_rating),reviewCount:Number(business.review_count)};
  const jsonLd={"@context":"https://schema.org","@graph":[localBusiness,{"@type":"WebPage","@id":`${canonical}#webpage`,url:canonical,name:title,description:description.slice(0,200),inLanguage:"en",dateModified:business.updated_at||undefined,mainEntity:{"@id":`${canonical}#business`},isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Puerto Rico",item:`${site}/`},{"@type":"ListItem",position:2,name:"Business Directory",item:`${site}/directory`},{"@type":"ListItem",position:3,name:business.name,item:canonical}]}]};
  const imageAlt=`${business.name} in ${municipality}, Puerto Rico`;
  const seo=`<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description.slice(0,160))}"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#087665"><link rel="canonical" href="${canonical}"><meta property="og:type" content="business.business"><meta property="og:site_name" content="Spotlight Puerto Rico"><meta property="og:locale" content="en_US"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description.slice(0,200))}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(imageAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description.slice(0,200))}"><meta name="twitter:image" content="${escapeHtml(image)}"><meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}"><script id="spotlight-business-schema" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,"\\u003c")}</script>`;
  const html=cleanShell.replace("</head>",`${seo}</head>`);
  const file=join(output,slug,"index.html");await mkdir(dirname(file),{recursive:true});await writeFile(file,html);
}

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${businesses.map(b=>`  <url><loc>${site}/businesses/${encodeURIComponent(b.slug||String(b.id))}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(dist,"sitemap-businesses.xml"),sitemap);
console.log(`Generated ${businesses.length} approved business SEO app shells and sitemap entries.`);
