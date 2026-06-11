"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Live local time in the user's profile timezone (ERP header). */
export function LiveClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  return (
    <span className="hidden items-center gap-1.5 text-sm tabular-nums text-muted md:flex">
      <Clock size={14} />
      {now}
      <span className="text-xs">({timezone})</span>
    </span>
  );
}
