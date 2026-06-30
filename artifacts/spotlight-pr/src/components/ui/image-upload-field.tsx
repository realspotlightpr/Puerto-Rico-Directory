import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  aspectRatio?: "square" | "wide";
  className?: string;
}

const BUCKET = "business-media";

export function ImageUploadField({
  value,
  onChange,
  label,
  hint,
  aspectRatio = "wide",
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadToStorage = async (file: File) => {
    setIsUploading(true);
    setProgress(25);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? "public";
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      setProgress(60);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setProgress(100);
      onChange(data.publicUrl);
      setUploadError(null);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed. Please try again.");
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (JPG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be smaller than 10 MB.");
      return;
    }

    setUploadError(null);
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    await uploadToStorage(file);
    URL.revokeObjectURL(preview);
  };

  const displayUrl = localPreview ?? value;
  const isSquare = aspectRatio === "square";

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setLocalPreview(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium leading-none">{label}</div>

      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer group",
          isUploading
            ? "border-primary/50 bg-primary/5 cursor-wait"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          isSquare ? "aspect-square max-w-[160px]" : "aspect-video w-full"
        )}
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
            {!isUploading && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1.5 text-white">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-semibold">Change</span>
                </div>
              </div>
            )}
            {!isUploading && (
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ImageIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Upload image</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click to browse files</p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <div className="w-3/4 bg-white/30 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-white text-xs font-medium">Uploading…</p>
          </div>
        )}
      </div>

      {hint && !uploadError && <p className="text-xs text-muted-foreground">{hint}</p>}
      {uploadError && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
}
