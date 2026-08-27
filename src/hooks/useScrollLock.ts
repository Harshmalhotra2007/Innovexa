"use client";

import { useEffect } from "react";

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    // Save initial overflow and paddingRight to restore on unlock
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPadding = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent visual layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPadding;
    };
  }, [lock]);
}
