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

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <Select value={language} onValueChange={handleChange}>
        <SelectTrigger className="w-[120px] rounded-lg border-border bg-transparent text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            <span className="flex items-center gap-2">{t("nav.english")}</span>
          </SelectItem>
          <SelectItem value="es">
            <span className="flex items-center gap-2">{t("nav.spanish")}</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
