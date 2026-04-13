import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface BusinessMapProps {
  address?: string | null;
  municipality?: string | null;
  businessName: string;
  businessId?: number;
}

const API_BASE = import.meta.env.BASE_URL || "/";

export function BusinessMap({ address, municipality, businessName, businessId }: BusinessMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const locationQuery = [address, municipality, "Puerto Rico"].filter(Boolean).join(", ");

  useEffect(() => {
    if (!locationQuery) return;
    setIsLoading(true);
    setGeocodeFailed(false);
    setCoords(null);

    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&countrycodes=us`
        );
        const data = await res.json();
        if (!data?.[0]) {
          setGeocodeFailed(true);
          return;
        }
        const lat = Number.parseFloat(data[0].lat);
        const lon = Number.parseFloat(data[0].lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          setGeocodeFailed(true);
          return;
        }
        setCoords({ lat, lon });
      } catch {
        setGeocodeFailed(true);
      } finally {
        setIsLoading(false);
      }
    };

    void geocode();
  }, [locationQuery]);

  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(locationQuery)}`;
  const appleMapsUrl  = `https://maps.apple.com/?q=${encodeURIComponent(locationQuery)}`;

  const trackClick = () => {
    if (businessId && businessId > 0) {
      fetch(`${API_BASE}api/businesses/${businessId}/track-maps-click`, { method: "POST" }).catch(() => {});
    }
  };

  const osmEmbed = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.006},${coords.lat - 0.004},${coords.lon + 0.006},${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat},${coords.lon}`
    : null;

  if (!address && !municipality) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {isLoading ? (
        <div className="h-52 bg-muted/60 animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading map…</p>
        </div>
      ) : osmEmbed ? (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-52 relative group"
          onClick={trackClick}
        >
          <iframe
            src={osmEmbed}
            title={`Map of ${businessName}`}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-3 left-3 bg-white/90 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 shadow flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            View on map
          </div>
        </a>
      ) : geocodeFailed ? (
        <div className="h-52 flex items-center justify-center bg-muted/40 text-muted-foreground text-sm px-4 text-center">
          Unable to load the map for this address
        </div>
      ) : null}

      <div className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Get Directions</p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#4285F4] hover:bg-[#3367d6] text-white text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
              <path fill="#fff" d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm0 36c-8.8 0-16-7.2-16-16S15.2 8 24 8s16 7.2 16 16-7.2 16-16 16z"/>
              <path fill="#fff" d="M24 14a10 10 0 100 20 10 10 0 000-20zm0 16a6 6 0 110-12 6 6 0 010 12z"/>
            </svg>
            Google Maps
          </a>
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition-colors"
          >
            <svg width="13" height="16" viewBox="0 0 13 16" fill="white">
              <path d="M6.5 0C4.015 0 2 2.015 2 4.5 2 7.875 6.5 13 6.5 13S11 7.875 11 4.5C11 2.015 8.985 0 6.5 0zm0 6.5C5.395 6.5 4.5 5.605 4.5 4.5S5.395 2.5 6.5 2.5 8.5 3.395 8.5 4.5 7.605 6.5 6.5 6.5z"/>
              <rect x="1" y="14" width="11" height="2" rx="1"/>
            </svg>
            Apple Maps
          </a>
        </div>
      </div>
    </div>
  );
}
