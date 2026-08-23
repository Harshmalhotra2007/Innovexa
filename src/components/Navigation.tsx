"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  ListChecks,
  BookOpen,
  BarChart3,
  Bell,
  ShieldCheck,
  User,
  LogOut,
  Zap,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("organizer");
  const [username, setUsername] = useState<string>("organizer");
  const [isAuditing, setIsAuditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<{id: string, text: string, date: string, read: boolean}[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = sessionStorage.getItem("userRole") || "organizer";
      const storedName = sessionStorage.getItem("username") || "organizer";
      setRole(storedRole);
      setUsername(storedName);
      
      const storedNotifs = localStorage.getItem("meetIqNotifications");
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs));
      }
    }
  }, [pathname]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedNotifs = localStorage.getItem("meetIqNotifications");
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Custom event for same-window updates
    window.addEventListener("meetIqNewNotification", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("meetIqNewNotification", handleStorageChange);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("meetIqNotifications", JSON.stringify(updated));
  };

  if (pathname === "/login") {
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("lastActivity");
    router.push("/login");
  };

  const triggerAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/cron/escalate", { method: "POST" });
      const data = await res.json();
      setToastMessage(
        `Audit Complete! ${data.summary.newOverdueCount} Overdue, ${data.summary.newEscalatedCount} Escalated.`
      );
      if (data.summary.newNotifications && data.summary.newNotifications.length > 0) {
        const formatted = data.summary.newNotifications.map((n: any) => ({
          id: n.id,
          text: n.subject,
          date: n.sentAt || new Date().toISOString(),
          read: false
        }));
        setNotifications(prev => {
          const updated = [...formatted, ...prev];
          localStorage.setItem("meetIqNotifications", JSON.stringify(updated));
          return updated;
        });
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setToastMessage("Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/meetings", label: "Meetings & Ingestion", icon: Mic },
    { href: "/tasks", label: "Task SLA Board", icon: ListChecks },
    { href: "/decisions", label: "Decisions", icon: BookOpen },
    { href: "/knowledge", label: "Knowledge Engine", icon: BookOpen },
    { href: "/analytics", label: "Analytics & ROI", icon: BarChart3 },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#212B2E] bg-[#141C1F]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4A3A1E] border border-[#E8A33D]">
                <ListChecks size={15} className="text-[#E8A33D]" />
              </div>
              <span className="font-display text-lg font-bold text-[#E7EEEF]">
                Meet<span className="text-[#E8A33D]">IQ</span>
              </span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8FA0A4] bg-[#182124] px-2 py-0.5 rounded border border-[#2A363A]">
              Ops Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 rounded-md border border-[#4A3A1E] bg-[#182124] px-3 py-1.5 text-xs font-mono text-[#E8A33D] hover:bg-[#1D272B] transition-colors"
            >
              <Zap size={13} className={isAuditing ? "animate-spin" : ""} />
              <span>{isAuditing ? "Auditing..." : "Audit SLA"}</span>
            </button>

            {/* Role Badge */}
            <div className="flex items-center gap-1.5 rounded-md border border-[#2A363A] bg-[#182124] px-3 py-1.5 text-xs font-mono">
              {role === "organizer" ? (
                <ShieldCheck size={13} className="text-[#E8A33D]" />
              ) : (
                <User size={13} className="text-[#49B9AE]" />
              )}
              <span className="text-[#E7EEEF] capitalize">{username}</span>
              <span className={`ml-1 text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                role === "organizer" ? "bg-[#4A3A1E] text-[#E8A33D]" : "bg-[#1B3634] text-[#49B9AE]"
              }`}>
                {role}
              </span>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative flex items-center justify-center rounded-md border border-[#2A363A] bg-[#182124] w-8 h-8 text-[#8FA0A4] hover:text-[#E7EEEF] hover:bg-[#1D272B] transition-colors"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#E2666A] text-[7px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-md border border-[#2A363A] bg-[#141C1F] shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-[#212B2E] px-3 py-2">
                    <span className="text-xs font-semibold text-[#E7EEEF]">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-[#49B9AE] hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-[#212B2E]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#5B6A6E]">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 text-xs flex flex-col gap-1 ${!n.read ? "bg-[#182124]" : ""}`}>
                          <div className={`text-[#E7EEEF] ${!n.read ? "font-semibold" : ""}`}>{n.text}</div>
                          <div className="text-[9px] text-[#8FA0A4] font-mono">{new Date(n.date).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-[#3A2224] bg-[#182124] px-3 py-1.5 text-xs font-mono text-[#E2666A] hover:bg-[#3A2224] transition-colors"
              title="Log out and clear session"
            >
              <LogOut size={13} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1D272B] border border-[#E8A33D] px-4.5 py-2.5 text-xs font-body text-[#E7EEEF] shadow-2xl">
          <Bell size={14} className="text-[#E8A33D]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Ribbon */}
      <nav className="border-b border-[#212B2E] bg-[#0D1315] px-6">
        <div className="flex gap-2 overflow-x-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-body transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#1D272B] text-[#E7EEEF] border-l-2 border-[#E8A33D] font-semibold"
                    : "text-[#8FA0A4] hover:text-[#E7EEEF] hover:bg-[#141C1F]"
                }`}
              >
                <Icon size={14} className={active ? "text-[#E8A33D]" : "text-[#8FA0A4]"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
