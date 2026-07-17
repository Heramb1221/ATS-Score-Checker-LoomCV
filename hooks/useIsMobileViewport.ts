"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md`

export function useIsMobileViewport(): boolean | null {
  // null = not yet determined (avoids a server/client render mismatch flash)
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
