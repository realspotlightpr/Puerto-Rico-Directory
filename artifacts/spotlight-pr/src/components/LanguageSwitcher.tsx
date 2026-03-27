import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

declare global {
  interface Window {
    doGTranslate?: (lang: string) => void;
  }
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  function handleChange(val: string) {
    const lang = val as "en" | "es";
    setLanguage(lang);
    if (typeof window.doGTranslate === "function") {
      window.doGTranslate(`en|${lang}`);
    }
  }

  return null;
}
