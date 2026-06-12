"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button, Empty } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

/** Full notification history for the signed-in user. */
export function NotificationsList({ items }: { items: Notification[] }) {
  const router = useRouter();
  const unread = items.filter((n) => !n.is_read).length;

  async function markAllRead() {
    await supabaseBrowser().from("notifications").update({ is_read: true }).eq("is_read", false);
    router.refresh();
  }

  function markRead(id: string) {
    supabaseBrowser().from("notifications").update({ is_read: true }).eq("id", id).then();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </span>
        {unread > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 && <Empty>No notifications yet.</Empty>}

      <div className="divide-y divide-line rounded border border-line bg-surface">
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.link ?? "#"}
            onClick={() => markRead(n.id)}
            className={cn(
              "block px-4 py-3 transition-colors hover:bg-surface-2",
              !n.is_read && "bg-accent/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={cn("text-sm font-medium", !n.is_read && "text-accent")}>
                {n.title}
              </span>
              <time className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</time>
            </div>
            {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
