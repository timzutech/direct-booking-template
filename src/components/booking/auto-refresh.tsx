"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Re-fetches the page a few times while we wait for Stripe's confirmation to arrive. */
export function AutoRefresh({ everyMs = 3000, times = 10 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  const count = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => {
      count.current += 1;
      if (count.current > times) return clearInterval(timer);
      router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, times]);
  return null;
}
