import { useState, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Wand2, Loader2, Download, Save, ImagePlus, Sparkles, Check, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ImageStudioProps {
  businessId: number;
  businessName: string;
  onImageSaved?: () => void;
}

type AspectRatio = "1024x1024" | "1792x1024" | "1024x1792";

const RATIO_OPTIONS: { value: AspectRatio; label: string; description: string }[] = [
  { value: "1024x1024", label: "Square (1:1)", description: "Great for logos & profiles" },
  { value: "1792x1024", label: "Landscape (16:9)", description: "Perfect for covers & banners" },
  { value: "1024x1792", label: "Portrait (9:16)", description: "Ideal for stories & reels" },
];

const PROMPT_SUGGESTIONS = [
  "A professional storefront photo of my business with warm lighting",
  "A team working together in a modern office environment",
  "Beautiful food presentation on an elegant restaurant table",
  "A cozy local coffee shop with Puerto Rican cultural elements",
  "Professional product photography with clean white background",
  "An inviting retail store interior with good lighting",
];

interface GeneratedImage {
  b64_json: string;
  dataUrl: string;
  prompt: string;
  size: AspectRatio;
  savedItemId?: number;
}

export function ImageStudio({ businessId, businessName, onImageSaved }: ImageStudioProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<AspectRatio>("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const generateImage = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const token = await getToken();
      const fullPrompt = `${prompt.trim()} — professional image for a Puerto Rico business called "${businessName}"`;
      const res = await fetch("/api/openai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: fullPrompt, size, businessId }),
      });

      if (!res.ok) throw new Error("Image generation failed");
      const { b64_json } = await res.json();
      const dataUrl = `data:image/png;base64,${b64_json}`;

      setGeneratedImages(prev => [{
        b64_json,
        dataUrl,
        prompt: prompt.trim(),
        size,
      }, ...prev.slice(0, 5)]);
    } catch {
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, size, businessId, businessName, getToken, toast, isGenerating]);

  const saveToLibrary = useCallback(async (img: GeneratedImage, index: number) => {
    if (isSaving !== null) return;
    setIsSaving(index);
    try {
      const token = await getToken();
      const res = await fetch("/api/media/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId,
          url: img.dataUrl,
          prompt: img.prompt,
          size: img.size,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setGeneratedImages(prev =>
        prev.map((item, i) => i === index ? { ...item, savedItemId: -1 } : item)
      );

      toast({ title: "Saved to Media Library!", description: "You can find it in the Media Library tab." });
      onImageSaved?.();
    } catch {
      toast({ title: "Save failed", description: "Could not save to library", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  }, [isSaving, businessId, getToken, toast, onImageSaved]);

  const downloadImage = useCallback((img: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = img.dataUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}-ai-image.png`;
    link.click();
  }, [businessName]);

  return (
    <div className="flex flex-col gap-6">
      {/* Generator Panel */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold font-display text-foreground">Image Studio</h2>
            <p className="text-xs text-muted-foreground">Generate AI images for your business</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Describe your image</label>
            <Textarea
              className="rounded-xl min-h-[100px] resize-none"
              placeholder="e.g. A professional photo of my restaurant's signature dish with elegant plating..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Prompt Suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick ideas:</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  {s.length > 40 ? s.slice(0, 40) + "…" : s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Aspect Ratio</label>
            <Select value={size} onValueChange={(v) => setSize(v as AspectRatio)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIO_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={generateImage}
            disabled={!prompt.trim() || isGenerating}
            className="w-full rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate Image</>
            )}
          </Button>
        </div>
      </div>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h3 className="font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-primary" /> Generated Images
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedImages.map((img, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-border shadow-sm">
                <img
                  src={img.dataUrl}
                  alt={img.prompt}
                  className="w-full aspect-square object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                  <div className="w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 rounded-lg gap-1.5 text-xs"
                      onClick={() => downloadImage(img)}
                    >
                      <Download className="w-3 h-3" /> Download
                    </Button>
                    {img.savedItemId ? (
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600"
                        disabled
                      >
                        <Check className="w-3 h-3" /> Saved
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg gap-1.5 text-xs"
                        onClick={() => saveToLibrary(img, idx)}
                        disabled={isSaving !== null}
                      >
                        {isSaving === idx ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>
                </div>
                {/* Prompt badge */}
                <div className="absolute top-2 left-2 right-2">
                  <Badge className="text-xs bg-black/60 text-white border-0 truncate max-w-full block">
                    {img.prompt.length > 50 ? img.prompt.slice(0, 50) + "…" : img.prompt}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>Generated images are created using DALL-E AI. Save images to your Media Library to use them as your logo, cover photo, or in social posts.</p>
      </div>
    </div>
  );
}
