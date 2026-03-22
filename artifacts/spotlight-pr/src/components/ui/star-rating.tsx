import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ 
  rating, 
  max = 5, 
  size = 16, 
  className, 
  onChange,
  readonly = true 
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }).map((_, i) => {
        const fillValue = rating - i;
        const isInteractive = !readonly && onChange;
        
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => isInteractive && onChange(i + 1)}
            className={cn(
              "transition-all duration-200", 
              isInteractive ? "hover:scale-110 cursor-pointer" : "cursor-default"
            )}
          >
            {fillValue >= 1 ? (
              <Star 
                size={size} 
                className="fill-accent text-accent" 
              />
            ) : fillValue >= 0.5 ? (
              <div className="relative">
                <Star size={size} className="text-muted-foreground/30" />
                <div className="absolute inset-0 overflow-hidden w-[50%]">
                  <Star size={size} className="fill-accent text-accent" />
                </div>
              </div>
            ) : (
              <Star size={size} className={isInteractive ? "text-muted-foreground/30 hover:text-accent/50" : "text-muted-foreground/30"} />
            )}
          </button>
        );
      })}
    </div>
  );
}
