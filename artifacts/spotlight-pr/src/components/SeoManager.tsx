import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE_URL = "https://spotlightpuertorico.com";
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;

type SeoPage = {
  title: string;
  description: string;
};

const publicPages: Record<string, SeoPage> = {
  "/": {
    title: "Spotlight Puerto Rico | Local Businesses, Places & Experiences",
    description: "Discover local businesses, beaches, waterfalls, surf spots, and guided experiences across all 78 municipalities of Puerto Rico.",
  },
  "/directory": {
    title: "Puerto Rico Business Directory | Spotlight Puerto Rico",
    description: "Find trusted restaurants, shops, services, and local businesses across Puerto Rico's 78 municipalities.",
  },
  "/activities": {
    title: "Things to Do in Puerto Rico | Spotlight Puerto Rico",
    description: "Explore Puerto Rico beaches, waterfalls, caves, landmarks, and locally recommended places by region.",
  },
  "/experiences": {
    title: "Puerto Rico Tours & Local Experiences | Spotlight Puerto Rico",
    description: "Discover guided tours and local experiences across Puerto Rico, from El Yunque adventures to coastal excursions.",
  },
  "/surf": {
    title: "Puerto Rico Surf Spots & Conditions | Spotlight Puerto Rico",
    description: "Explore Puerto Rico surf spots, local conditions, and practical information for planning your next session.",
  },
  "/blog": {
    title: "Puerto Rico Travel Tips & Local Guides | Spotlight Puerto Rico",
    description: "Read practical Puerto Rico travel guides, realistic itineraries, and local-first recommendations.",
  },
  "/business": {
    title: "Grow Your Puerto Rico Business | Spotlight Puerto Rico",
    description: "List and promote your Puerto Rico business, reach local customers and visitors, and manage your directory presence.",
  },
  "/list-your-business": {
    title: "List Your Business in Puerto Rico | Spotlight Puerto Rico",
    description: "Add your local business to Spotlight Puerto Rico and connect with customers across the island.",
  },
  "/for-guides": {
    title: "Join Spotlight Puerto Rico as a Local Guide",
    description: "Offer authentic guided experiences and reach travelers looking for local expertise in Puerto Rico.",
  },
  "/advertise": {
    title: "Advertise with Spotlight Puerto Rico",
    description: "Reach residents and visitors actively discovering local businesses, places, and experiences across Puerto Rico.",
  },
  "/services": {
    title: "Marketing Services for Puerto Rico Businesses | Spotlight Puerto Rico",
    description: "Build a stronger digital presence with website, content, social media, and lead-generation services.",
  },
  "/spotlight-plus": {
    title: "Spotlight Plus for Puerto Rico Businesses",
    description: "Upgrade your Spotlight Puerto Rico listing with expanded visibility and promotional tools.",
  },
  "/terms": {
    title: "Terms of Service | Spotlight Puerto Rico",
    description: "Terms governing use of the Spotlight Puerto Rico platform.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Spotlight Puerto Rico",
    description: "Learn how Spotlight Puerto Rico collects, uses, and protects information.",
  },
};

const privatePrefixes = [
  "/admin", "/dashboard", "/team", "/guide", "/manage", "/messages",
  "/profile", "/saved", "/plans", "/verify-email", "/pass/success",
  "/business/success", "/influencer", "/welcome", "/launch",
];

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const path = location.split("?")[0].replace(/\/$/, "") || "/";
    const page = publicPages[path];
    const isPrivate = privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    const isBusiness = path.startsWith("/businesses/");
    const isActivity = path.startsWith("/activities/");
    const isExperience = path.startsWith("/experiences/");
    const isSurf = path.startsWith("/surf/");
    const isBlog = path.startsWith("/blog/");
    const isPublicDetail = isBusiness || isActivity || isExperience || isSurf || isBlog;

    const fallback: SeoPage = isBusiness
      ? { title: "Local Business in Puerto Rico | Spotlight Puerto Rico", description: "View business details, location, reviews, and contact information on Spotlight Puerto Rico." }
      : isActivity
        ? { title: "Puerto Rico Place Guide | Spotlight Puerto Rico", description: "Explore a locally recommended place in Puerto Rico with practical details for your visit." }
        : isExperience
          ? { title: "Puerto Rico Experience | Spotlight Puerto Rico", description: "View details for a guided local experience in Puerto Rico." }
          : isSurf
            ? { title: "Puerto Rico Surf Spot | Spotlight Puerto Rico", description: "View surf conditions and local information for this Puerto Rico surf spot." }
            : { title: "Spotlight Puerto Rico", description: "Discover Puerto Rico through local businesses, places, experiences, and practical island guides." };

    const seo = page || fallback;
    const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;

    document.title = seo.title;
    upsertMeta('meta[name="description"]', "name", "description", seo.description);
    upsertMeta('meta[name="robots"]', "name", "robots", isPrivate ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    upsertMeta('meta[property="og:title"]', "property", "og:title", seo.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", seo.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    if (!page && !isPublicDetail && !isPrivate) {
      upsertMeta('meta[name="robots"]', "name", "robots", "noindex, follow");
    }
  }, [location]);

  return null;
}
