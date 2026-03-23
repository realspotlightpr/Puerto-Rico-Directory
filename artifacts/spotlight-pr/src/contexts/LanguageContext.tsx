import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    "home.hero.discover": "Discover the best of Puerto Rico",
    "home.hero.title": "Find Local Businesses You Can Trust",
    "home.hero.description": "Explore restaurants, services, shops, and experiences verified by the local community across all 78 municipalities.",
    "home.hero.search": "What are you looking for?",
    "home.vibes.title": "Find the Perfect Vibe",
    "home.vibes.description": "Pick a mood and we'll find the perfect spot for you.",
    "home.towns.title": "Towns & Regions",
    "home.towns.description": "From mountain towns to coastal cities — find businesses across the island.",
    "home.featured.title": "Featured Businesses",
    "home.featured.loading": "Loading featured businesses...",
    "home.featured.empty": "No featured businesses yet.",
    "home.cta.owner": "For Business Owners",
    "home.cta.question": "Own a business in Puerto Rico?",
    "home.cta.description": "Get listed, manage your reputation, and connect with customers across all 78 municipalities — completely free.",
    "home.cta.list": "Add Your Business Free",
    "home.cta.postcard": "📬 Postcard Marketing",
    "home.cta.explore": "Explore Directory",
    "nav.language": "Language",
    "nav.english": "English",
    "nav.spanish": "Español",
  },
  es: {
    "home.hero.discover": "Descubre lo mejor de Puerto Rico",
    "home.hero.title": "Encuentra Negocios Locales en los que Confiar",
    "home.hero.description": "Explora restaurantes, servicios, tiendas y experiencias verificadas por la comunidad local en los 78 municipios.",
    "home.hero.search": "¿Qué estás buscando?",
    "home.vibes.title": "Encuentra el Ambiente Perfecto",
    "home.vibes.description": "Elige un ambiente y te encontraremos el lugar perfecto.",
    "home.towns.title": "Pueblos y Regiones",
    "home.towns.description": "Desde pueblos montañosos hasta ciudades costeras — encuentra negocios en toda la isla.",
    "home.featured.title": "Negocios Destacados",
    "home.featured.loading": "Cargando negocios destacados...",
    "home.featured.empty": "Sin negocios destacados todavía.",
    "home.cta.owner": "Para Dueños de Negocios",
    "home.cta.question": "¿Tienes un negocio en Puerto Rico?",
    "home.cta.description": "Aparece en el directorio, gestiona tu reputación y conecta con clientes en los 78 municipios — completamente gratis.",
    "home.cta.list": "Añade tu Negocio Gratis",
    "home.cta.postcard": "📬 Marketing de Tarjetas",
    "home.cta.explore": "Explorar Directorio",
    "nav.language": "Idioma",
    "nav.english": "English",
    "nav.spanish": "Español",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize from localStorage or browser detection
    if (typeof window === "undefined") return "en";
    
    const stored = localStorage.getItem("language") as Language | null;
    if (stored && (stored === "en" || stored === "es")) {
      return stored;
    }
    
    // Auto-detect from browser
    const browserLang = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
    const detected = browserLang.startsWith("es") ? "es" : "en";
    return detected;
  });

  // Save to localStorage when language changes
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
