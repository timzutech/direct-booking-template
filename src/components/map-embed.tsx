/**
 * OpenStreetMap embed (no API key needed). Shows the neighbourhood rather than
 * a pin on the exact address, which is only shared after booking.
 */
export function MapEmbed({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const lat = Math.round(latitude * 100) / 100;
  const lon = Math.round(longitude * 100) / 100;
  const d = 0.03;
  const bbox = [lon - d * 1.6, lat - d, lon + d * 1.6, lat + d].map((n) => n.toFixed(4)).join(",");
  return (
    <figure>
      <iframe
        title={`Map of the area around ${label}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-80 w-full rounded-2xl border border-line"
      />
      <figcaption className="mt-2 text-sm text-ink-soft">
        {label}. The exact address is shared after booking.
      </figcaption>
    </figure>
  );
}
