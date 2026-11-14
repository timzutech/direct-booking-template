import type { MetadataRoute } from "next";
import { isDemoMode, siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // Spec demos (DEMO_MODE=true) are kept out of search engines entirely.
  if (isDemoMode()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/booking/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
