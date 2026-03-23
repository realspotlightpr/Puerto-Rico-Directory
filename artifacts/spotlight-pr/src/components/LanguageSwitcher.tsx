import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <Select value={language} onValueChange={(val) => setLanguage(val as "en" | "es")}>
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
