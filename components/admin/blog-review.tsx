"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { reviewPost } from "@/server/actions/blog";
import { promptText } from "@/lib/swal";
import { formatDateHuman } from "@/lib/dates";

export interface PendingPost {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  author_name: string;
  published_at: string;
}

/** Super admin review queue for staff blog posts. */
export function BlogReview({ posts }: { posts: PendingPost[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (posts.length === 0) return null;

  async function review(post: PendingPost, approve: boolean) {
    setError(null);
    let note: string | undefined;
    if (!approve) {
      const answer = await promptText("Reject post", "Reason for the author (optional)");
      if (answer === null) return; // cancelled
      note = answer || undefined;
    }
    const result = await reviewPost(post.id, approve, note);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <Card className="mb-5 border-warning/50">
      <h2 className="mb-1 text-sm font-semibold">
        Pending review ({posts.length})
      </h2>
      <p className="mb-3 text-xs text-muted">
        Staff posts go live only after your approval.
      </p>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <div className="space-y-3">
        {posts.map((p) => (
          <details key={p.id} className="rounded border border-line bg-bg/50">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <Badge>no banner</Badge>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted">
                    {p.author_name} · {formatDateHuman(p.published_at?.slice(0, 10))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={(e) => { e.preventDefault(); review(p, true); }}>
                  <Check size={14} /> Approve
                </Button>
                <Button variant="ghost" onClick={(e) => { e.preventDefault(); review(p, false); }}>
                  <X size={14} /> Reject
                </Button>
              </div>
            </summary>
            <div className="border-t border-line p-4">
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="mb-4 max-h-56 rounded object-cover" />
              )}
              <div className="max-h-72 space-y-3 overflow-y-auto text-sm leading-relaxed">
                {p.body.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
