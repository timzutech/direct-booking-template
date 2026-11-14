import { Cormorant_Garamond, DM_Sans, Fraunces, Inter, Lora, Playfair_Display } from "next/font/google";
import type { FontKey } from "../../site.config";

/**
 * Font registry. site.config.ts picks a heading and a body font by key.
 * To offer another Google font, import it here, add it to `fonts`, and add
 * its key to `FontKey` in site.config.ts.
 * (next/font requires these calls to be literal, so they cannot be generated from config.)
 */
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], display: "swap", preload: false, variable: "--font-cormorant" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });

const fonts: Record<FontKey, { variable: string; cssVar: string; fallback: string }> = {
  cormorant: { variable: cormorant.variable, cssVar: "--font-cormorant", fallback: "Georgia, serif" },
  playfair: { variable: playfair.variable, cssVar: "--font-playfair", fallback: "Georgia, serif" },
  fraunces: { variable: fraunces.variable, cssVar: "--font-fraunces", fallback: "Georgia, serif" },
  lora: { variable: lora.variable, cssVar: "--font-lora", fallback: "Georgia, serif" },
  inter: { variable: inter.variable, cssVar: "--font-inter", fallback: "system-ui, sans-serif" },
  "dm-sans": { variable: dmSans.variable, cssVar: "--font-dm-sans", fallback: "system-ui, sans-serif" },
};

/** Class names + CSS variable values for the two fonts chosen in site.config.ts. */
export function resolveFonts(heading: FontKey, body: FontKey) {
  const h = fonts[heading] ?? fonts.cormorant;
  const b = fonts[body] ?? fonts.inter;
  return {
    className: `${h.variable} ${b.variable}`,
    headingStack: `var(${h.cssVar}), ${h.fallback}`,
    bodyStack: `var(${b.cssVar}), ${b.fallback}`,
  };
}
