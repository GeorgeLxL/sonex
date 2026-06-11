"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Monitor, MonitorOff } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Notification as AppNotification } from "@/types";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { alertInfo } from "@/lib/swal";

const DESKTOP_PREF_KEY = "desktop-notifications";

function desktopSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Fire a native Windows/OS toast via the browser Notification API. */
function showDesktopNotification(n: AppNotification) {
  if (!desktopSupported()) return;
  if (Notification.permission !== "granted") return;
  if (localStorage.getItem(DESKTOP_PREF_KEY) !== "on") return;
  try {
    const toast = new Notification(n.title, {
      body: n.body || undefined,
      tag: n.id, // dedupe if the same row arrives twice
    });
    toast.onclick = () => {
      window.focus();
      if (n.link) window.location.assign(n.link);
      toast.close();
    };
  } catch {
    // Some platforms throw on construction (e.g. Android Chrome) — in-app bell still works.
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [desktopOn, setDesktopOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const db = supabaseBrowser();
    const { data } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as AppNotification[]) ?? []);
  }, []);

  useEffect(() => {
    setDesktopOn(
      desktopSupported() &&
        Notification.permission === "granted" &&
        localStorage.getItem(DESKTOP_PREF_KEY) === "on",
    );
  }, []);

  useEffect(() => {
    load();
    const db = supabaseBrowser();
    const channel = db
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          showDesktopNotification(n);
        },
      )
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  async function markAllRead() {
    const db = supabaseBrowser();
    await db.from("notifications").update({ is_read: true }).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    supabaseBrowser().from("notifications").update({ is_read: true }).eq("id", id).then();
  }

  async function toggleDesktop() {
    if (!desktopSupported()) return;
    if (desktopOn) {
      localStorage.setItem(DESKTOP_PREF_KEY, "off");
      setDesktopOn(false);
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission === "granted") {
      localStorage.setItem(DESKTOP_PREF_KEY, "on");
      setDesktopOn(true);
      new Notification("Desktop notifications enabled", {
        body: "You will get a Windows notification for new activity.",
      });
    } else {
      alertInfo(
        "Notifications are blocked",
        "Allow notifications for this site in your browser settings, then try again.",
      );
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-3">
              {desktopSupported() && (
                <button
                  onClick={toggleDesktop}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors",
                    desktopOn ? "text-success hover:text-danger" : "text-muted hover:text-ink",
                  )}
                  title={desktopOn ? "Disable Windows notifications" : "Enable Windows notifications"}
                >
                  {desktopOn ? <Monitor size={13} /> : <MonitorOff size={13} />}
                  {desktopOn ? "Desktop on" : "Desktop off"}
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Link
              href="/workspace/notifications"
              onClick={() => setOpen(false)}
              className="block border-b border-line px-4 py-2 text-center text-xs font-medium text-accent hover:bg-surface-2"
            >
              View all notifications
            </Link>
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">Nothing yet.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                }}
                className={cn(
                  "block border-b border-line px-4 py-3 text-sm transition-colors last:border-0 hover:bg-surface-2",
                  !n.is_read && "bg-accent/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("font-medium", !n.is_read && "text-accent")}>{n.title}</span>
                  <time className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</time>
                </div>
                {n.body && <p className="mt-0.5 text-muted">{n.body}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
