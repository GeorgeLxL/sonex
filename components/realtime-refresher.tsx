"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Subscribes to Postgres changes and refreshes the current route —
 * server components re-render with fresh data, so every board stays
 * live without client-side cache plumbing.
 */
export function RealtimeRefresher({
  channel,
  table,
  filter,
}: {
  channel: string;
  table: string;
  filter?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const db = supabaseBrowser();
    const ch = db
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        },
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      db.removeChannel(ch);
    };
  }, [channel, table, filter, router]);

  return null;
}
