"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { saveSiteContent } from "@/server/actions/crud";

export function SiteContentEditor({
  items,
}: {
  items: { key: string; value: unknown }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Page copy as JSON per section — edit a value and save. The public site updates immediately.
      </p>
      {items.map((item) => (
        <details key={item.key} className="rounded border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{item.key}</summary>
          <form
            className="space-y-3 px-4 pb-4"
            action={async (formData: FormData) => {
              const result = await saveSiteContent(item.key, formData.get("json") as string);
              setStatus((s) => ({
                ...s,
                [item.key]: result.ok ? "Saved." : (result.error ?? "Failed"),
              }));
              if (result.ok) router.refresh();
            }}
          >
            <Textarea
              name="json"
              rows={6}
              defaultValue={JSON.stringify(item.value, null, 2)}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary">Save</Button>
              {status[item.key] && (
                <span className={`text-sm ${status[item.key] === "Saved." ? "text-success" : "text-danger"}`}>
                  {status[item.key]}
                </span>
              )}
            </div>
          </form>
        </details>
      ))}
    </div>
  );
}
