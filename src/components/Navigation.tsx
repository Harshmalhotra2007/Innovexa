"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Settings, 
  BarChart3, 
  LogOut,
  Bell,
  ListChecks,
  User,
  ShieldCheck,
  Zap,
  FolderGit2
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string>("Guest User");
  const [role, setRole] = useState<string>("participant");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read session state
    const storedName = sessionStorage.getItem("username") || "Harsh Malhotra";
    const storedRole = sessionStorage.getItem("userRole") || "organizer";
    setUsername(storedName);
    setRole(storedRole);

    // Initial notifications fetch
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/cron/escalate");
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setNotifications(data.events.slice(0, 5));
          setUnreadCount(data.events.filter((e: any) => !e.read).length);
        }
      }
    } catch (err) {
      console.warn("Silent notification check:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const triggerAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/cron/escalate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToastMessage(`SLA Audit complete: ${data.processedCount || 0} tasks evaluated.`);
        fetchNotifications();
      } else {
        setToastMessage("Audit execution completed.");
      }
    } catch (e) {
      setToastMessage("Audit execution triggered.");
    } finally {
      setIsAuditing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const navItems = [
    { label: "Executive Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Meetings Directory", href: "/meetings", icon: CalendarDays },
    { label: "Task Board & SLA", href: "/tasks", icon: CheckSquare },
    { label: "Analytics & Reports", href: "/analytics", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--amber)]/10 border border-[var(--amber)]">
                <ListChecks size={15} className="text-[var(--amber)]" />
              </div>
              <span className="font-display text-lg font-bold text-[var(--text)]">
                Inno<span className="text-[var(--amber)]">vexa</span>
              </span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] bg-[var(--panel-alt)] px-2 py-0.5 rounded border border-[var(--border-soft)]">
              Ops Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 rounded-md border border-[var(--amber)]/40 bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-mono text-[var(--amber)] hover:bg-[var(--panel)] transition-colors"
            >
              <Zap size={13} className={isAuditing ? "animate-spin" : ""} />
              <span>{isAuditing ? "Auditing..." : "Audit SLA"}</span>
            </button>

            {/* Role Badge */}
            <div className="flex items-center gap-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-mono">
              {role === "organizer" ? (
                <ShieldCheck size={13} className="text-[var(--amber)]" />
              ) : (
                <User size={13} className="text-[var(--teal)]" />
              )}
              <span className="text-[var(--text)] capitalize">{username}</span>
              <span className={`ml-1 text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                role === "organizer" ? "bg-[var(--amber)]/20 text-[var(--amber)]" : "bg-[var(--teal)]/20 text-[var(--teal)]"
              }`}>
                {role}
              </span>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--panel-alt)] w-8 h-8 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--red)] text-[7px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-md border border-[var(--border)] bg-[var(--panel)] shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                    <span className="text-xs font-semibold text-[var(--text)]">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-[var(--teal)] hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[var(--text-faint)]">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 text-xs flex flex-col gap-1 ${!n.read ? "bg-[var(--panel-alt)]" : ""}`}>
                          <div className={`text-[var(--text)] ${!n.read ? "font-semibold" : ""}`}>{n.text}</div>
                          <div className="text-[9px] text-[var(--text-dim)] font-mono">{new Date(n.date).toLocaleString()}</div>
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
              className="flex items-center gap-1.5 rounded-md border border-[var(--red)]/40 bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-mono text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[var(--panel-alt)] border border-[var(--amber)] px-4.5 py-2.5 text-xs font-body text-[var(--text)] shadow-2xl">
          <Bell size={14} className="text-[var(--amber)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Ribbon */}
      <nav className="border-b border-[var(--border)] bg-[var(--bg)] px-6">
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
                    ? "bg-[var(--panel-alt)] text-[var(--text)] border-l-2 border-[var(--amber)] font-semibold"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel)]"
                }`}
              >
                <Icon size={14} className={active ? "text-[var(--amber)]" : "text-[var(--text-dim)]"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
