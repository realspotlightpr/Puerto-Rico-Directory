import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <path fill="#0d9488" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle fill="white" cx="12" cy="9" r="2.5"/>
  </svg>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

interface BusinessMapProps {
  address?: string | null;
  municipality?: string | null;
  businessName: string;
  businessId?: number;
}

const API_BASE = import.meta.env.BASE_URL || "/";

export function BusinessMap({ address, municipality, businessName, businessId }: BusinessMapProps) {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const locationQuery = [address, municipality, "Puerto Rico"].filter(Boolean).join(", ");

  useEffect(() => {
    if (!locationQuery) return;
    setIsLoading(true);
    setGeocodeFailed(false);

    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`,
      { headers: { "User-Agent": "SpotlightPR/1.0 (spotlightpuertorico.com)" } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setGeocodeFailed(true);
        }
      })
      .catch(() => setGeocodeFailed(true))
      .finally(() => setIsLoading(false));
  }, [locationQuery]);

  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(locationQuery)}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(locationQuery)}`;

  if (!address && !municipality) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {isLoading ? (
        <div className="h-52 bg-muted/60 animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading map…</p>
        </div>
      ) : coords ? (
        <div className="h-52 relative z-0">
          <MapContainer
            center={coords}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={coords} icon={pinIcon}>
              <Popup className="text-sm font-semibold">{businessName}</Popup>
            </Marker>
          </MapContainer>
        </div>
      ) : geocodeFailed ? (
        <div className="h-20 flex items-center justify-center bg-muted/40 text-muted-foreground text-sm">
          Map unavailable for this address
        </div>
      ) : null}

      <div className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Get Directions</p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (businessId && businessId > 0) {
                fetch(`${API_BASE}api/businesses/${businessId}/track-maps-click`, { method: "POST" }).catch(err => console.error("Failed to track maps click", err));
              }
            }}
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
            onClick={() => {
              if (businessId && businessId > 0) {
                fetch(`${API_BASE}api/businesses/${businessId}/track-maps-click`, { method: "POST" }).catch(err => console.error("Failed to track maps click", err));
              }
            }}
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
