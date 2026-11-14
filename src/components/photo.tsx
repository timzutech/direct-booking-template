import Image, { type ImageProps } from "next/image";

/**
 * next/image wrapper. SVG placeholders are served as-is; everything else is
 * resized and converted to AVIF/WebP by the image optimiser.
 */
export function Photo({ src, alt, ...rest }: Omit<ImageProps, "src" | "alt"> & { src: string; alt: string }) {
  const isSvg = src.split("?")[0].toLowerCase().endsWith(".svg");
  return <Image src={src} alt={alt} unoptimized={isSvg} {...rest} />;
}
