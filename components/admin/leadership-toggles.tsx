"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { saveSiteContent } from "@/server/actions/crud";

export function LeadershipToggles({
  value,
}: {
  value: { show_ceo: boolean; show_cto: boolean };
}) {
  const router = useRouter();
  const [state, setState] = useState(value);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: "show_ceo" | "show_cto") {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    setError(null);
    const result = await saveSiteContent("about.leadership", JSON.stringify(next));
    if (!result.ok) {
      setState(state); // revert
      setError(result.error ?? "Failed");
    } else {
      router.refresh();
    }
  }

  return (
    <Card className="mb-4">
      <h2 className="text-sm font-semibold">Leadership section</h2>
      <p className="mb-3 mt-1 text-xs text-muted">
        Shows the person&apos;s avatar, name and bio from their staff profile.
      </p>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.show_ceo} onChange={() => toggle("show_ceo")} />
          Show CEO on About page
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.show_cto} onChange={() => toggle("show_cto")} />
          Show CTO on About page
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
