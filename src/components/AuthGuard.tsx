"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip auth guard check on the /login route
    if (pathname === "/login") {
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = () => {
      const userRole = sessionStorage.getItem("userRole");
      const lastActivity = sessionStorage.getItem("lastActivity");

      if (!userRole) {
        setIsAuthenticated(false);
        router.push("/login");
        return;
      }

      // Check 15-minute inactivity timeout
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity, 10);
        if (timeDiff > INACTIVITY_TIMEOUT_MS) {
          sessionStorage.clear();
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }
      }

      // Update activity timestamp
      sessionStorage.setItem("lastActivity", Date.now().toString());
      setIsAuthenticated(true);
    };

    checkAuth();

    // Event listeners to update lastActivity on user interaction
    const updateActivity = () => {
      if (sessionStorage.getItem("userRole")) {
        sessionStorage.setItem("lastActivity", Date.now().toString());
      }
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);

    // Periodic check every 30 seconds for session timeout
    const interval = setInterval(checkAuth, 30000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      clearInterval(interval);
    };
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#131324] text-[#8FA0A4] flex items-center justify-center font-mono text-xs">
        Authenticating Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

