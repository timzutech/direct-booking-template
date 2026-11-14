import type { SVGProps } from "react";

/** Small stroke icon set. Amenities reference these by key (amenities.icon). */
const paths: Record<string, React.ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  wifi: <><path d="M2.5 9a14 14 0 0119 0" /><path d="M6 12.5a9 9 0 0112 0" /><path d="M9.3 16a4.2 4.2 0 015.4 0" /><circle cx="12" cy="19" r=".6" fill="currentColor" /></>,
  kitchen: <><path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10" /><path d="M17 3c-1.7 1-3 3.5-3 7h3zm0 7v11" /></>,
  washer: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4.5" /><path d="M7.5 6.5h.01M10.5 6.5h.01" /></>,
  parking: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M10 16V8h2.8a2.4 2.4 0 010 4.8H10" /></>,
  snowflake: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />,
  flame: <path d="M12 21c3.6 0 6-2.5 6-6 0-3-2-5-3-7.5-.5 2-1.5 3-2.5 3.500C12.5 8 12 5 9.5 3c.3 3.2-3.5 5.5-3.5 10 0 4.5 2.4 8 6 8z" />,
  "hot-tub": <><path d="M4 13h16v4a3 3 0 01-3 3H7a3 3 0 01-3-3z" /><path d="M8 9c0-1.5 1.5-1.5 1.5-3S8 4.5 8 3M12 9c0-1.5 1.5-1.5 1.5-3S12 4.5 12 3M16 9c0-1.5 1.5-1.5 1.5-3S16 4.5 16 3" /></>,
  water: <path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />,
  grill: <><path d="M5 9h14a7 7 0 01-14 0z" /><path d="M9 15.500L7 21M15 15.500L17 21M9 3v3M12 3v3M15 3v3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.500v2M12 19.500v2M2.5 12h2M19.5 12h2M5.3 5.300l1.4 1.400M17.3 17.300l1.4 1.400M5.3 18.700l1.4-1.400M17.3 6.700l1.4-1.4" /></>,
  desk: <><path d="M3 8h18M5 8v11M19 8v11M12 8v6h7" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /></>,
  coffee: <><path d="M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5z" /><path d="M16 10h1.500a2.5 2.5 0 010 5H16M8 3v2.500M12 3v2.5" /></>,
  paw: <><circle cx="7" cy="9" r="1.7" /><circle cx="12" cy="6.5" r="1.7" /><circle cx="17" cy="9" r="1.7" /><path d="M12 12c-2.8 0-5 2.2-5 4.5 0 1.5 1.2 2.5 2.5 2.5 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.3 0 2.5-1 2.5-2.5 0-2.3-2.2-4.5-5-4.500z" /></>,
  baby: <><circle cx="12" cy="8" r="4.5" /><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 4.800a3.5 3.5 0 010 6.400M18 14.500c2 .800 3.5 2.7 3.5 5.5" /></>,
  bed: <><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5" /><circle cx="7" cy="11" r="1.8" /></>,
  bath: <><path d="M3 12h18v2a5 5 0 01-5 5H8a5 5 0 01-5-5z" /><path d="M6 12V6a2.5 2.5 0 015 0M7 19l-1 2M17 19l1 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.500a7 7 0 10-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  star: <path d="M12 3.500l2.6 5.4 5.9.800-4.3 4.1 1 5.800L12 16.900l-5.2 2.7 1-5.8-4.3-4.1 5.9-.800z" fill="currentColor" stroke="none" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  "chevron-left": <path d="M14.5 6l-6 6 6 6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  phone: <path d="M5 4h4l1.5 4.5-2 1.500a12 12 0 005.5 5.500l1.5-2L20 15v4a1.5 1.5 0 01-1.5 1.500C10.5 20.5 3.5 13.5 3.5 5.500A1.5 1.5 0 015 4z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  shield: <path d="M12 3l7.5 3v5.500c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.500V6z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.200A4.3 4.3 0 0112 7.500a4.3 4.3 0 017.5 2.300C19.5 15.4 12 20 12 20z" />,
  tag: <><path d="M3.5 12.500V4.500h8l9 9-8 8z" /><circle cx="8" cy="9" r="1.3" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.500V12l3 2" /></>,
};

export const iconKeys = Object.keys(paths);

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name] ?? paths.check}
    </svg>
  );
}
