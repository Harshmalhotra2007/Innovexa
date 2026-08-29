"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export interface AppNotification {
  id: string;
  recipient?: string;
  subject: string;
  body: string;
  type?: string;
  sentAt?: string;
  read?: boolean;
  taskId?: string;
}

/**
 * NotificationBell component - displays a bell icon with unread count and dropdown
 * Can be placed in header/navigation areas
 */
export function NotificationBell() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initial notifications fetch
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const email = sessionStorage.getItem("userEmail") || "harsh.malhotra@innovexa.com";
      const res = await fetch(`/api/notifications?unreadOnly=true&email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications.slice(0, 8));
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn("Silent notification check:", err);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      const email = sessionStorage.getItem("userEmail") || "harsh.malhotra@innovexa.com";
      const response = await fetch(`/api/notifications?email=${encodeURIComponent(email)}&action=mark-all-read`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to mark all as read: ${response.status}`);
      }
    } catch (error) {
      console.error("Mark all read failed:", error);
      // Revert on failure
      fetchNotifications();
    }
  };

  const markNotificationRead = async (id: string) => {
    if (!id) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const email = sessionStorage.getItem("userEmail") || "harsh.malhotra@innovexa.com";
      const response = await fetch(`/api/notifications?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification ${id} as read: ${response.status}`);
      }
    } catch (error) {
      console.error("Mark notification read failed:", error);
    }
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

  return (
    <>
      {/* Notification Center */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--panel-alt)] w-8 h-8 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors"
        >
          <Bell size={14} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--red)] text-[8px] font-bold text-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-72 rounded-md border border-[var(--border)] bg-[var(--panel)] shadow-xl z-50">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                <Bell size={13} className="text-[var(--amber)]" /> SLA & System Alerts
              </span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-[var(--teal)] hover:underline font-mono">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-faint)] font-mono">No SLA notifications</div>
              ) : (
                notifications.map((n) => {
                  const isEscalation = n.type === "Escalation";
                  const isWarning = n.type === "Warning";
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.taskId) router.push("/tasks");
                      }}
                      className={`p-3 text-xs flex flex-col gap-1 cursor-pointer transition-colors hover:bg-[var(--panel-alt)] ${
                        !n.read ? "bg-[var(--panel-alt)]/60 font-semibold" : "opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                            isEscalation
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : isWarning
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-teal-500/20 text-teal-400 border-teal-500/30"
                          }`}
                        >
                          {n.type || "Alert"}
                        </span>
                        <span className="text-[9px] text-[var(--text-dim)] font-mono">
                          {n.sentAt ? new Date(n.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div className="text-[var(--text)] text-[11px] leading-tight">{n.subject}</div>
                      <div className="text-[10px] text-[var(--text-dim)] line-clamp-2">{n.body}</div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-[var(--border)] p-2 text-center bg-[var(--panel-alt)]">
              <Link href="/tasks" className="text-[10px] font-mono text-[var(--teal)] hover:underline">
                View All Action Items & Task SLA →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Toast Audit Message */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[var(--panel-alt)] border border-[var(--amber)] px-4.5 py-2.5 text-xs font-body text-[var(--text)] shadow-2xl">
          <Bell size={14} className="text-[var(--amber)]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}