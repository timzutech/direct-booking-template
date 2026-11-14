import type { MetadataRoute } from "next";
import { getProperties } from "@/lib/data";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const properties = await getProperties();
  const pages = ["", "/properties", "/guide", "/about", "/contact", "/policies"];
  return [
    ...pages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path === "/properties" ? 0.9 : 0.5,
    })),
    ...properties.map((p) => ({
      url: `${base}/properties/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
