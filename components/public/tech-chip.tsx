"use client";

import { useState } from "react";

/** simpleicons.org slugs for common names; everything else is derived. */
const SLUGS: Record<string, string> = {
  "react.js": "react",
  "react native": "react",
  "node.js": "nodedotjs",
  "next.js": "nextdotjs",
  "vue.js": "vuedotjs",
  "tailwind css": "tailwindcss",
  aws: "amazonwebservices",
  github: "github",
  "github actions": "githubactions",
  anthropic: "anthropic",
  html: "html5",
};

function slugFor(name: string): string {
  const key = name.trim().toLowerCase();
  return SLUGS[key] ?? key.replace(/\.js$/, "dotjs").replace(/[^a-z0-9]/g, "");
}

/** Brand-logo tile; falls back to a monogram when no logo exists. */
export function TechChip({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-2 rounded border border-line bg-surface p-3">
      {failed ? (
        <span className="flex h-9 w-9 items-center justify-center rounded bg-accent/15 text-sm font-bold text-accent">
          {name.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://cdn.simpleicons.org/${slugFor(name)}`}
          alt=""
          className="h-9 w-9"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <span className="text-center text-xs text-muted">{name}</span>
    </div>
  );
}

export function TechChips({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((t) => (
        <TechChip key={t} name={t} />
      ))}
    </div>
  );
}
