import { ImageResponse } from "next/og";
import { siteConfig } from "../../site.config";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-share image, generated from the brand colours in site.config.ts. */
export default function OpenGraphImage() {
  const c = siteConfig.colors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72, background: c.primary, color: c.primaryForeground, fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, textTransform: "uppercase", opacity: 0.85 }}>Book direct</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.05 }}>{siteConfig.name}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 36, lineHeight: 1.3, opacity: 0.9, maxWidth: 950 }}>{siteConfig.tagline}</div>
        </div>
        <div style={{ display: "flex", height: 10, width: 160, background: c.accent, borderRadius: 5 }} />
      </div>
    ),
    size,
  );
}
