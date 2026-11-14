import { ImageResponse } from "next/og";
import { siteConfig } from "../../site.config";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the first letter of the business name on the brand colour. Replace with src/app/icon.png for a client logo. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          background: siteConfig.colors.primary, color: siteConfig.colors.primaryForeground, fontSize: 42, fontFamily: "serif", borderRadius: 14,
        }}
      >
        {siteConfig.shortName.charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
