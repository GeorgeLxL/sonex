"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button, Dialog, Input, Label, Textarea, Badge, Empty, FileInput } from "@/components/ui";
import { createPost, updatePost, deletePost } from "@/server/actions/blog";
import { formatDateHuman } from "@/lib/dates";
import { confirmDialog } from "@/lib/swal";

export interface MyPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  review_note: string | null;
  published_at: string;
}

const STATUS_BADGE: Record<MyPost["approval_status"], { tone: "success" | "warning" | "danger" | "default"; label: string }> = {
  draft: { tone: "default", label: "draft" },
  pending: { tone: "warning", label: "pending review" },
  approved: { tone: "success", label: "published" },
  rejected: { tone: "danger", label: "rejected" },
};

export function BlogManager({ posts }: { posts: MyPost[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MyPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus size={15} /> Write a post
        </Button>
      </div>

      {posts.length === 0 && (
        <Empty>You have not written anything yet — share what you are working on.</Empty>
      )}

      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <div className="flex min-w-0 items-center gap-3">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-surface-2 text-xs font-bold text-muted">
                  no banner
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.title}</span>
                  <Badge tone={STATUS_BADGE[p.approval_status].tone}>
                    {STATUS_BADGE[p.approval_status].label}
                  </Badge>
                </div>
                <div className="text-xs text-muted">{formatDateHuman(p.published_at?.slice(0, 10))}</div>
                {p.approval_status === "rejected" && p.review_note && (
                  <div className="text-xs text-danger">Note: {p.review_note}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {p.approval_status === "approved" && (
                <Link
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label="View post"
                >
                  <ExternalLink size={14} />
                </Link>
              )}
              <button
                className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                onClick={() => { setEditing(p); setError(null); }}
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                onClick={async () => {
                  if (await confirmDialog(`Delete "${p.title}"?`, undefined, { danger: true, confirmText: "Delete" })) {
                    const result = await deletePost(p.id);
                    if (!result.ok) setError(result.error ?? "Failed");
                    else router.refresh();
                  }
                }}
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PostDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Write a post"
        onSubmit={async (fd) => {
          const result = await createPost(fd);
          if (result.ok) {
            setCreating(false);
            router.refresh();
          }
          return result;
        }}
      />

      {editing && (
        <PostDialog
          open
          onClose={() => setEditing(null)}
          title="Edit post"
          post={editing}
          onSubmit={async (fd) => {
            const result = await updatePost(editing.id, fd);
            if (result.ok) {
              setEditing(null);
              router.refresh();
            }
            return result;
          }}
        />
      )}
    </div>
  );
}

function PostDialog({
  open,
  onClose,
  title,
  post,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  post?: MyPost;
  onSubmit: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await onSubmit(formData);
    setPending(false);
    if (!result.ok) setError(result.error ?? "Failed");
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input name="title" required maxLength={300} defaultValue={post?.title} />
        </div>
        <div>
          <Label>Banner image (JPG/PNG/WebP, max 1 MB{post?.cover_url ? " — leave empty to keep current" : ""})</Label>
          <FileInput name="banner" accept="image/jpeg,image/png,image/webp" label="Choose image" />
        </div>
        <div>
          <Label>Content * (blank line = new paragraph)</Label>
          <Textarea name="body" required rows={12} maxLength={50000} defaultValue={post?.body} />
        </div>
        <div>
          <Label>Excerpt (optional — auto-generated from content when empty)</Label>
          <Input name="excerpt" maxLength={500} defaultValue={post?.excerpt} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="submit" defaultChecked={post ? post.approval_status !== "draft" : true} />
          Submit for review (unchecked = private draft; posts go live after
          the super admin approves)
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save post"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
