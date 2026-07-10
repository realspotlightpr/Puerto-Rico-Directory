import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { MapPin, Compass, Heart, Star, ArrowRight, ArrowLeft, Check } from "lucide-react";

const IMG = "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places";

type Slide = {
  image: string;
  icon: JSX.Element;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    image: `${IMG}/24.jpg`,
    icon: <Compass className="w-6 h-6" />,
    title: "Welcome to Spotlight Puerto Rico 🇵🇷",
    body: "Your guide to discovering the best of the island — from hidden beaches to the local spots that make Puerto Rico special.",
  },
  {
    image: `${IMG}/7.jpg`,
    icon: <MapPin className="w-6 h-6" />,
    title: "Explore places & local businesses",
    body: "Beaches, waterfalls, caves, restaurants, shops and services across all 78 municipalities — all in one place.",
  },
  {
    image: `${IMG}/18.jpg`,
    icon: <Heart className="w-6 h-6" />,
    title: "Save your favorites",
    body: "Keep a list of the places you love and want to visit, so they're always a tap away when you're ready to go.",
  },
  {
    image: `${IMG}/1.jpg`,
    icon: <Star className="w-6 h-6" />,
    title: "Support local with a review",
    body: "Share your experiences to help other travelers and lift up the local businesses doing great work. It's what makes the community thrive.",
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const firstName = user?.firstName;

  const finish = () => setLocation("/directory");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-border overflow-hidden">

        {/* Image */}
        <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-muted">
          <img src={s.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <button
            onClick={finish}
            className="absolute top-3 right-4 text-white/90 text-sm font-medium hover:text-white transition-colors"
          >
            Skip
          </button>
          <div className="absolute -bottom-6 left-6 w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary">
            {s.icon}
          </div>
        </div>

        {/* Text */}
        <div className="px-6 pt-10 pb-6">
          {i === 0 && firstName && (
            <p className="text-sm font-semibold text-primary mb-1">Hi {firstName}! 👋</p>
          )}
          <h1 className="font-display text-2xl font-bold text-foreground leading-tight mb-2">{s.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-6 mb-6">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25"}`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {i > 0 && (
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => setI(i - 1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {last ? (
              <Button className="flex-1 rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={finish}>
                <Check className="w-4 h-4" /> Start exploring
              </Button>
            ) : (
              <Button className="flex-1 rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={() => setI(i + 1)}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
