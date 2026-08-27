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
    <aside className="w-64 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col justify-between h-screen sticky top-0 z-40 select-none shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wider text-[var(--text)] uppercase block">
                INNOVEXA
              </span>
              <span className="font-mono text-[10px] text-[var(--primary)] tracking-widest block uppercase font-bold">
                OPS CONSOLE v2.0
              </span>
            </div>
          </Link>
        </div>

        {/* Role Mode Banner */}
        <div className="p-3 mx-3 my-3 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-dim)] uppercase text-[11px] font-bold">CURRENT VIEW:</span>
            <button
              onClick={toggleUserRole}
              aria-label="Toggle user role view mode"
              className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-xs ${
                userRole === "organizer"
                  ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20"
                  : "bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/30 hover:bg-[var(--teal)]/20"
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>{userRole}</span>
            </button>
          </div>
        </div>

        {/* Quick Host Button in Sidebar */}
        {onHostClick && (
          <div className="px-3 mb-3">
            <button
              onClick={onHostClick}
              className="w-full py-2.5 px-3 rounded-lg bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>HOST INSTANT MEETING</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-1 font-sans">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 shadow-xs"
                    : "text-[var(--text-dim)] hover:bg-[var(--panel-alt)] hover:text-[var(--text)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[var(--primary)]" : "text-[var(--text-dim)]"}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--primary)]" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--panel-alt)] text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-dim)]">PLAYWRIGHT BOT:</span>
          <span className="text-[var(--teal)] font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--teal)] animate-ping" /> ONLINE
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-faint)] truncate">
          Branch: <span className="text-[var(--primary)] font-bold">main</span>
        </div>
      </div>
    </aside>
  );
}
