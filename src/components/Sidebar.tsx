"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Settings,
  Bot,
  UserCheck,
  Radio,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  onHostClick?: () => void;
}

export function Sidebar({ onHostClick }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>("organizer");

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);
  }, []);

  const toggleUserRole = () => {
    const newRole = userRole === "organizer" ? "participant" : "organizer";
    sessionStorage.setItem("userRole", newRole);
    setUserRole(newRole);
    window.location.reload();
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "My Meetings", href: "/meetings", icon: CalendarDays },
    { name: "AI Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Analytics & Insights", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#141C1F] border-r border-[#212B2E] flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#212B2E] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/40 text-[var(--amber)] group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wider text-[#e8e1d5] uppercase block">
                INNOVEXA
              </span>
              <span className="font-mono text-[10px] text-[var(--teal)] tracking-widest block uppercase">
                OPS CONSOLE v2.0
              </span>
            </div>
          </Link>
        </div>

        {/* Role Mode Banner */}
        <div className="p-3 mx-3 my-3 rounded-lg bg-[#182124] border border-[#212B2E]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#9a99a0] uppercase">CURRENT VIEW:</span>
            <button
              onClick={toggleUserRole}
              aria-label="Toggle user role view mode"
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1 ${
                userRole === "organizer"
                  ? "bg-[var(--amber)]/20 text-[var(--amber)] border border-[var(--amber)]/40 hover:bg-[var(--amber)]/30"
                  : "bg-[var(--teal)]/20 text-[var(--teal)] border border-[var(--teal)]/40 hover:bg-[var(--teal)]/30"
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>{userRole}</span>
            </button>
          </div>
        </div>

        {/* Quick Host Button in Sidebar */}
        {onHostClick && (
          <div className="px-3 mb-2">
            <button
              onClick={onHostClick}
              className="w-full py-2 px-3 rounded-lg bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>HOST INSTANT MEETING</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? "bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/30 font-bold"
                    : "text-[#9a99a0] hover:bg-[#182124] hover:text-[#e8e1d5]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[var(--teal)]" : "text-[#9a99a0]"}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--teal)]" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#212B2E] bg-[#101719] text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#9a99a0]">PLAYWRIGHT BOT:</span>
          <span className="text-[var(--teal)] font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--teal)] animate-ping" /> ONLINE
          </span>
        </div>
        <div className="text-[10px] text-[#5B6A6E] truncate">
          Branch: <span className="text-[var(--amber)]">main</span>
        </div>
      </div>
    </aside>
  );
}
