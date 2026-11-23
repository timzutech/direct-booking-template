/**
 * site.config.ts — the single source of client-specific branding.
 *
 * To rebrand this template for a new client, edit this file and the database
 * content (properties, photos, testimonials, guide, policies). Nothing else in
 * the codebase should contain client-specific details.
 */

export const siteConfig = {
  /** Business identity */
  name: "Jupiter Tide Stays",
  shortName: "Jupiter Tide",
  tagline: "Thoughtfully kept homes for slow mornings and long weekends.",
  description:
    "Book direct with your hosts for the best rate — no platform service fees, flexible stays, and a real person on the other end.",
  /** Shown on the About page. Plain text; blank lines separate paragraphs. */
  about: `We are a small, family-run collection of holiday homes. Every stay is prepared by us, not a call centre — from the fresh linens to the handwritten list of places we actually eat.

Booking direct means you deal with us from the first question to the last goodbye, and you never pay a platform service fee.`,

  /** Public site URL, without trailing slash. NEXT_PUBLIC_SITE_URL overrides this. */
  url: "https://direct-booking-jupiter.vercel.app",

  /** Logo: path inside /public, or null to render the business name as a wordmark. */
  logo: null as string | null,
  /** Hero photo on the home page: path inside /public or a full image URL. */
  heroImage: "https://images.unsplash.com/photo-1574514342513-f739e07c81cf?auto=format&fit=crop&w=2000&q=75",
  heroImageAlt: "A wooden house beside a lake at sunset",

  /**
   * Brand colours (any valid CSS colour).
   * Keep `primary`/`primaryForeground` and `ink`/`background` at a contrast
   * ratio of at least 4.5:1 for accessibility.
   */
  colors: {
    primary: "#2f4a3c", // buttons, links, accents
    primaryForeground: "#ffffff", // text on primary
    accent: "#8f5426", // small highlights (stars, eyebrow text); needs 4.5:1 contrast on background and muted
    background: "#faf7f2", // page background
    surface: "#ffffff", // cards
    muted: "#f0ebe2", // subtle section backgrounds
    ink: "#1f2421", // main text
    inkSoft: "#59605b", // secondary text
    border: "#e2dbcf",
  },

  /**
   * Fonts. `heading` and `body` each pick one of the fonts registered in
   * src/lib/fonts.ts (add another Google font there if a client needs it).
   */
  fonts: {
    heading: "cormorant",
    body: "inter",
  } as { heading: FontKey; body: FontKey },

  /** Contact details */
  contact: {
    email: "support@jupitertide.com", // shown publicly; also the default host notification address
    phone: "+1 (555) 010-2030",
    address: "Lake Country & the Coast",
  },

  /** Social links — leave a value empty ("") to hide it. */
  social: {
    instagram: "https://instagram.com/",
    facebook: "",
    tiktok: "",
    airbnb: "",
  },

  /** Money and time */
  currency: "USD", // ISO 4217; must be a currency the client's Stripe account can charge
  locale: "en-US", // number/date formatting
  timezone: "America/New_York", // used to decide what "today" is for bookings

  /** Defaults used when a property does not set its own value. */
  defaults: {
    checkInTime: "16:00",
    checkOutTime: "10:00",
  },

  /**
   * Default policy texts. The host can override each of these in
   * Admin → Content; the values here are the fallback.
   * Plain text; blank lines separate paragraphs, lines starting with "- " become bullets.
   */
  policies: {
    houseRules: `- No smoking anywhere inside the home.
- No parties or events.
- Quiet hours are 10pm to 8am.
- Only registered guests may stay overnight.
- Please treat the home, and the neighbours, with care.`,
    cancellation: `Full refund for cancellations made at least 30 days before check-in.

50% refund for cancellations made between 30 and 14 days before check-in.

Cancellations made within 14 days of check-in are non-refundable. We strongly recommend travel insurance.`,
    terms: `By booking you agree to the house rules and cancellation policy shown on this site. The guest making the booking must be at least 25 years old and is responsible for all members of the party.

Payment is taken in full at the time of booking. Damage beyond normal wear and tear may be charged to the guest.`,
    privacy: `We collect only the details needed to manage your stay: your name, email address, phone number and booking details. Payments are processed securely by Stripe; we never see or store your card number.

We may email you about your booking and, occasionally, about future stays. You can ask us to delete your details at any time by contacting us.`,
  },
};

export type FontKey = "cormorant" | "playfair" | "fraunces" | "inter" | "dm-sans" | "lora";
export type SiteConfig = typeof siteConfig;
