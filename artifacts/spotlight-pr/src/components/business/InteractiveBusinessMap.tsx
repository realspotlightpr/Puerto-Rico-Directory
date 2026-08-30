import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type MapBusiness = {
  id: number;
  name: string;
  slug?: string | null;
  address?: string | null;
  municipality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  categories?: { name?: string | null } | null;
};

function markerIcon(active: boolean) {
  return divIcon({
    className: "",
    html: `<span style="display:block;width:${active ? 24 : 18}px;height:${active ? 24 : 18}px;border-radius:999px;background:${active ? "#e11d48" : "#0f766e"};border:3px solid white;box-shadow:0 2px 10px rgba(15,23,42,.35)"></span>`,
    iconSize: [active ? 24 : 18, active ? 24 : 18],
    iconAnchor: [active ? 12 : 9, active ? 12 : 9],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [center, map]);
  return null;
}

export function InteractiveBusinessMap({ business, nearby }: { business: MapBusiness; nearby: MapBusiness[] }) {
  const initial = business.latitude != null && business.longitude != null
    ? [Number(business.latitude), Number(business.longitude)] as [number, number]
    : null;
  const [center, setCenter] = useState<[number, number] | null>(initial);
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  useEffect(() => {
    if (initial) { setCenter(initial); setLocationUnavailable(false); return; }
    const query = [business.address, business.municipality, "Puerto Rico"].filter(Boolean).join(", ");
    if (!query) { setLocationUnavailable(true); return; }
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Geocoding failed")))
      .then(rows => {
        const lat = Number(rows?.[0]?.lat);
        const lon = Number(rows?.[0]?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) setCenter([lat, lon]);
        else setLocationUnavailable(true);
      })
      .catch(error => { if (error?.name !== "AbortError") setLocationUnavailable(true); });
    return () => controller.abort();
  }, [business.address, business.municipality, initial?.[0], initial?.[1]]);

  const pins = useMemo(() => nearby.filter(item => item.latitude != null && item.longitude != null), [nearby]);
  if (!center) return <div className="h-72 rounded-2xl border bg-muted/40 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">{locationUnavailable ? "Map location is not available yet. Add a complete street address from the owner dashboard." : "Loading open map…"}</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm bg-white">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-72 md:h-80 w-full z-0" aria-label={`Interactive map near ${business.name}`}>
        <Recenter center={center} />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={center} icon={markerIcon(true)}><Popup><strong>{business.name}</strong><br />You are viewing this listing.</Popup></Marker>
        {pins.map(item => (
          <Marker key={item.id} position={[Number(item.latitude), Number(item.longitude)]} icon={markerIcon(false)}>
            <Popup><strong>{item.name}</strong><br />{item.categories?.name || "Local business"}<br /><Link href={`/businesses/${item.slug || item.id}`} className="font-semibold text-primary">View on Spotlight →</Link></Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="px-4 py-3 text-xs text-muted-foreground border-t">Drag or zoom to explore. Teal pins open other Spotlight businesses.</div>
    </div>
  );
}
